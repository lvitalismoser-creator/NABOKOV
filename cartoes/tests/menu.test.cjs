'use strict'
/* Fase 6: pontinho de salvo e menu ≡ (backup, lixeira, instantâneos, atalhos).
 * Contexto limpo por teste; nunca toca em dados reais. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { chromium } = require('playwright')
const { URL_APP, sleep, eventually, doc, texts, ls, seed } = require('./helpers.cjs')

let browser
before(async () => { browser = await chromium.launch() })
after(async () => { await browser.close() })

async function fresh(opts) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...opts })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  return { ctx, page, errors }
}
const dot = (page) => page.evaluate(() => {
  const d = document.getElementById('save-dot')
  return { state: d.dataset.state, tip: d.dataset.tip }
})

test('pontinho: salvo com hora e lugar depois de gravar; vermelho quando falha', async () => {
  const { ctx, page, errors } = await fresh()
  await page.goto(URL_APP); await page.waitForSelector('.ProseMirror-focused')
  assert.equal((await dot(page)).state, 'saved')
  await page.keyboard.type('a')
  assert.equal((await dot(page)).state, 'dirty') // ainda não gravou: não diz "salvo"
  const d = await eventually(async () => { const x = await dot(page); return x.state === 'saved' && x })
  assert.match(d.tip, /^salvo às \d\d:\d\d · neste navegador$/)
  // o texto só aparece no hover
  const opacity = () => page.evaluate(() => getComputedStyle(document.getElementById('save-dot'), '::after').opacity)
  assert.equal(await opacity(), '0')
  await page.hover('#save-dot'); await sleep(300)
  assert.equal(await opacity(), '1')

  // todos os destinos falham: fica vermelho e diz por quê; volta a cinza quando a gravação volta
  await page.evaluate(() => {
    window.__set = Storage.prototype.setItem
    Storage.prototype.setItem = () => { throw new Error('cheio') }
    window.__tx = IDBDatabase.prototype.transaction
    IDBDatabase.prototype.transaction = () => { throw new Error('sem banco') }
  })
  await page.locator('.card .ProseMirror').click(); await page.keyboard.type('b')
  const f = await eventually(async () => { const x = await dot(page); return x.state === 'failed' && x })
  assert.match(f.tip, /não consegui salvar/)
  await page.evaluate(() => { Storage.prototype.setItem = window.__set; IDBDatabase.prototype.transaction = window.__tx })
  await page.keyboard.type('c')
  assert.ok(await eventually(async () => (await dot(page)).state === 'saved'))
  assert.ok((await ls(page, 'cartoes.v1')).includes('abc'))
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('pontinho: aba somente leitura e demo dizem o que são', async () => {
  const { ctx, page } = await fresh()
  await page.goto(URL_APP); await page.waitForSelector('.ProseMirror-focused')
  await page.keyboard.type('dona'); await sleep(700)
  const page2 = await ctx.newPage()
  await page2.goto(URL_APP); await sleep(500)
  const ro = await dot(page2)
  assert.equal(ro.state, 'ro')
  assert.match(ro.tip, /somente leitura/)
  await page2.goto(URL_APP + '#demo'); await page2.reload(); await sleep(500)
  const d = await eventually(async () => { const x = await dot(page2); return x.state === 'saved' && x })
  assert.match(d.tip, /demonstração$/)
  await ctx.close()
})

const MESA = [
  { id: 'a', x: 40, y: 60, doc: doc('alfa') },
  { id: 'b', x: 420, y: 60, cat: 'cena', doc: doc('beta') },
  { id: 'c', x: 40, y: 320, doc: doc('gama') },
]
async function open(extra = {}, opts) {
  const f = await fresh(opts)
  await seed(f.page, { 'cartoes.v1': JSON.stringify(MESA), 'cartoes.v1.t': '5', ...extra })
  await f.page.goto(URL_APP); await sleep(400)
  return f
}
const pick = async (page, id) => { await page.click('#menu-btn'); await page.click(`#menu [data-id="${id}"]`) }

test('menu ≡: itens com atalho, teclado, backup e importar pelo menu', async () => {
  const { ctx, page, errors } = await open({}, { acceptDownloads: true })
  assert.equal(await page.locator('#menu').isVisible(), false)
  await page.click('#menu-btn')
  const items = await page.$$eval('#menu button', (els) => els.map((e) => [e.querySelector('span').textContent, e.querySelector('kbd').textContent]))
  const labels = items.map((x) => x[0])
  for (const l of ['Importar backup…', 'Fazer backup (.json)', 'Lixeira', 'Instantâneos', 'Atalhos']) assert.ok(labels.includes(l), l)
  assert.equal(items.find((x) => x[0] === 'Fazer backup (.json)')[1], 'Ctrl+S')
  assert.equal(items.find((x) => x[0] === 'Importar backup…')[1], 'Ctrl+O')
  // com o menu aberto, as teclas da mesa não valem; setas andam, Esc fecha
  await page.keyboard.press('n'); await sleep(150)
  assert.equal(await page.locator('.card').count(), 3)
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown')
  assert.equal(await page.evaluate(() => document.activeElement.dataset.id), labels[1] === 'Importar backup…' ? 'import' : 'backup')
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('#menu').isVisible(), false)
  // clicar fora fecha
  await page.click('#menu-btn'); await page.mouse.click(300, 600)
  assert.equal(await page.locator('#menu').isVisible(), false)

  await page.click('#menu-btn')
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#menu [data-id="backup"]')])
  assert.match(dl.suggestedFilename(), /^cartoes-\d{4}-\d{2}-\d{2}\.json$/)
  await page.click('#menu-btn')
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#menu [data-id="import"]')])
  await fc.setFiles({ name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ cards: [{ doc: doc('importado') }] })) })
  assert.ok(await eventually(async () => (await texts(page)).includes('importado')))
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('lixeira pelo menu: lista os excluídos e devolve o escolhido; atalhos com "?"', async () => {
  const { ctx, page, errors } = await open()
  for (const nome of ['alfa', 'beta']) {
    const card = page.locator('.card', { hasText: nome }).first()
    await card.hover(); await card.locator('.close').click(); await sleep(350)
  }
  await page.click('#menu-btn')
  assert.equal(await page.textContent('#menu [data-id="trash"] span'), 'Lixeira (2)')
  await page.click('#menu [data-id="trash"]')
  assert.equal(await page.textContent('#sheet-title'), 'Lixeira')
  const rows = () => page.$$eval('#sheet .sheet-row .r-text', (els) => els.map((e) => e.textContent))
  assert.deepEqual(await rows(), ['Cenabeta', 'alfa']) // o mais recente primeiro, com a categoria
  // janela aberta: atalhos da mesa não valem
  await page.keyboard.press('n'); await page.keyboard.press('t'); await sleep(200)
  assert.deepEqual(await texts(page), ['gama'])
  await page.locator('#sheet .sheet-row', { hasText: 'alfa' }).locator('button').click(); await sleep(300)
  assert.deepEqual(await rows(), ['Cenabeta'])
  assert.deepEqual((await texts(page)).sort(), ['alfa', 'gama'])
  // voltou ao mesmo lugar
  assert.deepEqual(await page.evaluate(() => { const r = [...document.querySelectorAll('.card')].find((c) => c.innerText.includes('alfa')).getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y)] }), [40, 60])
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('#sheet').isVisible(), false)
  await page.evaluate(() => dispatchEvent(new Event('pagehide')))
  assert.equal(JSON.parse(await ls(page, 'cartoes.trash')).length, 1)

  await page.mouse.click(5, 5)
  await page.keyboard.press('?')
  assert.equal(await page.textContent('#sheet-title'), 'Atalhos')
  assert.match(await page.textContent('#sheet-body'), /Ctrl\+Enter/)
  await page.click('#sheet-close')
  assert.equal(await page.locator('#sheet').isVisible(), false)
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('instantâneos pelo menu: restaurar pede confirmação e volta ao ponto, sem console', async () => {
  const { ctx, page, errors } = await open()
  assert.ok(await eventually(async () => (await page.evaluate(() => cartoes.snapshots())).length))
  await page.locator('.card .ProseMirror', { hasText: 'alfa' }).click()
  await page.keyboard.press('End'); await page.keyboard.type(' mudado'); await sleep(700)
  await page.keyboard.press('Escape')
  await pick(page, 'snaps')
  await page.waitForSelector('#sheet .sheet-row')
  assert.equal(await page.locator('#sheet .sheet-row').count(), 1)
  assert.match(await page.textContent('#sheet .sheet-row .r-meta'), /^3 cartões/)
  await page.click('#sheet .sheet-row button')              // "restaurar" só pergunta
  assert.ok((await texts(page)).includes('alfa mudado'))
  await page.click('#sheet .sheet-row .cancel')             // desistir não muda nada
  assert.equal(await page.textContent('#sheet .sheet-row button'), 'restaurar')
  await page.click('#sheet .sheet-row button')
  await page.click('#sheet .sheet-row button.strong')
  assert.ok(await eventually(async () => (await texts(page)).sort().join() === 'alfa,beta,gama', { timeout: 8000 }))
  // o estado de antes de restaurar virou instantâneo: dá para voltar a ele também
  const snaps = await page.evaluate(() => cartoes.snapshots())
  assert.ok(snaps.length >= 2)
  assert.deepEqual(errors, [])
  await ctx.close()
})
