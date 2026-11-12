'use strict'
/* Exportação (Fase 6): TXT, MD e HTML do PDF a partir de uma ordem ou da mesa;
 * janela "Exportar" com pré-visualização. Contexto limpo por teste. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const { URL_APP, sleep, seed } = require('./helpers.cjs')

let browser
before(async () => { browser = await chromium.launch() })
after(async () => { await browser.close() })

const t = (text, ...marks) => ({ type: 'text', text, ...(marks.length ? { marks: marks.map((type) => ({ type })) } : {}) })
const para = (...runs) => ({ type: 'paragraph', content: runs })
const docOf = (...paras) => ({ type: 'doc', content: paras })

// mesa: a, b na primeira fileira; c embaixo. A ordem salva lê c, a e deixa b de lado.
const CARDS = [
  { id: 'a', x: 40, y: 80, cat: 'cena', doc: docOf(para(t('A chuva '), t('começa', 'em'), t(' cedo.')), para(), para(t('Segundo '), t('parágrafo', 'strong'), t('.'))) },
  { id: 'b', x: 420, y: 80, doc: docOf(para(t('posto de lado'))) },
  { id: 'c', x: 40, y: 340, cat: 'lugar', doc: docOf(para(t('# não é título, 2 * 3 = 6 e <b>tags</b>')), para(t('muito forte ', 'strong', 'em'))) },
]
const ORG = {
  cur: 'o1',
  orders: [{
    id: 'o1', name: 'Versão: flashback?', note: 'testar no começo', notes: { c: 'abre o livro' },
    items: [{ ids: ['c'], aside: false }, { ids: ['b'], aside: true }, { ids: ['a'], aside: false }], createdAt: 1, updatedAt: 1,
  }],
}

async function open() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await seed(page, { 'cartoes.v1': JSON.stringify(CARDS), 'cartoes.v1.t': String(Date.now()), 'cartoes.org': JSON.stringify(ORG) })
  await page.goto(URL_APP); await sleep(400)
  return { ctx, page, errors }
}
const text = (page, ...a) => page.evaluate((args) => cartoes.exportText(...args), a)

test('texto corrido: segue a ordem, pula os de lado e preserva negrito e itálico', async () => {
  const { ctx, page, errors } = await open()
  assert.equal(await text(page, 'o1', 'corrido', 'txt'),
    '# não é título, 2 * 3 = 6 e <b>tags</b>\n\n***muito forte*** \n\nA chuva *começa* cedo.\n\nSegundo **parágrafo**.\n')
  // a leitura da mesa inclui todos, de cima para baixo e da esquerda para a direita
  assert.equal(await text(page, 'mesa', 'corrido', 'txt'),
    'A chuva *começa* cedo.\n\nSegundo **parágrafo**.\n\nposto de lado\n\n# não é título, 2 * 3 = 6 e <b>tags</b>\n\n***muito forte***\n')
  assert.equal(await text(page, 'não existe'), null)
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('markdown por seção: títulos numerados com a categoria e sinais do usuário escapados', async () => {
  const { ctx, page } = await open()
  assert.equal(await text(page, 'o1', 'secao', 'md'), [
    '# Versão: flashback?',
    '## 1 · Lugar',
    '\\# não é título, 2 \\* 3 = 6 e <b>tags</b>',
    '***muito forte*** ',
    '## 2 · Cena',
    'A chuva *começa* cedo.',
    'Segundo **parágrafo**.',
  ].join('\n\n') + '\n')
  await ctx.close()
})

test('ficha completa leva as notas da ordem; o HTML do PDF escapa o texto', async () => {
  const { ctx, page } = await open()
  const txt = await text(page, 'o1', 'ficha', 'txt')
  assert.match(txt, /^Versão: flashback\?\n=+\n\n\[Sobre esta ordem: testar no começo\]\n\nFicha 1 · Lugar\n-+\n/)
  assert.match(txt, /\*\*\*muito forte\*\*\* \n\n\[Nota: abre o livro\]\n\nFicha 2 · Cena\n/)
  assert.ok(!txt.includes('posto de lado'))
  const html = await text(page, 'o1', 'ficha', 'pdf')
  assert.ok(html.includes('<h1>Versão: flashback?</h1>'))
  assert.ok(html.includes('<h2>Ficha 2 · Cena</h2>'))
  assert.ok(html.includes('<p>A chuva <em>começa</em> cedo.</p>'))
  assert.ok(html.includes('<strong><em>muito forte </em></strong>'))
  assert.ok(html.includes('&lt;b&gt;tags&lt;/b&gt;') && !html.includes('<b>tags'))
  assert.ok(html.includes('<p class="note">Nota: abre o livro</p>'))
  await ctx.close()
})

test('janela Exportar: escolhe ordem, modelo e formato, mostra a prévia e baixa o arquivo', async () => {
  const { ctx, page, errors } = await open()
  await page.click('#menu-btn')
  assert.equal(await page.$eval('#menu button', (b) => b.innerText.replace(/\s+/g, ' ').trim()), 'Exportar… Ctrl+E')
  await page.click('#menu button:has-text("Exportar")')
  assert.equal(await page.textContent('#sheet-title'), 'Exportar')
  // abre na ordem aberta; a leitura da mesa também é oferecida
  assert.equal(await page.$eval('#exp-src', (s) => s.selectedOptions[0].textContent), '«Versão: flashback?»')
  assert.equal(await page.$$eval('#exp-src option', (o) => o.length), 2)
  assert.equal(await page.textContent('#exp-info'), '2 cartões · 1 de lado não entra')
  assert.equal(await page.$eval('.exp-choice button.on[data-k="format"]', (b) => b.dataset.v), 'pdf')
  assert.ok((await page.$eval('#exp-preview .pv-page', (e) => e.innerHTML)).includes('<em>começa</em>'))
  assert.equal(await page.locator('#exp-preview script, #exp-preview b').count(), 0) // texto do usuário nunca vira HTML
  await page.click('.exp-choice button[data-v="secao"]')
  await page.click('.exp-choice button[data-v="md"]')
  assert.match(await page.textContent('#exp-preview pre'), /^# Versão: flashback\?\n\n## 1 · Lugar/)
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exp-go')])
  assert.match(dl.suggestedFilename(), /^Versao flashback \d{4}-\d\d-\d\d\.md$/) // sem caracteres proibidos no Windows; sem acento no download
  assert.equal(fs.readFileSync(await dl.path(), 'utf8'), await text(page, 'o1', 'secao', 'md'))
  assert.equal(await page.locator('#sheet').isVisible(), false)
  assert.match(await page.textContent('#toast'), /Exportei «Versao flashback .*\.md» · está na pasta de downloads/)
  // lembra modelo e formato; Ctrl+E abre de novo, mesmo com o cursor num cartão
  await page.locator('.card .ProseMirror').first().click()
  await page.keyboard.press('Control+e')
  assert.equal(await page.$eval('.exp-choice button.on[data-k="format"]', (b) => b.dataset.v), 'md')
  assert.equal(await page.$eval('.exp-choice button.on[data-k="model"]', (b) => b.dataset.v), 'secao')
  await page.selectOption('#exp-src', 'mesa')
  assert.equal(await page.textContent('#exp-info'), '3 cartões')
  await page.click('.exp-choice button[data-v="txt"]'); await page.click('.exp-choice button[data-v="corrido"]')
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#exp-go')])
  assert.match(dl2.suggestedFilename(), /^cartoes \d{4}-\d\d-\d\d\.txt$/)
  assert.equal(fs.readFileSync(await dl2.path(), 'utf8'), await text(page, 'mesa', 'corrido', 'txt'))
  // exportar nunca altera os dados
  await page.evaluate(() => dispatchEvent(new Event('pagehide')))
  assert.deepEqual(JSON.parse(await page.evaluate(() => localStorage.getItem('cartoes.org'))).orders[0].items, ORG.orders[0].items)
  assert.deepEqual(errors, [])
  await ctx.close()
})

test('a prévia do exportador mostra o documento inteiro, com rolagem', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const muitos = Array.from({ length: 30 }, (_, i) => ({ id: 'k' + i, x: 40 + (i % 3) * 380, y: 80 + Math.floor(i / 3) * 250, doc: docOf(para(t(`Cartão número ${i + 1} do documento.`))) }))
  await seed(page, { 'cartoes.v1': JSON.stringify(muitos), 'cartoes.v1.t': String(Date.now()) })
  await page.goto(URL_APP); await sleep(400)
  await page.keyboard.press('Control+e')
  for (const [format, sel] of [['pdf', '.pv-page'], ['txt', 'pre'], ['md', 'pre']]) {
    await page.click(`.exp-choice button[data-v="${format}"]`)
    const txt = await page.textContent('#exp-preview ' + sel)
    assert.ok(txt.includes('Cartão número 1 do documento.') && txt.includes('Cartão número 30 do documento.'), format + ': a prévia não vai até o fim')
    assert.ok(await page.$eval('#exp-preview', (e) => e.scrollHeight > e.clientHeight && getComputedStyle(e).overflowY === 'auto'), format + ': deveria rolar')
  }
  assert.equal(await page.locator('.pv-more').count(), 0)
  // a prévia é o próprio documento
  await page.click('.exp-choice button[data-v="txt"]'); await page.click('.exp-choice button[data-v="corrido"]')
  assert.equal(await page.textContent('#exp-preview pre'), await page.evaluate(() => cartoes.exportText('mesa', 'corrido', 'txt')))
  await ctx.close()
})
