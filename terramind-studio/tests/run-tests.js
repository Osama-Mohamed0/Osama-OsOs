// Engine tests — run with:  node terramind-studio/tests/run-tests.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ctx = { console, setTimeout, clearTimeout, Math, Date, JSON, Buffer, TextEncoder, TextDecoder };
ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['vendor/delaunator.min.js', 'js/00-core.js', 'js/10-project.js', 'js/20-io.js', 'js/30-drillholes.js', 'js/35-surfaces.js', 'js/40-estimation.js', 'js/45-implicit.js', 'js/47-solidops.js', 'js/50-mining.js', 'js/52-design.js', 'js/55-workflow.js', 'js/57-blast.js', 'js/58-underground.js', 'js/62-cad.js'])
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const TM = ctx.TM;
let pass = 0, fail = 0;
const ok = (cond, name, extra = '') => { if (cond) { pass++; console.log('  ✓', name, extra); } else { fail++; console.log('  ✗', name, extra); } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

(async () => {
  console.log('Desurvey');
  { const st = TM.Drill.desurvey({ x: 0, y: 0, z: 100, depth: 50 }, [{ at: 0, az: 0, dip: -90 }]); const p = TM.Drill.posAt(st, 50); ok(near(p[2], 50, 1e-9) && near(p[0], 0, 1e-9), 'vertical hole'); }
  { const st = TM.Drill.desurvey({ x: 0, y: 0, z: 0, depth: 100 }, [{ at: 0, az: 90, dip: -60 }, { at: 100, az: 90, dip: -60 }]); const p = TM.Drill.posAt(st, 100); ok(near(p[0], 50, 1e-6) && near(p[2], -86.6025, 1e-3), 'straight inclined hole', JSON.stringify(p.map(v => +v.toFixed(3)))); }
  { const st = TM.Drill.desurvey({ x: 0, y: 0, z: 0, depth: 100 }, [{ at: 0, az: 0, dip: 0 }, { at: 100, az: 90, dip: 0 }]); const p = TM.Drill.posAt(st, 100); const R = 100 / (Math.PI / 2); ok(near(p[0], R, 0.01) && near(p[1], R, 0.01), 'min-curvature quarter circle', `${p[0].toFixed(3)},${p[1].toFixed(3)} vs ${R.toFixed(3)}`); }

  console.log('Demo project + validation');
  const P = TM.Drill.makeDemo(); TM.setProject(P);
  ok(P.db.collars.length === 21, 'collars', P.db.collars.length);
  const iss = TM.Drill.validate();
  ok(iss.some(i => i.hole === 'WG008' && /Extreme/.test(i.msg)), 'flags WG008 spike');
  ok(iss.some(i => i.hole === 'WG003' && /Overlap/.test(i.msg)), 'flags WG003 overlap');
  ok(iss.some(i => i.hole === 'WG011' && /Duplicate/.test(i.msg)), 'flags WG011 duplicate');
  const fx = TM.Drill.fix(); ok(fx.overlaps === 1 && fx.duplicates === 1, 'fix overlaps/duplicates', JSON.stringify(fx));
  ok(!TM.Drill.validate().some(i => /Overlap|Duplicate/.test(i.msg)), 'clean after fix');

  console.log('Surfaces');
  { const tin = TM.rt.tin; const c = P.db.collars[0]; const z = tin.z(c.x, c.y); ok(near(z, c.z, 1.0), 'TIN z at collar', `${z.toFixed(2)} vs ${c.z}`); }
  { const pts = new Float64Array([0, 0, 10, 100, 0, 20, 100, 100, 30, 0, 100, 20, 50, 50, 20]); const tri = TM.Surf.triangulate(pts); const t = TM.Surf.TIN(pts, tri); ok(near(t.z(25, 25), 15, 1e-6), 'planar TIN interpolation'); const cf = TM.Surf.cutFill([[5100, 8100], [5200, 8100], [5200, 8200], [5100, 8200]], 320, 2); ok(near(cf.area, 1e4, 1) && cf.cut + cf.fill > 0, 'cut/fill on topo', `cut ${cf.cut.toFixed(0)} fill ${cf.fill.toFixed(0)}`); }
  { const c = TM.Surf.contours(TM.rt.tin, 10); ok(c.length > 2 && c[0].lines.length > 0, 'contours', c.length + ' levels'); }

  console.log('Compositing + variography');
  P.settings.topCut = 15; const comps = TM.Drill.composite(2);
  ok(comps.length > 1500 && comps.every(c => c.g <= 15 + 1e-9), 'composites capped', comps.length);
  let t0 = Date.now(); const av = TM.Est.autoVariography(comps, { lag: 10, nLags: 14 });
  ok(av.model.ranges[0] >= av.model.ranges[1] && av.model.ranges[1] >= av.model.ranges[2] && av.model.ranges[2] > 0, 'auto variogram model', JSON.stringify(av.model) + ` ${Date.now() - t0}ms`);

  console.log('Block model + kriging');
  const def = TM.Est.autoDefine(comps, { dx: 5, dy: 5, dz: 5 }); const bm = TM.Est.define(def); TM.Est.prepare(bm, null);
  const params = { method: 'ok', model: av.model, search: { azi: av.model.azi, dip: av.model.dip, rake: 0, ranges: av.model.ranges.map(r => Math.max(r, 20) * 1.2) }, minS: 4, maxS: 16, maxPerHole: 4, disc: 2 };
  t0 = Date.now(); const n = await TM.Est.estimate(bm, comps, params); const tk = Date.now() - t0;
  ok(n > 5000, 'OK estimated blocks', `${n} of ${bm.N} in ${tk} ms`);
  const est = []; for (let i = 0; i < bm.N; i++) if (isFinite(bm.grade[i])) est.push(bm.grade[i]);
  const cm = TM.stats(comps.map(c => c.g)).mean, bmn = TM.stats(est).mean; ok(bmn > cm * 0.5 && bmn < cm * 1.5, 'block mean vs composite mean', `${bmn.toFixed(3)} vs ${cm.toFixed(3)}`);
  ok(est.every(v => v >= 0), 'no negative estimates');
  const cls = TM.Est.classify(bm); ok(cls[1] + cls[2] + cls[3] === n, 'classification covers estimates', JSON.stringify(cls));
  const rep = TM.Est.report(bm, 0.5); ok(rep.tonnes > 1e6, 'resource @0.5', `${(rep.tonnes / 1e6).toFixed(2)} Mt @ ${rep.grade.toFixed(2)} g/t = ${(rep.oz / 1e3).toFixed(1)} koz`);
  const idwP = Object.assign({}, params, { method: 'idw', power: 2 }); const bm2 = TM.Est.define(def); TM.Est.prepare(bm2); t0 = Date.now(); await TM.Est.estimate(bm2, comps, idwP); ok(true, 'IDW runs', `${Date.now() - t0} ms`);

  console.log('Max-flow / LG');
  { const g = new TM.Mine.Graph(4); g.add(0, 2, 5); g.add(0, 3, 4); g.add(2, 1, 3); g.add(3, 1, 6); g.add(2, 3, 2); const r = g.maxflow(0, 1); ok(near(r.flow, 9, 1e-9), 'maxflow toy = 9', r.flow); }
  { // closure: ore block (+10) needs two waste blocks (−3 each) → mine all; if ore +5 and waste −3,−3 → mine nothing
    const mk = v => { const g = new TM.Mine.Graph(5); g.add(0, 2, v); g.add(3, 1, 3); g.add(4, 1, 3); g.add(2, 3, 1e18); g.add(2, 4, 1e18); return g.maxflow(0, 1).closure; };
    const a = mk(10), b = mk(5); ok(a[2] && a[3] && a[4] && !b[2] && !b[3], 'max closure logic'); }
  t0 = Date.now(); const lg = TM.Mine.buildLG(bm, { cell: 10 }); const rfs = [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1];
  const res = await TM.Mine.nestedShells(lg, rfs); const tl = Date.now() - t0;
  const sh = res.shells; ok(sh.every((s, i) => i === 0 || s.ore + s.waste >= sh[i - 1].ore + sh[i - 1].waste - 1), 'shells are nested (monotone)', `${res.nodes} nodes, ${tl} ms`);
  const fin = sh[6]; ok(fin.ore > 0 && fin.value > 0, 'final pit (rf=1) positive value', `ore ${(fin.ore / 1e6).toFixed(2)} Mt @ ${fin.grade.toFixed(2)}, waste ${(fin.waste / 1e6).toFixed(2)} Mt, SR ${fin.sr.toFixed(2)}, value $${(fin.value / 1e6).toFixed(1)}M`);
  // slope check: every mined block has its 1-level-up neighbours (within cone) mined
  { const mined = new Uint8Array(lg.N); for (let id = 0; id < lg.N; id++) if (res.shellOf[id] && res.shellOf[id] <= 7) mined[id] = 1; let viol = 0; const { nx, ny, nz } = lg;
    for (let id = 0; id < lg.N; id++) { if (!mined[id]) continue; const i = id % nx, j = Math.floor(id / nx) % ny, k = Math.floor(id / (nx * ny)); if (k + 1 >= nz) continue; const up = i + nx * (j + ny * (k + 1)); if (lg.T[up] > 0 && !mined[up]) viol++; }
    ok(viol === 0, 'vertical precedence respected', viol + ' violations'); }
  const pbp = TM.Mine.pitByPit(lg, res); ok(pbp[6].best >= pbp[6].worst - 1, 'pit-by-pit best ≥ worst', `best $${(pbp[6].best / 1e6).toFixed(1)}M, worst $${(pbp[6].worst / 1e6).toFixed(1)}M`);
  ok(new Set(pbp.map(p => Math.round(p.best / 1e5))).size > 3, 'NPV best differs shell by shell', pbp.map(p => (p.best / 1e6).toFixed(1)).join(' '));
  { const s0 = TM.P.settings, keep = { cutoff: s0.cutoff, millRate: s0.millRate };
    const pb = TM.Mine.panels(lg, res.shellOf, 6); const tot = pb.flat().reduce((a, b) => a + b.ore + b.low + b.waste, 0); ok(Math.abs(tot - (res.shells[6].ore + res.shells[6].waste)) < 1, 'panels conserve shell tonnage', (tot / 1e6).toFixed(2) + ' Mt');
    s0.cutoff = 1.25; const r = TM.Mine.scheduleP(pb, s0); const mined = r.total.ore + r.total.low + r.total.waste; ok(Math.abs(mined - tot) < 1 && r.total.feed <= r.total.ore + r.total.low + 1, 'schedule mines every bench; feed = ore + reclaimed LG', `${r.life} yr, ore ${(r.total.ore / 1e6).toFixed(2)} LG ${(r.total.low / 1e6).toFixed(2)}`);
    ok(r.years.every(y => y.feed <= s0.millRate + 1 && y.moved <= s0.mineRate + 1), 'annual mill and mining capacities respected');
    s0.millRate = keep.millRate * 3; const r3 = TM.Mine.scheduleP(pb, s0); ok(r3.life < r.life || r.life === 1, 'higher mill rate shortens mine life', `${r.life} → ${r3.life} yr`);
    Object.assign(s0, keep); }

  console.log('Schedule / NPV');
  { const s = Object.assign(TM.defaultSettings(), { capex: 100, closure: 0, discount: 10, millRate: 1e12, mineRate: 1e12, mineCost: 0, procCost: 0, gaCost: 0, sellCost: 0, price: 31.1035, recovery: 100 });
    const r = TM.Mine.schedule([{ ore: 1, waste: 0, metal: 110 }], s); ok(near(r.npv, 0, 1e-6), 'NPV of 110 in yr1 at 10% − 100 = 0', r.npv); ok(near(r.irr, 0.1, 1e-6), 'IRR = 10%', r.irr); }

  { const s2 = Object.assign(TM.defaultSettings(), { capex: 120, closure: 7, discount: 8, millRate: 1, mineRate: 1e12, mineCost: 0, procCost: 0, gaCost: 0, sellCost: 0, price: 31.1035, recovery: 100 });
    const r = TM.Mine.schedule([{ ore: 1, waste: 0, metal: 73 }, { ore: 1, waste: 0, metal: 73 }, { ore: 1, waste: 0, metal: 73 }], s2); ok(r.irr > 0.2 && r.irr < 0.5, 'IRR with closure cost (negative last flow)', (r.irr * 100).toFixed(1) + '%'); }
  { TM.rt.holes.find(h => h.id === 'WG008'); const sg = TM.Drill.suggestTopCut(); ok(sg.value >= 5 && sg.value <= 20 && sg.nAbove <= 5, 'top-cut suggestion isolates the spike', `${sg.value} (${sg.rule}, ${sg.nAbove} above)`); }

  console.log('Solids');
  { const R = 20, cs = 2, n = 30; const f = new Float32Array(n * n * n); for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = (i + .5) * cs - 30, y = (j + .5) * cs - 30, z = (k + .5) * cs - 30; f[i + n * (j + n * k)] = R - Math.hypot(x, y, z); }
    const m = TM.Solid.surfaceNets({ f, nx: n, ny: n, nz: n, x0: 0, y0: 0, z0: 0, cs: [cs, cs, cs] }, 0); const v = TM.Solid.volume(m), tv = 4 / 3 * Math.PI * R ** 3;
    ok(Math.abs(v - tv) / tv < 0.03, 'surface-nets sphere volume', `${v.toFixed(0)} vs ${tv.toFixed(0)}`); ok(TM.Solid.isClosed(m).closed, 'mesh closed');
    ok(TM.Solid.inside(m, 30, 30, 30) && !TM.Solid.inside(m, 2, 2, 2), 'point-in-solid'); }
  { t0 = Date.now(); const r = await TM.Solid.rbfShell(comps, { threshold: 0.5, cell: 6, maxPts: 700 }); const v = TM.Solid.volume(r.mesh); ok(v > 1e5 && TM.Solid.isClosed(r.mesh).closed, 'RBF grade shell', `${(v / 1e3).toFixed(0)}k m³, ${r.mesh.idx.length / 3} tris, ${Date.now() - t0} ms`); }

  console.log('CAD string tools');
  { const sq = [[0, 0, 0], [0, 10, 0], [10, 10, 0], [10, 0, 0]]; const o = TM.Str.offset(TM.Str.clockwise(sq), 2, true); ok(near(TM.Str.area(o), 196, 0.5), 'offset square outward by 2 m → 14×14', TM.Str.area(o).toFixed(2));
    const dn = TM.Str.densify(sq, 1, true); ok(dn.length === 40, 'densify 1 m', dn.length); ok(TM.Str.simplify(dn, 0.01, true).length === 4, 'simplify back to 4 corners');
    const cl = TM.Str.clip({ closed: false, pts: [[-5, 5, 0], [15, 5, 0]] }, sq, true); ok(cl.length === 1 && near(cl[0][0][0], 0, 1e-3) && near(cl[0][cl[0].length - 1][0], 10, 1e-3), 'clip line to polygon');
    const m = TM.Str.measure([0, 0, 0], [30, 40, 5]); ok(near(m.horizontal, 50, 1e-9) && near(m.gradient, 10, 1e-9) && near(m.bearing, 36.87, 0.01), 'measure distance/gradient/bearing'); }
  { const n0 = TM.P.strings.length; TM.Undo.push('t'); TM.P.strings.push({ id: 'x', name: 'x', pts: [[0, 0, 0], [1, 1, 1]] }); TM.Undo.undo(); ok(TM.P.strings.length === n0, 'undo restores strings'); TM.Undo.redoOne(); ok(TM.P.strings.length === n0 + 1, 'redo'); TM.Undo.undo(); }

  console.log('Pit & dump design');
  { const c = [5300, 8300]; const toe = [[c[0] - 40, c[1] - 25, 220], [c[0] - 40, c[1] + 25, 220], [c[0] + 40, c[1] + 25, 220], [c[0] + 40, c[1] - 25, 220]];
    let t0 = Date.now(); const D = TM.Design.pit({ toe, benchH: 10, batter: 70, berm: 6, ramp: { width: 20, gradient: 10, dir: 1, start: toe[0] }, res: 2, maxBenches: 30 });
    ok(D.stats.benches >= 8 && D.stats.volume > 1e6, 'pit design benches & volume', `${D.stats.benches} benches, ${(D.stats.volume / 1e6).toFixed(2)} Mm³, ${Date.now() - t0} ms`);
    ok(near(TM.Design.zAt(D, c[0], c[1]), 220, 1e-6), 'pit floor at toe RL');
    const f = 10 / Math.tan(70 * TM.D2R); const Dh = TM.Design.pit({ toe, benchH: 10, batter: 70, berm: 6, ramp: null, res: 0.5, maxBenches: 3 }); const zFace = TM.Design.zAt(Dh, c[0] + 40 + f / 2, c[1]); ok(zFace > 223.5 && zFace < 226.5, 'face mid-height (0.5 m grid)', zFace.toFixed(2));
    ok(D.strings.some(x => x.kind === 'ramp') && D.strings.filter(x => x.kind === 'toe').length >= 8, 'toe/crest/ramp strings', D.strings.length);
    const Dn = TM.Design.pit({ toe, benchH: 10, batter: 70, berm: 6, ramp: null, res: 2, maxBenches: 30 }); ok(D.stats.volume > Dn.stats.volume, 'ramp adds waste volume', `${(D.stats.volume / 1e6).toFixed(2)} vs ${(Dn.stats.volume / 1e6).toFixed(2)} Mm³`);
    const gz = TM.topoZ(5100, 8500); const base = [[5050, 8450, gz], [5050, 8550, gz], [5150, 8550, gz], [5150, 8450, gz]]; const Du = TM.Design.dump({ base, benchH: 10, batter: 37, berm: 10, maxRL: gz + 40, res: 2 }); ok(Du.stats.volume > 1e5 && Du.stats.benches >= 2, 'dump design capacity', `${(Du.stats.volume / 1e3).toFixed(0)}k m³, ${Du.stats.benches} lifts`); }

  console.log('Wireframes & blasting');
  { const a = { closed: true, pts: [[0, 0, 0], [0, 10, 0], [10, 10, 0], [10, 0, 0]] }, b = { closed: true, pts: [[0, 0, 10], [0, 10, 10], [10, 10, 10], [10, 0, 10]] };
    const m = TM.Wire.fromSections([a, b], 40, true); const v = TM.Solid.volume(m); ok(near(v, 1000, 20) && TM.Solid.isClosed(m).closed, 'triangulate between sections', v.toFixed(1));
    const cube = (o) => TM.Wire.fromSections([{ closed: true, pts: [[o, o, o], [o, o + 10, o], [o + 10, o + 10, o], [o + 10, o, o]] }, { closed: true, pts: [[o, o, o + 10], [o, o + 10, o + 10], [o + 10, o + 10, o + 10], [o + 10, o, o + 10]] }], 40, true);
    const A = cube(0), B = cube(5); const I = TM.Wire.boolean(A, B, 'intersect', 0.5); ok(near(TM.Solid.volume(I), 125, 15), 'boolean intersect', TM.Solid.volume(I).toFixed(1)); const Un = TM.Wire.boolean(A, B, 'union', 0.5); ok(near(TM.Solid.volume(Un), 1875, 80), 'boolean union', TM.Solid.volume(Un).toFixed(0)); }
  { const r = TM.Blast.pattern({ poly: [[0, 0, 100], [0, 30, 100], [50, 30, 100], [50, 0, 100]], burden: 4, spacing: 5, pattern: 'square', azimuth: 90, dip: 90, benchH: 10, subdrill: 1, stemming: 3, diameter: 115, explosive: 'ANFO', density: 2.7 });
    ok(r.summary.holes >= 60 && r.summary.holes <= 80, 'blast pattern hole count', r.summary.holes); ok(r.summary.powder_factor_kg_t > 0.1 && r.summary.powder_factor_kg_t < 0.6, 'powder factor', r.summary.powder_factor_kg_t.toFixed(3) + ' kg/t'); }

  console.log('Formats');
  { const s = [{ strNo: 3, closed: true, pts: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] }]; const back = TM.IO.readSTR(TM.IO.writeSTR(s), 't'); ok(back.length === 1 && back[0].closed && back[0].pts.length === 3 && back[0].pts[1][0] === 4 && back[0].pts[1][1] === 5, 'Surpac .str round-trip'); }
  { const csv = 'Hole,East,North,RL,Depth\n"A,1",1,2,3,4\nB,5,6,7,8'; const t = TM.IO.parseCSV(csv); const m = TM.IO.autoMap(t.header, ['hole', 'x', 'y', 'z', 'depth']); ok(t.rows[0][0] === 'A,1' && m.x === 1 && m.z === 3 && m.depth === 4, 'CSV parse + auto-map'); }
  { const enc = TM.encode({ a: new Float32Array([1.5, 2.5]), _rtX: 1 }); const dec = TM.decode(enc); ok(dec.a[1] === 2.5 && dec._rtX === undefined, 'typed array codec'); }
  { const d = TM.IO.writeDXF({ strings: [{ name: 'L1', closed: false, pts: [[0, 0, 0], [1, 1, 1]] }] }); const r = TM.IO.readDXF(d); ok(r.strings.length === 1 && r.strings[0].pts[1][2] === 1, 'DXF round-trip'); }

  console.log('Underground');
  { const line = [[0, 0, 100], [100, 0, 100]]; const r = TM.UG.tunnel(line, { type: 'rect', w: 4, h: 4 }); const v = TM.Solid.volume(r.mesh); ok(near(v, 1600, 1) && TM.Solid.isClosed(r.mesh).closed, 'rectangular drive volume = 4×4×100', v.toFixed(1));
    const c = TM.UG.tunnel([[0, 0, 0], [0, 0, 50]], { type: 'circular', w: 4 }); const vc = TM.Solid.volume(c.mesh); ok(Math.abs(vc - Math.PI * 4 * 50) / (Math.PI * 4 * 50) < 0.03, 'circular raise volume ≈ πr²h', vc.toFixed(1));
    const a = TM.UG.profileArea(TM.UG.profile('arched', 5, 5.5, 40)); ok(near(a, 5 * 3 + Math.PI * 6.25 / 2, 0.1), 'arched profile area', a.toFixed(2)); }
  { const r = TM.UG.faceRound({ w: 5, h: 5.5, advance: 3.6, preview: true }); const k = Object.fromEntries(r.by_type.map(x => [x.kind, x.holes])); ok(k.relief === 2 && k.cut >= 8 && k.perimeter > 10 && k.lifter >= 5 && k.easer >= 1, 'face round has every hole type', JSON.stringify(k)); ok(r.powder_factor_kg_m3 > 1 && r.powder_factor_kg_m3 < 4, 'face round powder factor plausible', r.powder_factor_kg_m3 + ' kg/m³'); }
  { const rings = [[[0, 0, 0], [20, 0, 0], [20, 6, 0], [0, 6, 0]], [[0, 0, 20], [20, 0, 20], [20, 6, 20], [0, 6, 20]]]; const so = TM.Solid.make('ST_test', TM.UG.loft(rings)); TM.P.solids.push(so); ok(near(so.volume, 2400, 1) && so.closed, 'lofted stope solid is closed', so.volume.toFixed(0));
    const r = TM.UG.ringDesign({ stope: so.id, collarHeight: 1 }); ok(r.rings >= 8 && r.holes > 20 && r.powder_factor_kg_t > 0.2 && r.powder_factor_kg_t < 1.2, 'ring design inside a stope', JSON.stringify({ rings: r.rings, holes: r.holes, pf: r.powder_factor_kg_t })); TM.P.solids.pop(); TM.P.blast = null; }

  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
