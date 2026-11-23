// TerraMind Studio — Electron main process (desktop edition)
'use strict';
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const path = require('path'), fs = require('fs'), { spawn } = require('child_process');

let win = null, pendingOpen = process.argv.find(a => a.toLowerCase().endsWith('.tmd')) || null;

function createWindow() {
  win = new BrowserWindow({
    width: 1600, height: 960, minWidth: 1100, minHeight: 700, backgroundColor: '#0B0F19', show: false,
    title: 'TerraMind Studio', icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  win.loadFile(path.join(__dirname, '..', 'index.html'));
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.on('close', e => { if (win.__forceClose) return; e.preventDefault(); win.webContents.send('tm:menu', 'requestClose'); });
  buildMenu();
}

const send = cmd => () => win && win.webContents.send('tm:menu', cmd);
function buildMenu() {
  const t = [
    { label: '&File', submenu: [
      { label: 'New project', accelerator: 'CmdOrCtrl+N', click: send('newP') },
      { label: 'Open project…', accelerator: 'CmdOrCtrl+O', click: send('openP') },
      { label: 'Save project', accelerator: 'CmdOrCtrl+S', click: send('saveP') },
      { label: 'Save project as…', accelerator: 'CmdOrCtrl+Shift+S', click: send('saveAs') },
      { type: 'separator' },
      { label: 'Import drillholes…', click: send('importDH') },
      { label: 'Import surfaces / strings / solids…', click: send('importSurf') },
      { type: 'separator' },
      { label: 'Demo project', click: send('demo') },
      { type: 'separator' }, { role: 'quit' }] },
    { label: '&Edit', submenu: [
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: send('undo') },
      { label: 'Redo', accelerator: 'CmdOrCtrl+Y', click: send('redo') },
      { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: '&View', submenu: [
      { label: 'Plan view', accelerator: 'F5', click: send('viewTop') },
      { label: '3D view', accelerator: 'F6', click: send('viewIso') },
      { label: 'Section / plot window', accelerator: 'F7', click: send('plot') },
      { type: 'separator' }, { role: 'togglefullscreen' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
      { type: 'separator' }, { role: 'toggleDevTools' }] },
    { label: '&Help', submenu: [
      { label: 'User guide', click: () => shell.openPath(path.join(__dirname, '..', 'README.md')) },
      { label: 'About TerraMind Studio', click: () => dialog.showMessageBox(win, { type: 'info', title: 'TerraMind Studio', message: `TerraMind Studio ${app.getVersion()}`, detail: 'Mining geology, resource estimation and mine design.' }) }] }
  ];
  // The in-app menu bar (js/88-menu.js) replaces the native one; keep a hidden native menu only for macOS edit shortcuts.
  Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate(t) : null);
}

// ---- native file I/O (exposed through preload) ----
ipcMain.handle('tm:save', async (e, { name, data, filters, path: known }) => {
  let p = known;
  if (!p) { const r = await dialog.showSaveDialog(win, { defaultPath: name, filters: filters || [{ name: 'All files', extensions: ['*'] }] }); if (r.canceled) return null; p = r.filePath; }
  fs.writeFileSync(p, Buffer.from(data)); return p;
});
ipcMain.handle('tm:open', async (e, { filters, multiple }) => {
  const r = await dialog.showOpenDialog(win, { filters: filters || [{ name: 'All files', extensions: ['*'] }], properties: multiple ? ['openFile', 'multiSelections'] : ['openFile'] });
  if (r.canceled) return [];
  return r.filePaths.map(p => ({ path: p, name: path.basename(p), data: fs.readFileSync(p) }));
});
ipcMain.handle('tm:openPath', (e, p) => { if (!p || !/\.(tmd|json)$/i.test(p) || !fs.existsSync(p)) return null; return { path: p, name: path.basename(p), data: fs.readFileSync(p) }; });
ipcMain.handle('tm:pendingOpen', () => { if (!pendingOpen || !fs.existsSync(pendingOpen)) return null; const p = pendingOpen; pendingOpen = null; return { path: p, name: path.basename(p), data: fs.readFileSync(p) }; });
ipcMain.on('tm:title', (e, t) => win && win.setTitle(t));
ipcMain.on('tm:confirmClose', () => { if (win) { win.__forceClose = true; win.close(); } });

// ---- Blender: write the exported package and render the investor video in the background ----
function findBlender() {
  const c = []; for (const pf of [process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(Boolean)) { const d = path.join(pf, 'Blender Foundation'); if (fs.existsSync(d)) for (const v of fs.readdirSync(d).sort().reverse()) c.push(path.join(d, v, 'blender.exe')); c.push(path.join(pf, 'Steam', 'steamapps', 'common', 'Blender', 'blender.exe')); }
  c.push('/Applications/Blender.app/Contents/MacOS/Blender', '/usr/bin/blender', '/usr/local/bin/blender', '/snap/bin/blender');
  return c.find(p => { try { return fs.existsSync(p); } catch (e) { return false; } }) || null;
}
ipcMain.handle('tm:blenderRender', async (e, { name, files, args }) => {
  const exe = findBlender(); if (!exe) throw new Error('Blender 4.2 or newer was not found. Install it from blender.org, or use "Export Blender package" and run render_windows.bat.');
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'), folder = path.join(app.getPath('documents'), 'TerraMind Videos', `${String(name || 'project').replace(/[\\/:*?"<>|]+/g, '_')}_${stamp}`);
  for (const f of files) { const p = path.resolve(folder, f.name); if (!p.startsWith(path.resolve(folder) + path.sep)) continue; fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, Buffer.from(f.data)); }
  return await new Promise((resolve, reject) => {
    const ch = spawn(exe, ['-b', '-P', path.join(folder, 'build_scene.py'), '--', ...(args || ['--render'])], { cwd: folder, windowsHide: true });
    const relay = d => String(d).split(/\r?\n/).forEach(l => { if (l && win) win.webContents.send('tm:blender', l); });
    ch.stdout.on('data', relay); ch.stderr.on('data', relay);
    ch.on('error', reject); ch.on('close', code => { if (code === 0) { shell.openPath(path.join(folder, 'output')); resolve({ folder }); } else reject(new Error(`Blender stopped (code ${code}). The package is in ${folder}.`)); });
  });
});

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (e, argv) => { const f = argv.find(a => a.toLowerCase().endsWith('.tmd')); if (win) { if (win.isMinimized()) win.restore(); win.focus(); if (f) { pendingOpen = f; win.webContents.send('tm:menu', 'pendingOpen'); } } });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
