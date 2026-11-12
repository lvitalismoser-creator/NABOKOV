'use strict'
/* Persistência no navegador: salvamento, carregamento seguro, abas, lixeira,
 * exportar/importar e instantâneos. Cada teste usa um contexto limpo
 * (nunca toca em dados reais). */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { chromium } = require('playwright')
const { URL_APP, sleep, eventually, doc, texts, ls, idbState, seed } = require('./helpers.cjs')

let browser
before(async () => { browser = await chromium.launch() })
after(async () => { await browser.close() })

async function fresh(opts) {
  const ctx = await browser.newContext(opts)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  return { ctx, page, errors }
}

test('salva ao esconder a página, no espelho e no IndexedDB', async () => {
  const { ctx, page, errors } = await fresh()
  await page.goto(URL_APP); await page.waitForSelector('.ProseMirror-focused')
  await page.keyboard.type('texto real')
  await page.evaluate(() => dispatchEvent(new Event('pagehide')))
  assert.ok((await ls(page, 'cartoes.v1')).includes('texto real'))
  assert.ok(await eventually(async () => JSON.stringify(await idbState(page)).includes('texto real')))
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('#demo grava só em cartoes.demo e não toca nos dados reais', async () => {
  const { ctx, page } = await fresh()
  await page.goto(URL_APP); await page.waitForSelector('.ProseMirror-focused')
  await page.keyboard.type('meu trabalho')
  await page.evaluate(() => dispatchEvent(new Event('pagehide')))
  const real = await ls(page, 'cartoes.v1')
  await page.goto(URL_APP + '#demo'); await page.reload(); await sleep(300)
  assert.equal(await ls(page, 'cartoes.v1'), real)
  assert.ok(await ls(page, 'cartoes.demo'))
  await ctx.close()
})

test('JSON ilegível é preservado e o app abre normalmente', async () => {
  const { ctx, page, errors } = await fresh()
  await seed(page, { 'cartoes.v1': '{quebrado' })
  await page.goto(URL_APP); await sleep(400)
  const keys = await page.evaluate(() => Object.keys(localStorage))
  const kept = keys.find((k) => k.startsWith('cartoes.corrompido.'))
  assert.ok(kept)
  assert.equal(await ls(page, kept), '{quebrado')
  assert.equal(await page.locator('.card').count(), 1) // cartão em branco da primeira visita
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('cartões inválidos e duplicados vão para a quarentena; os bons abrem', async () => {
  const { ctx, page } = await fresh()
  const good = { id: 'a', x: 50, y: 50, doc: doc('bom') }
  await seed(page, {
    'cartoes.v1': JSON.stringify([
      good,
      { id: 'b', doc: { type: 'doc', content: [{ type: 'naoexiste' }] } },
      'lixo',
      { id: 'a', doc: doc('duplicado') },
    ]),
  })
  await page.goto(URL_APP); await sleep(400)
  assert.deepEqual((await texts(page)).sort(), ['bom', 'duplicado'])
  assert.equal(JSON.parse(await ls(page, 'cartoes.quarentena')).length, 2)
  assert.ok(await ls(page, 'cartoes.bak'))
  await ctx.close()
})

test('falha em todos os destinos mostra aviso e o app continua usável', async () => {
  const { ctx, page } = await fresh()
  await page.addInitScript(() => Object.defineProperty(window, 'indexedDB', { get: () => undefined }))
  await page.goto(URL_APP); await sleep(300)
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('cheio') } })
  await page.keyboard.type('x')
  await eventually(async () => (await page.locator('#toast.show').count()) > 0)
  assert.match(await page.locator('#toast').textContent(), /Não consegui salvar/)
  assert.equal(await page.locator('.card').count(), 1)
  await ctx.close()
})

test('espelho apagado: volta pelo IndexedDB; espelho antigo não vence o mais novo', async () => {
  const { ctx, page } = await fresh()
  await page.goto(URL_APP); await page.waitForSelector('.ProseMirror-focused')
  await page.keyboard.type('primeira frase')
  await eventually(async () => JSON.stringify(await idbState(page)).includes('primeira frase'))
  await page.evaluate(() => { localStorage.removeItem('cartoes.v1'); localStorage.removeItem('cartoes.v1.t') })
  await page.reload(); await sleep(400)
  assert.deepEqual(await texts(page), ['primeira frase'])

  await page.evaluate((d) => {
    localStorage.setItem('cartoes.v1', JSON.stringify([{ id: 'v', doc: d }])); localStorage.setItem('cartoes.v1.t', '1')
  }, doc('VELHO'))
  // reload dispara pagehide e regravaria o estado atual: abre numa aba nova
  const page2 = await ctx.newPage()
  await page.close()
  await page2.goto(URL_APP); await sleep(400)
  assert.deepEqual(await texts(page2), ['primeira frase'])
  await ctx.close()
})

test('segunda aba é só leitura e assume quando a primeira fecha', async () => {
  const { ctx, page } = await fresh()
  await page.goto(URL_APP); await sleep(300)
  await page.keyboard.type('da dona'); await sleep(700)
  const page2 = await ctx.newPage()
  await page2.goto(URL_APP); await sleep(500)
  assert.match(await page2.locator('#toast').textContent(), /outra aba/)
  assert.equal(await page2.locator('.ProseMirror').first().getAttribute('contenteditable'), 'false')
  const before = await ls(page, 'cartoes.v1')
  await page2.locator('.ProseMirror').first().click({ force: true }).catch(() => {})
  await page2.keyboard.type('intruso'); await sleep(600)
  assert.equal(await ls(page, 'cartoes.v1'), before)

  await page.close()
  const ok = await eventually(async () =>
    (await page2.locator('.ProseMirror').first().getAttribute('contenteditable')) === 'true', { timeout: 8000 })
  assert.ok(ok, 'a segunda aba deveria assumir a gravação')
  await ctx.close()
})

test('digitação contínua ainda grava dentro do teto de espera', async () => {
  const { ctx, page } = await fresh()
  await page.goto(URL_APP); await sleep(300)
  const t0 = Date.now()
  let seen = null
  while (Date.now() - t0 < 4800 && seen === null) {
    await page.keyboard.type('a'); await sleep(100)
    if ((await ls(page, 'cartoes.v1'))?.includes('aaaa')) seen = Date.now() - t0
  }
  assert.ok(seen !== null && seen < 3800, `gravou em ${seen} ms`)
  await ctx.close()
})

test('lixeira guarda vários cartões, sobrevive ao reload e T reabre em ordem', async () => {
  const { ctx, page } = await fresh()
  await page.goto(URL_APP); await sleep(300)
  for (const t of ['alfa', 'beta', 'gama']) {
    await page.keyboard.type(t); await page.keyboard.press('Control+Enter'); await sleep(200)
  }
  await page.keyboard.press('Escape'); await sleep(300)
  for (const nome of ['alfa', 'beta']) {
    const card = page.locator('.card', { hasText: nome }).first()
    await card.hover(); await card.locator('.close').click(); await sleep(350)
  }
  assert.deepEqual(await texts(page), ['gama'])
  await sleep(700)
  await page.reload(); await sleep(400)
  assert.deepEqual((await page.evaluate(() => cartoes.trash())).map((x) => x.texto), ['alfa', 'beta'])
  await page.mouse.click(5, 5)
  await page.keyboard.press('t'); await sleep(250); await page.keyboard.press('Escape'); await page.mouse.click(5, 5)
  await page.keyboard.press('t'); await sleep(250); await page.keyboard.press('Escape')
  assert.deepEqual((await texts(page)).sort(), ['alfa', 'beta', 'gama'])
  await page.mouse.click(5, 5); await page.keyboard.press('t'); await sleep(200)
  assert.match(await page.locator('#toast').textContent(), /lixeira está vazia/)
  await ctx.close()
})

test('exportar gera .json válido e importar só acrescenta', async () => {
  const a = await fresh({ acceptDownloads: true })
  await a.page.goto(URL_APP); await sleep(300)
  await a.page.keyboard.type('exportado'); await a.page.keyboard.press('Escape'); await sleep(500)
  await a.page.mouse.click(5, 5)
  const [dl] = await Promise.all([a.page.waitForEvent('download'), a.page.keyboard.press('Control+s')])
  assert.match(dl.suggestedFilename(), /^cartoes-\d{4}-\d{2}-\d{2}\.json$/)
  const file = path.join(os.tmpdir(), `cartoes-teste-${Date.now()}.json`)
  await dl.saveAs(file)
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  assert.equal(data.app, 'cartoes')
  assert.ok(JSON.stringify(data.cards).includes('exportado'))
  await a.ctx.close()

  const b = await fresh()
  await b.page.goto(URL_APP); await sleep(300)
  await b.page.keyboard.type('ja existia'); await b.page.keyboard.press('Escape'); await sleep(500)
  const [fc] = await Promise.all([b.page.waitForEvent('filechooser'), b.page.keyboard.press('Control+o')])
  await fc.setFiles(file); await sleep(500)
  assert.deepEqual((await texts(b.page)).sort(), ['exportado', 'ja existia'])
  assert.equal(await b.page.evaluate(() => cartoes.import('{nao json')), 0)
  assert.deepEqual((await texts(b.page)).sort(), ['exportado', 'ja existia'])
  fs.rmSync(file, { force: true })
  await b.ctx.close()
})

test('instantâneo guarda o estado de abertura e restore volta a ele', async () => {
  const { ctx, page } = await fresh()
  await seed(page, { 'cartoes.v1': JSON.stringify([{ id: 'a', x: 60, y: 60, doc: doc('antigo') }]), 'cartoes.v1.t': '5' })
  await page.goto(URL_APP); await sleep(500)
  const snaps = await eventually(async () => { const s = await page.evaluate(() => cartoes.snapshots()); return s.length ? s : null })
  assert.ok(snaps && snaps[0].cartoes === 1)
  await page.locator('.card .ProseMirror').first().click()
  await page.keyboard.press('End'); await page.keyboard.type(' mudado'); await sleep(700)
  assert.deepEqual(await texts(page), ['antigo mudado'])
  await page.evaluate((t) => cartoes.restore(t), snaps[0].t)
  assert.ok(await eventually(async () => (await texts(page)).join() === 'antigo', { timeout: 8000 }))
  assert.ok((await page.evaluate(() => cartoes.snapshots())).length >= 2) // o estado anterior virou instantâneo
  await ctx.close()
})

test('I8: Backspace num cartão só com espaços apaga os espaços, não o cartão', async () => {
  const { ctx, page, errors } = await fresh()
  await page.goto(URL_APP); await page.waitForSelector('.ProseMirror-focused')
  await page.keyboard.type('   ')
  await sleep(700) // o histórico junta edições feitas em menos de meio segundo
  await page.keyboard.press('Backspace')
  assert.equal(await page.locator('.card:not(.leaving)').count(), 1)
  assert.equal(await page.$eval('.ProseMirror', (e) => e.textContent), '  ')
  await page.keyboard.press('Control+z')        // o que foi apagado volta
  assert.equal(await page.$eval('.ProseMirror', (e) => e.textContent), '   ')
  for (let i = 0; i < 3; i++) await page.keyboard.press('Backspace')
  assert.equal(await page.locator('.card:not(.leaving)').count(), 1) // vazio de verdade, ainda aqui
  await page.keyboard.press('Backspace')        // só agora o cartão sai
  await sleep(350)
  assert.equal(await page.locator('.card').count(), 0)
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('I7: Backspace logo depois de uma regra markdown desfaz a conversão', async () => {
  const { ctx, page, errors } = await fresh()
  await page.goto(URL_APP); await page.waitForSelector('.ProseMirror-focused')
  await page.keyboard.type('um **forte**')
  assert.equal(await page.$eval('.ProseMirror', (e) => e.querySelector('strong')?.textContent), 'forte')
  await page.keyboard.press('Backspace')
  assert.equal(await page.$eval('.ProseMirror', (e) => e.textContent), 'um **forte**')
  assert.equal(await page.locator('.ProseMirror strong').count(), 0)
  await page.keyboard.press('Backspace')        // daqui em diante é um Backspace comum
  assert.equal(await page.$eval('.ProseMirror', (e) => e.textContent), 'um **forte*')
  await page.keyboard.type(' e _leve_')
  assert.equal(await page.$eval('.ProseMirror', (e) => e.querySelector('em')?.textContent), 'leve')
  await page.keyboard.type('x'); await page.keyboard.press('Backspace') // já não é "logo depois"
  assert.equal(await page.$eval('.ProseMirror', (e) => e.querySelector('em')?.textContent), 'leve')
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('pontinho de salvo: pisca ao gravar, cinza com a hora depois, vermelho se falhar', async () => {
  const { ctx, page, errors } = await fresh()
  await page.goto(URL_APP); await page.waitForSelector('.ProseMirror-focused')
  const dot = page.locator('#saved')
  assert.equal(await dot.getAttribute('class'), 'saved')
  await page.keyboard.type('texto')
  assert.equal(await dot.getAttribute('class'), 'saving')
  assert.ok(await eventually(async () => (await dot.getAttribute('class')) === 'saved'))
  assert.match(await dot.getAttribute('data-tip'), /^salvo às \d\d:\d\d · neste navegador$/)
  assert.equal(await dot.getAttribute('aria-label'), await dot.getAttribute('data-tip'))
  // falha em todos os destinos: vermelho; quando volta a gravar, cinza de novo
  await page.evaluate(() => {
    window.__set = Storage.prototype.setItem
    window.__tx = IDBDatabase.prototype.transaction
    Storage.prototype.setItem = () => { throw new Error('cheio') }
    IDBDatabase.prototype.transaction = () => { throw new Error('sem banco') }
  })
  await page.keyboard.type(' mais')
  assert.ok(await eventually(async () => (await dot.getAttribute('class')) === 'failed'))
  assert.match(await dot.getAttribute('data-tip'), /não consegui salvar/)
  await page.keyboard.type('!')
  assert.equal(await dot.getAttribute('class'), 'failed') // não finge que está gravando
  await page.evaluate(() => { Storage.prototype.setItem = window.__set; IDBDatabase.prototype.transaction = window.__tx })
  await page.keyboard.type('?')
  assert.ok(await eventually(async () => (await dot.getAttribute('class')) === 'saved'))
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('pontinho de salvo: aba somente leitura e demo dizem o que são', async () => {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(URL_APP); await page.waitForSelector('.ProseMirror-focused')
  await page.keyboard.type('da dona'); await sleep(700)
  const page2 = await ctx.newPage()
  await page2.goto(URL_APP); await sleep(500)
  assert.equal(await page2.locator('#saved').getAttribute('class'), 'ro')
  assert.match(await page2.locator('#saved').getAttribute('data-tip'), /somente leitura/)
  const page3 = await ctx.newPage()
  await page3.goto(URL_APP + '#demo'); await sleep(500)
  assert.match(await page3.locator('#saved').getAttribute('data-tip'), /só nesta demonstração$/)
  await ctx.close()
})
