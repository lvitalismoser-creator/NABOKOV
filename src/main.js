import { EditorState, TextSelection } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { Schema } from 'prosemirror-model'
import { keymap } from 'prosemirror-keymap'
import { history, undo, redo } from 'prosemirror-history'
import { baseKeymap, toggleMark } from 'prosemirror-commands'
import { inputRules, InputRule } from 'prosemirror-inputrules'

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
const STORE = 'cartoes.v1'
const board = document.getElementById('board')
const toast = document.getElementById('toast')
const cards = new Map()
let zTop = 1
let current = null // cartão com foco

const isEmpty = (state) => state.doc.textContent.trim() === ''
const rand = (a, b) => a + Math.random() * (b - a)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

function emptyDoc() {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

/* ------------------------------------------------------------------ *
 *  Persistência
 * ------------------------------------------------------------------ */
let saveTimer
function save() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(flush, 250)
}
function flush() {
  try {
    const data = [...cards.values()].map((c) => ({
      id: c.id, x: c.x, y: c.y, z: c.z, r: c.r, doc: c.view.state.doc.toJSON(),
    }))
    localStorage.setItem(STORE, JSON.stringify(data))
  } catch {}
}
addEventListener('beforeunload', flush)

function load() {
  try { return JSON.parse(localStorage.getItem(STORE)) || [] } catch { return [] }
}

/* ------------------------------------------------------------------ *
 *  Cartão
 * ------------------------------------------------------------------ */
function createCard(data = {}, { focus = false, animate = false } = {}) {
  const c = {
    id: data.id || Math.random().toString(36).slice(2, 9),
    x: data.x ?? 100, y: data.y ?? 100,
    z: data.z ?? ++zTop,
    r: data.r ?? +rand(-0.45, 0.45).toFixed(2),
    dragging: false,
  }
  zTop = Math.max(zTop, c.z)

  const el = document.createElement('div')
  el.className = 'card' + (animate ? ' entering' : '')
  el.innerHTML = `
    <div class="tilt">
      <i class="under u3"></i><i class="under u2"></i><i class="under u1"></i>
      <div class="paper">
        <span class="grip"></span>
        <button class="close" tabindex="-1" aria-label="Remover cartão">×</button>
        <div class="scroll"><div class="mount"></div></div>
      </div>
    </div>`
  c.el = el
  c.scroll = el.querySelector('.scroll')
  el.style.setProperty('--r', c.r + 'deg')
  place(c)
  el.style.zIndex = c.z

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
        Backspace: (s) => {
          if (isEmpty(s) && s.doc.childCount === 1) { removeCard(c, { undoable: false }); return true }
          return false
        },
      }),
      keymap(baseKeymap),
    ],
  })

  c.view = new EditorView(el.querySelector('.mount'), {
    state,
    attributes: { spellcheck: 'false' },
    scrollMargin: { top: 4, bottom: 40, left: 0, right: 0 },
    scrollThreshold: { top: 4, bottom: 40, left: 0, right: 0 },
    dispatchTransaction(tr) {
      c.view.updateState(c.view.state.apply(tr))
      if (tr.docChanged) { save(); measure(c) }
    },
  })

  wire(c)
  cards.set(c.id, c)
  board.appendChild(el)
  measure(c)
  syncEmpty()
  if (animate) el.addEventListener('animationend', () => el.classList.remove('entering'), { once: true })
  if (focus) c.view.focus()
  return c
}

