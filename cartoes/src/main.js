import { EditorState, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { Schema } from 'prosemirror-model'
import { keymap } from 'prosemirror-keymap'
import { history, undo, redo } from 'prosemirror-history'
import { baseKeymap, toggleMark } from 'prosemirror-commands'
import { inputRules, InputRule, undoInputRule } from 'prosemirror-inputrules'

/* ------------------------------------------------------------------ *
 *  Schema mínimo: parágrafos, negrito e itálico. Nada além disso.
 * ------------------------------------------------------------------ */
const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: { group: 'block', content: 'inline*', parseDOM: [{ tag: 'p' }], toDOM: () => ['p', 0] },
    text: { group: 'inline' },
  },
  marks: {
    strong: { parseDOM: [{ tag: 'strong' }], toDOM: () => ['strong', 0] },
    em: { parseDOM: [{ tag: 'em' }], toDOM: () => ['em', 0] },
  },
})

const markRule = (re, type) =>
  new InputRule(re, (state, match, start, end) =>
    state.tr.replaceWith(start, end, schema.text(match[1], [type.create()])).setStoredMarks([]))

const rules = inputRules({
  rules: [
    markRule(/\*\*([^*\s](?:[^*]*[^*\s])?)\*\*$/, schema.marks.strong),
    markRule(/(?<!\*)\*([^*\s](?:[^*]*[^*\s])?)\*$/, schema.marks.em),
    markRule(/(?<![_\w])_([^_\s](?:[^_]*[^_\s])?)_$/, schema.marks.em),
  ],
})

/* ------------------------------------------------------------------ *
 *  Estado do quadro
 * ------------------------------------------------------------------ */
const W = 340, H = 214
const GAP = 18   // distância entre cartões grudados num grupo
const SNAP = 28  // alcance do ímã
const CATS = ['cena', 'nota', 'lugar']
const CAT_LABEL = { cena: 'Cena', nota: 'Nota', lugar: 'Lugar' }
const DEMO_MODE = location.hash === '#demo'
// o demo grava numa chave própria: nunca toca nos cartões reais
const STORE = DEMO_MODE ? 'cartoes.demo' : 'cartoes.v1'
// no app desktop (Electron) o arquivo em disco é a fonte principal; IndexedDB e localStorage viram cache
const disk = DEMO_MODE ? null : (window.cartoesDisk || null)
const BAK = 'cartoes.bak'              // cópia do último estado legível ao abrir
const QUAR = 'cartoes.quarentena'       // cartões que não puderam ser carregados
const CORRUPT = 'cartoes.corrompido'    // texto bruto ilegível (nunca sobrescrito)
const board = document.getElementById('board')
const toast = document.getElementById('toast')
const dock = document.getElementById('dock')
const cards = new Map()
let zTop = 1
let current = null // cartão com foco

const isEmpty = (state) => state.doc.textContent.trim() === ''
// sem nenhum caractere (nem espaço) e com um parágrafo só
const isBlank = (state) => state.doc.childCount === 1 && state.doc.textContent === ''
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))
const rand = (a, b) => a + Math.random() * (b - a)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

const TRAY = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M2 9.5h3.2l.8 1.6h4l.8-1.6H14V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1zM8 2v5.5M5.6 5.4 8 7.8l2.4-2.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>'

function emptyDoc() {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

/* ------------------------------------------------------------------ *
 *  Persistência
 * ------------------------------------------------------------------ */
/* Dois destinos: IndexedDB (principal, assíncrono, sem o teto de 5 MiB) e
 * localStorage (espelho síncrono, único que sobrevive com segurança a um
 * fechamento abrupto). Ao abrir vale o que foi gravado por último. */
let ready = false      // só salva depois de ter lido o que já existia
let readOnly = false   // outra aba é a dona da gravação
let db = null
let saveTimer, firstDirty = 0
const DEBOUNCE = 400, MAX_WAIT = 3000

function save() {
  if (!ready || readOnly) return
  const now = Date.now()
  if (!firstDirty) firstDirty = now
  clearTimeout(saveTimer)
  // enquanto o usuário digita sem parar, ainda assim grava a cada MAX_WAIT
  saveTimer = setTimeout(flush, Math.max(0, Math.min(DEBOUNCE, firstDirty + MAX_WAIT - now)))
}
function snapshotOf(c) {
  // o doc só é reserializado quando mudou (docJ é invalidado a cada edição)
  return {
    id: c.id, x: c.x, y: c.y, z: c.z, r: c.r, g: c.g, cat: c.cat, stashed: c.stashed, sa: c.sa,
    doc: (c.docJ ||= c.view.state.doc.toJSON()),
  }
}

const idbOpen = () => new Promise((res) => {
  if (DEMO_MODE || !window.indexedDB) return res(null)
  try {
    const r = indexedDB.open('cartoes', 2)
    r.onupgradeneeded = () => {
      for (const n of ['kv', 'snaps']) if (!r.result.objectStoreNames.contains(n)) r.result.createObjectStore(n)
    }
    r.onsuccess = () => res(r.result)
    r.onerror = r.onblocked = () => res(null)
  } catch { res(null) }
})
const idbGet = () => new Promise((res) => {
  if (!db) return res(null)
  try {
    const q = db.transaction('kv').objectStore('kv').get('state')
    q.onsuccess = () => res(q.result || null)
    q.onerror = () => res(null)
  } catch { res(null) }
})
let idbChain = Promise.resolve()
const idbPut = (val) => (idbChain = idbChain.then(() => new Promise((res) => {
  if (!db) return res(false)
  try {
    const tx = db.transaction('kv', 'readwrite')
    tx.objectStore('kv').put(val, 'state')
    tx.oncomplete = () => res(true)
    tx.onerror = tx.onabort = () => res(false)
  } catch { res(false) }
})))

/* Instantâneos: cópias datadas no IndexedDB. Ficam os 20 mais recentes e o
 * mais novo de cada um dos últimos 7 dias. */
const SNAP_EVERY = 5 * 60e3
let lastSnap = 0
const idbSnap = (rec) => (idbChain = idbChain.then(() => new Promise((res) => {
  if (!db) return res(false)
  try {
    const tx = db.transaction('snaps', 'readwrite')
    const os = tx.objectStore('snaps')
    os.put(rec, rec.savedAt)
    const ks = os.getAllKeys()
    ks.onsuccess = () => {
      const keys = ks.result.sort((a, b) => b - a)
      const keep = new Set(keys.slice(0, 20))
      const days = new Set(), cutoff = Date.now() - 7 * 864e5
      for (const k of keys) {
        if (k < cutoff) break
        const d = new Date(k).toDateString()
        if (!days.has(d)) { days.add(d); keep.add(k) }
      }
      keys.forEach((k) => { if (!keep.has(k)) os.delete(k) })
    }
    tx.oncomplete = () => res(true)
    tx.onerror = tx.onabort = () => res(false)
  } catch { res(false) }
})))
const idbSnapList = () => new Promise((res) => {
  if (!db) return res([])
  try {
    const q = db.transaction('snaps').objectStore('snaps').getAll()
    q.onsuccess = () => res(q.result || [])
    q.onerror = () => res([])
  } catch { res([]) }
})

/* Lixeira: cartões excluídos ficam guardados (até 50), junto com o quadro. */
// (o demo usa chaves próprias: nunca toca na lixeira nem nas ordens reais)
const TRASH_KEY = DEMO_MODE ? 'cartoes.demo.trash' : 'cartoes.trash'
const TRASH_MAX = 50
let trash = []

/* Ordens do organizador: { orders: [...], cur: id da ordem aberta }. */
const ORG_KEY = DEMO_MODE ? 'cartoes.demo.org' : 'cartoes.org'
let org = { orders: [], cur: null }

let saveFailed = false
function report(ok) {
  if (ok) {
    if (saveFailed) { saveFailed = false; toast.classList.remove('show') }
    return
  }
  // nunca em silêncio: o usuário precisa saber que o texto não está sendo guardado
  saveFailed = true
  clearTimeout(toastTimer)
  toast.textContent = 'Não consegui salvar. Seus cartões continuam aqui, mas não feche esta janela.'
  toast.classList.add('show')
}

function flush(final = false) {
  clearTimeout(saveTimer)
  firstDirty = 0
  if (!ready || readOnly) return false
  const t = Date.now()
  const list = [...cards.values()].map(snapshotOf)
  const rec = { savedAt: t, cards: list, trash, org }
  // espelho síncrono primeiro: é o que resiste a um fechamento no meio do caminho
  const lsOk = lsSet(STORE, JSON.stringify(list)) && lsSet(STORE + '.t', String(t)) &&
    lsSet(TRASH_KEY, JSON.stringify(trash)) && lsSet(ORG_KEY, JSON.stringify(org))
  const snap = t - lastSnap >= SNAP_EVERY
  if (snap) { lastSnap = t; idbSnap(rec); disk?.snapshot(rec).catch(() => {}) }
  // disco (app desktop): síncrono ao fechar a janela, assíncrono no resto do tempo
  let diskP = Promise.resolve(null)
  if (disk) {
    try { diskP = final ? Promise.resolve(!!disk.saveSync(rec)) : disk.save(rec).then(Boolean, () => false) }
    catch { diskP = Promise.resolve(false) }
  }
  Promise.all([idbPut(rec), diskP]).then(([idbOk, diskOk]) => {
    // no app desktop o que importa é o arquivo; no navegador, qualquer um dos destinos
    const ok = disk ? diskOk : (lsOk || idbOk)
    if (!ok) console.error('cartoes: falha ao salvar')
    report(ok)
  })
  return lsOk
}
// salva ao fechar, trocar de aba ou minimizar (beforeunload sozinho não basta)
// no fechamento a gravação em disco precisa ser síncrona (flush(true))
addEventListener('beforeunload', () => flush(true))
addEventListener('pagehide', () => flush(true))
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush() })

