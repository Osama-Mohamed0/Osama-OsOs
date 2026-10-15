'use strict';
// عميل المزامنة (في تطبيق الهاتف): يتصل بالكمبيوتر عبر الواي فاي ويتبادل البيانات مشفّرة.
// على الكمبيوتر يعمل الخادم في sync-server.js، لذلك هذا العميل لا يعمل داخل تطبيق سطح المكتب.

const Sync = (() => {
  const STORE_KEY = 'injaz-sync';
  const DEFAULT_PORT = 47321;
  const KDF = { salt: 'injaz-sync-v1', iterations: 150000 }; // مطابق لما في sync-server.js
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const subs = new Set();
  let cfg = read(); // { hosts, port, code, pcName, lastHost, lastAt, lastError }
  let key = null;
  let busy = false;
  let syncedVersion = -1;
  let timer = null;
  let status = 'idle'; // idle | syncing | ok | offline | bad-code
  let started = false;

  function read() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || null;
    } catch {
      return null;
    }
  }

  function write() {
    try {
      if (cfg) localStorage.setItem(STORE_KEY, JSON.stringify(cfg));
      else localStorage.removeItem(STORE_KEY);
    } catch {
      /* التخزين غير متاح */
    }
  }

  const isEnabled = () => Store.api.platform !== 'desktop' && !!(window.crypto && crypto.subtle);
  const paired = () => !!(cfg && cfg.code && Array.isArray(cfg.hosts) && cfg.hosts.length);
  const normalizeCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const formatCode = (c) => normalizeCode(c).replace(/^(.{4})(.{4})(.{2})$/, '$1-$2-$3');

  function setStatus(s) {
    status = s;
    subs.forEach((fn) => fn(s));
  }

  // ---------- التشفير (مطابق لخادم الكمبيوتر) ----------
  async function deriveKey(code) {
    const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: enc.encode(KDF.salt), iterations: KDF.iterations, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  function b64(buf) {
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  async function encrypt(k, obj) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(JSON.stringify(obj)));
    return JSON.stringify({ v: 1, iv: b64(iv), ct: b64(ct) });
  }

  async function decrypt(k, text) {
    const { iv, ct } = JSON.parse(text);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, k, unb64(ct));
    return JSON.parse(dec.decode(pt));
  }

  // ---------- الاتصال ----------
  // على أندرويد نستخدم اتصال النظام المباشر (لا قيود WebView على الشبكة المحلية)
  async function post(host, port, body) {
    const N = window.Native;
    if (N && N.isNative && N.CapacitorHttp) {
      const r = await N.CapacitorHttp.request({
        url: `http://${host}:${port}/injaz/sync`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        data: JSON.parse(body),
        responseType: 'text',
        connectTimeout: 5000,
        readTimeout: 15000,
      });
      const text = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
      return { status: r.status, ok: r.status >= 200 && r.status < 300, text: async () => text };
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      return await fetch(`http://${host}:${port}/injaz/sync`, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  }

  // يرسل بياناتنا ويستقبل النسخة المدموجة، مجرّباً كل عناوين الكمبيوتر المعروفة
  async function exchange(c, k, state = Store.state) {
    const hosts = [...new Set([c.lastHost, ...c.hosts].filter(Boolean))];
    const body = await encrypt(k, { device: 'هاتف أندرويد', state });
    let reason = 'offline';
    for (const host of hosts) {
      let res;
      try {
        res = await post(host, c.port || DEFAULT_PORT, body);
      } catch {
        continue;
      }
      if (res.status === 401) {
        reason = 'bad-code';
        break;
      }
      if (res.status === 429) {
        reason = 'blocked';
        break;
      }
      if (!res.ok) {
        reason = 'server';
        continue;
      }
      return { host, data: await decrypt(k, await res.text()) };
    }
    throw new Error(reason);
  }

  function messageFor(reason) {
    return (
      {
        'bad-code': 'رمز الربط لم يعد صالحاً. امسح رمز QR من جديد من إعدادات الكمبيوتر.',
        blocked: 'محاولات خاطئة كثيرة. انتظر 10 دقائق ثم حاول مجدداً.',
        server: 'لم يستطع الكمبيوتر إتمام المزامنة. حاول مرة أخرى.',
        'code-format': 'رمز الربط يتكون من 10 أحرف وأرقام، مثل ABCD-EFGH-JK.',
        'bad-qr': 'هذا الرمز ليس رمز ربط من إنجاز.',
      }[reason] || 'تعذّر الوصول إلى الكمبيوتر. تأكد أن الجهازين على نفس شبكة الواي فاي، وأن إنجاز مفتوح على الكمبيوتر والمزامنة مفعّلة فيه.'
    );
  }

  async function syncNow({ quiet = true } = {}) {
    if (!isEnabled() || !paired() || busy) return false;
    busy = true;
    setStatus('syncing');
    try {
      key = key || (await deriveKey(cfg.code));
      const versionAtSend = Store.localVersion;
      const { host, data } = await exchange(cfg, key);
      Store.mergeRemote(data.state);
      cfg = { ...cfg, lastHost: host, lastAt: Date.now(), pcName: data.name || cfg.pcName, lastError: null };
      write();
      syncedVersion = versionAtSend;
      setStatus('ok');
      if (!quiet) UI.toast('تمت المزامنة مع الكمبيوتر ✓', { type: 'success' });
      return true;
    } catch (err) {
      cfg = { ...cfg, lastError: err.message };
      write();
      setStatus(err.message === 'bad-code' ? 'bad-code' : 'offline');
      if (!quiet) UI.toast(messageFor(err.message), { type: 'error', timeout: 8000 });
      return false;
    } finally {
      busy = false;
      // تعديلات حدثت أثناء الإرسال تُرسل في الجولة التالية
      if (status === 'ok' && Store.localVersion !== syncedVersion) schedule(1500);
    }
  }

  function schedule(ms = 3000) {
    clearTimeout(timer);
    timer = setTimeout(() => syncNow(), ms);
  }

  // ---------- الربط ----------
  function parseQr(text) {
    let d;
    try {
      d = JSON.parse(text);
    } catch {
      throw new Error('bad-qr');
    }
    if (!d || d.app !== 'injaz' || !d.c || !d.h) throw new Error('bad-qr');
    return { hosts: Array.isArray(d.h) ? d.h : [d.h], port: Number(d.p) || DEFAULT_PORT, code: d.c };
  }

  async function pair({ hosts, port = DEFAULT_PORT, code }) {
    code = normalizeCode(code);
    if (code.length !== 10) throw new Error('code-format');
    const candidate = { hosts: hosts.map((h) => String(h).trim()).filter(Boolean), port, code };
    const k = await deriveKey(code);
    // الجولة الأولى تجلب بيانات الكمبيوتر فقط، ثم نرتّب بيانات الهاتف قبل إرسالها
    const empty = { categories: [], tasks: [], habits: [], sessions: [], deleted: {}, settingsAt: 0, settings: {} };
    const { host, data } = await exchange(candidate, k, empty);
    cfg = { ...candidate, lastHost: host, pcName: data.name || 'الكمبيوتر', lastAt: Date.now(), lastError: null };
    key = k;
    write();
    Store.adoptRemoteDefaults(data.state);
    Store.mergeRemote(data.state);
    start();
    await syncNow();
    return cfg;
  }

  function unpair() {
    cfg = null;
    key = null;
    write();
    setStatus('idle');
  }

  function start() {
    if (started || !isEnabled()) return;
    started = true;
    Store.subscribe(() => {
      if (paired() && Store.localVersion !== syncedVersion) schedule(3000);
    });
    setInterval(() => {
      if (document.visibilityState === 'visible') syncNow();
    }, 30000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') syncNow();
    });
    syncNow();
  }

  const subscribe = (fn) => {
    subs.add(fn);
    return () => subs.delete(fn);
  };

  return {
    start,
    syncNow,
    pair,
    unpair,
    parseQr,
    formatCode,
    messageFor,
    isEnabled,
    paired,
    subscribe,
    get config() {
      return cfg;
    },
    get status() {
      return status;
    },
  };
})();
