'use strict'
/* Exportação (Fase 6). Duas camadas:
 *  1. src/export.mjs direto no Node: do modelo ao arquivo, formato por formato;
 *  2. a janela "Exportar" no navegador: ordem, modelo, formato e o arquivo baixado. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { chromium } = require('playwright')
const { ROOT, URL_APP, sleep, doc, seed } = require('./helpers.cjs')

let X, browser
before(async () => {
  X = await import('file://' + path.join(ROOT, 'src', 'export.mjs').split('\\').join('/'))
  browser = await chromium.launch()
})
after(async () => { await browser.close() })

const T = (text, ...marks) => ({ type: 'text', text, ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}) })
const P = (...nodes) => ({ type: 'paragraph', content: nodes })
const D = (...paras) => ({ type: 'doc', content: paras })

// três peças: um cartão com formatação, um grupo de dois, um cartão com caracteres difíceis
const PIECES = [
  { cards: [{ cat: 'cena', doc: D(P(T('Abertura: a '), T('chuva', 'strong'), T(' começa '), T('antes', 'em'), T('.')), P(), P(T('Segundo parágrafo.'))) }], note: 'talvez cortar' },
  { cards: [{ cat: null, doc: D(P(T('Grupo, parte um.'))) }, { cat: 'lugar', doc: D(P(T('Grupo, parte dois.', 'strong', 'em'))) }], note: '' },
  { cards: [{ cat: 'nota', doc: D(P(T('# não é título; 2 < 3 & "aspas" *asterisco* _sublinha_ <b>'))) }, { cat: null, doc: D(P()) }], note: '' },
]
const build = (model) => X.buildDoc({ title: 'Versão flashback', orderNote: 'nota geral', model, pieces: PIECES })
const FORMAT_IDS = ['docx', 'odt', 'txt', 'md']
const txt = (bytes) => new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes) // mantém o BOM, se houver

test('modelo: os três modelos montam o documento certo', () => {
  const kinds = (d) => d.blocks.map((b) => b.t).join(' ')
  assert.equal(kinds(build('corrido')), 'p p p p p')               // só texto; parágrafo vazio e cartão vazio saem
  assert.equal(kinds(build('secoes')), 'p p sep p p sep p')        // o grupo é uma seção só
  const f = build('fichas')
  assert.equal(kinds(f), 'title lead h p p note h p h p h p')
  assert.deepEqual(f.blocks.filter((b) => b.t === 'h').map((b) => b.text), ['1 · Cena', '2', '3 · Lugar', '4 · Nota'])
  assert.equal(f.blocks.find((b) => b.t === 'note').text, 'talvez cortar')
  assert.deepEqual(build('corrido').blocks[0].runs, [
    { text: 'Abertura: a ', b: false, i: false }, { text: 'chuva', b: true, i: false },
    { text: ' começa ', b: false, i: false }, { text: 'antes', b: false, i: true }, { text: '.', b: false, i: false },
  ])
  assert.equal(X.countCards(PIECES), 4)
  assert.equal(X.fileName('Versão: "flash/back"?', 'docx', new Date(2026, 10, 3)), 'Versão flash back-2026-11-03.docx')
  assert.equal(X.fileName('', 'pdf', new Date(2026, 0, 9)), 'cartoes-2026-01-09.pdf')
})

test('.txt: todo o texto, na ordem, sem marcação; BOM e CRLF', () => {
  const bytes = X.render(build('secoes'), 'txt')
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf])
  const s = txt(bytes).slice(1)
  assert.deepEqual(s.trim().split('\r\n\r\n'), [
    'Abertura: a chuva começa antes.', 'Segundo parágrafo.', '* * *',
    'Grupo, parte um.', 'Grupo, parte dois.', '* * *',
    '# não é título; 2 < 3 & "aspas" *asterisco* _sublinha_ <b>',
  ])
  assert.ok(!s.replace(/\r\n/g, '').includes('\n'))
  const f = txt(X.render(build('fichas'), 'txt'))
  assert.match(f, /^\ufeffVERSÃO FLASHBACK\r\n\r\nnota geral\r\n\r\n— 1 · Cena —\r\n\r\nAbertura/)
  assert.match(f, /\[Nota: talvez cortar\]/)
})

test('.md: negrito e itálico preservados; o que parece marcação é escapado', () => {
  const s = txt(X.render(build('secoes'), 'md'))
  const lines = s.trim().split('\n\n')
  assert.equal(lines[0], 'Abertura: a **chuva** começa *antes*.')
  assert.equal(lines[4], '***Grupo, parte dois.***')
  assert.equal(lines[2], '* * *')
  assert.equal(lines[6], '\\# não é título; 2 \\< 3 & "aspas" \\*asterisco\\* \\_sublinha\\_ \\<b\\>')
  // espaços nas pontas de um trecho marcado ficam fora dos marcadores
  const d = X.buildDoc({ model: 'corrido', pieces: [{ cards: [{ doc: D(P(T('a'), T(' b ', 'strong'), T('c'))) }] }] })
  assert.equal(txt(X.render(d, 'md')), 'a **b** c\n')
  const f = txt(X.render(build('fichas'), 'md'))
  assert.match(f, /^# Versão flashback\n\n> nota geral\n\n## 1 · Cena\n\n/)
  assert.match(f, /> \*\*Nota:\*\* talvez cortar/)
})

test('HTML da pré-visualização: texto sempre escapado; limite de blocos', () => {
  const html = X.toHTML(build('fichas'))
  assert.ok(html.includes('<strong>chuva</strong>') && html.includes('<em>antes</em>'))
  assert.ok(html.includes('2 &lt; 3 &amp; &quot;aspas&quot;') && html.includes('&lt;b&gt;'))
  assert.ok(!html.includes('<b>'))
  assert.equal(X.toHTML(build('fichas'), { limit: 3 }).split('\n').length, 3)
})

/* ---------- .docx e .odt: pacotes ZIP de XML, gerados à mão ---------- */
// Leitor de ZIP do teste, escrito à parte do gerador (src/zip.mjs): lê pelo diretório central,
// confere o cabeçalho local de cada entrada e recalcula o CRC bit a bit.
function crcBits(buf) {
  let c = 0xffffffff
  for (const byte of buf) {
    c ^= byte
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (c ^ 0xffffffff) >>> 0
}
function unzip(bytes) {
  const b = Buffer.from(bytes)
  const eocd = b.length - 22
  assert.equal(b.readUInt32LE(eocd), 0x06054b50, 'fim do diretório central')
  const n = b.readUInt16LE(eocd + 10), cdSize = b.readUInt32LE(eocd + 12), cdAt = b.readUInt32LE(eocd + 16)
  assert.equal(cdAt + cdSize, eocd)
  const files = []
  let p = cdAt
  for (let i = 0; i < n; i++) {
    assert.equal(b.readUInt32LE(p), 0x02014b50, 'entrada do diretório central')
    const method = b.readUInt16LE(p + 10), crc = b.readUInt32LE(p + 16), size = b.readUInt32LE(p + 24)
    const nameLen = b.readUInt16LE(p + 28), extra = b.readUInt16LE(p + 30), comment = b.readUInt16LE(p + 32), at = b.readUInt32LE(p + 42)
    const name = b.toString('utf8', p + 46, p + 46 + nameLen)
    assert.equal(method, 0, name + ': sem compressão')
    assert.equal(b.readUInt32LE(at), 0x04034b50, name + ': cabeçalho local')
    assert.equal(b.readUInt16LE(at + 8), 0); assert.equal(b.readUInt32LE(at + 14), crc)
    assert.equal(b.readUInt32LE(at + 18), size); assert.equal(b.readUInt32LE(at + 22), size)
    const lName = b.readUInt16LE(at + 26), lExtra = b.readUInt16LE(at + 28)
    assert.equal(b.toString('utf8', at + 30, at + 30 + lName), name)
    const data = b.subarray(at + 30 + lName + lExtra, at + 30 + lName + lExtra + size)
    assert.equal(crcBits(data), crc, name + ': CRC')
    files.push({ name, data, text: data.toString('utf8'), at, extra: lExtra })
    p += 46 + nameLen + extra + comment
  }
  assert.equal(p, eocd)
  return files
}
const part = (files, name) => { const f = files.find((x) => x.name === name); assert.ok(f, 'falta ' + name); return f.text }
const unx = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
const HARD = '# não é título; 2 < 3 & "aspas" *asterisco* _sublinha_ <b>'

/** Parágrafos do document.xml: [{ style, runs: [{ text, b, i }] }]. */
function docxParas(xml) {
  return [...xml.matchAll(/<w:p>(.*?)<\/w:p>/gs)].map(([, p]) => ({
    style: /<w:pStyle w:val="([^"]+)"/.exec(p)?.[1] || '',
    runs: [...p.matchAll(/<w:r>(.*?)<\/w:r>/gs)].map(([, r]) => ({
      text: unx([...r.matchAll(/<w:t xml:space="preserve">(.*?)<\/w:t>|(<w:tab\/>)/gs)].map((m) => (m[2] ? '\t' : m[1])).join('')),
      b: r.includes('<w:b/>'), i: r.includes('<w:i/>'),
    })),
  }))
}
/** Parágrafos do content.xml: [{ tag, style, text, spans: [[estilo, texto]] }]. */
function odtParas(xml) {
  const body = /<office:text>(.*)<\/office:text>/s.exec(xml)[1]
  const flat = (t) => unx(t.replace(/<text:s\/>/g, ' ').replace(/<text:tab\/>/g, '\t').replace(/<[^>]+>/g, ''))
  return [...body.matchAll(/<text:(p|h) text:style-name="([^"]+)"[^>]*>(.*?)<\/text:\1>/gs)].map(([, tag, style, inner]) => ({
    tag, style, text: flat(inner),
    spans: [...inner.matchAll(/<text:span text:style-name="([^"]+)">(.*?)<\/text:span>/gs)].map((m) => [m[1], flat(m[2])]),
  }))
}

