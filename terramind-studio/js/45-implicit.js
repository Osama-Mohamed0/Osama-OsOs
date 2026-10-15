/* TerraMind Studio — solids: RBF implicit modelling, isosurfaces (surface nets), volume, point-in-solid. */
(function (TM) {
  'use strict';
  const S = TM.Solid = {};

  // Surface nets on a scalar grid (positive = inside). grid: {f, nx, ny, nz, x0, y0, z0, cs}
  S.surfaceNets = function (G, iso = 0) {
    const { f, nx, ny, nz, x0, y0, z0 } = G; const cx = G.cs[0], cy = G.cs[1], cz = G.cs[2];
    const val = (i, j, k) => (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) ? -1e-3 - Math.abs(iso) : f[i + nx * (j + ny * k)] - iso;
    const W = nx + 1, H = ny + 1, vid = new Int32Array(W * H * (nz + 1)).fill(-1), cid = (i, j, k) => (i + 1) + W * ((j + 1) + H * (k + 1));
    const pos = [], cr = new Float64Array(8); const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    for (let k = -1; k < nz; k++) for (let j = -1; j < ny; j++) for (let i = -1; i < nx; i++) {
      let mask = 0; for (let c = 0; c < 8; c++) { const v = val(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1)); cr[c] = v; if (v > 0) mask |= 1 << c; }
      if (mask === 0 || mask === 255) continue;
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const [a, b] of E) { const va = cr[a], vb = cr[b]; if ((va > 0) === (vb > 0)) continue; const t = va / (va - vb); sx += (a & 1) + ((b & 1) - (a & 1)) * t; sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t; sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t; n++; }
      vid[cid(i, j, k)] = pos.length / 3; pos.push(x0 + (i + sx / n + .5) * cx, y0 + (j + sy / n + .5) * cy, z0 + (k + sz / n + .5) * cz);
    }
    const idx = [], ax = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    for (let k = -1; k < nz; k++) for (let j = -1; j < ny; j++) for (let i = -1; i < nx; i++) {
      const v0 = val(i, j, k);
      for (let a = 0; a < 3; a++) {
        const d = ax[a], v1 = val(i + d[0], j + d[1], k + d[2]); if ((v0 > 0) === (v1 > 0)) continue;
        const b = ax[(a + 1) % 3], c = ax[(a + 2) % 3], p = [i, j, k]; if (p[(a + 1) % 3] < 0 || p[(a + 2) % 3] < 0) continue;
        const q0 = vid[cid(i, j, k)], q1 = vid[cid(i - b[0], j - b[1], k - b[2])], q2 = vid[cid(i - b[0] - c[0], j - b[1] - c[1], k - b[2] - c[2])], q3 = vid[cid(i - c[0], j - c[1], k - c[2])];
        if (q0 < 0 || q1 < 0 || q2 < 0 || q3 < 0) continue;
        if (v0 > 0) idx.push(q0, q2, q1, q0, q3, q2); else idx.push(q0, q1, q2, q0, q2, q3);
      }
    }
    return { pos: new Float64Array(pos), idx: new Uint32Array(idx) };
  };
  // Laplacian smoothing (keeps topology)
  S.smooth = function (m, iters = 2, lam = 0.5) {
    const n = m.pos.length / 3, nb = Array.from({ length: n }, () => new Set());
    for (let t = 0; t < m.idx.length; t += 3) { const a = m.idx[t], b = m.idx[t + 1], c = m.idx[t + 2]; nb[a].add(b).add(c); nb[b].add(a).add(c); nb[c].add(a).add(b); }
    for (let it = 0; it < iters; it++) { const np = m.pos.slice(); for (let i = 0; i < n; i++) { if (!nb[i].size) continue; let sx = 0, sy = 0, sz = 0; nb[i].forEach(j => { sx += m.pos[j * 3]; sy += m.pos[j * 3 + 1]; sz += m.pos[j * 3 + 2]; }); const k = nb[i].size; np[i * 3] += lam * (sx / k - m.pos[i * 3]); np[i * 3 + 1] += lam * (sy / k - m.pos[i * 3 + 1]); np[i * 3 + 2] += lam * (sz / k - m.pos[i * 3 + 2]); } m.pos = np; }
    return m;
  };
  S.volume = function (m) { const P = m.pos, I = m.idx; let v = 0; for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3; v += P[a] * (P[b + 1] * P[c + 2] - P[b + 2] * P[c + 1]) - P[a + 1] * (P[b] * P[c + 2] - P[b + 2] * P[c]) + P[a + 2] * (P[b] * P[c + 1] - P[b + 1] * P[c]); } return Math.abs(v / 6); };
  S.area = function (m) { const P = m.pos, I = m.idx; let A = 0; for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3; const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2]; A += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2; } return A; };
  S.isClosed = function (m) { const e = new Map(); for (let t = 0; t < m.idx.length; t += 3) for (let k = 0; k < 3; k++) { const a = m.idx[t + k], b = m.idx[t + (k + 1) % 3]; const key = a < b ? a + '_' + b : b + '_' + a; e.set(key, (e.get(key) || 0) + 1); } let open = 0; e.forEach(v => { if (v % 2) open++; }); return { closed: open === 0, badEdges: open }; };

  // Vertical-ray crossings for point-in-solid tests (xy bucket index cached on the solid)
  function index(m) {
    if (m._rtIdx) return m._rtIdx; const P = m.pos, I = m.idx; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < P.length; i += 3) { x0 = Math.min(x0, P[i]); x1 = Math.max(x1, P[i]); y0 = Math.min(y0, P[i + 1]); y1 = Math.max(y1, P[i + 1]); }
    const G = Math.max(4, Math.round(Math.sqrt(I.length / 3 / 4))), cw = (x1 - x0) / G || 1, ch = (y1 - y0) / G || 1, cells = Array.from({ length: G * G }, () => []);
    for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3; const i0 = TM.clamp(Math.floor((Math.min(P[a], P[b], P[c]) - x0) / cw), 0, G - 1), i1 = TM.clamp(Math.floor((Math.max(P[a], P[b], P[c]) - x0) / cw), 0, G - 1), j0 = TM.clamp(Math.floor((Math.min(P[a + 1], P[b + 1], P[c + 1]) - y0) / ch), 0, G - 1), j1 = TM.clamp(Math.floor((Math.max(P[a + 1], P[b + 1], P[c + 1]) - y0) / ch), 0, G - 1); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) cells[i + G * j].push(t); }
    return m._rtIdx = { x0, y0, x1, y1, G, cw, ch, cells };
  }
  S.columnCrossings = function (m, x, y) {
    const X = index(m); if (x < X.x0 || x > X.x1 || y < X.y0 || y > X.y1) return [];
    const i = TM.clamp(Math.floor((x - X.x0) / X.cw), 0, X.G - 1), j = TM.clamp(Math.floor((y - X.y0) / X.ch), 0, X.G - 1), P = m.pos, I = m.idx, zs = [];
    for (const t of X.cells[i + X.G * j]) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3; const ax = P[a], ay = P[a + 1], bx = P[b], by = P[b + 1], cx = P[c], cy = P[c + 1];
      const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(det) < 1e-12) continue;
      const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / det, l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / det, l3 = 1 - l1 - l2;
      if (l1 >= 0 && l2 >= 0 && l3 >= 0) zs.push(l1 * P[a + 2] + l2 * P[b + 2] + l3 * P[c + 2]);
    }
    zs.sort((p, q) => p - q); const out = []; for (const z of zs) if (!out.length || z - out[out.length - 1] > 1e-6) out.push(z); return out;
  };
  S.insideFromCrossings = (zs, z) => { let c = 0; for (const q of zs) if (q > z) c++; return (c & 1) === 1; };
  S.inside = (m, x, y, z) => S.insideFromCrossings(S.columnCrossings(m, x, y), z);

  // ---------------------------------------------------------------- RBF implicit model of a grade shell
  // comps: [{x,y,z,g}], threshold: grade defining "inside", aniso: {azi,dip,rake,ratios:[1,r2,r3]}
  S.rbfShell = async function (comps, { threshold = 0.5, cell = 5, maxPts = 600, aniso = null, maxDist = 40, smooth = 2 } = {}, onProgress) {
    if (comps.length < 10) throw new Error(TM.L('Not enough composites', 'عدد العينات المركبة غير كافٍ'));
    // anisotropic transform
    const ax = aniso ? TM.anisoMetric(aniso.azi, aniso.dip, aniso.rake || 0, 1, 1, 1).axes : { u: [1, 0, 0], v: [0, 1, 0], w: [0, 0, 1] }; const r = aniso ? aniso.ratios : [1, 1, 1];
    const tf = (x, y, z) => [(x * ax.u[0] + y * ax.u[1] + z * ax.u[2]) / r[0], (x * ax.v[0] + y * ax.v[1] + z * ax.v[2]) / r[1], (x * ax.w[0] + y * ax.w[1] + z * ax.w[2]) / r[2]];
    // sample selection: keep all contacts (sign changes along a hole) + stratified subsample of the rest
    const val = c => Math.tanh(Math.log(Math.max(c.g, 1e-3) / threshold) * 1.5);
    let pts = comps.map((c, i) => ({ c, v: val(c), key: i }));
    const contact = new Set(); for (let i = 1; i < comps.length; i++) if (comps[i].hole === comps[i - 1].hole && (comps[i].g >= threshold) !== (comps[i - 1].g >= threshold)) { contact.add(i); contact.add(i - 1); }
    if (pts.length > maxPts) { const keep = pts.filter(p => contact.has(p.key)); const rest = pts.filter(p => !contact.has(p.key)); const step = rest.length / Math.max(1, maxPts - keep.length); for (let k = 0; k < rest.length && keep.length < maxPts; k += Math.max(1, step)) keep.push(rest[Math.floor(k)]); pts = keep; }
    const ox = pts.reduce((a, p) => a + p.c.x, 0) / pts.length, oy = pts.reduce((a, p) => a + p.c.y, 0) / pts.length, oz = pts.reduce((a, p) => a + p.c.z, 0) / pts.length;
    const X = pts.map(p => tf(p.c.x - ox, p.c.y - oy, p.c.z - oz)); const n = X.length, M = n + 4;
    const A = Array.from({ length: M }, () => new Float64Array(M)), b = new Float64Array(M);
    for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) { const d = Math.hypot(X[i][0] - X[j][0], X[i][1] - X[j][1], X[i][2] - X[j][2]); A[i][j] = d * d * d; } A[i][i] += 1e-3 * n; A[i][n] = 1; A[i][n + 1] = X[i][0]; A[i][n + 2] = X[i][1]; A[i][n + 3] = X[i][2]; A[n][i] = 1; A[n + 1][i] = X[i][0]; A[n + 2][i] = X[i][1]; A[n + 3][i] = X[i][2]; b[i] = pts[i].v; }
    if (onProgress) onProgress(0.05); await TM.sleep(0);
    const w = TM.solve(A, b); if (!w) throw new Error('RBF system is singular');
    // evaluation grid
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (const c of comps) if (c.g >= threshold * 0.5) { x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x); y0 = Math.min(y0, c.y); y1 = Math.max(y1, c.y); z0 = Math.min(z0, c.z); z1 = Math.max(z1, c.z); }
    if (!isFinite(x0)) throw new Error(TM.L('No composites above the threshold', 'لا توجد عينات فوق الحد'));
    const pad = maxDist; x0 -= pad; y0 -= pad; z0 -= pad; x1 += pad; y1 += pad; z1 += pad;
    const nx = Math.ceil((x1 - x0) / cell), ny = Math.ceil((y1 - y0) / cell), nz = Math.ceil((z1 - z0) / cell), f = new Float32Array(nx * ny * nz);
    const H = new Map(), R = maxDist, key = (a, b2, c) => (a + 2048) + (b2 + 2048) * 4096 + (c + 2048) * 16777216;
    comps.forEach(c => { const k = key(Math.floor(c.x / R), Math.floor(c.y / R), Math.floor(c.z / R)); let a = H.get(k); if (!a) H.set(k, a = []); a.push(c); });
    const nearest = (x, y, z) => { let best = Infinity; const hx = Math.floor(x / R), hy = Math.floor(y / R), hz = Math.floor(z / R); for (let a = hx - 1; a <= hx + 1; a++) for (let b2 = hy - 1; b2 <= hy + 1; b2++) for (let c = hz - 1; c <= hz + 1; c++) { const arr = H.get(key(a, b2, c)); if (!arr) continue; for (const p of arr) { const d = (p.x - x) ** 2 + (p.y - y) ** 2 + (p.z - z) ** 2; if (d < best) best = d; } } return Math.sqrt(best); };
    await TM.chunked(f.length, id => {
      const i = id % nx, j = Math.floor(id / nx) % ny, k = Math.floor(id / (nx * ny)); const x = x0 + (i + .5) * cell, y = y0 + (j + .5) * cell, z = z0 + (k + .5) * cell;
      const top = TM.topoZ(x, y); if (isFinite(top) && z > top) { f[id] = -1; return; }
      const q = tf(x - ox, y - oy, z - oz); let s = w[n] + w[n + 1] * q[0] + w[n + 2] * q[1] + w[n + 3] * q[2];
      for (let p = 0; p < n; p++) { const d = Math.hypot(q[0] - X[p][0], q[1] - X[p][1], q[2] - X[p][2]); s += w[p] * d * d * d; }
      const dn = nearest(x, y, z); if (dn > maxDist) s = Math.min(s, -(dn - maxDist) / maxDist); f[id] = s;
    }, p => onProgress && onProgress(0.05 + p * 0.9), 2500);
    const grid = { f, nx, ny, nz, x0, y0, z0, cs: [cell, cell, cell] };
    let mesh = S.surfaceNets(grid, 0); if (smooth) mesh = S.smooth(mesh, smooth, 0.5);
    return { mesh, grid, nPts: n };
  };

  // Solid from a block model grade iso-shell
  S.fromBlockModel = function (bm, threshold) {
    const d = bm.def, f = new Float32Array(bm.N); for (let i = 0; i < bm.N; i++) f[i] = isFinite(bm.grade[i]) ? bm.grade[i] : 0;
    const m = S.surfaceNets({ f, nx: d.nx, ny: d.ny, nz: d.nz, x0: d.x0, y0: d.y0, z0: d.z0, cs: [d.dx, d.dy, d.dz] }, threshold); return S.smooth(m, 1, 0.5);
  };

  S.make = function (name, mesh, extra = {}) {
    const s = Object.assign({ id: TM.uid('sol'), name, color: '#10B981', pos: mesh.pos, idx: mesh.idx }, extra);
    s.volume = S.volume(s); s.tonnes = s.volume * TM.P.settings.density; s.closed = S.isClosed(s).closed; return s;
  };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
