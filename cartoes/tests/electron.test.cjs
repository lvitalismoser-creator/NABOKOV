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
const { ROOT, sleep, eventually, texts } = require('./helpers.cjs')

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

test('pontinho de salvo diz "em disco" depois de gravar o arquivo', async () => {
  const { win } = await launch()
  await win.keyboard.type('no arquivo')
  assert.ok(await eventually(async () => (await win.locator('#saved').getAttribute('class')) === 'saved'))
  assert.match(await win.locator('#saved').getAttribute('data-tip'), /^salvo às \d\d:\d\d · em disco$/)
  assert.ok(fs.readFileSync(FILE, 'utf8').includes('no arquivo'))
})

test('instantâneo do disco aparece no menu e restaurar regrava o projeto.json', async () => {
  // o instantâneo só existe em disco (perfil novo: IndexedDB e localStorage vazios)
  const t0 = Date.now() - 3600e3
  const old = { savedAt: t0, cards: [{ id: 'a', x: 80, y: 90, doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'versao antiga' }] }] } }], trash: [], org: { orders: [], cur: null } }
  fs.mkdirSync(path.join(data, 'snapshots'), { recursive: true })
  fs.writeFileSync(path.join(data, 'snapshots', t0 + '.json'), JSON.stringify(old))
  fs.writeFileSync(FILE, JSON.stringify(old))
  const { app, win } = await launch()
  await win.locator('.card .ProseMirror').first().click()
  await win.keyboard.press('End'); await win.keyboard.type(' e depois mudou'); await sleep(900)
  await win.keyboard.press('Escape')
  assert.ok(JSON.stringify(readFile().cards).includes('e depois mudou'))
  await win.click('#menu-btn'); await win.click('#menu button:has-text("Instantâneos")')
  await win.waitForSelector('#sheet .rows li')
  await win.locator('#sheet .rows li button.act').last().click() // o mais antigo
  await win.click('#sheet .r-yes')
  assert.ok(await eventually(async () => (await texts(win)).join() === 'versao antiga', { timeout: 8000 }))
  await closeApp(app)
  assert.deepEqual(readFile().cards.map((k) => k.doc.content[0].content[0].text), ['versao antiga'])
  // o estado que foi substituído ficou guardado como instantâneo, em disco
  const kept = fs.readdirSync(path.join(data, 'snapshots')).map((n) => fs.readFileSync(path.join(data, 'snapshots', n), 'utf8'))
  assert.ok(kept.some((t) => t.includes('e depois mudou')))
})

test('exportar TXT, MD e PDF pelo diálogo de salvar; cancelar não grava nada', async () => {
  const { app, win } = await launch()
  await win.keyboard.type('Primeira *cena* do livro')
  await win.keyboard.press('Control+Enter')
  // texto longo, para o PDF passar de uma página
  await win.evaluate(() => navigator.clipboard?.writeText?.('').catch(() => {}))
  for (let i = 0; i < 8; i++) { await win.keyboard.insertText('Parágrafo comprido para encher a página. '.repeat(12)); await win.keyboard.press('Enter') }
  await win.keyboard.press('Escape')
  const out = path.join(data, 'saida')
  fs.mkdirSync(out)
  const answer = (file) => app.evaluate(({ dialog }, f) => { dialog.showSaveDialog = async () => (f ? { canceled: false, filePath: f } : { canceled: true }) }, file)
  const exportAs = async (format) => {
    await win.keyboard.press('Control+e')
    await win.click(`.exp-choice button[data-v="${format}"]`)
    await win.click('.exp-choice button[data-v="corrido"]')
    await win.click('#exp-go')
  }
  // cancelar: a janela continua aberta e nada é gravado
  await answer(null)
  await exportAs('txt'); await sleep(400)
  assert.equal(await win.locator('#sheet').isVisible(), true)
  assert.deepEqual(fs.readdirSync(out), [])
  await win.keyboard.press('Escape')

  await answer(path.join(out, 'livro.txt'))
  await exportAs('txt')
  await win.waitForSelector('#sheet', { state: 'hidden' })
  const txt = fs.readFileSync(path.join(out, 'livro.txt'), 'utf8')
  assert.ok(txt.startsWith('Primeira *cena* do livro\n\nParágrafo comprido'))
  assert.match(await win.textContent('#toast'), /Exportei «livro\.txt» · está em .*saida/)
  assert.equal(await win.textContent('#toast button'), 'mostrar na pasta')

  await answer(path.join(out, 'livro'))            // sem extensão: o app completa
  await exportAs('md')
  await win.waitForSelector('#sheet', { state: 'hidden' })
  assert.ok(fs.readFileSync(path.join(out, 'livro.md'), 'utf8').startsWith('Primeira *cena* do livro\n\n'))

  await answer(path.join(out, 'livro.pdf'))
  await exportAs('pdf')
  await win.waitForSelector('#sheet', { state: 'hidden', timeout: 20000 })
  const pdf = fs.readFileSync(path.join(out, 'livro.pdf'))
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
  assert.ok(pdf.length > 5000, 'pdf pequeno demais: ' + pdf.length)
  const pages = pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []
  assert.ok(pages.length >= 2, 'esperava 2 páginas ou mais, veio ' + pages.length)
  assert.deepEqual(fs.readdirSync(out).sort(), ['livro.md', 'livro.pdf', 'livro.txt']) // sem .tmp esquecido
  // exportar não mexe no projeto
  assert.equal(readFile().cards.length, 2)
})

test('Ctrl+0 e Ctrl+1 são da mesa (o zoom de página do menu não os toma)', async () => {
  const far = (id, x, y, text) => ({ id, x, y, r: 0, doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } })
  fs.writeFileSync(FILE, JSON.stringify({ savedAt: Date.now() - 5000, cards: [far('a', 100, 100, 'perto'), far('b', 3200, 2100, 'longe')], trash: [], org: { orders: [], cur: null } }))
  const { app, win } = await launch()
  const zoom = () => win.evaluate(() => new DOMMatrix(getComputedStyle(document.getElementById('world')).transform).a)
  assert.equal(await zoom(), 1)
  await win.keyboard.press('Control+0'); await sleep(500)
  const z = await zoom()
  assert.ok(z < 0.6, 'zoom ' + z)
  assert.equal(await win.locator('.card', { hasText: 'longe' }).isVisible(), true)
  assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.getZoomFactor()), 1)
  await win.keyboard.press('Control+1'); await sleep(500)
  assert.equal(await zoom(), 1)
  await closeApp(app)
  assert.deepEqual(readFile().cards.map((k) => [k.x, k.y]), [[100, 100], [3200, 2100]]) // a câmera não entra no projeto
})

test('a segunda instância não abre', async () => {
  await launch()
  const electronBin = require('electron')
  const second = spawnSync(electronBin, [ROOT], { env: { ...process.env, CARTOES_DATA_DIR: data }, timeout: 15000 })
  assert.equal(second.error, undefined)
  assert.equal(second.status, 0) // saiu sozinha, sem ficar pendurada
})
