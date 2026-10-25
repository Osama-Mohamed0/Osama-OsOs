/* TerraMind Studio — workflow layer shared by the UI and the AI copilot. Every action here is a "tool". */
(function (TM) {
  'use strict';
  const WF = TM.WF = {};
  const S = () => TM.P.settings;

  // ---------------------------------------------------------------- pit helpers
  TM.Pit = {
    selected() { const p = TM.P.pit; return p && p.shells && p.selected != null ? p.shells[p.selected] : null; },
    selectedFloor() { return TM.Pit.selected() ? TM.Pit.selected().floor : null; },
    floorAt(x, y) { const a = TM.Pit.active(); return a ? a.floorAt(x, y) : NaN; },
    // The pit that drives KPIs: the engineered design (when chosen) or the optimised LG shell
    active() {
      const P = TM.P, D = P.design;
      if (D && D.kind === 'pit' && P.settings.pitSource === 'design') return { kind: 'design', label: TM.L('Pit design', 'تصميم الحفرة'), floorAt: (x, y) => { const z = TM.Design.zAt(D, x, y), t = TM.topoZ(x, y); return isFinite(z) && isFinite(t) && z < t - 0.01 ? z : NaN; }, rock: D.stats.tonnes };
      const p = P.pit, sh = TM.Pit.selected(); if (!sh) return null;
      return { kind: 'shell', label: 'LG shell ' + (p.selected + 1), floorAt: (x, y) => TM.Mine.floorAt(p.lg, sh.floor, x, y), rock: sh.ore + sh.waste };
    }
  };

  // ---------------------------------------------------------------- data
  WF.loadDemo = function () { const P = TM.Drill.makeDemo(); TM.setProject(P); TM.logHistory('demo', 'synthetic demo project'); return WF.summary(); };
  WF.validate = function () { const iss = TM.Drill.validate(); TM.rt.issues = iss; TM.emit('validated', iss); return { errors: iss.filter(i => i.sev === 'error').length, warnings: iss.filter(i => i.sev === 'warn').length, info: iss.filter(i => i.sev === 'info').length, issues: iss.slice(0, 40) }; };
  WF.audit = function ({ apply_top_cut = null, fix_overlaps = true } = {}) {
    const before = TM.P.bm ? WF.kpis() : null; const mx = WF.maxAssay(); let fixed = { overlaps: 0, duplicates: 0, clipped: 0 };
    if (fix_overlaps) fixed = TM.Drill.fix();
    let capped = 0; if (apply_top_cut != null) { const v = +apply_top_cut || null; S().topCut = v; if (v) capped = TM.P.db.assays.filter(a => a[S().gradeField] > v).length; }
    TM.rt.comps = null; TM.logHistory('audit', JSON.stringify({ apply_top_cut, fix_overlaps, fixed, capped })); TM.touch('db'); WF.validate();
    // statistics and variogram are recomputed on the capped data
    const raw = TM.P.db.assays.map(a => a[S().gradeField]).filter(isFinite), tc = S().topCut; let vario = null;
    if (apply_top_cut != null) { S().variogram = null; S().variogramDomain = null; try { const comps = TM.Drill.comps(); if (comps.length >= 30) { vario = TM.Est.autoVariography(comps, { lag: Math.max(5, S().compLen * 5), nLags: 14 }).model; vario.topCut = tc; S().variogram = vario; TM.touch('variogram'); } } catch (e) { } }
    return { top_cut: tc, samples_capped: capped, stats_uncapped: pickStats(TM.stats(raw)), stats_capped: tc ? pickStats(TM.stats(raw.map(g => Math.min(g, tc)))) : null, variogram_refitted: vario ? { nugget: +vario.nugget.toFixed(3), sill: +vario.sill.toFixed(3), ranges: vario.ranges } : null, max_raw_assay: mx, overlaps_fixed: fixed.overlaps, duplicates_removed: fixed.duplicates, intervals_clipped: fixed.clipped, note: TM.P.bm ? TM.L('Re-run estimation to propagate the top-cut into the block model.', 'أعد تشغيل التقدير لتطبيق السقف على نموذج البلوكات.') : null, before };
  };
  WF.maxAssay = function () { let best = null; for (const h of TM.rt.holes) for (const s of h.samples) if (isFinite(s.g) && (!best || s.g > best.g)) best = { hole: h.id, from: s.from, g: s.g }; return best; };
  WF.composite = function (len) { if (len) S().compLen = +len; const c = TM.Drill.composite(S().compLen); TM.touch('comps'); return { composites: c.length, length_m: S().compLen, stats: pickStats(TM.stats(c.map(x => x.g))) }; };
  const pickStats = st => st.n ? { n: st.n, min: +st.min.toFixed(3), mean: +st.mean.toFixed(3), median: +st.median.toFixed(3), p99: +st.p99.toFixed(3), max: +st.max.toFixed(3), cv: +st.cv.toFixed(2) } : { n: 0 };

  // ---------------------------------------------------------------- estimation
  WF.variography = function (opts = {}) { const comps = TM.Drill.comps(); const r = TM.Est.autoVariography(comps, opts); r.model.topCut = S().topCut; S().variogram = r.model; TM.touch('variogram'); return r; };
  WF.estimate = async function ({ method = 'ok', dx = 5, dy = 5, dz = 5, domain = null, minS = 4, maxS = 16, maxPerHole = 4, power = 2, searchFactor = 1.2, sub = 1, useFaults = true, softFactor = 4 } = {}, onProgress) {
    const comps0 = TM.Drill.comps(); if (comps0.length < 20) throw new Error(TM.L('Not enough composites — import drillholes first.', 'عدد العينات المركبة غير كافٍ — استورد الآبار أولاً.'));
    const solid = domain ? TM.P.solids.find(s => s.id === domain || s.name === domain) : null;
    const comps = solid ? comps0.filter(c => TM.Solid.inside(solid, c.x, c.y, c.z)) : comps0;
    let model = S().variogram; if (!model || (solid && S().variogramDomain !== solid.id)) { model = TM.Est.autoVariography(comps, { lag: Math.max(5, S().compLen * 5), nLags: 14 }).model; model.topCut = S().topCut; S().variogram = model; S().variogramDomain = solid ? solid.id : null; }
    const search = { azi: model.azi, dip: model.dip, rake: model.rake || 0, ranges: model.ranges.map(r => Math.max(r, 15) * searchFactor) };
    const bm = TM.Est.define(TM.Est.autoDefine(solid ? comps : comps0, { dx, dy, dz, pad: solid ? 12 : 30 })); const split = TM.Est.prepare(bm, solid, { sub: +sub || 1 }); const faults = useFaults ? (TM.P.faults || []) : [];
    const t0 = Date.now(); const n = await TM.Est.estimate(bm, comps, { method, power, model, search, minS, maxS, maxPerHole, disc: 2, faults, softFactor }, onProgress);
    bm.domain = solid ? solid.name : null; bm.topCut = S().topCut; TM.Est.classify(bm);
    TM.P.bm = bm; if (TM.P.pit) TM.P.pit.stale = true; TM.logHistory('estimate', `${method} ${dx}x${dy}x${dz} → ${n} blocks`); TM.touch('bm');
    const r = TM.Est.report(bm, S().cutoff); return { method, blocks_estimated: n, block_size: [dx, dy, dz], seconds: +((Date.now() - t0) / 1000).toFixed(1), resource_at_cutoff: { cutoff: S().cutoff, tonnes: Math.round(r.tonnes), grade: +r.grade.toFixed(2), oz: Math.round(r.oz) }, variogram: model, domain: bm.domain, sub_blocks: bm.sub > 1 ? { split: bm.sub, boundary_blocks: split } : null, faults: faults.map(f => `${f.name} (${f.boundary})`) };
  };
  WF.classify = function (rules) { const bm = TM.P.bm; if (!bm) throw new Error(TM.L('No block model', 'لا يوجد نموذج بلوكات')); const c = TM.Est.classify(bm, rules); TM.touch('bm'); return { measured: c[1], indicated: c[2], inferred: c[3], rules: bm.classRules }; };
  WF.resourceTable = function (cutoff = S().cutoff) {
    const bm = TM.P.bm; if (!bm) return null; const rows = [1, 2, 3].map(c => Object.assign({ cls: c }, TM.Est.report(bm, cutoff, { cls: [c] })));
    rows.push(Object.assign({ cls: 0 }, TM.Est.report(bm, cutoff))); return rows;
  };

  // ---------------------------------------------------------------- pit optimisation
  WF.optimisePit = async function ({ slope_angle, gold_price_oz, mining_cost_t, processing_cost_t, cell = 10, rfFrom = 0.4, rfTo = 1.2, rfStep = 0.05 } = {}, onProgress) {
    const bm = TM.P.bm; if (!bm) throw new Error(TM.L('Run the block model estimation first.', 'شغّل تقدير نموذج البلوكات أولاً.'));
    if (slope_angle) S().slope = +slope_angle; if (gold_price_oz) S().price = +gold_price_oz; if (mining_cost_t) S().mineCost = +mining_cost_t; if (processing_cost_t) S().procCost = +processing_cost_t;
    const before = TM.Pit.selected() ? WF.kpis() : null;
    const t0 = Date.now(); const lg = TM.Mine.buildLG(bm, { cell, benchH: S().benchH, slope: S().slope });
    const rfs = []; for (let r = rfFrom; r <= rfTo + 1e-9; r += rfStep) rfs.push(+r.toFixed(3));
    const res = await TM.Mine.nestedShells(lg, rfs, onProgress); const pbp = TM.Mine.pitByPit(lg, res, S());
    // choose the shell with the best "best-case" NPV (ultimate pit for the current economics)
    let sel = 0; pbp.forEach((p, i) => { if (p.best > pbp[sel].best) sel = i; });
    TM.P.pit = { lg, shells: res.shells, shellOf: res.shellOf, rfs, pbp, _rtPbpKey: null, selected: sel, design: null, params: { slope: S().slope, price: S().price, mineCost: S().mineCost, procCost: S().procCost, cell }, created: new Date().toISOString() };
    TM.logHistory('pit', `LG ${rfs.length} shells, selected rf ${rfs[sel]}`); TM.touch('pit');
    const k = WF.kpis(); return { shells: rfs.length, nodes: res.nodes, seconds: +((Date.now() - t0) / 1000).toFixed(1), selected_shell: sel + 1, revenue_factor: rfs[sel], slope_angle: S().slope, ore_t: Math.round(k.ore), grade: +k.grade.toFixed(2), waste_t: Math.round(k.waste), strip_ratio: +k.sr.toFixed(2), npv_musd: +(k.npv / 1e6).toFixed(1), npv_change_musd: before ? +((k.npv - before.npv) / 1e6).toFixed(1) : null };
  };
  WF.selectShell = function (i) { const p = TM.P.pit; if (!p) throw new Error('No pit'); p.selected = TM.clamp(Math.round(i), 0, p.shells.length - 1); p.design = null; TM.touch('pit'); return Object.assign({ shell: p.selected + 1, rf: p.rfs[p.selected] }, WF.kpisBrief()); };
  WF.designPit = function () {
    const p = TM.P.pit; if (!p) throw new Error(TM.L('Optimise the pit first.', 'حسّن الحفرة أولاً.')); const sh = p.shells[p.selected];
    const hm = TM.Mine.pitSurface(p.lg, sh.floor); let zmin = Infinity; for (const z of sh.floor) if (isFinite(z)) zmin = Math.min(zmin, z);
    p.design = TM.Mine.benchContours(hm, S().benchH, zmin + 0.01, TM.rt.tin ? TM.rt.tin.z1 : zmin + 300); TM.touch('pit');
    return { benches: p.design.length, from_rl: Math.round(zmin), bench_height: S().benchH, berm_m: +(S().benchH / Math.tan(S().slope * TM.D2R) - S().benchH / Math.tan(Math.max(S().batter, S().slope) * TM.D2R)).toFixed(1) };
  };

  // ---------------------------------------------------------------- KPIs at the current cut-off
  // Single source of truth: the KPI bar, the schedule dialog, the AI and the executive report all read WF.plan().
  // LG shell → bench-by-bench pushback schedule on the regularised optimisation model; pit design → benches of the block model.
  const sig = (...a) => JSON.stringify(a);
  TM.on('changed', w => { if (w !== 'cutoff' && TM.rt) TM.rt._plan = null; });
  WF.plan = function (o = {}) {
    const P = TM.P, s = Object.assign({}, S(), o.settings || {}), a = TM.Pit.active(); if (!P.bm || !a) return null;
    const key = sig(s.cutoff, s.price, s.sellCost, s.recovery, s.mineCost, s.procCost, s.gaCost, s.capex, s.closure, s.millRate, s.mineRate, s.discount, s.rehandle, s.processLG, a.kind, P.pit && P.pit.selected, P.pit && P.pit.created, P.design && P.design.created, P.bm.created, o.priceF, o.costF);
    if (!o.nocache && TM.rt._plan && TM.rt._plan.key === key) return TM.rt._plan.r;
    let r; if (a.kind === 'shell') r = TM.Mine.scheduleP(TM.Mine.panels(P.pit.lg, P.pit.shellOf, P.pit.selected), s, o);
    else r = TM.Mine.scheduleP(TM.Mine.panelsFromBM(P.bm, a.floorAt, s.benchH, s), s, o);
    r.source = a.kind; r.label = a.label; r.cutoffs = TM.Mine.cutoffs(s);
    if (!o.nocache && !o.priceF && !o.costF) TM.rt._plan = { key, r }; return r;
  };
  WF.kpis = function (cog = S().cutoff, o = {}) {
    const bm = TM.P.bm; if (!bm) return null; const sh = TM.Pit.active();
    if (sh) {
      const r = WF.plan(Object.assign({ settings: { cutoff: cog }, nocache: cog !== S().cutoff }, o)), t = r.total;
      return { cutoff: cog, ore: t.ore, metal: t.oreM, grade: t.grade, oz: t.oreM / 31.1035, low: t.low, lowMetal: t.metal - t.oreM, waste: t.waste, sr: t.ore + t.low ? t.waste / (t.ore + t.low) : 0, inPit: true, pitLabel: sh.label, npv: r.npv, irr: r.irr, life: r.life, payback: r.payback, feed: t.feed, feedGrade: t.feedGrade, recoveredOz: t.oz, source: r.source };
    }
    const d = bm.def; let ore = 0, metal = 0;
    for (let id = 0; id < bm.N; id++) { const g = bm.grade[id]; if (!(g >= cog)) continue; const t = TM.Est.blockTonnes(bm, id); ore += t; metal += t * g; }
    return { cutoff: cog, ore, metal, grade: ore ? metal / ore : 0, oz: metal / 31.1035, inPit: false, pitLabel: null };
  };
  WF.kpisBrief = function () { const k = WF.kpis(); if (!k) return {}; return { ore_t: Math.round(k.ore), grade: +k.grade.toFixed(2), contained_oz: Math.round(k.oz), waste_t: k.waste != null ? Math.round(k.waste) : null, strip_ratio: k.sr != null ? +k.sr.toFixed(2) : null, npv_musd: k.npv != null ? +(k.npv / 1e6).toFixed(1) : null }; };
  WF.cutoffScan = function (from = 0.2, to = 2.5, step = 0.05) { const out = []; for (let c = from; c <= to + 1e-9; c += step) { const k = WF.kpis(+c.toFixed(2)); if (k && k.npv != null) out.push({ c: +c.toFixed(2), npv: k.npv, ore: k.ore, grade: k.grade }); } return out; };
  WF.setCutoff = function (c, colormap) { S().cutoff = TM.clamp(+c, 0, 50); if (colormap && TM.VP.CMAPS[colormap]) S().colormap = colormap; TM.touch('cutoff'); const k = WF.kpisBrief(); return Object.assign({ cutoff: S().cutoff, colormap: S().colormap, visible_blocks: TM.VP.bmCount }, k); };

  // ---------------------------------------------------------------- schedule & sensitivity
  WF.schedule = function () {
    const p = TM.P.pit; if (!p && !(TM.P.design && TM.P.design.kind === 'pit')) throw new Error(TM.L('Optimise the pit first.', 'حسّن الحفرة أولاً.'));
    const r = WF.plan(); if (!r) throw new Error(TM.L('Needs a block model and a pit.', 'يتطلب نموذج بلوكات وحفرة.')); if (p) p.schedule = r; TM.touch('schedule'); const t = r.total;
    return { source: r.label, years: r.life, npv_musd: +(r.npv / 1e6).toFixed(1), irr_pct: r.irr != null ? +(r.irr * 100).toFixed(1) : null, payback_years: r.payback != null ? +r.payback.toFixed(1) : null, operating_cutoff: +r.cutoffs.operating.toFixed(2), marginal_cutoff: +r.cutoffs.marginal.toFixed(2), mill_rate_t: S().millRate, mining_rate_t: S().mineRate, pushbacks: r.pushbacks, ore_t: Math.round(t.ore), ore_grade: +t.grade.toFixed(2), low_grade_stockpiled_t: Math.round(t.low), low_grade_reclaimed_t: Math.round(t.reclaim), waste_t: Math.round(t.waste), mill_feed_t: Math.round(t.feed), feed_grade: +t.feedGrade.toFixed(2), recovered_oz: Math.round(t.oz),
      table: r.years.map(y => ({ year: y.year, pushbacks: y.pushbacks, benches: y.benches, ore_t: Math.round(y.ore), low_t: Math.round(y.low), waste_t: Math.round(y.waste), reclaim_t: Math.round(y.reclaim), feed_t: Math.round(y.feed), grade: +y.grade.toFixed(2), sr: y.sr != null ? +y.sr.toFixed(2) : null, oz: Math.round(y.oz), stockpile_t: Math.round(y.stockpile), cash_musd: +(y.cash / 1e6).toFixed(1) })) };
  };
  WF.sensitivity = function () {
    if (!TM.Pit.active() || !TM.P.bm) return null; const f = [0.8, 0.9, 1, 1.1, 1.2];
    return { factors: f, price: f.map(x => WF.plan({ priceF: x, nocache: true }).npv), cost: f.map(x => WF.plan({ costF: x, nocache: true }).npv) };
  };
  // Pit-by-pit at the current economics (recomputed when inputs change)
  WF.pitByPit = function () {
    const p = TM.P.pit; if (!p) return null; const s = S(); const key = sig(s.cutoff, s.price, s.sellCost, s.recovery, s.mineCost, s.procCost, s.gaCost, s.capex, s.closure, s.millRate, s.mineRate, s.discount, s.rehandle, s.processLG, p.created);
    if (p._rtPbpKey !== key || !p.pbp) { p.pbp = TM.Mine.pitByPit(p.lg, { shells: p.shells, shellOf: p.shellOf }, s); p._rtPbpKey = key; }
    return p.pbp;
  };

  // ---------------------------------------------------------------- geology
  WF.implicitShell = async function ({ threshold = 0.5, cell = 6, name } = {}, onProgress) {
    const comps = TM.Drill.comps(); const v = S().variogram; const aniso = v ? { azi: v.azi, dip: v.dip, rake: v.rake || 0, ratios: [1, Math.max(0.2, v.ranges[1] / v.ranges[0]), Math.max(0.1, v.ranges[2] / v.ranges[0])] } : null;
    const r = await TM.Solid.rbfShell(comps, { threshold, cell, aniso, maxDist: 40 }, onProgress);
    const s = TM.Solid.make(name || `Grade_shell_${threshold}gpt`, r.mesh, { source: 'RBF implicit', threshold }); TM.P.solids.push(s); TM.logHistory('implicit', s.name); TM.touch('solids');
    return { solid: s.name, volume_m3: Math.round(s.volume), tonnes: Math.round(s.tonnes), triangles: s.idx.length / 3, closed: s.closed, points_used: r.nPts };
  };
  WF.solidFromBM = function (threshold = S().cutoff) { const bm = TM.P.bm; if (!bm) throw new Error('No block model'); const m = TM.Solid.fromBlockModel(bm, threshold); const s = TM.Solid.make(`BM_shell_${threshold}gpt`, m, { source: 'block model iso-shell', color: '#F2B740' }); TM.P.solids.push(s); TM.touch('solids'); return { solid: s.name, volume_m3: Math.round(s.volume), tonnes: Math.round(s.tonnes) }; };
  WF.solidVsPit = function (solidId) {
    const s = TM.P.solids.find(x => x.id === solidId) || TM.P.solids[TM.P.solids.length - 1]; if (!s) throw new Error('No solid'); const sh = TM.Pit.selected(); const cell = 5; let inP = 0, below = 0;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (let i = 0; i < s.pos.length; i += 3) { x0 = Math.min(x0, s.pos[i]); x1 = Math.max(x1, s.pos[i]); y0 = Math.min(y0, s.pos[i + 1]); y1 = Math.max(y1, s.pos[i + 1]); }
    for (let y = y0 + cell / 2; y < y1; y += cell) for (let x = x0 + cell / 2; x < x1; x += cell) { const zs = TM.Solid.columnCrossings(s, x, y); const f = sh ? TM.Pit.floorAt(x, y) : Infinity; for (let k = 0; k + 1 < zs.length; k += 2) { const a = zs[k], b = zs[k + 1]; const top = isFinite(f) ? Math.max(a, Math.min(b, f)) : b; inP += (b - top) * cell * cell; below += (top - a) * cell * cell; } }
    const dn = S().density; return { solid: s.name, in_pit_t: Math.round(inP * dn), below_pit_t: Math.round(below * dn), pit_capture_pct: +(inP / Math.max(inP + below, 1) * 100).toFixed(1) };
  };

  // ---------------------------------------------------------------- infill drilling targets
  WF.proposeInfill = function (count = 2) {
    const bm = TM.P.bm; if (!bm) throw new Error('No block model'); const d = bm.def, cog = Math.max(S().cutoff, 0.3); const cand = [];
    for (let id = 0; id < bm.N; id++) { const g = bm.grade[id]; if (!(g >= cog) || bm.cls[id] < 2) continue; const i = id % d.nx, j = Math.floor(id / d.nx) % d.ny, k = Math.floor(id / (d.nx * d.ny)); const p = TM.Est.center(d, i, j, k); if (TM.Pit.selected() && !(p[2] > TM.Pit.floorAt(p[0], p[1]))) continue; cand.push({ id, p, score: bm.dist[id] * (bm.cls[id] === 3 ? 1.5 : 1) * Math.sqrt(g) }); }
    cand.sort((a, b) => b.score - a.score); const picks = [];
    for (const c of cand) { if (picks.every(q => Math.hypot(q.p[0] - c.p[0], q.p[1] - c.p[1], q.p[2] - c.p[2]) > 45)) picks.push(c); if (picks.length >= count) break; }
    // average drilling direction of the existing programme
    let az = 0, dip = 0, n = 0; for (const s of TM.P.db.surveys) if (s.at === 0) { az += s.az; dip += s.dip; n++; } az = n ? az / n : 0; dip = n ? dip / n : -60;
    const dir = [Math.sin(az * TM.D2R) * Math.cos(dip * TM.D2R), Math.cos(az * TM.D2R) * Math.cos(dip * TM.D2R), Math.sin(dip * TM.D2R)];
    const holes = picks.map((c, i) => { const T = c.p; let L = (TM.topoZ(T[0], T[1]) - T[2]) / -dir[2]; for (let it = 0; it < 8; it++) { const q = [T[0] - dir[0] * L, T[1] - dir[1] * L, T[2] - dir[2] * L]; const tz = TM.topoZ(q[0], q[1]); if (!isFinite(tz)) break; L += (tz - q[2]) / -dir[2]; } const col = [T[0] - dir[0] * L, T[1] - dir[1] * L, 0]; col[2] = TM.topoZ(col[0], col[1]); const len = Math.round(L + 30); return { id: 'PH-' + String(i + 1).padStart(2, '0'), collar: col, target: T, end: [col[0] + dir[0] * len, col[1] + dir[1] * len, col[2] + dir[2] * len], az: +az.toFixed(1), dip: +dip.toFixed(1), len, gap: +bm.dist[c.id].toFixed(1), cls: bm.cls[c.id] }; });
    S().infill = holes; TM.touch('infill');
    return { holes: holes.map(h => ({ id: h.id, collar_e: Math.round(h.collar[0]), collar_n: Math.round(h.collar[1]), collar_rl: Math.round(h.collar[2]), azimuth: h.az, dip: h.dip, length_m: h.len, target_rl: Math.round(h.target[2]), avg_sample_distance_m: h.gap })) };
  };


  // ---------------------------------------------------------------- engineered design (Surpac-style)
  const strById = id => { const s = TM.P.strings.find(x => x.id === id || x.name === id); if (!s) throw new Error(TM.L('String not found', 'الخط غير موجود')); return s; };
  WF.pitDesign = function ({ toe, benchH = S().benchH, batter = S().batter, berm = S().bermW, rampWidth = S().rampW, rampGrade = S().rampGrade, rampDir = 1, res = 1, maxBenches = 40 } = {}) {
    const s = strById(toe); if (!s.closed || s.pts.length < 3) throw new Error(TM.L('The toe string must be a closed polygon.', 'خط القاع يجب أن يكون مضلعاً مغلقاً.'));
    TM.Undo.push(TM.L('Pit design', 'تصميم الحفرة'));
    const D = TM.Design.pit({ toe: s.pts, benchH, batter, berm, ramp: rampWidth > 0 ? { width: rampWidth, gradient: rampGrade, dir: rampDir, start: s.pts[0] } : null, maxBenches, res });
    D.source = s.name; TM.P.design = D; S().pitSource = 'design'; TM.logHistory('pitDesign', s.name); TM.touch('design');
    const r = D.stats.reserve; return { benches: D.stats.benches, volume_m3: Math.round(D.stats.volume), rock_t: Math.round(D.stats.tonnes), footprint_m2: Math.round(D.stats.footprint), overall_slope_deg: +(Math.atan(benchH / (benchH / Math.tan(batter * TM.D2R) + berm)) / TM.D2R).toFixed(1), reserve: r ? { cutoff: r.cutoff, ore_t: Math.round(r.ore), grade: +r.grade.toFixed(2), oz: Math.round(r.oz), waste_t: Math.round(r.waste), strip_ratio: r.sr != null ? +r.sr.toFixed(2) : null } : null };
  };
  WF.dumpDesign = function ({ base, benchH = 10, batter = 37, berm = 10, maxRL = null, res = 1 } = {}) {
    const s = strById(base); if (!s.closed) throw new Error(TM.L('The base string must be closed.', 'خط القاعدة يجب أن يكون مغلقاً.'));
    TM.Undo.push(TM.L('Dump design', 'تصميم المكب')); const z0 = s.pts.reduce((a, p) => a + p[2], 0) / s.pts.length;
    const D = TM.Design.dump({ base: s.pts, benchH, batter, berm, maxRL: maxRL || z0 + 50, res }); D.source = s.name; TM.P.design = D; TM.touch('design');
    return { lifts: D.stats.benches, capacity_m3: Math.round(D.stats.volume), capacity_t_loose: Math.round(D.stats.volume * 1.9), footprint_m2: Math.round(D.stats.footprint) };
  };
  WF.designToStrings = function () {
    const D = TM.P.design; if (D) { TM.Undo.push('Design → strings'); let n = 0; for (const s of D.strings) { TM.P.strings.push({ id: TM.uid('str'), name: s.name, strNo: s.kind === 'ramp' ? 3 : (D.kind === 'pit' ? 10 : 20), closed: false, color: s.kind === 'ramp' ? '#F97316' : (D.kind === 'pit' ? '#34D399' : '#F2B740'), pts: s.pts }); n++; } TM.touch('strings'); return { strings: n }; }
    const p = TM.P.pit; if (!p || !p.design) WF.designPit(); let n = 0; for (const lv of TM.P.pit.design) for (const L of lv.lines) { TM.P.strings.push({ id: TM.uid('str'), name: `Pit_RL${Math.round(lv.z)}`, strNo: 100 + Math.round(lv.z / S().benchH) % 100, closed: false, color: '#7AA9F8', pts: L.map(p => [+p[0].toFixed(3), +p[1].toFixed(3), +p[2].toFixed(3)]) }); n++; } TM.touch('strings'); return { strings: n };
  };
  WF.designSurface = function () { const D = TM.P.design; if (!D) throw new Error('No design'); const m = TM.Design.toMesh(D, Math.max(1, Math.round(2 / D.grid.res))); const s = { id: TM.uid('srf'), name: D.kind === 'pit' ? 'Pit_design_DTM' : 'Dump_design_DTM', role: 'surface', pts: m.pos, tri: m.idx, color: '#8fa6c4' }; TM.P.surfaces.push(s); TM.touch('surfaces'); return { surface: s.name, points: m.pos.length / 3, triangles: m.idx.length / 3 }; };

  // ---------------------------------------------------------------- bench-by-bench report inside the active pit
  WF.benchReport = function (cog = S().cutoff) {
    const bm = TM.P.bm, a = TM.Pit.active(); if (!bm || !a) throw new Error(TM.L('Needs a block model and a pit (shell or design).', 'يتطلب نموذج بلوكات وحفرة.'));
    const d = bm.def, H = S().benchH, rows = new Map(), dn = S().density; const key = z => Math.floor(z / H) * H;
    for (let id = 0; id < bm.N; id++) { if (!bm.frac[id]) continue; const i = id % d.nx, j = Math.floor(id / d.nx) % d.ny, k = Math.floor(id / (d.nx * d.ny)); const x = d.x0 + (i + .5) * d.dx, y = d.y0 + (j + .5) * d.dy, z = d.z0 + (k + .5) * d.dz; const f = a.floorAt(x, y); if (!(z > f)) continue; const t = TM.Est.blockTonnes(bm, id), g = bm.grade[id]; const r = rows.get(key(z)) || { rl: key(z), ore: 0, metal: 0, waste: 0 }; if (g >= cog) { r.ore += t; r.metal += t * g; } else r.waste += t; rows.set(key(z), r); }
    return [...rows.values()].sort((p, q) => q.rl - p.rl).map(r => ({ rl: r.rl, ore_t: Math.round(r.ore), grade: r.ore ? +(r.metal / r.ore).toFixed(2) : 0, waste_t: Math.round(r.waste), sr: r.ore ? +(r.waste / r.ore).toFixed(2) : null, oz: Math.round(r.metal / 31.1035) }));
  };
  // ---------------------------------------------------------------- block model calculator
  WF.bmCalc = function (name, expr) {
    const bm = TM.P.bm; if (!bm) throw new Error('No block model'); if (!/^[A-Za-z_]\w*$/.test(name)) throw new Error(TM.L('Attribute name must be a simple identifier', 'اسم الحقل يجب أن يكون معرّفاً بسيطاً'));
    const d = bm.def, attrs = bm.attrs = bm.attrs || {}; const names = Object.keys(attrs).filter(n => n !== name);
    const fn = new Function('grade', 'x', 'y', 'z', 'kv', 'ns', 'cls', 'density', 'tonnes', 'Math', ...names, `"use strict"; return (${expr});`);
    const out = new Float32Array(bm.N).fill(NaN); let n = 0;
    for (let id = 0; id < bm.N; id++) { if (!bm.frac[id]) continue; const i = id % d.nx, j = Math.floor(id / d.nx) % d.ny, k = Math.floor(id / (d.nx * d.ny)); const v = fn(bm.grade[id], d.x0 + (i + .5) * d.dx, d.y0 + (j + .5) * d.dy, d.z0 + (k + .5) * d.dz, bm.kv[id], bm.ns[id], bm.cls[id], S().density, TM.Est.blockTonnes(bm, id), Math, ...names.map(q => attrs[q][id])); const num = typeof v === 'boolean' ? (v ? 1 : 0) : +v; if (isFinite(num)) { out[id] = num; n++; } }
    attrs[name] = out; TM.touch('bm'); const vals = []; for (let i = 0; i < out.length; i++) if (isFinite(out[i])) vals.push(out[i]); const st = TM.stats(vals);
    return { attribute: name, blocks: n, min: st.n ? +st.min.toFixed(4) : null, mean: st.n ? +st.mean.toFixed(4) : null, max: st.n ? +st.max.toFixed(4) : null };
  };

  // ---------------------------------------------------------------- solids & blasting
  WF.solidFromStrings = function (ids, name) { const ss = W_().orderSections(ids.map(strById)); const m = W_().fromSections(ss, 64, true); TM.Undo.push('Triangulate solid'); const so = TM.Solid.make(name || 'Solid_' + (TM.P.solids.length + 1), m, { source: 'section triangulation', color: '#A78BFA' }); TM.P.solids.push(so); TM.touch('solids'); return { solid: so.name, volume_m3: Math.round(so.volume), closed: so.closed, triangles: so.idx.length / 3 }; };
  WF.solidBoolean = function (aId, bId, op, cell = 2) { const a = TM.P.solids.find(s => s.id === aId), b = TM.P.solids.find(s => s.id === bId); if (!a || !b) throw new Error('Solid not found'); const m = W_().boolean(a, b, op, cell); TM.Undo.push('Boolean'); const so = TM.Solid.make(`${a.name}_${op}_${b.name}`, m, { source: 'boolean ' + op, color: '#F472B6' }); TM.P.solids.push(so); TM.touch('solids'); return { solid: so.name, volume_m3: Math.round(so.volume) }; };
  const W_ = () => TM.Wire;
  WF.blastPattern = function (o) { const s = strById(o.polygon); if (!s.closed) throw new Error(TM.L('Blast boundary must be a closed string.', 'حدود التفجير يجب أن تكون مغلقة.')); TM.Undo.push('Blast pattern'); const r = TM.Blast.pattern(Object.assign({}, o, { poly: s.pts })); TM.P.blast = { params: o, holes: r.holes, summary: r.summary, polygon: s.name }; TM.touch('blast'); const sm = r.summary; return { holes: sm.holes, rows: sm.rows, drill_m: Math.round(sm.drill_m), explosive_kg: Math.round(sm.explosive_kg), tonnes: Math.round(sm.tonnes), powder_factor_kg_t: +sm.powder_factor_kg_t.toFixed(3), powder_factor_kg_m3: +sm.powder_factor_kg_m3.toFixed(3), max_kg_per_delay: Math.round(sm.max_kg_per_delay) }; };


  // ---------------------------------------------------------------- underground: stope reserves from the block model
  WF.stopeReport = function (cog = S().cutoff, prefix = /^ST_/) {
    const bm = TM.P.bm; if (!bm) throw new Error(TM.L('Estimate the block model first.', 'قدّر نموذج البلوكات أولاً.'));
    const st = TM.P.solids.filter(s => prefix.test(s.name)); if (!st.length) throw new Error(TM.L('No stope solids (names starting with ST_).', 'لا توجد مجسمات أعمال (أسماء تبدأ بـ ST_).'));
    const rows = st.map(s => { const r = TM.Wire.report(s, 0); return { stope: s.name, volume: Math.round(r.volume), tonnes: Math.round(r.bm_tonnes || 0), grade: +(r.bm_grade || 0).toFixed(2), oz: Math.round(r.bm_oz || 0), status: (r.bm_grade || 0) >= cog ? 'ore' : 'below COG' }; });
    const ore = rows.filter(r => r.status === 'ore'), t = ore.reduce((a, r) => a + r.tonnes, 0), m = ore.reduce((a, r) => a + r.tonnes * r.grade, 0);
    const e = TM.Mine.econ(), val = ore.reduce((a, r) => a + r.tonnes * (r.grade * e.netPrice - S().procCost - S().gaCost - S().mineCost), 0);
    return { cutoff: cog, stopes: rows.length, ore_stopes: ore.length, ore_t: Math.round(t), grade: t ? +(m / t).toFixed(2) : 0, oz: Math.round(m / 31.1035), operating_margin_musd: +(val / 1e6).toFixed(1), rows };
  };

  // ---------------------------------------------------------------- faults
  WF.defineFault = function ({ source, name, boundary = 'hard' }) {
    const P = TM.P; const st = P.strings.find(x => x.id === source || x.name === source), sf = P.surfaces.find(x => x.id === source || x.name === source);
    let pts = st ? st.pts : null; if (!pts && sf) { pts = []; const step = Math.max(1, Math.floor(sf.pts.length / 3 / 4000)); for (let i = 0; i < sf.pts.length; i += 3 * step) pts.push([sf.pts[i], sf.pts[i + 1], sf.pts[i + 2]]); }
    if (!pts || pts.length < 3) throw new Error(TM.L('A fault needs a string or surface with at least 3 non-collinear points.', 'الفالق يحتاج خطاً أو سطحاً بثلاث نقاط غير مستقيمة على الأقل.'));
    const plane = TM.Est.faultPlane(pts); const f = { id: TM.uid('flt'), name: name || (st || sf).name, source: (st || sf).name, boundary: boundary === 'soft' ? 'soft' : 'hard', plane };
    P.faults = (P.faults || []).filter(x => x.name !== f.name).concat([f]); if (st) st.color = '#EF4444'; TM.logHistory('fault', `${f.name} ${f.boundary} dip ${plane.dip}/${plane.dipDir}`); TM.touch('faults'); if (P.bm) P.bm.stale = true;
    return { fault: f.name, boundary: f.boundary, dip: plane.dip, dip_direction: plane.dipDir, faults: P.faults.length, note: TM.L('Re-run the estimation to apply the boundary.', 'أعد التقدير لتطبيق الحد.') };
  };
  WF.removeFault = function (id) { TM.P.faults = (TM.P.faults || []).filter(f => f.id !== id && f.name !== id); TM.touch('faults'); return { faults: TM.P.faults.length }; };
  // Displace the part of a solid on the hanging-wall side (normal side) of a fault by an offset vector → new solid
  WF.faultSolid = function ({ solid, fault, dx = 0, dy = 0, dz = 0, throwM = null }) {
    const so = TM.P.solids.find(s => s.id === solid || s.name === solid), f = (TM.P.faults || []).find(x => x.id === fault || x.name === fault); if (!so || !f) throw new Error(TM.L('Solid or fault not found', 'المجسم أو الفالق غير موجود'));
    if (throwM != null) { const n = f.plane.n, h = Math.hypot(n[0], n[1]) || 1; const dd = [n[0] / h * Math.abs(n[2]), n[1] / h * Math.abs(n[2]), -Math.hypot(n[0], n[1])]; const L = Math.hypot(...dd) || 1; dx = dd[0] / L * throwM; dy = dd[1] / L * throwM; dz = dd[2] / L * throwM; }
    const pos = Float64Array.from(so.pos); let moved = 0; for (let i = 0; i < pos.length; i += 3) if (TM.Est.faultSide(f, pos[i], pos[i + 1], pos[i + 2])) { pos[i] += dx; pos[i + 1] += dy; pos[i + 2] += dz; moved++; }
    TM.Undo && TM.Undo.push(TM.L('Fault displacement', 'إزاحة بالفالق')); const s2 = TM.Solid.make(`${so.name}_${f.name}_displaced`, { pos, idx: Uint32Array.from(so.idx) }, { source: 'fault displacement', color: '#FB7185' }); TM.P.solids.push(s2); TM.touch('solids');
    return { solid: s2.name, vertices_moved: moved, offset_m: [+dx.toFixed(2), +dy.toFixed(2), +dz.toFixed(2)], volume_m3: Math.round(s2.volume) };
  };

  // ---------------------------------------------------------------- string hygiene & project integrity
  WF.cleanStrings = function ({ tol = 0.01, closeTol = 1.0, ids = null } = {}) {
    const list = TM.P.strings.filter(s => !ids || ids.includes(s.id)); let removed = 0, closed = 0, dropped = 0; TM.Undo && TM.Undo.push(TM.L('Clean strings', 'تنظيف الخطوط'));
    const keep = [];
    for (const s of TM.P.strings) {
      if (!list.includes(s)) { keep.push(s); continue; }
      const out = []; for (const p of s.pts) { if (!p.every(isFinite)) { removed++; continue; } const q = out[out.length - 1]; if (q && Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < tol) { removed++; continue; } out.push(p); }
      // drop collinear duplicates that fold back (spikes)
      for (let i = 1; i + 1 < out.length; i++) { const a = out[i - 1], b = out[i], c = out[i + 1]; if (Math.hypot(a[0] - c[0], a[1] - c[1], a[2] - c[2]) < tol) { out.splice(i, 2); removed += 2; i = Math.max(0, i - 2); } }
      if (out.length > 3) { const f = out[0], l = out[out.length - 1], d = Math.hypot(f[0] - l[0], f[1] - l[1], f[2] - l[2]); if (d < tol) { out.pop(); removed++; if (!s.closed) { s.closed = true; closed++; } } else if (!s.closed && d <= closeTol) { s.closed = true; closed++; } }
      if (out.length < 2) { dropped++; continue; } s.pts = out; keep.push(s);
    }
    TM.P.strings = keep; TM.touch('strings'); return { strings_checked: list.length, vertices_removed: removed, strings_closed: closed, strings_dropped: dropped };
  };
  WF.integrityCheck = function () {
    const P = TM.P, out = []; const add = (sev, area, msg) => out.push({ sev, area, msg });
    const v = TM.Drill.validate(); const e = v.filter(i => i.sev === 'error').length, w = v.filter(i => i.sev === 'warn').length; add(e ? 'error' : w ? 'warn' : 'ok', TM.L('Drillholes', 'الآبار'), TM.L(`${P.db.collars.length} holes · ${e} errors · ${w} warnings`, `${P.db.collars.length} بئراً · ${e} خطأ · ${w} تحذير`));
    const ids = new Set(P.db.collars.map(c => c.id)); const orphan = P.db.assays.filter(a => !ids.has(a.id)).length + P.db.surveys.filter(a => !ids.has(a.id)).length; if (orphan) add('error', TM.L('Drillholes', 'الآبار'), TM.L(`${orphan} assay/survey rows reference missing collars`, `${orphan} سجل تحليل/مسح بلا طوق`));
    const badStr = P.strings.filter(s => s.pts.some(p => !p.every(isFinite)) || s.pts.length < 2).length; add(badStr ? 'warn' : 'ok', TM.L('Strings', 'الخطوط'), TM.L(`${P.strings.length} strings · ${badStr} with invalid vertices`, `${P.strings.length} خطاً · ${badStr} بنقاط غير صالحة`));
    const open = P.solids.filter(s => !s.closed).length; add(open ? 'warn' : 'ok', TM.L('Solids', 'المجسمات'), TM.L(`${P.solids.length} solids · ${open} not closed (volumes unreliable)`, `${P.solids.length} مجسماً · ${open} غير مغلق`));
    for (const s of P.surfaces) { const bad = s.tri && [...s.tri].some(i => i * 3 >= s.pts.length); if (bad) add('error', TM.L('Surfaces', 'الأسطح'), `${s.name}: ${TM.L('triangle index out of range', 'فهرس مثلث خارج النطاق')}`); }
    add(P.surfaces.some(s => s.role === 'topo') ? 'ok' : 'warn', TM.L('Topography', 'الطبوغرافيا'), P.surfaces.some(s => s.role === 'topo') ? TM.L('topography surface set', 'السطح الطبوغرافي محدد') : TM.L('no topography surface: pit and partial blocks use the collar envelope', 'لا يوجد سطح طبوغرافي'));
    if (P.bm) { const bm = P.bm, n = bm.N; const okLen = ['grade', 'kv', 'ns', 'cls', 'frac'].every(k => bm[k] && bm[k].length === n); add(okLen ? 'ok' : 'error', TM.L('Block model', 'نموذج البلوكات'), okLen ? TM.L(`${TM.fmt(bm.estimated)} estimated of ${TM.fmt(n)} cells`, `${TM.fmt(bm.estimated)} بلوك مقدّر من ${TM.fmt(n)}`) : TM.L('attribute arrays have inconsistent lengths', 'مصفوفات الحقول غير متسقة')); if (bm.topCut !== S().topCut) add('warn', TM.L('Block model', 'نموذج البلوكات'), TM.L('top-cut changed after estimation — re-estimate', 'تغيّر السقف بعد التقدير — أعد التقدير')); }
    if (P.pit) add(P.pit.stale ? 'warn' : 'ok', TM.L('Pit', 'الحفرة'), P.pit.stale ? TM.L('pit optimisation is out of date (inputs changed)', 'تحسين الحفرة قديم (تغيّرت المدخلات)') : TM.L(`${P.pit.shells.length} shells, shell ${P.pit.selected + 1} selected`, `${P.pit.shells.length} غلافاً، المختار ${P.pit.selected + 1}`));
    const s = S(); const bad = ['density', 'price', 'recovery', 'millRate', 'mineRate'].filter(k => !(s[k] > 0)); add(bad.length ? 'error' : 'ok', TM.L('Settings', 'الإعدادات'), bad.length ? TM.L('invalid: ', 'غير صالح: ') + bad.join(', ') : TM.L('economic inputs valid', 'المدخلات الاقتصادية سليمة'));
    return out;
  };

  // ---------------------------------------------------------------- summary for the AI and the report
  WF.summary = function () {
    const P = TM.P, bm = P.bm, pit = P.pit, s = S();
    const sv = P.db.assays.map(a => a[s.gradeField]).filter(isFinite);
    return {
      project: P.name, holes: P.db.collars.length, assays: P.db.assays.length, metres: Math.round(P.db.collars.reduce((a, c) => a + (c.depth || 0), 0)), grade_field: s.gradeField,
      assay_stats: pickStats(TM.stats(sv)), top_cut: s.topCut, composites: TM.rt.comps ? TM.rt.comps.length : null, surfaces: P.surfaces.map(x => x.name), strings: P.strings.length, solids: P.solids.map(x => ({ name: x.name, volume_m3: Math.round(x.volume) })),
      variogram: s.variogram || null,
      block_model: bm ? { method: bm.method, block: [bm.def.dx, bm.def.dy, bm.def.dz], estimated: bm.estimated, classes: [1, 2, 3].map(c => { let n = 0; for (let i = 0; i < bm.N; i++) if (bm.cls[i] === c) n++; return n; }) } : null,
      pit: pit ? { shells: pit.shells.length, selected_shell: pit.selected + 1, rf: pit.rfs[pit.selected], stale: !!pit.stale } : null,
      economics: { price: s.price, recovery: s.recovery, mining_cost: s.mineCost, processing_cost: s.procCost + s.gaCost, slope: s.slope, cutoff: s.cutoff, marginal_cutoff: +TM.Mine.econ().marginalCOG.toFixed(2) },
      kpis: bm ? WF.kpisBrief() : null
    };
  };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
