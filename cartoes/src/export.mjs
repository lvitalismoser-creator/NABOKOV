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

/* Bytes do arquivo no formato pedido. */
export function render(d, format) {
  const utf8 = (s) => new TextEncoder().encode(s)
  if (format === 'txt') return utf8(toText(d))
  if (format === 'md') return utf8(toMarkdown(d))
  throw new Error('formato desconhecido: ' + format)
}
