// Bridge between the sandboxed renderer and native file dialogs
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tmNative', {
  isDesktop: true,
  save: (name, data, filters, path) => ipcRenderer.invoke('tm:save', { name, data, filters, path }),
  open: (filters, multiple) => ipcRenderer.invoke('tm:open', { filters, multiple }),
  pendingOpen: () => ipcRenderer.invoke('tm:pendingOpen'),
  setTitle: t => ipcRenderer.send('tm:title', t),
  confirmClose: () => ipcRenderer.send('tm:confirmClose'),
  onMenu: fn => ipcRenderer.on('tm:menu', (e, cmd) => fn(cmd))
});
