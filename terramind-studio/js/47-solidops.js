/* TerraMind Studio — wireframe tools: triangulate between section strings, end caps, Booleans, solid reports. */
(function (TM) {
  'use strict';
  const W = TM.Wire = {};
  const d3 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

  W.resample = function (pts, n, closed) {
    const P = closed ? pts.concat([pts[0]]) : pts, A = [0]; for (let i = 1; i < P.length; i++) A.push(A[i - 1] + d3(P[i - 1], P[i]));
    const tot = A[A.length - 1], out = []; const m = closed ? n : n - 1;
    for (let q = 0; q < n; q++) { const s = tot * q / m; let i = 1; while (i < A.length - 1 && A[i] < s) i++; const t = (s - A[i - 1]) / ((A[i] - A[i - 1]) || 1); out.push([0, 1, 2].map(k => P[i - 1][k] + (P[i][k] - P[i - 1][k]) * t)); }
    return out;
  };
  // best rotation/orientation of ring B to match ring A (both length n)
  W.align = function (A, B) {
    const n = A.length; let best = null;
    for (const rev of [false, true]) { const Bb = rev ? B.slice().reverse() : B; for (let sh = 0; sh < n; sh++) { let s = 0; for (let i = 0; i < n; i++) s += d3(A[i], Bb[(i + sh) % n]); if (!best || s < best.s) best = { s, rev, sh }; } }
    const Bb = best.rev ? B.slice().reverse() : B; return Bb.map((_, i) => Bb[(i + best.sh) % n]);
  };
  // Newell normal and ear-clipping triangulation of a (roughly planar) ring
  W.capRing = function (ring) {
    const n = ring.length; let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < n; i++) { const a = ring[i], b = ring[(i + 1) % n]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); }
    const ax = Math.abs(nx) > Math.abs(ny) && Math.abs(nx) > Math.abs(nz) ? 0 : Math.abs(ny) > Math.abs(nz) ? 1 : 2; const u = (ax + 1) % 3, v = (ax + 2) % 3;
    const p2 = ring.map(p => [p[u], p[v]]); let area = 0; for (let i = 0, j = n - 1; i < n; j = i++) area += (p2[j][0] + p2[i][0]) * (p2[j][1] - p2[i][1]); const ccw = area < 0;
    const idx = ring.map((_, i) => i), tris = []; const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const inTri = (p, a, b, c) => { const d1 = cross(a, b, p), d2 = cross(b, c, p), d3_ = cross(c, a, p); return !((d1 < 0 || d2 < 0 || d3_ < 0) && (d1 > 0 || d2 > 0 || d3_ > 0)); };
    let guard = 0;
    while (idx.length > 3 && guard++ < 10000) {
      let cut = false;
      for (let k = 0; k < idx.length; k++) {
        const ia = idx[(k - 1 + idx.length) % idx.length], ib = idx[k], ic = idx[(k + 1) % idx.length]; const a = p2[ia], b = p2[ib], c = p2[ic]; const cr = cross(a, b, c);
        if (ccw ? cr <= 0 : cr >= 0) continue; if (idx.some(q => q !== ia && q !== ib && q !== ic && inTri(p2[q], a, b, c))) continue;
        tris.push([ia, ib, ic]); idx.splice(k, 1); cut = true; break;
      }
      if (!cut) { for (let k = 1; k + 1 < idx.length; k++) tris.push([idx[0], idx[k], idx[k + 1]]); break; }
    }
    if (idx.length === 3) tris.push([idx[0], idx[1], idx[2]]);
    return tris;
  };
  // Build a closed solid from ≥2 closed section strings (ordered); n = points per ring
  W.fromSections = function (strings, n = 64, capEnds = true) {
    if (strings.length < 2) throw new Error(TM.L('Select at least two closed strings (sections).', 'اختر خطين مغلقين على الأقل.'));
    const rings = []; for (const s of strings) { const r = W.resample(s.pts, n, true); rings.push(rings.length ? W.align(rings[rings.length - 1], r) : r); }
    const pos = [], idx = []; rings.forEach(r => r.forEach(p => pos.push(p[0], p[1], p[2])));
    for (let k = 0; k + 1 < rings.length; k++) for (let i = 0; i < n; i++) { const a = k * n + i, b = k * n + (i + 1) % n, c = (k + 1) * n + i, d = (k + 1) * n + (i + 1) % n; idx.push(a, b, d, a, d, c); }
    if (capEnds) { const first = W.capRing(rings[0]); first.forEach(t => idx.push(t[0], t[2], t[1])); const off = (rings.length - 1) * n; W.capRing(rings[rings.length - 1]).forEach(t => idx.push(off + t[0], off + t[1], off + t[2])); }
    return { pos: new Float64Array(pos), idx: new Uint32Array(idx) };
  };
  // Order section strings along their principal direction (centroid PCA)
  W.orderSections = function (strings) {
    const C = strings.map(s => TM.Str.centroid(s.pts)); const m = TM.Str.centroid(C); const cov = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    C.forEach(c => { for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) cov[a][b] += (c[a] - m[a]) * (c[b] - m[b]); });
    const e = TM.eig3(cov); let k = 0; for (let i = 1; i < 3; i++) if (e.values[i] > e.values[k]) k = i; const ax = [e.vectors[0][k], e.vectors[1][k], e.vectors[2][k]];
    return strings.map((s, i) => [s, (C[i][0] - m[0]) * ax[0] + (C[i][1] - m[1]) * ax[1] + (C[i][2] - m[2]) * ax[2]]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  };

  // Voxel Boolean between two closed solids: op = 'union' | 'intersect' | 'subtract'
  W.boolean = function (a, b, op, cell = 2) {
    const bb = s => { let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity; for (let i = 0; i < s.pos.length; i += 3) { x0 = Math.min(x0, s.pos[i]); x1 = Math.max(x1, s.pos[i]); y0 = Math.min(y0, s.pos[i + 1]); y1 = Math.max(y1, s.pos[i + 1]); z0 = Math.min(z0, s.pos[i + 2]); z1 = Math.max(z1, s.pos[i + 2]); } return { x0, y0, z0, x1, y1, z1 }; };
    const A = bb(a), B = bb(b), x0 = Math.min(A.x0, B.x0) - cell, y0 = Math.min(A.y0, B.y0) - cell, z0 = Math.min(A.z0, B.z0) - cell;
    const nx = Math.ceil((Math.max(A.x1, B.x1) + cell - x0) / cell), ny = Math.ceil((Math.max(A.y1, B.y1) + cell - y0) / cell), nz = Math.ceil((Math.max(A.z1, B.z1) + cell - z0) / cell);
    if (nx * ny * nz > 1.2e7) throw new Error(TM.L('Too many voxels — use a larger cell size.', 'عدد الفوكسلات كبير — استخدم خلية أكبر.'));
    const f = new Float32Array(nx * ny * nz);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + (i + .5) * cell, y = y0 + (j + .5) * cell, za = TM.Solid.columnCrossings(a, x, y), zb = TM.Solid.columnCrossings(b, x, y);
      for (let k = 0; k < nz; k++) { const z = z0 + (k + .5) * cell; const ia = TM.Solid.insideFromCrossings(za, z), ib = TM.Solid.insideFromCrossings(zb, z); const r = op === 'union' ? ia || ib : op === 'intersect' ? ia && ib : ia && !ib; f[i + nx * (j + ny * k)] = r ? 1 : -1; }
    }
    const m = TM.Solid.surfaceNets({ f, nx, ny, nz, x0, y0, z0, cs: [cell, cell, cell] }, 0); return TM.Solid.smooth(m, 2, 0.5);
  };
  // Tonnes / grade of the block model inside a solid
  W.report = function (s, cog = 0) {
    const bm = TM.P.bm, out = { name: s.name, volume: TM.Solid.volume(s), area: TM.Solid.area(s), closed: TM.Solid.isClosed(s).closed };
    out.tonnes = out.volume * TM.P.settings.density;
    if (bm) { const d = bm.def; let t = 0, m = 0; for (let j = 0; j < d.ny; j++) for (let i = 0; i < d.nx; i++) { const x = d.x0 + (i + .5) * d.dx, y = d.y0 + (j + .5) * d.dy, zs = TM.Solid.columnCrossings(s, x, y); if (!zs.length) continue; for (let k = 0; k < d.nz; k++) { const id = i + d.nx * (j + d.ny * k), g = bm.grade[id]; if (!(g >= cog)) continue; if (!TM.Solid.insideFromCrossings(zs, d.z0 + (k + .5) * d.dz)) continue; const tt = TM.Est.blockTonnes(bm, id); t += tt; m += tt * g; } } out.bm_tonnes = t; out.bm_grade = t ? m / t : 0; out.bm_oz = m / 31.1035; }
    return out;
  };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
