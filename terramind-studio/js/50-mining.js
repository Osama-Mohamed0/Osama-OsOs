/* TerraMind Studio — mine planning: economics, Lerchs-Grossmann (max-flow) nested pits, pit design, scheduling. */
(function (TM) {
  'use strict';
  const M = TM.Mine = {};

  // ---------------------------------------------------------------- economics
  M.econ = function (s = TM.P.settings) {
    const netPrice = (s.price - s.sellCost) * s.recovery / 100 / 31.1035; // $ per (g/t × t)
    return { netPrice, marginalCOG: (s.procCost + s.gaCost) / netPrice, breakevenCOG: (s.procCost + s.gaCost + s.mineCost) / netPrice };
  };
  // Cash-flow model for a sequence of increments [{ore, waste, metal(g)}]
  M.schedule = function (incs, s = TM.P.settings, o = {}) {
    const pf = o.priceF || 1, cf = o.costF || 1; const rec = s.recovery / 100; const years = []; let q = incs.map(x => Object.assign({}, x)); let qi = 0, y = 0;
    while (qi < q.length && y < 60) {
      let mill = s.millRate, mine = s.mineRate; const yr = { year: y + 1, ore: 0, waste: 0, metal: 0 };
      while (qi < q.length && mill > 1e-6 && mine > 1e-6) {
        const c = q[qi]; const tot = c.ore + c.waste; if (tot < 1e-9) { qi++; continue; }
        const f = Math.min(1, c.ore > 0 ? mill / c.ore : Infinity, mine / tot);
        yr.ore += c.ore * f; yr.waste += c.waste * f; yr.metal += c.metal * f; mill -= c.ore * f; mine -= tot * f;
        c.ore -= c.ore * f; c.waste -= c.waste * f; c.metal -= c.metal * f; if (f >= 1 - 1e-9) qi++;
      }
      yr.grade = yr.ore ? yr.metal / yr.ore : 0; yr.oz = yr.metal / 31.1035 * rec;
      yr.revenue = yr.oz * (s.price * pf - s.sellCost); yr.cost = ((yr.ore + yr.waste) * s.mineCost + yr.ore * (s.procCost + s.gaCost)) * cf; yr.cash = yr.revenue - yr.cost;
      years.push(yr); y++;
    }
    const r = s.discount / 100; const flows = [-s.capex].concat(years.map(v => v.cash)); if (years.length) flows[flows.length - 1] -= s.closure;
    const npv = flows.reduce((a, c, t) => a + c / Math.pow(1 + r, t), 0);
    let irr = null; { const f = rr => flows.reduce((a, c, t) => a + c / Math.pow(1 + rr, t), 0); let lo, hi; if (f(0) > 0) { lo = 0; hi = 20; } else { lo = -0.6; hi = 0; } if ((f(lo) > 0) !== (f(hi) > 0)) { const up = f(lo) > 0; for (let k = 0; k < 80; k++) { const m = (lo + hi) / 2; if ((f(m) > 0) === up) lo = m; else hi = m; } irr = (lo + hi) / 2; } }
    let cum = -s.capex, payback = null; years.forEach((v, i) => { const prev = cum; cum += v.cash; if (payback == null && cum >= 0 && v.cash > 0) payback = i + (-prev) / v.cash; });
    const tot = years.reduce((a, v) => ({ ore: a.ore + v.ore, waste: a.waste + v.waste, metal: a.metal + v.metal, oz: a.oz + v.oz, revenue: a.revenue + v.revenue, cost: a.cost + v.cost, cash: a.cash + v.cash }), { ore: 0, waste: 0, metal: 0, oz: 0, revenue: 0, cost: 0, cash: 0 });
    return { years, npv, irr, payback, life: years.length, total: tot, flows };
  };

  // ---------------------------------------------------------------- max-flow (Dinic) for maximum closure
  function Graph(n, mHint) {
    let cap = mHint || 1024; this.n = n; this.m = 0; this.head = new Int32Array(n).fill(-1);
    this.to = new Int32Array(cap); this.nxt = new Int32Array(cap); this.cap = new Float64Array(cap);
    this.grow = () => { cap *= 2; const t = new Int32Array(cap); t.set(this.to); this.to = t; const x = new Int32Array(cap); x.set(this.nxt); this.nxt = x; const c = new Float64Array(cap); c.set(this.cap); this.cap = c; };
  }
  Graph.prototype.add = function (u, v, c) { if (this.m + 2 > this.to.length) this.grow(); const e = this.m; this.to[e] = v; this.cap[e] = c; this.nxt[e] = this.head[u]; this.head[u] = e; this.to[e + 1] = u; this.cap[e + 1] = 0; this.nxt[e + 1] = this.head[v]; this.head[v] = e + 1; this.m += 2; };
  Graph.prototype.maxflow = function (s, t) {
    const n = this.n, level = new Int32Array(n), it = new Int32Array(n), q = new Int32Array(n), stack = new Int32Array(n), estack = new Int32Array(n); let flow = 0; const EPS = 1e-9;
    const { head, to, nxt, cap } = this;
    for (;;) {
      level.fill(-1); level[s] = 0; let qh = 0, qt = 0; q[qt++] = s;
      while (qh < qt) { const u = q[qh++]; for (let e = head[u]; e !== -1; e = nxt[e]) if (cap[e] > EPS && level[to[e]] < 0) { level[to[e]] = level[u] + 1; q[qt++] = to[e]; } }
      if (level[t] < 0) break;
      for (let i = 0; i < n; i++) it[i] = head[i];
      // iterative DFS augmenting paths
      for (;;) {
        let sp = 0, u = s; stack[sp] = s; let found = false;
        while (true) {
          if (u === t) { found = true; break; }
          let e = it[u]; while (e !== -1 && !(cap[e] > EPS && level[to[e]] === level[u] + 1)) e = nxt[e]; it[u] = e;
          if (e === -1) { if (sp === 0) break; level[u] = -1; sp--; u = stack[sp]; it[u] = nxt[it[u]]; continue; }
          estack[sp] = e; sp++; u = to[e]; stack[sp] = u;
        }
        if (!found) break;
        let f = Infinity; for (let k = 0; k < sp; k++) f = Math.min(f, cap[estack[k]]);
        for (let k = 0; k < sp; k++) { cap[estack[k]] -= f; cap[estack[k] ^ 1] += f; }
        flow += f;
      }
    }
    // source side of the min cut = maximum closure
    const seen = new Uint8Array(n); let qh = 0, qt = 0; q[qt++] = s; seen[s] = 1;
    while (qh < qt) { const u = q[qh++]; for (let e = head[u]; e !== -1; e = nxt[e]) if (cap[e] > EPS && !seen[to[e]]) { seen[to[e]] = 1; q[qt++] = to[e]; } }
    return { flow, closure: seen };
  };
  M.Graph = Graph;

  // ---------------------------------------------------------------- LG model build
  // Regularise the estimation model onto an optimisation grid (cell × cell × bench height)
  M.buildLG = function (bm, { cell = 10, benchH = TM.P.settings.benchH, slope = TM.P.settings.slope } = {}) {
    const s = TM.P.settings, d = bm.def, tin = TM.rt.tin; const zTop = tin ? tin.z1 : d.z0 + d.nz * d.dz;
    const zBot = Math.floor(d.z0 / benchH) * benchH; const nz = Math.ceil((zTop - zBot) / benchH);
    const pad = Math.ceil((zTop - zBot) / Math.tan(slope * TM.D2R) / cell) * cell;
    const x0 = Math.floor((d.x0 - pad) / cell) * cell, y0 = Math.floor((d.y0 - pad) / cell) * cell;
    const nx = Math.ceil((d.x0 + d.nx * d.dx + pad - x0) / cell), ny = Math.ceil((d.y0 + d.ny * d.dy + pad - y0) / cell);
    const N = nx * ny * nz, T = new Float32Array(N), G = new Float32Array(N), topCol = new Float32Array(nx * ny);
    // tonnage from topography
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      let zt = 0, c = 0; for (const [a, b] of [[.25, .25], [.75, .25], [.25, .75], [.75, .75]]) { const z = TM.topoZ(x0 + (i + a) * cell, y0 + (j + b) * cell); if (isFinite(z)) { zt += z; c++; } }
      zt = c ? zt / c : zTop; topCol[i + nx * j] = zt;
      for (let k = 0; k < nz; k++) { const zb = zBot + k * benchH; const f = TM.clamp((zt - zb) / benchH, 0, 1); T[i + nx * (j + ny * k)] = f * cell * cell * benchH * s.density; }
    }
    // grade: tonnage-weighted average of estimation blocks whose centres fall inside
    const W = new Float32Array(N);
    for (let id = 0; id < bm.N; id++) {
      const g = bm.grade[id]; if (!isFinite(g)) continue; const bi = id % d.nx, bj = Math.floor(id / d.nx) % d.ny, bk = Math.floor(id / (d.nx * d.ny));
      const x = d.x0 + (bi + .5) * d.dx, y = d.y0 + (bj + .5) * d.dy, z = d.z0 + (bk + .5) * d.dz; const i = Math.floor((x - x0) / cell), j = Math.floor((y - y0) / cell), k = Math.floor((z - zBot) / benchH);
      if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) continue; const id2 = i + nx * (j + ny * k); const t = TM.Est.blockTonnes(bm, id); G[id2] += g * t; W[id2] += t;
    }
    // unestimated volume inside a cell is waste at zero grade
    for (let id = 0; id < N; id++) G[id] = T[id] > 0 ? G[id] / T[id] : 0;
    return { x0, y0, zBot, cell, benchH, nx, ny, nz, N, T, G, topCol, slope };
  };
  M.blockValue = function (lg, id, rf = 1, s = TM.P.settings) {
    const t = lg.T[id]; if (t <= 0) return 0; const e = M.econ(s); const rev = lg.G[id] * e.netPrice * rf;
    return rev > s.procCost + s.gaCost ? t * (rev - s.procCost - s.gaCost - s.mineCost) : -t * s.mineCost;
  };
  // Precedence offsets: blocks required on levels 1..L above, within slope cone
  function offsets(lg, L = 2) { const r1 = lg.benchH / Math.tan(lg.slope * TM.D2R) / lg.cell; const out = []; for (let l = 1; l <= L; l++) { const R = r1 * l + 1e-6, n = Math.ceil(R); for (let dj = -n; dj <= n; dj++) for (let di = -n; di <= n; di++) if (di * di + dj * dj <= R * R) out.push([di, dj, l]); } return out; }

  // Nested pit shells via repeated maximum closure for revenue factors
  M.nestedShells = async function (lg, rfs, onProgress) {
    const { nx, ny, nz, N } = lg; const off = offsets(lg, 2); const r1 = lg.benchH / Math.tan(lg.slope * TM.D2R) / lg.cell;
    const rfMax = Math.max(...rfs);
    // candidate universe: upward cones of blocks positive at the highest revenue factor
    const cand = new Uint8Array(N); const pos = new Uint8Array(N);
    for (let id = 0; id < N; id++) if (M.blockValue(lg, id, rfMax) > 0) pos[id] = 1;
    const rr = Math.ceil(r1);
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const id = i + nx * (j + ny * k); if (pos[id]) { cand[id] = 1; continue; } if (k === 0) continue;
      let hit = false; for (let dj = -rr; dj <= rr && !hit; dj++) for (let di = -rr; di <= rr && !hit; di++) { if (di * di + dj * dj > r1 * r1 + 1e-6) continue; const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= ny) continue; if (cand[a + nx * (b + ny * (k - 1))]) hit = true; }
      if (hit && lg.T[id] > 0) cand[id] = 1;
    }
    const nodeOf = new Int32Array(N).fill(-1), ids = []; for (let id = 0; id < N; id++) if (cand[id] && lg.T[id] > 0) { nodeOf[id] = ids.length + 2; ids.push(id); }
    const shellOf = new Uint8Array(N); // 0 = never mined; s+1 = first shell index containing the block
    const shells = [];
    for (let si = 0; si < rfs.length; si++) {
      const rf = rfs[si]; const g = new Graph(ids.length + 2, ids.length * (off.length + 2) * 2);
      for (let q = 0; q < ids.length; q++) {
        const id = ids[q], u = q + 2, v = M.blockValue(lg, id, rf); if (v > 0) g.add(0, u, v); else if (v < 0) g.add(u, 1, -v);
        const i = id % nx, j = Math.floor(id / nx) % ny, k = Math.floor(id / (nx * ny));
        for (const [di, dj, l] of off) { const a = i + di, b = j + dj, c = k + l; if (a < 0 || b < 0 || a >= nx || b >= ny || c >= nz) continue; const w = nodeOf[a + nx * (b + ny * c)]; if (w >= 0) g.add(u, w, 1e18); }
      }
      const res = g.maxflow(0, 1); const mined = new Uint8Array(N);
      for (let q = 0; q < ids.length; q++) if (res.closure[q + 2]) { mined[ids[q]] = 1; if (!shellOf[ids[q]]) shellOf[ids[q]] = si + 1; }
      shells.push(M.shellStats(lg, mined, rf));
      if (onProgress) onProgress((si + 1) / rfs.length); await TM.sleep(0);
    }
    return { shells, shellOf, rfs, nodes: ids.length };
  };
  M.shellStats = function (lg, mined, rf) {
    const s = TM.P.settings, e = M.econ(s); let ore = 0, waste = 0, metal = 0, value = 0;
    const floor = new Float32Array(lg.nx * lg.ny).fill(NaN);
    for (let id = 0; id < lg.N; id++) {
      if (!mined[id]) continue; const t = lg.T[id], g = lg.G[id]; if (g * e.netPrice > s.procCost + s.gaCost) { ore += t; metal += t * g; } else waste += t; value += M.blockValue(lg, id, 1);
      const col = id % (lg.nx * lg.ny), k = Math.floor(id / (lg.nx * lg.ny)), zb = lg.zBot + k * lg.benchH; if (!(floor[col] <= zb)) floor[col] = zb;
    }
    return { rf, ore, waste, metal, grade: ore ? metal / ore : 0, oz: metal / 31.1035, value, sr: ore ? waste / ore : 0, floor };
  };
  // Increments between consecutive shells (for pushback scheduling)
  M.increments = function (lg, res, upTo) {
    const s = TM.P.settings, e = M.econ(s); const inc = Array.from({ length: upTo + 1 }, () => ({ ore: 0, waste: 0, metal: 0 }));
    for (let id = 0; id < lg.N; id++) { const sh = res.shellOf[id]; if (!sh || sh - 1 > upTo) continue; const t = lg.T[id], g = lg.G[id], c = inc[sh - 1]; if (g * e.netPrice > s.procCost + s.gaCost) { c.ore += t; c.metal += t * g; } else c.waste += t; }
    return inc.filter(c => c.ore + c.waste > 0);
  };
  // Pit-by-pit analysis: best (pushback order) and worst (single bench-by-bench) case NPV per shell
  M.pitByPit = function (lg, res) {
    return res.shells.map((sh, i) => {
      const best = M.schedule(M.increments(lg, res, i)); const worst = M.schedule([{ ore: sh.ore, waste: sh.waste, metal: sh.metal }]);
      return { shell: i + 1, rf: sh.rf, ore: sh.ore, waste: sh.waste, grade: sh.grade, oz: sh.oz, best: best.npv, worst: worst.npv, sr: sh.sr };
    });
  };
  // Pit floor RL at a world XY for a given shell (NaN = not mined → topography)
  M.floorAt = function (lg, floor, x, y) { const i = Math.floor((x - lg.x0) / lg.cell), j = Math.floor((y - lg.y0) / lg.cell); if (i < 0 || j < 0 || i >= lg.nx || j >= lg.ny) return NaN; return floor[i + lg.nx * j]; };

  // Pit surface heightmap (node lattice) — min(topography, shell floor), lightly smoothed for design contours
  M.pitSurface = function (lg, floor) {
    const nx = lg.nx + 1, ny = lg.ny + 1, z = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      let fz = Infinity; for (const [a, b] of [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]]) { if (a < 0 || b < 0 || a >= lg.nx || b >= lg.ny) continue; const f = floor[a + lg.nx * b]; if (isFinite(f)) fz = Math.min(fz, f); }
      const x = lg.x0 + i * lg.cell, y = lg.y0 + j * lg.cell; let t = TM.topoZ(x, y); if (!isFinite(t)) t = lg.zBot + lg.nz * lg.benchH;
      z[i + nx * j] = Math.min(t, isFinite(fz) ? fz : Infinity);
    }
    return { x0: lg.x0, y0: lg.y0, cs: lg.cell, nx, ny, z };
  };
  // Marching-squares contours of a heightmap at bench elevations → design strings
  M.benchContours = function (hm, benchH, zFrom, zTo) {
    const out = [];
    for (let lv = zFrom; lv <= zTo; lv += benchH) {
      const segs = []; const Z = (i, j) => hm.z[i + hm.nx * j] - lv - 1e-4; const P = (i, j) => [hm.x0 + i * hm.cs, hm.y0 + j * hm.cs];
      for (let j = 0; j < hm.ny - 1; j++) for (let i = 0; i < hm.nx - 1; i++) {
        const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], v = c.map(([a, b]) => Z(a, b)), pts = [];
        for (let e = 0; e < 4; e++) { const a = v[e], b = v[(e + 1) % 4]; if ((a > 0) !== (b > 0)) { const f = a / (a - b), pa = P(...c[e]), pb = P(...c[(e + 1) % 4]); pts.push([pa[0] + (pb[0] - pa[0]) * f, pa[1] + (pb[1] - pa[1]) * f, lv]); } }
        if (pts.length === 2) segs.push(pts); else if (pts.length === 4) { segs.push([pts[0], pts[1]]); segs.push([pts[2], pts[3]]); }
      }
      const lines = TM.Surf.chain(segs).filter(l => l.length > 3);
      if (lines.length) out.push({ z: lv, lines });
    }
    return out;
  };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
