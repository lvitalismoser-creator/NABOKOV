'use strict'
/* Menu ≡ (Fase 6): itens e atalhos, lixeira, instantâneos e lista de atalhos.
 * Contexto limpo por teste. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { chromium } = require('playwright')
const { URL_APP, sleep, eventually, doc, texts, ls, seed } = require('./helpers.cjs')

let browser
before(async () => { browser = await chromium.launch() })
after(async () => { await browser.close() })

async function open(cards, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  if (cards) await seed(page, { 'cartoes.v1': JSON.stringify(cards), 'cartoes.v1.t': String(Date.now() - 1000), ...extra })
  await page.goto(URL_APP); await sleep(400)
  return { ctx, page, errors }
}
const TRES = [
  { id: 'a', x: 40, y: 80, doc: doc('alfa') },
  { id: 'b', x: 420, y: 80, cat: 'cena', doc: doc('beta') },
  { id: 'c', x: 800, y: 80, doc: doc('gama') },
]
const items = (page) => page.$$eval('#menu button', (els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()))
const remove = async (page, text) => {
  const card = page.locator('.card', { hasText: text })
  await card.hover(); await card.locator('.close').click(); await sleep(300)
}

test('menu ≡ abre, mostra cada item com o atalho e fecha com Esc ou clique fora', async () => {
  const { ctx, page, errors } = await open(TRES)
  assert.equal(await page.locator('#menu').isVisible(), false)
  await page.click('#menu-btn')
  const list = await items(page)
  for (const want of ['Importar backup… Ctrl+O', 'Fazer backup (.json) Ctrl+S', 'Lixeira T devolve o último', 'Instantâneos', 'Atalhos F1']) {
    assert.ok(list.includes(want), `falta "${want}" em ${JSON.stringify(list)}`)
  }
  assert.equal(await page.getAttribute('#menu-btn', 'aria-expanded'), 'true')
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('#menu').isVisible(), false)
  await page.click('#menu-btn')
  await page.mouse.click(300, 600)                 // clique fora fecha e não cria nada
  assert.equal(await page.locator('#menu').isVisible(), false)
  assert.equal(await page.locator('.card').count(), 3)
  // "Fazer backup" pelo menu baixa o mesmo .json do Ctrl+S
  await page.click('#menu-btn')
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#menu button:has-text("Fazer backup")')])
  assert.match(dl.suggestedFilename(), /^cartoes-\d{4}-\d\d-\d\d\.json$/)
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), (async () => { await page.click('#menu-btn'); await page.click('#menu button:has-text("Importar backup")') })()])
  assert.ok(fc)
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('lixeira pelo menu: lista os excluídos, devolve um por um ao lugar e nada some', async () => {
  const { ctx, page, errors } = await open(TRES)
  await remove(page, 'alfa'); await remove(page, 'beta')
  await page.click('#menu-btn')
  assert.ok((await items(page)).includes('Lixeira (2) T devolve o último'))
  await page.click('#menu button:has-text("Lixeira")')
  assert.equal(await page.textContent('#sheet-title'), 'Lixeira')
  assert.deepEqual(await page.$$eval('#sheet .r-text', (els) => els.map((e) => e.textContent)), ['beta', 'alfa']) // o mais recente primeiro
  assert.equal(await page.textContent('#sheet .r-cat'), 'Cena')
  await page.click('#sheet li:has-text("alfa") button')
  assert.deepEqual(await page.$$eval('#sheet .r-text', (els) => els.map((e) => e.textContent)), ['beta'])
  assert.deepEqual((await texts(page)).sort(), ['alfa', 'gama'])
  // teclas não vazam para a mesa enquanto a folha está aberta
  await page.keyboard.press('n'); await page.keyboard.press('t'); await sleep(200)
  assert.deepEqual((await texts(page)).sort(), ['alfa', 'gama'])
  assert.equal(await page.locator('.card:not(.leaving)').count(), 2)
  await page.click('#sheet li:has-text("beta") button')
  assert.match(await page.textContent('#sheet-body'), /A lixeira está vazia/)
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('#sheet').isVisible(), false)
  await page.evaluate(() => dispatchEvent(new Event('pagehide')))
  const saved = JSON.parse(await ls(page, 'cartoes.v1'))
  assert.deepEqual(saved.find((k) => k.id === 'a') && [saved.find((k) => k.id === 'a').x, saved.find((k) => k.id === 'a').y], [40, 80])
  assert.equal(await ls(page, 'cartoes.trash'), '[]')
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('instantâneos pelo menu: pede confirmação, volta ao estado antigo e guarda o de agora', async () => {
  const { ctx, page, errors } = await open([{ id: 'a', x: 60, y: 80, doc: doc('antigo') }])
  assert.ok(await eventually(async () => (await page.evaluate(() => cartoes.snapshots())).length === 1))
  await page.locator('.card .ProseMirror').first().click()
  await page.keyboard.press('End'); await page.keyboard.type(' mudado'); await sleep(700)
  await page.keyboard.press('Escape')
  await page.click('#menu-btn'); await page.click('#menu button:has-text("Instantâneos")')
  await page.waitForSelector('#sheet .rows li')
  assert.match(await page.textContent('#sheet .rows li .r-meta'), /^1 cartão$/)
  await page.click('#sheet .rows li button.act')
  assert.match(await page.textContent('#sheet .r-ask'), /fica guardado como o instantâneo mais recente/)
  await page.click('#sheet .r-no')                 // cancelar não muda nada
  assert.equal(await page.locator('#sheet .r-ask').count(), 0)
  assert.deepEqual(await texts(page), ['antigo mudado'])
  await page.click('#sheet .rows li button.act'); await page.click('#sheet .r-yes')
  assert.ok(await eventually(async () => (await texts(page)).join() === 'antigo', { timeout: 8000 }))
  const snaps = await page.evaluate(() => cartoes.snapshots())
  assert.ok(snaps.length >= 2)                     // "antigo mudado" ficou guardado
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('F1 abre os atalhos mesmo com o cursor num cartão; Esc fecha sem perder o texto', async () => {
  const { ctx, page, errors } = await open()
  await page.waitForSelector('.ProseMirror-focused')
  await page.keyboard.type('escrevendo')
  await page.keyboard.press('F1')
  assert.equal(await page.textContent('#sheet-title'), 'Atalhos')
  const body = await page.textContent('#sheet-body')
  for (const k of ['Ctrl+Enter', 'Na mesa', 'No organizador', 'Alt + ← →', 'F1']) assert.ok(body.includes(k), k)
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('#sheet').isVisible(), false)
  assert.deepEqual(await texts(page), ['escrevendo']) // o cartão não sumiu por ter perdido o foco
  // dentro do organizador também
  await page.keyboard.press('e'); await page.waitForSelector('#show:not([hidden])')
  await page.keyboard.press('F1')
  assert.equal(await page.locator('#sheet').isVisible(), true)
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('#show').isVisible(), true) // o Esc fechou só a folha
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('demo: lixeira e instantâneos do menu não tocam nos dados reais', async () => {
  const { ctx, page } = await open(TRES)
  await remove(page, 'alfa')
  await page.evaluate(() => dispatchEvent(new Event('pagehide')))
  const real = await ls(page, 'cartoes.trash')
  await page.goto(URL_APP + '#demo'); await page.reload(); await sleep(500)
  await page.click('#menu-btn')
  assert.ok((await items(page)).includes('Lixeira T devolve o último')) // a lixeira real não aparece no demo
  await page.click('#menu button:has-text("Instantâneos")')
  await page.waitForSelector('#sheet .sheet-empty')
  assert.match(await page.textContent('#sheet-body'), /demonstração não guarda instantâneos/)
  assert.equal(await ls(page, 'cartoes.trash'), real)
  await ctx.close()
})