const lsGet = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true } catch { return false } }

/* Valida um cartão salvo. Lança erro se o conteúdo não for aproveitável. */
function sane(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('cartão inválido')
  const num = (v) => (Number.isFinite(v) ? v : undefined)
  if (d.doc) schema.nodeFromJSON(d.doc).check()
  return {
    id: typeof d.id === 'string' && d.id ? d.id : undefined,
    x: num(d.x), y: num(d.y), z: num(d.z), r: num(d.r),
    g: typeof d.g === 'string' && d.g ? d.g : null,
    cat: CATS.includes(d.cat) ? d.cat : null,
    stashed: d.stashed === true,
    sa: num(d.sa) ?? 0,
    doc: d.doc || undefined,
  }
}

/* Lê os cartões salvos sem jamais destruir o que não conseguir ler:
 * texto ilegível vai para CORRUPT; cartões inválidos vão para QUAR. */
async function load() {
  const raw = lsGet(STORE)
  let parsed = null, lsT = 0, corrupt = false
  if (raw != null) {
    try { parsed = JSON.parse(raw) } catch { parsed = null }
    if (!Array.isArray(parsed)) {
      parsed = null; corrupt = true
      lsSet(CORRUPT + '.' + Date.now(), raw)
    } else lsT = Number(lsGet(STORE + '.t')) || 0
  }
  // IndexedDB só vence se for estritamente mais novo que o espelho (ou se o espelho não serve)
  const rec = await idbGet()
  let drec = null
  if (disk) { try { drec = await disk.load() } catch { drec = null } }
  let lsTrash, lsOrg
  try { lsTrash = JSON.parse(lsGet(TRASH_KEY)) } catch { lsTrash = null }
  try { lsOrg = JSON.parse(lsGet(ORG_KEY)) } catch { lsOrg = null }
  // vale o registro mais novo; em empate, disco > IndexedDB > espelho
  const cands = []
  if (drec?.rec && Array.isArray(drec.rec.cards)) cands.push({ t: drec.rec.savedAt || 0, cards: drec.rec.cards, trash: drec.rec.trash, org: drec.rec.org })
  if (rec && Array.isArray(rec.cards)) cands.push({ t: rec.savedAt || 0, cards: rec.cards, trash: rec.trash, org: rec.org })
  if (parsed) cands.push({ t: lsT, cards: parsed, trash: lsTrash, org: lsOrg })
  let best = null
  for (const c of cands) if (!best || c.t > best.t) best = c
  const source = best?.cards, rawTrash = best?.trash
  const diskWarn = drec?.warn || null
  if (Array.isArray(rawTrash)) {
    trash = rawTrash.filter((d) => { try { sane(d); return true } catch { return false } }).slice(-TRASH_MAX)
  }
  org = saneOrg(best?.org)
  if (!source) return { list: [], lost: corrupt ? -1 : 0, diskWarn }
  parsed = source
  if (!DEMO_MODE && !readOnly) lsSet(BAK, JSON.stringify(parsed))
  const list = [], bad = []
  const seen = new Set()
  for (const d of parsed) {
    try {
      const s = sane(d)
      if (s.id && seen.has(s.id)) s.id = undefined
      if (s.id) seen.add(s.id)
      list.push(s)
    } catch { bad.push(d) }
  }
  if (bad.length) {
    let prev = []
    try { prev = JSON.parse(lsGet(QUAR)) || [] } catch {}
    lsSet(QUAR, JSON.stringify([...(Array.isArray(prev) ? prev : []), ...bad]))
  }
  return { list, lost: bad.length, diskWarn }
}

/* ------------------------------------------------------------------ *
 *  Cartão
 * ------------------------------------------------------------------ */
function createCard(data = {}, { focus = false, animate = false } = {}) {
  const c = {
    id: data.id || uid(),
    g: data.g || null, cat: data.cat || null, stashed: !!data.stashed, sa: data.sa || 0,
    x: data.x ?? 100, y: data.y ?? 100,
    z: data.z ?? ++zTop,
    r: data.r ?? +rand(-0.45, 0.45).toFixed(2),
    dragging: false, docJ: null,
  }
  zTop = Math.max(zTop, c.z)

  const el = document.createElement('div')
  el.className = 'card' + (animate ? ' entering' : '')
  el.innerHTML = `
    <div class="tilt">
      <i class="under u3"></i><i class="under u2"></i><i class="under u1"></i>
      <div class="paper">
        <span class="grip"></span>
        <span class="cats">${CATS.map((k) => `<button tabindex="-1" data-cat="${k}">${CAT_LABEL[k]}</button>`).join('')}</span>
        <button class="stash" tabindex="-1" title="Guardar na gaveta (não exclui)">${TRAY}guardar</button>
        <button class="close" tabindex="-1" aria-label="Excluir cartão" title="Excluir">×</button>
        <div class="scroll"><div class="mount"></div></div>
      </div>
    </div>`
  c.el = el
  c.scroll = el.querySelector('.scroll')
  el.style.setProperty('--r', c.r + 'deg')
  if (c.stashed) el.classList.add('stashed')
  paintCat(c)
  place(c)

  const state = EditorState.create({
    doc: schema.nodeFromJSON(data.doc || emptyDoc()),
    plugins: [
      history(),
      rules,
      keymap({
        'Mod-z': undo, 'Mod-y': redo, 'Shift-Mod-z': redo,
        'Mod-b': toggleMark(schema.marks.strong),
        'Mod-i': toggleMark(schema.marks.em),
        'Mod-Enter': () => { spawnNextTo(c); return true },
        Escape: (_s, _d, view) => { view.dom.blur(); return true },
        Backspace: (s, dispatch) => {
          // logo depois de uma regra markdown, Backspace desfaz a conversão (I7)
          if (undoInputRule(s, dispatch)) return true
          // só um cartão sem nenhum caractere é apagado; espaços são texto e se apagam um a um (I8)
          if (isBlank(s)) { removeCard(c, { undoable: false }); return true }
          return false
        },
      }),
      keymap(baseKeymap),
    ],
  })

  c.view = new EditorView(el.querySelector('.mount'), {
    state,
    attributes: { spellcheck: 'false' },
    editable: () => !readOnly,
    scrollMargin: { top: 4, bottom: 40, left: 0, right: 0 },
    scrollThreshold: { top: 4, bottom: 40, left: 0, right: 0 },
    dispatchTransaction(tr) {
      c.view.updateState(c.view.state.apply(tr))
      if (tr.docChanged) { c.docJ = null; save(); measure(c) }
    },
  })

  wire(c)
  cards.set(c.id, c)
  board.appendChild(el)
  measure(c)
  syncEmpty()
  renderGroups()
  if (animate) el.addEventListener('animationend', () => el.classList.remove('entering'), { once: true })
  if (focus) c.view.focus()
  return c
}

function place(c) {
  c.el.style.transform = `translate(${c.x}px, ${c.y}px)`
  c.el.style.zIndex = c.z * 2
}

function paintCat(c) {
  c.el.dataset.cat = c.cat || ''
  c.el.querySelectorAll('.cats button').forEach((b) => b.classList.toggle('on', b.dataset.cat === c.cat))
}

/* O cartão tem mais texto do que mostra? Mostra isso como pilha de folhas. */
function measure(c) {
  const s = c.scroll
  const content = c.view.dom.offsetHeight
  const ratio = content / s.clientHeight
  const depth = ratio <= 1.001 ? 0 : ratio < 1.7 ? 1 : ratio < 3 ? 2 : 3
  c.el.dataset.depth = depth
  c.el.classList.toggle('more-below', s.scrollTop + s.clientHeight < s.scrollHeight - 2)
  c.el.classList.toggle('more-above', s.scrollTop > 2)
}

function bringToFront(c) {
  bringUnitToFront(unitOf(c))
}

function bringUnitToFront(list) {
  if (list.length === 1 && list[0].z === zTop) return
  ;[...list].sort((a, b) => a.z - b.z).forEach((k) => { k.z = ++zTop; place(k) })
  renderGroups()
  save()
}

/* ------------------------------------------------------------------ *
 *  Grupos temporários: cartões que se grudam pelas bordas (ímã).
 *  Um grupo se move como um só; "desagrupar" ou Shift+arrastar solta.
 * ------------------------------------------------------------------ */
const frames = new Map() // gid -> moldura

const live = () => [...cards.values()].filter((k) => !k.stashed)
const unitOf = (c) => (c.g ? live().filter((k) => k.g === c.g) : [c])

