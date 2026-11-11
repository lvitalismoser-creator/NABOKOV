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

test('a segunda instância não abre', async () => {
  await launch()
  const electronBin = require('electron')
  const second = spawnSync(electronBin, [ROOT], { env: { ...process.env, CARTOES_DATA_DIR: data }, timeout: 15000 })
  assert.equal(second.error, undefined)
  assert.equal(second.status, 0) // saiu sozinha, sem ficar pendurada
})
