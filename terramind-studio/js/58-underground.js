/* TerraMind Studio — underground mine design: stope optimiser (MSO-style slice method), tunnel solids and spiral decline,
   longhole ring design, development face rounds, and the open-pit → underground transition. */
(function (TM) {
  'use strict';
  const U = TM.UG = {}; const S = () => TM.P.settings; const L = TM.L;
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

  // Underground economics: value per tonne of diluted ore after UG mining, processing and G&A
  U.econ = function (s = S()) { const e = TM.Mine.econ(s); const cost = (s.ugMineCost || 60) + s.procCost + s.gaCost; return { netPrice: e.netPrice, cost, breakeven: cost / e.netPrice }; };

  // Closed mesh from a stack of rings (each ring: array of [x,y,z], same count, counter-clockwise seen from above)
  U.loft = function (rings) {
    const n = rings[0].length, pos = [], idx = []; rings.forEach(r => r.forEach(p => pos.push(p[0], p[1], p[2])));
    for (let k = 0; k + 1 < rings.length; k++) for (let i = 0; i < n; i++) { const a = k * n + i, b = k * n + (i + 1) % n, c = (k + 1) * n + i, d = (k + 1) * n + (i + 1) % n; idx.push(a, b, d, a, d, c); }
    const cap = (k, flip) => { const c = pos.length / 3; let cx = 0, cy = 0, cz = 0; rings[k].forEach(p => { cx += p[0]; cy += p[1]; cz += p[2]; }); pos.push(cx / n, cy / n, cz / n); for (let i = 0; i < n; i++) { const a = k * n + i, b = k * n + (i + 1) % n; if (flip) idx.push(c, b, a); else idx.push(c, a, b); } };
    cap(0, true); cap(rings.length - 1, false);
    return { pos: new Float64Array(pos), idx: new Uint32Array(idx) };
  };

  // ---------------------------------------------------------------- 1. stope optimiser (slice method on the block model)
  // Levels every levelH (minus sill pillar), panels along strike every stopeLen (minus rib pillar). In each panel and sub-slice the
  // best contiguous across-strike interval (≥ min mining width) is chosen, diluted by ELOS on both walls; a stope is kept when its
  // diluted grade ≥ UG cut-off and its value is positive. Below an open pit a crown pillar is left under the pit floor.
  U.optimiseStopes = function (o = {}) {
    const bm = TM.P.bm; if (!bm) throw new Error(L('Estimate the block model first.', 'قدّر نموذج البلوكات أولاً.'));
    const s = S(), d = bm.def, e = U.econ(s); const v = s.variogram;
    const p = Object.assign({ cutoff: +(e.breakeven).toFixed(2), mineCost: s.ugMineCost || 60, levelH: 25, stopeLen: 20, minWidth: 2.5, maxWidth: 40, rib: 5, sill: 5, elos: 0.5, crown: 25, azimuth: v ? v.azi : 0, subSlices: 3, prefix: 'ST_OPT' }, o);
    const sCost = Object.assign({}, s, { ugMineCost: p.mineCost }), ec = U.econ(sCost);
    const az = p.azimuth * TM.D2R, uu = [Math.sin(az), Math.cos(az)], vv = [Math.cos(az), -Math.sin(az)];
    const cx = d.x0 + d.nx * d.dx / 2, cy = d.y0 + d.ny * d.dy / 2; const cell = Math.min(d.dx, d.dy);
    const pit = TM.Pit.active();
    // bin blocks (rotated frame)
    let zTop = -Infinity, zBot = Infinity, umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity; const blocks = [];
    for (let id = 0; id < bm.N; id++) {
      const g = bm.grade[id]; if (!isFinite(g) || !bm.frac[id]) continue; const i = id % d.nx, j = Math.floor(id / d.nx) % d.ny, k = Math.floor(id / (d.nx * d.ny));
      const x = d.x0 + (i + .5) * d.dx, y = d.y0 + (j + .5) * d.dy, z = d.z0 + (k + .5) * d.dz;
      let lim = TM.topoZ(x, y); if (pit) { const f = pit.floorAt(x, y); if (isFinite(f)) lim = f; } if (isFinite(lim) && z > lim - p.crown) continue;
      const u = (x - cx) * uu[0] + (y - cy) * uu[1], w = (x - cx) * vv[0] + (y - cy) * vv[1];
      blocks.push({ u, w, z, t: TM.Est.blockTonnes(bm, id), g }); zTop = Math.max(zTop, z); zBot = Math.min(zBot, z); umin = Math.min(umin, u); umax = Math.max(umax, u); vmin = Math.min(vmin, w); vmax = Math.max(vmax, w);
    }
    if (!blocks.length) throw new Error(L('No estimated blocks below the crown pillar.', 'لا توجد بلوكات مقدّرة أسفل دعامة السقف.'));
    const nV = Math.max(1, Math.ceil((vmax - vmin) / cell) + 1), levels = [], panels = [];
    const top = Math.floor((zTop + d.dz / 2) / p.levelH) * p.levelH; for (let zl = top; zl - p.levelH >= zBot - d.dz; zl -= p.levelH) levels.push([zl - p.levelH, zl - p.sill]); // [floor, back]
    for (let u0 = umin - cell / 2; u0 < umax; u0 += p.stopeLen + p.rib) panels.push([u0, u0 + p.stopeLen]);
    const ns = Math.max(1, p.subSlices | 0), bins = new Map(); const key = (li, pi, si, vi) => ((li * 4096 + pi) * 16 + si) * 8192 + vi;
    for (const b of blocks) {
      const li = levels.findIndex(l => b.z >= l[0] && b.z < l[1]); if (li < 0) continue; const pi = panels.findIndex(q => b.u >= q[0] && b.u < q[1]); if (pi < 0) continue;
      const l = levels[li], si = Math.min(ns - 1, Math.floor((b.z - l[0]) / ((l[1] - l[0]) / ns))), vi = Math.floor((b.w - vmin) / cell); const k = key(li, pi, si, vi); const c = bins.get(k) || { t: 0, m: 0 }; c.t += b.t; c.m += b.t * b.g; bins.set(k, c);
    }
    const minC = Math.max(1, Math.ceil(p.minWidth / cell)), maxC = Math.max(minC, Math.floor(p.maxWidth / cell)), eC = Math.max(0, Math.round(p.elos / cell));
    const stopes = []; const old = TM.P.solids.filter(x => x.name.startsWith(p.prefix + '_')); TM.P.solids = TM.P.solids.filter(x => !x.name.startsWith(p.prefix + '_'));
    levels.forEach((l, li) => panels.forEach((q, pi) => {
      const ints = []; let ok = true;
      for (let si = 0; si < ns && ok; si++) {
        const T = new Float64Array(nV), M = new Float64Array(nV), full = cell * (q[1] - q[0]) * (l[1] - l[0]) / ns * s.density; let any = false; for (let vi = 0; vi < nV; vi++) { const c = bins.get(key(li, pi, si, vi)); T[vi] = full; if (c) { M[vi] = c.m * Math.min(1, full / c.t); any = true; } } if (!any) { ok = false; break; } // cells without estimated blocks are zero-grade dilution
        let best = null; for (let a = 0; a < nV; a++) { let t = 0, m = 0; for (let b = a; b < nV && b - a + 1 <= maxC; b++) { t += T[b]; m += M[b]; if (b - a + 1 < minC) continue; let dt = 0, dm = 0; for (let k = 1; k <= eC; k++) { if (a - k >= 0) { dt += T[a - k]; dm += M[a - k]; } if (b + k < nV) { dt += T[b + k]; dm += M[b + k]; } } const tt = t + dt, mm = m + dm; if (tt <= 0) continue; const val = mm * ec.netPrice - tt * ec.cost; if (!best || val > best.val) best = { a, b, t: tt, m: mm, val }; } }
        if (!best || best.val <= 0) ok = false; else ints.push(best);
      }
      if (!ok || !ints.length) return; const t = ints.reduce((a, r) => a + r.t, 0), m = ints.reduce((a, r) => a + r.m, 0), g = m / t; if (g < p.cutoff) return;
      // solid: rings at sub-slice boundaries (interval averaged between neighbouring slices), widened by ELOS
      const wAt = k => { const r = ints[Math.min(ints.length - 1, k)], r0 = ints[Math.max(0, k - 1)]; const a = (k === 0 || k === ints.length ? r.a : (r.a + r0.a) / 2), b = (k === 0 || k === ints.length ? r.b : (r.b + r0.b) / 2); return [vmin + (a - eC) * cell - cell / 2, vmin + (b + eC) * cell + cell / 2]; };
      const rings = []; for (let k = 0; k <= ints.length; k++) { const z = l[0] + (l[1] - l[0]) * k / ints.length, [w0, w1] = wAt(k); rings.push([[q[0], w0], [q[1], w0], [q[1], w1], [q[0], w1]].map(([uq, wq]) => [cx + uq * uu[0] + wq * vv[0], cy + uq * uu[1] + wq * vv[1], z])); }
      const name = `${p.prefix}_L${Math.round(l[0])}_${String(pi + 1).padStart(2, '0')}`; const so = TM.Solid.make(name, U.loft(rings), { source: 'stope optimiser', color: '#F59E0B' }); TM.P.solids.push(so);
      stopes.push({ stope: name, level_rl: Math.round(l[0]), panel: pi + 1, tonnes: Math.round(t), grade: +g.toFixed(2), oz: Math.round(m / 31.1035), width_m: +((ints.reduce((a, r) => a + r.b - r.a + 1, 0) / ints.length + 2 * eC) * cell).toFixed(1), value_musd: +(ints.reduce((a, r) => a + r.val, 0) / 1e6).toFixed(2), volume_m3: Math.round(so.volume) });
    }));
    TM.touch('solids'); TM.logHistory('stopeOpt', `${stopes.length} stopes`);
    const T = stopes.reduce((a, r) => a + r.tonnes, 0), M = stopes.reduce((a, r) => a + r.tonnes * r.grade, 0);
    return { params: p, stopes: stopes.length, replaced: old.length, levels: levels.length, panels: panels.length, ore_t: T, grade: T ? +(M / T).toFixed(2) : 0, oz: Math.round(M / 31.1035), value_musd: +stopes.reduce((a, r) => a + r.value_musd, 0).toFixed(1), crown_pillar_m: p.crown, under_pit: !!pit, rows: stopes };
  };

  // ---------------------------------------------------------------- 2. development: profiles, tunnel solids, spiral decline
  U.profileNames = () => [['arched', L('Arched / horseshoe', 'مقوّس / حدوة حصان')], ['rect', L('Rectangular', 'مستطيل')], ['circular', L('Circular (shaft / raise)', 'دائري (بئر / مدخنة)')]];
  U.profile = function (type, w, h, n = 10) {
    if (type === 'circular') { const r = w / 2, out = []; for (let i = 0; i < 2 * n; i++) { const a = i / (2 * n) * Math.PI * 2; out.push([Math.cos(a) * r, Math.sin(a) * r]); } return out; }
    if (type === 'rect') return [[-w / 2, 0], [w / 2, 0], [w / 2, h], [-w / 2, h]];
    const r = w / 2, wall = Math.max(0, h - r), out = [[-w / 2, 0], [w / 2, 0], [w / 2, wall]]; for (let i = 1; i < n; i++) { const a = i / n * Math.PI; out.push([Math.cos(a) * r, wall + Math.sin(a) * r]); } out.push([-w / 2, wall]); return out;
  };
  U.profileArea = pts => Math.abs(pts.reduce((a, p, i) => { const q = pts[(i + 1) % pts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
  // Sweep a profile along a centreline (floor-centre for drives, axis for circular raises)
  U.tunnel = function (line, { type = 'arched', w = 5, h = 5.5 } = {}) {
    const prof = U.profile(type, w, h), rings = [], circ = type === 'circular';
    for (let i = 0; i < line.length; i++) {
      const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)]; const t = norm([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
      let side = Math.abs(t[2]) > 0.95 ? [1, 0, 0] : norm(cross(t, [0, 0, 1])); const up = norm(cross(side, t));
      if (Math.abs(t[2]) > 0.95) side = norm(cross(t, up));
      rings.push(prof.map(([px, py]) => add(add(line[i], side, px), up, circ ? py : py)));
    }
    const len = line.reduce((acc, p, i) => i ? acc + Math.hypot(p[0] - line[i - 1][0], p[1] - line[i - 1][1], p[2] - line[i - 1][2]) : 0, 0);
    return { mesh: U.loft(rings), length: len, area: U.profileArea(prof) };
  };
  U.tunnelSolid = function ({ string, type = 'arched', w = 5, h = 5.5, name }) {
    const st = TM.P.strings.find(x => x.id === string || x.name === string); if (!st || st.pts.length < 2) throw new Error(L('Choose a centreline string with at least 2 points.', 'اختر خط محور من نقطتين على الأقل.'));
    const r = U.tunnel(st.pts, { type, w, h }); const so = TM.Solid.make(name || `${st.name}_${type}_${w}x${h}`, r.mesh, { source: 'development profile', color: type === 'circular' ? '#60A5FA' : '#94A3B8' }); TM.P.solids.push(so); TM.touch('solids');
    const vol = r.area * r.length; return { solid: so.name, profile: type, width_m: w, height_m: type === 'circular' ? w : h, area_m2: +r.area.toFixed(2), length_m: +r.length.toFixed(1), volume_m3: Math.round(vol), tonnes: Math.round(vol * S().density) };
  };
  // Spiral decline: helix of radius R at a gradient (1:n), connected by crosscuts to a target at each level, plus a fresh-air raise and an ore pass
  U.spiralDecline = function (o = {}) {
    const p = Object.assign({ cx: null, cy: null, topRL: null, bottomRL: null, radius: 25, gradientPct: 14.3, dir: 1, levels: [], levelH: 25, target: null, raiseOffset: 40, profile: { type: 'arched', w: 5, h: 5.5 }, xcProfile: { type: 'arched', w: 4, h: 4 }, solids: true, prefix: 'UG' }, o);
    const e = TM.extents(); if (p.cx == null) { p.cx = e.cx; p.cy = e.cy; } if (p.topRL == null) { const t = TM.topoZ(p.cx, p.cy); p.topRL = isFinite(t) ? t : e.z1; } if (p.bottomRL == null) { let zb = Infinity; TM.P.solids.filter(x => /^ST_/.test(x.name)).forEach(x => { for (let i = 2; i < x.pos.length; i += 3) zb = Math.min(zb, x.pos[i]); }); p.bottomRL = isFinite(zb) ? zb - 5 : TM.P.bm ? TM.P.bm.def.z0 : e.z0; }
    const g = p.gradientPct / 100, R = p.radius, ds = 2, pts = []; let ang = 0, z = p.topRL;
    while (z > p.bottomRL) { pts.push([p.cx + R * Math.sin(ang), p.cy + R * Math.cos(ang), z]); ang += p.dir * ds / R; z -= ds * g; }
    pts.push([p.cx + R * Math.sin(ang), p.cy + R * Math.cos(ang), p.bottomRL]);
    const lv = (p.levels && p.levels.length ? p.levels : (() => { const a = []; for (let zl = Math.floor(p.topRL / p.levelH) * p.levelH; zl >= p.bottomRL; zl -= p.levelH) if (zl < p.topRL - p.levelH / 2) a.push(zl); return a; })()).map(Number);
    let tgt = p.target; if (!tgt) { const stp = TM.P.solids.filter(x => /^ST_/.test(x.name)); if (stp.length) { let sx = 0, sy = 0, n = 0; stp.forEach(x => { for (let i = 0; i < x.pos.length; i += 3) { sx += x.pos[i]; sy += x.pos[i + 1]; n++; } }); tgt = [sx / n, sy / n]; } else if (TM.P.bm) { const d = TM.P.bm.def; tgt = [d.x0 + d.nx * d.dx / 2, d.y0 + d.ny * d.dy / 2]; } }
    const strings = [], mk = (name, pts2, strNo, color, closed = false) => { const s = { id: TM.uid('str'), name, strNo, closed, pts: pts2.map(q => q.map(v => +v.toFixed(3))), color }; strings.push(s); return s; };
    mk(`${p.prefix}_Spiral_decline`, pts, 1, '#E5E7EB');
    const xcs = []; for (const zl of lv) { let best = null; for (const q of pts) { const d = Math.abs(q[2] - zl); if (!best || d < best.d) best = { d, q }; } if (!best || best.d > ds * g * 2) continue; const a = [best.q[0], best.q[1], zl]; const b = tgt ? [tgt[0], tgt[1], zl] : [p.cx + R * 2, p.cy, zl]; const L2 = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L2 < R * 0.5) continue; xcs.push(mk(`${p.prefix}_XC_RL${Math.round(zl)}`, [a, b], 3, '#A3A3A3')); }
    const ax = tgt ? norm([tgt[0] - p.cx, tgt[1] - p.cy, 0]) : [1, 0, 0], px = [-ax[1], ax[0], 0];
    const fa = [p.cx + px[0] * (R + p.raiseOffset), p.cy + px[1] * (R + p.raiseOffset)], op = [p.cx + ax[0] * (R + 15), p.cy + ax[1] * (R + 15)];
    const tFA = TM.topoZ(fa[0], fa[1]); mk(`${p.prefix}_FAR_raise`, [[fa[0], fa[1], p.bottomRL], [fa[0], fa[1], isFinite(tFA) ? tFA : p.topRL]], 10, '#38BDF8');
    if (lv.length > 1) mk(`${p.prefix}_Ore_pass`, [[op[0], op[1], Math.max(...lv)], [op[0], op[1], Math.min(...lv) - 10]], 15, '#F97316');
    TM.Undo && TM.Undo.push(L('Spiral decline', 'المنحدر الحلزوني')); TM.P.strings.push(...strings);
    const sol = []; if (p.solids) { sol.push(U.tunnelSolid({ string: strings[0].id, ...p.profile, name: `${p.prefix}_Decline_${p.profile.w}x${p.profile.h}` })); xcs.forEach(x => sol.push(U.tunnelSolid({ string: x.id, ...p.xcProfile, name: `${x.name}_${p.xcProfile.w}x${p.xcProfile.h}` }))); sol.push(U.tunnelSolid({ string: strings.find(x => /FAR/.test(x.name)).id, type: 'circular', w: 4, name: `${p.prefix}_FAR_4m` })); }
    TM.touch('strings'); const len = pts.reduce((a, q, i) => i ? a + Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1], q[2] - pts[i - 1][2]) : 0, 0);
    return { decline_m: Math.round(len), turns: +(Math.abs(ang) / (2 * Math.PI)).toFixed(1), gradient: `1:${(1 / g).toFixed(1)} (${p.gradientPct}%)`, radius_m: R, from_rl: Math.round(p.topRL), to_rl: Math.round(p.bottomRL), crosscuts: xcs.length, levels: lv, strings: strings.length, solids: sol.length, excavated_m3: sol.reduce((a, x) => a + x.volume_m3, 0), excavated_t: sol.reduce((a, x) => a + x.tonnes, 0) };
  };

  // ---------------------------------------------------------------- 3a. longhole ring (fan) design inside a stope
  function rayMesh(m, o, d) { // farthest intersection distance of a ray with a mesh (Möller–Trumbore)
    const P = m.pos, I = m.idx; let far = -1;
    for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3; const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]], e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]]; const h = cross(d, e2), det = dot(e1, h); if (Math.abs(det) < 1e-12) continue; const f = 1 / det, sv = [o[0] - P[a], o[1] - P[a + 1], o[2] - P[a + 2]], u = f * dot(sv, h); if (u < 0 || u > 1) continue; const q = cross(sv, e1), v = f * dot(d, q); if (v < 0 || u + v > 1) continue; const dist = f * dot(e2, q); if (dist > 1e-6 && dist > far) far = dist; }
    return far;
  }
  U.ringDesign = function (o = {}) {
    const so = TM.P.solids.find(x => x.id === o.stope || x.name === o.stope); if (!so) throw new Error(L('Choose a stope solid.', 'اختر مجسم غرفة.'));
    const p = Object.assign({ ringBurden: 2.4, toeSpacing: 3.0, minAngle: 45, maxAngle: 135, collarMin: 2.0, collarAlt: 0.35, diameter: 89, explosive: 'Emulsion', drive: null, collarHeight: 3.0, delayRing: 25 }, o);
    // drill drive: string or the stope's long horizontal axis at its sill
    let a, b; const P = so.pos; let z0 = Infinity; for (let i = 2; i < P.length; i += 3) z0 = Math.min(z0, P[i]);
    if (p.drive) { const st = TM.P.strings.find(x => x.id === p.drive || x.name === p.drive); a = st.pts[0]; b = st.pts[st.pts.length - 1]; }
    else { let cx = 0, cy = 0, n = P.length / 3; for (let i = 0; i < P.length; i += 3) { cx += P[i]; cy += P[i + 1]; } cx /= n; cy /= n; let sxx = 0, syy = 0, sxy = 0; for (let i = 0; i < P.length; i += 3) { const dx = P[i] - cx, dy = P[i + 1] - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; } const th = 0.5 * Math.atan2(2 * sxy, sxx - syy), ax = [Math.cos(th), Math.sin(th)]; let lo = Infinity, hi = -Infinity; for (let i = 0; i < P.length; i += 3) { const s = (P[i] - cx) * ax[0] + (P[i + 1] - cy) * ax[1]; lo = Math.min(lo, s); hi = Math.max(hi, s); } a = [cx + ax[0] * lo, cy + ax[1] * lo, z0]; b = [cx + ax[0] * hi, cy + ax[1] * hi, z0]; }
    const dirv = norm([b[0] - a[0], b[1] - a[1], 0]), side = [-dirv[1], dirv[0], 0], up = [0, 0, 1], Ld = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const r = p.diameter / 2000, dens = TM.Blast.EXPLOSIVES[p.explosive] || 1.15, kgm = Math.PI * r * r * dens * 1000; const holes = []; let ringN = 0, totT = 0;
    for (let s = p.ringBurden / 2; s < Ld; s += p.ringBurden) {
      ringN++; const c = [a[0] + dirv[0] * s, a[1] + dirv[1] * s, (a[2] || z0) + p.collarHeight]; let ang = p.minAngle, hn = 0, prev = null, area = 0;
      while (ang <= p.maxAngle + 1e-6) {
        const th = ang * TM.D2R, d = norm(add(add([0, 0, 0], side, Math.cos(th)), up, Math.sin(th))); const len = rayMesh(so, c, d);
        if (len > 0.5) { hn++; const toe = add(c, d, len); const unch = hn % 2 ? p.collarMin : p.collarMin + p.collarAlt * len; const chL = Math.max(0, len - unch); holes.push({ id: `RG${String(ringN).padStart(2, '0')}-${String(hn).padStart(2, '0')}`, row: ringN, col: hn, x: c[0], y: c[1], z: c[2], ex: toe[0], ey: toe[1], ez: toe[2], length: len, angle: +ang.toFixed(1), uncharged: +Math.min(len, unch).toFixed(2), charge: chL * kgm, delay: (ringN - 1) * p.delayRing });
          if (prev) area += 0.5 * Math.abs(dot(cross([prev[0] - c[0], prev[1] - c[1], prev[2] - c[2]], [toe[0] - c[0], toe[1] - c[1], toe[2] - c[2]]), dirv)); prev = toe; ang += Math.max(3, p.toeSpacing / len / TM.D2R); }
        else ang += 5;
      }
      totT += area * p.ringBurden * S().density;
    }
    if (!holes.length) throw new Error(L('No ring holes hit the stope — check the drive position.', 'لم تصل ثقوب المروحة إلى الغرفة — راجع موقع نفق الحفر.'));
    const kg = holes.reduce((q, h) => q + h.charge, 0), dm = holes.reduce((q, h) => q + h.length, 0), vol = totT / S().density;
    TM.P.blast = { kind: 'ring', params: p, holes, polygon: so.name, summary: { holes: holes.length, rows: ringN, drill_m: dm, explosive_kg: kg, charge_kg_per_hole: kg / holes.length, volume_bcm: vol, tonnes: totT, powder_factor_kg_t: totT ? kg / totT : 0, powder_factor_kg_m3: vol ? kg / vol : 0, yield_t_per_m: dm ? totT / dm : 0, max_kg_per_delay: TM.Blast.maxPerDelay(holes) } }; TM.touch('blast');
    const sm = TM.P.blast.summary; return { stope: so.name, rings: ringN, holes: holes.length, drill_m: Math.round(dm), explosive_kg: Math.round(kg), tonnes: Math.round(totT), powder_factor_kg_t: +sm.powder_factor_kg_t.toFixed(3), yield_t_per_m: +sm.yield_t_per_m.toFixed(1), max_kg_per_delay: Math.round(sm.max_kg_per_delay), ring_burden_m: p.ringBurden, toe_spacing_m: p.toeSpacing, fan_deg: [p.minAngle, p.maxAngle] };
  };

  // ---------------------------------------------------------------- 3b. development face round (burn cut, easers, perimeter, lifters)
  U.faceRound = function (o = {}) {
    const p = Object.assign({ type: 'arched', w: 5, h: 5.5, advance: 3.6, diameter: 45, relief: 102, nRelief: 2, perimSpacing: 0.6, perimOffset: 0.25, lifterSpacing: 0.9, easerBurden: 0.9, explosive: 'Emulsion', heading: null, lookout: 0.1, pull: 0.92 }, o);
    const prof = U.profile(p.type, p.w, p.h, 16), Lh = p.advance / p.pull, holes = [], put = (x, y, kind, dia = p.diameter) => holes.push({ fx: x, fy: y, kind, dia });
    // burn cut: relief holes at the centre + 4 squares of cut holes
    const cy0 = Math.min(p.h * 0.4, 1.6), cx0 = 0; for (let i = 0; i < p.nRelief; i++) put(cx0 + (i - (p.nRelief - 1) / 2) * 0.2, cy0, 'relief', p.relief);
    [0.15, 0.3, 0.6, 1.0].forEach((a, k) => { const r = a * Math.SQRT2 * (k % 2 ? 1 : 0.85); for (let j = 0; j < 4; j++) { const th = (k % 2 ? Math.PI / 4 : 0) + j * Math.PI / 2; put(cx0 + Math.cos(th) * r, cy0 + Math.sin(th) * r, 'cut'); } });
    // perimeter (smooth blasting) along walls and back, lifters on the floor
    const perim = []; for (let i = 0; i < prof.length; i++) { const a = prof[i], b = prof[(i + 1) % prof.length]; if (Math.abs(a[1]) < 1e-6 && Math.abs(b[1]) < 1e-6) continue; const L2 = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.max(1, Math.round(L2 / p.perimSpacing)); for (let k = 0; k < n; k++) { const t = k / n; perim.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
    perim.forEach(([x, y]) => { if (y < 0.4) return; const vx = x, vy = y - p.h / 2, l = Math.hypot(vx, vy) || 1; put(x - vx / l * p.perimOffset, y - vy / l * p.perimOffset, 'perimeter'); });
    const nl = Math.max(2, Math.round((p.w - 2 * p.perimOffset) / p.lifterSpacing)); for (let i = 0; i <= nl; i++) put(-p.w / 2 + p.perimOffset + i * (p.w - 2 * p.perimOffset) / nl, 0.2, 'lifter');
    // easers on a grid between the cut and the contour
    const inside = (x, y) => { let c = false; for (let i = 0, j = prof.length - 1; i < prof.length; j = i++) { const xi = prof[i][0], yi = prof[i][1], xj = prof[j][0], yj = prof[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    for (let y = 0.2 + p.easerBurden; y < p.h - 0.5; y += p.easerBurden) for (let x = -p.w / 2 + 0.7; x <= p.w / 2 - 0.7 + 1e-6; x += p.easerBurden) { if (!inside(x, y)) continue; if (holes.some(h => Math.hypot(h.fx - x, h.fy - y) < p.easerBurden * 0.6)) continue; put(x, y, 'easer'); }
    // charging (kg per metre of hole) and delays by type
    const dens = TM.Blast.EXPLOSIVES[p.explosive] || 1.15, kgm = Math.PI * Math.pow(p.diameter / 2000, 2) * dens * 1000; const CH = { relief: 0, cut: 0.9, easer: 0.75, lifter: 0.9, perimeter: 0.35 }, DL = { relief: 0, cut: 25, easer: 100, lifter: 400, perimeter: 300 };
    // place in 3D at the end of a heading string (or local frame)
    let F = [0, 0, 0], dir = [0, 1, 0]; if (p.heading) { const st = TM.P.strings.find(x => x.id === p.heading || x.name === p.heading); if (st && st.pts.length >= 2) { const q = st.pts[st.pts.length - 1], q0 = st.pts[st.pts.length - 2]; F = q; dir = norm([q[0] - q0[0], q[1] - q0[1], 0]); } }
    const side = [dir[1], -dir[0], 0]; let n = 0; const cnt = {}; const order = ['relief', 'cut', 'easer', 'perimeter', 'lifter'];
    holes.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || Math.hypot(a.fx, a.fy - cy0) - Math.hypot(b.fx, b.fy - cy0));
    holes.forEach(h => { const L2 = h.kind === 'relief' ? Lh + 0.2 : Lh; const out = h.kind === 'perimeter' || h.kind === 'lifter' ? p.lookout : 0; const c = add(add(F, side, h.fx), [0, 0, 1], h.fy); const rad = Math.hypot(h.fx, h.fy - p.h / 2) || 1; const o2 = [side[0] * h.fx / rad * out, side[1] * h.fx / rad * out, (h.fy - p.h / 2) / rad * out]; const t = add(c, norm(add(dir, o2)), L2);
      Object.assign(h, { id: `F${String(++n).padStart(3, '0')}`, row: order.indexOf(h.kind), col: n, x: c[0], y: c[1], z: c[2], ex: t[0], ey: t[1], ez: t[2], length: L2, charge: (CH[h.kind] || 0) * L2 * kgm * (h.kind === 'perimeter' ? 0.6 : 1), delay: DL[h.kind] + (cnt[h.kind] = (cnt[h.kind] || 0) + 1, h.kind === 'cut' ? Math.floor((cnt.cut - 1) / 4) * 25 : h.kind === 'easer' ? Math.floor((cnt.easer - 1) / 3) * 25 : 0) }); });
    const area = U.profileArea(prof), vol = area * p.advance, t = vol * S().density, kg = holes.reduce((a, h) => a + h.charge, 0), dm = holes.filter(h => h.kind !== 'relief').reduce((a, h) => a + h.length, 0);
    const byKind = order.map(k => ({ kind: k, holes: holes.filter(h => h.kind === k).length, kg: Math.round(holes.filter(h => h.kind === k).reduce((a, h) => a + h.charge, 0)) }));
    const B = { kind: 'face', params: p, holes, polygon: L('Face round', 'واجهة النفق'), profile: prof, summary: { holes: holes.length, rows: byKind.filter(k => k.holes).length, drill_m: dm, explosive_kg: kg, charge_kg_per_hole: kg / holes.length, volume_bcm: vol, tonnes: t, powder_factor_kg_t: kg / t, powder_factor_kg_m3: kg / vol, yield_t_per_m: t / dm, max_kg_per_delay: TM.Blast.maxPerDelay(holes) } }; if (!p.preview) { TM.P.blast = B; TM.touch('blast'); }
    return { _blast: B, profile: p.type, size: `${p.w} × ${p.h} m`, area_m2: +area.toFixed(2), advance_m: p.advance, hole_length_m: +Lh.toFixed(2), holes: holes.length, by_type: byKind, drill_m: Math.round(dm), explosive_kg: Math.round(kg), volume_m3: Math.round(vol), tonnes: Math.round(t), powder_factor_kg_m3: +(kg / vol).toFixed(2), specific_drilling_m_per_m3: +(dm / vol).toFixed(2) };
  };

  // ---------------------------------------------------------------- 4. open pit → underground transition
  // For each candidate RL: open pit = active pit truncated at that RL (scheduled bench by bench); underground = economic blocks
  // below RL − crown pillar valued at UG costs and mined at the UG rate after the pit. Combined NPV picks the transition RL.
  U.transition = function (o = {}) {
    const bm = TM.P.bm, a = TM.Pit.active(); if (!bm || !a) throw new Error(L('Needs a block model and a pit (LG shell or design).', 'يتطلب نموذج بلوكات وحفرة.'));
    const s = S(), p = Object.assign({ crown: s.ugCrown || 25, ugCost: s.ugMineCost || 60, ugRate: s.ugRate || 0.6e6, ugCapex: s.ugCapex || 80e6, step: s.benchH, ugCutoff: null }, o);
    const se = Object.assign({}, s, { ugMineCost: p.ugCost }), ue = U.econ(se), ugCog = p.ugCutoff != null ? p.ugCutoff : ue.breakeven, d = bm.def, r = s.discount / 100;
    let fmin = Infinity, ztop = -Infinity; for (let id = 0; id < bm.N; id++) { if (!bm.frac[id]) continue; const i = id % d.nx, j = Math.floor(id / d.nx) % d.ny, k = Math.floor(id / (d.nx * d.ny)); const x = d.x0 + (i + .5) * d.dx, y = d.y0 + (j + .5) * d.dy; const f = a.floorAt(x, y); if (isFinite(f)) fmin = Math.min(fmin, f); ztop = Math.max(ztop, d.z0 + (k + .5) * d.dz); }
    if (!isFinite(fmin)) throw new Error(L('The pit has no floor inside the block model.', 'لا يوجد قاع للحفرة داخل نموذج البلوكات.'));
    const rows = []; const zLow = d.z0;
    for (let zt = Math.ceil(ztop / p.step) * p.step; zt >= fmin - p.step; zt -= p.step) {
      const floor = (x, y) => { const f = a.floorAt(x, y); return isFinite(f) ? Math.max(f, zt) : NaN; };
      const op = TM.Mine.scheduleP(TM.Mine.panelsFromBM(bm, floor, s.benchH, s), Object.assign({}, s, { capex: 0, closure: 0 }));
      let ugT = 0, ugM = 0; for (let id = 0; id < bm.N; id++) { const g = bm.grade[id]; if (!(g >= ugCog)) continue; const k = Math.floor(id / (d.nx * d.ny)); const z = d.z0 + (k + .5) * d.dz; if (z > zt - p.crown) continue; const t = TM.Est.blockTonnes(bm, id); ugT += t; ugM += t * g; }
      const ugYears = ugT / p.ugRate, ugCashT = ugT ? (ugM / ugT * ue.netPrice - ue.cost) : 0; let ugNpv = 0;
      if (ugT > 0 && ugCashT > 0) { const n = Math.ceil(ugYears), start = op.life; ugNpv -= p.ugCapex / Math.pow(1 + r, Math.max(0, start - 1)); for (let y = 1; y <= n; y++) { const t = Math.min(p.ugRate, ugT - p.ugRate * (y - 1)); ugNpv += t * ugCashT / Math.pow(1 + r, start + y); } }
      const total = op.npv - s.capex + (ugNpv > 0 ? ugNpv : 0);
      rows.push({ rl: zt, op_ore_t: Math.round(op.total.ore), op_waste_t: Math.round(op.total.waste + op.total.low), op_sr: op.total.ore ? +((op.total.waste + op.total.low) / op.total.ore).toFixed(2) : null, op_life: op.life, op_npv_musd: +((op.npv - s.capex) / 1e6).toFixed(1), ug_ore_t: Math.round(ugT), ug_grade: ugT ? +(ugM / ugT).toFixed(2) : 0, ug_life: +ugYears.toFixed(1), ug_npv_musd: +(Math.max(0, ugNpv) / 1e6).toFixed(1), total_npv_musd: +(total / 1e6).toFixed(1) });
    }
    if (!rows.length) throw new Error('No candidate levels');
    const best = rows.reduce((m, q) => q.total_npv_musd > m.total_npv_musd ? q : m, rows[0]), pitOnly = rows[rows.length - 1];
    return { optimal_transition_rl: best.rl, combined_npv_musd: best.total_npv_musd, pit_only_npv_musd: pitOnly.op_npv_musd, gain_vs_pit_only_musd: +(best.total_npv_musd - pitOnly.total_npv_musd).toFixed(1), crown_pillar_m: p.crown, ug_cutoff: +ugCog.toFixed(2), ug_cost_t: p.ugCost, ug_rate_t: p.ugRate, ug_capex_musd: p.ugCapex / 1e6, pit: a.label, rows };
  };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