function rectOf(list) {
  return {
    x0: Math.min(...list.map((k) => k.x)), y0: Math.min(...list.map((k) => k.y)),
    x1: Math.max(...list.map((k) => k.x)) + W, y1: Math.max(...list.map((k) => k.y)) + H,
  }
}

// ordem de leitura dentro de um grupo: em fileiras, da esquerda para a direita
const reading = (list) => [...list].sort((a, b) =>
  Math.abs(a.y - b.y) < H * 0.6 ? a.x - b.x : a.y - b.y)

function cleanGroups() {
  const n = new Map()
  cards.forEach((k) => { if (k.g) n.set(k.g, (n.get(k.g) || 0) + 1) })
  cards.forEach((k) => { if (k.g && n.get(k.g) < 2) k.g = null })
}

function renderGroups() {
  const by = new Map()
  live().forEach((k) => { if (k.g) { if (!by.has(k.g)) by.set(k.g, []); by.get(k.g).push(k) } })
  cards.forEach((k) => k.el.classList.toggle('in-group', !!k.g && (by.get(k.g)?.length || 0) > 1))
  for (const [gid, f] of frames) {
    if ((by.get(gid)?.length || 0) < 2) { f.remove(); frames.delete(gid) }
  }
  for (const [gid, list] of by) {
    if (list.length < 2) continue
    let f = frames.get(gid)
    if (!f) {
      f = document.createElement('div')
      f.className = 'gframe'
      f.innerHTML = `<div class="gtab"><span class="gn"></span>
        <button class="g-stash" title="Guardar o grupo na gaveta (não exclui)">${TRAY}guardar grupo</button>
        <button class="g-split" title="Soltar os cartões uns dos outros">desagrupar</button></div>`
      f.querySelector('.g-stash').onclick = () => stashUnit(live().filter((k) => k.g === gid))
      f.querySelector('.g-split').onclick = () => {
        live().forEach((k) => { if (k.g === gid) k.g = null })
        renderGroups(); save()
      }
      f.querySelector('.gn').addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return
        const m = reading(live().filter((k) => k.g === gid))
        if (m.length) startDrag(m[0], e, e.currentTarget)
      })
      board.appendChild(f)
      frames.set(gid, f)
    }
    const r = rectOf(list)
    f.style.transform = `translate(${r.x0 - 12}px, ${r.y0 - 32}px)`
    f.style.width = r.x1 - r.x0 + 24 + 'px'
    f.style.height = r.y1 - r.y0 + 44 + 'px'
    f.style.zIndex = Math.min(...list.map((k) => k.z)) * 2 - 1
    f.querySelector('.gn').textContent = list.length + ' cartões'
  }
}

/* Ímã: encosta o conjunto arrastado na borda de outro cartão, se estiver perto. */
function magnet(list, r0, dx, dy) {
  const A = { x0: r0.x0 + dx, y0: r0.y0 + dy, x1: r0.x1 + dx, y1: r0.y1 + dy }
  let best = null
  const tryIt = (d, sx, sy, o) => { if (d < SNAP && (!best || d < best.d)) best = { d, sx, sy, o } }
  for (const o of live()) {
    if (list.includes(o)) continue
    const B = { x0: o.x, y0: o.y, x1: o.x + W, y1: o.y + H }
    const vo = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0)
    const ho = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0)
    const alignY = Math.abs(A.y0 - B.y0) < SNAP ? B.y0 - A.y0 : 0
    const alignX = Math.abs(A.x0 - B.x0) < SNAP ? B.x0 - A.x0 : 0
    if (vo > 30) {
      tryIt(Math.abs(A.x0 - (B.x1 + GAP)), B.x1 + GAP - A.x0, alignY, o)
      tryIt(Math.abs(A.x1 - (B.x0 - GAP)), B.x0 - GAP - A.x1, alignY, o)
    }
    if (ho > 40) {
      tryIt(Math.abs(A.y0 - (B.y1 + GAP)), alignX, B.y1 + GAP - A.y0, o)
      tryIt(Math.abs(A.y1 - (B.y0 - GAP)), alignX, B.y0 - GAP - A.y1, o)
    }
  }
  return best
}

const WARN_RO = 'Este quadro está aberto em outra aba. Aqui só dá para ler; nada do que mudar será salvo.'
function blocked() {
  if (!readOnly) return false
  say(WARN_RO)
  return true
}

function startDrag(c, e, host) {
  if (blocked()) return
  if (e.shiftKey && c.g) { c.g = null; cleanGroups(); renderGroups() }
  bringUnitToFront(unitOf(c))
  const list = unitOf(c)
  const start = list.map((k) => [k, k.x, k.y])
  const r0 = rectOf(list)
  const minY = list.length > 1 ? 34 : -20
  const sx = e.clientX, sy = e.clientY
  let moved = false, snap = null, lit = []
  host.setPointerCapture(e.pointerId)

  const light = (o) => {
    lit.forEach((k) => k.el.classList.remove('magnet'))
    lit = o ? unitOf(o) : []
    lit.forEach((k) => k.el.classList.add('magnet'))
  }
  const move = (ev) => {
    let dx = ev.clientX - sx, dy = ev.clientY - sy
    if (!moved && Math.hypot(dx, dy) < 4) return
    if (!moved) { moved = true; list.forEach((k) => { k.dragging = true; k.el.classList.add('dragging') }) }
    dx = clamp(dx, -W + 80 - r0.x0, innerWidth - 80 - r0.x0)
    dy = clamp(dy, minY - r0.y0, innerHeight - 60 - r0.y0)
    snap = magnet(list, r0, dx, dy)
    if (snap) { dx += snap.sx; dy += snap.sy }
    start.forEach(([k, x, y]) => {
      k.x = x + dx; k.y = y + dy; place(k)
      k.el.classList.toggle('snapped', !!snap)
    })
    light(snap?.o)
    renderGroups()
  }
  const up = () => {
    host.removeEventListener('pointermove', move)
    host.removeEventListener('pointerup', up)
    host.removeEventListener('pointercancel', up)
    light(null)
    list.forEach((k) => k.el.classList.remove('dragging', 'snapped'))
    requestAnimationFrame(() => list.forEach((k) => { k.dragging = false }))
    if (moved && snap) {
      const target = unitOf(snap.o)
      const gid = target.find((k) => k.g)?.g || list.find((k) => k.g)?.g || uid()
      ;[...list, ...target].forEach((k) => { k.g = gid })
      renderGroups()
      const f = frames.get(gid)
      if (f) { f.classList.remove('join'); void f.offsetWidth; f.classList.add('join') }
    }
    if (moved) save(); else if (host === c.el) c.view.focus()
  }
  host.addEventListener('pointermove', move)
  host.addEventListener('pointerup', up)
  host.addEventListener('pointercancel', up)
}

function wire(c) {
  const { el, scroll } = c

  scroll.addEventListener('scroll', () => measure(c), { passive: true })

  // clicar no vazio do cartão leva o cursor ao fim
  scroll.addEventListener('mousedown', (e) => {
    if (e.target === scroll || e.target.classList.contains('mount')) {
      e.preventDefault()
      c.view.focus()
      c.view.dispatch(c.view.state.tr.setSelection(TextSelection.atEnd(c.view.state.doc)))
    }
  })

  // arrastar pela moldura (faixa de cima e margens), nunca pelo texto
  const ctl = '.scroll, .close, .stash, .cats'
  el.addEventListener('mousedown', (e) => {
    if (!e.target.closest(ctl)) e.preventDefault() // mantém o foco
  })
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest(ctl)) return
    startDrag(c, e, el)
  })

  el.querySelector('.cats').addEventListener('click', (e) => {
    const b = e.target.closest('button')
    if (!b || blocked()) return
    c.cat = c.cat === b.dataset.cat ? null : b.dataset.cat
    paintCat(c)
    save()
  })
  el.querySelector('.stash').addEventListener('click', () => stashUnit([c]))

  el.querySelector('.close').addEventListener('click', () =>
    removeCard(c, { undoable: !isEmpty(c.view.state) }))

  el.addEventListener('focusin', () => {
    current = c
    bringToFront(c)
    document.body.classList.add('editing')
  })
  // cartão deixado em branco some sozinho: ninguém precisa "limpar a mesa"
  el.addEventListener('focusout', () => {
    setTimeout(() => {
      if (el.contains(document.activeElement)) return
      if (current === c) { current = null; document.body.classList.remove('editing') }
      if (cards.has(c.id) && !c.stashed && !c.dragging && isEmpty(c.view.state)) removeCard(c, { undoable: false })
    }, 0)
  })
}

function removeCard(c, { undoable }) {
  if (!cards.has(c.id) || blocked()) return
  const snapshot = snapshotOf(c)
  cards.delete(c.id)
  cleanGroups()
  c.el.classList.add('leaving')
  setTimeout(() => { c.view.destroy(); c.el.remove() }, 200)
  if (current === c) { current = null; document.body.classList.remove('editing') }
  syncEmpty()
  renderGroups()
  if (undoable) {
    trash.push({ ...snapshot, deletedAt: Date.now() })
    if (trash.length > TRASH_MAX) trash.splice(0, trash.length - TRASH_MAX)
  }
  save()
  if (undoable) showUndo(snapshot)
}

