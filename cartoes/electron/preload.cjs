'use strict'
const { contextBridge, ipcRenderer } = require('electron')

// única ponte entre a página e o disco; a página não enxerga Node
contextBridge.exposeInMainWorld('cartoesDisk', {
  load: () => ipcRenderer.invoke('disk:load'),
  save: (rec) => ipcRenderer.invoke('disk:save', rec),
  saveSync: (rec) => ipcRenderer.sendSync('disk:saveSync', rec), // para o fechamento da janela
  snapshot: (rec) => ipcRenderer.invoke('disk:snapshot', rec),
  snapshots: () => ipcRenderer.invoke('disk:snapshots'),
  snapshotGet: (t) => ipcRenderer.invoke('disk:snapshotGet', t),
  // exportar documento: o destino é escolhido no diálogo de salvar do sistema
  exportFile: (d) => ipcRenderer.invoke('export:file', d),
  exportPdf: (d) => ipcRenderer.invoke('export:pdf', d),
  exportReveal: () => ipcRenderer.invoke('export:reveal'),
})
