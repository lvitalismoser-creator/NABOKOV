'use strict'
const { contextBridge, ipcRenderer } = require('electron')

// única ponte entre a página e o disco; a página não enxerga Node
contextBridge.exposeInMainWorld('cartoesDisk', {
  load: () => ipcRenderer.invoke('disk:load'),
  save: (rec) => ipcRenderer.invoke('disk:save', rec),
  saveSync: (rec) => ipcRenderer.sendSync('disk:saveSync', rec), // para o fechamento da janela
  snapshot: (rec) => ipcRenderer.invoke('disk:snapshot', rec),
})