/* Devolve da lixeira o cartão com este id (o mais recente, se omitido). */
function reviveFromTrash(id) {
  const i = id ? trash.findIndex((d) => d.id === id) : trash.length - 1
  if (i < 0) return null
  const [d] = trash.splice(i, 1)
  const data = { ...d }
  if (cards.has(data.id)) data.id = undefined
  const c = createCard(data, { animate: true, focus: true })
  cleanGroups(); renderGroups(); syncEmpty(); save()
  return c
}

function reopenLast() {
  if (blocked()) return
  if (!trash.length) { say('A lixeira está vazia'); return }
  reviveFromTrash()
  say(trash.length ? `Cartão devolvido · ${trash.length} ainda na lixeira` : 'Cartão devolvido')
}

let toastTimer
function showUndo(snapshot) {
  sayUndo('Cartão excluído', () => reviveFromTrash(snapshot.id))
}

/* Aviso com um botão "desfazer" (some sozinho em 6 s). */
function sayUndo(msg, fn) {
  toast.textContent = msg
  const b = document.createElement('button')
  b.textContent = 'desfazer'
  b.onclick = () => { toast.classList.remove('show'); fn() }
  toast.append(b)
  toast.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.classList.remove('show'), 6000)
}

function say(msg) {
  toast.textContent = msg
  toast.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200)
}

function syncEmpty() {
  document.body.classList.toggle('is-empty', live().length === 0)
}

/* ------------------------------------------------------------------ *
 *  Guardar: tira cartões (ou um grupo) da mesa sem excluir.
 *  Ficam na gaveta como fichinhas com as primeiras palavras.
 * ------------------------------------------------------------------ */
const plain = (c) => c.view.state.doc.textBetween(0, c.view.state.doc.content.size, ' ').replace(/\s+/g, ' ').trim()

function firstWords(c, n) {
  const w = plain(c).split(' ').filter(Boolean)
  return w.slice(0, n).join(' ') + (w.length > n ? '…' : '')
}

function stashUnit(list) {
  if (blocked()) return
  if (list.some((k) => isEmpty(k.view.state))) { say('Escreva algo antes de guardar'); return }
  const t = Date.now()
  list.forEach((k, i) => {
    k.view.dom.blur()
    k.stashed = true; k.sa = t + i
    k.el.classList.add('stashing')
    setTimeout(() => { k.el.classList.remove('stashing'); k.el.classList.add('stashed') }, 180)
  })
  if (list.includes(current)) { current = null; document.body.classList.remove('editing') }
  syncEmpty(); renderGroups(); renderDock(); save()
}

function restoreUnit(list) {
  if (blocked()) return
  list.forEach((k) => {
    k.stashed = false
    k.el.classList.remove('stashed')
    k.el.classList.add('entering')
    k.el.addEventListener('animationend', () => k.el.classList.remove('entering'), { once: true })
    measure(k)
  })
  bringUnitToFront(list)
  syncEmpty(); renderGroups(); renderDock(); save()
}

function chipOf(lead, n, extraClass = '') {
  const chip = document.createElement('div')
  chip.className = 'chip' + (n > 1 ? ' stack' : '') + (lead.cat ? ' c-' + lead.cat : '') + extraClass
  chip.innerHTML = '<span class="ccat"></span><span class="ctext"></span><span class="cn"></span>'
  chip.querySelector('.ccat').textContent = lead.cat ? CAT_LABEL[lead.cat] : ''
  chip.querySelector('.ctext').textContent = firstWords(lead, 9)
  chip.querySelector('.cn').textContent = n > 1 ? n : ''
  return chip
}

function renderDock() {
  const st = [...cards.values()].filter((k) => k.stashed).sort((a, b) => a.sa - b.sa)
  const units = []
  const seen = new Set()
  for (const k of st) {
    if (k.g) {
      if (seen.has(k.g)) continue
      seen.add(k.g)
      units.push(reading(st.filter((m) => m.g === k.g)))
    } else units.push([k])
  }
  document.body.classList.toggle('has-stash', units.length > 0)
  dock.replaceChildren()
  if (!units.length) return
  const label = document.createElement('span')
  label.className = 'dock-label'
  label.textContent = 'guardados'
  dock.append(label)
  for (const u of units) {
    const chip = chipOf(u[0], u.length)
    chip.title = 'Devolver ao quadro'
    chip.onclick = () => restoreUnit(u)
    dock.append(chip)
  }
}

/* ------------------------------------------------------------------ *
 *  Criar cartões
 * ------------------------------------------------------------------ */
function newCardAt(x, y) {
  if (blocked()) return null
  return createCard(
    { x: clamp(x, 12, innerWidth - W - 12), y: clamp(y, 12, innerHeight - H - 40) },
    { animate: true, focus: true },
  )
}

function spawnNextTo(c) {
  let x = c.x + W + 26, y = c.y
  if (x + W > innerWidth - 12) { x = c.x; y = c.y + H + 26 }
  if (y + H > innerHeight - 30) { x = c.x + 30; y = c.y + 30 }
  newCardAt(x, y)
}

function freeSpot() {
  const cx = (innerWidth - W) / 2, cy = (innerHeight - H) / 2
  for (let i = 0; i < 30; i++) {
    const x = cx + (i % 6) * 34 - 70 + rand(-6, 6), y = cy + Math.floor(i / 6) * 30 - 40 + rand(-6, 6)
    const taken = live().some((k) => Math.abs(k.x - x) < 24 && Math.abs(k.y - y) < 24)
    if (!taken) return [x, y]
  }
  return [cx, cy]
}

board.addEventListener('dblclick', (e) => {
  if (e.target === board) newCardAt(e.clientX - W / 2, e.clientY - H / 2)
})

/* ------------------------------------------------------------------ *
 *  Organizador: ordens de leitura (evolução do antigo "embaralhar").
 *  Uma ordem é uma lista de peças (um cartão ou um grupo) e NUNCA mexe
 *  na mesa, a não ser em "dispor na mesa". Peças podem ser reordenadas,
 *  postas de lado (erguidas e esmaecidas) e anotadas; ordens podem ser
 *  salvas com nome. Cartões que não estão na ordem esperam na bandeja
 *  "fora da ordem". Existe no máximo uma ordem sem nome (a "em teste").
 *
 *  Ordem: { id, name|null, note, notes: {idDoCartão: texto}, items, createdAt, updatedAt }
 *  Item:  { ids: [idDoCartão...], aside: bool }
 * ------------------------------------------------------------------ */
const show = document.getElementById('show')
const stage = document.getElementById('stage')
const strip = document.getElementById('strip')
const tray = document.getElementById('tray')
const trayChips = document.getElementById('tray-chips')
const showCount = document.getElementById('show-count')
const nameBtn = document.getElementById('org-name')
const saveBtn = document.getElementById('org-save')
const notesBtn = document.getElementById('org-notes')
const pop = document.getElementById('orders-pop')
const notePiece = document.getElementById('note-piece')
const noteOrder = document.getElementById('note-order')
const dropMark = document.getElementById('drop-mark')
let P = []   // peças visíveis da ordem aberta: [{ it, cs: [cartões] }]
let idx = 0  // peça em leitura

const str = (v) => typeof v === 'string'
const newOrder = (items, name = null) => ({
  id: uid(), name, note: '', notes: {}, items, createdAt: Date.now(), updatedAt: Date.now(),
})
const curOrder = () => org.orders.find((o) => o.id === org.cur) || null
const itemsOf = (units) => units.map((u) => ({ ids: u.map((k) => k.id), aside: false }))
const leadOf = (p) => p.cs[0]

/* Valida as ordens salvas; o que não servir é descartado sem afetar os cartões. */
function saneOrg(o) {
  const out = { orders: [], cur: null }
  if (!o || typeof o !== 'object') return out
  let unnamed = false
  for (const x of Array.isArray(o.orders) ? o.orders : []) {
    if (!x || !str(x.id) || !Array.isArray(x.items)) continue
    const seen = new Set()
    const items = []
    for (const it of x.items) {
      if (!it || !Array.isArray(it.ids)) continue
      const ids = it.ids.filter((id) => str(id) && !seen.has(id) && seen.add(id))
      if (ids.length) items.push({ ids, aside: it.aside === true })
    }
    const notes = {}
    if (x.notes && typeof x.notes === 'object') {
      for (const [k, v] of Object.entries(x.notes)) if (str(v) && v.trim()) notes[k] = v
    }
    const name = str(x.name) && x.name.trim() ? x.name.trim() : null
    if (!name) { if (unnamed) continue; unnamed = true }
    out.orders.push({
      id: x.id, name, note: str(x.note) ? x.note : '', notes, items,
      createdAt: Number.isFinite(x.createdAt) ? x.createdAt : Date.now(),
      updatedAt: Number.isFinite(x.updatedAt) ? x.updatedAt : Date.now(),
    })
  }
  if (str(o.cur) && out.orders.some((x) => x.id === o.cur)) out.cur = o.cur
  return out
}