test('.docx: pacote válido, texto na ordem, negrito/itálico e estilos', () => {
  const files = unzip(X.render(build('fichas'), 'docx'))
  assert.deepEqual(files.map((f) => f.name), ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/_rels/document.xml.rels', 'word/styles.xml', 'docProps/core.xml'])
  // tudo o que está no pacote tem tipo declarado e é alcançável pelas relações
  const types = part(files, '[Content_Types].xml')
  for (const n of ['/word/document.xml', '/word/styles.xml', '/docProps/core.xml']) assert.ok(types.includes(`PartName="${n}"`), n)
  assert.ok(part(files, '_rels/.rels').includes('Target="word/document.xml"'))
  assert.ok(part(files, 'word/_rels/document.xml.rels').includes('Target="styles.xml"'))
  assert.ok(part(files, 'docProps/core.xml').includes('<dc:title>Versão flashback</dc:title>'))

  const paras = docxParas(part(files, 'word/document.xml'))
  assert.deepEqual(paras.map((p) => [p.style, p.runs.map((r) => r.text).join('')]), [
    ['Title', 'Versão flashback'], ['Subtitle', 'nota geral'],
    ['Heading2', '1 · Cena'], ['', 'Abertura: a chuva começa antes.'], ['', 'Segundo parágrafo.'], ['Nota', 'Nota: talvez cortar'],
    ['Heading2', '2'], ['', 'Grupo, parte um.'],
    ['Heading2', '3 · Lugar'], ['', 'Grupo, parte dois.'],
    ['Heading2', '4 · Nota'], ['', HARD],
  ])
  assert.deepEqual(paras[3].runs.map((r) => [r.text, r.b, r.i]), [
    ['Abertura: a ', false, false], ['chuva', true, false], [' começa ', false, false], ['antes', false, true], ['.', false, false],
  ])
  assert.deepEqual(paras[9].runs.map((r) => [r.b, r.i]), [[true, true]])
  // todo estilo usado existe no styles.xml
  const styles = part(files, 'word/styles.xml')
  for (const id of new Set(paras.map((p) => p.style).filter(Boolean))) assert.ok(styles.includes(`w:styleId="${id}"`), id)
  // o texto do autor nunca vira marcação XML
  assert.ok(!part(files, 'word/document.xml').includes('<b>'))

  const sec = docxParas(part(unzip(X.render(build('secoes'), 'docx')), 'word/document.xml'))
  assert.deepEqual(sec.filter((p) => p.style === 'Separador').map((p) => p.runs[0].text), ['* * *', '* * *'])
  assert.equal(sec.length, 7)
})

test('.odt: mimetype primeiro e sem compressão, manifesto completo, texto e formatação', () => {
  const bytes = X.render(build('fichas'), 'odt')
  const files = unzip(bytes)
  assert.deepEqual(files.map((f) => f.name), ['mimetype', 'content.xml', 'styles.xml', 'meta.xml', 'META-INF/manifest.xml'])
  // é assim que os programas reconhecem um .odt: "mimetype" logo no byte 30, o tipo no byte 38
  assert.equal(files[0].at, 0); assert.equal(files[0].extra, 0)
  assert.equal(Buffer.from(bytes).toString('latin1', 30, 38 + 39), 'mimetypeapplication/vnd.oasis.opendocument.text')
  const manifest = part(files, 'META-INF/manifest.xml')
  for (const n of ['content.xml', 'styles.xml', 'meta.xml']) assert.ok(manifest.includes(`manifest:full-path="${n}"`), n)
  assert.ok(part(files, 'meta.xml').includes('<dc:title>Versão flashback</dc:title>'))

  const content = part(files, 'content.xml')
  const paras = odtParas(content)
  assert.deepEqual(paras.map((p) => [p.tag, p.style, p.text]), [
    ['p', 'Title', 'Versão flashback'], ['p', 'Subtitle', 'nota geral'],
    ['h', 'Heading_20_2', '1 · Cena'], ['p', 'Standard', 'Abertura: a chuva começa antes.'], ['p', 'Standard', 'Segundo parágrafo.'], ['p', 'Nota', 'Nota: talvez cortar'],
    ['h', 'Heading_20_2', '2'], ['p', 'Standard', 'Grupo, parte um.'],
    ['h', 'Heading_20_2', '3 · Lugar'], ['p', 'Standard', 'Grupo, parte dois.'],
    ['h', 'Heading_20_2', '4 · Nota'], ['p', 'Standard', HARD],
  ])
  assert.deepEqual(paras[3].spans, [['T1', 'chuva'], ['T2', 'antes']])
  assert.deepEqual(paras[9].spans, [['T3', 'Grupo, parte dois.']])
  assert.match(content, /<style:style style:name="T1" style:family="text"><style:text-properties fo:font-weight="bold"/)
  assert.match(content, /<style:style style:name="T2" style:family="text"><style:text-properties fo:font-style="italic"/)
  const styles = part(files, 'styles.xml')
  for (const name of new Set(paras.map((p) => p.style))) assert.ok(styles.includes(`style:name="${name}"`), name)

  // espaços seguidos e tabulação sobrevivem (no ODF, espaço repetido precisa virar <text:s/>)
  const sp = X.buildDoc({ model: 'corrido', pieces: [{ cards: [{ doc: D(P(T('a  b'), T(' '), T(' c\td', 'em'))) }] }] })
  const x = part(unzip(X.render(sp, 'odt')), 'content.xml')
  assert.ok(x.includes('a <text:s/>b <text:span text:style-name="T2"><text:s/>c<text:tab/>d</text:span>'), x)
  assert.equal(docxParas(part(unzip(X.render(sp, 'docx')), 'word/document.xml'))[0].runs.map((r) => r.text).join(''), 'a  b  c\td')
})

test('.docx/.odt: caracteres que quebrariam o XML não passam; documento vazio ainda abre', () => {
  const bad = X.buildDoc({ title: 'a\u0001b', model: 'fichas', pieces: [{ cards: [{ doc: D(P(T('x\u0000y\u000bz\ufffe]]>&amp;'))) }] }] })
  for (const f of ['docx', 'odt']) {
    for (const file of unzip(X.render(bad, f))) assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe]/.test(file.text), `${f}: ${file.name}`)
  }
  assert.equal(docxParas(part(unzip(X.render(bad, 'docx')), 'word/document.xml'))[2].runs[0].text, 'x y z ]]>&amp;')
  const empty = X.buildDoc({ model: 'corrido', pieces: [] })
  assert.ok(part(unzip(X.render(empty, 'docx')), 'word/document.xml').includes('<w:p/>'))
  assert.ok(part(unzip(X.render(empty, 'odt')), 'content.xml').includes('<text:p text:style-name="Standard"/>'))
})

