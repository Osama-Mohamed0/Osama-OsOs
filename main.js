'use strict';
// إنجاز — العملية الرئيسية (Electron main process)
const { app, BrowserWindow, ipcMain, dialog, Notification, Tray, Menu, shell, nativeTheme, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { createSyncServer } = require('./sync-server');

const APP_ID = 'com.osama.injaz';
const APP_NAME = 'إنجاز';
const ASSETS = path.join(__dirname, 'src', 'assets');
const WIN_ICON = path.join(ASSETS, process.platform === 'win32' ? 'icon.ico' : 'icon.png');
const PNG_ICON = path.join(ASSETS, 'icon.png');
const TRAY_ICON = path.join(ASSETS, process.platform === 'win32' ? 'icon.ico' : 'tray.png');

let win = null;
let tray = null;
let quitting = false;
const prefs = { closeToTray: false };
const liveNotifications = new Set(); // يمنع جمع الإشعارات قبل النقر عليها
let sync = null;
const pendingMerges = new Map();
let mergeSeq = 0;

// ---------- التخزين ----------
const dataDir = () => app.getPath('userData');
const dataFile = () => path.join(dataDir(), 'injaz-data.json');
const backupDir = () => path.join(dataDir(), 'backups');
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function latestBackup() {
  try {
    const files = fs.readdirSync(backupDir()).filter((f) => f.endsWith('.json')).sort().reverse();
    for (const f of files) {
      const data = readJson(path.join(backupDir(), f));
      if (data) return { data, file: f };
    }
  } catch {
    /* لا توجد نسخ احتياطية */
  }
  return null;
}

function loadData() {
  const file = dataFile();
  if (!fs.existsSync(file)) return { data: null };
  const data = readJson(file);
  if (data) return { data };
  // الملف تالف: نحتفظ بنسخة منه ونرجع لآخر نسخة سليمة (الحفظ السابق ثم النسخ اليومية)
  try {
    fs.copyFileSync(file, `${file}.corrupt-${Date.now()}`);
  } catch {
    /* تجاهل */
  }
  const previous = readJson(`${file}.bak`);
  if (previous) return { data: previous, recoveredFrom: 'injaz-data.json.bak' };
  const backup = latestBackup();
  return backup ? { data: backup.data, recoveredFrom: backup.file } : { data: null, corrupt: true };
}

// نسخة احتياطية تلقائية مرة يومياً (نحتفظ بآخر 14 يوماً)
function dailyBackup() {
  const file = dataFile();
  if (!fs.existsSync(file)) return;
  const dir = backupDir();
  const target = path.join(dir, `injaz-${dayKey()}.json`);
  if (fs.existsSync(target)) return;
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(file, target);
  const files = fs.readdirSync(dir).filter((f) => /^injaz-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - 14))) fs.unlinkSync(path.join(dir, f));
}

function writeData(json) {
  if (typeof json !== 'string') return false;
  JSON.parse(json); // يرمي خطأ إن لم يكن JSON صالحاً، فلا نكتب بيانات تالفة
  fs.mkdirSync(dataDir(), { recursive: true });
  try {
    dailyBackup();
  } catch (err) {
    console.error('backup failed', err);
  }
  const file = dataFile();
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, json, 'utf8');
  if (readJson(file)) fs.copyFileSync(file, `${file}.bak`); // نسخة الحفظ السابق
  try {
    fs.renameSync(tmp, file);
  } catch {
    fs.writeFileSync(file, json, 'utf8');
    fs.rmSync(tmp, { force: true });
  }
  return true;
}

// ---------- التشغيل مع ويندوز ----------
function loginItemOptions() {
  const exe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  const args = app.isPackaged ? ['--hidden'] : [app.getAppPath(), '--hidden'];
  return { path: exe, args };
}

function getOpenAtLogin() {
  if (process.platform !== 'win32' && process.platform !== 'darwin') return false;
  return app.getLoginItemSettings(loginItemOptions()).openAtLogin;
}

function setOpenAtLogin(enabled) {
  if (process.platform !== 'win32' && process.platform !== 'darwin') return;
  app.setLoginItemSettings({ openAtLogin: enabled, ...loginItemOptions() });
}

// ---------- النافذة وأيقونة شريط المهام ----------
function showWindow() {
  if (!win) createWindow(true);
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function ensureTray() {
  if (prefs.closeToTray && !tray) {
    tray = new Tray(nativeImage.createFromPath(TRAY_ICON));
    tray.setToolTip(APP_NAME);
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'فتح إنجاز', click: showWindow },
        { type: 'separator' },
        {
          label: 'خروج',
          click: () => {
            quitting = true;
            app.quit();
          },
        },
      ])
    );
    tray.on('click', showWindow);
  } else if (!prefs.closeToTray && tray) {
    tray.destroy();
    tray = null;
  }
}