/* Esquece cartões que não existem mais nem na mesa nem na lixeira.
 * (Os da lixeira ficam: se voltarem, voltam ao mesmo lugar da ordem.) */
function pruneOrg() {
  const known = new Set([...cards.keys(), ...trash.map((d) => d.id)])
  for (const o of org.orders) {
    o.items = o.items.map((it) => ({ ...it, ids: it.ids.filter((id) => known.has(id)) })).filter((it) => it.ids.length)
    for (const k of Object.keys(o.notes)) if (!known.has(k)) delete o.notes[k]
  }
}

const shown = (id) => { const c = cards.get(id); return c && !isEmpty(c.view.state) ? c : null }

function piecesOf(o) {
  const out = []
  for (const it of o.items) {
    const cs = it.ids.map(shown).filter(Boolean)
    if (cs.length) out.push({ it, cs })
  }
  return out
}

/* Cartões ou grupos: agrupa pelo grupo da mesa, em ordem de leitura dentro dele. */
function unitsFrom(list) {
  const out = [], seen = new Set()
  for (const k of list) {
    if (k.g) {
      if (seen.has(k.g)) continue
      seen.add(k.g)
      out.push(reading(list.filter((m) => m.g === k.g)))
    } else out.push([k])
  }
  return out
}

/* Ordem de leitura da mesa: fileiras de cima para baixo, cada uma da esquerda para a direita. */
function mesaUnits() {
  return unitsFrom(live().filter((k) => !isEmpty(k.view.state)))
    .map((u) => [u, rectOf(u)])
    .sort(([, a], [, b]) => (Math.abs(a.y0 - b.y0) < H * 0.6 ? a.x0 - b.x0 : a.y0 - b.y0))
    .map(([u]) => u)
}

function trayUnits(o) {
  const inOrder = new Set(o.items.flatMap((it) => it.ids))
  return unitsFrom(live().filter((k) => !inOrder.has(k.id) && !isEmpty(k.view.state)))
}

/* Sorteia uma ordem diferente da atual (com 2 peças, a única outra possível). */
function shuffled(list) {
  const sig = (l) => l.map((it) => it.ids[0]).join()
  const orig = sig(list)
  let a = list
  for (let t = 0; t < 12 && sig(a) === orig; t++) {
    a = [...list]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
  }
  if (sig(a) === orig) a = [...list.slice(1), list[0]]
  return a
}

/* ---------- desfazer (Ctrl+Z dentro do organizador) ---------- */
let past = [], future = []
const cloneOrg = () => JSON.parse(JSON.stringify(org))
function remember() {
  past.push(cloneOrg())
  if (past.length > 80) past.shift()
  future = []
}
function undoOrg() {
  if (!past.length) { say('Nada para desfazer'); return }
  future.push(cloneOrg())
  org = past.pop()
  save(); render()
}
function redoOrg() {
  if (!future.length) return
  past.push(cloneOrg())
  org = future.pop()
  save(); render()
}
function touch() {
  const o = curOrder()
  if (o) o.updatedAt = Date.now()
  save()
}

/* ---------- operações na ordem aberta ---------- */
function setUnnamed(items, base) {
  remember()
  org.orders = org.orders.filter((o) => o.name)
  const o = newOrder(items)
  if (base) { o.note = base.note; o.notes = { ...base.notes } }
  org.orders.unshift(o)
  org.cur = o.id
  save()
  return o
}

function movePiece(from, at) {
  if (from < 0 || from >= P.length || at < 0 || at > P.length || at === from || at === from + 1) return
  remember()
  const o = curOrder()
  const it = P[from].it
  const anchor = at < P.length ? P[at].it : null
  o.items.splice(o.items.indexOf(it), 1)
  if (anchor) o.items.splice(o.items.indexOf(anchor), 0, it)
  else o.items.push(it)
  idx = at > from ? at - 1 : at
  touch(); render()
}

function insertUnit(unit, at) {
  remember()
  const o = curOrder()
  const it = { ids: unit.map((k) => k.id), aside: false }
  const anchor = at < P.length ? P[at].it : null
  if (anchor) o.items.splice(o.items.indexOf(anchor), 0, it)
  else o.items.push(it)
  idx = Math.min(at, P.length)
  touch(); render('r')
}

function takeOut(i) {
  if (!P[i]) return
  remember()
  const o = curOrder()
  o.items.splice(o.items.indexOf(P[i].it), 1)
  if (idx > i || idx >= P.length - 1) idx = Math.max(0, idx - 1)
  touch(); render()
}

function setAside(i, v) {
  const p = P[i]
  if (!p || p.it.aside === v) return
  remember()
  p.it.aside = v
  touch(); render()
}

function splitPiece(i) {
  const p = P[i]
  if (!p || p.it.ids.length < 2) return
  remember()
  const o = curOrder()
  o.items.splice(o.items.indexOf(p.it), 1, ...p.it.ids.map((id) => ({ ids: [id], aside: p.it.aside })))
  touch(); render()
  say('Grupo separado só nesta ordem; na mesa ele continua junto')
}

function shuffleOrder() {
  const o = curOrder()
  const free = P.filter((p) => !p.it.aside).map((p) => p.it)
  if (free.length < 2) { say('Para embaralhar, preciso de pelo menos duas peças na ordem'); return }
  const mixed = shuffled(free)
  let k = 0
  const items = o.items.map((it) => (free.includes(it) ? mixed[k++] : it))
  if (o.name) {
    // uma ordem salva nunca é desfeita por um sorteio: o sorteio vira uma ordem nova, em teste
    const hadTest = org.orders.some((x) => !x.name)
    setUnnamed(JSON.parse(JSON.stringify(items)), o)
    const msg = `Embaralhei numa ordem nova, em teste; «${o.name}» continua intacta`
    if (hadTest) sayUndo(msg, undoOrg); else say(msg)
  } else {
    remember()
    o.items = items
    touch()
  }
  idx = 0
  render('r')
}

/* ---------- salvar, renomear, trocar de ordem ---------- */
const suggestName = () => 'Ordem de ' + new Date().toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function editName(o, initial, done) {
  closePop()
  const inp = document.createElement('input')
  inp.id = 'org-name-input'
  inp.value = initial
  inp.setAttribute('aria-label', 'Nome da ordem')
  nameBtn.replaceWith(inp)
  inp.focus(); inp.select()
  let finished = false
  const end = (ok) => {
    if (finished) return
    finished = true
    const v = inp.value.trim()
    inp.replaceWith(nameBtn)
    if (ok && v) {
      remember()
      o.name = v
      touch()
      done?.(v)
    }
    render()
  }
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); end(true) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(false) }
  })
  inp.addEventListener('blur', () => end(true))
}

function saveOrder() {
  const o = curOrder()
  if (!o) return
  if (!o.name) {
    editName(o, suggestName(), (v) => say(`Ordem «${v}» salva`))
    return
  }
  // ordem já salva: guarda uma cópia com outro nome (a original fica como está)
  remember()
  const copy = { ...JSON.parse(JSON.stringify(o)), id: uid(), name: o.name + ' (2)', createdAt: Date.now(), updatedAt: Date.now() }
  org.orders.push(copy)
  org.cur = copy.id
  save(); render()
  editName(copy, copy.name, (v) => say(`Ordem «${v}» salva`))
}

function openOrder(id) {
  if (org.cur === id) return
  org.cur = id
  idx = 0
  save(); render('r')
}

function deleteOrder(id) {
  const o = org.orders.find((x) => x.id === id)
  if (!o) return
  remember()
  org.orders = org.orders.filter((x) => x !== o)
  if (org.cur === id) {
    const next = org.orders[0]
    if (next) org.cur = next.id
    else { org.cur = null; const n = newOrder(itemsOf(mesaUnits())); org.orders.push(n); org.cur = n.id }
    idx = 0
  }
  save(); render()
  sayUndo(`Ordem «${o.name || 'em teste'}» excluída`, undoOrg)
}

function duplicateOrder(id) {
  const o = org.orders.find((x) => x.id === id)
  if (!o) return
  remember()
  const copy = { ...JSON.parse(JSON.stringify(o)), id: uid(), name: (o.name || 'Em teste') + ' (cópia)', createdAt: Date.now(), updatedAt: Date.now() }
  org.orders.push(copy)
  org.cur = copy.id
  idx = 0
  save(); render('r')
  say(`Abri a cópia «${copy.name}»`)
}

