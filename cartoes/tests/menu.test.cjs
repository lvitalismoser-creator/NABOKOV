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
