'use strict'
/* App desktop: gravação em disco, recuperação e instância única.
 * Usa CARTOES_DATA_DIR para nunca tocar nos dados reais do usuário. */
const { test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { _electron } = require('playwright')
const { ROOT, sleep, eventually, texts, pdfText } = require('./helpers.cjs')

let data, FILE, opened
beforeEach(() => {
  data = fs.mkdtempSync(path.join(os.tmpdir(), 'cartoes-e2e-'))
  FILE = path.join(data, 'projeto.json')
  opened = []
})
afterEach(async () => {
  for (const app of opened) { try { await app.close() } catch {} }
  fs.rmSync(data, { recursive: true, force: true })
})

async function launch() {
  const app = await _electron.launch({ args: [ROOT], env: { ...process.env, CARTOES_DATA_DIR: data } })
  opened.push(app)
  const win = await app.firstWindow()
  await win.waitForSelector('.card, #empty', { state: 'attached' })
  await sleep(500)
  return { app, win }
}
const closeApp = async (app) => { await app.close(); opened = opened.filter((a) => a !== app) }

test('ordens do organizador vão para o projeto.json e voltam ao reabrir', async () => {
  let { app, win } = await launch()
  await win.keyboard.type('primeira')
  await win.keyboard.press('Control+Enter'); await win.keyboard.type('segunda')
  await win.keyboard.press('Escape')
  await win.keyboard.press('e'); await win.waitForSelector('#show:not([hidden])')
  await win.keyboard.press('Alt+ArrowRight')
  await win.click('#org-save')
  await win.locator('#org-name-input').fill('no disco')
  await win.keyboard.press('Enter')
  await closeApp(app)
  const rec = readFile()
  const o = rec.org.orders.find((x) => x.name === 'no disco')
  assert.ok(o)
  const textOf = (id) => JSON.stringify(rec.cards.find((k) => k.id === id).doc)
  assert.deepEqual(o.items.map((it) => (textOf(it.ids[0]).includes('segunda') ? 'segunda' : 'primeira')), ['segunda', 'primeira'])

  ;({ app, win } = await launch())
  await win.keyboard.press('Escape')
  await win.keyboard.press('e'); await win.waitForSelector('#show:not([hidden])')
  assert.match(await win.textContent('#org-name'), /«no disco»/)
})
const readFile = () => JSON.parse(fs.readFileSync(FILE, 'utf8'))

test('a página só enxerga a ponte do disco, sem Node', async () => {
  const { win } = await launch()
  assert.equal(await win.evaluate(() => typeof window.cartoesDisk?.saveSync), 'function')
  assert.equal(await win.evaluate(() => typeof window.require), 'undefined')
  assert.equal(await win.evaluate(() => typeof window.process), 'undefined')
  // a janela não navega para fora do app (só pode recarregar a si mesma)
  await win.evaluate(() => { location.href = 'file:///etc/hostname' }); await sleep(400)
  assert.match(win.url(), /index\.html$/)
})

test('o pontinho de salvo diz "em disco" depois que o arquivo foi gravado', async () => {
  const { win } = await launch()
  await win.keyboard.type('no arquivo')
  const tip = await eventually(() => win.evaluate(() => {
    const d = document.getElementById('save-dot')
    return d.dataset.state === 'saved' && /às/.test(d.dataset.tip) && d.dataset.tip
  }))
  assert.match(tip, /^salvo às \d\d:\d\d · em disco$/)
  assert.ok(JSON.stringify(readFile()).includes('no arquivo')) // só diz "salvo" com o arquivo já gravado
})

test('fechar a janela logo após digitar grava o texto, sem .tmp sobrando', async () => {
  const { app, win } = await launch()
  await win.keyboard.type('primeiro texto')
  await closeApp(app) // antes do debounce: depende da gravação síncrona no fechamento
  assert.ok(JSON.stringify(readFile()).includes('primeiro texto'))
  assert.equal(fs.existsSync(FILE + '.tmp'), false)
})

test('o disco vale mesmo com o cache do navegador limpo; Ctrl+N cria cartão', async () => {
  let { app, win } = await launch()
  await win.keyboard.type('texto no disco'); await sleep(800)
  await win.evaluate(() => localStorage.clear())
  await closeApp(app)

  ;({ app, win } = await launch())
  assert.deepEqual(await texts(win), ['texto no disco'])
  const before = await win.locator('.card').count()
  await win.mouse.click(5, 5); await win.keyboard.press('Control+n')
  assert.ok(await eventually(async () => (await win.locator('.card').count()) === before + 1))
})

test('cria .bak e instantâneos; arquivo quebrado é preservado e recuperado do .bak', async () => {
  let { app, win } = await launch()
  await win.keyboard.type('um'); await win.keyboard.press('Control+Enter'); await sleep(300)
  await win.keyboard.type('dois'); await sleep(800)
  await closeApp(app)
  ;({ app, win } = await launch())            // 2ª abertura renova o .bak a partir do arquivo bom
  await win.mouse.click(5, 5); await win.keyboard.press('Control+n'); await sleep(300)
  await win.keyboard.type('tres'); await sleep(800)
  await closeApp(app)
  assert.ok(fs.existsSync(FILE + '.bak'))
  assert.ok(fs.readdirSync(path.join(data, 'snapshots')).length >= 1)

  fs.writeFileSync(FILE, '{ meio escrito')
  ;({ app, win } = await launch())
  assert.match(await win.locator('#toast').textContent(), /recuperei a cópia anterior/)
  assert.ok((await texts(win)).length >= 1)
  assert.ok(fs.readdirSync(data).some((n) => n.startsWith('projeto.corrompido-')))
  await closeApp(app)
  assert.doesNotThrow(readFile) // o arquivo voltou a ser válido
})

test('restaurar instantâneo pelo menu vale também para o arquivo em disco', async () => {
  // o instantâneo de abertura guarda o que já estava no arquivo
  fs.writeFileSync(FILE, JSON.stringify({ savedAt: 5, cards: [{ id: 'a', x: 60, y: 60, doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'versao um' }] }] } }] }))
  const { win } = await launch()
  assert.ok(await eventually(async () => (await win.evaluate(() => cartoes.snapshots())).length))
  await win.locator('.card .ProseMirror').click()
  await win.keyboard.press('End'); await win.keyboard.type(' e dois')
  await eventually(() => JSON.stringify(readFile()).includes('versao um e dois'))
  await win.keyboard.press('Escape')
  await win.click('#menu-btn'); await win.click('#menu [data-id="snaps"]')
  await win.waitForSelector('#sheet .sheet-row')
  await win.locator('#sheet .sheet-row').last().locator('button').click() // o mais antigo
  await win.click('#sheet .sheet-row button.strong')
  assert.ok(await eventually(async () => (await texts(win)).join() === 'versao um', { timeout: 8000 }))
  assert.ok(await eventually(() => { const t = JSON.stringify(readFile()); return t.includes('versao um') && !t.includes('e dois') }))
})

