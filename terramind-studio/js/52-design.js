/* TerraMind Studio — open-pit and waste-dump design from a toe/base string (Surpac "Pit design" equivalent).
   Geometry is built on a signed-distance raster: bench expansion = distance shift, ramp = union of a widened
   berm along the ramp path, daylighting = intersection with the topography. */
(function (TM) {
  'use strict';
  const D = TM.Design = {};

  // 1-D squared Euclidean distance transform (Felzenszwalb & Huttenlocher)
  function edt1d(f, n, d, v, z) {
    let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
    for (let q = 1; q < n; q++) { let s; for (;;) { const p = v[k]; s = ((f[q] + q * q) - (f[p] + p * p)) / (2 * q - 2 * p); if (s <= z[k]) { k--; if (k < 0) { k = 0; break; } } else break; } k++; v[k] = q; z[k] = s; z[k + 1] = Infinity; }
    k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const p = v[k]; d[q] = (q - p) * (q - p) + f[p]; }
  }
  function edt2d(mask, nx, ny) { // distance (cells) from each cell to nearest cell where mask = 1
    const INF = 1e20, g = new Float64Array(nx * ny), m = Math.max(nx, ny), f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);
    for (let i = 0; i < nx * ny; i++) g[i] = mask[i] ? 0 : INF;
    for (let x = 0; x < nx; x++) { for (let y = 0; y < ny; y++) f[y] = g[x + nx * y]; edt1d(f, ny, d, v, z); for (let y = 0; y < ny; y++) g[x + nx * y] = d[y]; }
    for (let y = 0; y < ny; y++) { for (let x = 0; x < nx; x++) f[x] = g[x + nx * y]; edt1d(f, nx, d, v, z); for (let x = 0; x < nx; x++) g[x + nx * y] = Math.sqrt(d[x]); }
    return g;
  }
  // Signed distance (metres) to a polygon on a grid: negative inside
  D.sdf = function (poly, G) {
    const { nx, ny, x0, y0, res } = G, inside = new Uint8Array(nx * ny), outside = new Uint8Array(nx * ny);
    for (let j = 0; j < ny; j++) { const y = y0 + (j + .5) * res; const xs = []; for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) { const ya = poly[a][1], yb = poly[b][1]; if ((ya > y) !== (yb > y)) xs.push(poly[a][0] + (y - ya) / (yb - ya) * (poly[b][0] - poly[a][0])); } xs.sort((p, q) => p - q);
      for (let i = 0; i < nx; i++) { const x = x0 + (i + .5) * res; let c = 0; for (const q of xs) if (q < x) c++; const id = i + nx * j; if (c & 1) inside[id] = 1; else outside[id] = 1; } }
    const dIn = edt2d(inside, nx, ny), dOut = edt2d(outside, nx, ny), s = new Float32Array(nx * ny);
    for (let i = 0; i < s.length; i++) s[i] = inside[i] ? -(dOut[i] - 0.5) * res : (dIn[i] - 0.5) * res;
    return s;
  };
  // Marching squares on a cell-centred field → polylines at level
  D.contour = function (F, G, level = 0) {
    const { nx, ny, x0, y0, res } = G, segs = []; const P = (i, j) => [x0 + (i + .5) * res, y0 + (j + .5) * res];
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], v = c.map(([a, b]) => F[a + nx * b] - level - 1e-7), pts = [];
      for (let e = 0; e < 4; e++) { const a = v[e], b = v[(e + 1) % 4]; if ((a > 0) !== (b > 0)) { const t = a / (a - b), pa = P(...c[e]), pb = P(...c[(e + 1) % 4]); pts.push([pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t, 0]); } }
      if (pts.length === 2) segs.push(pts); else if (pts.length === 4) { segs.push([pts[0], pts[1]]); segs.push([pts[2], pts[3]]); }
    }
    return TM.Surf.chain(segs).sort((a, b) => b.length - a.length);
  };
  const arc = pts => { const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return s; };
  const nearestParam = (pts, A, q) => { let best = 0, bd = Infinity; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1, t = TM.clamp(((q[0] - a[0]) * vx + (q[1] - a[1]) * vy) / l2, 0, 1), d = Math.hypot(a[0] + vx * t - q[0], a[1] + vy * t - q[1]); if (d < bd) { bd = d; best = A[i - 1] + t * (A[i] - A[i - 1]); } } return best; };
  const pointAt = (pts, A, s) => { const tot = A[A.length - 1]; s = ((s % tot) + tot) % tot; let i = 1; while (i < A.length - 1 && A[i] < s) i++; const t = (s - A[i - 1]) / ((A[i] - A[i - 1]) || 1); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t]; };
  // Distance field to a polyline (only near it)
  function polylineDist(G, line, reach) {
    const { nx, ny, x0, y0, res } = G, R = new Float32Array(nx * ny).fill(1e9), S = new Float32Array(nx * ny); const A = [0]; for (let k = 1; k < line.length; k++) A.push(A[k - 1] + Math.hypot(line[k][0] - line[k - 1][0], line[k][1] - line[k - 1][1]));
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity; for (const p of line) { bx0 = Math.min(bx0, p[0]); bx1 = Math.max(bx1, p[0]); by0 = Math.min(by0, p[1]); by1 = Math.max(by1, p[1]); }
    const i0 = Math.max(0, Math.floor((bx0 - reach - x0) / res)), i1 = Math.min(nx - 1, Math.ceil((bx1 + reach - x0) / res)), j0 = Math.max(0, Math.floor((by0 - reach - y0) / res)), j1 = Math.min(ny - 1, Math.ceil((by1 + reach - y0) / res));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const x = x0 + (i + .5) * res, y = y0 + (j + .5) * res; let best = 1e9, bs = 0; for (let k = 1; k < line.length; k++) { const a = line[k - 1], b = line[k], vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy || 1, t = TM.clamp(((x - a[0]) * vx + (y - a[1]) * vy) / l2, 0, 1), d = Math.hypot(a[0] + vx * t - x, a[1] + vy * t - y); if (d < best) { best = d; bs = A[k - 1] + t * (A[k] - A[k - 1]); } } R[i + nx * j] = best; S[i + nx * j] = bs; }
    R.along = S; return R;
  }
  const topoOr = (x, y, z) => { const t = TM.topoZ(x, y); return isFinite(t) ? t : z; };
  // Split a contour into parts below topography (daylighting) at elevation z
  const daylight = (line, z, below = true) => { const out = []; let cur = null; for (const p of line) { const ok = below ? z <= topoOr(p[0], p[1], z + 1) + 0.01 : z >= topoOr(p[0], p[1], z - 1) - 0.01; if (ok) { if (!cur) cur = []; cur.push([+p[0].toFixed(3), +p[1].toFixed(3), +z.toFixed(3)]); } else if (cur) { if (cur.length > 1) out.push(cur); cur = null; } } if (cur && cur.length > 1) out.push(cur); return out; };

  // ---------------------------------------------------------------- pit design
  // opts: {toe:[[x,y,z]], benchH, batter (deg), berm, ramp:{width, gradient(%), start:[x,y], dir:+1|-1} | null, maxBenches, res}
  D.pit = function (opts) {
    const H = opts.benchH, f = H / Math.tan(opts.batter * TM.D2R), B = opts.berm, res = opts.res || 1, z0 = opts.toe.reduce((a, p) => a + p[2], 0) / opts.toe.length;
    const tz1 = TM.rt.tin ? TM.rt.tin.z1 : z0 + 200; const nB = Math.min(opts.maxBenches || 60, Math.ceil((tz1 - z0) / H) + 1);
    const ramp = opts.ramp && opts.ramp.width > 0 ? opts.ramp : null; const W = ramp ? ramp.width : 0; const Lr = ramp ? H / (ramp.gradient / 100) : 0;
    const margin = nB * (f + B) + W + 2 * res + 10; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of opts.toe) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const G = { x0: x0 - margin, y0: y0 - margin, res }; G.nx = Math.ceil((x1 - x0 + 2 * margin) / res); G.ny = Math.ceil((y1 - y0 + 2 * margin) / res);
    if (G.nx * G.ny > 9e6) throw new Error(TM.L('Design area too large for this resolution — increase the grid cell size.', 'منطقة التصميم كبيرة جداً — زد حجم خلية الشبكة.'));
    const N = G.nx * G.ny, Zd = new Float32Array(N).fill(NaN); let T = D.sdf(opts.toe, G);
    for (let i = 0; i < N; i++) if (T[i] <= 0) Zd[i] = z0;
    const strings = [], rampLine = []; let rampS = null, benches = 0, dir = ramp ? (ramp.dir || 1) : 1, switches = 0; const sw = ramp && ramp.switchbacks ? ramp.switchbacks.map(Number).filter(isFinite).sort((a, b) => a - b) : [];
    for (let k = 0; k < nB; k++) {
      const zk = z0 + k * H; const C = new Float32Array(N); for (let i = 0; i < N; i++) C[i] = T[i] - f;
      const toeC = D.contour(T, G, 0)[0], crestC = D.contour(C, G, 0)[0]; if (!toeC || !crestC) break;
      daylight(toeC, zk).forEach(l => strings.push({ name: `Pit_toe_RL${Math.round(zk)}`, pts: l, kind: 'toe' }));
      const crestParts = daylight(crestC, zk + H); crestParts.forEach(l => strings.push({ name: `Pit_crest_RL${Math.round(zk + H)}`, pts: l, kind: 'crest' }));
      // face zone
      for (let i = 0; i < N; i++) if (T[i] > 0 && C[i] <= 0 && isNaN(Zd[i])) Zd[i] = zk + H * T[i] / f;
      benches = k + 1; if (!crestParts.length) break; // fully daylighted
      // ramp path along this crest
      let R = null;
      if (ramp) {
        if (sw.some(r => r > zk + 1e-6 && r <= zk + H + 1e-6)) { dir = -dir; switches++; } // switchback: reverse the climbing direction at this RL
        const A = arc(crestC); const start = rampS == null ? nearestParam(crestC, A, ramp.start || crestC[0]) : nearestParam(crestC, A, rampS);
        const seg = []; const steps = Math.max(2, Math.ceil(Lr / Math.max(res, 2))); for (let q = 0; q <= steps; q++) { const p = pointAt(crestC, A, start + dir * Lr * q / steps); seg.push([p[0], p[1]]); }
        rampS = seg[seg.length - 1]; R = polylineDist(G, seg, B + W + res * 2);
        seg.forEach((p, q) => rampLine.push([+p[0].toFixed(3), +p[1].toFixed(3), +(zk + H + H * q / steps).toFixed(3)]));
      }
      const Tn = new Float32Array(N); for (let i = 0; i < N; i++) { let v = C[i] - B; if (R) v = Math.min(v, R[i] - (B + W)); Tn[i] = v; }
      // berm shelf flat at zk + H; ramp cells climb from zk + H to zk + 2H along the ramp (gradient honoured → true excavated volume)
      for (let i = 0; i < N; i++) if (C[i] > 0 && Tn[i] <= 0 && isNaN(Zd[i])) Zd[i] = R && C[i] - B > 0 && R[i] <= B + W ? zk + H + H * TM.clamp(R.along[i] / Lr, 0, 1) : zk + H;
      T = Tn;
    }
    if (rampLine.length) strings.push({ name: 'Pit_ramp_centreline', pts: rampLine.filter(p => p[2] <= topoOr(p[0], p[1], p[2]) + 0.5), kind: 'ramp' });
    const out = D.finish('pit', G, Zd, strings, opts, { benches, z0 }); if (ramp) { out.stats.ramp = { width: W, gradient: ramp.gradient, length_m: Math.round(rampLine.reduce((a, p, i) => i ? a + Math.hypot(p[0] - rampLine[i - 1][0], p[1] - rampLine[i - 1][1], p[2] - rampLine[i - 1][2]) : 0, 0)), switchbacks: switches, direction: (ramp.dir || 1) > 0 ? 'clockwise' : 'anticlockwise' }; } return out;
  };

  // ---------------------------------------------------------------- dump design (benches step inward going up)
  D.dump = function (opts) {
    const H = opts.benchH, f = H / Math.tan(opts.batter * TM.D2R), B = opts.berm, res = opts.res || 1; const z0 = opts.base.reduce((a, p) => a + p[2], 0) / opts.base.length; const zMax = opts.maxRL || z0 + 60;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of opts.base) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const G = { x0: x0 - 5 * res, y0: y0 - 5 * res, res }; G.nx = Math.ceil((x1 - x0) / res) + 10; G.ny = Math.ceil((y1 - y0) / res) + 10;
    const N = G.nx * G.ny, Zd = new Float32Array(N).fill(NaN); let T = D.sdf(opts.base, G); const strings = []; let benches = 0;
    for (let k = 0; z0 + (k + 1) * H <= zMax + 1e-6; k++) {
      const zk = z0 + k * H; const C = new Float32Array(N); for (let i = 0; i < N; i++) C[i] = T[i] + f;
      const toeC = D.contour(T, G, 0)[0], crestC = D.contour(C, G, 0)[0]; if (!toeC || !crestC) break;
      daylight(toeC, zk, false).forEach(l => strings.push({ name: `Dump_toe_RL${Math.round(zk)}`, pts: l, kind: 'toe' })); strings.push({ name: `Dump_crest_RL${Math.round(zk + H)}`, pts: crestC.map(p => [+p[0].toFixed(3), +p[1].toFixed(3), zk + H]), kind: 'crest' });
      for (let i = 0; i < N; i++) if (T[i] <= 0 && C[i] > 0) Zd[i] = zk + H * (-T[i]) / f;
      const Tn = new Float32Array(N); for (let i = 0; i < N; i++) Tn[i] = C[i] + B;
      for (let i = 0; i < N; i++) if (C[i] <= 0) Zd[i] = zk + H; // top of this lift (overwritten by higher lifts)
      benches = k + 1; T = Tn; if (!T.some(v => v <= 0)) break;
    }
    return D.finish('dump', G, Zd, strings, opts, { benches, z0 });
  };

  // ---------------------------------------------------------------- results: design surface, volumes, reserves
  D.finish = function (kind, G, Zd, strings, opts, info) {
    const { nx, ny, x0, y0, res } = G, N = nx * ny, z = new Float32Array(N); let vol = 0, area = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const id = i + nx * j, x = x0 + (i + .5) * res, y = y0 + (j + .5) * res, t = topoOr(x, y, NaN), d = Zd[id];
      if (kind === 'pit') { z[id] = isNaN(d) ? t : (isFinite(t) ? Math.min(t, d) : d); if (isFinite(t) && !isNaN(d) && d < t) { vol += (t - d) * res * res; area += res * res; } }
      else { z[id] = isNaN(d) ? t : (isFinite(t) ? Math.max(t, d) : d); if (isFinite(t) && !isNaN(d) && d > t) { vol += (d - t) * res * res; area += res * res; } }
    }
    const design = { kind, grid: { x0, y0, res, nx, ny, z }, params: JSON.parse(JSON.stringify(Object.assign({}, opts, { toe: undefined, base: undefined }))), strings, stats: { volume: vol, footprint: area, benches: info.benches, z0: info.z0, tonnes: vol * TM.P.settings.density }, created: new Date().toISOString() };
    if (kind === 'pit') design.stats.reserve = D.reserve(design);
    return design;
  };
  D.zAt = (design, x, y) => { const g = design.grid, i = Math.floor((x - g.x0) / g.res), j = Math.floor((y - g.y0) / g.res); if (i < 0 || j < 0 || i >= g.nx || j >= g.ny) return NaN; return g.z[i + g.nx * j]; };
  // Ore/waste inside a pit design from the block model at the current cut-off
  D.reserve = function (design, cog = TM.P.settings.cutoff) {
    const bm = TM.P.bm; if (!bm) return null; const d = bm.def; let ore = 0, metal = 0;
    for (let id = 0; id < bm.N; id++) { const g = bm.grade[id]; if (!(g >= cog)) continue; const i = id % d.nx, j = Math.floor(id / d.nx) % d.ny, k = Math.floor(id / (d.nx * d.ny)); const x = d.x0 + (i + .5) * d.dx, y = d.y0 + (j + .5) * d.dy, zc = d.z0 + (k + .5) * d.dz; const f = D.zAt(design, x, y); if (!(zc > f)) continue; const t = TM.Est.blockTonnes(bm, id); ore += t; metal += t * g; }
    const rock = design.stats.tonnes; return { cutoff: cog, ore, grade: ore ? metal / ore : 0, oz: metal / 31.1035, waste: Math.max(0, rock - ore), sr: ore ? Math.max(0, rock - ore) / ore : null };
  };
  // Design surface → TIN (decimated) for display/export
  D.toMesh = function (design, step = 2) {
    const g = design.grid, pos = [], idx = [], map = new Int32Array(g.nx * g.ny).fill(-1); const P = (i, j) => [g.x0 + (i + .5) * g.res, g.y0 + (j + .5) * g.res];
    for (let j = 0; j < g.ny; j += step) for (let i = 0; i < g.nx; i += step) { const z = g.z[i + g.nx * j]; if (!isFinite(z)) continue; map[i + g.nx * j] = pos.length / 3; const p = P(i, j); pos.push(p[0], p[1], z); }
    for (let j = 0; j + step < g.ny; j += step) for (let i = 0; i + step < g.nx; i += step) { const a = map[i + g.nx * j], b = map[i + step + g.nx * j], c = map[i + g.nx * (j + step)], dd = map[i + step + g.nx * (j + step)]; if (a < 0 || b < 0 || c < 0 || dd < 0) continue; idx.push(a, b, c, b, dd, c); }
    return { pos: new Float64Array(pos), idx: new Uint32Array(idx) };
  };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