function createWindow(show) {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: APP_NAME,
    icon: WIN_ICON,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0d0d0d' : '#f3f3ef',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false, // ليبقى المؤقت والتذكيرات دقيقة والنافذة مصغّرة
      spellcheck: false,
      autoplayPolicy: 'no-user-gesture-required', // صوت انتهاء المؤقت
    },
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  win.once('ready-to-show', () => {
    if (show) win.show();
  });
  win.on('focus', () => win.flashFrame(false));
  win.on('close', (e) => {
    if (prefs.closeToTray && !quitting) {
      e.preventDefault();
      win.hide();
    }
  });
  win.on('closed', () => {
    win = null;
  });

  // الروابط الخارجية تُفتح في المتصفح، ولا تنقّل داخل التطبيق
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') win.webContents.toggleDevTools();
  });
}

function bootPrefs() {
  const { data } = loadData();
  const settings = (data && data.settings) || {};
  prefs.closeToTray = !!settings.closeToTray;
  if (['light', 'dark', 'system'].includes(settings.theme)) nativeTheme.themeSource = settings.theme;
}

// ---------- قنوات الاتصال مع الواجهة (IPC) ----------
ipcMain.handle('data:load', () => loadData());
ipcMain.handle('data:save', (_e, json) => writeData(json));
ipcMain.on('data:saveSync', (e, json) => {
  try {
    e.returnValue = writeData(json);
  } catch {
    e.returnValue = false;
  }
});

ipcMain.handle('data:export', async (_e, json) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'تصدير نسخة احتياطية',
    defaultPath: path.join(app.getPath('documents'), `injaz-backup-${dayKey()}.json`),
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return { ok: false };
  fs.writeFileSync(filePath, json, 'utf8');
  return { ok: true, filePath };
});

ipcMain.handle('data:import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'استيراد نسخة احتياطية',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths[0]) return { ok: false };
  const data = readJson(filePaths[0]);
  return data ? { ok: true, data } : { ok: false, error: 'invalid' };
});

ipcMain.handle('data:openFolder', () => shell.openPath(dataDir()));

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  dataPath: dataFile(),
  openAtLogin: getOpenAtLogin(),
  platform: process.platform,
}));

ipcMain.handle('app:settings', (_e, s = {}) => {
  prefs.closeToTray = !!s.closeToTray;
  ensureTray();
  if (typeof s.openAtLogin === 'boolean') setOpenAtLogin(s.openAtLogin);
  if (['light', 'dark', 'system'].includes(s.theme)) nativeTheme.themeSource = s.theme;
  return { openAtLogin: getOpenAtLogin() };
});

ipcMain.on('notify', (_e, { title, body } = {}) => {
  if (!Notification.isSupported()) return;
  // أيقونة كـ nativeImage لأن إشعارات ويندوز لا تقرأ مساراً داخل app.asar
  const n = new Notification({ title: String(title || APP_NAME), body: String(body || ''), icon: nativeImage.createFromPath(PNG_ICON) });
  liveNotifications.add(n);
  const release = () => liveNotifications.delete(n);
  n.on('click', () => {
    showWindow();
    release();
  });
  n.on('close', release);
  n.show();
});

ipcMain.on('app:progress', (_e, { value, tooltip } = {}) => {
  if (win) win.setProgressBar(typeof value === 'number' ? value : -1);
  if (tray) tray.setToolTip(tooltip || APP_NAME);
});

ipcMain.on('app:attention', () => {
  if (win && !win.isFocused()) win.flashFrame(true);
});

// ---------- المزامنة مع الهاتف ----------
// الدمج يتم في الواجهة (حيث تعيش البيانات)، والخادم ينتظر النتيجة ليعيدها للهاتف
function requestMerge(stateJson) {
  return new Promise((resolve, reject) => {
    if (!win) return reject(new Error('window-closed'));
    const id = ++mergeSeq;
    const timer = setTimeout(() => {
      pendingMerges.delete(id);
      reject(new Error('timeout'));
    }, 15000);
    pendingMerges.set(id, { resolve, reject, timer });
    win.webContents.send('sync:merge', id, stateJson);
  });
}

ipcMain.on('sync:merged', (_e, id, result) => {
  const p = pendingMerges.get(id);
  if (!p) return;
  clearTimeout(p.timer);
  pendingMerges.delete(id);
  if (result && result.ok) p.resolve(result.data);
  else p.reject(new Error((result && result.error) || 'merge-failed'));
});
ipcMain.handle('sync:status', () => sync.status());
ipcMain.handle('sync:configure', (_e, opts) => sync.configure(opts || {}));

// ---------- دورة حياة التطبيق ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setAppUserModelId(APP_ID);
  app.on('second-instance', showWindow);
  app.whenReady().then(() => {
    bootPrefs();
    sync = createSyncServer({ configPath: path.join(dataDir(), 'sync.json'), onMerge: requestMerge });
    sync.init().catch((err) => console.error('sync init failed', err));
    const startHidden = process.argv.includes('--hidden') && prefs.closeToTray;
    createWindow(!startHidden);
    ensureTray();
  });
  app.on('before-quit', () => {
    quitting = true;
    if (sync) sync.stop();
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
  app.on('activate', () => {
    if (!win) createWindow(true);
  });
}
