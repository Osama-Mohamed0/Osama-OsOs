/* TerraMind Studio — DTM/TIN surfaces: Delaunay triangulation, elevation lookup, contours, cut & fill. */
(function (TM) {
  'use strict';
  const S = TM.Surf = {};

  S.triangulate = function (pts) {
    const n = pts.length / 3; const xy = new Float64Array(n * 2);
    for (let i = 0; i < n; i++) { xy[i * 2] = pts[i * 3]; xy[i * 2 + 1] = pts[i * 3 + 1]; }
    if (typeof Delaunator === 'undefined') throw new Error('Delaunator not loaded');
    const d = new Delaunator(xy); return new Uint32Array(d.triangles);
  };

  // TIN with a uniform bucket grid for fast z(x,y)
  S.TIN = function (pts, tri) {
    const n = tri.length / 3; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let i = 0; i < pts.length; i += 3) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]); z0 = Math.min(z0, pts[i + 2]); z1 = Math.max(z1, pts[i + 2]); }
    const G = Math.max(8, Math.round(Math.sqrt(n / 2))); const cw = (x1 - x0) / G || 1, ch = (y1 - y0) / G || 1; const cells = Array.from({ length: G * G }, () => []);
    for (let t = 0; t < n; t++) {
      const a = tri[t * 3] * 3, b = tri[t * 3 + 1] * 3, c = tri[t * 3 + 2] * 3;
      const tx0 = Math.min(pts[a], pts[b], pts[c]), tx1 = Math.max(pts[a], pts[b], pts[c]), ty0 = Math.min(pts[a + 1], pts[b + 1], pts[c + 1]), ty1 = Math.max(pts[a + 1], pts[b + 1], pts[c + 1]);
      const i0 = TM.clamp(Math.floor((tx0 - x0) / cw), 0, G - 1), i1 = TM.clamp(Math.floor((tx1 - x0) / cw), 0, G - 1), j0 = TM.clamp(Math.floor((ty0 - y0) / ch), 0, G - 1), j1 = TM.clamp(Math.floor((ty1 - y0) / ch), 0, G - 1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) cells[i + G * j].push(t);
    }
    const tin = { pts, tri, x0, y0, x1, y1, z0, z1, G, cw, ch, cells, nTri: n };
    tin.z = function (x, y) {
      const i = Math.floor((x - x0) / cw), j = Math.floor((y - y0) / ch); if (!(i >= 0 && j >= 0 && i < G && j < G)) return NaN;
      for (const t of cells[i + G * j]) {
        const a = tri[t * 3] * 3, b = tri[t * 3 + 1] * 3, c = tri[t * 3 + 2] * 3;
        const ax = pts[a], ay = pts[a + 1], bx = pts[b], by = pts[b + 1], cx = pts[c], cy = pts[c + 1];
        const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(det) < 1e-12) continue;
        const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / det, l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / det, l3 = 1 - l1 - l2;
        if (l1 >= -1e-9 && l2 >= -1e-9 && l3 >= -1e-9) return l1 * pts[a + 2] + l2 * pts[b + 2] + l3 * pts[c + 2];
      }
      return NaN;
    };
    tin.area = function () { let A = 0; for (let t = 0; t < n; t++) { const a = tri[t * 3] * 3, b = tri[t * 3 + 1] * 3, c = tri[t * 3 + 2] * 3; A += Math.abs((pts[b] - pts[a]) * (pts[c + 1] - pts[a + 1]) - (pts[c] - pts[a]) * (pts[b + 1] - pts[a + 1])) / 2; } return A; };
    return tin;
  };

  S.ensureTri = function (s) { if (!s.tri || !s.tri.length) s.tri = S.triangulate(s.pts); return s; };
  S.tinOf = function (s) { if (!s._rtTin) { S.ensureTri(s); s._rtTin = S.TIN(s.pts, s.tri); } return s._rtTin; };
  S.topo = () => TM.P && TM.P.surfaces.find(s => s.role === 'topo');
  S.rebuildTopo = function () { const s = S.topo(); TM.rt.tin = s ? S.tinOf(s) : null; TM.emit('topo'); };
  // Elevation of topography; falls back to highest collar if no DTM.
  TM.topoZ = function (x, y) { const t = TM.rt.tin; if (t) { const z = t.z(x, y); if (isFinite(z)) return z; } return NaN; };

  // Build a DTM from strings and/or point clouds
  S.fromStrings = function (strings, name) {
    const pts = []; for (const s of strings) for (const p of s.pts) pts.push(p[0], p[1], p[2]);
    // densify long segments so breaklines are honoured approximately
    for (const s of strings) { const P = s.closed ? s.pts.concat([s.pts[0]]) : s.pts; for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const k = Math.floor(L / 10); for (let j = 1; j < k; j++) { const f = j / k; pts.push(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f); } } }
    const s = { id: TM.uid('srf'), name, role: 'surface', pts: dedupe(pts), tri: null, color: '#7aa9f8' };
    S.ensureTri(s); return s;
  };
  function dedupe(arr) { const seen = new Set(), out = []; for (let i = 0; i < arr.length; i += 3) { const k = Math.round(arr[i] * 100) + ',' + Math.round(arr[i + 1] * 100); if (seen.has(k)) continue; seen.add(k); out.push(arr[i], arr[i + 1], arr[i + 2]); } return new Float64Array(out); }
  S.dedupe = dedupe;

  // Contours: returns [{z, lines:[[x,y,z],...]}]
  S.contours = function (tin, interval, opts = {}) {
    const { pts, tri, nTri } = tin; const out = []; const z0 = Math.ceil(tin.z0 / interval) * interval;
    for (let lv = z0; lv <= tin.z1; lv += interval) {
      const segs = [];
      for (let t = 0; t < nTri; t++) {
        const ids = [tri[t * 3] * 3, tri[t * 3 + 1] * 3, tri[t * 3 + 2] * 3]; const cut = [];
        for (let e = 0; e < 3; e++) { const a = ids[e], b = ids[(e + 1) % 3]; const za = pts[a + 2] - lv, zb = pts[b + 2] - lv; if ((za > 0) !== (zb > 0)) { const f = za / (za - zb); cut.push([pts[a] + (pts[b] - pts[a]) * f, pts[a + 1] + (pts[b + 1] - pts[a + 1]) * f, lv]); } }
        if (cut.length === 2) segs.push(cut);
      }
      out.push({ z: lv, lines: S.chain(segs) });
    }
    return out;
  };
  // Join segments into polylines
  S.chain = function (segs) {
    const key = p => Math.round(p[0] * 1000) + ',' + Math.round(p[1] * 1000); const ends = new Map(); const used = new Uint8Array(segs.length);
    segs.forEach((s, i) => { for (const p of s) { const k = key(p); let a = ends.get(k); if (!a) ends.set(k, a = []); a.push(i); } });
    const lines = [];
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue; used[i] = 1; const line = [segs[i][0], segs[i][1]];
      for (const dir of [1, 0]) {
        for (;;) {
          const tip = dir ? line[line.length - 1] : line[0]; const cand = (ends.get(key(tip)) || []).find(j => !used[j]); if (cand == null) break; used[cand] = 1;
          const s = segs[cand]; const nxt = key(s[0]) === key(tip) ? s[1] : s[0]; if (dir) line.push(nxt); else line.unshift(nxt);
        }
      }
      lines.push(line);
    }
    return lines;
  };

  S.pointInPoly = function (x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  S.polyArea = poly => { let a = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]); return Math.abs(a / 2); };

  // Cut & fill inside polygon: design = number (flat pad RL) or a TIN. Returns m³.
  S.cutFill = function (poly, design, cell = 2) {
    const tin = TM.rt.tin; if (!tin) throw new Error(TM.L('No topography surface', 'لا يوجد سطح طبوغرافي'));
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of poly) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    let cut = 0, fill = 0, area = 0;
    for (let y = y0 + cell / 2; y < y1; y += cell) for (let x = x0 + cell / 2; x < x1; x += cell) {
      if (!S.pointInPoly(x, y, poly)) continue; const zt = tin.z(x, y); const zd = typeof design === 'number' ? design : design.z(x, y); if (!isFinite(zt) || !isFinite(zd)) continue;
      area += cell * cell; const d = zt - zd; if (d > 0) cut += d * cell * cell; else fill -= d * cell * cell;
    }
    return { cut, fill, net: cut - fill, area };
  };
  // Volume between two surfaces over their common area (e.g. pre/post-mining)
  S.volumeBetween = function (top, bottom, cell = 4) {
    let cut = 0, fill = 0; const x0 = Math.max(top.x0, bottom.x0), x1 = Math.min(top.x1, bottom.x1), y0 = Math.max(top.y0, bottom.y0), y1 = Math.min(top.y1, bottom.y1);
    for (let y = y0 + cell / 2; y < y1; y += cell) for (let x = x0 + cell / 2; x < x1; x += cell) { const a = top.z(x, y), b = bottom.z(x, y); if (!isFinite(a) || !isFinite(b)) continue; const d = a - b; if (d > 0) cut += d * cell * cell; else fill -= d * cell * cell; }
    return { cut, fill, net: cut - fill };
  };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