const when = (t) => new Date(t).toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function openPop() {
  pop.replaceChildren()
  const fresh = document.createElement('button')
  fresh.className = 'pop-act'
  fresh.textContent = 'nova ordem a partir da mesa'
  fresh.title = 'Lê a mesa de cima para baixo, da esquerda para a direita (substitui a ordem em teste)'
  fresh.onclick = () => {
    closePop()
    const units = mesaUnits()
    if (!units.length) { say('A mesa não tem cartões escritos'); return }
    const old = org.orders.find((o) => !o.name)
    setUnnamed(itemsOf(units))
    idx = 0
    render('r')
    if (old) sayUndo('Nova ordem em teste a partir da mesa', undoOrg)
  }
  pop.append(fresh)
  const list = [...org.orders].sort((a, b) => (!a.name ? -1 : !b.name ? 1 : b.updatedAt - a.updatedAt))
  for (const o of list) {
    const row = document.createElement('div')
    row.className = 'pop-row' + (o.id === org.cur ? ' on' : '') + (o.name ? '' : ' unnamed')
    const open = document.createElement('button')
    open.className = 'pop-open'
    const n = o.items.filter((it) => it.ids.some(shown)).length
    open.innerHTML = '<span class="pop-name"></span><span class="pop-meta"></span>'
    open.querySelector('.pop-name').textContent = o.name || 'em teste, sem nome'
    open.querySelector('.pop-meta').textContent = `${n} peça${n === 1 ? '' : 's'} · ${when(o.updatedAt)}`
    open.onclick = () => { closePop(); openOrder(o.id) }
    row.append(open)
    const act = (label, title, fn) => {
      const b = document.createElement('button')
      b.className = 'pop-mini'; b.textContent = label; b.title = title
      b.onclick = (e) => { e.stopPropagation(); fn() }
      row.append(b)
    }
    act('renomear', 'Dar outro nome', () => { openOrder(o.id); editName(o, o.name || suggestName()) })
    act('duplicar', 'Abrir uma cópia para testar variações', () => { closePop(); duplicateOrder(o.id) })
    act('excluir', 'Excluir esta ordem (os cartões não são afetados)', () => { closePop(); deleteOrder(o.id) })
    pop.append(row)
  }
  const r = nameBtn.getBoundingClientRect()
  pop.style.left = Math.max(12, r.left) + 'px'
  pop.style.top = r.bottom + 8 + 'px'
  pop.hidden = false
}
function closePop() { pop.hidden = true }
nameBtn.onclick = () => (pop.hidden ? openPop() : closePop())
show.addEventListener('mousedown', (e) => {
  if (!pop.hidden && !pop.contains(e.target) && e.target !== nameBtn) closePop()
})

/* ---------- dispor na mesa: a única ação que mexe na mesa ---------- */
function layOut() {
  const o = curOrder()
  const list = P.filter((p) => !p.it.aside)
  if (!o || !list.length) { say('Não há peças na ordem para dispor'); return }
  if (blocked()) return
  const before = [...cards.values()].map((k) => ({ k, x: k.x, y: k.y, z: k.z, g: k.g, stashed: k.stashed }))
  // o que não está na leitura (de lado, fora da ordem) vai para fileiras abaixo, para nada ficar por baixo
  const used = new Set(list.flatMap((p) => p.cs))
  const rest = unitsFrom(live().filter((k) => !used.has(k))).map((u) => ({ cs: u, rest: true }))
  const M = 24, TOP = 64, GX = 30, GY = 34
  const rows = []
  let row = [], x = M
  const flow = (arr) => {
    for (const p of arr) {
      const w = p.cs.length * W + (p.cs.length - 1) * GAP
      if (row.length && x + w > innerWidth - M) { rows.push(row); row = []; x = M }
      row.push([p, x]); x += w + GX
    }
    if (row.length) rows.push(row)
    row = []; x = M
  }
  flow(list)
  flow(rest)
  // enquanto a mesa não rola (Fase 7), fileiras demais se sobrepõem como fichas empilhadas
  const room = innerHeight - TOP - 24 - H
  const stepY = rows.length > 1 ? Math.max(64, Math.min(H + GY, room / (rows.length - 1))) : 0
  // cada peça de vários cartões fica (ou vira) um grupo; o resto se solta
  for (const p of list) {
    let gid = null
    if (p.cs.length > 1) {
      const g0 = p.cs[0].g
      const intact = g0 && p.cs.every((k) => k.g === g0) && [...cards.values()].every((k) => k.g !== g0 || p.cs.includes(k))
      gid = intact ? g0 : uid()
    }
    p.cs.forEach((k) => { k.g = gid })
  }
  let n = 0
  rows.forEach((r, ri) => r.forEach(([p, x0]) => p.cs.forEach((k, i) => {
    k.x = x0 + i * (W + GAP); k.y = TOP + ri * stepY; k.z = ++zTop
    if (k.stashed) { k.stashed = false; k.el.classList.remove('stashed') }
    place(k); measure(k)
    if (!p.rest) n++
  })))
  cleanGroups(); renderGroups(); renderDock(); syncEmpty(); save()
  closeOrg()
  sayUndo(`${n} cartões dispostos nesta ordem` + (rest.length ? '; os de fora ficaram embaixo' : ''), () => {
    for (const b of before) {
      if (!cards.has(b.k.id)) continue
      Object.assign(b.k, { x: b.x, y: b.y, z: b.z, g: b.g, stashed: b.stashed })
      b.k.el.classList.toggle('stashed', b.stashed)
      place(b.k)
    }
    cleanGroups(); renderGroups(); renderDock(); syncEmpty(); save()
  })
}

/* ---------- desenho ---------- */
function docNodes(c) {
  const frag = document.createDocumentFragment()
  c.view.state.doc.forEach((p) => {
    const el = document.createElement('p')
    p.forEach((t) => {
      let node = document.createTextNode(t.text)
      for (const m of t.marks) {
        const w = document.createElement(m.type.name === 'strong' ? 'strong' : 'em')
        w.append(node); node = w
      }
      el.append(node)
    })
    if (!p.childCount) el.append(document.createElement('br'))
    frag.append(el)
  })
  return frag
}

function slideOf(p, i) {
  const unit = p.cs
  const wrap = document.createElement('div')
  wrap.className = 'slide' + (unit.length > 1 ? ' multi' : '') + (p.it.aside ? ' aside' : '')
  wrap.style.setProperty('--n', Math.min(unit.length, 3))
  if (unit.length > 1 || p.it.aside) {
    const cap = document.createElement('div')
    cap.className = 'slide-cap'
    cap.textContent = [p.it.aside && 'posto de lado (não entra na leitura)', unit.length > 1 && `grupo · ${unit.length} cartões`].filter(Boolean).join(' · ')
    wrap.append(cap)
  }
  const row = document.createElement('div')
  row.className = 'slide-row'
  for (const c of unit) {
    const sc = document.createElement('div')
    sc.className = 's-card' + (c.cat ? ' c-' + c.cat : '')
    const cat = document.createElement('span')
    cat.className = 's-cat'
    cat.textContent = c.cat ? CAT_LABEL[c.cat] : ''
    const body = document.createElement('div')
    body.className = 's-body'
    body.append(docNodes(c))
    sc.append(cat, body)
    row.append(sc)
  }
  wrap.append(row)
  const acts = document.createElement('div')
  acts.className = 'slide-acts'
  const act = (label, title, fn) => {
    const b = document.createElement('button')
    b.textContent = label; b.title = title; b.onclick = fn
    acts.append(b)
  }
  if (p.it.aside) act('devolver à leitura  ↓', 'Volta a contar na ordem (↓)', () => setAside(i, false))
  else act('pôr de lado  ↑', 'Fica na fileira, esmaecido, mas fora da leitura e da exportação (↑)', () => setAside(i, true))
  if (unit.length > 1) act('separar o grupo nesta ordem', 'Cada cartão vira uma peça só nesta ordem; na mesa o grupo continua', () => splitPiece(i))
  act('tirar da ordem', 'Volta para a bandeja "fora da ordem"; o cartão não é excluído', () => takeOut(i))
  wrap.append(acts)
  return wrap
}

function renderStage(dir) {
  if (!P.length) {
    const e = document.createElement('div')
    e.className = 'stage-empty'
    e.textContent = 'Esta ordem está vazia. Arraste cartões da bandeja “fora da ordem” para a fileira, ou clique neles.'
    stage.replaceChildren(e)
    return
  }
  const s = slideOf(P[idx], idx)
  if (dir) s.classList.add('in-' + dir)
  stage.replaceChildren(s)
}

function chipFor(unit, extra = '') {
  const chip = chipOf(unit[0], unit.length, extra)
  chip.tabIndex = -1
  return chip
}

function renderStrip(o) {
  strip.replaceChildren()
  let n = 0
  P.forEach((p, i) => {
    const chip = chipFor(p.cs, (p.it.aside ? ' aside' : '') + (i === idx ? ' on' : '') + (o.notes[leadOf(p).id] ? ' has-note' : ''))
    const num = document.createElement('span')
    num.className = 'cnum'
    num.textContent = p.it.aside ? '' : ++n
    chip.append(num)
    chip.dataset.i = i
    chip.title = p.it.aside ? 'Posto de lado · clique para ler, arraste para mover' : 'Clique para ler · arraste para mover'
    chip.addEventListener('pointerdown', (e) => chipDrag(e, chip, { kind: 'strip', i }))
    strip.append(chip)
  })
  strip.children[idx]?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
}

function renderTray(o) {
  const units = trayUnits(o)
  tray.hidden = !units.length
  trayChips.replaceChildren()
  for (const u of units) {
    const chip = chipFor(u)
    chip.title = 'Clique para pôr no fim da ordem · arraste para o lugar certo'
    chip.addEventListener('pointerdown', (e) => chipDrag(e, chip, { kind: 'tray', unit: u }))
    trayChips.append(chip)
  }
}

