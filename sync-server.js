'use strict';
// خادم المزامنة المحلي: يتصل به تطبيق الهاتف عبر شبكة الواي فاي فقط، دون إنترنت أو خوادم خارجية.
// كل البيانات مشفّرة (AES-256-GCM) بمفتاح مشتق من رمز الربط الظاهر في رمز QR.
const http = require('http');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const QRCode = require('qrcode');

const DEFAULT_PORT = 47321;
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // بلا أحرف متشابهة (O/0، I/1)
const MAX_BODY = 25 * 1024 * 1024;
const KDF_SALT = 'injaz-sync-v1';
const KDF_ITERATIONS = 150000;

function createSyncServer({ configPath, onMerge }) {
  let cfg = { enabled: false, code: null, port: DEFAULT_PORT, lastSync: null };
  let server = null;
  let key = null;
  let error = null;
  const failures = new Map(); // عنوان IP ← محاولات فاشلة (حماية من التخمين)

  function load() {
    try {
      cfg = { ...cfg, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
    } catch {
      /* أول تشغيل */
    }
  }

  function save() {
    fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf8');
  }

  const newCode = () => Array.from({ length: 10 }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
  const deriveKey = (code) => crypto.pbkdf2Sync(code, KDF_SALT, KDF_ITERATIONS, 32, 'sha256');

  function encrypt(text) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ct = Buffer.concat([cipher.update(text, 'utf8'), cipher.final(), cipher.getAuthTag()]);
    return JSON.stringify({ v: 1, iv: iv.toString('base64'), ct: ct.toString('base64') });
  }

  // فك التشفير يفشل إن لم يكن المرسل يعرف رمز الربط، فهو أيضاً وسيلة التحقق
  function decrypt(body) {
    const { iv, ct } = JSON.parse(body);
    const buf = Buffer.from(ct, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(buf.subarray(buf.length - 16));
    return JSON.parse(Buffer.concat([decipher.update(buf.subarray(0, buf.length - 16)), decipher.final()]).toString('utf8'));
  }

  function addresses() {
    const list = [];
    for (const infos of Object.values(os.networkInterfaces())) {
      for (const i of infos || []) {
        if (i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.')) list.push(i.address);
      }
    }
    const rank = (a) => (a.startsWith('192.168.') ? 0 : a.startsWith('10.') ? 1 : /^172\.(1[6-9]|2\d|3[01])\./.test(a) ? 2 : 3);
    return [...new Set(list)].sort((a, b) => rank(a) - rank(b));
  }

  function send(res, status, body) {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  }

  function isBlocked(ip) {
    const f = failures.get(ip);
    if (!f) return false;
    if (Date.now() - f.since > 10 * 60 * 1000) {
      failures.delete(ip);
      return false;
    }
    return f.count >= 20;
  }

  function recordFailure(ip) {
    const f = failures.get(ip) || { count: 0, since: Date.now() };
    f.count++;
    failures.set(ip, f);
  }

  function handle(req, res) {
    const ip = req.socket.remoteAddress || '';
    const url = (req.url || '').split('?')[0];
    if (req.method === 'OPTIONS') return send(res, 204, '');
    if (req.method === 'GET' && url === '/injaz/ping') return send(res, 200, JSON.stringify({ app: 'injaz', v: 1, name: os.hostname() }));
    if (req.method !== 'POST' || url !== '/injaz/sync') return send(res, 404, '{}');
    if (isBlocked(ip)) return send(res, 429, JSON.stringify({ error: 'too-many-attempts' }));

    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) req.destroy();
      else chunks.push(c);
    });
    req.on('end', async () => {
      let payload;
      try {
        payload = decrypt(Buffer.concat(chunks).toString('utf8'));
      } catch {
        recordFailure(ip);
        return send(res, 401, JSON.stringify({ error: 'bad-code' }));
      }
      failures.delete(ip);
      try {
        const merged = await onMerge(JSON.stringify(payload.state));
        cfg.lastSync = { device: String(payload.device || 'الهاتف').slice(0, 60), at: Date.now() };
        save();
        send(res, 200, encrypt(`{"name":${JSON.stringify(os.hostname())},"state":${merged}}`));
      } catch (err) {
        send(res, 503, JSON.stringify({ error: String((err && err.message) || err) }));
      }
    });
  }

  function start() {
    if (server) return Promise.resolve();
    key = deriveKey(cfg.code);
    error = null;
    return new Promise((resolve) => {
      const s = http.createServer(handle);
      s.on('error', (err) => {
        error = err.code === 'EADDRINUSE' ? 'port-in-use' : String(err.message || err);
        server = null;
        resolve();
      });
      s.listen(cfg.port, '0.0.0.0', () => {
        server = s;
        resolve();
      });
    });
  }

  function stop() {
    if (!server) return;
    server.close();
    server = null;
  }

  async function status() {
    const addrs = addresses();
    const qrPayload = JSON.stringify({ app: 'injaz', v: 1, h: addrs, p: cfg.port, c: cfg.code, n: os.hostname() });
    return {
      enabled: cfg.enabled,
      running: !!server,
      code: cfg.code.replace(/^(.{4})(.{4})(.{2})$/, '$1-$2-$3'),
      port: cfg.port,
      addresses: addrs,
      name: os.hostname(),
      lastSync: cfg.lastSync,
      error,
      qr: cfg.enabled ? await QRCode.toDataURL(qrPayload, { margin: 1, width: 260, errorCorrectionLevel: 'M' }) : null,
    };
  }

  async function configure({ enabled, regenerate } = {}) {
    if (regenerate) {
      cfg.code = newCode();
      cfg.lastSync = null;
      if (server) key = deriveKey(cfg.code); // الأجهزة المرتبطة بالرمز القديم تتوقف عن المزامنة
    }
    if (typeof enabled === 'boolean') cfg.enabled = enabled;
    save();
    if (cfg.enabled) await start();
    else stop();
    return status();
  }

  async function init() {
    load();
    if (!cfg.code) {
      cfg.code = newCode();
      save();
    }
    if (cfg.enabled) await start();
  }

  return { init, status, configure, stop };
}

module.exports = { createSyncServer, KDF_SALT, KDF_ITERATIONS };
