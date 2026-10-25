/* TerraMind Studio — variography, block model, estimation (NN / IDW / Ordinary Kriging), classification, reporting. */
(function (TM) {
  'use strict';
  const E = TM.Est = {};

  // ---------------------------------------------------------------- variogram models
  const sph = h => h >= 1 ? 1 : 1.5 * h - 0.5 * h * h * h;
  const expo = h => 1 - Math.exp(-3 * h);
  E.shape = { sph, exp: expo };
  // model: {nugget, sill (total), type, azi, dip, rake, ranges:[r1,r2,r3]}
  E.makeModel = function (m) {
    const metric = TM.anisoMetric(m.azi || 0, m.dip || 0, m.rake || 0, m.ranges[0], m.ranges[1], m.ranges[2]);
    const c1 = Math.max(m.sill - m.nugget, 1e-12), f = E.shape[m.type || 'sph'];
    const gamma = (dx, dy, dz) => { const h2 = metric(dx, dy, dz); if (h2 < 1e-12) return 0; return m.nugget + c1 * f(Math.sqrt(h2)); };
    const cov = (dx, dy, dz) => m.sill - gamma(dx, dy, dz);
    return { m, metric, gamma, cov, gammaH: h => h <= 0 ? 0 : m.nugget + c1 * f(h) };
  };

  // All composite pairs within maxD (cached per composite set) → typed arrays
  let PC = null;
  function pairs(comps, maxD, transform) {
    if (PC && PC.comps === comps && PC.maxD >= maxD && PC.tf === transform) return PC;
    const n = comps.length, v = comps.map(c => transform === 'log' ? Math.log(Math.max(c.g, 1e-3)) : c.g);
    let cap = 1 << 16, m = 0, DX = new Float32Array(cap), DY = new Float32Array(cap), DZ = new Float32Array(cap), DD = new Float32Array(cap), DV = new Float32Array(cap);
    const grow = () => { cap *= 2; const g = a => { const b = new Float32Array(cap); b.set(a); return b; }; DX = g(DX); DY = g(DY); DZ = g(DZ); DD = g(DD); DV = g(DV); };
    const order = comps.map((c, i) => i).sort((a, b) => comps[a].x - comps[b].x);
    for (let ii = 0; ii < n; ii++) { const i = order[ii], a = comps[i]; for (let jj = ii + 1; jj < n; jj++) { const j = order[jj], b = comps[j]; const dx = b.x - a.x; if (dx > maxD) break; const dy = b.y - a.y, dz = b.z - a.z; if (Math.abs(dy) > maxD || Math.abs(dz) > maxD) continue; const d = Math.sqrt(dx * dx + dy * dy + dz * dz); if (d < 1e-6 || d > maxD) continue; if (m >= cap) grow(); DX[m] = dx; DY[m] = dy; DZ[m] = dz; DD[m] = d; const q = v[i] - v[j]; DV[m] = q * q; m++; } }
    return PC = { comps, maxD, tf: transform, m, DX, DY, DZ, DD, DV };
  }
  // Experimental variogram along a direction (or omni when tolAng >= 90)
  E.experimental = function (comps, { azi = 0, dip = 0, tolAng = 22.5, band = 1e9, lag = 10, nLags = 12, transform = 'none' } = {}) {
    const u = [Math.sin(azi * TM.D2R) * Math.cos(dip * TM.D2R), Math.cos(azi * TM.D2R) * Math.cos(dip * TM.D2R), -Math.sin(dip * TM.D2R)];
    const ct = Math.cos(Math.min(tolAng, 90) * TM.D2R), omni = tolAng >= 90;
    const sum = new Float64Array(nLags), cnt = new Float64Array(nLags), dsum = new Float64Array(nLags); const maxD = lag * (nLags + 0.5);
    const P = pairs(comps, Math.max(maxD, 160), transform);
    for (let e = 0; e < P.m; e++) {
      const d = P.DD[e]; if (d > maxD) continue;
      if (!omni) { const p = (P.DX[e] * u[0] + P.DY[e] * u[1] + P.DZ[e] * u[2]) / d; if (Math.abs(p) < ct) continue; if (d * Math.sqrt(Math.max(0, 1 - p * p)) > band) continue; }
      const k = Math.round(d / lag) - 1; if (k < 0 || k >= nLags) continue; sum[k] += P.DV[e]; cnt[k]++; dsum[k] += d;
    }
    const out = []; for (let k = 0; k < nLags; k++) if (cnt[k] >= 10) out.push({ h: dsum[k] / cnt[k], g: sum[k] / cnt[k] / 2, n: cnt[k] }); return out;
  };
  // Fit nugget + one structure (range only if nugget/sill fixed)
  E.fit = function (exp, { sill, type = 'sph', fixNugget = null, fixSill = false } = {}) {
    if (!exp.length) return null; const hmax = exp[exp.length - 1].h; let best = null;
    const sills = fixSill ? [sill] : Array.from({ length: 21 }, (_, i) => sill * (0.6 + i * 0.05));
    for (const S of sills) {
      const c0s = fixNugget != null ? [fixNugget] : Array.from({ length: 26 }, (_, i) => S * i / 40);
      for (const c0 of c0s) for (let k = 1; k <= 60; k++) {
        const a = hmax * 1.3 * k / 60; let err = 0;
        for (const p of exp) { const g = p.h <= 0 ? 0 : c0 + (S - c0) * E.shape[type](p.h / a); err += p.n * (p.g - g) ** 2 / Math.max(g * g, 1e-9); }
        if (!best || err < best.err) best = { nugget: c0, range: a, sill: S, err };
      }
    }
    return best;
  };
  // Automatic 3D variography: horizontal fan → major azimuth; plunge search → major dip; perpendicular axes.
  E.autoVariography = function (comps, opts = {}) {
    if (comps.length > 4000) { const k = comps.length / 4000; comps = Array.from({ length: 4000 }, (_, i) => comps[Math.floor(i * k)]); }
    const st = TM.stats(comps.map(c => c.g)); const sill = st.variance; const lag = opts.lag || 10, nLags = opts.nLags || 14;
    const omni = E.experimental(comps, { tolAng: 90, lag, nLags }); const fo = E.fit(omni, { sill });
    if (!fo) throw new Error(TM.L('Not enough composite pairs for a variogram', 'عدد أزواج العينات غير كافٍ للتباين'));
    const nug = fo.nugget, sillF = fo.sill; let bestAz = 0, bestR = 0; const fan = [];
    for (let az = 0; az < 180; az += 15) { const e = E.experimental(comps, { azi: az, dip: 0, tolAng: 22.5, band: 25, lag, nLags }); const f = E.fit(e, { sill: sillF, fixSill: true, fixNugget: nug }); fan.push({ az, range: f ? f.range : 0, exp: e }); if (f && e.length >= 4 && f.range > bestR) { bestR = f.range; bestAz = az; } }
    let bestDip = 0, r1 = bestR;
    for (let dp = 15; dp <= 75; dp += 15) for (const az of [bestAz, (bestAz + 180) % 360]) { const e = E.experimental(comps, { azi: az, dip: dp, tolAng: 22.5, band: 25, lag, nLags }); const f = E.fit(e, { sill: sillF, fixSill: true, fixNugget: nug }); if (f && f.range > r1 * 1.05) { r1 = f.range; bestDip = dp; bestAz = az; } }
    // semi-major: longest range among directions perpendicular to the major axis (rake search)
    const toAD = v => ({ azi: (Math.atan2(v[0], v[1]) / TM.D2R + 360) % 360, dip: -Math.asin(TM.clamp(v[2], -1, 1)) / TM.D2R });
    let bestRake = 0, r2 = 0, semi = [];
    for (let rk = 0; rk < 180; rk += 15) { const v = TM.anisoMetric(bestAz, bestDip, rk, 1, 1, 1).axes.v, ad = toAD(v); const e = E.experimental(comps, { azi: ad.azi, dip: ad.dip, tolAng: 22.5, band: 20, lag, nLags }); const f = E.fit(e, { sill: sillF, fixSill: true, fixNugget: nug }); if (f && e.length >= 4 && f.range > r2) { r2 = f.range; bestRake = rk; semi = e; } }
    const wv = TM.anisoMetric(bestAz, bestDip, bestRake, 1, 1, 1).axes.w, mad = toAD(wv);
    const minor = E.experimental(comps, { azi: mad.azi, dip: mad.dip, tolAng: 25, band: 15, lag: Math.max(2, lag / 3), nLags }); const fm = E.fit(minor, { sill: sillF, fixSill: true, fixNugget: nug });
    r2 = Math.min(r2 || r1, r1); const r3 = Math.min(fm ? fm.range : r2, r2);
    return { model: { type: 'sph', nugget: +nug.toFixed(4), sill: +sillF.toFixed(4), azi: bestAz, dip: bestDip, rake: bestRake, ranges: [Math.round(r1), Math.round(Math.max(r2, 5)), Math.round(Math.max(r3, 3))] }, omni, fan, semi, minor, stats: st };
  };

  // ---------------------------------------------------------------- block model
  E.define = function ({ x0, y0, z0, nx, ny, nz, dx, dy, dz }) {
    const N = nx * ny * nz;
    return { def: { x0, y0, z0, nx, ny, nz, dx, dy, dz }, N, grade: new Float32Array(N).fill(NaN), kv: new Float32Array(N).fill(NaN), ns: new Uint8Array(N), nh: new Uint8Array(N), dist: new Float32Array(N).fill(NaN), cls: new Uint8Array(N), frac: new Uint8Array(N), dom: new Uint8Array(N) };
  };
  E.autoDefine = function (comps, { dx = 5, dy = 5, dz = 5, pad = 30 } = {}) {
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (const c of comps) { x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x); y0 = Math.min(y0, c.y); y1 = Math.max(y1, c.y); z0 = Math.min(z0, c.z); z1 = Math.max(z1, c.z); }
    for (const c of TM.P.db.collars) z1 = Math.max(z1, c.z);
    x0 = Math.floor((x0 - pad) / dx) * dx; y0 = Math.floor((y0 - pad) / dy) * dy; z0 = Math.floor((z0 - pad) / dz) * dz;
    return { x0, y0, z0, dx, dy, dz, nx: Math.ceil((x1 + pad - x0) / dx), ny: Math.ceil((y1 + pad - y0) / dy), nz: Math.ceil((z1 + 5 - z0) / dz) };
  };
  E.center = (def, i, j, k) => [def.x0 + (i + .5) * def.dx, def.y0 + (j + .5) * def.dy, def.z0 + (k + .5) * def.dz];
  E.idx = (def, i, j, k) => i + def.nx * (j + def.ny * k);

  // Topography fraction and domain flags. sub > 1 → boundary blocks are split into sub×sub×sub sub-blocks: the block's
  // volume factor (frac) is the share of sub-blocks that lie inside the domain solid and below topography (partial-block tonnage).
  E.prepare = function (bm, domainSolid, { sub = 1 } = {}) {
    const d = bm.def, n = domainSolid && sub > 1 ? sub : 1; bm.sub = n; let split = 0;
    for (let j = 0; j < d.ny; j++) for (let i = 0; i < d.nx; i++) {
      const cx = d.x0 + (i + .5) * d.dx, cy = d.y0 + (j + .5) * d.dy; let top = TM.topoZ(cx, cy); if (!isFinite(top)) top = Infinity;
      const zs = domainSolid ? TM.Solid.columnCrossings(domainSolid, cx, cy) : null;
      let subs = null;
      if (n > 1) { subs = []; for (let b = 0; b < n; b++) for (let a = 0; a < n; a++) { const x = d.x0 + (i + (a + .5) / n) * d.dx, y = d.y0 + (j + (b + .5) / n) * d.dy; let t = TM.topoZ(x, y); if (!isFinite(t)) t = top; subs.push({ zs: TM.Solid.columnCrossings(domainSolid, x, y), top: t }); } if (subs.every(q => !q.zs.length) && !zs.length) subs = null; }
      for (let k = 0; k < d.nz; k++) {
        const zb = d.z0 + k * d.dz, f = TM.clamp((top - zb) / d.dz, 0, 1), id = E.idx(d, i, j, k);
        if (subs) {
          let v = 0; const dzs = d.dz / n; for (const q of subs) for (let c = 0; c < n; c++) { const z0 = zb + c * dzs, zc = z0 + dzs / 2; if (!TM.Solid.insideFromCrossings(q.zs, zc)) continue; v += TM.clamp((q.top - z0) / dzs, 0, 1); }
          const vf = v / (n * n * n); bm.frac[id] = Math.round(vf * 255); bm.dom[id] = vf > 0 ? 1 : 0; if (vf > 0 && vf < 1) split++;
        } else { bm.frac[id] = Math.round(f * 255); bm.dom[id] = f > 0 && (!zs || TM.Solid.insideFromCrossings(zs, zb + d.dz / 2)) ? 1 : 0; }
      }
    }
    bm.subSplit = split; return split;
  };

  // ---------------------------------------------------------------- faults: planes fitted to a string or surface; hard/soft search boundaries
  E.faultPlane = function (pts) {
    const n = pts.length; let cx = 0, cy = 0, cz = 0; for (const p of pts) { cx += p[0]; cy += p[1]; cz += p[2]; } cx /= n; cy /= n; cz /= n;
    const C = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; for (const p of pts) { const v = [p[0] - cx, p[1] - cy, p[2] - cz]; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) C[a][b] += v[a] * v[b]; }
    const e = TM.eig3(C); let m = 0; for (let k = 1; k < 3; k++) if (e.values[k] < e.values[m]) m = k; let nv = [e.vectors[0][m], e.vectors[1][m], e.vectors[2][m]]; if (nv[2] < 0) nv = nv.map(v => -v);
    const dip = Math.acos(Math.min(1, Math.abs(nv[2]))) / TM.D2R, dipDir = ((Math.atan2(nv[0], nv[1]) / TM.D2R) + 360) % 360;
    return { c: [cx, cy, cz], n: nv, dip: +dip.toFixed(1), dipDir: +dipDir.toFixed(1) };
  };
  E.faultSide = (f, x, y, z) => (x - f.plane.c[0]) * f.plane.n[0] + (y - f.plane.c[1]) * f.plane.n[1] + (z - f.plane.c[2]) * f.plane.n[2] >= 0 ? 1 : 0;
  E.faultBits = (faults, x, y, z) => { let b = 0; faults.forEach((f, i) => { if (E.faultSide(f, x, y, z)) b |= 1 << i; }); return b; };

  // Neighbour search (anisotropic ellipsoid, max per hole)
  function buildHash(pts, R) { const m = new Map(); const key = (a, b, c) => (a + 2048) + (b + 2048) * 4096 + (c + 2048) * 16777216; pts.forEach((p, i) => { const k = key(Math.floor(p.x / R), Math.floor(p.y / R), Math.floor(p.z / R)); let a = m.get(k); if (!a) m.set(k, a = []); a.push(i); }); return { m, key, R }; }
  function neighbours(H, pts, x, y, z, metric, maxS, maxPerHole, adj) {
    const R = H.R, hx = Math.floor(x / R), hy = Math.floor(y / R), hz = Math.floor(z / R), cand = [];
    for (let a = hx - 1; a <= hx + 1; a++) for (let b = hy - 1; b <= hy + 1; b++) for (let c = hz - 1; c <= hz + 1; c++) {
      const arr = H.m.get(H.key(a, b, c)); if (!arr) continue;
      for (const q of arr) { const p = pts[q]; let d2 = metric(p.x - x, p.y - y, p.z - z); if (adj) { const f = adj(q); if (!f) continue; d2 *= f; } if (d2 <= 1) cand.push([d2, q]); }
    }
    cand.sort((a, b) => a[0] - b[0]);
    if (!maxPerHole) return cand.slice(0, maxS);
    const per = new Map(), out = [];
    for (const c of cand) { const h = pts[c[1]].hole; const k = per.get(h) || 0; if (k >= maxPerHole) continue; per.set(h, k + 1); out.push(c); if (out.length >= maxS) break; }
    return out;
  }

  // Main estimation. params: {method:'ok'|'idw'|'nn', power, search:{azi,dip,rake,ranges}, minS, maxS, maxPerHole, model, disc:2}
  E.estimate = async function (bm, comps, params, onProgress) {
    const d = bm.def, sr = params.search; const metric = TM.anisoMetric(sr.azi, sr.dip, sr.rake || 0, sr.ranges[0], sr.ranges[1], sr.ranges[2]);
    const H = buildHash(comps, Math.max(...sr.ranges)); const vm = params.method === 'ok' ? E.makeModel(params.model) : null;
    const minS = params.minS || 4, maxS = params.maxS || 16, mph = params.maxPerHole || 0, p = params.power || 2;
    // block discretisation offsets
    const nd = params.method === 'ok' ? (params.disc || 2) : 1; const off = [];
    for (let a = 0; a < nd; a++) for (let b = 0; b < nd; b++) for (let c = 0; c < nd; c++) off.push([((a + .5) / nd - .5) * d.dx, ((b + .5) / nd - .5) * d.dy, ((c + .5) / nd - .5) * d.dz]);
    let cbar = 0; if (vm) { for (const u of off) for (const w of off) cbar += vm.cov(u[0] - w[0], u[1] - w[1], u[2] - w[2]); cbar /= off.length * off.length; }
    const N = bm.N; let done = 0;
    // faults: hard boundary → samples across the fault are excluded; soft → allowed within a reduced search (distance × √softFactor)
    const faults = (params.faults || []).slice(0, 30), hardM = faults.reduce((a, f, i) => f.boundary === 'hard' ? a | (1 << i) : a, 0), softM = faults.reduce((a, f, i) => f.boundary === 'soft' ? a | (1 << i) : a, 0), softF = params.softFactor || 4;
    const cBits = faults.length ? Int32Array.from(comps, c => E.faultBits(faults, c.x, c.y, c.z)) : null; let bBits = 0;
    const adj = faults.length ? q => { const df = cBits[q] ^ bBits; return df & hardM ? 0 : df & softM ? softF : 1; } : null;
    bm.grade.fill(NaN); bm.kv.fill(NaN); bm.ns.fill(0); bm.nh.fill(0); bm.dist.fill(NaN);
    await TM.chunked(N, id => {
      if (!bm.dom[id]) return;
      const i = id % d.nx, j = Math.floor(id / d.nx) % d.ny, k = Math.floor(id / (d.nx * d.ny)); const [x, y, z] = E.center(d, i, j, k);
      if (adj) bBits = E.faultBits(faults, x, y, z); const nb = neighbours(H, comps, x, y, z, metric, maxS, mph, adj); if (nb.length < minS) return;
      const holes = new Set(); let ds = 0; for (const c of nb) { const s = comps[c[1]]; holes.add(s.hole); ds += Math.hypot(s.x - x, s.y - y, s.z - z); }
      bm.ns[id] = nb.length; bm.nh[id] = Math.min(255, holes.size); bm.dist[id] = ds / nb.length;
      if (params.method === 'nn') { bm.grade[id] = comps[nb[0][1]].g; done++; return; }
      if (params.method === 'idw') { let sw = 0, sg = 0; for (const c of nb) { const w = 1 / Math.pow(Math.max(Math.sqrt(c[0]) * sr.ranges[0], 0.5), p); sw += w; sg += w * comps[c[1]].g; } bm.grade[id] = sg / sw; done++; return; }
      // ordinary block kriging
      const n = nb.length, A = [], b = new Float64Array(n + 1);
      for (let r = 0; r < n; r++) { const si = comps[nb[r][1]]; const row = new Float64Array(n + 1); for (let c = 0; c < n; c++) { const sj = comps[nb[c][1]]; row[c] = vm.cov(si.x - sj.x, si.y - sj.y, si.z - sj.z); } row[n] = 1; A.push(row); let cv = 0; for (const o of off) cv += vm.cov(si.x - x - o[0], si.y - y - o[1], si.z - z - o[2]); b[r] = cv / off.length; }
      const last = new Float64Array(n + 1); for (let c = 0; c < n; c++) last[c] = 1; A.push(last); b[n] = 1;
      const rhs = b.slice(); const w = TM.solve(A, b); if (!w) return;
      let g = 0, kv = cbar; for (let r = 0; r < n; r++) { g += w[r] * comps[nb[r][1]].g; kv -= w[r] * rhs[r]; } kv -= w[n];
      bm.grade[id] = Math.max(0, g); bm.kv[id] = Math.max(0, kv); done++;
    }, onProgress, 3000);
    bm.method = params.method; bm.params = JSON.parse(JSON.stringify(Object.assign({}, params, { faults: faults.map(f => ({ name: f.name, boundary: f.boundary })) }))); bm.estimated = done; bm.created = new Date().toISOString();
    return done;
  };

  // Resource classification (JORC-style categories)
  E.classify = function (bm, rules) {
    const r1 = bm.params && bm.params.model ? bm.params.model.ranges[0] : (bm.params ? bm.params.search.ranges[0] : 60);
    const r = Object.assign({ mDist: Math.round(r1 * 0.5), mHoles: 3, mSamples: 8, iDist: Math.round(r1), iHoles: 2 }, rules || bm.classRules || {}); bm.classRules = r;
    const cnt = [0, 0, 0, 0];
    for (let id = 0; id < bm.N; id++) {
      if (!isFinite(bm.grade[id])) { bm.cls[id] = 0; continue; }
      const d = bm.dist[id], h = bm.nh[id], s = bm.ns[id];
      bm.cls[id] = (d <= r.mDist && h >= r.mHoles && s >= r.mSamples) ? 1 : (d <= r.iDist && h >= r.iHoles) ? 2 : 3; cnt[bm.cls[id]]++;
    }
    return cnt;
  };
  E.CLASS = [null, { en: 'Measured', ar: 'مقاس', c: '#10B981' }, { en: 'Indicated', ar: 'مؤشر', c: '#3B82F6' }, { en: 'Inferred', ar: 'مستنتج', c: '#F59E0B' }];

  E.blockTonnes = (bm, id) => bm.def.dx * bm.def.dy * bm.def.dz * (bm.frac[id] / 255) * (TM.P.settings.density);
  // Grade-tonnage report: optional mask (Uint8Array) and class filter
  E.report = function (bm, cutoff, { mask, cls } = {}) {
    let t = 0, m = 0, n = 0;
    for (let id = 0; id < bm.N; id++) { const g = bm.grade[id]; if (!(g >= cutoff)) continue; if (mask && !mask[id]) continue; if (cls && !cls.includes(bm.cls[id])) continue; const tt = E.blockTonnes(bm, id); t += tt; m += tt * g; n++; }
    return { tonnes: t, grade: t ? m / t : 0, metal: m, oz: m / 31.1035, blocks: n };
  };
  E.gtCurve = function (bm, opts = {}, cuts) { cuts = cuts || Array.from({ length: 61 }, (_, i) => +(i * 0.05).toFixed(2)); return cuts.map(c => Object.assign({ cutoff: c }, E.report(bm, c, opts))); };

  E.validateBM = function (bm, comps) {
    // global mean comparison + swath plot along X
    const est = []; for (let id = 0; id < bm.N; id++) if (isFinite(bm.grade[id])) est.push(bm.grade[id]);
    const cs = TM.stats(comps.map(c => c.g)), bs = TM.stats(est); const d = bm.def; const nb = 12; const w = d.nx * d.dx / nb;
    const sw = Array.from({ length: nb }, (_, k) => ({ x: d.x0 + (k + .5) * w, cs: 0, cn: 0, bs: 0, bn: 0 }));
    for (const c of comps) { const k = Math.floor((c.x - d.x0) / w); if (k >= 0 && k < nb) { sw[k].cs += c.g; sw[k].cn++; } }
    for (let id = 0; id < bm.N; id++) { if (!isFinite(bm.grade[id])) continue; const i = id % d.nx; const k = Math.floor(i * d.dx / w); if (k >= 0 && k < nb) { sw[k].bs += bm.grade[id]; sw[k].bn++; } }
    return { comps: cs, blocks: bs, swath: sw.map(s => ({ x: s.x, comp: s.cn ? s.cs / s.cn : null, block: s.bn ? s.bs / s.bn : null, n: s.cn })) };
  };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