/** Troca o "Salvar como" do sistema por uma resposta pronta (não dá para clicar num diálogo nativo). */
const answerSaveDialog = (app, filePath) => app.evaluate(({ dialog }, p) => {
  dialog.showSaveDialog = async (_w, opts) => { global.__asked = opts; return p ? { canceled: false, filePath: p } : { canceled: true } }
}, filePath)

test('exportar grava o arquivo escolhido no "Salvar como"; cancelar não grava nada', async () => {
  const { app, win } = await launch()
  await win.keyboard.type('texto para ')
  await win.keyboard.type('**exportar**')
  await win.keyboard.press('Escape')
  const out = path.join(data, 'saida', 'meu livro.md')
  fs.mkdirSync(path.dirname(out))

  await answerSaveDialog(app, null)                               // usuário cancela
  await win.keyboard.press('Control+e')
  await win.locator('#sheet .x-opt', { hasText: 'Markdown (.md)' }).click()
  await win.click('#x-go'); await sleep(400)
  assert.equal(fs.existsSync(out), false)
  assert.equal(await win.locator('#sheet').isVisible(), true)     // a janela continua aberta

  await answerSaveDialog(app, out)
  await win.click('#x-go')
  assert.ok(await eventually(() => fs.existsSync(out)))
  assert.equal(fs.readFileSync(out, 'utf8'), 'texto para **exportar**\n')
  const asked = await app.evaluate(() => global.__asked)
  assert.match(path.basename(asked.defaultPath), /^cartoes-\d{4}-\d{2}-\d{2}\.md$/)
  assert.deepEqual(asked.filters[0].extensions, ['md'])
  assert.match(await win.textContent('#toast'), /Exportado: meu livro\.md/)
  assert.equal(await win.locator('#sheet').isVisible(), false)

  // a ponte recusa o que não é exportação: extensão estranha ou dados que não são bytes
  assert.deepEqual(await win.evaluate(() => window.cartoesDisk.exportFile({ name: 'x.exe', data: new Uint8Array(1) })), { ok: false })
  assert.deepEqual(await win.evaluate(() => window.cartoesDisk.exportFile({ name: 'x.txt', data: 'texto' })), { ok: false })
})

