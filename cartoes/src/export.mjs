import { zip } from './zip.mjs'

/* Exportação: do que está nos cartões a um documento.
 *
 * Tudo aqui é puro (sem DOM, sem Electron), para poder ser testado direto no Node.
 * O caminho é sempre o mesmo:
 *   peças da ordem  →  buildDoc()  →  documento intermediário  →  toText / toMarkdown / toHTML / …
 *
 * Peça:      { cards: [{ cat, doc }], note }      (doc = JSON do ProseMirror; note = nota daquele ponto da ordem)
 * Documento: { title, blocks }
 * Bloco:     { t: 'title', text }   título do documento (só em "fichas")
 *            { t: 'lead', text }    nota geral da ordem (só em "fichas")
 *            { t: 'h', text }       cabeçalho de ficha: "3 · Cena"
 *            { t: 'p', runs }       parágrafo; runs = [{ text, b, i }]
 *            { t: 'sep' }           separador de seção: * * *
 *            { t: 'note', text }    nota daquele ponto da ordem
 */

export const MODELS = [
  { id: 'corrido', label: 'texto corrido', hint: 'só o texto, um parágrafo depois do outro' },
  { id: 'secoes', label: 'uma seção por cartão', hint: 'cada cartão (ou grupo) separado por * * *' },
  { id: 'fichas', label: 'fichas completas', hint: 'número, categoria e as notas da ordem' },
]

