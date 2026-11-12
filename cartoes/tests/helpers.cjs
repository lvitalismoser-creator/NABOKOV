'use strict'
const path = require('node:path')

const ROOT = path.join(__dirname, '..')
const URL_APP = 'file:///' + path.join(ROOT, 'index.html').split('\\').join('/')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Repete fn até devolver algo verdadeiro (ou estourar o tempo). Tolera recargas de página. */
async function eventually(fn, { timeout = 6000, every = 100 } = {}) {
  const end = Date.now() + timeout
  let last
  while (Date.now() < end) {
    try { last = await fn(); if (last) return last } catch { /* contexto recarregando */ }
    await sleep(every)
  }
  return last
}

const doc = (...paras) => ({
  type: 'doc',
  content: paras.map((t) => ({ type: 'paragraph', content: t ? [{ type: 'text', text: t }] : [] })),
})

/** Textos não vazios dos cartões que estão na mesa. */
const texts = (page) =>
  page.$$eval('.card:not(.leaving):not(.stashed) .ProseMirror', (els) => els.map((e) => e.innerText.trim()).filter(Boolean))

const ls = (page, k) => page.evaluate((key) => localStorage.getItem(key), k)

const idbState = (page) => page.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('cartoes')
  r.onsuccess = () => {
    const q = r.result.transaction('kv').objectStore('kv').get('state')
    q.onsuccess = () => res(q.result || null)
  }
  r.onerror = () => res(null)
}))

/** Grava dados no localStorage antes de o app abrir.
 *  Abre uma página em branco da mesma origem (file://), grava e sai: nenhum script
 *  de preparação fica na aba. (Um addInitScript que toca no localStorage enxerga o
 *  armazenamento vazio em recarregamentos rápidos e faz a página perder o que acabou
 *  de gravar; isso só acontece no Playwright.) */
const URL_BLANK = 'file:///' + path.join(__dirname, 'blank.html').split('\\').join('/')
const seed = async (page, entries) => {
  await page.goto(URL_BLANK)
  await page.evaluate((e) => { for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v) }, entries)
}

module.exports = { ROOT, URL_APP, sleep, eventually, doc, texts, ls, idbState, seed }
