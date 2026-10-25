/* TerraMind Studio — CAD string editing (Surpac-style "Edit" tools), measurement and undo/redo. */
(function (TM) {
  'use strict';
  const L = (a, b) => TM.L(a, b), fmt = TM.fmt;

  // ---------------------------------------------------------------- undo / redo (project geometry snapshots)
  const U = TM.Undo = { stack: [], redo: [], max: 60 };
  const snap = () => ({ strings: JSON.parse(JSON.stringify(TM.P.strings)), solids: TM.P.solids.slice(), surfaces: TM.P.surfaces.slice(), infill: (TM.P.settings.infill || []).slice(), blast: TM.P.blast ? JSON.parse(JSON.stringify(TM.P.blast)) : null, design: TM.P.design || null });
  const restore = s => { TM.P.strings = s.strings; TM.P.solids = s.solids; TM.P.surfaces = s.surfaces; TM.P.settings.infill = s.infill; TM.P.blast = s.blast; TM.P.design = s.design; TM.Surf.rebuildTopo(); TM.emit('geometryRestored'); TM.touch('strings'); };
  U.push = label => { if (!TM.P) return; U.stack.push({ label, s: snap() }); if (U.stack.length > U.max) U.stack.shift(); U.redo.length = 0; };
  U.undo = () => { const e = U.stack.pop(); if (!e) return null; U.redo.push({ label: e.label, s: snap() }); restore(e.s); return e.label; };
  U.redoOne = () => { const e = U.redo.pop(); if (!e) return null; U.stack.push({ label: e.label, s: snap() }); restore(e.s); return e.label; };
  U.clear = () => { U.stack.length = 0; U.redo.length = 0; };

  // ---------------------------------------------------------------- pure string geometry
  const S = TM.Str = {};
  const d2 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]), d3 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  S.ring = (s) => s.closed ? s.pts.concat([s.pts[0]]) : s.pts;
  S.length = (s, three = true) => { const P = S.ring(s); let l = 0; for (let i = 1; i < P.length; i++) l += three ? d3(P[i - 1], P[i]) : d2(P[i - 1], P[i]); return l; };
  S.signedArea = pts => { let a = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]); return a / 2; };
  S.area = pts => Math.abs(S.signedArea(pts));
  S.centroid = pts => { const n = pts.length; return [0, 1, 2].map(k => pts.reduce((a, p) => a + p[k], 0) / n); };
  S.bearing = (a, b) => ((Math.atan2(b[0] - a[0], b[1] - a[1]) / TM.D2R) + 360) % 360;
  S.measure = (a, b) => { const h = d2(a, b), dz = b[2] - a[2]; return { slope: d3(a, b), horizontal: h, dz, bearing: S.bearing(a, b), gradient: h ? dz / h * 100 : null, dip: Math.atan2(dz, h) / TM.D2R }; };
  S.densify = (pts, step, closed) => { const P = closed ? pts.concat([pts[0]]) : pts, out = [P[0]]; for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], n = Math.max(1, Math.ceil(d3(a, b) / step)); for (let k = 1; k <= n; k++) out.push([0, 1, 2].map(j => a[j] + (b[j] - a[j]) * k / n)); } if (closed) out.pop(); return out; };
  S.simplify = (pts, tol, closed) => {
    if (pts.length < 3) return pts.slice(); const P = closed ? pts.concat([pts[0]]) : pts, keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1;
    const segD = (p, a, b) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2; const t = l2 ? TM.clamp(((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / l2, 0, 1) : 0; return d3(p, [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t]); };
    const st = [[0, P.length - 1]]; while (st.length) { const [i, j] = st.pop(); let md = 0, mi = -1; for (let k = i + 1; k < j; k++) { const dd = segD(P[k], P[i], P[j]); if (dd > md) { md = dd; mi = k; } } if (md > tol) { keep[mi] = 1; st.push([i, mi], [mi, j]); } }
    const out = P.filter((_, i) => keep[i]); if (closed) out.pop(); return out;
  };
  S.smooth = (pts, iters = 2, closed) => { let P = pts; for (let it = 0; it < iters; it++) { const n = P.length, out = []; if (!closed) out.push(P[0]); for (let i = 0; i < (closed ? n : n - 1); i++) { const a = P[i], b = P[(i + 1) % n]; out.push([0, 1, 2].map(k => .75 * a[k] + .25 * b[k]), [0, 1, 2].map(k => .25 * a[k] + .75 * b[k])); } if (!closed) out.push(P[n - 1]); P = out; } return P; };
  // Planar (XY) offset with miter joins; positive d = to the right of travel direction (outward for clockwise polygons)
  S.offset = (pts, d, closed, miterLimit = 4) => {
    const n = pts.length; if (n < 2) return pts.slice(); const out = [];
    const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l]; };
    for (let i = 0; i < n; i++) {
      const prev = closed ? pts[(i - 1 + n) % n] : pts[Math.max(0, i - 1)], next = closed ? pts[(i + 1) % n] : pts[Math.min(n - 1, i + 1)], p = pts[i];
      const n1 = i === 0 && !closed ? nrm(p, next) : nrm(prev, p), n2 = i === n - 1 && !closed ? nrm(prev, p) : nrm(p, next);
      let mx = n1[0] + n2[0], my = n1[1] + n2[1]; const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml; const cos = mx * n1[0] + my * n1[1]; const k = Math.min(miterLimit, 1 / Math.max(cos, 1e-6));
      out.push([p[0] + mx * d * k, p[1] + my * d * k, p[2]]);
    }
    return out;
  };
  S.translate = (pts, dx, dy, dz) => pts.map(p => [p[0] + dx, p[1] + dy, p[2] + dz]);
  S.rotate = (pts, deg, c) => { c = c || S.centroid(pts); const a = -deg * TM.D2R, ca = Math.cos(a), sa = Math.sin(a); return pts.map(p => { const x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * ca - y * sa, c[1] + x * sa + y * ca, p[2]]; }); };
  S.drape = (pts, off = 0) => pts.map(p => { const z = TM.topoZ(p[0], p[1]); return [p[0], p[1], isFinite(z) ? z + off : p[2]]; });
  // Clip a polyline/polygon by a closed boundary polygon → list of polylines kept inside (or outside)
  S.clip = (s, poly, keepInside = true) => {
    const P0 = S.ring(s), step = Math.max(0.05, S.length({ pts: P0, closed: false }, false) / 2000), P = S.densify(P0, step, false), inside = p => TM.Surf.pointInPoly(p[0], p[1], poly) === keepInside, out = []; let cur = null;
    const cross = (a, b) => { let lo = 0, hi = 1; const ia = inside(a); for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2, q = [0, 1, 2].map(j => a[j] + (b[j] - a[j]) * m); if (inside(q) === ia) lo = m; else hi = m; } return [0, 1, 2].map(j => a[j] + (b[j] - a[j]) * (lo + hi) / 2); };
    for (let i = 0; i < P.length; i++) {
      const p = P[i], ip = inside(p);
      if (i > 0) { const a = P[i - 1], ia = inside(a); if (ia && !ip) { cur.push(cross(a, p)); out.push(cur); cur = null; } else if (!ia && ip) { cur = [cross(a, p)]; } }
      if (ip) { if (!cur) cur = []; cur.push(p); }
    }
    if (cur && cur.length > 1) out.push(cur);
    return out.filter(l => l.length > 1).map(l => S.simplify(l, 1e-6, false));
  };
  S.split = (s, vi) => { if (s.closed) { const pts = s.pts.slice(vi).concat(s.pts.slice(0, vi + 1)); return [Object.assign({}, s, { closed: false, pts })]; } return [Object.assign({}, s, { pts: s.pts.slice(0, vi + 1) }), Object.assign({}, s, { id: TM.uid('str'), name: s.name + '_b', pts: s.pts.slice(vi) })]; };
  S.join = (a, b) => { const A = a.pts, B = b.pts; const opts = [[A, B, d3(A[A.length - 1], B[0])], [A, B.slice().reverse(), d3(A[A.length - 1], B[B.length - 1])], [A.slice().reverse(), B, d3(A[0], B[0])], [B, A, d3(B[B.length - 1], A[0])]].sort((p, q) => p[2] - q[2]); return opts[0][0].concat(opts[0][1]); };
  // Signed-area orientation: make polygon clockwise (so positive offset = outward)
  S.clockwise = pts => S.signedArea(pts) < 0 ? pts.slice() : pts.slice().reverse();

  // ---------------------------------------------------------------- interactive CAD tool
  const C = TM.CAD = { mode: null, sel: null, vi: -1, measurePts: [] };
  const VP = () => TM.VP, UI = () => TM.UI;
  C.visibleStrings = () => TM.P.strings.filter(s => TM.VP.vis.strings && !TM.VP.hidden.has(s.id));
  C.screenPick = function (sx, sy) {
    let best = null;
    for (const s of C.visibleStrings()) {
      const scr = s.pts.map(p => VP().toScreen(p[0], p[1], p[2]));
      scr.forEach((q, i) => { if (!q.front) return; const d = Math.hypot(q.x - sx, q.y - sy); if (d < 11 && (!best || best.kind !== 'vertex' || d < best.d)) best = { kind: 'vertex', s, vi: i, d }; });
      if (best && best.kind === 'vertex') continue;
      const n = scr.length, segs = s.closed ? n : n - 1;
      for (let i = 0; i < segs; i++) { const a = scr[i], b = scr[(i + 1) % n]; if (!a.front || !b.front) continue; const vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy || 1; const t = TM.clamp(((sx - a.x) * vx + (sy - a.y) * vy) / l2, 0, 1); const d = Math.hypot(a.x + vx * t - sx, a.y + vy * t - sy); if (d < 8 && (!best || d < best.d)) best = { kind: 'segment', s, seg: i, t, d }; }
    }
    return best;
  };
  C.highlight = function () {
    const v = VP(); v.dispose('cadSel'); if (!C.sel && !C.measurePts.length) return; const g = new THREE.Group();
    if (C.sel) { const s = C.sel; const P = S.ring(s).map(p => v.V3(p[0], p[1], p[2] + 0.3)); g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(P), new THREE.LineBasicMaterial({ color: 0x67E8F9 })));
      const pts = new THREE.Points(new THREE.BufferGeometry().setFromPoints(s.pts.map(p => v.V3(p[0], p[1], p[2] + 0.3))), new THREE.PointsMaterial({ color: 0x67E8F9, size: 7, sizeAttenuation: false })); g.add(pts);
      if (C.vi >= 0 && s.pts[C.vi]) { const q = s.pts[C.vi]; const m = new THREE.Points(new THREE.BufferGeometry().setFromPoints([v.V3(q[0], q[1], q[2] + 0.3)]), new THREE.PointsMaterial({ color: 0xF87171, size: 12, sizeAttenuation: false })); g.add(m); } }
    if (C.measurePts.length) { const P = C.measurePts.map(p => v.V3(p[0], p[1], p[2] + 0.5)); g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(P), new THREE.LineDashedMaterial({ color: 0xFDE68A, dashSize: 3, gapSize: 2 }))); g.children[g.children.length - 1].computeLineDistances(); g.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(P), new THREE.PointsMaterial({ color: 0xFDE68A, size: 9, sizeAttenuation: false }))); }
    v.put('cadSel', g);
  };
  C.select = function (s, vi = -1) { C.sel = s; C.vi = vi; C.highlight(); TM.emit('cadSelect', s); if (s) TM.UI.inspect({ kind: 'string', ref: s, vi }); };
  C.setMode = function (mode) {
    C.mode = mode; C.measurePts = []; const v = VP();
    if (!mode) { v.tool = null; C.highlight(); document.querySelector('#view').classList.remove('sketching'); TM.emit('cadMode', null); return; }
    document.querySelector('#view').classList.add('sketching');
    let drag = null;
    v.tool = {
      down(e, c) { if (C.mode !== 'move') return false; const h = C.screenPick(c.sx, c.sy); if (h && h.kind === 'vertex') { TM.Undo.push(L('Move vertex', 'تحريك نقطة')); C.select(h.s, h.vi); drag = { s: h.s, vi: h.vi, z: h.s.pts[h.vi][2] }; return true; } return false; },
      move(e) { if (!drag) return false; const w = v.rayToZ(e, drag.z); if (!w) return true; const snapTo = e.shiftKey ? C.snapVertex(w, drag.s, drag.vi) : null; const p = snapTo || [w.x, w.y, drag.z]; drag.s.pts[drag.vi] = [+p[0].toFixed(3), +p[1].toFixed(3), +(e.altKey ? (TM.topoZ(p[0], p[1]) || p[2]) : p[2]).toFixed(3)]; v.buildStrings(); C.highlight(); return true; },
      up(e, c) {
        if (drag) { drag = null; TM.touch('strings'); C.select(C.sel, C.vi); return true; }
        if (!c.click) return false; const h = C.screenPick(c.sx, c.sy);
        if (C.mode === 'select') { C.select(h ? h.s : null, h && h.kind === 'vertex' ? h.vi : -1); return true; }
        if (C.mode === 'insert' && h && h.kind === 'segment') { TM.Undo.push(L('Insert vertex', 'إدراج نقطة')); const s = h.s, a = s.pts[h.seg], b = s.pts[(h.seg + 1) % s.pts.length]; s.pts.splice(h.seg + 1, 0, [0, 1, 2].map(k => +(a[k] + (b[k] - a[k]) * h.t).toFixed(3))); TM.touch('strings'); C.select(s, h.seg + 1); return true; }
        if (C.mode === 'delete' && h && h.kind === 'vertex') { TM.Undo.push(L('Delete vertex', 'حذف نقطة')); h.s.pts.splice(h.vi, 1); if (h.s.pts.length < 2) TM.P.strings = TM.P.strings.filter(x => x !== h.s); TM.touch('strings'); C.select(h.s.pts.length >= 2 ? h.s : null); return true; }
        if (C.mode === 'measure') { const hv = h && h.kind === 'vertex' ? h.s.pts[h.vi] : null; const p = hv || (() => { const w = v.surfacePoint(e); return w ? [w.x, w.y, w.z] : null; })(); if (!p) return true; C.measurePts.push(p); C.highlight(); C.reportMeasure(); return true; }
        return false;
      },
      dbl() { if (C.mode === 'measure') { C.measurePts = []; C.highlight(); return true; } return false; }
    };
    TM.emit('cadMode', mode);
    TM.UI.toast({ select: L('Select: click a string or vertex. Del deletes, Esc exits.', 'تحديد: انقر خطاً أو نقطة. Del للحذف وEsc للخروج.'), move: L('Move: drag a vertex (Shift = snap to vertex, Alt = drape to DTM).', 'تحريك: اسحب نقطة (Shift للالتقاط، Alt للإسقاط على السطح).'), insert: L('Insert: click on a segment to add a vertex.', 'إدراج: انقر على قطعة لإضافة نقطة.'), delete: L('Delete: click a vertex to remove it.', 'حذف: انقر نقطة لحذفها.'), measure: L('Measure: click points (vertices snap). Double-click to restart.', 'قياس: انقر النقاط. نقرة مزدوجة لإعادة البدء.') }[mode]);
  };
  C.snapVertex = function (w, skipS, skipI) { let best = null; for (const s of C.visibleStrings()) s.pts.forEach((p, i) => { if (s === skipS && i === skipI) return; const d = Math.hypot(p[0] - w.x, p[1] - w.y); if (d < 5 && (!best || d < best.d)) best = { p, d }; }); return best ? best.p.slice() : null; };
  C.reportMeasure = function () {
    const P = C.measurePts; if (P.length < 2) { TM.UI.toast(`E ${fmt(P[0][0], 2)} N ${fmt(P[0][1], 2)} RL ${fmt(P[0][2], 2)}`); return; }
    const m = S.measure(P[P.length - 2], P[P.length - 1]); let tot = 0; for (let i = 1; i < P.length; i++) tot += d3(P[i - 1], P[i]);
    const area = P.length > 2 ? S.area(P) : 0;
    TM.UI.toast(L(`Segment ${fmt(m.horizontal, 2)} m horiz · ${fmt(m.slope, 2)} m slope · ΔZ ${fmt(m.dz, 2)} · bearing ${fmt(m.bearing, 1)}° · grade ${m.gradient != null ? fmt(m.gradient, 1) + '%' : '—'} · total ${fmt(tot, 2)} m${area ? ` · area ${fmt(area, 1)} m²` : ''}`, `القطعة ${fmt(m.horizontal, 2)} م أفقي · ${fmt(m.slope, 2)} م مائل · ΔZ ${fmt(m.dz, 2)} · السمت ${fmt(m.bearing, 1)}° · الانحدار ${m.gradient != null ? fmt(m.gradient, 1) + '%' : '—'} · المجموع ${fmt(tot, 2)} م${area ? ` · المساحة ${fmt(area, 1)} م²` : ''}`));
  };
  // Operations on the selected string (each pushes undo)
  C.need = () => { if (!C.sel) throw new Error(L('Select a string first (CAD → Select).', 'حدّد خطاً أولاً (CAD ← تحديد).')); return C.sel; };
  C.apply = function (label, fn) { const s = C.need(); TM.Undo.push(label); const r = fn(s); TM.touch('strings'); C.select(TM.P.strings.includes(s) ? s : null); return r; };
  C.props = function (s) { const P = s.pts; const r = { name: s.name, string_no: s.strNo, closed: s.closed, vertices: P.length, length_3d: S.length(s, true), length_2d: S.length(s, false) }; if (s.closed) { r.area = S.area(P); r.perimeter = S.length(s, false); } const zs = P.map(p => p[2]); r.z_min = Math.min(...zs); r.z_max = Math.max(...zs); return r; };
  if (typeof document !== 'undefined') document.addEventListener('keydown', e => {
    if (!C.mode || /input|textarea|select/i.test(document.activeElement.tagName)) return;
    if (e.key === 'Escape') { C.setMode(null); C.select(null); }
    if (false && e.key === 'Delete' && C.sel) { TM.Undo.push(L('Delete', 'حذف')); if (C.vi >= 0) { C.sel.pts.splice(C.vi, 1); if (C.sel.pts.length < 2) TM.P.strings = TM.P.strings.filter(x => x !== C.sel); } else TM.P.strings = TM.P.strings.filter(x => x !== C.sel); TM.touch('strings'); C.select(null); }
  });
  TM.on('geometryRestored', () => { if (C.sel && !TM.P.strings.includes(C.sel)) C.select(null); });
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