/* Se houver LibreOffice na máquina, abre os arquivos de verdade e compara o texto que ele leu.
 * Sem LibreOffice o teste é pulado (o Word não tem como ser automatizado aqui). */
const { spawnSync } = require('node:child_process')
const hasOffice = spawnSync('soffice', ['--version'], { timeout: 20000 }).status === 0
test('.docx/.odt: o LibreOffice abre e lê o mesmo texto', { skip: !hasOffice && 'LibreOffice (soffice) não está instalado' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cartoes-lo-'))
  const want = ['Versão flashback', 'nota geral', '1 · Cena', 'Abertura: a chuva começa antes.', 'Segundo parágrafo.', 'Nota: talvez cortar',
    '2', 'Grupo, parte um.', '3 · Lugar', 'Grupo, parte dois.', '4 · Nota', HARD]
  try {
    for (const f of ['docx', 'odt']) {
      const src = path.join(dir, `de-${f}.${f}`)
      fs.writeFileSync(src, X.render(build('fichas'), f))
      const r = spawnSync('soffice', ['--headless', `-env:UserInstallation=file://${dir.split('\\').join('/')}/perfil`, '--convert-to', 'txt:Text (encoded):UTF8', '--outdir', dir, src], { timeout: 120000 })
      assert.equal(r.status, 0, String(r.stderr))
      const got = fs.readFileSync(path.join(dir, `de-${f}.txt`), 'utf8').replace(/^\ufeff/, '').split(/\r?\n/).filter(Boolean)
      assert.deepEqual(got, want, f)
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
})

/* ---------- a janela, no navegador ---------- */
const MESA = [
  { id: 'a', x: 40, y: 60, cat: 'cena', doc: D(P(T('alfa '), T('forte', 'strong'))) },
  { id: 'b', x: 420, y: 60, doc: doc('beta') },
  { id: 'c', x: 40, y: 320, doc: doc('gama') },
]
const ORG = {
  cur: 'o1',
  orders: [{ id: 'o1', name: 'Invertida', note: 'sobre a ordem', notes: { c: 'nota do gama' }, createdAt: 1, updatedAt: 2,
    items: [{ ids: ['c'], aside: false }, { ids: ['b'], aside: true }, { ids: ['a'], aside: false }] }],
}
async function open(extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await seed(page, { 'cartoes.v1': JSON.stringify(MESA), 'cartoes.v1.t': String(Date.now()), ...extra })
  await page.goto(URL_APP); await sleep(400)
  return { ctx, page, errors }
}
async function exportar(page) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#x-go')])
  const file = path.join(os.tmpdir(), `cartoes-exp-${Date.now()}-${dl.suggestedFilename()}`)
  await dl.saveAs(file)
  const bytes = fs.readFileSync(file)
  fs.rmSync(file, { force: true })
  return { name: dl.suggestedFilename(), bytes }
}
const choose = (page, text) => page.locator('#sheet .x-opt', { hasText: text }).click()

test('janela Exportar: sem ordem salva usa a mesa; baixa .txt e .md com o texto na ordem de leitura', async () => {
  const { ctx, page, errors } = await open()
  await page.click('#menu-btn'); await page.click('#menu [data-id="export"]')
  assert.equal(await page.textContent('#sheet-title'), 'Exportar')
  assert.deepEqual(await page.$$eval('#sheet [data-key="src"] .x-l', (els) => els.map((e) => e.firstChild.textContent)), ['a mesa como está'])
  assert.equal(await page.textContent('.x-info'), '3 cartões')
  assert.match(await page.innerHTML('.x-page'), /alfa <strong>forte<\/strong>/)

  await choose(page, 'Texto (.txt)')
  const t = await exportar(page)
  assert.match(t.name, /^cartoes-\d{4}-\d{2}-\d{2}\.txt$/)
  assert.equal(t.bytes.toString('utf8').slice(1), 'alfa forte\r\n\r\nbeta\r\n\r\ngama\r\n')
  assert.equal(await page.locator('#sheet').isVisible(), false)
  assert.match(await page.textContent('#toast'), /Exportado: cartoes-.*\.txt/)

  await page.keyboard.press('Control+e')                       // atalho; lembra o último formato
  assert.equal(await page.isChecked('#sheet input[value="txt"]'), true)
  await choose(page, 'Markdown (.md)'); await choose(page, 'uma seção por cartão')
  const m = await exportar(page)
  assert.equal(m.bytes.toString('utf8'), 'alfa **forte**\n\n* * *\n\nbeta\n\n* * *\n\ngama\n')
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('janela Exportar: ordem salva vem escolhida; o que está de lado fica de fora; fichas levam as notas', async () => {
  const { ctx, page, errors } = await open({ 'cartoes.org': JSON.stringify(ORG) })
  await page.keyboard.press('Control+e')
  assert.deepEqual(await page.$$eval('#sheet [data-key="src"] .x-l', (els) => els.map((e) => e.firstChild.textContent)), ['«Invertida»', 'a mesa como está'])
  assert.equal(await page.isChecked('#sheet input[value="o1"]'), true)
  assert.equal(await page.textContent('.x-info'), '2 cartões · 1 de lado fica de fora')
  await choose(page, 'fichas completas'); await choose(page, 'Markdown (.md)')
  assert.match(await page.textContent('.x-page'), /Invertida/)
  const m = await exportar(page)
  assert.match(m.name, /^Invertida-\d{4}-\d{2}-\d{2}\.md$/)
  assert.equal(m.bytes.toString('utf8'),
    '# Invertida\n\n> sobre a ordem\n\n## 1\n\ngama\n\n> **Nota:** nota do gama\n\n## 2 · Cena\n\nalfa **forte**\n')
  // a mesa não mudou e nada foi gravado nas ordens por exportar
  assert.deepEqual((await page.evaluate(() => cartoes.ordens())).orders[0].items.map((it) => it.ids[0]), ['c', 'b', 'a'])

  await page.keyboard.press('Control+e'); await choose(page, 'a mesa como está')
  assert.equal(await page.textContent('.x-info'), '3 cartões')
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('#sheet').isVisible(), false)
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('janela Exportar: .docx e .odt baixados são pacotes íntegros, com XML bem formado e o texto da ordem', async () => {
  const { ctx, page, errors } = await open({ 'cartoes.org': JSON.stringify(ORG) })
  await page.keyboard.press('Control+e')
  assert.deepEqual(await page.$$eval('#sheet [data-key="format"] input', (els) => els.map((e) => e.value)), FORMAT_IDS)
  for (const [label, ext] of [['Word (.docx)', 'docx'], ['LibreOffice (.odt)', 'odt']]) {
    if (!(await page.locator('#sheet').isVisible())) await page.keyboard.press('Control+e')
    await choose(page, label); await choose(page, 'uma seção por cartão')
    const f = await exportar(page)
    assert.match(f.name, new RegExp(`^Invertida-\\d{4}-\\d{2}-\\d{2}\\.${ext}$`))
    const files = unzip(f.bytes)
    // cada parte XML passa por um analisador de XML de verdade (o do navegador)
    for (const x of files.filter((y) => y.name !== 'mimetype')) {
      const err = await page.evaluate((t) => new DOMParser().parseFromString(t, 'application/xml').querySelector('parsererror')?.textContent || null, x.text)
      assert.equal(err, null, `${ext}: ${x.name}`)
    }
    const paras = ext === 'docx'
      ? docxParas(part(files, 'word/document.xml')).map((p) => p.runs.map((r) => (r.b ? `[${r.text}]` : r.text)).join(''))
      : odtParas(part(files, 'content.xml')).map((p) => p.spans.reduce((t, [, s]) => t.replace(s, `[${s}]`), p.text))
    assert.deepEqual(paras, ['gama', '* * *', 'alfa [forte]']) // "beta" está de lado: fica de fora
  }
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('janela Exportar: mesa sem texto avisa em vez de abrir', async () => {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(URL_APP); await page.waitForSelector('.ProseMirror-focused')
  await page.keyboard.press('Control+e'); await sleep(200)
  assert.equal(await page.locator('#sheet').isVisible(), false)
  assert.match(await page.textContent('#toast'), /Escreva em algum cartão antes de exportar/)
  await ctx.close()
})