function place(c) {
  c.el.style.transform = `translate(${c.x}px, ${c.y}px)`
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
  if (c.z === zTop) return
  c.z = ++zTop
  c.el.style.zIndex = c.z
  save()
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
  el.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.scroll') && !e.target.closest('.close')) e.preventDefault() // mantém o foco
  })
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('.scroll') || e.target.closest('.close')) return
    bringToFront(c)
    const sx = e.clientX, sy = e.clientY, ox = c.x, oy = c.y
    let moved = false
    el.setPointerCapture(e.pointerId)
    const move = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy
      if (!moved && Math.hypot(dx, dy) < 4) return
      if (!moved) { moved = true; c.dragging = true; el.classList.add('dragging') }
      c.x = clamp(ox + dx, -W + 80, innerWidth - 80)
      c.y = clamp(oy + dy, -20, innerHeight - 60)
      place(c)
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.classList.remove('dragging')
      requestAnimationFrame(() => { c.dragging = false })
      if (moved) save(); else c.view.focus()
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  })

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
      if (cards.has(c.id) && !c.dragging && isEmpty(c.view.state)) removeCard(c, { undoable: false })
    }, 0)
  })
}

function removeCard(c, { undoable }) {
  if (!cards.has(c.id)) return
  const snapshot = { id: c.id, x: c.x, y: c.y, z: c.z, r: c.r, doc: c.view.state.doc.toJSON() }
  cards.delete(c.id)
  c.el.classList.add('leaving')
  setTimeout(() => { c.view.destroy(); c.el.remove() }, 200)
  if (current === c) { current = null; document.body.classList.remove('editing') }
  syncEmpty()
  save()
  if (undoable) showUndo(snapshot)
}

let toastTimer
function showUndo(snapshot) {
  toast.innerHTML = 'Cartão removido<button>desfazer</button>'
  toast.classList.add('show')
  toast.querySelector('button').onclick = () => {
    createCard(snapshot, { animate: true, focus: true })
    toast.classList.remove('show')
    save()
  }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.classList.remove('show'), 6000)
}

function syncEmpty() {
  document.body.classList.toggle('is-empty', cards.size === 0)
}

/* ------------------------------------------------------------------ *
 *  Criar cartões
 * ------------------------------------------------------------------ */
function newCardAt(x, y) {
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
    const taken = [...cards.values()].some((k) => Math.abs(k.x - x) < 24 && Math.abs(k.y - y) < 24)
    if (!taken) return [x, y]
  }
  return [cx, cy]
}

board.addEventListener('dblclick', (e) => {
  if (e.target === board) newCardAt(e.clientX - W / 2, e.clientY - H / 2)
})
addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey &&
      !e.target.closest?.('.ProseMirror')) {
    e.preventDefault()
    newCardAt(...freeSpot())
  }
})

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
    { dx: -430, dy: -250, r: -0.6, doc: docOf('Abertura: a chuva começa antes de o personagem acordar.') },
    { dx: 30, dy: -270, r: 0.5, doc: docOf('*Ideia solta.* Uma casa onde todos os relógios marcam horas diferentes — e ninguém se incomoda.') },
    {
      dx: -270, dy: -20, r: 0.35,
      doc: docOf(
        'Cena do jardim.',
        'Ela chega tarde, com o vestido amarrotado e uma folha presa no cabelo. Ninguém comenta. É isso que denuncia que todos já sabem.',
        'O pai continua cortando a rosa errada, devagar, como quem escolhe cada gesto para não ter de encarar a filha.',
        'Cortar a cena aqui? Talvez prolongar: o silêncio vale mais que o diálogo. Testar uma versão em que a empregada é a única a falar, e só sobre o tempo.',
        'Lembrar: a rosa volta no capítulo final, já seca, dentro do livro.',
      ),
    },
    { dx: 130, dy: 60, r: -0.5, doc: docOf('Nome para a cidade: *Vellora*? Soa falso. Procurar algo mais seco.') },
  ]
  for (const s of sample) createCard({ x: cx + s.dx, y: cy + s.dy, r: s.r, doc: s.doc }, { animate: true })
  flush()
}

/* ------------------------------------------------------------------ *
 *  Início
 * ------------------------------------------------------------------ */
addEventListener('resize', () => cards.forEach(measure))

if (location.hash === '#demo') {
  demo()
} else {
  const saved = load()
  if (saved.length) saved.forEach((d) => createCard(d))
  else newCardAt(...freeSpot()) // primeira visita: um cartão em branco, cursor piscando
}
