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

/** Grava dados no localStorage antes da página carregar, uma única vez por aba. */
const seed = (page, entries) => page.addInitScript((e) => {
  if (sessionStorage.getItem('__seeded')) return
  sessionStorage.setItem('__seeded', '1')
  for (const [k, v] of Object.entries(e)) localStorage.setItem(k, v)
}, entries)

module.exports = { ROOT, URL_APP, sleep, eventually, doc, texts, ls, idbState, seed }

/* Texto de um PDF gerado pelo Chromium (Skia/PDF), sem ferramenta externa.
 * Os fluxos são comprimidos e o texto vem como números de glifo; cada fonte traz uma
 * tabela glifo → caractere (ToUnicode). Aqui: descomprime, lê as tabelas e traduz.
 * Devolve { pages, text, fonts } (text sem garantia de espaços: compare sem eles). */
function pdfText(buf) {
  const zlib = require('node:zlib')
  const s = buf.toString('latin1')
  const objs = new Map()
  for (const m of s.matchAll(/(\d+) 0 obj\s*(<<.*?>>)\s*(?:stream\r?\n([\s\S]*?)\r?\nendstream)?\s*endobj/gs)) {
    let stream = null
    if (m[3] != null) {
      const raw = Buffer.from(m[3], 'latin1')
      try { stream = /FlateDecode/.test(m[2]) ? zlib.inflateSync(raw).toString('latin1') : raw.toString('latin1') } catch { stream = '' }
    }
    objs.set(+m[1], { dict: m[2], stream })
  }
  // tabelas ToUnicode por objeto de fonte
  const maps = new Map()
  const u16 = (hex) => { let t = ''; for (let i = 0; i + 4 <= hex.length; i += 4) t += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16)); return t }
  for (const [n, o] of objs) {
    const ref = /\/ToUnicode (\d+) 0 R/.exec(o.dict)
    if (!ref) continue
    const cm = objs.get(+ref[1])?.stream || ''
    const map = new Map()
    for (const blk of cm.matchAll(/beginbfchar(.*?)endbfchar/gs)) {
      for (const p of blk[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) map.set(parseInt(p[1], 16), u16(p[2]))
    }
    for (const blk of cm.matchAll(/beginbfrange(.*?)endbfrange/gs)) {
      for (const p of blk[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
        const a = parseInt(p[1], 16), b = parseInt(p[2], 16), base = parseInt(p[3], 16)
        for (let g = a; g <= b; g++) map.set(g, String.fromCodePoint(base + g - a))
      }
    }
    maps.set(n, map)
  }
  let text = ''
  const used = new Set()
  for (const o of objs.values()) {
    if (!o.stream || !/\bTf\b/.test(o.stream)) continue
    let map = null
    for (const m of o.stream.matchAll(/\/F(\d+) [\d.]+ Tf|\[([^\]]*)\]\s*TJ|<([0-9a-fA-F]+)>\s*Tj/g)) {
      if (m[1]) { map = maps.get(+m[1]) || null; used.add(+m[1]); continue }
      const hexes = m[2] != null ? [...m[2].matchAll(/<([0-9a-fA-F]+)>/g)].map((x) => x[1]) : [m[3]]
      for (const hx of hexes) for (let i = 0; i + 4 <= hx.length; i += 4) text += map?.get(parseInt(hx.slice(i, i + 4), 16)) ?? '�'
    }
  }
  return { pages: (s.match(/\/Type\s*\/Page\b(?!s)/g) || []).length, text, fonts: used.size }
}
module.exports.pdfText = pdfText
