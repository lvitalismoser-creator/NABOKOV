'use strict'
/* Organizador (Fase 5): ordens de leitura, pôr de lado, notas, bandeja
 * "fora da ordem", ordens salvas e "dispor na mesa". Contexto limpo por teste. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { URL_APP, sleep, eventually, doc, texts, ls, idbState, seed } = require('./helpers.cjs')

let browser
before(async () => { browser = await chromium.launch() })
after(async () => { await browser.close() })

// mesa: a b na primeira fileira, grupo (c,d) e e na segunda
const MESA = [
  { id: 'a', x: 40, y: 60, doc: doc('alfa') },
  { id: 'b', x: 420, y: 60, doc: doc('beta') },
  { id: 'c', x: 40, y: 320, g: 'g1', doc: doc('gama') },
  { id: 'd', x: 398, y: 320, g: 'g1', doc: doc('delta') },
  { id: 'e', x: 800, y: 330, doc: doc('epsilon') },
]

async function open(cards = MESA, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await seed(page, { 'cartoes.v1': JSON.stringify(cards), 'cartoes.v1.t': String(Date.now()), ...extra })
  await page.goto(URL_APP); await sleep(400)
  return { ctx, page, errors }
}
const organize = async (page) => { await page.keyboard.press('e'); await page.waitForSelector('#show:not([hidden])') }
/** Fileira: primeiras palavras de cada peça, com "^" nas postas de lado. */
const strip = (page) => page.$$eval('#strip .chip', (els) => els.map((e) =>
  (e.classList.contains('aside') ? '^' : '') + e.querySelector('.ctext').textContent))
const trayList = (page) => page.$$eval('#tray-chips .chip .ctext', (els) => els.map((e) => e.textContent))
const orgOf = (page) => page.evaluate(() => cartoes.ordens())
const flush = (page) => page.evaluate(() => dispatchEvent(new Event('pagehide')))

