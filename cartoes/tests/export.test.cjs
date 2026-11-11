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

test('janela Exportar: mesa sem texto avisa em vez de abrir', async () => {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(URL_APP); await page.waitForSelector('.ProseMirror-focused')
  await page.keyboard.press('Control+e'); await sleep(200)
  assert.equal(await page.locator('#sheet').isVisible(), false)
  assert.match(await page.textContent('#toast'), /Escreva em algum cartão antes de exportar/)
  await ctx.close()
})