test('exportar em PDF e em .docx: arquivos reais no disco, com o texto dos cartões', async () => {
  const para = (text, mark) => ({ type: 'paragraph', content: [{ type: 'text', text, ...(mark ? { marks: [{ type: mark }] } : {}) }] })
  const cards = []
  for (let i = 0; i < 30; i++) {
    cards.push({ id: 'c' + i, x: 40 + (i % 3) * 360, y: 60 + Math.floor(i / 3) * 230, cat: i % 2 ? 'cena' : null,
      doc: { type: 'doc', content: [para(`Cartão ${i}: ação e coração.`), para('em negrito', 'strong'), para('em itálico', 'em'), para('Frase para encher a página. '.repeat(12))] } })
  }
  fs.writeFileSync(FILE, JSON.stringify({ savedAt: 5, cards }))
  const { app, win } = await launch()
  await win.keyboard.press('Escape'); await win.mouse.click(5, 5)

  const pdf = path.join(data, 'livro.pdf')
  await answerSaveDialog(app, pdf)
  await win.keyboard.press('Control+e')
  await win.locator('#sheet .x-opt', { hasText: 'PDF' }).click()
  await win.locator('#sheet .x-opt', { hasText: 'fichas completas' }).click()
  await win.click('#x-go')
  assert.ok(await eventually(() => fs.existsSync(pdf) && fs.statSync(pdf).size > 5000, { timeout: 15000 }))
  await win.waitForSelector('#toast.show')
  const bytes = fs.readFileSync(pdf)
  assert.equal(bytes.toString('latin1', 0, 5), '%PDF-')
  assert.match(bytes.toString('latin1', bytes.length - 8), /%%EOF\s*$/)
  const r = pdfText(bytes)
  assert.ok(r.pages >= 5, 'várias páginas: ' + r.pages)           // 30 fichas não cabem em poucas páginas
  assert.equal(r.fonts, 3)                                         // normal, negrito e itálico embutidos
  const flat = r.text.replace(/\s/g, '')
  assert.ok(!flat.includes('�'))
  for (const i of [0, 14, 29]) assert.ok(flat.includes(`Cartão${i}:açãoecoração.`), 'falta o cartão ' + i)
  assert.ok(flat.indexOf('Cartão0:') < flat.indexOf('Cartão1:') && flat.indexOf('Cartão1:') < flat.indexOf('Cartão29:')) // ordem de leitura da mesa
  assert.ok(flat.includes('2·CENA'))
  assert.ok(!flat.includes('organizar') && !flat.includes('duploclique')) // nada da interface vai para o papel
  assert.equal((await app.evaluate(() => global.__asked)).filters[0].extensions[0], 'pdf')
  assert.equal(await win.title(), 'Cartões')                       // o título da janela volta ao normal
  assert.equal(await win.innerHTML('#print-root'), '')

  const docx = path.join(data, 'livro.docx')
  await answerSaveDialog(app, docx)
  await win.keyboard.press('Control+e')
  await win.locator('#sheet .x-opt', { hasText: 'Word (.docx)' }).click()
  await win.click('#x-go')
  assert.ok(await eventually(() => fs.existsSync(docx)))
  const z = fs.readFileSync(docx)
  assert.equal(z.readUInt32LE(0), 0x04034b50)                      // os bytes atravessaram a ponte intactos
  assert.ok(z.includes(Buffer.from('Cartão 29: ação e coração.', 'utf8')))
})

test('a segunda instância não abre', async () => {
  await launch()
  const electronBin = require('electron')
  const second = spawnSync(electronBin, [ROOT], { env: { ...process.env, CARTOES_DATA_DIR: data }, timeout: 15000 })
  assert.equal(second.error, undefined)
  assert.equal(second.status, 0) // saiu sozinha, sem ficar pendurada
})
