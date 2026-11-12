'use strict'
/* Processo principal: dono do disco.
 * Projeto em <userData>/cartoes/projeto.json, gravado de forma atômica
 * (arquivo temporário + fsync + rename, com retentativa no Windows),
 * com projeto.json.bak e instantâneos rotativos em snapshots/. */
const { app, BrowserWindow, ipcMain, Menu } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

// CARTOES_DATA_DIR (testes) isola também o perfil do Chromium: localStorage, IndexedDB e a trava de instância
if (process.env.CARTOES_DATA_DIR) app.setPath('userData', path.join(process.env.CARTOES_DATA_DIR, 'profile'))
const DIR = process.env.CARTOES_DATA_DIR || path.join(app.getPath('userData'), 'cartoes')
const FILE = path.join(DIR, 'projeto.json')
const BAK = FILE + '.bak'
const SNAPS = path.join(DIR, 'snapshots')

const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

function writeAtomic(file, text) {
  const tmp = file + '.tmp'
  const fd = fs.openSync(tmp, 'w')
  try { fs.writeSync(fd, text); fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
  let last
  for (let i = 0; i < 6; i++) {
    try { fs.renameSync(tmp, file); return } catch (e) {
      last = e
      // antivírus ou indexador podem segurar o arquivo por instantes (Windows)
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) break
      sleepSync(40 * (i + 1))
    }
  }
  try { fs.writeFileSync(file, text); fs.rmSync(tmp, { force: true }) } catch { throw last }
}

const valid = (r) => r && typeof r === 'object' && Array.isArray(r.cards) && Number.isFinite(r.savedAt)

/* null = não existe; undefined = existe mas está ilegível; objeto = ok */
function readRec(file) {
  let text
  try { text = fs.readFileSync(file, 'utf8') } catch (e) { return e.code === 'ENOENT' ? null : undefined }
  try { const r = JSON.parse(text); return valid(r) ? r : undefined } catch { return undefined }
}

function snapFiles() {
  try {
    return fs.readdirSync(SNAPS).filter((n) => /^\d+\.json$/.test(n)).map((n) => parseInt(n, 10)).sort((a, b) => b - a)
  } catch { return [] }
}

function latestSnapshot() {
  for (const t of snapFiles()) { const r = readRec(path.join(SNAPS, t + '.json')); if (r) return r }
  return null
}

function loadProject() {
  let r = readRec(FILE)
  if (r === undefined) {
    // nunca sobrescrever um arquivo ilegível: guarda de lado e tenta as cópias
    try { fs.renameSync(FILE, path.join(DIR, `projeto.corrompido-${Date.now()}.json`)) } catch {}
    r = readRec(BAK) || latestSnapshot()
    return { rec: r || null, warn: r ? 'recovered' : 'lost' }
  }
  return { rec: r, warn: null }
}

function saveProject(rec) {
  if (!valid(rec)) return false
  fs.mkdirSync(DIR, { recursive: true })
  const text = JSON.stringify(rec)
  // .bak = estado anterior legível, renovado no máximo a cada 30 s
  try {
    const stale = !fs.existsSync(BAK) || Date.now() - fs.statSync(BAK).mtimeMs > 30e3
    if (stale && readRec(FILE)) fs.copyFileSync(FILE, BAK)
  } catch {}
  writeAtomic(FILE, text)
  return true
}

function saveSnapshot(rec) {
  if (!valid(rec)) return false
  fs.mkdirSync(SNAPS, { recursive: true })
  writeAtomic(path.join(SNAPS, rec.savedAt + '.json'), JSON.stringify(rec))
  // 20 mais recentes + o mais novo de cada um dos últimos 7 dias
  const keys = snapFiles()
  const keep = new Set(keys.slice(0, 20))
  const days = new Set(), cutoff = Date.now() - 7 * 864e5
  for (const k of keys) {
    if (k < cutoff) break
    const d = new Date(k).toDateString()
    if (!days.has(d)) { days.add(d); keep.add(k) }
  }
  for (const k of keys) if (!keep.has(k)) fs.rmSync(path.join(SNAPS, k + '.json'), { force: true })
  return true
}

const safe = (fn) => (...a) => { try { return fn(...a) } catch (e) { console.error('cartoes:', e); return false } }
const fromApp = (e) => (e.senderFrame?.url || '').startsWith('file://')

ipcMain.handle('disk:load', (e) => (fromApp(e) ? safe(loadProject)() : { rec: null, warn: null }))
ipcMain.handle('disk:save', (e, rec) => fromApp(e) && safe(saveProject)(rec))
ipcMain.on('disk:saveSync', (e, rec) => { e.returnValue = fromApp(e) && safe(saveProject)(rec) })
ipcMain.handle('disk:snapshot', (e, rec) => fromApp(e) && safe(saveSnapshot)(rec))
// instantâneos em disco, para o item "Instantâneos" do menu
const listSnapshots = () => snapFiles().map((t) => ({ t, n: readRec(path.join(SNAPS, t + '.json'))?.cards.length ?? -1 })).filter((s) => s.n >= 0)
ipcMain.handle('disk:snapshots', (e) => (fromApp(e) ? safe(listSnapshots)() || [] : []))
ipcMain.handle('disk:snapshotGet', (e, t) => (fromApp(e) && Number.isSafeInteger(t) ? safe(() => readRec(path.join(SNAPS, t + '.json')) || null)() || null : null))

let win
function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 800, backgroundColor: '#ece6d8', autoHideMenuBar: true, title: 'Cartões',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false,
    },
  })
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  // a página nunca navega para outro lugar; recarregar o próprio arquivo pode (restaurar instantâneo)
  win.webContents.on('will-navigate', (e, url) => { if (url.split('#')[0] !== win.webContents.getURL().split('#')[0]) e.preventDefault() })
  win.loadFile(path.join(__dirname, '..', 'index.html'))
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus() } })
  app.whenReady().then(() => {
    Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'editMenu' }, { role: 'viewMenu' }]))
    createWindow()
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow() })
  })
  app.on('window-all-closed', () => app.quit())
}
