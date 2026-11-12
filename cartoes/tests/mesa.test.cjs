'use strict'
/* Mesa: arrasto, ímã e grupos (escritos antes da Fase 7 mexer neles),
 * câmera (Fase 7a) e, depois, tamanhos, seleção e modo mapa (Fase 7b). */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { chromium } = require('playwright')
const { URL_APP, sleep, eventually, doc, texts, ls, seed } = require('./helpers.cjs')

let browser
before(async () => { browser = await chromium.launch() })
after(async () => { await browser.close() })

const W = 340, H = 214, GAP = 18
async function open(cards, { extra = {}, viewport = { width: 1280, height: 800 }, hash = '' } = {}) {
  const ctx = await browser.newContext({ viewport })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  if (cards) await seed(page, { 'cartoes.v1': JSON.stringify(cards), 'cartoes.v1.t': String(Date.now() - 1000), ...extra })
  await page.goto(URL_APP + hash); await sleep(400)
  return { ctx, page, errors }
}
/** Estado salvo, por id. */
const saved = async (page) => {
  await page.evaluate(() => dispatchEvent(new Event('pagehide')))
  return Object.fromEntries(JSON.parse(await ls(page, 'cartoes.v1')).map((k) => [k.id, k]))
}
/** Caixa do cartão na tela. */
const box = (page, text) => page.locator('.card', { hasText: text }).boundingBox()
/** Arrasta pegando pela faixa de cima do cartão. */
async function drag(page, text, dx, dy, { shift = false, steps = 8 } = {}) {
  const b = await box(page, text)
  const x = b.x + b.width / 2, y = b.y + b.height * (14 / H)
  await page.mouse.move(x, y)
  if (shift) await page.keyboard.down('Shift')
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps })
  await page.mouse.up()
  if (shift) await page.keyboard.up('Shift')
  await sleep(50)
}
const card = (id, x, y, text, more = {}) => ({ id, x, y, r: 0, doc: doc(text), ...more })
const DOIS = [card('a', 100, 120, 'alfa'), card('b', 700, 420, 'beta')]

test('arrastar pela faixa de cima move o cartão; pelo texto não move', async () => {
  const { ctx, page, errors } = await open(DOIS)
  await drag(page, 'alfa', 60, 45)
  let s = await saved(page)
  assert.deepEqual([s.a.x, s.a.y], [160, 165])
  assert.deepEqual([s.b.x, s.b.y], [700, 420])
  // pelo texto: seleciona, não arrasta
  const b = await box(page, 'beta')
  await page.mouse.move(b.x + 40, b.y + 60); await page.mouse.down()
  await page.mouse.move(b.x + 140, b.y + 120, { steps: 6 }); await page.mouse.up()
  s = await saved(page)
  assert.deepEqual([s.b.x, s.b.y], [700, 420])
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('ímã: encostar na borda gruda com a folga certa, alinha e forma um grupo', async () => {
  const { ctx, page, errors } = await open(DOIS)
  // leva "beta" para perto da borda direita de "alfa", um pouco desalinhado
  await drag(page, 'beta', 100 + W + GAP + 12 - 700, 120 + 9 - 420)
  const s = await saved(page)
  assert.deepEqual([s.b.x, s.b.y], [100 + W + GAP, 120])
  assert.ok(s.a.g && s.a.g === s.b.g)
  assert.equal(await page.locator('.gframe').count(), 1)
  assert.equal(await page.textContent('.gframe .gn'), '2 cartões')
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('ímã por baixo e fora do alcance: gruda embaixo; longe não gruda', async () => {
  const { ctx, page } = await open(DOIS)
  await drag(page, 'beta', 100 + 10 - 700, 120 + H + GAP - 14 - 420)
  let s = await saved(page)
  assert.deepEqual([s.b.x, s.b.y], [100, 120 + H + GAP])
  assert.ok(s.a.g && s.a.g === s.b.g)
  await ctx.close()
  const o = await open(DOIS)
  await drag(o.page, 'beta', 100 + W + GAP + 60 - 700, 120 - 420) // 60 px além da folga: fora do alcance
  s = await saved(o.page)
  assert.deepEqual([s.b.x, s.b.y], [100 + W + GAP + 60, 120])
  assert.equal(s.a.g, null); assert.equal(s.b.g, null)
  assert.equal(await o.page.locator('.gframe').count(), 0)
  await o.ctx.close()
})

test('grupo anda junto; Shift + arrastar solta um cartão; "desagrupar" solta todos', async () => {
  const GRUPO = [card('a', 100, 120, 'alfa', { g: 'g1' }), card('b', 100 + W + GAP, 120, 'beta', { g: 'g1' }), card('c', 100, 500, 'gama')]
  const { ctx, page, errors } = await open(GRUPO)
  await drag(page, 'alfa', 50, 70)
  let s = await saved(page)
  assert.deepEqual([s.a.x, s.a.y, s.b.x, s.b.y], [150, 190, 150 + W + GAP, 190])
  assert.deepEqual([s.c.x, s.c.y], [100, 500])
  // arrastar pela etiqueta do grupo também move os dois
  const tab = await page.locator('.gframe .gn').boundingBox()
  await page.mouse.move(tab.x + 10, tab.y + 8); await page.mouse.down()
  await page.mouse.move(tab.x + 40, tab.y + 28, { steps: 6 }); await page.mouse.up()
  s = await saved(page)
  assert.deepEqual([s.a.x, s.a.y, s.b.x, s.b.y], [180, 210, 180 + W + GAP, 210])
  // Shift + arrastar solta só o cartão arrastado
  await drag(page, 'beta', 200, 250, { shift: true })
  s = await saved(page)
  assert.equal(s.b.g, null); assert.equal(s.a.g, null) // grupo de um só deixa de ser grupo
  assert.deepEqual([s.a.x, s.a.y], [180, 210])
  assert.equal(await page.locator('.gframe').count(), 0)
  assert.deepEqual(errors, [])
  await ctx.close()
  const o = await open(GRUPO)
  await o.page.click('.gframe .g-split')
  s = await saved(o.page)
  assert.equal(s.a.g, null); assert.equal(s.b.g, null)
  assert.deepEqual([s.a.x, s.b.x], [100, 100 + W + GAP]) // desagrupar não move ninguém
  await o.ctx.close()
})

test('duplo clique no fundo cria um cartão centrado ali, com o cursor; N cria outro', async () => {
  const { ctx, page, errors } = await open(DOIS)
  await page.mouse.dblclick(900, 200)
  await page.waitForSelector('.ProseMirror-focused')
  await page.keyboard.type('novo aqui')
  let s = Object.values(await saved(page)).find((k) => JSON.stringify(k.doc).includes('novo aqui'))
  assert.deepEqual([s.x, s.y], [900 - W / 2, 200 - H / 2])
  await page.keyboard.press('Escape'); await page.keyboard.press('n')
  await page.waitForSelector('.ProseMirror-focused')
  await page.keyboard.type('pelo N')
  s = Object.values(await saved(page)).find((k) => JSON.stringify(k.doc).includes('pelo N'))
  // perto do centro da janela
  assert.ok(Math.abs(s.x + W / 2 - 640) < 160 && Math.abs(s.y + H / 2 - 400) < 120, JSON.stringify([s.x, s.y]))
  assert.deepEqual(errors, [])
  await ctx.close()
})
