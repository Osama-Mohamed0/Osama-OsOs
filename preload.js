'use strict';
// جسر آمن بين الواجهة والعملية الرئيسية
const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('api', {
  load: () => ipcRenderer.invoke('data:load'),
  save: (json) => ipcRenderer.invoke('data:save', json),
  saveSync: (json) => ipcRenderer.sendSync('data:saveSync', json),
  exportData: (json) => ipcRenderer.invoke('data:export', json),
  importData: () => ipcRenderer.invoke('data:import'),
  openDataFolder: () => ipcRenderer.invoke('data:openFolder'),
  info: () => ipcRenderer.invoke('app:info'),
  applySettings: (settings) => ipcRenderer.invoke('app:settings', settings),
  notify: (title, body) => ipcRenderer.send('notify', { title, body }),
  progress: (value, tooltip) => ipcRenderer.send('app:progress', { value, tooltip }),
  attention: () => ipcRenderer.send('app:attention'),
  setZoom: (factor) => webFrame.setZoomFactor(factor),
});
