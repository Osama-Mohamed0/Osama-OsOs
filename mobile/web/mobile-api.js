'use strict';
// واجهة النظام على أندرويد: نفس واجهة preload.js في سطح المكتب، لكن عبر إضافات Capacitor.
// تُحمَّل قبل store.js، فتستخدمها الواجهة دون أي تغيير.
(() => {
  const N = window.Native;
  if (!N || !N.isNative) return; // في المتصفح العادي يبقى البديل المدمج في store.js

  document.documentElement.classList.add('is-mobile');
  const FILE = 'injaz-data.json';
  const MIRROR = 'injaz-data'; // نسخة ثانية في localStorage للاستعادة
  let notifSeq = 500;

  async function readJson(path) {
    try {
      const r = await N.Filesystem.readFile({ path, directory: N.Directory.Data, encoding: N.Encoding.UTF8 });
      return JSON.parse(r.data);
    } catch {
      return null;
    }
  }

  const writeFile = (json) => N.Filesystem.writeFile({ path: FILE, data: json, directory: N.Directory.Data, encoding: N.Encoding.UTF8 });

  function mirror(json) {
    try {
      localStorage.setItem(MIRROR, json);
    } catch {
      /* المساحة ممتلئة */
    }
  }

  function pickFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = async () => {
        try {
          resolve({ ok: true, data: JSON.parse(await input.files[0].text()) });
        } catch {
          resolve({ ok: false, error: 'invalid' });
        }
      };
      input.click();
    });
  }

  window.api = {
    platform: 'android',
    schedulesReminders: true, // التذكيرات وإشعار المؤقت يجدولها النظام (mobile-glue.js)

    async load() {
      const data = await readJson(FILE);
      if (data) return { data };
      try {
        const raw = localStorage.getItem(MIRROR);
        if (raw) return { data: JSON.parse(raw), recoveredFrom: 'mirror' };
      } catch {
        /* لا توجد نسخة */
      }
      return { data: null };
    },
    async save(json) {
      mirror(json);
      await writeFile(json);
      return true;
    },
    saveSync(json) {
      mirror(json);
      writeFile(json).catch(() => {});
      return true;
    },
    async exportData(json) {
      const name = `injaz-backup-${D.today()}.json`;
      const r = await N.Filesystem.writeFile({ path: name, data: json, directory: N.Directory.Cache, encoding: N.Encoding.UTF8 });
      await N.Share.share({ title: 'نسخة احتياطية من إنجاز', files: [r.uri], dialogTitle: 'حفظ النسخة الاحتياطية' });
      return { ok: true };
    },
    importData: pickFile,
    openDataFolder: async () => {},
    async info() {
      const i = await N.App.getInfo().catch(() => ({}));
      return { version: i.version || '1.0.0', dataPath: '', openAtLogin: false, platform: 'android' };
    },
    applySettings: async () => ({ openAtLogin: false }),
    notify(title, body) {
      notifSeq = notifSeq >= 999 ? 500 : notifSeq + 1;
      N.LocalNotifications.schedule({ notifications: [{ id: notifSeq, title, body, channelId: 'injaz' }] }).catch(() => {});
    },
    progress: () => {},
    attention: () => {},
    setZoom(f) {
      document.documentElement.style.zoom = f;
    },
  };
})();