function renderHead(o) {
  nameBtn.textContent = (o.name ? `«${o.name}»` : 'em teste, sem nome') + '  ▾'
  nameBtn.classList.toggle('unnamed', !o.name)
  const inRead = P.filter((p) => !p.it.aside)
  const cur = P[idx]
  showCount.textContent = !cur ? '' : cur.it.aside
    ? `de lado · ${inRead.length} na leitura`
    : `${inRead.indexOf(cur) + 1} de ${inRead.length}`
  saveBtn.textContent = o.name ? 'salvar como nova' : 'salvar ordem'
  saveBtn.title = o.name ? 'Guardar uma cópia com outro nome (Ctrl+S)' : 'Dar um nome e guardar esta ordem (Ctrl+S)'
  show.classList.toggle('at-start', idx <= 0)
  show.classList.toggle('at-end', idx >= P.length - 1)
}

function renderNotes(o) {
  const cur = P[idx]
  notePiece.disabled = !cur
  if (document.activeElement !== notePiece) notePiece.value = cur ? o.notes[leadOf(cur).id] || '' : ''
  if (document.activeElement !== noteOrder) noteOrder.value = o.note || ''
  notesBtn.classList.toggle('has-note', !!o.note || Object.keys(o.notes).length > 0)
}

function render(dir) {
  const o = curOrder()
  if (!o || show.hidden) return
  P = piecesOf(o)
  idx = clamp(idx, 0, Math.max(0, P.length - 1))
  renderHead(o); renderStrip(o); renderTray(o); renderStage(dir); renderNotes(o)
}

function go(i) {
  if (i < 0 || i >= P.length || i === idx) return
  const dir = i > idx ? 'r' : 'l'
  idx = i
  render(dir)
}

notePiece.addEventListener('input', () => {
  const o = curOrder(), cur = P[idx]
  if (!o || !cur) return
  const id = leadOf(cur).id
  if (notePiece.value.trim()) o.notes[id] = notePiece.value
  else delete o.notes[id]
  strip.children[idx]?.classList.toggle('has-note', !!o.notes[id])
  touch(); renderNotes(o)
})
noteOrder.addEventListener('input', () => {
  const o = curOrder()
  if (!o) return
  o.note = noteOrder.value
  touch(); renderNotes(o)
})
for (const t of [notePiece, noteOrder]) {
  t.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); t.blur() } })
}

let notesOpen = lsGet('cartoes.ui.notas') === '1'
function toggleNotes(v = !notesOpen) {
  notesOpen = v
  show.classList.toggle('notes-open', v)
  lsSet('cartoes.ui.notas', v ? '1' : '0')
  if (v) setTimeout(() => notePiece.focus(), 0)
}

/* ---------- arrastar fichinhas: fileira <-> bandeja ---------- */
function dropAt(x, y, dragged) {
  const inside = (el, pad = 0) => {
    const r = el.getBoundingClientRect()
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad
  }
  if (!tray.hidden && inside(tray, 6)) return { kind: 'tray' }
  const sr = strip.getBoundingClientRect()
  if (y < sr.top - 60 || y > sr.bottom + 20 || x < sr.left - 20 || x > sr.right + 20) return null
  const chips = [...strip.children].filter((c) => c !== dragged)
  for (const c of chips) {
    const r = c.getBoundingClientRect()
    if (x < r.left + r.width / 2) return { kind: 'strip', at: +c.dataset.i, x: r.left - 8, top: sr.top, h: sr.height }
  }
  const last = chips[chips.length - 1]?.getBoundingClientRect()
  return { kind: 'strip', at: P.length, x: last ? last.right + 6 : sr.left + 20, top: sr.top, h: sr.height }
}

function chipDrag(e, chip, src) {
  if (e.button !== 0) return
  e.preventDefault()
  const sx = e.clientX, sy = e.clientY
  let ghost = null, drop = null, ox = 0, oy = 0
  chip.setPointerCapture(e.pointerId)
  const move = (ev) => {
    if (!ghost) {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return
      const r = chip.getBoundingClientRect()
      ox = sx - r.left; oy = sy - r.top
      ghost = chip.cloneNode(true)
      ghost.classList.add('ghost')
      ghost.classList.remove('on', 'aside')
      show.append(ghost)
      chip.classList.add('lifted')
    }
    ghost.style.transform = `translate(${ev.clientX - ox}px, ${ev.clientY - oy}px) rotate(-2deg)`
    drop = dropAt(ev.clientX, ev.clientY, src.kind === 'strip' ? chip : null)
    const sr = strip.getBoundingClientRect()
    if (drop?.kind === 'strip') {
      if (ev.clientX < sr.left + 40) strip.scrollLeft -= 14
      else if (ev.clientX > sr.right - 40) strip.scrollLeft += 14
      dropMark.style.transform = `translate(${drop.x}px, ${drop.top + 8}px)`
      dropMark.style.height = drop.h - 16 + 'px'
    }
    dropMark.classList.toggle('on', drop?.kind === 'strip')
    tray.classList.toggle('drop-here', drop?.kind === 'tray' && src.kind === 'strip')
  }
  const up = () => {
    chip.removeEventListener('pointermove', move)
    chip.removeEventListener('pointerup', up)
    chip.removeEventListener('pointercancel', up)
    dropMark.classList.remove('on')
    tray.classList.remove('drop-here')
    if (!ghost) {
      // clique: na fileira lê a peça; na bandeja põe no fim da ordem
      if (src.kind === 'strip') go(src.i)
      else insertUnit(src.unit, P.length)
      return
    }
    ghost.remove()
    chip.classList.remove('lifted')
    if (!drop) return
    if (src.kind === 'strip' && drop.kind === 'strip') movePiece(src.i, drop.at)
    else if (src.kind === 'strip' && drop.kind === 'tray') takeOut(src.i)
    else if (src.kind === 'tray' && drop.kind === 'strip') insertUnit(src.unit, drop.at)
  }
  chip.addEventListener('pointermove', move)
  chip.addEventListener('pointerup', up)
  chip.addEventListener('pointercancel', up)
}

/* ---------- abrir e fechar ---------- */
function openOrg() {
  let o = curOrder()
  if (!o) {
    const units = mesaUnits()
    if (!units.length) { say('Escreva em algum cartão antes de organizar'); return }
    o = setUnnamed(itemsOf(units))
    past = [] // a ordem inicial não é algo a desfazer
  }
  if (!piecesOf(o).length && !trayUnits(o).length) { say('Escreva em algum cartão antes de organizar'); return }
  document.activeElement?.blur?.()
  idx = 0
  show.hidden = false
  show.classList.toggle('notes-open', notesOpen)
  document.body.classList.add('showing')
  render('r')
}

function closeOrg() {
  closePop()
  show.hidden = true
  document.body.classList.remove('showing')
  save()
}

document.getElementById('organize').onclick = openOrg
document.getElementById('show-close').onclick = closeOrg
document.getElementById('show-again').onclick = shuffleOrder
document.getElementById('org-layout').onclick = layOut
notesBtn.onclick = () => toggleNotes()
saveBtn.onclick = saveOrder
document.getElementById('prev').onclick = () => go(idx - 1)
document.getElementById('next').onclick = () => go(idx + 1)

function orgKey(e) {
  if (e.target.closest?.('input, textarea')) return // os campos cuidam das próprias teclas
  const k = e.key, low = k.toLowerCase()
  if (!pop.hidden) {
    if (k === 'Escape') { closePop(); e.preventDefault(); e.stopPropagation() }
    return
  }
  if (e.ctrlKey || e.metaKey) {
    if (low === 'z' && !e.shiftKey) undoOrg()
    else if ((low === 'z' && e.shiftKey) || low === 'y') redoOrg()
    else if (low === 's') saveOrder()
    else return
  } else if (e.altKey) {
    if (k === 'ArrowRight') movePiece(idx, idx + 2)
    else if (k === 'ArrowLeft') movePiece(idx, idx - 1)
    else return
  } else if (k === 'Escape') closeOrg()
  else if (k === 'ArrowRight' || k === ' ' || k === 'PageDown') go(idx + 1)
  else if (k === 'ArrowLeft' || k === 'PageUp') go(idx - 1)
  else if (k === 'Home') go(0)
  else if (k === 'End') go(P.length - 1)
  else if (k === 'ArrowUp') setAside(idx, true)
  else if (k === 'ArrowDown') setAside(idx, false)
  else if (low === 'r') shuffleOrder()
  else if (low === 'c') toggleNotes()
  else return
  e.preventDefault(); e.stopPropagation()
}

addEventListener('keydown', (e) => {
  if (!show.hidden) { orgKey(e); return }
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
    const m = e.key.toLowerCase()
    if (m === 's') { e.preventDefault(); exportJSON(); return }
    if (m === 'o') { e.preventDefault(); importJSON(); return }
    // no navegador o Ctrl+N abre outra janela; no app desktop ele cria um cartão
    if (m === 'n' && disk) { e.preventDefault(); newCardAt(...freeSpot()); return }
  }
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('.ProseMirror')) return
  const k = e.key.toLowerCase()
  if (k === 'n') { e.preventDefault(); newCardAt(...freeSpot()) }
  else if (k === 't') { e.preventDefault(); reopenLast() }
  else if (k === 'e') { e.preventDefault(); openOrg() }
}, true)

