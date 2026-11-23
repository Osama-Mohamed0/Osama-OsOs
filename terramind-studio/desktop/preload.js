// Bridge between the sandboxed renderer and native file dialogs
'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tmNative', {
  isDesktop: true,
  save: (name, data, filters, path) => ipcRenderer.invoke('tm:save', { name, data, filters, path }),
  open: (filters, multiple) => ipcRenderer.invoke('tm:open', { filters, multiple }),
  pendingOpen: () => ipcRenderer.invoke('tm:pendingOpen'),
  openPath: p => ipcRenderer.invoke('tm:openPath', p),
  blenderRender: payload => ipcRenderer.invoke('tm:blenderRender', payload),
  onBlender: fn => { const h = (e, line) => fn(line); ipcRenderer.on('tm:blender', h); return () => ipcRenderer.removeListener('tm:blender', h); },
  setTitle: t => ipcRenderer.send('tm:title', t),
  confirmClose: () => ipcRenderer.send('tm:confirmClose'),
  onMenu: fn => ipcRenderer.on('tm:menu', (e, cmd) => fn(cmd))
});
