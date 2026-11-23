/* TerraMind Studio — "virtual site visit" exporter for Blender: scene data, bilingual labels and title cards, camera tour,
   pit evolution by year; packaged with blender/build_scene.py (embedded as TM.BlenderPy) into a .zip, or rendered directly
   by Blender on the desktop edition. */
(function (TM) {
  'use strict';
  const BL = TM.Blender = {}; const L = TM.L, fmt = TM.fmt;
  const b64 = arr => { const u = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64'); };
  const r1 = v => Math.round(v * 10) / 10;

  // ---------------------------------------------------------------- what is in the project → kinds
  BL.solidKind = n => /^ST_/i.test(n) ? 'stope' : /dump|مكب/i.test(n) ? 'dump' : /(^|_)ob($|_)|overburden|waste|غطاء/i.test(n) ? 'waste' : /decline|xc_|crosscut|tunnel|drive|raise|far|ug_|portal|shaft/i.test(n) ? 'tunnel' : /ore|vein|grade|domain|shell|خام/i.test(n) ? 'ore' : 'other';
  BL.stringKind = n => /licen|lease|boundary|limit|حدود|رخصة/i.test(n) ? 'boundary' : /ramp/i.test(n) ? 'ramp' : /road|haul|طريق/i.test(n) ? 'road' : /dump|مكب/i.test(n) ? 'dump' : /decline|xc_|drive|raise|portal|stope|vent|far|rar|ug_/i.test(n) ? 'ug' : /pit|toe|crest|excav|bench|حفرة/i.test(n) ? 'pit' : 'other';
  // 3D prop built from a closed facility outline: [type, height m]
  BL.propKind = st => { if (!st.closed || st.pts.length < 3 || st.pts.length > 400) return null; const n = st.name;
    return /pond|settling|tailing|dam|حوض/i.test(n) ? ['water', 0] : /plant|mill|crusher|مصنع/i.test(n) ? ['building', 14] : /workshop|ورشة/i.test(n) ? ['building', 8] : /office|camp|مكتب|سكن/i.test(n) ? ['building', 4.5]
      : /magazine|explosive|متفجر/i.test(n) ? ['bunker', 3.5] : /pump|substation|power|generator/i.test(n) ? ['building', 4] : /fan|vent/i.test(n) ? ['fan', 5] : /rom|stockpile|pad/i.test(n) ? ['pad', 3] : null; };
  const FAC = [ // keyword → bilingual facility name
    [/licen|lease|boundary/i, 'حدود الرخصة', 'Licence'], [/rom|stockpile/i, 'منصة الخام', 'ROM pad'], [/workshop/i, 'الورشة', 'Workshop'], [/magazine|explosive/i, 'مخزن المتفجرات', 'Explosives magazine'],
    [/refuge/i, 'غرفة الإنقاذ', 'Refuge chamber'], [/portal|box ?cut/i, 'مدخل المنحدر', 'Decline portal'], [/pond|settling/i, 'أحواض الترسيب', 'Settling ponds'], [/pump/i, 'محطة الضخ', 'Pump station'],
    [/fan/i, 'مروحة التهوية', 'Main fan'], [/plant|mill|crusher/i, 'المصنع', 'Processing plant'], [/office|camp/i, 'المكاتب والسكن', 'Office & camp'], [/haul ?road|road/i, 'طريق النقل', 'Haul road'], [/ramp/i, 'طريق الحفرة', 'Pit ramp']];

  // ---------------------------------------------------------------- geometry helpers
  const centroid = pts => { let x = 0, y = 0, z = 0; for (const p of pts) { x += p[0]; y += p[1]; z += p[2]; } const n = pts.length || 1; return [x / n, y / n, z / n]; };
  function siteBox() {
    const P = TM.P; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; const add = (x, y) => { if (!isFinite(x) || !isFinite(y)) return; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
    P.db.collars.forEach(c => add(c.x, c.y)); P.strings.forEach(s => s.pts.forEach(p => add(p[0], p[1]))); P.solids.forEach(s => { for (let i = 0; i < s.pos.length; i += 9) add(s.pos[i], s.pos[i + 1]); });
    if (P.pit) { const lg = P.pit.lg; add(lg.x0, lg.y0); add(lg.x0 + lg.nx * lg.cell, lg.y0 + lg.ny * lg.cell); }
    const t = TM.rt.tin; if (!isFinite(x0) && t) { x0 = t.x0; y0 = t.y0; x1 = t.x1; y1 = t.y1; }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, half = Math.max(x1 - x0, y1 - y0) / 2 * 1.45 + 50;
    let b = { x0: cx - half, x1: cx + half, y0: cy - half, y1: cy + half };
    if (t) b = { x0: Math.max(b.x0, t.x0), x1: Math.min(b.x1, t.x1), y0: Math.max(b.y0, t.y0), y1: Math.min(b.y1, t.y1) };
    return b;
  }
  // fill cells outside the surveyed topography smoothly (outward fronts, then harmonic relaxation) so the
  // surveyed area does not stand on a flat plate
  function fillNaN(z, nx, ny) {
    const miss = []; for (let i = 0; i < z.length; i++) if (!isFinite(z[i])) miss.push(i); if (!miss.length) return z;
    if (miss.length === z.length) { z.fill(0); return z; }
    const nb = i => { const x = i % nx, y = (i - x) / nx, r = []; if (x > 0) r.push(i - 1); if (x < nx - 1) r.push(i + 1); if (y > 0) r.push(i - nx); if (y < ny - 1) r.push(i + nx); return r; };
    let left = miss; for (let it = 0; left.length && it < nx + ny; it++) { const upd = [], rest = []; for (const i of left) { let sm = 0, c = 0; for (const k of nb(i)) if (isFinite(z[k])) { sm += z[k]; c++; } if (c) upd.push([i, sm / c]); else rest.push(i); } for (const [i, v] of upd) z[i] = v; left = rest; }
    for (let it = 0; it < 60; it++) for (const i of miss) { let sm = 0, c = 0; for (const k of nb(i)) { sm += z[k]; c++; } z[i] = sm / c; }
    return z;
  }

  // year in which each (shell, bench) panel of the LG pit is finished, following the same rules as the schedule
  function panelYears(lg, shellOf, upTo, s) {
    const T = TM.Mine.panelTable(lg, shellOf, s), q = []; const last = Math.min(upTo + 1, T.nSh);
    for (let sh = 1; sh <= last; sh++) for (let k = T.nz - 1; k >= 0; k--) { const i = (sh - 1) * T.nz + k, tot = T.ore[i] + T.low[i] + T.waste[i]; if (tot > 1e-6) q.push({ sh, k, ore: T.ore[i], tot }); }
    const done = new Map(); let qi = 0, y = 0;
    while (qi < q.length && y < 300) { let mine = s.mineRate, mill = s.millRate; while (qi < q.length && mine > 1e-6 && mill > 1e-6) { const c = q[qi]; const f = Math.min(1, mine / c.tot, c.ore > 0 ? mill / c.ore : Infinity); mine -= c.tot * f; mill -= c.ore * f; c.ore -= c.ore * f; c.tot -= c.tot * f; if (c.tot < 1e-6) { done.set(c.sh * 1000 + c.k, y + 1 - mine / s.mineRate); qi++; } } y++; }
    return { done, life: y };
  }

  // ---------------------------------------------------------------- scene data
  BL.build = function (opt = {}) {
    const P = TM.P, s = P.settings, box = siteBox(), size = Math.max(box.x1 - box.x0, box.y1 - box.y0);
    const tz = (x, y) => TM.topoZ(x, y);
    // terrain grid
    const n = TM.clamp(Math.round(opt.gridN || 300), 60, 600), d = Math.max(1, size / n), nx = Math.ceil((box.x1 - box.x0) / d) + 1, ny = Math.ceil((box.y1 - box.y0) / d) + 1;
    const ox = Math.round((box.x0 + box.x1) / 2), oy = Math.round((box.y0 + box.y1) / 2);
    const Z = new Float32Array(nx * ny); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) Z[i + nx * j] = tz(box.x0 + i * d, box.y0 + j * d); fillNaN(Z, nx, ny);
    let zmin = Infinity, zmax = -Infinity; for (const v of Z) { zmin = Math.min(zmin, v); zmax = Math.max(zmax, v); } const oz = Math.floor(zmin);
    const rel = (x, y, z) => [r1(x - ox), r1(y - oy), r1(z - oz)];
    // final pit and production years
    const plan = P.bm && TM.Pit.active() ? TM.WF.plan() : null; let pitYears = [], finalZ = null, life = 0, pitDepth = 0;
    if (P.pit && TM.Pit.active() && TM.Pit.active().kind === 'shell') {
      const lg = P.pit.lg, py = panelYears(lg, P.pit.shellOf, P.pit.selected, s); life = py.life; const plane = lg.nx * lg.ny;
      const colTimes = new Map(); // column → [[zb, year], ...] top-down
      const floorAt = (x, y, Y) => { const i = Math.floor((x - lg.x0) / lg.cell), j = Math.floor((y - lg.y0) / lg.cell); if (i < 0 || j < 0 || i >= lg.nx || j >= lg.ny) return Infinity; const col = i + lg.nx * j; let arr = colTimes.get(col); if (!arr) { arr = []; for (let k = lg.nz - 1; k >= 0; k--) { const sh = P.pit.shellOf[col + plane * k]; if (!sh || sh > P.pit.selected + 1) { if (arr.length) break; else continue; } arr.push([lg.zBot + k * lg.benchH, py.done.get(sh * 1000 + k) ?? Infinity]); } colTimes.set(col, arr); } let f = Infinity; for (const [zb, t] of arr) { if (t <= Y) f = zb; else break; } return f; };
      const nYears = Math.min(life, 24), step = life / nYears;
      for (let k = 1; k <= nYears; k++) { const Y = k * step, z = new Float32Array(nx * ny); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const x = box.x0 + i * d, y = box.y0 + j * d; z[i + nx * j] = Math.min(Z[i + nx * j], floorAt(x, y, Y + 1e-6)); } pitYears.push({ year: Math.round(Y), z }); }
      finalZ = pitYears.length ? pitYears[pitYears.length - 1].z : null;
    } else {
      const D = P.design && P.design.kind === 'pit' ? P.design : null; const ps = !D && P.surfaces.find(x => /pit/i.test(x.name) && x.role !== 'topo'); const tin = ps ? TM.Surf.tinOf(ps) : null;
      const fz = D ? (x, y) => TM.Design.zAt(D, x, y) : tin ? (x, y) => tin.z(x, y) : null;
      if (fz) { finalZ = new Float32Array(nx * ny); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const v = fz(box.x0 + i * d, box.y0 + j * d); finalZ[i + nx * j] = isFinite(v) ? Math.min(Z[i + nx * j], v) : Z[i + nx * j]; }
        let maxDepth = 0; for (let i = 0; i < Z.length; i++) maxDepth = Math.max(maxDepth, Z[i] - finalZ[i]); life = plan ? plan.life : 8; const nYears = Math.min(Math.max(life, 4), 16);
        for (let k = 1; k <= nYears; k++) { const dep = maxDepth * k / nYears, z = new Float32Array(nx * ny); for (let i = 0; i < z.length; i++) z[i] = Math.max(finalZ[i], Z[i] - dep); pitYears.push({ year: Math.round(k * (life / nYears)), z }); } }
    }
    let pc = [0, 0, 0], pn = 0; if (finalZ) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const dd = Z[i + nx * j] - finalZ[i + nx * j]; if (dd > 1) { pc[0] += box.x0 + i * d; pc[1] += box.y0 + j * d; pc[2] += Z[i + nx * j]; pn++; pitDepth = Math.max(pitDepth, dd); } }
    const pitCenter = pn ? [pc[0] / pn, pc[1] / pn, pc[2] / pn] : null;
    // vertical exaggeration for shallow sites
    const relief = Math.max(zmax - zmin + pitDepth, 1); const ve = opt.ve && opt.ve !== 'auto' ? +opt.ve : TM.clamp(Math.round(0.05 * size / relief * 2) / 2, 1, 3);
    // drillholes
    const holes = TM.rt.holes.map(h => { const pts = []; const dep = h.depth || 0; for (let m = 0; m <= dep + 1e-6; m += Math.max(1, dep / 12)) { const p = TM.Drill.posAt(h.st, Math.min(m, dep)); pts.push(rel(p[0], p[1], p[2])); } return { id: h.id, pts }; }).filter(h => h.pts.length > 1);
    // ore blocks ≥ cut-off coloured by grade
    let blocks = null, ore = null; if (P.bm) { const bm = P.bm, dd = bm.def, ids = []; for (let id = 0; id < bm.N; id++) if (bm.grade[id] >= s.cutoff && bm.frac[id] > 0) ids.push(id); const stride = Math.max(1, Math.ceil(ids.length / (opt.maxBlocks || 40000))); const c = [], col = []; let sx = 0, sy = 0, sz = 0, zt = -Infinity, nb = 0;
      for (let q = 0; q < ids.length; q += stride) { const id = ids[q], i = id % dd.nx, j = Math.floor(id / dd.nx) % dd.ny, k = Math.floor(id / (dd.nx * dd.ny)); const x = dd.x0 + (i + .5) * dd.dx, y = dd.y0 + (j + .5) * dd.dy, z = dd.z0 + (k + .5) * dd.dz; c.push(x - ox, y - oy, z - oz); const rgb = TM.VP.cmap(bm.grade[id]); col.push(rgb[0], rgb[1], rgb[2]); sx += x; sy += y; sz += z; zt = Math.max(zt, z); nb++; }
      if (nb) { blocks = { size: [dd.dx, dd.dy, dd.dz], centers: b64(new Float32Array(c)), colors: b64(new Float32Array(col)), count: nb }; ore = [sx / nb, sy / nb, zt]; } }
    // solids
    const solids = []; for (const so of P.solids) { if (so.idx.length / 3 > 400000) continue; const kind = BL.solidKind(so.name); const pos = new Float32Array(so.pos.length); for (let i = 0; i < so.pos.length; i += 3) { pos[i] = so.pos[i] - ox; pos[i + 1] = so.pos[i + 1] - oy; pos[i + 2] = so.pos[i + 2] - oz; } solids.push({ name: so.name.replace(/[^\w-]+/g, '_'), kind, pos: b64(pos), idx: b64(new Uint32Array(so.idx)), color: so.color }); }
    if (P.dump && P.dump !== P.design) { const m = TM.Design.toMesh(P.dump, 2); const pos = new Float32Array(m.pos.length); for (let i = 0; i < m.pos.length; i += 3) { pos[i] = m.pos[i] - ox; pos[i + 1] = m.pos[i + 1] - oy; pos[i + 2] = m.pos[i + 2] - oz; } solids.push({ name: 'Dump_design', kind: 'dump', pos: b64(pos), idx: b64(new Uint32Array(m.idx)) }); }
    // strings
    const strings = []; const designStr = P.design ? P.design.strings.map(x => ({ name: x.name, pts: x.pts, closed: false, ramp: x.kind === 'ramp' })) : [];
    for (const st of P.strings.concat(designStr)) { if (st.pts.length < 2 || st.pts.length > 6000 || /contour/i.test(st.name)) continue; strings.push({ name: st.name.replace(/[^\w-]+/g, '_'), kind: st.ramp ? 'ramp' : BL.stringKind(st.name), prop: BL.propKind(st), closed: !!st.closed, pts: st.pts.map(p => rel(p[0], p[1], isFinite(p[2]) ? p[2] : tz(p[0], p[1]))) }); }
    // facilities (anchors in real coordinates)
    const fac = []; const push = (key, ar, en, p, sub) => { if (!p || !p.every(isFinite) || fac.some(f => f.key === key)) return null; const o = { key, ar, en, sub, p }; fac.push(o); return o; };
    const lic = P.strings.find(x => x.closed && /licen|lease|boundary|limit/i.test(x.name)); if (lic) { const c = lic.pts.reduce((a, p) => (p[0] + p[1] > a[0] + a[1] ? p : a), lic.pts[0]); push('licence', 'حدود الرخصة', 'Licence boundary', [c[0], c[1], tz(c[0], c[1]) || c[2]], `${fmt(TM.Surf.polyArea(lic.pts) / 1e6, 2)} km²`); }
    if (pitCenter) push('pit', 'الحفرة المفتوحة', 'Open pit', pitCenter, L(`depth ${fmt(pitDepth, 0)} m`, `العمق ${fmt(pitDepth, 0)} م`));
    if (ore) { const k = plan ? plan.total : null; push('ore', 'جسم الخام', 'Ore body', [ore[0], ore[1], Math.max(ore[2], tz(ore[0], ore[1]) || ore[2])], k ? `${fmt(k.ore / 1e6, 2)} Mt @ ${fmt(k.grade, 2)} ${s.gradeUnit}` : ''); }
    for (const so of P.solids) { const k = BL.solidKind(so.name); if (k === 'dump') { let x = 0, y = 0, z = -Infinity, n = 0; for (let i = 0; i < so.pos.length; i += 3) { x += so.pos[i]; y += so.pos[i + 1]; z = Math.max(z, so.pos[i + 2]); n++; } push('dump', 'مكب النفايات', 'Waste dump', [x / n, y / n, z], `${fmt(so.volume / 1e3)}k m³`); } }
    if (P.dump) { const g = P.dump.grid; push('dump', 'مكب النفايات', 'Waste dump', [g.x0 + g.nx * g.res / 2, g.y0 + g.ny * g.res / 2, P.dump.stats.z0 + 20], `${fmt(P.dump.stats.volume / 1e3)}k m³`); }
    if (P.db.collars.length) { const c = centroid(P.db.collars.map(q => [q.x, q.y, q.z])); push('holes', 'حقل الآبار', 'Drillholes', c, `${P.db.collars.length}`); }
    for (const st of P.strings) { const hit = FAC.find(f => f[0].test(st.name)); if (!hit) continue; const key = hit[2].toLowerCase().replace(/\W+/g, '_'); const p = /portal/i.test(st.name) ? st.pts[0] : centroid(st.pts), g = tz(p[0], p[1]); const ug = isFinite(g) && p[2] < g - 15; const o = push(key, hit[1], hit[2], [p[0], p[1], ug ? p[2] : Math.max(p[2], isFinite(g) ? g : p[2])], ug ? L(`underground · RL ${fmt(p[2], 0)}`, `تحت الأرض · منسوب ${fmt(p[2], 0)}`) : undefined); if (o && ug) o.ug = true; }
    const stopes = P.solids.filter(x => /^ST_/i.test(x.name)); if (stopes.length) { let x = 0, y = 0, z = 0, nn = 0; stopes.forEach(so => { x += so.pos[0]; y += so.pos[1]; z += so.pos[2]; nn++; }); push('stopes', 'غرف الإنتاج تحت الأرض', 'Underground stopes', [x / nn, y / nn, z / nn], `${stopes.length}`); }
    const facilities = fac.slice(0, opt.maxStops || 9);
    // ---------------------------------------------------------------- timeline (seconds)
    const sections = Object.assign({ tour: true, worker: true, geology: true, mine: true, underground: true, blast: true, finale: true }, opt.sections || {});
    const TL = {}; let t = 0; const seg = (k, dur) => { TL[k] = [r1(t), r1(t + dur)]; t += dur; };
    seg('intro', 7);
    const tourStops = facilities.filter(f => f.key !== 'stopes' && !f.ug); if (sections.tour && tourStops.length) seg('tour', Math.min(30, 3.4 * tourStops.length));
    const workerAt = pitCenter || ore || (facilities[0] && facilities[0].p); if (sections.worker && workerAt) seg('worker', 6);
    if (sections.geology && (blocks || holes.length || P.solids.some(x => BL.solidKind(x.name) === 'ore'))) seg('geology', 10);
    if (sections.mine && pitYears.length) seg('mine', Math.min(18, 6 + pitYears.length * 0.6));
    if (sections.underground && P.solids.some(x => ['stope', 'tunnel'].includes(BL.solidKind(x.name)))) seg('underground', 8);
    const blast = P.blast && sections.blast ? P.blast : null; if (blast) seg('blast', 6);
    seg('finale', 9); const duration = t;
    // ---------------------------------------------------------------- camera tour (real metres relative to origin; Blender applies VE to z)
    const C = [(box.x0 + box.x1) / 2 - ox, (box.y0 + box.y1) / 2 - oy, (zmax + zmin) / 2 - oz]; const R = p => rel(p[0], p[1], p[2]);
    const orbit = (ctr, dist, h, ang) => [ctr[0] + Math.cos(ang) * dist, ctr[1] + Math.sin(ang) * dist, ctr[2] + h / ve];
    const cam = []; const shot = (sec_, from, to, look0, look1, lens) => cam.push({ t: sec_, from: from.map(r1), to: to.map(r1), look: [look0.map(r1), (look1 || look0).map(r1)], lens });
    shot(TL.intro, orbit(C, size * 1.5, size * 0.75, -2.2), orbit(C, size * 0.85, size * 0.42, -1.75), C, C, 28);
    if (TL.tour) { const per = (TL.tour[1] - TL.tour[0]) / tourStops.length; tourStops.forEach((f, k) => { const p = R(f.p), a = -1.75 + k * (2 * Math.PI / Math.max(tourStops.length, 3)) * 0.55, dist = size * 0.24, h = size * 0.13; f.show = [TL.tour[0] + k * per - 0.4, TL.tour[0] + (k + 1) * per + 0.6]; shot([TL.tour[0] + k * per, TL.tour[0] + (k + 1) * per], orbit(p, dist * 1.08, h * 1.05, a), orbit(p, dist * 0.92, h * 0.95, a + 0.25), [p[0], p[1], p[2]], [p[0], p[1], p[2]], 32); }); }
    if (TL.worker) { const w = R(workerAt); const ang = -0.9, start = [w[0] + Math.cos(ang) * size * 0.3, w[1] + Math.sin(ang) * size * 0.3]; const g = (x, y) => (tz(x + ox, y + oy) || oz) - oz; const eye = 1.8 / ve; shot(TL.worker, [start[0], start[1], g(start[0], start[1]) + eye + 1], [start[0] + (w[0] - start[0]) * 0.35, start[1] + (w[1] - start[1]) * 0.35, g(start[0] + (w[0] - start[0]) * 0.35, start[1] + (w[1] - start[1]) * 0.35) + eye + 1], [w[0], w[1], w[2] - pitDepth * 0.4], [w[0], w[1], w[2] - pitDepth * 0.6], 24); }
    if (TL.geology) { const g = ore ? R(ore) : C; shot(TL.geology, orbit(g, size * 0.62, size * 0.3, -0.6), orbit(g, size * 0.62, size * 0.3, 0.9), [g[0], g[1], g[2] - 8], [g[0], g[1], g[2] - 8], 30); }
    if (TL.mine) { const m = pitCenter ? R(pitCenter) : C; shot(TL.mine, orbit(m, size * 0.55, size * 0.48, 0.9), orbit(m, size * 0.5, size * 0.42, 1.6), [m[0], m[1], m[2] - pitDepth * 0.5], [m[0], m[1], m[2] - pitDepth * 0.5], 30); }
    if (TL.underground) { let x = 0, y = 0, z = 0, nn = 0; P.solids.filter(q => ['stope', 'tunnel'].includes(BL.solidKind(q.name))).forEach(so => { for (let i = 0; i < so.pos.length; i += 300) { x += so.pos[i]; y += so.pos[i + 1]; z += so.pos[i + 2]; nn++; } }); const u = R([x / nn, y / nn, z / nn]); shot(TL.underground, orbit(u, size * 0.5, size * 0.15, 1.6), orbit(u, size * 0.45, size * 0.1, 2.6), u, u, 30); }
    let blastOut = null; if (blast) { const hs = blast.holes; const c = centroid(hs.map(h => [h.x, h.y, h.z])); let r = 0; hs.forEach(h => r = Math.max(r, Math.hypot(h.x - c[0], h.y - c[1]))); blastOut = { center: R(c), radius: Math.max(8, r), holes: hs.slice(0, 400).map(h => R([h.x, h.y, h.z])) }; const bc = blastOut.center; shot(TL.blast, orbit(bc, r * 4 + 40, r * 1.6 + 20, 2.4), orbit(bc, r * 3.2 + 30, r * 1.1 + 15, 2.7), bc, [bc[0], bc[1], bc[2] + r * 0.5], 30); }
    shot(TL.finale, orbit(C, size * 0.9, size * 0.55, 2.0), orbit(C, size * 1.25, size * 1.1, 2.5), C, C, 28);
    const xray = []; if (TL.geology) xray.push([TL.geology[0], TL.geology[1], 0.72]); if (TL.underground) xray.push([TL.underground[0], TL.underground[1], 0.85]);
    return {
      meta: { size, ox, oy, oz, ve, duration, facilities, pitYears, plan, life, sections: TL, pitDepth },
      scene: { version: 1, project: { name: P.name, file: (P.name || 'project').replace(/[^\w؀-ۿ-]+/g, '_').slice(0, 60), crs: P.crs }, size, ve, origin: [ox, oy, oz],
        options: { fps: opt.fps || 24, duration, res: opt.res || '1080', engine: opt.engine || 'eevee', quality: opt.quality || 'final', langs: opt.langs || ['ar', 'en'] },
        style: { sand_light: '#E2B475', sand_dark: '#B47C45', rock: '#6E4A33', bench: '#C0612C', sun_elevation: 28, sun_azimuth: 215, sun_energy: 3.2, sky_strength: 0.07, exposure: -0.6 },
        terrain: { nx, ny, x0: r1(box.x0 - ox), y0: r1(box.y0 - oy), dx: d, dy: d, z: b64(Z.map(v => v - oz)) },
        pitYears: pitYears.map(y => ({ year: y.year, z: b64(y.z.map(v => v - oz)) })), holes, blocks, solids, strings, blast: blastOut,
        facilities: facilities.map(f => ({ key: f.key, ug: !!f.ug, pos: R(f.p), label: `labels/${f.key}.png`, show: f.show || (f.ug || f.key === 'stopes' ? (TL.underground || TL.geology || [duration, duration]) : [TL.tour ? TL.tour[0] : 0, duration]) })),
        camera: cam, timeline: TL, xray, overlays: [] }
    };
  };

  // ---------------------------------------------------------------- 2D artwork (canvas → PNG): labels and title cards
  const FONT = '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif';
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const png = c => new Promise(res => c.toBlob(b => b.arrayBuffer().then(a => res(new Uint8Array(a))), 'image/png'));
  const fit = (g, text, weight, size, maxW) => { let sz = size; do { g.font = `${weight} ${sz}px ${FONT}`; sz -= 2; } while (g.measureText(text).width > maxW && sz > 18); };
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const COLORS = { licence: '#F472B6', pit: '#34D399', ore: '#F2B740', dump: '#C8A27A', holes: '#F2C94C', stopes: '#F59E0B' };
  BL.labelPNG = async function (f) {
    const [c, g] = canvas(1100, 230); g.clearRect(0, 0, 1100, 230); const col = COLORS[f.key] || '#38BDF8';
    rr(g, 10, 10, 1080, 210, 34); g.fillStyle = 'rgba(11,15,25,0.86)'; g.fill(); g.lineWidth = 6; g.strokeStyle = col; g.stroke();
    g.fillStyle = col; g.beginPath(); g.arc(1030, 115, 26, 0, Math.PI * 2); g.fill();
    g.textBaseline = 'middle'; g.direction = 'rtl'; g.textAlign = 'right'; g.fillStyle = '#FFFFFF'; fit(g, f.ar, 700, 70, 940); g.fillText(f.ar, 985, 78);
    g.direction = 'ltr'; g.textAlign = 'right'; g.fillStyle = '#C9D1DE'; fit(g, f.en + (f.sub ? '  ·  ' + f.sub : ''), 500, 50, 940); g.fillText(f.en + (f.sub ? '  ·  ' + f.sub : ''), 985, 160);
    return png(c);
  };
  BL.cardPNG = async function ({ lang, kind, title, sub, lines = [], big }) {
    const W = 1920, H = 1080, [c, g] = canvas(W, H); g.clearRect(0, 0, W, H); const ar = lang === 'ar'; g.direction = ar ? 'rtl' : 'ltr'; g.textBaseline = 'alphabetic';
    const X = ar ? W - 110 : 110; g.textAlign = ar ? 'right' : 'left';
    if (kind === 'title') { const grd = g.createLinearGradient(0, H * 0.55, 0, H); grd.addColorStop(0, 'rgba(11,15,25,0)'); grd.addColorStop(1, 'rgba(11,15,25,0.92)'); g.fillStyle = grd; g.fillRect(0, H * 0.5, W, H * 0.5);
      g.fillStyle = '#34D399'; g.font = `600 38px ${FONT}`; g.fillText(sub || '', X, H - 250); g.fillStyle = '#FFFFFF'; fit(g, title, 700, 104, W - 220); g.fillText(title, X, H - 130); g.fillStyle = '#C9D1DE'; g.font = `500 34px ${FONT}`; g.fillText(lines[0] || '', X, H - 70); }
    else if (kind === 'lower') { const w = 1120, h = 170 + lines.length * 46, x = ar ? W - 80 - w : 80, y = H - 90 - h; rr(g, x, y, w, h, 26); g.fillStyle = 'rgba(11,15,25,0.82)'; g.fill(); g.fillStyle = '#10B981'; g.fillRect(ar ? x + w - 12 : x, y + 26, 12, h - 52);
      const tx = ar ? x + w - 50 : x + 50; g.textAlign = ar ? 'right' : 'left'; g.fillStyle = '#34D399'; g.font = `600 32px ${FONT}`; g.fillText(sub || '', tx, y + 62); g.fillStyle = '#FFFFFF'; fit(g, title, 700, 62, w - 100); g.fillText(title, tx, y + 132); g.fillStyle = '#C9D1DE'; g.font = `500 34px ${FONT}`; lines.forEach((ln, k) => g.fillText(ln, tx, y + 184 + k * 46)); }
    else if (kind === 'year') { const w = 560, h = 230, x = ar ? 70 : W - 70 - w, y = 70; rr(g, x, y, w, h, 24); g.fillStyle = 'rgba(11,15,25,0.82)'; g.fill(); const tx = ar ? x + w - 40 : x + 40; g.textAlign = ar ? 'right' : 'left';
      g.fillStyle = '#34D399'; g.font = `600 30px ${FONT}`; g.fillText(sub, tx, y + 52); g.fillStyle = '#FFFFFF'; g.font = `700 76px ${FONT}`; g.fillText(title, tx, y + 132); g.fillStyle = '#C9D1DE'; g.font = `500 30px ${FONT}`; lines.forEach((ln, k) => g.fillText(ln, tx, y + 178 + k * 38)); }
    else if (kind === 'kpi') { g.fillStyle = 'rgba(11,15,25,0.78)'; g.fillRect(0, 0, W, H); g.textAlign = 'center'; g.fillStyle = '#34D399'; g.font = `600 40px ${FONT}`; g.fillText(sub, W / 2, 170); g.fillStyle = '#FFFFFF'; fit(g, title, 700, 86, W - 200); g.fillText(title, W / 2, 270);
      const cols = 3, cw = 520, chh = 230, gx = (W - cols * cw - (cols - 1) * 40) / 2; big.forEach((b, k) => { const i = k % cols, j = Math.floor(k / cols), x = ar ? W - gx - (i + 1) * cw - i * 40 : gx + i * (cw + 40), y = 340 + j * (chh + 40); rr(g, x, y, cw, chh, 26); g.fillStyle = 'rgba(17,24,39,0.95)'; g.fill(); g.strokeStyle = '#1F2937'; g.lineWidth = 3; g.stroke(); g.fillStyle = b.color || '#34D399'; g.font = `700 78px ${FONT}`; g.direction = 'ltr'; g.fillText(b.v, x + cw / 2, y + 120); g.direction = ar ? 'rtl' : 'ltr'; g.fillStyle = '#C9D1DE'; g.font = `500 34px ${FONT}`; g.fillText(b.k, x + cw / 2, y + 182); });
      g.fillStyle = '#6F7A8E'; g.font = `500 26px ${FONT}`; g.fillText(lines[0] || '', W / 2, H - 60); }
    else if (kind === 'legend') { const w = 520, h = 150, x = ar ? 70 : W - 70 - w, y = 70; rr(g, x, y, w, h, 22); g.fillStyle = 'rgba(11,15,25,0.82)'; g.fill(); const tx = ar ? x + w - 36 : x + 36; g.textAlign = ar ? 'right' : 'left'; g.fillStyle = '#FFFFFF'; g.font = `600 30px ${FONT}`; g.fillText(title, tx, y + 50);
      for (let i = 0; i < 400; i++) { const v = TM.VP.gmin + (TM.VP.gmax - TM.VP.gmin) * i / 399, col = TM.VP.cmap(v).map(q => Math.round(q * 255)); g.fillStyle = `rgb(${col})`; g.fillRect(x + 60 + i, y + 74, 1, 26); } g.direction = 'ltr'; g.textAlign = 'left'; g.fillStyle = '#C9D1DE'; g.font = `500 24px ${FONT}`; g.fillText(fmt(TM.VP.gmin, 2), x + 60, y + 130); g.textAlign = 'right'; g.fillText(fmt(TM.VP.gmax, 2) + ' ' + TM.P.settings.gradeUnit, x + 460, y + 130); }
    return png(c);
  };

  // ---------------------------------------------------------------- package
  BL.package = async function (opt = {}, onProgress) {
    TM.VP.updateRange && TM.VP.updateRange(); const P = TM.P, s = P.settings; const B = BL.build(opt), S = B.scene, M = B.meta, TL = M.sections; const files = []; const add = (name, data) => files.push({ name, data });
    const step = async (p) => { if (onProgress) onProgress(p); await TM.sleep(0); };
    for (const f of M.facilities) add(`labels/${f.key}.png`, await BL.labelPNG(f)); await step(0.2);
    const unit = s.gradeUnit, plan = M.plan, t = plan ? plan.total : null, ind = s.commodity === 'industrial';
    const loc = `${P.crs || ''}`; const nm = P.name;
    const K = { ar: {}, en: {} };
    const tx = (ar, en) => ({ ar, en });
    const T = {
      title: { title: nm, sub: tx('زيارة افتراضية للموقع · TerraMind Studio', 'Virtual site visit · TerraMind Studio'), line: tx(`${loc}${M.ve > 1 ? ` · مبالغة رأسية ×${M.ve}` : ''}`, `${loc}${M.ve > 1 ? ` · vertical exaggeration ×${M.ve}` : ''}`) },
      tour: tx(['جولة في الموقع', 'المنشآت والحدود كما هي على الأرض'], ['Site tour', 'Facilities and boundaries as they are on the ground']),
      worker: tx(['منظور العامل', 'المشهد من مستوى الأرض عند حافة الموقع'], ['Worker\'s view', 'The site seen from ground level']),
      geology: tx(['ما تحت الأرض', t ? `الخام ${fmt(t.ore / 1e6, 2)} مليون طن بتركيز ${fmt(t.grade, 2)} ${unit}` : 'الآبار وجسم الخام'], ['Beneath the surface', t ? `Ore ${fmt(t.ore / 1e6, 2)} Mt @ ${fmt(t.grade, 2)} ${unit}` : 'Drillholes and the ore body']),
      mine: tx(['خطة التعدين سنة بسنة', plan ? `${plan.life} سنة · ${plan.pushbacks} مرحلة` : 'تطور الحفرة'], ['Mine plan, year by year', plan ? `${plan.life} years · ${plan.pushbacks} pushbacks` : 'Pit development']),
      underground: tx(['المنجم تحت الأرض', 'المنحدر والأنفاق وغرف الإنتاج'], ['Underground mine', 'Decline, drives and stopes']),
      blast: tx(['التفجير', P.blast ? `${P.blast.holes.length} ثقباً · ${fmt(P.blast.summary.tonnes)} طن` : ''], ['Blasting', P.blast ? `${P.blast.holes.length} holes · ${fmt(P.blast.summary.tonnes)} t` : ''])
    };
    const ov = []; const card = async (key, t0, t1, o) => { const f = {}; for (const lang of ['ar', 'en']) { const name = `overlays/${lang}/${key}.png`; add(name, await BL.cardPNG(Object.assign({ lang }, typeof o === 'function' ? o(lang) : o))); f[lang] = name; } ov.push({ files: f, t: [t0, t1] }); };
    await card('title', 0.6, TL.intro[1] - 0.2, l => ({ kind: 'title', title: T.title.title, sub: T.title.sub[l], lines: [T.title.line[l]] }));
    for (const k of ['tour', 'worker', 'geology', 'mine', 'underground', 'blast']) if (TL[k]) { const a = TL[k][0] + 0.3, b = Math.min(TL[k][1], a + 4.5); await card(k, a, b, l => ({ kind: 'lower', title: T[k][l][0], sub: l === 'ar' ? 'TerraMind Studio' : 'TerraMind Studio', lines: [T[k][l][1]].filter(Boolean) })); }
    if (TL.geology && P.bm) await card('legend', TL.geology[0] + 1, TL.geology[1] - 0.3, l => ({ kind: 'legend', title: (l === 'ar' ? 'التركيز · ' : 'Grade · ') + s.gradeField }));
    await step(0.45);
    if (TL.mine && M.pitYears.length) { const yrs = plan ? plan.years : []; const n = M.pitYears.length, per = (TL.mine[1] - TL.mine[0]) / n; let cum = -s.capex;
      for (let k = 0; k < n; k++) { const Y = M.pitYears[k].year, yr = yrs[Math.min(Y, yrs.length) - 1]; if (yr) cum = yrs.slice(0, Y).reduce((a, q) => a + q.cash, -s.capex); const life = plan ? plan.life : M.life;
        await card(`year_${k + 1}`, TL.mine[0] + k * per, TL.mine[0] + (k + 1) * per + 0.05, l => ({ kind: 'year', sub: l === 'ar' ? 'السنة' : 'Year', title: l === 'ar' ? `${Y} من ${life}` : `${Y} / ${life}`, lines: yr ? (l === 'ar' ? [`خام ${fmt(yr.ore / 1e6, 2)} مليون طن · نفايات ${fmt(yr.waste / 1e6, 2)}`, `النقد التراكمي ${TM.usd(cum / 1e6, 1)} مليون`] : [`Ore ${fmt(yr.ore / 1e6, 2)} Mt · waste ${fmt(yr.waste / 1e6, 2)} Mt`, `Cumulative cash ${TM.usd(cum / 1e6, 1)}M`]) : [] })); if (k % 4 === 0) await step(0.45 + 0.35 * k / n); } }
    const kp = []; if (t) { kp.push({ k: tx('الخام المعدَّن', 'Ore mined'), v: `${fmt(t.ore / 1e6, 2)} Mt` }, { k: tx('التركيز', 'Grade'), v: `${fmt(t.grade, 2)} ${unit}` }, ind ? { k: tx('المنتج القابل للبيع', 'Saleable product'), v: `${fmt(t.oz / 1e6, 2)} Mt` } : { k: tx('الذهب المستخلص', 'Recovered gold'), v: `${fmt(t.oz / 1e3, 0)} koz` }, { k: tx('صافي القيمة الحالية', `NPV @ ${s.discount}%`), v: `${TM.usd(plan.npv / 1e6, 1)}M`, color: plan.npv >= 0 ? '#34D399' : '#F87171' }, { k: tx('معدل العائد الداخلي', 'IRR'), v: plan.irr != null ? `${fmt(plan.irr * 100, 1)}%` : '—', color: '#3B82F6' }, { k: tx('عمر المنجم', 'Mine life'), v: tx(`${plan.life} سنة`, `${plan.life} yr`), color: '#F59E0B' }); }
    else if (P.bm) { const rp = TM.Est.report(P.bm, s.cutoff); kp.push({ k: tx('المورد', 'Resource'), v: `${fmt(rp.tonnes / 1e6, 2)} Mt` }, { k: tx('التركيز', 'Grade'), v: `${fmt(rp.grade, 2)} ${unit}` }, { k: tx('عدد الآبار', 'Drillholes'), v: `${P.db.collars.length}` }); }
    else kp.push({ k: tx('عدد الآبار', 'Drillholes'), v: `${P.db.collars.length}` }, { k: tx('الأسطح', 'Surfaces'), v: `${P.surfaces.length}` }, { k: tx('المجسمات', 'Solids'), v: `${P.solids.length}` });
    await card('kpi', TL.finale[0] + 0.8, TL.finale[1], l => ({ kind: 'kpi', sub: l === 'ar' ? 'خلاصة المشروع' : 'Project at a glance', title: nm, big: kp.map(b => ({ k: b.k[l], v: typeof b.v === 'object' ? b.v[l] : b.v, color: b.color })), lines: [l === 'ar' ? 'الأرقام من نموذج TerraMind Studio · يجب اعتمادها من شخص مؤهَّل قبل الإفصاح' : 'Figures from the TerraMind Studio model · to be signed off by a Competent Person before disclosure'] }));
    S.overlays = ov; await step(0.9);
    add('scene.json', JSON.stringify(S)); add('build_scene.py', TM.BlenderPy || '# build_scene.py missing');
    add('render_windows.bat', BL.bat()); add('render_mac_linux.sh', BL.sh()); add('README_AR.txt', BL.readme(M));
    await step(1); return { files, meta: M };
  };
  BL.bat = () => ['@echo off', 'chcp 65001 >nul', 'setlocal', 'set "B="', 'for /d %%d in ("%ProgramFiles%\\Blender Foundation\\Blender*") do if exist "%%d\\blender.exe" set "B=%%d\\blender.exe"', 'if "%B%"=="" for %%d in ("%ProgramFiles(x86)%\\Steam\\steamapps\\common\\Blender\\blender.exe") do if exist "%%~d" set "B=%%~d"', 'if "%B%"=="" (echo Blender was not found. Install Blender 4.2 or newer from blender.org & pause & exit /b 1)', 'echo Using %B%', '"%B%" -b -P "%~dp0build_scene.py" -- --render %*', 'echo.', 'echo Done. Videos are in "%~dp0output"', 'start "" "%~dp0output"', 'pause', ''].join('\r\n');
  BL.sh = () => ['#!/bin/sh', 'cd "$(dirname "$0")"', 'B=$(command -v blender || ls -d /Applications/Blender.app/Contents/MacOS/Blender 2>/dev/null | head -1)', '[ -z "$B" ] && echo "Blender not found (install 4.2+ from blender.org)" && exit 1', '"$B" -b -P build_scene.py -- --render "$@"', ''].join('\n');
  BL.readme = M => ['TerraMind Studio — زيارة افتراضية للموقع (Blender)', '', 'المحتوى:', '  scene.json      بيانات المشروع (السطح، الحفرة سنة بسنة، الآبار، الخام، المجسمات، الخطوط، المنشآت، مسار الكاميرا)', '  build_scene.py  سكريبت Blender الذي يبني المشهد', '  labels/         لافتات المنشآت (عربي + إنجليزي)', '  overlays/       العناوين والأرقام بالعربية والإنجليزية', '', 'الطريقة 1 (بضغطة): شغّل render_windows.bat — يرندر الفيديو ويضع النسختين العربية والإنجليزية في مجلد output.', '  خيارات: render_windows.bat --quality preview   (معاينة سريعة)', '          render_windows.bat --engine cycles      (أعلى واقعية، أبطأ)', '          render_windows.bat --res 2160           (4K)', '', 'الطريقة 2 (داخل Blender 4.2 أو أحدث): Scripting → Open → build_scene.py → Run Script.', '  سيُبنى المشهد؛ اضغط Ctrl+F12 لرندر الفيديو. المشهد Final_AR أو Final_EN يضيف العناوين.', '', `المدة ${Math.round(M.duration)} ثانية · مبالغة رأسية ×${M.ve} · ${M.facilities.length} منشأة · ${M.pitYears.length} مرحلة للحفرة`, ''].join('\r\n');

  // ---------------------------------------------------------------- minimal zip writer (stored)
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  BL.zip = function (files, root = '') {
    const enc = new TextEncoder(), parts = [], central = []; let off = 0;
    for (const f of files) { const name = enc.encode(root + f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
      const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true);
      parts.push(new Uint8Array(h.buffer), name, data);
      const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name); off += 30 + name.length + data.length; }
    const cs = central.reduce((a, p) => a + p.length, 0), e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/zip' });
  };

  // ---------------------------------------------------------------- dialog
  BL.dialog = function () {
    const UI = TM.UI, App = TM.App, P = TM.P; const pre = BL.build({ gridN: 120, maxBlocks: 1000 }).meta; const TLm = pre.sections;
    const f = UI.form([{ type: 'section', label: L('Content', 'المحتوى') },
      { id: 'tour', label: L(`Site tour — ${pre.facilities.length} facilities with labels`, `جولة الموقع — ${pre.facilities.length} منشأة بلافتات`), type: 'check', value: true }, { id: 'worker', label: L('Worker\'s ground-level view', 'منظور العامل من مستوى الأرض'), type: 'check', value: true },
      { id: 'geology', label: L('Beneath the surface (drillholes, ore)', 'ما تحت الأرض (الآبار والخام)'), type: 'check', value: true }, { id: 'mine', label: L(`Mine plan year by year (${pre.pitYears.length} stages)`, `خطة التعدين سنة بسنة (${pre.pitYears.length} مرحلة)`), type: 'check', value: pre.pitYears.length > 0 },
      { id: 'underground', label: L('Underground mine', 'المنجم تحت الأرض'), type: 'check', value: !!TLm.underground }, { id: 'blast', label: L('Blast', 'التفجير'), type: 'check', value: !!TLm.blast },
      { type: 'section', label: L('Video', 'الفيديو') },
      { id: 'langs', label: L('Titles', 'العناوين'), type: 'select', value: 'ar,en', options: [['ar,en', L('Arabic + English (two videos)', 'عربي + إنجليزي (فيديوهان)')], ['ar', L('Arabic', 'عربي')], ['en', L('English', 'إنجليزي')]] },
      { id: 'res', label: L('Resolution', 'الدقة'), type: 'select', value: '1080', options: [['720', '720p'], ['1080', '1080p (Full HD)'], ['2160', '4K']] },
      { id: 'engine', label: L('Render engine', 'محرك الرندر'), type: 'select', value: 'eevee', options: [['eevee', L('Eevee — fast (needs a graphics card)', 'Eevee — سريع (يحتاج كارت شاشة)')], ['cycles', L('Cycles — photo-real, slower', 'Cycles — واقعي جداً، أبطأ')]] },
      { id: 'quality', label: L('Quality', 'الجودة'), type: 'select', value: 'final', options: [['final', L('Final', 'نهائي')], ['preview', L('Quick preview', 'معاينة سريعة')]] },
      { id: 've', label: L('Vertical exaggeration', 'المبالغة الرأسية'), type: 'select', value: 'auto', options: [['auto', L(`auto (×${pre.ve})`, `تلقائي (×${pre.ve})`)], ['1', '×1'], ['1.5', '×1.5'], ['2', '×2'], ['3', '×3']] }], 2);
    f.appendChild(UI.html(`<p class="hint wide">${L(`The package contains the scene data, a Blender script and bilingual titles. Run render_windows.bat (Blender 4.2+ installed) or open build_scene.py in Blender. Estimated length ${Math.round(pre.duration)} s.`, `الحزمة فيها بيانات المشهد وسكريبت Blender والعناوين بالعربية والإنجليزية. شغّل render_windows.bat (مع Blender 4.2 أو أحدث) أو افتح build_scene.py داخل Blender. المدة المتوقعة ${Math.round(pre.duration)} ثانية.`)}</p>`));
    const opts = () => { const v = f.values(); return { sections: { tour: v.tour, worker: v.worker, geology: v.geology, mine: v.mine, underground: v.underground, blast: v.blast }, langs: v.langs.split(','), res: v.res, engine: v.engine, quality: v.quality, ve: v.ve }; };
    const actions = [{ label: L('Export Blender package (.zip)', 'تصدير حزمة Blender ‏(.zip)'), icon: 'package', primary: !TM.native || !TM.native.blenderRender, fn: async () => { const o = opts(); UI.closeModal(true); const r = await UI.run(L('Preparing the Blender package…', 'جارٍ تجهيز حزمة Blender…'), p => BL.package(o, p)); const nm = (P.name || 'project').replace(/[^\w؀-ۿ-]+/g, '_'); await TM.saveBlob(BL.zip(r.files, nm + '_blender/'), nm + '_blender.zip'); TM.AI.addMsg('bot', L(`<b>Blender package</b> exported: ${r.files.length} files, ${Math.round(r.meta.duration)} s video, ${r.meta.facilities.length} labelled facilities. Unzip and run <code>render_windows.bat</code>.`, `<b>حزمة Blender</b> جاهزة: ${r.files.length} ملفاً، فيديو ${Math.round(r.meta.duration)} ثانية، ${r.meta.facilities.length} منشأة بلافتات. فك الضغط وشغّل <code>render_windows.bat</code>.`)); } }];
    if (TM.native && TM.native.blenderRender) actions.push({ label: L('Render video now', 'إخراج الفيديو الآن'), icon: 'clapperboard', primary: true, fn: async () => { const o = opts(); UI.closeModal(true); const r = await UI.run(L('Preparing…', 'جارٍ التجهيز…'), p => BL.package(o, p)); const pr = UI.progress(L('Blender is rendering the video…', 'Blender يرندر الفيديو…')); const off = TM.native.onBlender(line => { const m = /TMPROGRESS (\d+)\/(\d+)/.exec(line); if (m) pr.set(+m[1] / +m[2], `${L('Blender is rendering', 'Blender يرندر')} ${m[1]}/${m[2]}`); });
      try { const out = await TM.native.blenderRender({ name: (P.name || 'project').replace(/[^\w؀-ۿ-]+/g, '_'), files: r.files.map(x => ({ name: x.name, data: typeof x.data === 'string' ? new TextEncoder().encode(x.data) : x.data })), args: ['--render'] }); TM.AI.addMsg('bot', L(`<b>Video ready</b> in ${TM.esc(out.folder)}`, `<b>الفيديو جاهز</b> في ${TM.esc(out.folder)}`)); } catch (e) { UI.toast(e.message || String(e), 'err'); } finally { pr.done(); if (off) off(); } } });
    UI.modal({ title: L('Investor video — virtual site visit (Blender)', 'فيديو المستثمر — زيارة افتراضية للموقع (Blender)'), body: f, wide: true, actions });
  };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
