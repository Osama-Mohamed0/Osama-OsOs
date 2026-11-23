/* TerraMind Studio — import a whole project folder: classify every file, review, import, then tidy (drape collars,
   match borehole logs by coordinates, vertical surveys, grade units) and report what was done. */
(function (TM) {
  'use strict';
  const F = TM.Folder = {}; const L = TM.L, IO = TM.IO;
  const ext = n => (n.toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || '';
  const base = n => n.split('/').pop().replace(/\.[^.]+$/, '');
  const relPath = f => f.webkitRelativePath || f.relPath || f.name;

  // file kinds and the order they are applied in
  F.KINDS = {
    project: { en: 'TerraMind project (.tmd)', ar: 'مشروع TerraMind' },
    collar: { en: 'Drillhole collars', ar: 'رؤوس الآبار' }, survey: { en: 'Downhole surveys', ar: 'مسوحات الآبار' },
    assay: { en: 'Assays / grades', ar: 'التحاليل' }, lith: { en: 'Lithology table', ar: 'جدول الصخارة' },
    log: { en: 'Borehole log sheet', ar: 'وصف بئر (سجل حفر)' }, topo: { en: 'Topography points', ar: 'نقاط طبوغرافية' },
    grid: { en: 'Surfer grid (surface)', ar: 'شبكة Surfer (سطح)' }, dtm: { en: 'Surpac DTM / solid', ar: 'سطح أو مجسم Surpac' },
    str: { en: 'Surpac strings', ar: 'خطوط Surpac' }, dxf: { en: 'DXF drawing', ar: 'رسم DXF' }, mesh: { en: 'OBJ / STL solid', ar: 'مجسم OBJ / STL' },
    datamine: { en: 'Datamine strings / points', ar: 'خطوط ونقاط Datamine' }, points2d: { en: 'Coordinates without elevation', ar: 'إحداثيات بلا منسوب' },
    geo: { en: 'Geographic (lat/long) duplicate', ar: 'نسخة بالدرجات الجغرافية' }, doc: { en: 'Document / image (kept as reference)', ar: 'مستند أو صورة (مرجع)' },
    internal: { en: 'Software internal file', ar: 'ملف داخلي لبرنامج آخر' }, unknown: { en: 'Not recognised', ar: 'غير معروف' }
  };
  const INTERNAL = /^(ssi|ddb|dsc|rej|laccdb|accdb|mdb|mdl|bmr|con|log|ai|bak|tmp|ini|db|lnk|slim|dwl|dwl2)$/;
  const DOC = /^(not|vgm|pdf|jpg|jpeg|png|gif|bmp|tif|tiff|doc|docx|ppt|pptx|txt|md|html|htm)$/;

  // ---------------------------------------------------------------- table classification
  const norm = h => String(h).toLowerCase().trim().replace(/[\s.()]+/g, '_').replace(/_+$/, '');
  const numRatio = (rows, i) => { let n = 0, k = 0; for (const r of rows.slice(0, 200)) { const v = String(r[i] ?? '').trim(); if (!v) continue; k++; if (isFinite(IO.num(v))) n++; } return k ? n / k : 0; };
  F.parseLog = function (t) {
    const all = [t.header].concat(t.rows), cells = all.flat().map(c => String(c ?? ''));
    const txt = cells.join(' | '); if (!/bore ?hole|well log|bh\s*no|hole\s*no|description of strata|وصف/i.test(txt)) return null;
    const id = (txt.match(/(?:bore ?hole|hole|bh)\s*(?:no\.?|number|id)?\s*[:#]\s*([A-Za-z]{0,4}[\s-]*\d+[A-Za-z]?)/i) || [])[1];
    const N = +((txt.match(/\bN\s*[:=]\s*([\d.]{5,})/) || [])[1]), E = +((txt.match(/\bE\s*[:=]\s*([\d.]{5,})/) || [])[1]);
    const data = all.map(r => r.map(c => String(c ?? '').trim())).filter(r => r.some(c => c.length > 8 && /[a-z؀-ۿ]{3,}/i.test(c) && !/:/.test(c)) && r.some(c => isFinite(IO.num(c)) && c !== ''));
    if (data.length < 2) return null; const w = Math.max(...data.map(r => r.length));
    let best = -1, bestMax = -Infinity; for (let i = 0; i < w; i++) { const v = data.map(r => IO.num(r[i])); if (v.filter(isFinite).length < data.length * 0.8) continue; const f = v.filter(isFinite); if (!f.every((x, k) => !k || x > f[k - 1])) continue; if (f[f.length - 1] > bestMax) { bestMax = f[f.length - 1]; best = i; } }
    if (best < 0) return null; let from = 0; const iv = [];
    for (const r of data) { const to = IO.num(r[best]); if (!isFinite(to) || to <= from) continue; const desc = r.filter(c => /[a-z؀-ۿ]{3,}/i.test(c)).sort((a, b) => b.length - a.length)[0] || ''; iv.push({ from, to, desc }); from = to; }
    return iv.length ? { hole: id ? id.replace(/\s+/g, ' ').trim() : null, E: isFinite(E) ? E : null, N: isFinite(N) ? N : null, intervals: iv } : null;
  };
  F.lithCode = d => { d = String(d).toLowerCase(); const K = [[/over ?burden|top ?soil|loose sediment|alluvi|fill|silty sand,?\s*yellowish/, 'OB'], [/sand ?stone/, 'SST'], [/lime ?stone/, 'LST'], [/clay ?stone|shale/, 'SHL'], [/clay/, 'CLY'], [/gravel|conglomerate/, 'GRV'], [/granite/, 'GRN'], [/basalt/, 'BAS'], [/quartz|vein/, 'QTZ'], [/silt/, 'SLT'], [/sand/, 'SND'], [/رمل/, 'SND'], [/طين/, 'CLY']]; for (const [re, c] of K) if (re.test(d)) return c; return (d.match(/[a-z]{3}/) || ['UNK'])[0].toUpperCase(); };
  F.classifyTable = function (t, name) {
    const log = F.parseLog(t); if (log) return { kind: 'log', log };
    const H = t.header.map(norm), has = re => H.findIndex(h => re.test(h)); const rows = t.rows;
    const iHole = has(/^(hole(_?id)?|bhid|dhid|drillhole|well|id|borehole|bh|رقم_البئر|البئر)$/), iFrom = has(/^(from|depth_from|mfrom|من)$/), iTo = has(/^(to|depth_to|mto|إلى|الى)$/);
    const iAz = has(/^(az|azi|azimuth|brg|bearing|السمت)$/), iDip = has(/^(dip|incl|inclination|الميل)$/);
    const iX = has(/^(x|x_?east|east(ing)?|e|xcollar|x_collar|شرق|xp)$/), iY = has(/^(y|y_?north|north(ing)?|n|ycollar|y_collar|شمال|yp)$/), iZ = has(/^(z|rl|elev(ation)?|elv|elve|zcollar|z_collar|منسوب|zp)$/);
    const iLat = has(/^(lat|latitude)/), iLon = has(/^(lon|long|longitude)/);
    if (has(/^xp$/) >= 0 && has(/^yp$/) >= 0) return { kind: 'datamine' };
    if (iHole >= 0 && iFrom >= 0 && iTo >= 0) {
      const used = new Set([iHole, iFrom, iTo]); t.header.forEach((h, i) => { if (/^(sample(_?(id|no|num(ber)?))?|samp_?id|id|no|seq|thick(ness)?(_m)?|length|len|width|interval|recovery|rec)$/.test(H[i])) used.add(i); }); const numCols = [], textCols = [];
      t.header.forEach((h, i) => { if (used.has(i)) return; const r = numRatio(rows, i); if (r > 0.8) numCols.push(i); else if (r < 0.2 && rows.some(rw => String(rw[i] ?? '').trim())) textCols.push(i); });
      if (numCols.length) return { kind: 'assay', gradeCols: numCols, textCol: textCols[0] ?? -1 }; if (textCols.length) return { kind: 'lith', textCol: textCols[0] };
    }
    if (iHole >= 0 && iAz >= 0 && iDip >= 0) return { kind: 'survey' };
    if (iHole >= 0 && iX >= 0 && iY >= 0) return { kind: 'collar' };
    const geo = (iLat >= 0 && iLon >= 0) || (iX >= 0 && iY >= 0 && rows.slice(0, 50).every(r => Math.abs(IO.num(r[iX])) <= 180 && Math.abs(IO.num(r[iY])) <= 90));
    if (geo || /deg|sec|latitude/i.test(t.header.join(' ') + ' ' + (rows[0] || []).join(' '))) return { kind: 'geo' };
    if (iX >= 0 && iY >= 0 && iZ >= 0 && rows.length >= 20) return { kind: 'topo', cols: [iX, iY, iZ] };
    if (iX >= 0 && iY >= 0) return { kind: 'points2d' };
    // headerless numeric XYZ
    const n3 = t.header.length >= 3 && [0, 1, 2].every(i => isFinite(IO.num(t.header[i]))) && rows.length >= 20; if (n3) return { kind: 'topo', cols: [0, 1, 2], headerless: true };
    // numeric columns with a likely Z (100–9000) and two large coordinates
    const nc = t.header.map((_, i) => i).filter(i => numRatio(rows, i) > 0.9); if (nc.length >= 3 && rows.length >= 50) { const mean = i => rows.slice(0, 50).reduce((a, r) => a + IO.num(r[i]), 0) / 50; const zs = nc.filter(i => mean(i) > -500 && mean(i) < 9000), xy = nc.filter(i => mean(i) > 9000); if (zs.length >= 1 && xy.length >= 2) return { kind: 'topo', cols: [xy[0], xy[1], zs[0]], note: L('columns guessed', 'الأعمدة مُخمّنة') }; }
    return { kind: 'unknown' };
  };

  // ---------------------------------------------------------------- scan a folder
  F.scan = async function (files, onProgress) {
    const items = []; let k = 0;
    for (const f of files) {
      const path = relPath(f), e = ext(f.name), it = { file: f, path, name: f.name, ext: e, size: f.size || 0, kind: 'unknown', note: '', use: true };
      try {
        if (e === 'tmd') it.kind = 'project';
        else if (e === 'str') { const b = new Uint8Array(await f.arrayBuffer()); it.kind = 'str'; it.data = b; if (/comp/i.test(f.name)) { it.note = L('Surpac composites — the database tables are used instead', 'مركبات Surpac — تُستخدم جداول القاعدة بدلاً منها'); it.use = false; } }
        else if (e === 'dtm') { it.kind = 'dtm'; it.data = new Uint8Array(await f.arrayBuffer()); it.strRef = new TextDecoder('latin1').decode(it.data.subarray(0, 200)).split(/[,\r\n]/)[0].toLowerCase(); }
        else if (e === 'grd') { it.kind = 'grid'; it.data = new Uint8Array(await f.arrayBuffer()); }
        else if (e === 'dxf') { it.kind = 'dxf'; it.text = await f.text(); }
        else if (e === 'obj' || e === 'stl') { it.kind = 'mesh'; it.data = new Uint8Array(await f.arrayBuffer()); }
        else if (/^(csv|txt|xyz|xlsx|xlsm|xls|ods)$/.test(e)) {
          const t = await IO.readTable(f); const sheets = t.sheets ? Object.entries(t.sheets) : [['', t]];
          const cls = sheets.map(([sn, st]) => Object.assign({ sheet: sn, table: st }, F.classifyTable(st, f.name))).filter(c => c.kind !== 'unknown');
          if (!cls.length) { it.kind = e === 'txt' ? 'doc' : 'unknown'; }
          else { const c = cls[0]; Object.assign(it, { kind: c.kind, table: c.table, sheet: c.sheet, cls: c }); if (cls.length > 1) it.extra = cls.slice(1); if (c.note) it.note = c.note; }
        }
        else if (DOC.test(e)) it.kind = 'doc';
        else if (INTERNAL.test(e)) { it.kind = 'internal'; it.note = L('internal file of another program (Surpac/Access/…) — skipped', 'ملف داخلي لبرنامج آخر (Surpac/Access/…) — يُتجاهل'); }
      } catch (err) { it.kind = 'unknown'; it.note = err.message; }
      if (['doc', 'internal', 'unknown', 'geo', 'points2d'].includes(it.kind)) it.use = it.kind === 'doc';
      if (it.kind === 'geo') it.note = it.note || L('same data in latitude/longitude — the projected copy is used', 'نفس البيانات بالدرجات — تُستخدم النسخة بالإحداثيات المترية');
      if (it.kind === 'points2d') it.note = it.note || L('X/Y only (no elevation, no hole id) — reference only', 'X/Y فقط بلا منسوب ولا رقم بئر — مرجع فقط');
      items.push(it); if (onProgress) onProgress(++k / files.length); if (k % 10 === 0) await TM.sleep(0);
    }
    F.resolve(items); return items;
  };
  // pick one source per role and pair Surpac files
  F.resolve = function (items) {
    const byName = new Map(items.map(i => [i.name.toLowerCase(), i]));
    for (const it of items.filter(i => i.kind === 'dtm')) { const s = byName.get(it.strRef) || byName.get(base(it.name).toLowerCase() + '.str'); if (s) { it.pair = s; } }
    // topography: survey points > Surpac topo DTM > Surfer grid > DXF; other copies off. Candidates must overlap the collars
    // (same coordinate system) — a copy in another projection is switched off.
    const isTopoName = i => /topo|terrain|dtm_?ground|ground|survey|كنتور|طبوغراف|contour/i.test(i.path);
    const bbox = pts => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const [x, y] of pts) { if (!isFinite(x) || !isFinite(y)) continue; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return isFinite(x0) ? { x0, y0, x1, y1 } : null; };
    const colIt = items.find(i => i.kind === 'collar'); let cb = null;
    if (colIt) { const m = IO.autoMap(colIt.table.header, ['hole', 'x', 'y']); cb = bbox(colIt.table.rows.map(r => [IO.num(r[m.x]), IO.num(r[m.y])])); }
    const candBox = i => { try { if (i.kind === 'topo') { const c = i.cls.cols; return bbox(i.table.rows.slice(0, 3000).map(r => [IO.num(r[c[0]]), IO.num(r[c[1]])])); } if (i.kind === 'grid') { const p = IO.readSurferGrid(i.data, 8); const q = []; for (let k = 0; k < p.length; k += 3) q.push([p[k], p[k + 1]]); return bbox(q); } if (i.kind === 'dtm') { const m = IO.readDTM(i.data, '', i.pair ? i.pair.data : null), q = []; for (let k = 0; k < m.pos.length; k += 3) q.push([m.pos[k], m.pos[k + 1]]); return bbox(q); } } catch (e) { } return null; };
    const overlaps = b => !cb || (b && b.x0 <= cb.x1 + 200 && b.x1 >= cb.x0 - 200 && b.y0 <= cb.y1 + 200 && b.y1 >= cb.y0 - 200);
    const raw = [...items.filter(i => i.kind === 'topo').sort((a, b) => (isTopoName(b) - isTopoName(a)) || ((b.table ? b.table.rows.length : 0) - (a.table ? a.table.rows.length : 0))), ...items.filter(i => i.kind === 'dtm' && isTopoName(i)), ...items.filter(i => i.kind === 'grid')];
    const topoCands = [];
    for (const it of raw) { if (overlaps(candBox(it))) topoCands.push(it); else { it.use = false; it.note = L('does not overlap the drillholes (another coordinate system?) — skipped', 'لا يتداخل مع الآبار (نظام إحداثيات مختلف؟) — يُتجاهل'); } }
    topoCands.forEach((it, k) => { if (k === 0) { it.role = 'topo'; it.note = L('used as the topography', 'يُستخدم كسطح طبوغرافي'); } else { it.use = false; it.note = L('another copy of the topography — skipped', 'نسخة أخرى من الطبوغرافيا — تُتجاهل'); } });
    // a DXF that repeats a Surpac string file of the same name is skipped
    for (const it of items.filter(i => i.kind === 'dxf')) if (byName.has(base(it.name).toLowerCase() + '.str')) { it.use = false; it.note = L('same design as the .str file — skipped', 'نفس التصميم الموجود في ملف ‎.str — يُتجاهل'); }
    if (topoCands.length) for (const it of items.filter(i => i.kind === 'dxf' && isTopoName(i))) { it.use = false; it.note = L('topography drawing — the surveyed points are used instead', 'رسم طبوغرافي — تُستخدم النقاط المرفوعة بدلاً منه'); }
    for (const it of items.filter(i => i.kind === 'str' && isTopoName(i))) if (topoCands.length) { it.use = false; it.note = L('topography contours — the surface is built from the points', 'خطوط كنتور — السطح يُبنى من النقاط'); }
    // one table per drillhole role; duplicates off
    for (const role of ['collar', 'survey', 'assay', 'lith']) { const c = items.filter(i => i.kind === role); c.slice(1).forEach(i => { i.use = false; i.note = L('second ' + role + ' table — check and enable if needed', 'جدول ' + role + ' ثانٍ — راجعه وفعّله عند الحاجة'); }); }
    // borehole logs: duplicate holes/coordinates flagged later during matching
    return items;
  };

  // ---------------------------------------------------------------- import
  function utmZone(lon) { return Math.floor((lon + 180) / 6) + 1; }
  F.utm = function (lon, lat) { const zone = utmZone(lon), a = 6378137, f = 1 / 298.257223563, k0 = 0.9996, e2 = f * (2 - f), ep2 = e2 / (1 - e2), D = Math.PI / 180, l0 = (zone * 6 - 183) * D, p = lat * D, l = lon * D; const N = a / Math.sqrt(1 - e2 * Math.sin(p) ** 2), T = Math.tan(p) ** 2, C = ep2 * Math.cos(p) ** 2, A = Math.cos(p) * (l - l0), M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * p - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * p) + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * p) - (35 * e2 ** 3 / 3072) * Math.sin(6 * p)); return { x: 500000 + k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120), y: (lat < 0 ? 1e7 : 0) + k0 * (M + N * Math.tan(p) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720)), zone }; };

  F.importItems = async function (items, { newProject = true, name } = {}, onProgress) {
    const use = items.filter(i => i.use), report = { done: [], warn: [], skipped: items.filter(i => !i.use).length };
    const proj = use.find(i => i.kind === 'project'); if (proj && newProject) { await TM.openProjectFile(proj.file); report.done.push(L('opened project ', 'فُتح المشروع ') + proj.name); return report; }
    if (newProject) { const P = TM.newProject(name || L('Imported project', 'مشروع مستورد')); TM.setProject(P); }
    const P = TM.P; let step = 0; const tick = async () => { if (onProgress) onProgress(++step / (use.length + 4)); await TM.sleep(0); };
    // 1) surfaces first (topography drives the collars)
    const topo = use.find(i => i.role === 'topo');
    const addSurface = (pts, nm, role) => { const s = { id: TM.uid('srf'), name: nm, role: role && !P.surfaces.some(x => x.role === 'topo') ? 'topo' : 'surface', pts: TM.Surf.dedupe(pts), tri: null, color: '#6b7d5e' }; TM.Surf.ensureTri(s); P.surfaces.push(s); return s; };
    if (topo) {
      try {
        if (topo.kind === 'topo') { const c = topo.cls.cols, pts = []; const rows = topo.cls.headerless ? [topo.table.header].concat(topo.table.rows) : topo.table.rows; for (const r of rows) { const v = c.map(i => IO.num(r[i])); if (v.every(isFinite)) pts.push(...v); } const s = addSurface(pts, base(topo.name), true); report.done.push(L(`topography from ${topo.path}: ${TM.fmt(s.pts.length / 3)} points`, `الطبوغرافيا من ${topo.path}: ${TM.fmt(s.pts.length / 3)} نقطة`)); }
        else if (topo.kind === 'grid') { let st = 1, pts; do { pts = IO.readSurferGrid(topo.data, st); st *= 2; } while (pts.length / 3 > 60000); const s = addSurface(pts, base(topo.name), true); report.done.push(L(`topography from Surfer grid ${topo.path}`, `الطبوغرافيا من شبكة Surfer ‏${topo.path}`) + ` (${TM.fmt(s.pts.length / 3)})`); }
        else if (topo.kind === 'dtm') { const m = IO.readDTM(topo.data, base(topo.name), topo.pair ? topo.pair.data : null); P.surfaces.push({ id: TM.uid('srf'), name: base(topo.name), role: 'topo', pts: m.pos, tri: m.idx, color: '#6b7d5e' }); report.done.push(L('topography from Surpac DTM ', 'الطبوغرافيا من سطح Surpac ') + topo.path); }
        topo.done = true;
      } catch (e) { report.warn.push(topo.path + ': ' + e.message); }
      TM.Surf.rebuildTopo(); await tick();
    }
    // 2) drillhole tables
    const T = {}; const FIELDS = { collar: ['hole', 'x', 'y', 'z', 'depth'], survey: ['hole', 'at', 'az', 'dip'], assay: ['hole', 'from', 'to'], lith: ['hole', 'from', 'to', 'code'] };
    for (const role of ['collar', 'survey', 'assay', 'lith']) { const it = use.find(i => i.kind === role); if (!it) continue; const t = Object.assign({}, it.table); t.map = IO.autoMap(t.header, FIELDS[role]); if (role === 'assay') { t.gradeCols = it.cls.gradeCols; if (it.cls.textCol >= 0 && !use.some(i => i.kind === 'lith')) T.lithFromAssay = true, T.lith = Object.assign({}, it.table, { map: Object.assign(IO.autoMap(t.header, ['hole', 'from', 'to']), { code: it.cls.textCol }) }); } if (role === 'lith' && t.map.code < 0) t.map.code = it.cls.textCol; T[role] = t; it.done = true; report.done.push(`${L(F.KINDS[role].en, F.KINDS[role].ar)}: ${it.path} (${TM.fmt(t.rows.length)})`); await tick(); }
    if (T.collar) {
      const db = TM.Drill.importTables(T); P.db = db; P.settings.gradeField = db.fields[0] || P.settings.gradeField;
      { const names = items.map(i => i.path).join(' '), pref = /kaolin|كاولين|bauxite|بوكسيت|alumin/i.test(names) ? /^al2o3/ : /silica|سيليكا|glass|quartz/i.test(names) ? /^sio2/ : /iron|حديد|hematite|magnetite/i.test(names) ? /^fe/ : null; const f = pref && db.fields.find(x => pref.test(String(x).toLowerCase())); if (f) { P.settings.gradeField = f; report.warn.push(L(`grade field set to ${f} (from the project's commodity in the file names)`, `حقل التركيز ضُبط على ${f} (حسب نوع الخام في أسماء الملفات)`)); } }
      // vertical surveys when none were supplied
      if (!db.surveys.length) { db.collars.forEach(c => db.surveys.push({ id: c.id, at: 0, az: 0, dip: -90 })); report.warn.push(L('no survey file — holes treated as vertical', 'لا يوجد ملف مسح — اعتُبرت الآبار رأسية')); }
      // collar elevations: missing or all identical → drape on topography
      if (TM.rt.tin) { const zs = db.collars.map(c => c.z), flat = zs.every(z => !isFinite(z)) || (zs.length > 2 && Math.max(...zs) - Math.min(...zs) < 0.01); let moved = 0, maxd = 0; if (flat) for (const c of db.collars) { const t = TM.topoZ(c.x, c.y); if (isFinite(t)) { maxd = Math.max(maxd, Math.abs(t - (c.z || t))); c.z = +t.toFixed(2); moved++; } } if (moved) report.warn.push(L(`collar elevations were ${zs.every(z => !isFinite(z)) ? 'missing' : 'all identical'} — ${moved} collars placed on the topography (max shift ${TM.fmt(maxd, 2)} m)`, `مناسيب رؤوس الآبار كانت ${zs.every(z => !isFinite(z)) ? 'مفقودة' : 'متطابقة كلها'} — وُضع ${moved} رأس بئر على سطح الأرض (أقصى فرق ${TM.fmt(maxd, 2)} م)`)); }
      // grade unit guess
      const g = db.assays.map(a => a[P.settings.gradeField]).filter(isFinite).sort((a, b) => a - b); if (g.length) { const med = g[Math.floor(g.length / 2)]; P.settings.gradeUnit = med > 20 || /pct|_%|sio2|fe2o3|al2o3|cao|mgo|p2o5/i.test(P.settings.gradeField) ? '%' : P.settings.gradeUnit; if (P.settings.gradeUnit === '%' && med > 20) { P.settings.cutoff = +g[Math.floor(g.length * 0.25)].toFixed(2); report.warn.push(L(`grade field ${P.settings.gradeField} looks like a percentage (median ${TM.fmt(med, 2)} %) — consider the industrial-mineral economics in Project settings`, `حقل التركيز ${P.settings.gradeField} يبدو نسبة مئوية (الوسيط ${TM.fmt(med, 2)}%) — راجع نموذج الخام الصناعي في إعدادات المشروع`)); } }
    }
    // 3) borehole logs → lithology (matched by coordinates first, then by hole number)
    const logs = use.filter(i => i.kind === 'log');
    if (logs.length && P.db.collars.length) {
      const key = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/([A-Z]+)0*(\d+)/, '$1$2'); const taken = new Map(); const lith = [];
      for (const it of logs) { const lg = it.cls.log; let c = null, how = '';
        if (lg.E != null && lg.N != null) { let best = null; for (const q of P.db.collars) { const d = Math.hypot(q.x - lg.E, q.y - lg.N); if (!best || d < best.d) best = { d, q }; } if (best && best.d < 15) { c = best.q; how = L('coordinates', 'الإحداثيات'); } }
        if (!c && lg.hole) { c = P.db.collars.find(q => key(q.id) === key(lg.hole)); how = L('hole number', 'رقم البئر'); }
        if (!c) { report.warn.push(L(`log ${it.name}: no matching collar`, `الوصف ${it.name}: لا يوجد بئر مطابق`)); continue; }
        if (taken.has(c.id)) { report.warn.push(L(`log ${it.name} repeats ${taken.get(c.id)} (same hole ${c.id}) — ignored`, `الوصف ${it.name} مكرر من ${taken.get(c.id)} (نفس البئر ${c.id}) — تم تجاهله`)); continue; }
        if (lg.hole && key(lg.hole) !== key(c.id)) report.warn.push(L(`log file "${it.name}" (sheet says ${lg.hole}) belongs to collar ${c.id} by ${how} — numbering differs`, `ملف الوصف «${it.name}» (مكتوب داخله ${lg.hole}) يخص البئر ${c.id} حسب ${how} — الترقيم مختلف`));
        taken.set(c.id, it.name); lg.intervals.forEach(v => lith.push({ id: c.id, from: v.from, to: Math.min(v.to, c.depth || v.to), code: F.lithCode(v.desc), desc: v.desc })); it.done = true; await tick(); }
      if (!P.db.lith.length || (T.lithFromAssay && lith.length)) { if (P.db.lith.length) report.warn.push(L(`lithology taken from the field logs (richer than the assay table's "${T.lith.header[T.lith.map.code]}" column)`, `الصخارة مأخوذة من أوصاف الحقل (أدق من عمود «${T.lith.header[T.lith.map.code]}» في جدول التحاليل)`)); P.db.lith = lith; } else report.warn.push(L('a lithology table exists — logs kept only for reference', 'يوجد جدول صخارة — الأوصاف للمرجع فقط'));
      const miss = P.db.collars.filter(q => !taken.has(q.id)).map(q => q.id); if (miss.length && lith.length) report.warn.push(L(`no log for: ${miss.join(', ')}`, `لا يوجد وصف للآبار: ${miss.join('، ')}`));
      report.done.push(L(`${taken.size} borehole logs → lithology`, `${taken.size} وصف بئر ← صخارة`));
    }
    // 4) geometry: Surpac DTMs/strings, DXF, meshes, Datamine, extra grids
    for (const it of use.filter(i => !i.done)) {
      try {
        const nm = base(it.name);
        if (it.kind === 'dtm' && /boundar|lease|licen|study|حدود/i.test(nm) && it.pair && it.pair.use) { report.warn.push(L(`${it.path}: boundary wireframe not made into a solid — its outline is kept as a string`, `${it.path}: نطاق الحدود لم يُحوَّل لمجسم — حدوده محفوظة كخط`)); continue; }
        if (it.kind === 'dtm') { const m = IO.readDTM(it.data, nm, it.pair ? it.pair.data : null); if (TM.Solid.isClosed(m).closed) { P.solids.push(TM.Solid.make(nm, m, { source: 'Surpac DTM', color: /ob|overburden|waste/i.test(nm) ? '#A16207' : /dump/i.test(nm) ? '#F2B740' : '#A78BFA' })); report.done.push(L(`solid ${nm}: ${TM.fmt(TM.Solid.volume(m))} m³`, `مجسم ${nm}: ${TM.fmt(TM.Solid.volume(m))} م³`)); } else { P.surfaces.push({ id: TM.uid('srf'), name: nm, role: 'surface', pts: m.pos, tri: m.idx, color: '#8fa6c4' }); report.done.push(L('surface ', 'سطح ') + nm); } if (it.pair) it.pair.used = true; }
        else if (it.kind === 'str') { const ss = IO.readSTR(it.data, nm); ss.forEach((s, k) => { s.name = ss.length > 1 ? `${nm}_${k + 1}` : nm; s.color = /pit/i.test(nm) ? '#34D399' : /limit|lease|licen|boundary/i.test(nm) ? '#F87171' : /dump/i.test(nm) ? '#F2B740' : '#F59E0B'; }); P.strings.push(...ss); report.done.push(L(`${ss.length} strings from ${it.path}`, `${ss.length} خط من ${it.path}`)); }
        else if (it.kind === 'dxf') { const r = IO.readDXF(it.text); r.strings.forEach(s => P.strings.push({ id: TM.uid('str'), name: s.name || nm, closed: s.closed, pts: s.pts, color: '#F59E0B', strNo: 1 })); if (r.faces.length) P.solids.push(TM.Solid.make(nm, IO.facesToMesh(r.faces, nm), { source: 'DXF', color: '#A78BFA' })); report.done.push(L(`DXF ${it.path}: ${r.strings.length} strings, ${r.faces.length} faces`, `DXF ‏${it.path}: ${r.strings.length} خط، ${r.faces.length} وجه`)); }
        else if (it.kind === 'mesh') { const m = it.ext === 'stl' ? IO.readSTL(it.data, nm) : IO.readOBJ(new TextDecoder().decode(it.data), nm); P.solids.push(TM.Solid.make(nm, m, { source: it.ext.toUpperCase(), color: '#A78BFA' })); report.done.push(L('solid ', 'مجسم ') + nm); }
        else if (it.kind === 'grid') { const pts = IO.readSurferGrid(it.data, 2); addSurface(pts, nm, false); report.done.push(L('surface from grid ', 'سطح من شبكة ') + nm); }
        else if (it.kind === 'datamine') { const r = IO.readDatamine(await it.file.text(), nm); P.strings.push(...r.strings); if (r.points.length >= 9) addSurface(r.points, nm, false); report.done.push('Datamine ' + it.path); }
        else if (it.kind === 'topo') { const c = it.cls.cols, pts = []; for (const r of it.table.rows) { const v = c.map(i => IO.num(r[i])); if (v.every(isFinite)) pts.push(...v); } if (pts.length >= 9) { addSurface(pts, nm, false); report.done.push(L('surface ', 'سطح ') + nm); } }
        else if (it.kind === 'doc') { (P.docs = P.docs || []).push({ name: it.name, path: it.path, size: it.size }); }
        it.done = true;
      } catch (e) { report.warn.push(`${it.path}: ${e.message}`); }
      await tick();
    }
    if ((P.docs || []).length) report.done.push(L(`${P.docs.length} documents/images listed as project references`, `${P.docs.length} مستند/صورة سُجّلت كمراجع للمشروع`));
    TM.setProject(P); TM.logHistory('importFolder', `${use.length} files`);
    if (P.db.collars.length) { const v = TM.WF.validate(); report.validation = v; }
    return report;
  };

  // ---------------------------------------------------------------- UI
  F.pickFolder = () => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.webkitdirectory = true; i.multiple = true; i.onchange = () => res([...i.files]); i.click(); });
  F.dialog = async function () {
    const UI = TM.UI, App = TM.App, esc = TM.esc; const files = await F.pickFolder(); if (!files || !files.length) return;
    const items = await UI.run(L(`Reading ${files.length} files…`, `جارٍ قراءة ${files.length} ملفاً…`), p => F.scan(files, p));
    const ORDER = ['project', 'collar', 'survey', 'assay', 'lith', 'log', 'topo', 'grid', 'dtm', 'str', 'dxf', 'mesh', 'datamine', 'points2d', 'geo', 'doc', 'internal', 'unknown']; items.sort((a, b) => (b.use - a.use) || (ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)) || a.path.localeCompare(b.path));
    const root = (files[0].webkitRelativePath || '').split('/')[0] || L('Imported project', 'مشروع مستورد');
    const body = document.createElement('div'); const kinds = Object.keys(F.KINDS);
    const count = k => items.filter(i => i.kind === k).length;
    body.innerHTML = `<p class="hint">${L('Every file was opened and classified. Uncheck what you do not want, or change a type, then import. Duplicates (same topography in several formats, repeated logs) are switched off automatically.', 'تم فتح كل ملف وتصنيفه. ألغِ تحديد ما لا تريده أو غيّر نوعه ثم استورد. النسخ المكررة (نفس الطبوغرافيا بعدة صيغ، الأوصاف المكررة) أُلغيت تلقائياً.')}</p>
      <div class="kgrid">${['collar', 'survey', 'assay', 'log', 'topo', 'dtm', 'str', 'doc'].map(k => `<div class="kbox"><div class="kpi-k">${esc(L(F.KINDS[k].en, F.KINDS[k].ar))}</div><div class="kpi-v">${count(k)}</div></div>`).join('')}</div>
      <label class="fld"><span>${L('Project name', 'اسم المشروع')}</span><input id="fdName" value="${esc(root)}"></label>
      <div class="tbl-wrap"><table><thead><tr><th></th><th>${L('File', 'الملف')}</th><th>${L('Detected as', 'النوع')}</th><th>${L('Note', 'ملاحظة')}</th></tr></thead><tbody>${items.map((it, i) => `<tr class="${it.use ? '' : 'sev-info'}"><td><input type="checkbox" data-use="${i}" ${it.use ? 'checked' : ''}></td><td style="direction:ltr;text-align:left;font-family:var(--f-mono);font-size:11px">${esc(it.path)}${it.sheet ? ' · ' + esc(it.sheet) : ''}</td><td><select class="sel" data-kind="${i}">${kinds.map(k => `<option value="${k}" ${k === it.kind ? 'selected' : ''}>${esc(L(F.KINDS[k].en, F.KINDS[k].ar))}</option>`).join('')}</select></td><td style="font-size:11.5px">${esc(it.note || (it.pair ? L('paired with ', 'مرتبط بـ ') + it.pair.name : ''))}</td></tr>`).join('')}</tbody></table></div>`;
    body.addEventListener('change', e => { const u = e.target.dataset.use, k = e.target.dataset.kind; if (u != null) items[+u].use = e.target.checked; if (k != null) { items[+k].kind = e.target.value; items[+k].use = true; } });
    UI.modal({ title: L('Import a whole project folder', 'استيراد مجلد مشروع كامل') + ` — ${files.length}`, body, wide: true, actions: [
      { label: L('Add to current project', 'إضافة للمشروع الحالي'), fn: () => go(false) },
      { label: L('Import as new project', 'استيراد كمشروع جديد'), primary: true, fn: () => go(true) }] });
    async function go(isNew) {
      if (isNew && TM.rt.dirty && !(await App.confirm(L('Discard unsaved changes?', 'تجاهل التغييرات غير المحفوظة؟')))) return;
      const nm = body.querySelector('#fdName').value; UI.closeModal(true);
      const rep = await UI.run(L('Importing the folder…', 'جارٍ استيراد المجلد…'), p => F.importItems(items, { newProject: isNew, name: nm }, p));
      App.afterLoad(); App.refreshAll(true);
      const v = rep.validation; const html = `<h4>${L('Imported', 'تم استيراده')}</h4><ul>${rep.done.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${rep.warn.length ? `<h4>${L('Checks & automatic fixes', 'ملاحظات وإصلاحات تلقائية')}</h4><ul>${rep.warn.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${v ? `<p class="hint">${L(`Validation: ${v.errors} errors, ${v.warnings} warnings.`, `التحقق: ${v.errors} خطأ و${v.warnings} تحذير.`)}</p>` : ''}<p class="hint">${L(`${rep.skipped} files skipped (internal files, duplicates or unchecked).`, `تُجوهل ${rep.skipped} ملفاً (ملفات داخلية أو مكررة أو غير محددة).`)}</p>`;
      UI.modal({ title: L('Folder import report', 'تقرير استيراد المجلد'), wide: true, body: `<div class="help-doc">${html}</div>`, actions: v && (v.errors || v.warnings) ? [{ label: L('Open validation report', 'فتح تقرير التحقق'), primary: true, fn: () => App.showIssues() }] : [] });
      TM.AI.addMsg('bot', L(`<b>Folder imported</b>: ${rep.done.length} items, ${rep.warn.length} notes.`, `<b>تم استيراد المجلد</b>: ${rep.done.length} عنصراً و${rep.warn.length} ملاحظة.`));
    }
  };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
