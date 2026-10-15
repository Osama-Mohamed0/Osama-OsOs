/* TerraMind Studio — core utilities, i18n, event bus, typed-array codec. */
(function (TM) {
  'use strict';
  TM.version = '1.2.0';

  // ---------------------------------------------------------------- math / format
  TM.D2R = Math.PI / 180;
  TM.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  TM.lerp = (a, b, t) => a + (b - a) * t;
  TM.fmt = (n, d = 0) => (n == null || !isFinite(n)) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  TM.usd = (v, d = 1) => (v < 0 ? '−$' : '$') + TM.fmt(Math.abs(v), d);
  TM.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  TM.uid = (p = 'o') => p + '_' + Math.random().toString(36).slice(2, 9);
  TM.sleep = ms => new Promise(r => setTimeout(r, ms));
  TM.nextFrame = () => new Promise(r => (typeof requestAnimationFrame === 'function' ? requestAnimationFrame(() => r()) : setTimeout(r, 0)));

  TM.rng = function (seed) {
    let a = seed >>> 0;
    const f = function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    f.gauss = () => { let u = 0, v = 0; while (!u) u = f(); while (!v) v = f(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    return f;
  };

  TM.stats = function (arr, w) {
    const n = arr.length; if (!n) return { n: 0 };
    let sw = 0, s = 0, mn = Infinity, mx = -Infinity;
    for (let i = 0; i < n; i++) { const x = arr[i], wi = w ? w[i] : 1; sw += wi; s += x * wi; if (x < mn) mn = x; if (x > mx) mx = x; }
    const mean = s / sw; let v = 0;
    for (let i = 0; i < n; i++) { const d = arr[i] - mean; v += d * d * (w ? w[i] : 1); }
    const variance = v / sw; const sorted = Array.from(arr).sort((a, b) => a - b);
    const q = p => sorted[Math.min(n - 1, Math.max(0, Math.round(p * (n - 1))))];
    return { n, min: mn, max: mx, mean, variance, sd: Math.sqrt(variance), cv: mean ? Math.sqrt(variance) / mean : 0, p10: q(.1), p25: q(.25), median: q(.5), p75: q(.75), p90: q(.9), p95: q(.95), p975: q(.975), p99: q(.99), sorted };
  };

  // Solve A x = b in place (Gaussian elimination, partial pivoting). A: array of Float64Array rows.
  TM.solve = function (A, b) {
    const n = b.length;
    for (let c = 0; c < n; c++) {
      let p = c, mv = Math.abs(A[c][c]);
      for (let r = c + 1; r < n; r++) { const v = Math.abs(A[r][c]); if (v > mv) { mv = v; p = r; } }
      if (mv < 1e-12) return null;
      if (p !== c) { const t = A[p]; A[p] = A[c]; A[c] = t; const tb = b[p]; b[p] = b[c]; b[c] = tb; }
      const piv = A[c][c];
      for (let r = c + 1; r < n; r++) {
        const f = A[r][c] / piv; if (f === 0) continue;
        const Ar = A[r], Ac = A[c];
        for (let k = c; k < n; k++) Ar[k] -= f * Ac[k];
        b[r] -= f * b[c];
      }
    }
    const x = new Float64Array(n);
    for (let r = n - 1; r >= 0; r--) { let s = b[r]; const Ar = A[r]; for (let k = r + 1; k < n; k++) s -= Ar[k] * x[k]; x[r] = s / Ar[r]; }
    return x;
  };

  // Symmetric 3x3 eigen decomposition (Jacobi). Returns {values:[..], vectors:[[..],[..],[..]]} (columns)
  TM.eig3 = function (m) {
    const a = [m[0].slice(), m[1].slice(), m[2].slice()], v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    for (let sweep = 0; sweep < 50; sweep++) {
      let off = Math.abs(a[0][1]) + Math.abs(a[0][2]) + Math.abs(a[1][2]); if (off < 1e-12) break;
      for (const [p, q] of [[0, 1], [0, 2], [1, 2]]) {
        if (Math.abs(a[p][q]) < 1e-15) continue;
        const th = (a[q][q] - a[p][p]) / (2 * a[p][q]); const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)); const c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < 3; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
        for (let k = 0; k < 3; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
        for (let k = 0; k < 3; k++) { const vkp = v[k][p], vkq = v[k][q]; v[k][p] = c * vkp - s * vkq; v[k][q] = s * vkp + c * vkq; }
      }
    }
    return { values: [a[0][0], a[1][1], a[2][2]], vectors: v };
  };

  // Rotation matrix for a search/variogram ellipsoid: azimuth (clockwise from N), dip (down positive), plunge/rake.
  // Returns a function mapping a delta (dx=E, dy=N, dz=Z) to anisotropic-scaled distance squared.
  TM.anisoMetric = function (azi, dip, rake, r1, r2, r3) {
    const a = azi * TM.D2R, d = dip * TM.D2R, k = rake * TM.D2R;
    // major axis direction
    const u = [Math.sin(a) * Math.cos(d), Math.cos(a) * Math.cos(d), -Math.sin(d)];
    // semi-major: horizontal perpendicular rotated by rake about u
    let h = [Math.cos(a), -Math.sin(a), 0];
    const w0 = [u[1] * h[2] - u[2] * h[1], u[2] * h[0] - u[0] * h[2], u[0] * h[1] - u[1] * h[0]];
    const v = [0, 1, 2].map(i => h[i] * Math.cos(k) + w0[i] * Math.sin(k));
    const w = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const i1 = 1 / (r1 * r1), i2 = 1 / (r2 * r2), i3 = 1 / (r3 * r3);
    const f = (dx, dy, dz) => { const p = dx * u[0] + dy * u[1] + dz * u[2], q = dx * v[0] + dy * v[1] + dz * v[2], s = dx * w[0] + dy * w[1] + dz * w[2]; return p * p * i1 + q * q * i2 + s * s * i3; };
    f.axes = { u, v, w }; f.ranges = [r1, r2, r3];
    return f;
  };

  // ---------------------------------------------------------------- i18n
  TM.lang = 'en';
  TM.L = (en, ar) => (TM.lang === 'ar' && ar != null) ? ar : en;
  TM.isArabic = s => /[؀-ۿ]/.test(s || '');
  TM.normDigits = s => String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/٫/g, '.').replace(/،/g, ',');

  // ---------------------------------------------------------------- event bus
  const handlers = {};
  TM.on = (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); };
  TM.emit = (ev, data) => { (handlers[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(ev, e); } }); };

  // ---------------------------------------------------------------- typed array codec (for .tmd)
  const TA = { f32: Float32Array, f64: Float64Array, i32: Int32Array, u32: Uint32Array, u8: Uint8Array, i16: Int16Array };
  function b64enc(u8) { let s = ''; const CH = 0x8000; for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH)); return (typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64')); }
  function b64dec(b) { const s = typeof atob === 'function' ? atob(b) : Buffer.from(b, 'base64').toString('binary'); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  TM.encode = function (obj) {
    return JSON.stringify(obj, (k, v) => {
      if (k.startsWith('_rt')) return undefined; // runtime-only fields
      if (v && ArrayBuffer.isView(v) && !(v instanceof DataView)) { const t = Object.keys(TA).find(k => TA[k].name === v.constructor.name); if (t) return { __ta: t, b64: b64enc(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) }; }
      return v;
    });
  };
  TM.decode = function (str) {
    return JSON.parse(str, (k, v) => {
      if (v && typeof v === 'object' && v.__ta) { const u = b64dec(v.b64); const C = TA[v.__ta]; return new C(u.buffer, 0, u.byteLength / C.BYTES_PER_ELEMENT); }
      return v;
    });
  };
  TM.gzip = async function (str) {
    if (typeof CompressionStream === 'undefined') return new TextEncoder().encode(str);
    const cs = new CompressionStream('gzip'); const w = cs.writable.getWriter(); w.write(new TextEncoder().encode(str)); w.close();
    return new Uint8Array(await new Response(cs.readable).arrayBuffer());
  };
  TM.gunzipToText = async function (buf) {
    const u = new Uint8Array(buf);
    if (u[0] === 0x1f && u[1] === 0x8b) {
      if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot read compressed .tmd files');
      const ds = new DecompressionStream('gzip'); const w = ds.writable.getWriter(); w.write(u); w.close();
      return await new Response(ds.readable).text();
    }
    return new TextDecoder().decode(u);
  };

  // ---------------------------------------------------------------- async progress helper
  // Runs a long loop in chunks so the UI stays responsive. step(i) processes item i.
  TM.chunked = async function (n, step, onProgress, chunk = 4000) {
    // time-sliced: yield to the UI about every 80 ms (keeps the app responsive without slowing heavy jobs)
    const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    let t0 = now();
    for (let i = 0; i < n; i++) {
      step(i);
      if ((i & 255) === 255 && now() - t0 > 80) { if (onProgress) onProgress((i + 1) / n); await TM.sleep(0); t0 = now(); }
    }
    if (onProgress) onProgress(1);
  };
})(typeof window !== 'undefined' ? (window.TM = window.TM || {}) : (globalThis.TM = globalThis.TM || {}));