test('abre na ordem de leitura da mesa; grupo entra como uma peça; nada muda na mesa', async () => {
  const { ctx, page, errors } = await open()
  const pos = await page.$$eval('.card', (els) => els.map((e) => e.style.transform))
  await organize(page)
  assert.deepEqual(await strip(page), ['alfa', 'beta', 'gama', 'epsilon'])
  assert.equal(await page.locator('#strip .chip.stack').count(), 1) // o grupo
  assert.equal(await page.textContent('#show-count'), '1 de 4')
  await page.keyboard.press('Escape')
  assert.deepEqual(await page.$$eval('.card', (els) => els.map((e) => e.style.transform)), pos)
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('mover pelo teclado e arrastando, pôr de lado e notas sobrevivem ao recarregar', async () => {
  const { ctx, page, errors } = await open()
  await organize(page)
  await page.keyboard.press('Alt+ArrowRight')            // alfa vai para depois de beta
  assert.deepEqual(await strip(page), ['beta', 'alfa', 'gama', 'epsilon'])
  await page.keyboard.press('ArrowUp')                   // alfa (atual) fica de lado
  assert.deepEqual(await strip(page), ['beta', '^alfa', 'gama', 'epsilon'])
  assert.match(await page.textContent('#show-count'), /de lado · 3 na leitura/)
  await page.keyboard.press('c')                         // abre as notas
  await page.locator('#note-piece').fill('alfa aqui não')
  await page.locator('#note-order').fill('versão sem abertura')
  await page.keyboard.press('Escape')
  // arrastar epsilon (último) para o começo
  const chips = await page.$$('#strip .chip')
  const from = await chips[3].boundingBox(), to = await chips[0].boundingBox()
  await page.mouse.move(from.x + 30, from.y + 30); await page.mouse.down()
  await page.mouse.move(from.x - 20, from.y + 20, { steps: 4 })
  await page.mouse.move(to.x + 5, to.y + 30, { steps: 10 })
  await page.mouse.up()
  assert.deepEqual(await strip(page), ['epsilon', 'beta', '^alfa', 'gama'])
  await flush(page)
  assert.ok((await ls(page, 'cartoes.org')).includes('alfa aqui não'))
  assert.ok(await eventually(async () => JSON.stringify((await idbState(page))?.org || '').includes('versão sem abertura')))

  await page.reload(); await sleep(400)
  await organize(page)
  assert.deepEqual(await strip(page), ['epsilon', 'beta', '^alfa', 'gama'])
  assert.equal(await page.locator('#strip .chip.has-note').count(), 1)
  await page.locator('#strip .chip').nth(2).click()
  assert.equal(await page.inputValue('#note-piece'), 'alfa aqui não')
  assert.equal(await page.inputValue('#note-order'), 'versão sem abertura')
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('salvar com nome; cartão escrito depois espera na bandeja e entra com um clique', async () => {
  const { ctx, page, errors } = await open()
  await organize(page)
  await page.click('#org-save')
  await page.locator('#org-name-input').fill('versão A')
  await page.keyboard.press('Enter')
  assert.match(await page.textContent('#org-name'), /«versão A»/)
  await page.keyboard.press('Escape')

  await page.mouse.dblclick(900, 650)
  await page.waitForSelector('.ProseMirror-focused')
  await page.keyboard.type('zeta novo'); await page.keyboard.press('Escape')
  await organize(page)
  assert.match(await page.textContent('#org-name'), /«versão A»/)
  assert.deepEqual(await strip(page), ['alfa', 'beta', 'gama', 'epsilon']) // a ordem salva não mudou sozinha
  assert.deepEqual(await trayList(page), ['zeta novo'])
  await page.locator('#tray-chips .chip').click()
  assert.deepEqual(await strip(page), ['alfa', 'beta', 'gama', 'epsilon', 'zeta novo'])
  assert.equal(await page.locator('#tray').isHidden(), true)
  // tirar da ordem devolve à bandeja (o cartão continua na mesa)
  await page.click('text=tirar da ordem')
  assert.deepEqual(await trayList(page), ['zeta novo'])
  assert.ok((await texts(page)).includes('zeta novo'))
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('separar o grupo vale só nesta ordem: na mesa ele continua junto', async () => {
  const { ctx, page } = await open()
  await organize(page)
  await page.locator('#strip .chip').nth(2).click()
  await page.click('text=separar o grupo nesta ordem')
  assert.deepEqual(await strip(page), ['alfa', 'beta', 'gama', 'delta', 'epsilon'])
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('.gframe').count(), 1)
  await flush(page)
  const saved = JSON.parse(await ls(page, 'cartoes.v1'))
  assert.equal(saved.find((k) => k.id === 'c').g, saved.find((k) => k.id === 'd').g)
  await ctx.close()
})

test('embaralhar com duas peças sempre troca a ordem; ordem salva nunca é sorteada', async () => {
  const { ctx, page } = await open(MESA.slice(0, 2))
  await organize(page)
  for (let i = 0; i < 6; i++) {
    const was = await strip(page)
    await page.keyboard.press('r')
    assert.notDeepEqual(await strip(page), was)
  }
  await page.click('#org-save')
  await page.locator('#org-name-input').fill('fixa')
  await page.keyboard.press('Enter')
  const fixed = await strip(page)
  await page.keyboard.press('r')
  assert.match(await page.textContent('#org-name'), /em teste/)
  const o = await orgOf(page)
  const saved = o.orders.find((x) => x.name === 'fixa')
  assert.deepEqual(saved.items.map((it) => it.ids[0]), fixed.map((t) => (t === 'alfa' ? 'a' : 'b')))
  await ctx.close()
})

test('dispor na mesa arruma em fileiras na ordem, os de lado depois, e desfazer volta tudo', async () => {
  const { ctx, page } = await open()
  await flush(page)
  const before = JSON.parse(await ls(page, 'cartoes.v1')).map(({ id, x, y }) => ({ id, x, y }))
  await organize(page)
  await page.keyboard.press('End')            // epsilon
  await page.keyboard.press('Alt+ArrowLeft')
  await page.keyboard.press('Alt+ArrowLeft')
  await page.keyboard.press('Alt+ArrowLeft')  // epsilon, alfa, beta, gama
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowUp')        // alfa de lado
  await page.click('#org-layout')
  await page.waitForSelector('#show[hidden]', { state: 'attached' })
  await flush(page)
  const after = Object.fromEntries(JSON.parse(await ls(page, 'cartoes.v1')).map((k) => [k.id, k]))
  const key = (k) => [k.y, k.x]
  const seq = ['e', 'b', 'c', 'd'].map((id) => key(after[id]))
  for (let i = 1; i < seq.length; i++) {
    assert.ok(seq[i][0] > seq[i - 1][0] || (seq[i][0] === seq[i - 1][0] && seq[i][1] > seq[i - 1][1]), 'fora de ordem: ' + JSON.stringify(seq))
  }
  assert.ok(after.a.y > after.d.y, 'o cartão de lado vai para depois') // fileira de baixo
  assert.equal(after.c.g, after.d.g) // o grupo continua grupo

  await page.click('#toast button') // desfazer
  await flush(page)
  const back = JSON.parse(await ls(page, 'cartoes.v1')).map(({ id, x, y }) => ({ id, x, y }))
  assert.deepEqual(back, before)
  await ctx.close()
})

test('Ctrl+Z desfaz no organizador; excluir uma ordem tem desfazer', async () => {
  const { ctx, page } = await open()
  await organize(page)
  await page.keyboard.press('Alt+ArrowRight')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('Control+z')
  await page.keyboard.press('Control+z')
  assert.deepEqual(await strip(page), ['alfa', 'beta', 'gama', 'epsilon'])
  await page.keyboard.press('Control+Shift+z')
  assert.deepEqual(await strip(page), ['beta', 'alfa', 'gama', 'epsilon'])

  await page.click('#org-save')
  await page.locator('#org-name-input').fill('descartável')
  await page.keyboard.press('Enter')
  await page.click('#org-name')
  await page.click('.pop-row.on .pop-mini[title^="Excluir"]')
  assert.equal((await orgOf(page)).orders.some((o) => o.name === 'descartável'), false)
  await page.click('#toast button')
  assert.equal((await orgOf(page)).orders.some((o) => o.name === 'descartável'), true)
  await ctx.close()
})

test('cartão excluído some da ordem e volta ao mesmo lugar se for restaurado', async () => {
  const { ctx, page } = await open()
  await organize(page)
  await page.keyboard.press('Escape')
  await page.locator('.card', { hasText: 'beta' }).hover()
  await page.locator('.card', { hasText: 'beta' }).locator('.close').click()
  await organize(page)
  assert.deepEqual(await strip(page), ['alfa', 'gama', 'epsilon'])
  await page.keyboard.press('Escape')
  await page.keyboard.press('t') // reabre da lixeira
  await page.keyboard.press('Escape')
  await organize(page)
  assert.deepEqual(await strip(page), ['alfa', 'beta', 'gama', 'epsilon'])
  await ctx.close()
})

test('exportar leva as ordens; importar traz as nomeadas com os cartões novos', async () => {
  const a = await open()
  await organize(a.page)
  await a.page.keyboard.press('Alt+ArrowRight')
  await a.page.click('#org-save')
  await a.page.locator('#org-name-input').fill('exportável')
  await a.page.keyboard.press('Enter')
  await a.page.keyboard.press('Escape')
  const [dl] = await Promise.all([a.page.waitForEvent('download'), a.page.keyboard.press('Control+s')])
  const text = fs.readFileSync(await dl.path(), 'utf8')
  await a.ctx.close()

  const b = await open([{ id: 'x', x: 50, y: 500, doc: doc('ja existia') }])
  await b.page.evaluate((t) => cartoes.import(t), text)
  const o = await orgOf(b.page)
  const imp = o.orders.find((x) => x.name === 'exportável (importada)')
  assert.ok(imp)
  assert.equal(imp.items.length, 4)
  assert.ok(imp.items.flatMap((it) => it.ids).every((id) => !['a', 'b', 'c', 'd', 'e'].includes(id)))
  await b.ctx.close()
})

test('#demo não toca na lixeira nem nas ordens reais', async () => {
  const { ctx, page } = await open(MESA, { 'cartoes.trash': '[{"id":"z"}]' })
  await organize(page)
  await page.keyboard.press('Escape')
  await flush(page)
  const realOrg = await ls(page, 'cartoes.org'), realTrash = await ls(page, 'cartoes.trash')
  await page.goto(URL_APP + '#demo'); await page.reload(); await sleep(400)
  await organize(page)
  await page.keyboard.press('Escape')
  await flush(page)
  assert.equal(await ls(page, 'cartoes.org'), realOrg)
  assert.equal(await ls(page, 'cartoes.trash'), realTrash)
  assert.ok(await ls(page, 'cartoes.demo.org'))
  await ctx.close()
})

/* ---------------- relato do dono de 2026-11-12 ---------------- */
const longo = (t) => doc(t + ' começa aqui.', 'Segundo parágrafo, comprido o bastante para ocupar algumas linhas da ficha e forçar a leitura a crescer para baixo.', 'Terceiro parágrafo de ' + t + '.')
// grupo de 5 cartões em 2 fileiras (3 + 2) e um cartão solto
const GRUPAO = [
  { id: 'a', x: 40, y: 80, g: 'g1', r: 0, doc: longo('alfa') }, { id: 'b', x: 398, y: 80, g: 'g1', r: 0, doc: longo('beta') }, { id: 'c', x: 756, y: 80, g: 'g1', r: 0, doc: longo('gama') },
  { id: 'd', x: 40, y: 312, g: 'g1', r: 0, doc: longo('delta') }, { id: 'e', x: 398, y: 312, g: 'g1', r: 0, doc: longo('epsilon') },
  { id: 'f', x: 40, y: 700, r: 0, doc: doc('solto') },
]
const inside = async (page) => {
  const st = await page.locator('#stage').boundingBox()
  const boxes = await page.$$eval('#stage .s-card', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height } }))
  return boxes.every((b) => b.x >= st.x - 1 && b.y >= st.y - 1 && b.x + b.w <= st.x + st.width + 1 && b.y + b.h <= st.y + st.height + 1)
}

test('organizador: um grupo grande aparece inteiro (ajustado); o zoom da leitura amplia e a área rola', async () => {
  const { ctx, page, errors } = await open(GRUPAO)
  await page.setViewportSize({ width: 1280, height: 720 })
  await organize(page)
  assert.equal(await page.locator('#stage .s-card').count(), 5)
  assert.ok(await inside(page), 'algum cartão do grupo ficou cortado')
  // cada cartão do grupo mostra o texto todo, sem rolagem interna
  assert.ok(await page.$$eval('#stage .s-body', (els) => els.every((e) => e.scrollHeight <= e.clientHeight + 1)))
  assert.match(await page.textContent('#org-zoom'), /^ajustado · \d+%$/)
  const w0 = (await page.locator('#stage .s-card').first().boundingBox()).width
  // ampliar: Ctrl + "+" duas vezes; a leitura cresce e passa a rolar, sem cortar nada
  await page.keyboard.press('Control+='); await page.keyboard.press('Control+=')
  const w1 = (await page.locator('#stage .s-card').first().boundingBox()).width
  assert.ok(w1 > w0 * 1.15, `não ampliou: ${w0} -> ${w1}`)
  assert.match(await page.textContent('#org-zoom'), /^\d+%$/)
  const sc = await page.$eval('#stage', (e) => ({ sh: e.scrollHeight, ch: e.clientHeight, sw: e.scrollWidth, cw: e.clientWidth }))
  assert.ok(sc.sh > sc.ch || sc.sw > sc.cw, 'ampliado, deveria rolar')
  await page.$eval('#stage', (e) => { e.scrollTop = e.scrollHeight; e.scrollLeft = e.scrollWidth })
  const last = await page.locator('#stage .s-card').last().boundingBox(), st = await page.locator('#stage').boundingBox()
  assert.ok(last.y + last.height <= st.y + st.height + 1, 'o fim do grupo é alcançável rolando')
  // Ctrl + roda também; o botão volta ao ajustado
  await page.mouse.move(st.x + st.width / 2, st.y + st.height / 2)
  await page.keyboard.down('Control'); await page.mouse.wheel(0, 400); await page.keyboard.up('Control')
  assert.ok((await page.locator('#stage .s-card').first().boundingBox()).width < w1)
  await page.click('#org-zoom')
  assert.ok(await inside(page))
  // o zoom fixado vale para as outras peças; Ctrl+0 volta ao ajustado; a mesa não mudou de zoom
  await page.click('#org-zoom-in'); await page.keyboard.press('ArrowRight')
  assert.match(await page.textContent('#org-zoom'), /^\d+%$/)
  await page.keyboard.press('Control+0')
  assert.equal(await page.textContent('#org-zoom'), 'ajustado')
  await page.keyboard.press('Escape')
  assert.equal(await page.evaluate(() => new DOMMatrix(getComputedStyle(document.getElementById('world')).transform).a), 1)
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('dispor na mesa leva o grupo como um bloco: o arranjo interno dos cartões não muda', async () => {
  const { ctx, page, errors } = await open(GRUPAO)
  await organize(page)
  await page.keyboard.press('Alt+ArrowRight')       // o grupo passa para depois do cartão solto
  assert.deepEqual(await strip(page), ['solto', 'alfa começa aqui. Segundo parágrafo, comprido o bastante para…'])
  await page.click('#org-layout')
  await page.waitForSelector('#show[hidden]', { state: 'attached' })
  await flush(page)
  const s = Object.fromEntries(JSON.parse(await ls(page, 'cartoes.v1')).map((k) => [k.id, k]))
  const rel = (id) => [s[id].x - s.a.x, s[id].y - s.a.y]
  assert.deepEqual(['b', 'c', 'd', 'e'].map(rel), [[358, 0], [716, 0], [0, 232], [358, 232]]) // 3 em cima, 2 embaixo, como estava
  assert.ok(['b', 'c', 'd', 'e'].every((id) => s[id].g === s.a.g && s.a.g))
  assert.ok(s.f.y + 214 <= s.a.y, 'o solto vem antes (o grupo, largo, desce para a fileira seguinte)')
  assert.equal(await page.textContent('.gframe .gn'), '5 cartões')
  // desfazer devolve tudo
  await page.click('#toast button'); await flush(page)
  const u = Object.fromEntries(JSON.parse(await ls(page, 'cartoes.v1')).map((k) => [k.id, k]))
  assert.deepEqual([u.a.x, u.a.y, u.e.x, u.e.y, u.f.x, u.f.y], [40, 80, 398, 312, 40, 700])
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('ordem em teste acompanha os grupos feitos depois dela; dispor na mesa não os desmancha', async () => {
  const cards = [
    { id: 'a', x: 40, y: 80, g: 'g1', doc: doc('alfa') }, { id: 'b', x: 398, y: 80, g: 'g1', doc: doc('beta') },
    { id: 'c', x: 40, y: 400, doc: doc('gama') },
  ]
  const org = { orders: [{ id: 'o1', name: null, note: '', notes: {}, createdAt: 1, updatedAt: 1,
    items: ['a', 'b', 'c'].map((id) => ({ ids: [id], aside: false })) }], cur: 'o1' }
  const { ctx, page, errors } = await open(cards, { 'cartoes.org': JSON.stringify(org) })
  await organize(page)
  assert.equal((await strip(page)).length, 2, 'o grupo (a, b) devia ser uma peça só')
  await page.click('#org-layout')
  await page.waitForSelector('#show[hidden]', { state: 'attached' })
  assert.equal(await page.locator('.gframe').count(), 1)
  assert.deepEqual(errors, [])
  await ctx.close()
})
