/* TerraMind Studio — drillhole database: desurvey, validation, compositing, statistics, demo data. */
(function (TM) {
  'use strict';
  const D = TM.Drill = {};
  const D2R = TM.D2R;

  const dirv = (az, dip) => [Math.sin(az * D2R) * Math.cos(dip * D2R), Math.cos(az * D2R) * Math.cos(dip * D2R), Math.sin(dip * D2R)];

  // Minimum-curvature desurvey. dip negative = downward.
  D.desurvey = function (collar, surveys) {
    let sv = surveys.filter(s => isFinite(s.at) && isFinite(s.az) && isFinite(s.dip)).sort((a, b) => a.at - b.at);
    if (!sv.length) sv = [{ at: 0, az: 0, dip: -90 }];
    if (sv[0].at > 0) sv.unshift({ at: 0, az: sv[0].az, dip: sv[0].dip });
    const end = Math.max(collar.depth || 0, sv[sv.length - 1].at);
    if (sv[sv.length - 1].at < end) sv.push({ at: end, az: sv[sv.length - 1].az, dip: sv[sv.length - 1].dip });
    const st = [{ md: 0, x: collar.x, y: collar.y, z: collar.z, t: dirv(sv[0].az, sv[0].dip) }];
    for (let i = 1; i < sv.length; i++) {
      const a = st[i - 1], t2 = dirv(sv[i].az, sv[i].dip), dmd = sv[i].at - sv[i - 1].at;
      const dot = TM.clamp(a.t[0] * t2[0] + a.t[1] * t2[1] + a.t[2] * t2[2], -1, 1); const b = Math.acos(dot);
      const rf = b > 1e-7 ? 2 / b * Math.tan(b / 2) : 1;
      st.push({ md: sv[i].at, x: a.x + dmd / 2 * (a.t[0] + t2[0]) * rf, y: a.y + dmd / 2 * (a.t[1] + t2[1]) * rf, z: a.z + dmd / 2 * (a.t[2] + t2[2]) * rf, t: t2 });
    }
    return st;
  };
  D.posAt = function (st, md) {
    if (md <= 0) return [st[0].x, st[0].y, st[0].z];
    let i = 1; while (i < st.length - 1 && st[i].md < md) i++;
    const a = st[i - 1], b = st[i]; const f = b.md > a.md ? (md - a.md) / (b.md - a.md) : 0;
    if (md > b.md) { const e = md - b.md; return [b.x + b.t[0] * e, b.y + b.t[1] * e, b.z + b.t[2] * e]; }
    return [a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, a.z + (b.z - a.z) * f];
  };

  // Rebuild runtime holes from P.db
  D.rebuild = function () {
    const P = TM.P, db = P.db, gf = P.settings.gradeField;
    const sv = groupBy(db.surveys), as = groupBy(db.assays), li = groupBy(db.lith);
    TM.rt.holes = db.collars.map((c, idx) => {
      const st = D.desurvey(c, sv.get(c.id) || []);
      const samples = (as.get(c.id) || []).slice().sort((a, b) => a.from - b.from).map(a => {
        const m = (a.from + a.to) / 2, p = D.posAt(st, m); return { ref: a, from: a.from, to: a.to, g: a[gf], x: p[0], y: p[1], z: p[2] };
      });
      const lith = (li.get(c.id) || []).slice().sort((a, b) => a.from - b.from);
      return { idx, id: c.id, collar: c, st, samples, lith, depth: c.depth };
    });
    TM.rt.comps = null; TM.emit('holes');
  };
  function groupBy(arr) { const m = new Map(); for (const r of arr) { let a = m.get(r.id); if (!a) m.set(r.id, a = []); a.push(r); } return m; }
  D.lithAt = function (h, md) { for (const l of h.lith) if (md >= l.from && md < l.to) return l.code; return ''; };

  // ---------------------------------------------------------------- import from tables
  // tables: {collar:{header,rows,map}, survey:..., assay:..., lith:...}
  D.importTables = function (t, opts = {}) {
    const N = TM.IO.num, db = { collars: [], surveys: [], assays: [], lith: [], fields: [] };
    const col = (row, i) => i >= 0 ? row[i] : undefined;
    if (t.collar) { const m = t.collar.map; for (const r of t.collar.rows) { const id = String(col(r, m.hole) || '').trim(); if (!id) continue; db.collars.push({ id, x: N(col(r, m.x)), y: N(col(r, m.y)), z: N(col(r, m.z)), depth: N(col(r, m.depth)) }); } }
    if (t.survey) { const m = t.survey.map; for (const r of t.survey.rows) { const id = String(col(r, m.hole) || '').trim(); if (!id) continue; db.surveys.push({ id, at: N(col(r, m.at)), az: N(col(r, m.az)), dip: N(col(r, m.dip)) }); } }
    // dip convention: if every dip is positive, the file uses "positive down"
    if (db.surveys.length && db.surveys.every(s => !(s.dip < 0))) db.surveys.forEach(s => s.dip = -Math.abs(s.dip));
    if (t.assay) {
      const m = t.assay.map; const gcols = t.assay.gradeCols || [];
      db.fields = gcols.map(i => t.assay.header[i].toLowerCase().replace(/[^\w]+/g, '_'));
      for (const r of t.assay.rows) { const id = String(col(r, m.hole) || '').trim(); if (!id) continue; const a = { id, from: N(col(r, m.from)), to: N(col(r, m.to)) }; gcols.forEach((ci, k) => a[db.fields[k]] = N(r[ci])); db.assays.push(a); }
    }
    if (t.lith) { const m = t.lith.map; for (const r of t.lith.rows) { const id = String(col(r, m.hole) || '').trim(); if (!id) continue; db.lith.push({ id, from: N(col(r, m.from)), to: N(col(r, m.to)), code: String(col(r, m.code) || '').trim() }); } }
    // collars without depth: take deepest interval
    for (const c of db.collars) if (!isFinite(c.depth)) { let d = 0; for (const a of db.assays) if (a.id === c.id) d = Math.max(d, a.to); for (const s of db.surveys) if (s.id === c.id) d = Math.max(d, s.at); c.depth = d; }
    return db;
  };

  // ---------------------------------------------------------------- validation
  D.validate = function () {
    const P = TM.P, db = P.db, gf = P.settings.gradeField, issues = [];
    const add = (sev, hole, table, msg) => issues.push({ sev, hole, table, msg });
    const ids = new Set(), dupC = new Set();
    for (const c of db.collars) { if (ids.has(c.id)) dupC.add(c.id); ids.add(c.id); if (![c.x, c.y, c.z].every(isFinite)) add('error', c.id, 'collar', TM.L('Missing collar coordinates', 'إحداثيات الطوق ناقصة')); if (!(c.depth > 0)) add('error', c.id, 'collar', TM.L('Missing or zero total depth', 'العمق الكلي مفقود أو صفر')); }
    dupC.forEach(id => add('error', id, 'collar', TM.L('Duplicate collar ID', 'رقم طوق مكرر')));
    const surveyed = new Set(db.surveys.map(s => s.id));
    for (const s of db.surveys) { if (!ids.has(s.id)) add('error', s.id, 'survey', TM.L('Survey for unknown hole', 'مسح لبئر غير موجود')); if (!(s.dip >= -90 && s.dip <= 90) || !(s.az >= 0 && s.az <= 360)) add('error', s.id, 'survey', TM.L(`Invalid azimuth/dip at ${s.at} m`, `سمت/ميل غير صالح عند ${s.at} م`)); }
    for (const c of db.collars) if (!surveyed.has(c.id)) add('warn', c.id, 'survey', TM.L('No survey — treated as vertical', 'لا يوجد مسح — يعامل كبئر رأسي'));
    // dog-leg severity
    const sv = groupBy(db.surveys);
    sv.forEach((arr, id) => { arr.sort((a, b) => a.at - b.at); for (let i = 1; i < arr.length; i++) { const a = dirv(arr[i - 1].az, arr[i - 1].dip), b = dirv(arr[i].az, arr[i].dip); const ang = Math.acos(TM.clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1)) / D2R; const dl = ang / Math.max(arr[i].at - arr[i - 1].at, 1e-6) * 30; if (dl > 6) add('warn', id, 'survey', TM.L(`Dog-leg ${TM.fmt(dl, 1)}°/30 m at ${arr[i].at} m`, `انحراف حاد ${TM.fmt(dl, 1)}°/30م عند ${arr[i].at} م`)); } });
    const depth = new Map(db.collars.map(c => [c.id, c.depth]));
    const checkIntervals = (rows, table) => {
      const g = groupBy(rows);
      g.forEach((arr, id) => {
        if (!ids.has(id)) { add('error', id, table, TM.L(`${arr.length} interval(s) for unknown hole`, `${arr.length} فترة لبئر غير موجود`)); return; }
        arr.sort((a, b) => a.from - b.from || a.to - b.to);
        for (let i = 0; i < arr.length; i++) {
          const r = arr[i];
          if (!(r.to > r.from)) add('error', id, table, TM.L(`From ≥ To at ${r.from} m`, `من ≥ إلى عند ${r.from} م`));
          if (r.to > (depth.get(id) || Infinity) + 0.01) add('warn', id, table, TM.L(`Interval ${r.from}–${r.to} m beyond total depth`, `الفترة ${r.from}–${r.to} م بعد العمق الكلي`));
          if (i) { const p = arr[i - 1]; if (r.from === p.from && r.to === p.to) add('error', id, table, TM.L(`Duplicate interval ${r.from}–${r.to} m`, `فترة مكررة ${r.from}–${r.to} م`)); else if (r.from < p.to - 1e-6) add('error', id, table, TM.L(`Overlap ${r.from}–${p.to} m`, `تداخل ${r.from}–${p.to} م`)); else if (r.from > p.to + 1e-6 && table === 'assay') add('info', id, table, TM.L(`Gap ${p.to}–${r.from} m (unsampled)`, `فجوة ${p.to}–${r.from} م (غير معاينة)`)); }
        }
      });
    };
    checkIntervals(db.assays, 'assay'); checkIntervals(db.lith, 'lith');
    const vals = db.assays.map(a => a[gf]).filter(isFinite);
    if (vals.length) {
      const st = TM.stats(vals); const lim = Math.max(st.p99 * 2.5, st.median * 15);
      for (const a of db.assays) { const v = a[gf]; if (v < 0) add('error', a.id, 'assay', TM.L(`Negative ${gf} at ${a.from} m`, `قيمة سالبة عند ${a.from} م`)); else if (v > lim) add('warn', a.id, 'assay', TM.L(`Extreme ${gf} = ${TM.fmt(v, 2)} at ${a.from} m (> ${TM.fmt(lim, 1)})`, `قيمة متطرفة ${TM.fmt(v, 2)} عند ${a.from} م`)); }
    }
    const missing = db.assays.filter(a => !isFinite(a[gf])).length; if (missing) add('info', '—', 'assay', TM.L(`${missing} interval(s) without ${gf} value`, `${missing} فترة بدون قيمة ${gf}`));
    return issues;
  };
  D.fix = function ({ overlaps = true, duplicates = true, clipDepth = true } = {}) {
    const db = TM.P.db, depth = new Map(db.collars.map(c => [c.id, c.depth])); let nO = 0, nD = 0, nC = 0;
    const fixRows = rows => {
      const g = groupBy(rows), out = [];
      g.forEach((arr, id) => {
        arr.sort((a, b) => a.from - b.from || a.to - b.to); let prev = null;
        for (const r of arr) {
          if (duplicates && prev && r.from === prev.from && r.to === prev.to) { nD++; continue; }
          if (overlaps && prev && r.from < prev.to) { r.from = prev.to; nO++; }
          if (clipDepth && depth.has(id) && r.to > depth.get(id)) { r.to = depth.get(id); nC++; }
          if (r.to - r.from > 1e-6) { out.push(r); prev = r; }
        }
      });
      return out;
    };
    db.assays = fixRows(db.assays); db.lith = fixRows(db.lith); D.rebuild(); TM.touch('db');
    return { overlaps: nO, duplicates: nD, clipped: nC };
  };

  // ---------------------------------------------------------------- compositing
  D.composite = function (len = TM.P.settings.compLen, opts = {}) {
    const gf = TM.P.settings.gradeField, cap = TM.P.settings.topCut, out = [];
    for (const h of TM.rt.holes) {
      const sm = h.samples.filter(s => isFinite(s.g)); if (!sm.length) continue;
      const start = Math.floor(sm[0].from / len) * len, end = sm[sm.length - 1].to;
      for (let a = start; a < end - 1e-6; a += len) {
        const b = a + len; let sl = 0, sg = 0;
        for (const s of sm) { if (s.to <= a || s.from >= b) continue; const ov = Math.min(s.to, b) - Math.max(s.from, a); const g = cap ? Math.min(s.g, cap) : s.g; sl += ov; sg += ov * g; }
        if (sl < len * 0.5) continue;
        const m = (a + b) / 2, p = D.posAt(h.st, m), lith = D.lithAt(h, m);
        if (opts.lith && opts.lith.length && !opts.lith.includes(lith)) continue;
        out.push({ hole: h.idx, id: h.id, from: a, to: b, x: p[0], y: p[1], z: p[2], g: sg / sl, len: sl, lith });
      }
    }
    TM.rt.comps = out; return out;
  };
  D.comps = () => TM.rt.comps || D.composite();

  // Top-cut suggestion: percentile + coefficient-of-variation rule
  D.suggestTopCut = function () {
    const v = TM.rt.holes.flatMap(h => h.samples.map(s => s.g)).filter(isFinite); if (!v.length) return null;
    const st = TM.stats(v); const p = st.cv > 2 ? st.p975 : st.cv > 1.2 ? st.p99 : st.max;
    return { value: +(+p).toPrecision(3), stats: st, nAbove: v.filter(x => x > p).length };
  };

  // ---------------------------------------------------------------- demo project (synthetic, clearly labelled)
  D.makeDemo = function () {
    const R = TM.rng(20261015), P = TM.newProject(TM.L('Wadi Gold — demo', 'وادي الذهب — مشروع تجريبي'));
    const X0 = 5000, Y0 = 8000; // local grid origin
    const topo = (e, n) => 318 + 12 * Math.sin((e - X0) / 90 + 0.6) + 9 * Math.cos((n - Y0) / 75 - 0.3) + 6 * Math.sin((e - X0 + n - Y0) / 130) + 0.025 * (n - Y0 - 300);
    const C = [X0 + 300, Y0 + 300, 215], A = 140, T = 24, W = 85;
    const SV = [Math.sin(60 * D2R), Math.cos(60 * D2R), 0];
    const DV = [Math.sin(150 * D2R) * Math.cos(55 * D2R), Math.cos(150 * D2R) * Math.cos(55 * D2R), -Math.sin(55 * D2R)];
    const NV = [SV[1] * DV[2] - SV[2] * DV[1], SV[2] * DV[0] - SV[0] * DV[2], SV[0] * DV[1] - SV[1] * DV[0]];
    const loc = (e, n, z) => { const d = [e - C[0], n - C[1], z - C[2]]; return { u: d[0] * SV[0] + d[1] * SV[1] + d[2] * SV[2], w: d[0] * DV[0] + d[1] * DV[1] + d[2] * DV[2], v: d[0] * NV[0] + d[1] * NV[1] + d[2] * NV[2] }; };
    const truth = (e, n, z) => { const L = loc(e, n, z), r2 = (L.u / A) ** 2 + (L.v / T) ** 2 + (L.w / W) ** 2; let g; if (r2 < 1) { const core = Math.pow(1 - r2, 1.3), shoot = Math.exp(-((L.u - 0.6 * L.w - 25) ** 2) / (2 * 34 * 34)); g = 0.4 + 2.0 * core + 3.2 * core * shoot; } else g = 0.16 * Math.exp(-(Math.sqrt(r2) - 1) * 2.4) + 0.015; return { g: g * Math.exp(R.gauss() * 0.36 - 0.065), r2, v: L.v }; };
    // topography survey points (grid + random spot heights)
    const pts = [];
    for (let j = 0; j <= 30; j++) for (let i = 0; i <= 30; i++) { const e = X0 + i * 20 + (R() - .5) * 6, n = Y0 + j * 20 + (R() - .5) * 6; pts.push(e, n, +(topo(e, n) + R.gauss() * 0.15).toFixed(2)); }
    for (let k = 0; k < 600; k++) { const e = X0 + R() * 600, n = Y0 + R() * 600; pts.push(e, n, +topo(e, n).toFixed(2)); }
    P.surfaces.push({ id: TM.uid('srf'), name: 'Topography', role: 'topo', pts: new Float64Array(pts), tri: null, color: '#6b7d5e', source: 'survey points' });
    // drill programme: 5 sections × 5 holes along strike, inclined toward NNW with realistic deviation
    let hn = 0; const holes = [];
    for (const u of [-120, -60, 0, 60, 120]) for (const w of [-70, -35, 0, 35, 70]) {
      if (Math.abs(u) === 120 && Math.abs(w) === 70) continue;
      hn++; const id = 'WG' + String(hn).padStart(3, '0');
      const tu = u + R.gauss() * 6, tw = w + R.gauss() * 6; const Tg = [0, 1, 2].map(k => C[k] + SV[k] * tu + DV[k] * tw);
      const az0 = 330 + R.gauss() * 3, dip0 = -(60 + R.gauss() * 2); const t0 = dirv(az0, dip0);
      let L = (topo(Tg[0], Tg[1]) - Tg[2]) / -t0[2]; for (let it = 0; it < 8; it++) { const p = [Tg[0] - t0[0] * L, Tg[1] - t0[1] * L, Tg[2] - t0[2] * L]; L += (topo(p[0], p[1]) - p[2]) / -t0[2]; }
      const cx = Tg[0] - t0[0] * L, cy = Tg[1] - t0[1] * L, cz = topo(cx, cy); const depth = Math.round((L + 40 + R() * 30) / 2) * 2;
      P.db.collars.push({ id, x: +cx.toFixed(2), y: +cy.toFixed(2), z: +cz.toFixed(2), depth });
      // downhole surveys every 30 m: gentle lift and right-hand drift (typical RC/DD behaviour)
      for (let at = 0; at <= depth; at += 30) P.db.surveys.push({ id, at, az: +(az0 + at * 0.025 + R.gauss() * 0.3).toFixed(1), dip: +(dip0 + at * 0.018 + R.gauss() * 0.2).toFixed(1) });
      holes.push(id);
    }
    // assays + lithology from the truth model along the desurveyed traces
    const svg = groupBy(P.db.surveys);
    for (const c of P.db.collars) {
      const st = D.desurvey(c, svg.get(c.id)); let curL = null;
      for (let d = 0; d < c.depth; d += 2) {
        const p = D.posAt(st, d + 1), t = truth(p[0], p[1], p[2]);
        P.db.assays.push({ id: c.id, from: d, to: d + 2, au: +Math.max(0.005, t.g).toFixed(3) });
        const code = t.r2 < 1 ? 'QV' : (p[2] > topo(p[0], p[1]) - 22 ? 'OX' : (t.v > 0 ? 'SCH' : 'GD'));
        if (curL && curL.code === code) curL.to = d + 2; else { curL = { id: c.id, from: d, to: d + 2, code }; P.db.lith.push(curL); }
      }
    }
    // planted QA/QC problems, so the validator and the AI auditor have something real to find
    const h8 = P.db.assays.filter(a => a.id === 'WG008'); let mx = h8[0]; h8.forEach(a => { if (a.au > mx.au) mx = a; }); mx.au = 42.5;
    const h3 = P.db.assays.filter(a => a.id === 'WG003'); h3[30].from -= 1;
    const h11 = P.db.assays.filter(a => a.id === 'WG011'); P.db.assays.push(Object.assign({}, h11[40]));
    P.db.fields = ['au'];
    // strings: lease boundary + existing haul road
    P.strings.push({ id: TM.uid('str'), name: 'Lease_boundary', strNo: 1, closed: true, color: '#F87171', pts: [[X0 + 20, Y0 + 20], [X0 + 580, Y0 + 20], [X0 + 580, Y0 + 580], [X0 + 20, Y0 + 580]].map(p => [p[0], p[1], topo(p[0], p[1]) + 1]) });
    const road = []; for (let k = 0; k <= 20; k++) { const e = X0 + 40 + k * 26, n = Y0 + 60 + 40 * Math.sin(k / 4); road.push([e, n, topo(e, n) + 0.5]); }
    P.strings.push({ id: TM.uid('str'), name: 'Haul_road_existing', strNo: 2, closed: false, color: '#A7B1C2', pts: road });
    P.settings.compLen = 2;
    return P;
  };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
