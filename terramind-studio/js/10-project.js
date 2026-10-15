/* TerraMind Studio — project model, .tmd save/open, IndexedDB autosave. */
(function (TM) {
  'use strict';

  TM.defaultSettings = () => ({
    density: 2.7, gradeField: 'au', gradeUnit: 'g/t',
    price: 2400, recovery: 92, mineCost: 2.8, procCost: 18, gaCost: 4, sellCost: 30, // $/oz selling/refining
    capex: 120e6, millRate: 0.9e6, mineRate: 8e6, discount: 8, closure: 8e6,
    slope: 45, benchH: 10, batter: 70, bermW: 6, rampW: 20, rampGrade: 10,
    cutoff: 0.5, colormap: 'gold', topCut: null, compLen: 2, pitSource: 'shell',
    infill: []
  });

  TM.newProject = function (name = 'Untitled project') {
    return {
      format: 'TerraMind.tmd', version: 2, name, units: 'm', crs: 'Local grid (m)',
      created: new Date().toISOString(), modified: new Date().toISOString(),
      settings: TM.defaultSettings(),
      db: { collars: [], surveys: [], assays: [], lith: [], fields: ['au'] },
      surfaces: [], strings: [], solids: [], bm: null,
      pit: null, // {shells:[{rf,floor:Float32Array}], grid:{x0,y0,cs,nx,ny}, selected, schedule}
      ai: { log: [] }, history: []
    };
  };

  // Active project + runtime caches (not serialised)
  TM.P = null;
  TM.rt = { holes: [], comps: null, tin: null, dirty: false };

  TM.setProject = function (P, filePath) {
    TM.P = P; TM.rt = { holes: [], comps: null, tin: null, dirty: false, filePath: filePath || null };
    TM.Drill && TM.Drill.rebuild();
    TM.Surf && TM.Surf.rebuildTopo();
    TM.emit('project', P);
  };
  TM.touch = function (what) {
    if (!TM.P) return; TM.P.modified = new Date().toISOString(); TM.rt.dirty = true;
    TM.emit('changed', what); scheduleAutosave();
  };
  TM.logHistory = function (action, detail) {
    if (!TM.P) return; TM.P.history.push({ t: new Date().toISOString(), action, detail });
    if (TM.P.history.length > 400) TM.P.history.shift();
  };

  // Extents of everything in the project (for camera/scene centring)
  TM.extents = function () {
    const P = TM.P; let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    const add = (x, y, z) => { if (!isFinite(x)) return; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); z0 = Math.min(z0, z); z1 = Math.max(z1, z); };
    for (const s of P.surfaces) { const p = s.pts; for (let i = 0; i < p.length; i += 3) add(p[i], p[i + 1], p[i + 2]); }
    for (const c of P.db.collars) { add(c.x, c.y, c.z); add(c.x, c.y, c.z - c.depth); }
    for (const s of P.strings) for (const p of s.pts) add(p[0], p[1], p[2]);
    if (!isFinite(x0)) return { x0: 0, y0: 0, z0: 0, x1: 100, y1: 100, z1: 100, cx: 50, cy: 50, cz: 50, size: 100 };
    return { x0, y0, z0, x1, y1, z1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, cz: (z0 + z1) / 2, size: Math.max(x1 - x0, y1 - y0, z1 - z0) };
  };

  // ---------------------------------------------------------------- file save/open
  TM.native = typeof window !== 'undefined' && window.tmNative ? window.tmNative : null;
  const FILTERS = { tmd: [{ name: 'TerraMind project', extensions: ['tmd'] }], csv: [{ name: 'CSV', extensions: ['csv'] }], str: [{ name: 'Surpac string', extensions: ['str'] }], dxf: [{ name: 'DXF', extensions: ['dxf'] }], svg: [{ name: 'SVG', extensions: ['svg'] }], png: [{ name: 'PNG image', extensions: ['png'] }], html: [{ name: 'HTML', extensions: ['html'] }], obj: [{ name: 'OBJ', extensions: ['obj'] }], stl: [{ name: 'STL', extensions: ['stl'] }] };
  TM.saveBlob = async function (blob, filename, knownPath) {
    if (TM.native) { const ext = (filename.split('.').pop() || '').toLowerCase(); const data = new Uint8Array(await blob.arrayBuffer()); return await TM.native.save(filename, data, FILTERS[ext], knownPath); }
    try {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      return filename;
    } catch (e) { return null; }
  };
  TM.saveProjectFile = async function (saveAs = false) {
    const json = TM.encode(TM.P); const gz = await TM.gzip(json);
    const name = (TM.P.name || 'project').replace(/[^\w\u0600-\u06FF\- ]+/g, '').trim().replace(/\s+/g, '_') + '.tmd';
    const where = await TM.saveBlob(new Blob([gz], { type: 'application/octet-stream' }), name, saveAs ? null : TM.rt.filePath);
    if (!where) return null; if (TM.native) TM.rt.filePath = where;
    TM.rt.dirty = false; TM.logHistory('save', where); TM.emit('saved', where); return where;
  };
  TM.openProjectFile = async function (file) {
    const buf = await file.arrayBuffer(); const txt = await TM.gunzipToText(buf); const P = TM.decode(txt);
    if (P.format !== 'TerraMind.tmd') throw new Error(TM.L('Not a TerraMind project file', 'الملف ليس مشروع TerraMind'));
    P.settings = Object.assign(TM.defaultSettings(), P.settings || {});
    P.history = P.history || []; P.ai = P.ai || { log: [] };
    TM.setProject(P, file.path || null); return P;
  };

  // ---------------------------------------------------------------- IndexedDB autosave
  const DBN = 'terramind', STORE = 'projects';
  function idb() {
    return new Promise((res, rej) => {
      if (typeof indexedDB === 'undefined') return rej(new Error('no indexedDB'));
      const r = indexedDB.open(DBN, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  TM.idbPut = async function (key, val) { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(val, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); };
  TM.idbGet = async function (key) { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction(STORE, 'readonly'); const r = tx.objectStore(STORE).get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); };
  TM.idbDel = async function (key) { const db = await idb(); return new Promise((res) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).delete(key); tx.oncomplete = () => res(); }); };

  let saveT = 0;
  function scheduleAutosave() {
    clearTimeout(saveT);
    saveT = setTimeout(async () => {
      try { await TM.idbPut('autosave', TM.encode(TM.P)); TM.emit('autosaved', new Date()); } catch (e) { /* storage unavailable: ignore */ }
    }, 2500);
  }
  TM.loadAutosave = async function () {
    try { const s = await TM.idbGet('autosave'); if (!s) return null; const P = TM.decode(s); P.settings = Object.assign(TM.defaultSettings(), P.settings || {}); P.history = P.history || []; P.ai = P.ai || { log: [] }; return P; } catch (e) { return null; }
  };
  TM.clearAutosave = async function () { try { await TM.idbDel('autosave'); } catch (e) { } };

  // ---------------------------------------------------------------- per-user preferences (API keys, UI)
  TM.prefs = {
    get(k, d) { try { const v = localStorage.getItem('tm.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('tm.' + k, JSON.stringify(v)); } catch (e) { } }
  };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