export const FORMATS = [
  { id: 'docx', ext: 'docx', label: 'Word (.docx)', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { id: 'odt', ext: 'odt', label: 'LibreOffice (.odt)', mime: 'application/vnd.oasis.opendocument.text' },
  { id: 'txt', ext: 'txt', label: 'Texto (.txt)', mime: 'text/plain', hint: 'sem negrito nem itálico' },
  { id: 'md', ext: 'md', label: 'Markdown (.md)', mime: 'text/markdown' },
]

export const SEP = '* * *'
const CAT_LABEL = { cena: 'Cena', nota: 'Nota', lugar: 'Lugar' }

/* Parágrafos de um doc do ProseMirror como listas de trechos { text, b, i }.
 * Parágrafos vazios saem; trechos vizinhos com a mesma formatação se juntam. */
export function parasOf(doc) {
  const out = []
  for (const p of doc?.content || []) {
    const runs = []
    for (const n of p.content || []) {
      if (typeof n.text !== 'string' || !n.text) continue
      const marks = (n.marks || []).map((m) => m.type)
      const b = marks.includes('strong'), i = marks.includes('em')
      const last = runs[runs.length - 1]
      if (last && last.b === b && last.i === i) last.text += n.text
      else runs.push({ text: n.text, b, i })
    }
    if (runs.some((r) => r.text.trim())) out.push(runs)
  }
  return out
}

/* Monta o documento intermediário no modelo escolhido. */
export function buildDoc({ title = '', model = 'corrido', pieces = [], orderNote = '' } = {}) {
  const blocks = []
  const name = title.trim()
  if (model === 'fichas') {
    blocks.push({ t: 'title', text: name || 'Cartões' })
    if (orderNote.trim()) blocks.push({ t: 'lead', text: orderNote.trim() })
  }
  let n = 0, first = true
  for (const piece of pieces) {
    const cards = (piece.cards || []).map((c) => ({ cat: c.cat, paras: parasOf(c.doc) })).filter((c) => c.paras.length)
    if (!cards.length) continue
    if (model === 'secoes' && !first) blocks.push({ t: 'sep' })
    first = false
    for (const c of cards) {
      if (model === 'fichas') blocks.push({ t: 'h', text: ++n + (CAT_LABEL[c.cat] ? ' · ' + CAT_LABEL[c.cat] : '') })
      for (const runs of c.paras) blocks.push({ t: 'p', runs })
    }
    if (model === 'fichas' && piece.note?.trim()) blocks.push({ t: 'note', text: piece.note.trim() })
  }
  return { title: name, blocks }
}

export const countCards = (pieces) =>
  pieces.reduce((n, p) => n + (p.cards || []).filter((c) => parasOf(c.doc).length).length, 0)

/* Nome de arquivo seguro no Windows: "<título>-AAAA-MM-DD.ext". */
export function fileName(title, ext, date = new Date()) {
  const base = (title || 'cartoes')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').slice(0, 60) || 'cartoes'
  const pad = (v) => String(v).padStart(2, '0')
  return `${base}-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.${ext}`
}

const plain = (runs) => runs.map((r) => r.text).join('')
const noteText = (text) => 'Nota: ' + text.replace(/\s*\n\s*/g, ' ')

/* ---------- .txt ---------- */
/* Texto puro não tem negrito nem itálico: só as palavras. CRLF e BOM para o Bloco de Notas
 * do Windows abrir com os acentos certos. */
export function toText(d) {
  const out = []
  for (const b of d.blocks) {
    if (b.t === 'title') out.push(b.text.toUpperCase())
    else if (b.t === 'lead') out.push(b.text.replace(/\s*\n\s*/g, ' '))
    else if (b.t === 'h') out.push('— ' + b.text + ' —')
    else if (b.t === 'p') out.push(plain(b.runs))
    else if (b.t === 'sep') out.push(SEP)
    else if (b.t === 'note') out.push('[' + noteText(b.text) + ']')
  }
  return '﻿' + out.join('\r\n\r\n') + '\r\n'
}

/* ---------- .md ---------- */
const mdEsc = (t) => t.replace(/([\\`*_[\]<>])/g, '\\$1')
function mdRuns(runs) {
  let out = ''
  for (const r of runs) {
    const mark = r.b && r.i ? '***' : r.b ? '**' : r.i ? '*' : ''
    if (!mark) { out += mdEsc(r.text); continue }
    // os marcadores precisam encostar na palavra: espaços das pontas ficam do lado de fora
    const [, pre, core, post] = /^(\s*)([\s\S]*?)(\s*)$/.exec(r.text)
    out += core ? pre + mark + mdEsc(core) + mark + post : r.text
  }
  // o que no começo da linha viraria título, citação ou lista continua sendo texto
  return out.replace(/^(\s*)(#{1,6}\s|[-+]\s|\d+[.)]\s)/, (m, sp, tok) => sp + '\\' + tok)
}
export function toMarkdown(d) {
  const out = []
  for (const b of d.blocks) {
    if (b.t === 'title') out.push('# ' + mdEsc(b.text))
    else if (b.t === 'lead') out.push('> ' + mdEsc(b.text).replace(/\s*\n\s*/g, '\n> '))
    else if (b.t === 'h') out.push('## ' + mdEsc(b.text))
    else if (b.t === 'p') out.push(mdRuns(b.runs))
    else if (b.t === 'sep') out.push(SEP)
    else if (b.t === 'note') out.push('> **Nota:** ' + mdEsc(b.text).replace(/\s*\n\s*/g, ' '))
  }
  return out.join('\n\n') + '\n'
}

/* ---------- HTML (pré-visualização e PDF) ---------- */
export const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const htmlRuns = (runs) => runs.map((r) => {
  let t = esc(r.text)
  if (r.i) t = `<em>${t}</em>`
  if (r.b) t = `<strong>${t}</strong>`
  return t
}).join('')
/* limit: no máximo esse número de blocos (a pré-visualização é curta). */
export function toHTML(d, { limit = Infinity } = {}) {
  const out = []
  for (const b of d.blocks.slice(0, limit)) {
    if (b.t === 'title') out.push(`<h1 class="x-title">${esc(b.text)}</h1>`)
    else if (b.t === 'lead') out.push(`<p class="x-lead">${esc(b.text)}</p>`)
    else if (b.t === 'h') out.push(`<h2 class="x-h">${esc(b.text)}</h2>`)
    else if (b.t === 'p') out.push(`<p>${htmlRuns(b.runs)}</p>`)
    else if (b.t === 'sep') out.push(`<p class="x-sep">${SEP}</p>`)
    else if (b.t === 'note') out.push(`<p class="x-note">${esc(noteText(b.text))}</p>`)
  }
  return out.join('\n')
}

/* ---------- XML comum a .docx e .odt ---------- */
// caracteres de controle não podem existir em XML 1.0 (tab passa; o resto vira espaço)
const clean = (t) => String(t).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, ' ').replace(/[\r\n]+/g, ' ')
const xml = (t) => clean(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
const one = (text) => [{ text, b: false, i: false }]
const stamp = (date) => date.toISOString().replace(/\.\d+Z$/, 'Z')

/* ---------- .docx (Office Open XML, gerado à mão) ---------- */
/* Estilos de parágrafo usados: Normal, Title, Subtitle (nota geral), Heading2 (cabeçalho de ficha),
 * Separador (* * *) e Nota. Nomes padrão do Word onde existem, para o painel de navegação funcionar. */
const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
function wRun(r) {
  const pr = (r.b ? '<w:b/><w:bCs/>' : '') + (r.i ? '<w:i/><w:iCs/>' : '')
  // tab dentro de <w:t> não é confiável: vira <w:tab/>
  const parts = clean(r.text).split('\t').map((t) => (t ? `<w:t xml:space="preserve">${xml(t)}</w:t>` : ''))
  return `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}${parts.join('<w:tab/>')}</w:r>`
}
const wPara = (style, runs) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}${runs.map(wRun).join('')}</w:p>`

export function toDocx(d, date = new Date()) {
  const body = []
  for (const b of d.blocks) {
    if (b.t === 'title') body.push(wPara('Title', one(b.text)))
    else if (b.t === 'lead') for (const line of b.text.split(/\s*\n\s*/)) body.push(wPara('Subtitle', one(line)))
    else if (b.t === 'h') body.push(wPara('Heading2', one(b.text)))
    else if (b.t === 'p') body.push(wPara('', b.runs))
    else if (b.t === 'sep') body.push(wPara('Separador', one(SEP)))
    else if (b.t === 'note') body.push(wPara('Nota', one(noteText(b.text))))
  }
  if (!body.length) body.push('<w:p/>')
  // A4 com margens de 2,5 cm (medidas em twips: 1 cm = 567)
  const sect = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'
  const document = `${XML_HEAD}<w:document ${W_NS}><w:body>${body.join('')}${sect}</w:body></w:document>`

  // só o alfabeto latino fica preso à Georgia; outros sistemas de escrita usam a fonte que o editor escolher
  const font = '<w:rFonts w:ascii="Georgia" w:hAnsi="Georgia"/>'
  const pStyle = (id, name, extra, { next = 'Normal', based = 'Normal' } = {}) =>
    `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="${based}"/><w:next w:val="${next}"/><w:qFormat/>${extra}</w:style>`
  const styles = `${XML_HEAD}<w:styles ${W_NS}>` +
    `<w:docDefaults><w:rPrDefault><w:rPr>${font}<w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="pt-BR" w:eastAsia="pt-BR" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>` +
    '<w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="324" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' +
    pStyle('Title', 'Title', '<w:pPr><w:spacing w:after="200"/></w:pPr><w:rPr><w:sz w:val="40"/><w:szCs w:val="40"/></w:rPr>') +
    pStyle('Subtitle', 'Subtitle', '<w:pPr><w:spacing w:after="320"/></w:pPr><w:rPr><w:i/><w:iCs/><w:color w:val="555555"/></w:rPr>') +
    pStyle('Heading2', 'heading 2', '<w:pPr><w:keepNext/><w:spacing w:before="360" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:caps/><w:spacing w:val="20"/><w:color w:val="777777"/><w:sz w:val="19"/><w:szCs w:val="19"/></w:rPr>') +
    pStyle('Separador', 'Separador', '<w:pPr><w:spacing w:before="280" w:after="280"/><w:jc w:val="center"/></w:pPr><w:rPr><w:color w:val="777777"/></w:rPr>') +
    pStyle('Nota', 'Nota', '<w:pPr><w:spacing w:after="240"/><w:ind w:left="397"/></w:pPr><w:rPr><w:i/><w:iCs/><w:color w:val="555555"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr>') +
    '</w:styles>'

  const types = `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '</Types>'
  const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
  const rels = `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/>` +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '</Relationships>'
  const docRels = `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="${REL}/styles" Target="styles.xml"/></Relationships>`
  const core = `${XML_HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<dc:title>${xml(d.title)}</dc:title><dc:language>pt-BR</dc:language>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${stamp(date)}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${stamp(date)}</dcterms:modified>` +
    '</cp:coreProperties>'

  const enc = new TextEncoder()
  return zip([
    { name: '[Content_Types].xml', data: enc.encode(types) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: 'word/document.xml', data: enc.encode(document) },
    { name: 'word/_rels/document.xml.rels', data: enc.encode(docRels) },
    { name: 'word/styles.xml', data: enc.encode(styles) },
    { name: 'docProps/core.xml', data: enc.encode(core) },
  ], date)
}

/* ---------- .odt (OpenDocument, gerado à mão) ---------- */
const ODT_MIME = 'application/vnd.oasis.opendocument.text'
const O_NS = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" ' +
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" ' +
  'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:dc="http://purl.org/dc/elements/1.1/" ' +
  'xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"'
/* No ODF, espaços seguidos (e o espaço no começo do parágrafo) são engolidos:
 * cada espaço "a mais" precisa virar <text:s/>. `st.sp` lembra se o caractere anterior era espaço. */
function oText(text, st) {
  let out = ''
  for (const ch of clean(text)) {
    if (ch === ' ') { out += st.sp ? '<text:s/>' : ' '; st.sp = true }
    else if (ch === '\t') { out += '<text:tab/>'; st.sp = false }
    else { out += xml(ch); st.sp = false }
  }
  return out
}
function oPara(tag, style, runs, attrs = '') {
  const st = { sp: true }
  const inner = runs.map((r) => {
    const t = oText(r.text, st)
    const span = r.b && r.i ? 'T3' : r.b ? 'T1' : r.i ? 'T2' : ''
    return span ? `<text:span text:style-name="${span}">${t}</text:span>` : t
  }).join('')
  return `<text:${tag} text:style-name="${style}"${attrs}>${inner}</text:${tag}>`
}

export function toOdt(d, date = new Date()) {
  const body = []
  for (const b of d.blocks) {
    if (b.t === 'title') body.push(oPara('p', 'Title', one(b.text)))
    else if (b.t === 'lead') for (const line of b.text.split(/\s*\n\s*/)) body.push(oPara('p', 'Subtitle', one(line)))
    else if (b.t === 'h') body.push(oPara('h', 'Heading_20_2', one(b.text), ' text:outline-level="2"'))
    else if (b.t === 'p') body.push(oPara('p', 'Standard', b.runs))
    else if (b.t === 'sep') body.push(oPara('p', 'Separador', one(SEP)))
    else if (b.t === 'note') body.push(oPara('p', 'Nota', one(noteText(b.text))))
  }
  if (!body.length) body.push('<text:p text:style-name="Standard"/>')
  const bold = 'fo:font-weight="bold" style:font-weight-asian="bold" style:font-weight-complex="bold"'
  const ital = 'fo:font-style="italic" style:font-style-asian="italic" style:font-style-complex="italic"'
  const tStyle = (name, props) => `<style:style style:name="${name}" style:family="text"><style:text-properties ${props}/></style:style>`
  const fonts = '<office:font-face-decls><style:font-face style:name="Georgia" svg:font-family="Georgia" style:font-family-generic="roman" style:font-pitch="variable"/></office:font-face-decls>'
  const content = `${XML_HEAD}<office:document-content ${O_NS} office:version="1.2">${fonts}` +
    `<office:automatic-styles>${tStyle('T1', bold)}${tStyle('T2', ital)}${tStyle('T3', bold + ' ' + ital)}</office:automatic-styles>` +
    `<office:body><office:text>${body.join('')}</office:text></office:body></office:document-content>`

  const pStyle = (name, display, para, text, { cls = '', parent = 'Standard' } = {}) =>
    `<style:style style:name="${name}"${display ? ` style:display-name="${display}"` : ''} style:family="paragraph"` +
    `${parent ? ` style:parent-style-name="${parent}"` : ''}${cls ? ` style:class="${cls}"` : ''}${name === 'Heading_20_2' ? ' style:default-outline-level="2"' : ''}>` +
    `${para ? `<style:paragraph-properties ${para}/>` : ''}${text ? `<style:text-properties ${text}/>` : ''}</style:style>`
  const styles = `${XML_HEAD}<office:document-styles ${O_NS} office:version="1.2">${fonts}<office:styles>` +
    '<style:default-style style:family="paragraph"><style:paragraph-properties fo:line-height="135%" fo:margin-top="0cm" fo:margin-bottom="0.28cm"/>' +
    '<style:text-properties style:font-name="Georgia" fo:font-size="12pt" fo:language="pt" fo:country="BR"/></style:default-style>' +
    pStyle('Standard', '', '', '', { cls: 'text', parent: '' }) +
    pStyle('Title', '', 'fo:margin-bottom="0.35cm"', 'fo:font-size="20pt"', { cls: 'chapter' }) +
    pStyle('Subtitle', '', 'fo:margin-bottom="0.56cm"', `${ital} fo:color="#555555"`, { cls: 'chapter' }) +
    pStyle('Heading_20_2', 'Heading 2', 'fo:margin-top="0.64cm" fo:margin-bottom="0.18cm" fo:keep-with-next="always"', 'fo:font-size="9.5pt" fo:text-transform="uppercase" fo:letter-spacing="0.035cm" fo:color="#777777"', { cls: 'text' }) +
    pStyle('Separador', '', 'fo:margin-top="0.5cm" fo:margin-bottom="0.5cm" fo:text-align="center"', 'fo:color="#777777"') +
    pStyle('Nota', '', 'fo:margin-left="0.7cm" fo:margin-bottom="0.42cm"', `${ital} fo:font-size="10.5pt" fo:color="#555555"`) +
    '</office:styles><office:automatic-styles><style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" ' +
    'style:print-orientation="portrait" fo:margin-top="2.5cm" fo:margin-bottom="2.5cm" fo:margin-left="2.5cm" fo:margin-right="2.5cm"/></style:page-layout></office:automatic-styles>' +
    '<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1"/></office:master-styles></office:document-styles>'

  const meta = `${XML_HEAD}<office:document-meta ${O_NS} office:version="1.2"><office:meta>` +
    `<meta:generator>Cartoes</meta:generator><dc:title>${xml(d.title)}</dc:title><dc:language>pt-BR</dc:language>` +
    `<meta:creation-date>${stamp(date)}</meta:creation-date><dc:date>${stamp(date)}</dc:date></office:meta></office:document-meta>`
  const manifest = `${XML_HEAD}<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">` +
    `<manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="${ODT_MIME}"/>` +
    '<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>' +
    '<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>' +
    '<manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/></manifest:manifest>'

  const enc = new TextEncoder()
  return zip([
    { name: 'mimetype', data: enc.encode(ODT_MIME) }, // precisa ser o primeiro, sem compressão
    { name: 'content.xml', data: enc.encode(content) },
    { name: 'styles.xml', data: enc.encode(styles) },
    { name: 'meta.xml', data: enc.encode(meta) },
    { name: 'META-INF/manifest.xml', data: enc.encode(manifest) },
  ], date)
}

/* Bytes do arquivo no formato pedido. */
export function render(d, format) {
  const utf8 = (s) => new TextEncoder().encode(s)
  if (format === 'txt') return utf8(toText(d))
  if (format === 'md') return utf8(toMarkdown(d))
  if (format === 'docx') return toDocx(d)
  if (format === 'odt') return toOdt(d)
  throw new Error('formato desconhecido: ' + format)
}
