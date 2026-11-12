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

/* ---------------- Fase 7a: câmera ---------------- */
const camOf = (page) => page.evaluate(() => {
  const m = new DOMMatrix(getComputedStyle(document.getElementById('world')).transform)
  return { x: m.e, y: m.f, z: m.a }
})
const near = (a, b, tol = 1.5) => Math.abs(a - b) <= tol
async function pan(page, x, y, dx, dy) {
  await page.mouse.move(x, y); await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 6 }); await page.mouse.up()
}

test('câmera: arrastar o fundo e a roda movem a mesa sem alterar nenhum dado', async () => {
  const { ctx, page, errors } = await open(DOIS)
  const antes = await ls(page, 'cartoes.v1'), t = await ls(page, 'cartoes.v1.t')
  const b0 = await box(page, 'alfa')
  await pan(page, 600, 700, -150, -90)
  assert.deepEqual(await camOf(page), { x: -150, y: -90, z: 1 })
  let b = await box(page, 'alfa')
  assert.ok(near(b.x, b0.x - 150) && near(b.y, b0.y - 90))
  await page.mouse.move(600, 700)
  await page.mouse.wheel(0, 120)                   // roda: rola para baixo
  assert.deepEqual(await camOf(page), { x: -150, y: -210, z: 1 })
  await page.keyboard.down('Shift'); await page.mouse.wheel(0, 50); await page.keyboard.up('Shift') // Shift + roda: de lado
  assert.deepEqual(await camOf(page), { x: -200, y: -210, z: 1 })
  await sleep(700)
  assert.equal(await ls(page, 'cartoes.v1.t'), t)   // nada foi regravado só por mover a mesa
  await page.evaluate(() => dispatchEvent(new Event('pagehide')))
  assert.equal(await ls(page, 'cartoes.v1'), antes) // posições "do mundo": intactas
  assert.equal(await page.locator('.card').count(), 2) // arrastar o fundo não cria cartão
  // a câmera é preferência de tela: volta igual ao reabrir
  await page.reload(); await sleep(400)
  assert.deepEqual(await camOf(page), { x: -200, y: -210, z: 1 })
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('câmera: Ctrl + roda dá zoom no cursor; Ctrl+1 volta a 100%; Ctrl+0 mostra tudo', async () => {
  const LONGE = [card('a', 100, 120, 'alfa'), card('b', 2600, 1700, 'beta')]
  const { ctx, page, errors } = await open(LONGE)
  const b0 = await box(page, 'alfa')
  const px = b0.x + 50, py = b0.y + 10              // um ponto do cartão
  await page.mouse.move(px, py)
  await page.keyboard.down('Control'); await page.mouse.wheel(0, 300); await page.keyboard.up('Control')
  const c = await camOf(page)
  assert.ok(c.z < 0.75 && c.z > 0.5, 'zoom ' + c.z)
  const b1 = await box(page, 'alfa')
  assert.ok(near(b1.width, W * c.z, 2))
  assert.ok(near(b1.x + 50 * c.z, px, 2) && near(b1.y + 10 * c.z, py, 2), 'o ponto sob o cursor não saiu do lugar')
  assert.equal(await page.textContent('#zoom'), Math.round(c.z * 100) + '%')
  await page.keyboard.press('Control+1'); await sleep(450)
  assert.equal((await camOf(page)).z, 1)
  assert.equal(await page.locator('#zoom').isVisible(), false)
  await page.keyboard.press('Control+0'); await sleep(450)
  const f = await camOf(page)
  assert.ok(f.z < 0.6)
  for (const name of ['alfa', 'beta']) {
    const b = await box(page, name)
    assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= 1280 && b.y + b.height <= 800, name + ' fora da janela: ' + JSON.stringify(b))
  }
  await page.click('#zoom'); await sleep(450)       // o indicador também volta a 100%
  assert.equal((await camOf(page)).z, 1)
  const s = await saved(page)
  assert.deepEqual([s.a.x, s.a.y, s.b.x, s.b.y], [100, 120, 2600, 1700])
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('câmera: com zoom e deslocamento, arrasto, ímã, duplo clique e N usam posições do mundo', async () => {
  const { ctx, page, errors } = await open(DOIS, { extra: { 'cartoes.ui.cam': JSON.stringify({ x: 200, y: 100, z: 0.5 }) } })
  assert.deepEqual(await camOf(page), { x: 200, y: 100, z: 0.5 })
  await drag(page, 'alfa', 60, 45)                 // 60 px na tela = 120 no mundo
  let s = await saved(page)
  assert.deepEqual([s.a.x, s.a.y], [220, 210])
  // ímã: a folga e o alcance são do mundo
  const alvoX = 220 + W + GAP + 10, alvoY = 210 + 8
  await drag(page, 'beta', (alvoX - 700) * 0.5, (alvoY - 420) * 0.5, { steps: 12 })
  s = await saved(page)
  assert.deepEqual([s.b.x, s.b.y], [220 + W + GAP, 210])
  assert.equal(s.a.g, s.b.g)
  // duplo clique: o cartão nasce sob o cursor
  await page.mouse.dblclick(900, 600)
  await page.waitForSelector('.ProseMirror-focused'); await page.keyboard.type('sob o cursor')
  s = Object.values(await saved(page)).find((k) => JSON.stringify(k.doc).includes('sob o cursor'))
  assert.deepEqual([s.x, s.y], [(900 - 200) / 0.5 - W / 2, (600 - 100) / 0.5 - H / 2])
  // N: no centro do que a janela mostra
  await page.keyboard.press('Escape'); await page.keyboard.press('n')
  await page.waitForSelector('.ProseMirror-focused'); await page.keyboard.type('no centro')
  const b = await box(page, 'no centro')
  assert.ok(Math.abs(b.x + b.width / 2 - 640) < 90 && Math.abs(b.y + b.height / 2 - 400) < 70, JSON.stringify(b))
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('I1: em janela menor os cartões continuam alcançáveis; se nada aparece, enquadra tudo', async () => {
  const LONGE = [card('a', 1500, 900, 'alfa'), card('b', 1900, 900, 'beta')]
  const { ctx, page, errors } = await open(LONGE, { viewport: { width: 800, height: 600 } })
  for (const name of ['alfa', 'beta']) {
    const b = await box(page, name)
    assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= 800 && b.y + b.height <= 600, name + ': ' + JSON.stringify(b))
  }
  const s = await saved(page)
  assert.deepEqual([s.a.x, s.a.y, s.b.x, s.b.y], [1500, 900, 1900, 900]) // ninguém foi movido para caber
  // um cartão novo ao lado (Ctrl+Enter) fora da vista puxa a mesa até ele
  await page.keyboard.press('Control+1'); await sleep(450)
  await page.locator('.card', { hasText: 'beta' }).locator('.ProseMirror').click()
  await page.keyboard.press('Control+Enter'); await sleep(500)
  const nb = await page.locator('.card:has(.ProseMirror-focused)').boundingBox()
  assert.ok(nb.x >= 0 && nb.x + nb.width <= 800 && nb.y >= 0 && nb.y + nb.height <= 600, JSON.stringify(nb))
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('roda sobre um cartão com texto sobrando rola o texto, não a mesa', async () => {
  const longo = { id: 'l', x: 100, y: 120, r: 0, doc: doc(...Array.from({ length: 14 }, (_, i) => 'linha ' + i)) }
  const { ctx, page } = await open([longo, card('b', 700, 420, 'beta')])
  const b = await box(page, 'linha 0')
  await page.mouse.move(b.x + 100, b.y + 100); await page.mouse.wheel(0, 120); await sleep(100)
  assert.deepEqual(await camOf(page), { x: 0, y: 0, z: 1 })
  assert.ok(await page.$eval('.card .scroll', (e) => e.scrollTop) > 50)
  const c = await box(page, 'beta')                // sobre um cartão que cabe inteiro: rola a mesa
  await page.mouse.move(c.x + 100, c.y + 100); await page.mouse.wheel(0, 120)
  assert.deepEqual(await camOf(page), { x: 0, y: -120, z: 1 })
  await ctx.close()
})

test('I2/I3: grupo nunca fica metade na gaveta; devolver da gaveta traz a mesa até o cartão', async () => {
  // dado antigo: "c" guardado, do mesmo grupo de "a" e "b" que estão na mesa
  const MISTO = [
    card('a', 100, 120, 'alfa', { g: 'g1' }), card('b', 100 + W + GAP, 120, 'beta', { g: 'g1' }),
    card('c', 3000, 2000, 'gama', { g: 'g1', stashed: true, sa: 1 }),
  ]
  const { ctx, page, errors } = await open(MISTO)
  let s = await saved(page)
  assert.equal(s.a.g, s.b.g); assert.ok(s.a.g)
  assert.equal(s.c.g, null)                        // o guardado sozinho deixa o grupo
  assert.equal(await page.textContent('.gframe .gn'), '2 cartões')
  await page.click('#dock .chip'); await sleep(500)
  const b = await box(page, 'gama')
  assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.width <= 1280 && b.y + b.height <= 800, 'devolvido fora da vista: ' + JSON.stringify(b))
  s = await saved(page)
  assert.deepEqual([s.c.x, s.c.y, s.c.stashed], [3000, 2000, false])
  const fr = await page.locator('.gframe').boundingBox() // a moldura do grupo não esticou até o devolvido
  assert.ok(fr.width < (2 * W + GAP + 60))
  assert.deepEqual(errors, [])
  await ctx.close()
})

/* ---------------- Fase 7b: tamanhos P/M/G ---------------- */
const SZ = { p: [252, 158], m: [340, 214], g: [474, 298] }
const pick = async (page, text, size) => {
  const c = page.locator('.card', { hasText: text })
  await c.hover(); await c.locator(`.sizes button[data-s="${size}"]`).click()
}

test('tamanhos P/M/G: botão no hover e Alt+1/2/3 mudam o tamanho, na proporção de ficha, sem tocar no texto', async () => {
  const { ctx, page, errors } = await open(DOIS)
  await pick(page, 'alfa', 'g')
  let b = await box(page, 'alfa')
  assert.deepEqual([b.width, b.height], SZ.g)
  let s = await saved(page)
  assert.equal(s.a.s, 'g'); assert.deepEqual([s.a.x, s.a.y], [100, 120]) // o canto não sai do lugar
  assert.equal(s.b.s ?? null, null)
  await pick(page, 'alfa', 'p')
  b = await box(page, 'alfa')
  assert.deepEqual([b.width, b.height], SZ.p)
  for (const [w, h] of Object.values(SZ)) assert.ok(Math.abs(w / h - 340 / 214) < 0.012, 'proporção de ficha')
  // pelo teclado, com o cursor no cartão
  await page.locator('.card', { hasText: 'beta' }).locator('.ProseMirror').click()
  await page.keyboard.press('Alt+3')
  assert.deepEqual(await box(page, 'beta').then((r) => [r.width, r.height]), SZ.g)
  await page.keyboard.type(' continua')
  assert.deepEqual((await texts(page)).sort(), ['alfa', 'beta continua'])
  await page.keyboard.press('Alt+2')
  s = await saved(page)
  assert.equal(s.b.s ?? null, null); assert.equal(s.a.s, 'p')
  // sobrevive ao recarregar; Ctrl+Z na mesa desfaz a última mudança de tamanho
  await page.reload(); await sleep(400)
  assert.deepEqual(await box(page, 'alfa').then((r) => [r.width, r.height]), SZ.p)
  await pick(page, 'alfa', 'm')
  await page.mouse.click(5, 300)
  await page.keyboard.press('Control+z')
  assert.deepEqual(await box(page, 'alfa').then((r) => [r.width, r.height]), SZ.p)
  assert.match(await page.textContent('#toast'), /Desfeito: tamanho/)
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('tamanhos: o estouro vira pilha conforme o tamanho; valor inválido abre como M', async () => {
  const cinco = { id: 'l', x: 100, y: 120, r: 0, s: 'enorme', doc: doc(...Array.from({ length: 5 }, (_, i) => 'linha ' + i)) }
  const { ctx, page } = await open([cinco])
  const depth = () => page.$eval('.card', (e) => e.dataset.depth)
  assert.deepEqual(await box(page, 'linha 0').then((r) => [r.width, r.height]), SZ.m)
  assert.equal(await depth(), '0')                 // 5 linhas cabem no M
  await pick(page, 'linha 0', 'p')
  assert.notEqual(await depth(), '0')              // no P (4 linhas) sobra texto: pilha
  assert.equal(await page.$eval('.card', (e) => e.classList.contains('more-below')), true)
  await pick(page, 'linha 0', 'g')
  assert.equal(await depth(), '0')
  // a pauta continua em linhas inteiras nos três tamanhos
  for (const k of ['p', 'm', 'g']) {
    await pick(page, 'linha 0', k)
    assert.equal(await page.$eval('.card .scroll', (e) => e.clientHeight % 28), 0, 'pauta do ' + k)
  }
  await ctx.close()
})

test('ímã e moldura de grupo respeitam tamanhos diferentes', async () => {
  const MISTO = [card('a', 100, 120, 'alfa', { s: 'g' }), card('b', 900, 600, 'beta'), card('c', 1500, 120, 'gama', { s: 'p' })]
  const { ctx, page, errors } = await open(MISTO, { viewport: { width: 1800, height: 1000 } })
  // "beta" (M) encosta na borda direita de "alfa" (G)
  await drag(page, 'beta', 100 + SZ.g[0] + GAP + 11 - 900, 120 + 7 - 600, { steps: 12 })
  let s = await saved(page)
  assert.deepEqual([s.b.x, s.b.y], [100 + SZ.g[0] + GAP, 120])
  assert.equal(s.a.g, s.b.g)
  // "gama" (P) encosta embaixo de "alfa" (G): a folga conta a altura do G
  await drag(page, 'gama', 100 + 6 - 1500, 120 + SZ.g[1] + GAP + 9 - 120, { steps: 12 })
  s = await saved(page)
  assert.deepEqual([s.c.x, s.c.y], [100, 120 + SZ.g[1] + GAP])
  assert.equal(s.c.g, s.a.g)
  const f = await page.locator('.gframe').boundingBox()
  assert.ok(Math.abs(f.width - (SZ.g[0] + GAP + SZ.m[0] + 24)) < 3, 'largura da moldura ' + f.width)
  assert.ok(Math.abs(f.height - (SZ.g[1] + GAP + SZ.p[1] + 44)) < 3, 'altura da moldura ' + f.height)
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('dispor na mesa com tamanhos mistos não sobrepõe cartões', async () => {
  const MISTO = [card('a', 100, 120, 'alfa', { s: 'g' }), card('b', 600, 120, 'beta'), card('c', 1000, 120, 'gama', { s: 'p' }),
    card('d', 100, 500, 'delta', { s: 'g' }), card('e', 700, 500, 'epsilon', { s: 'g' })]
  const { ctx, page } = await open(MISTO)
  await page.keyboard.press('e'); await page.waitForSelector('#show:not([hidden])')
  await page.click('#org-layout'); await page.waitForSelector('#show[hidden]', { state: 'attached' })
  const s = Object.values(await saved(page)).map((k) => ({ id: k.id, x0: k.x, y0: k.y, x1: k.x + SZ[k.s || 'm'][0], y1: k.y + SZ[k.s || 'm'][1] }))
  for (const a of s) for (const b of s) {
    if (a.id >= b.id) continue
    assert.ok(a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0, `${a.id} e ${b.id} se sobrepõem`)
  }
  await ctx.close()
})

/* ---------------- Fase 7b: seleção múltipla ---------------- */
const TRES = [card('a', 100, 120, 'alfa'), card('b', 520, 120, 'beta'), card('c', 100, 480, 'gama')]
const selected = (page) => page.$$eval('.card.selected .ProseMirror', (els) => els.map((e) => e.innerText.trim()).sort())
async function boxSelect(page, x0, y0, x1, y1, { ctrl = false } = {}) {
  await page.mouse.move(x0, y0)
  await page.keyboard.down('Shift'); if (ctrl) await page.keyboard.down('Control')
  await page.mouse.down(); await page.mouse.move(x1, y1, { steps: 8 }); await page.mouse.up()
  if (ctrl) await page.keyboard.up('Control'); await page.keyboard.up('Shift')
}

test('seleção: Shift + arrastar no fundo desenha a caixa; arrastar um selecionado move todos; Ctrl+Z devolve', async () => {
  const { ctx, page, errors } = await open(TRES)
  await boxSelect(page, 60, 80, 900, 300)          // pega alfa e beta; gama fica fora
  assert.deepEqual(await selected(page), ['alfa', 'beta'])
  assert.equal(await page.textContent('#sel-n'), '2 cartões selecionados')
  assert.deepEqual(await camOf(page), { x: 0, y: 0, z: 1 }) // com Shift o fundo não desloca a mesa
  await drag(page, 'beta', 70, 150)
  let s = await saved(page)
  assert.deepEqual([s.a.x, s.a.y, s.b.x, s.b.y], [170, 270, 590, 270])
  assert.deepEqual([s.c.x, s.c.y], [100, 480])
  assert.equal(s.a.g, null); assert.equal(s.b.g, null) // mover em lote não agrupa ninguém
  assert.deepEqual(await selected(page), ['alfa', 'beta'])
  await page.keyboard.press('Control+z')
  s = await saved(page)
  assert.deepEqual([s.a.x, s.a.y, s.b.x, s.b.y], [100, 120, 520, 120])
  await page.mouse.click(1100, 700)                // clique no fundo solta a seleção
  assert.deepEqual(await selected(page), [])
  assert.equal(await page.locator('#selbar').isVisible(), false)
  assert.equal(await page.locator('.card').count(), 3)
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('seleção: Shift/Ctrl + clique põe e tira; não solta do grupo; o grupo do selecionado anda junto', async () => {
  const G = [card('a', 100, 120, 'alfa', { g: 'g1' }), card('b', 100 + W + GAP, 120, 'beta', { g: 'g1' }), card('c', 100, 480, 'gama'), card('d', 600, 480, 'delta')]
  const { ctx, page, errors } = await open(G)
  const top = async (text) => { const b = await box(page, text); return [b.x + b.width / 2, b.y + 14] }
  await page.keyboard.down('Shift'); await page.mouse.click(...await top('alfa')); await page.keyboard.up('Shift')
  assert.deepEqual(await selected(page), ['alfa'])
  let s = await saved(page)
  assert.equal(s.a.g, 'g1'); assert.equal(s.b.g, 'g1') // um Shift + clique não desfaz o grupo
  // Ctrl + clique no texto de outro cartão: entra na seleção sem pôr o cursor nele
  const cb = await box(page, 'gama')
  await page.keyboard.down('Control'); await page.mouse.click(cb.x + 60, cb.y + 60); await page.keyboard.up('Control')
  assert.deepEqual(await selected(page), ['alfa', 'gama'])
  assert.equal(await page.locator('.ProseMirror-focused').count(), 0)
  await page.keyboard.down('Control'); await page.mouse.click(...await top('gama')); await page.keyboard.up('Control')
  await page.keyboard.down('Control'); await page.mouse.click(...await top('delta')); await page.keyboard.up('Control')
  assert.deepEqual(await selected(page), ['alfa', 'delta'])
  await drag(page, 'delta', 40, 60)                // alfa é de um grupo: beta vai junto
  s = await saved(page)
  assert.deepEqual([s.a.x, s.a.y, s.b.x, s.b.y, s.d.x, s.d.y], [140, 180, 140 + W + GAP, 180, 640, 540])
  assert.deepEqual([s.c.x, s.c.y], [100, 480])
  await page.keyboard.press('Escape')
  assert.deepEqual(await selected(page), [])
  // com o cursor num cartão, Shift + clique no texto continua sendo seleção de texto
  await page.locator('.card', { hasText: 'gama' }).locator('.ProseMirror').click()
  await page.keyboard.press('Home')
  const gb = await box(page, 'gama')
  await page.keyboard.down('Shift'); await page.mouse.click(gb.x + 200, gb.y + 50); await page.keyboard.up('Shift')
  assert.deepEqual(await selected(page), [])
  assert.equal(await page.evaluate(() => getSelection().toString()), 'gama')
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('seleção: excluir, guardar e tamanho em lote, cada um com desfazer', async () => {
  const { ctx, page, errors } = await open(TRES)
  await boxSelect(page, 60, 80, 900, 300)
  await page.keyboard.press('Delete'); await sleep(350)
  assert.deepEqual(await texts(page), ['gama'])
  assert.match(await page.textContent('#toast'), /2 cartões excluídos · estão na lixeira/)
  assert.equal(JSON.parse((await saved(page), await ls(page, 'cartoes.trash'))).length, 2)
  await page.click('#toast button'); await sleep(350) // desfazer pelo aviso
  let s = await saved(page)
  assert.deepEqual((await texts(page)).sort(), ['alfa', 'beta', 'gama'])
  assert.deepEqual([s.a.x, s.a.y, s.b.x, s.b.y], [100, 120, 520, 120])
  assert.deepEqual(await selected(page), ['alfa', 'beta']) // voltam selecionados
  await page.keyboard.press('Control+z')            // o mesmo desfazer não roda duas vezes
  assert.equal(await page.locator('.card:not(.leaving)').count(), 3)
  // tamanho em lote pela barra
  await page.click('#selbar .sel-sizes button[data-s="p"]')
  s = await saved(page)
  assert.deepEqual([s.a.s, s.b.s, s.c.s ?? null], ['p', 'p', null])
  // guardar em lote
  await page.click('#sel-stash'); await sleep(350)
  assert.deepEqual(await texts(page), ['gama'])
  assert.equal(await page.locator('#dock .chip').count(), 2)
  assert.match(await page.textContent('#toast'), /2 cartões guardados · estão na gaveta/)
  await page.mouse.click(1100, 300)
  await page.keyboard.press('Control+z'); await sleep(350) // desfazer pelo teclado
  assert.deepEqual((await texts(page)).sort(), ['alfa', 'beta', 'gama'])
  assert.equal(await page.locator('#dock .chip').count(), 0)
  // excluir pela barra e desfazer com Ctrl+Z
  await page.click('#sel-del'); await sleep(350)
  assert.deepEqual(await texts(page), ['gama'])
  await page.keyboard.press('Control+z'); await sleep(350)
  assert.deepEqual((await texts(page)).sort(), ['alfa', 'beta', 'gama'])
  assert.equal(await ls(page, 'cartoes.trash').then(() => saved(page)).then(() => ls(page, 'cartoes.trash')), '[]')
  assert.deepEqual(errors, [])
  await ctx.close()
})
