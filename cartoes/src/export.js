/* Exportação para documento legível (TXT, MD e HTML para o PDF).
 * Funções puras: recebem a leitura já montada e devolvem texto.
 *
 * Entrada:  { name, note, pieces: [{ note, cards: [{ cat, paras: [[{ text, strong, em }]] }] }] }
 * Modelos:  'corrido' (só o texto), 'secao' (um título por cartão),
 *           'ficha' (título, categoria, texto e as notas da ordem). */

export const MODELS = ['corrido', 'secao', 'ficha']
export const FORMATS = ['pdf', 'txt', 'md']

const CAT = { cena: 'Cena', nota: 'Nota', lugar: 'Lugar' }
const plain = (runs) => runs.map((r) => r.text).join('')
const blank = (runs) => plain(runs).trim() === ''

/* Lista de blocos comum aos três formatos: { type: 'title'|'h'|'p'|'note', runs } */
export function blocksOf(data, model) {
  const out = []
  const text = (type, t) => out.push({ type, runs: [{ text: t }] })
  if (model !== 'corrido' && data.name) text('title', data.name)
  if (model === 'ficha' && data.note?.trim()) text('note', 'Sobre esta ordem: ' + data.note.trim())
  let n = 0
  for (const piece of data.pieces) {
    for (const card of piece.cards) {
      n++
      if (model !== 'corrido') {
        const cat = card.cat && CAT[card.cat]
        text('h', model === 'ficha' ? `Ficha ${n}` + (cat ? ` · ${cat}` : '') : String(n) + (cat ? ` · ${cat}` : ''))
      }
      for (const runs of card.paras) if (!blank(runs)) out.push({ type: 'p', runs })
    }
    if (model === 'ficha' && piece.note?.trim()) text('note', 'Nota: ' + piece.note.trim())
  }
  return out
}

/* Marca negrito/itálico com os mesmos sinais que o app aceita na digitação.
 * Os espaços das pontas ficam fora dos sinais (senão o markdown não vale). */
function marked(runs, esc) {
  return runs.map((r) => {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(r.text)
    const body = esc(m[2])
    if (!body) return r.text
    const sign = r.strong && r.em ? '***' : r.strong ? '**' : r.em ? '*' : ''
    return m[1] + sign + body + sign + m[3]
  }).join('')
}

export function toTxt(data, model) {
  const lines = []
  for (const b of blocksOf(data, model)) {
    const t = marked(b.runs, (s) => s)
    if (b.type === 'title') lines.push(t, '='.repeat(Math.min(60, t.length)), '')
    else if (b.type === 'h') lines.push('', t, '-'.repeat(Math.min(60, t.length)), '')
    else if (b.type === 'note') lines.push('[' + t + ']', '')
    else lines.push(t, '')
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

const mdEsc = (s) => s.replace(/([\\`*_])/g, '\\$1')
// no começo da linha, estes sinais virariam título, citação ou lista
const mdLine = (s) => s.replace(/^(\s*)([#>+-]|\d+[.)])(\s)/, '$1\\$2$3')

export function toMd(data, model) {
  const out = []
  for (const b of blocksOf(data, model)) {
    const t = mdLine(marked(b.runs, mdEsc))
    if (b.type === 'title') out.push('# ' + t)
    else if (b.type === 'h') out.push('## ' + t)
    else if (b.type === 'note') out.push('> ' + t)
    else out.push(t)
  }
  return out.join('\n\n') + '\n'
}

const htmlEsc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const htmlRuns = (runs) => runs.map((r) => {
  let t = htmlEsc(r.text)
  if (r.em) t = `<em>${t}</em>`
  if (r.strong) t = `<strong>${t}</strong>`
  return t
}).join('')

/* Só o miolo (usado também na pré-visualização). `max` corta depois de N blocos. */
export function toHtmlBody(data, model, max = Infinity) {
  const tag = { title: 'h1', h: 'h2', p: 'p', note: 'p' }
  return blocksOf(data, model).slice(0, max)
    .map((b) => `<${tag[b.type]}${b.type === 'note' ? ' class="note"' : ''}>${htmlRuns(b.runs)}</${tag[b.type]}>`).join('\n')
}

export const PRINT_CSS = `
  body { font: 12pt/1.6 "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif; color: #111; margin: 0; }
  h1 { font-size: 20pt; font-weight: 600; margin: 0 0 18pt; }
  h2 { font-size: 12pt; font-weight: 600; font-style: italic; margin: 22pt 0 6pt; break-after: avoid; }
  p { margin: 0 0 10pt; orphans: 2; widows: 2; }
  p.note { font-size: 10.5pt; font-style: italic; color: #444; margin-left: 18pt; }
`

export function toHtml(data, model) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${htmlEsc(data.name || 'Cartões')}</title>
<style>${PRINT_CSS}</style></head><body>
${toHtmlBody(data, model)}
</body></html>`
}

/* Nome de arquivo seguro no Windows. */
export function fileName(name, ext, date = new Date()) {
  const base = (name || 'cartoes').normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').slice(0, 60) || 'cartoes'
  const d = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return `${base} ${d}.${ext}`
}