/* ------------------------------------------------------------------ *
 *  Exportar / importar (.json). Importar só acrescenta: nunca substitui.
 * ------------------------------------------------------------------ */
function exportJSON() {
  const data = {
    app: 'cartoes', version: 2, exportedAt: new Date().toISOString(),
    cards: [...cards.values()].map(snapshotOf), trash, org,
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `cartoes-${new Date().toISOString().slice(0, 10)}.json`
  document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  say(`Exportei ${cards.size} cartão(ões)`)
}

function importCards(text) {
  let d
  try { d = JSON.parse(text) } catch { say('Esse arquivo não é um JSON válido'); return 0 }
  const arr = Array.isArray(d) ? d : d?.cards
  if (!Array.isArray(arr)) { say('Não encontrei cartões nesse arquivo'); return 0 }
  const good = []
  let bad = 0
  for (const x of arr) { try { good.push(sane(x)) } catch { bad++ } }
  good.sort((a, b) => (a.z ?? 0) - (b.z ?? 0))
  const gmap = new Map(), idmap = new Map()
  for (const s of good) {
    if (s.g) { if (!gmap.has(s.g)) gmap.set(s.g, uid()); s.g = gmap.get(s.g) }
    const old = s.id
    s.id = undefined // ids novos: nunca colide com o que já está na mesa
    s.z = undefined
    const c = createCard(s)
    if (old && !idmap.has(old)) idmap.set(old, c.id)
  }
  // ordens salvas do arquivo: entram com os ids novos e "(importada)" no nome
  let nOrd = 0
  for (const o of saneOrg(Array.isArray(d) ? null : d?.org).orders) {
    if (!o.name) continue
    const items = o.items.map((it) => ({ ...it, ids: it.ids.map((id) => idmap.get(id)).filter(Boolean) })).filter((it) => it.ids.length)
    if (!items.length) continue
    const notes = {}
    for (const [k, v] of Object.entries(o.notes)) if (idmap.has(k)) notes[idmap.get(k)] = v
    org.orders.push({ ...o, id: uid(), name: o.name + ' (importada)', items, notes })
    nOrd++
  }
  cleanGroups(); renderGroups(); renderDock(); syncEmpty(); save()
  say(`${good.length} cartão(ões) importado(s)` + (nOrd ? ` · ${nOrd} ordem(ns)` : '') + (bad ? ` · ${bad} ignorado(s)` : ''))
  return good.length
}

function importJSON() {
  if (blocked()) return
  const inp = document.createElement('input')
  inp.type = 'file'; inp.accept = '.json,application/json'
  inp.onchange = async () => {
    const f = inp.files?.[0]
    if (f) importCards(await f.text())
  }
  inp.click()
}

/* Recuperação por instantâneo (sem interface por enquanto): no console,
 *   await cartoes.snapshots()   → lista
 *   await cartoes.restore(t)    → volta ao instantâneo t (o estado atual vira instantâneo antes) */
window.cartoes = {
  export: exportJSON,
  import: importCards,
  trash: () => trash.map((d) => ({ id: d.id, em: new Date(d.deletedAt).toLocaleString(), texto: (d.doc?.content || []).map((p) => (p.content || []).map((t) => t.text).join('')).join(' ').slice(0, 60) })),
  reopen: (id) => reviveFromTrash(id),
  ordens: () => JSON.parse(JSON.stringify(org)),
  snapshots: async () => (await idbSnapList()).map((s) => ({ t: s.savedAt, quando: new Date(s.savedAt).toLocaleString(), cartoes: s.cards.length })),
  restore: async (t) => {
    if (readOnly) return 'Esta aba é somente leitura'
    const snap = (await idbSnapList()).find((s) => s.savedAt === t)
    if (!snap) return 'Instantâneo não encontrado'
    const now = Date.now()
    flush()
    await idbSnap({ savedAt: now, cards: [...cards.values()].map(snapshotOf), trash, org })
    ready = false // impede que o pagehide do reload regrave o estado antigo por cima
    const rec = { savedAt: now + 1, cards: snap.cards, trash: snap.trash || [], org: saneOrg(snap.org) }
    await idbPut(rec)
    lsSet(STORE, JSON.stringify(rec.cards)); lsSet(STORE + '.t', String(rec.savedAt)); lsSet(TRASH_KEY, JSON.stringify(rec.trash))
    lsSet(ORG_KEY, JSON.stringify(rec.org))
    location.reload()
    return 'Restaurando…'
  },
}

/* ------------------------------------------------------------------ *
 *  Demonstração: abrir index.html#demo
 * ------------------------------------------------------------------ */
function rich(text) {
  const content = text.split(/(\*[^*]+\*)/).filter(Boolean).map((t) =>
    t.startsWith('*') ? { type: 'text', text: t.slice(1, -1), marks: [{ type: 'em' }] } : { type: 'text', text: t })
  return { type: 'paragraph', content }
}
const docOf = (...paras) => ({ type: 'doc', content: paras.map(rich) })

function demo() {
  const cx = innerWidth / 2, cy = innerHeight / 2
  const sample = [
    { dx: -430, dy: -250, r: -0.6, cat: 'cena', doc: docOf('Abertura: a chuva começa antes de o personagem acordar.') },
    { dx: 30, dy: -270, r: 0.5, cat: 'nota', doc: docOf('*Ideia solta.* Uma casa onde todos os relógios marcam horas diferentes — e ninguém se incomoda.') },
    {
      dx: -270, dy: -20, r: 0.35, cat: 'cena',
      doc: docOf(
        'Cena do jardim.',
        'Ela chega tarde, com o vestido amarrotado e uma folha presa no cabelo. Ninguém comenta. É isso que denuncia que todos já sabem.',
        'O pai continua cortando a rosa errada, devagar, como quem escolhe cada gesto para não ter de encarar a filha.',
        'Cortar a cena aqui? Talvez prolongar: o silêncio vale mais que o diálogo. Testar uma versão em que a empregada é a única a falar, e só sobre o tempo.',
        'Lembrar: a rosa volta no capítulo final, já seca, dentro do livro.',
      ),
    },
    { dx: 130, dy: 60, r: -0.5, cat: 'lugar', doc: docOf('Nome para a cidade: *Vellora*? Soa falso. Procurar algo mais seco.') },
    { dx: 0, dy: 0, r: 0.2, cat: 'nota', stashed: true, doc: docOf('Testar o final em primeira pessoa: quem conta já sabe de tudo desde o início.') },
  ]
  for (const s of sample) createCard({ x: cx + s.dx, y: cy + s.dy, r: s.r, cat: s.cat, stashed: s.stashed, doc: s.doc }, { animate: !s.stashed })
  renderDock()
  flush()
}

/* ------------------------------------------------------------------ *
 *  Início
 * ------------------------------------------------------------------ */
addEventListener('resize', () => cards.forEach(measure))

/* Só uma aba é dona da gravação (Web Locks). As demais abrem em modo leitura;
 * quando a dona fecha, a aba que esperava recarrega e assume. */
async function claimWriter() {
  if (DEMO_MODE || !navigator.locks) return
  try {
    await new Promise((resolve) => {
      navigator.locks.request('cartoes-writer', { ifAvailable: true }, (lock) => {
        if (lock) { resolve(); return new Promise(() => {}) } // segura até a aba fechar
        readOnly = true
        resolve()
        navigator.locks.request('cartoes-writer', () => { location.reload(); return new Promise(() => {}) })
      }).catch(() => resolve())
    })
  } catch { readOnly = false }
}

async function start() {
  await claimWriter()
  db = await idbOpen()
  if (DEMO_MODE) { ready = true; demo(); return }
  const { list, lost, diskWarn } = await load()
  let lostNow = lost
  for (const d of list) {
    try { createCard(d) } catch (err) {
      lostNow++
      console.error('cartoes: cartão não carregou', err)
      let prev = []
      try { prev = JSON.parse(lsGet(QUAR)) || [] } catch {}
      lsSet(QUAR, JSON.stringify([...(Array.isArray(prev) ? prev : []), d]))
    }
  }
  pruneOrg()
  if (cards.size) {
    cleanGroups(); renderGroups(); renderDock()
  } else if (!readOnly) newCardAt(...freeSpot()) // primeira visita: um cartão em branco, cursor piscando
  ready = true
  if (readOnly) {
    clearTimeout(toastTimer)
    toast.textContent = WARN_RO
    toast.classList.add('show')
  } else {
    if (diskWarn) {
      say(diskWarn === 'recovered'
        ? 'O arquivo do projeto estava danificado; recuperei a cópia anterior.'
        : 'O arquivo do projeto estava danificado; uma cópia foi preservada ao lado dele.')
    } else if (lostNow) {
      say(lostNow < 0
        ? 'Os dados salvos estavam ilegíveis; uma cópia foi preservada.'
        : `${lostNow} cartão(ões) não puderam ser abertos; ficaram preservados em quarentena.`)
    }
    // migra para o IndexedDB o que só existia no localStorage e pede armazenamento durável
    if (cards.size) flush()
    try { navigator.storage?.persist?.() } catch {}
  }
}
start()
