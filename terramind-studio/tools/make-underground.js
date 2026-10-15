// Builds the "Jabal Nuhas Underground" showcase project (synthetic data) and its import files.
// Run:  node terramind-studio/tools/make-underground.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
const ctx = { console, setTimeout, clearTimeout, Math, Date, JSON, Buffer, TextEncoder, TextDecoder }; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['vendor/delaunator.min.js', 'js/00-core.js', 'js/10-project.js', 'js/20-io.js', 'js/30-drillholes.js', 'js/35-surfaces.js', 'js/45-implicit.js', 'js/47-solidops.js', 'js/62-cad.js'])
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const TM = ctx.TM, IO = TM.IO, D2R = Math.PI / 180;
const OUT = path.join(ROOT, 'samples', 'underground'); fs.mkdirSync(OUT, { recursive: true });
const R = TM.rng(7701);

// ---------------------------------------------------------------- terrain & geology (synthetic truth)
const X0 = 20000, Y0 = 50000;
const topo = (e, n) => 960 + 35 * Math.sin((e - X0) / 160) * Math.cos((n - Y0) / 210) + 18 * Math.sin((e - X0 + n - Y0) / 260) - 0.03 * (e - X0 - 500);
const C = [X0 + 500, Y0 + 500, 0]; C[2] = topo(C[0], C[1]);
const SV = [Math.sin(45 * D2R), Math.cos(45 * D2R), 0];                         // strike 045
const DV = [Math.sin(135 * D2R) * Math.cos(75 * D2R), Math.cos(135 * D2R) * Math.cos(75 * D2R), -Math.sin(75 * D2R)]; // dip 75° → 135
let NV = [SV[1] * DV[2] - SV[2] * DV[1], SV[2] * DV[0] - SV[0] * DV[2], SV[0] * DV[1] - SV[1] * DV[0]];
const HW = [Math.sin(135 * D2R), Math.cos(135 * D2R), 0]; // horizontal toward hanging wall
if (NV[0] * HW[0] + NV[1] * HW[1] < 0) NV = NV.map(x => -x);
const HN = (() => { const l = Math.hypot(NV[0], NV[1]); return [NV[0] / l, NV[1] / l, 0]; })();
const loc = p => { const d = [p[0] - C[0], p[1] - C[1], p[2] - C[2]]; return { u: d[0] * SV[0] + d[1] * SV[1] + d[2] * SV[2], w: d[0] * DV[0] + d[1] * DV[1] + d[2] * DV[2], v: d[0] * NV[0] + d[1] * NV[1] + d[2] * NV[2] }; };
const halfW = (u, w) => 2.5 + 2.0 * (1 + Math.sin(u / 55 + w / 90));
const inVein = L => Math.abs(L.u) <= 230 && L.w >= 0 && L.w <= 650 && Math.abs(L.v) <= halfW(L.u, L.w);
const DYKE = [C[0] + 90 * SV[0], C[1] + 90 * SV[1]], DM = [Math.cos(160 * D2R), -Math.sin(160 * D2R)];
const inDyke = p => Math.abs((p[0] - DYKE[0]) * DM[0] + (p[1] - DYKE[1]) * DM[1]) < 4;
function meanAu(L) { const s1 = -60 + 0.35 * L.w, s2 = 130 - 0.2 * L.w; let g = 1.2 + 9 * Math.exp(-((L.u - s1) ** 2) / (2 * 45 * 45)) + (L.w > 150 ? 7 * Math.exp(-((L.u - s2) ** 2) / (2 * 35 * 35)) : 0); if (L.w < 40) g *= 0.3; const edge = Math.max(0, (Math.abs(L.u) - 190) / 40); return g * Math.exp(-edge * 2); }
function sample(p) {
  const L = loc(p), dyke = inDyke(p), oxide = p[2] > topo(p[0], p[1]) - 25;
  let au, cu, lith;
  if (dyke) { au = 0.01 + R() * 0.02; cu = 0.01; lith = 'DK'; }
  else if (inVein(L)) { au = meanAu(L) * Math.exp(R.gauss() * 0.45 - 0.1); cu = (0.15 + 0.12 * Math.pow(au, 0.8)) * Math.exp(R.gauss() * 0.3); lith = 'VN'; }
  else { const d = Math.abs(L.v) - halfW(L.u, L.w); au = 0.08 * Math.exp(-Math.max(d, 0) / 4) * Math.exp(R.gauss() * 0.5) + 0.01; cu = 0.02 + 0.03 * Math.exp(-Math.max(d, 0) / 6); lith = L.v > 0 ? 'AND' : 'GRD'; }
  if (oxide && lith !== 'VN') lith = 'OX';
  return { au: +Math.max(0.005, au).toFixed(3), cu: +Math.max(0.005, cu).toFixed(3), lith };
}
const veinPt = (u, RL) => { const w = (C[2] - RL) / Math.sin(75 * D2R); return [C[0] + u * SV[0] + w * DV[0], C[1] + u * SV[1] + w * DV[1], RL]; };
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + (b[2] || 0) * k];
const r3 = p => p.map(x => +(+x).toFixed(3));

// ---------------------------------------------------------------- project
const P = TM.newProject('Jabal Nuhas Underground — showcase'); TM.P = P;
Object.assign(P.settings, { mineType: 'underground', gradeField: 'au_gpt', gradeUnit: 'g/t', density: 2.75, price: 2400, recovery: 93, mineCost: 48, procCost: 24, gaCost: 8, sellCost: 30, capex: 150e6, millRate: 0.6e6, mineRate: 0.75e6, discount: 8, closure: 10e6, cutoff: 2.5, compLen: 1, benchH: 25 });
P.crs = 'Local mine grid (m), RL = elevation';
// plot defaults for underground sheets are set in the app (Plan ± slab)

// topography survey
const tp = []; for (let j = 0; j <= 44; j++) for (let i = 0; i <= 44; i++) { const e = X0 + i * 25 + (R() - .5) * 6, n = Y0 + j * 25 + (R() - .5) * 6; tp.push(+e.toFixed(2), +n.toFixed(2), +(topo(e, n) + R.gauss() * 0.2).toFixed(2)); }
for (let k = 0; k < 900; k++) { const e = X0 + R() * 1100, n = Y0 + R() * 1100; tp.push(+e.toFixed(2), +n.toFixed(2), +topo(e, n).toFixed(2)); }
P.surfaces.push({ id: TM.uid('srf'), name: 'Topography_LiDAR', role: 'topo', pts: new Float64Array(tp), tri: null, color: '#6b7d5e' });
TM.Surf.rebuildTopo = () => { TM.rt.tin = TM.Surf.tinOf(P.surfaces[0]); }; TM.Surf.rebuildTopo();
const dz = (e, n) => { const z = TM.topoZ(e, n); return isFinite(z) ? z : topo(e, n); };

// ---------------------------------------------------------------- mine design: levels, decline, crosscuts
const S = [], str = (name, strNo, color, pts, closed = false, desc = '') => { const s = { id: TM.uid('str'), name, strNo, color, closed, pts: pts.map(r3), desc }; S.push(s); return s; };
const firstRL = Math.floor((C[2] - 80) / 25) * 25, LEVELS = []; for (let rl = firstRL; rl >= firstRL - 350; rl -= 25) LEVELS.push(rl);
const bottomRL = LEVELS[LEVELS.length - 1];
// decline helix in the footwall, drifting with the vein
const fwCentre = z => add(veinPt(0, z), HW, -75);
const helix = []; { let th = 0, z = (() => { const c = fwCentre(LEVELS[0]); return dz(c[0], c[1]) - 12; })(); const Rr = 28; for (let k = 0; z > bottomRL - 8 && k < 20000; k++) { const c = fwCentre(z); helix.push([c[0] + Rr * Math.cos(th), c[1] + Rr * Math.sin(th), z]); th += 5 / Rr; z -= 5 / 7; } }
// straight portal access at 1:7 heading away from the vein (toward NW) until it daylights
const h0 = helix[0], awayDir = [-HW[0], -HW[1], 0]; let Ls = 200; for (let it = 0; it < 12; it++) { const p = add(h0, awayDir, Ls); Ls = Math.max(50, (dz(p[0], p[1]) - h0[2]) * 7); }
const portal = add(h0, awayDir, Ls); portal[2] = dz(portal[0], portal[1]);
const access = []; for (let k = 0; k <= 40; k++) access.push([portal[0] + (h0[0] - portal[0]) * k / 40, portal[1] + (h0[1] - portal[1]) * k / 40, portal[2] + (h0[2] - portal[2]) * k / 40]);
const decline = access.concat(helix.slice(1));
str('Decline_CL_1in7_5.5x5.8', 1, '#E5E7EB', decline, false, 'Main decline 5.5 W x 5.8 H, gradient 1:7');
const declineLen = decline.reduce((a, p, i) => i ? a + Math.hypot(p[0] - decline[i - 1][0], p[1] - decline[i - 1][1], p[2] - decline[i - 1][2]) : 0, 0);
// level development
const junction = {};
for (const RL of LEVELS) {
  const od = []; for (let u = -210; u <= 210; u += 10) od.push(veinPt(u, RL));
  str(`OreDrive_RL${RL}`, 2, '#F2C94C', od, false, 'Ore drive 4.5 W x 4.8 H on vein');
  let best = null; for (const p of helix) if (!best || Math.abs(p[2] - RL) < Math.abs(best[2] - RL)) best = p;
  const j = [best[0], best[1], RL]; const u0 = TM.clamp(loc(j).u, -200, 200); const tgt = veinPt(u0, RL); junction[RL] = { j, u0, tgt };
  str(`Crosscut_RL${RL}`, 3, '#A7B1C2', [j, tgt], false, 'Level access crosscut 5.0 x 5.0');
}
// ventilation: fresh air raise (SW), return air raise (NE), level connections, primary fan
const raiseAt = (u, z) => add(veinPt(u, LEVELS[0]), HW, -40).slice(0, 2).concat([z]);
const farTop = raiseAt(-235, 0), rarTop = raiseAt(235, 0); farTop[2] = dz(farTop[0], farTop[1]); rarTop[2] = dz(rarTop[0], rarTop[1]);
str('FAR_Fresh_Air_Raise_4.0m', 10, '#3B82F6', [farTop, raiseAt(-235, bottomRL)], false, 'Raisebored 4.0 m diameter, intake');
str('RAR_Return_Air_Raise_4.5m', 11, '#F87171', [rarTop, raiseAt(235, bottomRL)], false, 'Raisebored 4.5 m diameter, exhaust');
for (const RL of LEVELS) { str(`Vent_FA_RL${RL}`, 12, '#60A5FA', [veinPt(-210, RL), raiseAt(-235, RL)]); str(`Vent_RA_RL${RL}`, 12, '#FCA5A5', [veinPt(210, RL), raiseAt(235, RL)]); }
const sq = (c, a, b, ang, z) => { const ca = Math.cos(ang), sa = Math.sin(ang); return [[-a, -b], [a, -b], [a, b], [-a, b]].map(([x, y]) => [c[0] + x * ca - y * sa, c[1] + x * sa + y * ca, z]); };
const stAng = Math.atan2(SV[1], SV[0]);
str('Primary_Fan_Station_2x250kW', 13, '#F87171', sq(rarTop, 9, 6, stAng, rarTop[2] + 0.5), true, 'Exhausting primary fans at RAR collar');
// drainage: level sumps, drive drains (1%), pump station, rising main, settling ponds
for (const RL of LEVELS) {
  const J = junction[RL]; str(`Sump_RL${RL}`, 20, '#22D3EE', sq(add(J.j, HW, -8), 5, 3, stAng, RL - 3), true, 'Level sump 10x6x3 m');
  for (const side of [-1, 1]) { const pts = []; for (let k = 0; k <= 21; k++) { const u = J.u0 + side * k * 10; if (Math.abs(u) > 210) break; const p = veinPt(u, RL); p[2] = RL - 0.3 + Math.abs(u - J.u0) * 0.01; pts.push(p); } if (pts.length > 1) str(`Drain_RL${RL}_${side < 0 ? 'SW' : 'NE'}`, 22, '#67E8F9', pts, false, 'Drive drain at 1% to crosscut sump'); }
}
const bot = helix[helix.length - 1]; str('Main_Pump_Station', 21, '#06B6D4', sq(add(bot, HW, -30), 12, 7, stAng, bottomRL - 1), true, '3 x 75 kW multistage pumps, 120 m3/h');
str('Rising_Main_DN200', 24, '#0EA5E9', decline.slice().reverse().map(p => [p[0] + 1.2, p[1] + 1.2, p[2] + 2.0]), false, 'HDPE/steel DN200 rising main in decline');
const pondC = add(portal, awayDir, 90); for (const [k, off] of [[1, -25], [2, 25]]) { const c = add(pondC, [SV[0], SV[1], 0], off); str(`Settling_Pond_${k}`, 23, '#38BDF8', sq(c, 18, 12, stAng, 0).map(p => [p[0], p[1], dz(p[0], p[1]) - 3]), true, 'Settling pond 36x24x3 m'); }

// ---------------------------------------------------------------- stopes (longhole open stoping)
const stopes = [];
const panels = []; for (let u = -200; u < 200;) { for (let k = 0; k < 3 && u + 25 <= 200; k++) { panels.push([u, u + 25]); u += 25; } u += 6; }
const stopeRing = (u1, u2, RL) => { const hwMax = Math.max(halfW(u1, (C[2] - RL) / Math.sin(75 * D2R)), halfW(u2, (C[2] - RL) / Math.sin(75 * D2R)), halfW((u1 + u2) / 2, (C[2] - RL) / Math.sin(75 * D2R))) + 0.5; const hh = hwMax / Math.sin(75 * D2R); const a = veinPt(u1, RL), b = veinPt(u2, RL); return [add(a, HN, -hh), add(b, HN, -hh), add(b, HN, hh), add(a, HN, hh)].map(p => [p[0], p[1], RL]); };
for (let li = 1; li < LEVELS.length; li++) {
  const top = LEVELS[li - 1], base = LEVELS[li]; let idx = 0;
  for (const [u1, u2] of panels) {
    idx++; let g = 0, n = 0; for (let k = 0; k < 40; k++) { const u = u1 + (u2 - u1) * (k + .5) / 40, RL = base + (top - base) * ((k * 7) % 40 + .5) / 40; const p = veinPt(u, RL); if (inDyke(p)) continue; g += meanAu(loc(p)); n++; }
    const mg = n ? g / n : 0; if (mg < 3.0 || n < 30) continue;
    const lo = stopeRing(u1, u2, base), hi = stopeRing(u1, u2, top - 5);
    const name = `ST_${base}_${String(idx).padStart(2, '0')}`;
    str(`${name}_outline`, 30, '#F59E0B', lo, true, `Longhole stope ${u2 - u1} m strike, sublevel ${top}-${base}`);
    const m = TM.Wire.fromSections([{ closed: true, pts: lo }, { closed: true, pts: hi }], 16, true);
    stopes.push({ name, base, top, u1, u2, mesh: m });
  }
}
for (const st of stopes) P.solids.push(TM.Solid.make(st.name, st.mesh, { source: 'stope design', color: '#F59E0B', opacity: 0.35 }));

// vein wireframe (geological interpretation): level outlines from near-surface to 650 m down-dip
const veinRings = []; for (let RL = Math.floor(C[2] / 25) * 25 - 10; RL >= C[2] - 640 * Math.sin(75 * D2R); RL -= 25) { const w = (C[2] - RL) / Math.sin(75 * D2R); const L = [], Rt = []; for (let u = -230; u <= 230; u += 10) { const hh = halfW(u, w) / Math.sin(75 * D2R); const c = veinPt(u, RL); L.push(add(c, HN, -hh)); Rt.push(add(c, HN, hh)); } veinRings.push({ closed: true, pts: L.concat(Rt.reverse()).map(p => [p[0], p[1], RL]) }); }
const vm_ = TM.Wire.fromSections(veinRings, 96, true);
P.solids.unshift(TM.Solid.make('VEIN_interpreted', vm_, { source: 'geological interpretation (level outlines)', color: '#10B981', opacity: 0.18 }));

// ---------------------------------------------------------------- drill & blast designs
// development face (5.0 W x 5.0 H, burn cut) at the NE face of the bottom ore drive
const faceC = veinPt(210, bottomRL), ax = SV, across = [HN[0], HN[1], 0];
const devHoles = [];
const face = (x, y, type, dia, charged = true) => devHoles.push({ id: `D${String(devHoles.length + 1).padStart(2, '0')}`, type, x, y, dia, len: 4.0, charge: charged ? +(Math.PI * (dia / 2000) ** 2 * 3.4 * 1150).toFixed(2) : 0 });
for (const [x, y] of [[-0.12, 0], [0.12, 0], [0, 0.12], [0, -0.12]]) face(x, 1.5 + y, 'reamer', 102, false);
for (const [x, y] of [[-0.25, 0.25], [0.25, 0.25], [-0.25, -0.25], [0.25, -0.25], [-0.55, 0], [0.55, 0], [0, 0.55], [0, -0.55]]) face(x, 1.5 + y, 'cut', 45);
for (const y of [0.7, 2.3, 3.2]) for (const x of [-1.6, -0.8, 0.8, 1.6]) face(x, y, 'easer', 45);
for (const x of [-2.3, -1.5, -0.75, 0, 0.75, 1.5, 2.3]) face(x, 0.15, 'lifter', 45);
for (const y of [0.9, 1.9, 2.9, 3.8]) { face(-2.4, y, 'wall', 45); face(2.4, y, 'wall', 45); }
for (let k = 0; k <= 8; k++) { const a = Math.PI * k / 8; face(-2.45 * Math.cos(a), 3.9 + 1.0 * Math.sin(a), 'back', 45); }
const devPt = h => [faceC[0] + across[0] * h.x, faceC[1] + across[1] * h.x, bottomRL + h.y];
for (const h of devHoles) { const c = devPt(h); str(`DEV_${h.id}_${h.type}`, 40, h.type === 'reamer' ? '#9CA3AF' : '#F472B6', [c, add(c, ax, h.len)], false, `${h.dia} mm ${h.type}`); }
// stope ring design for the richest stope
const rich = stopes.slice().sort((a, b) => (b.u2 - b.u1) - (a.u2 - a.u1) || a.base - b.base)[Math.floor(stopes.length / 2)] || stopes[0];
const ringHoles = [];
if (rich) {
  for (let u = rich.u1 + 1.5, r = 1; u <= rich.u2 - 1; u += 2.5, r++) {
    const col = veinPt(u, rich.top - 2); const lo = rich.base + 1, w = (C[2] - lo) / Math.sin(75 * D2R), hh = (halfW(u, w) + 0.3) / Math.sin(75 * D2R);
    const ends = [-1, -0.5, 0, 0.5, 1].map(f => add(veinPt(u, lo), HN, hh * f)); ends.push(add(veinPt(u, (lo + rich.top) / 2), HN, -hh), add(veinPt(u, (lo + rich.top) / 2), HN, hh));
    ends.forEach((e, k) => { const L = Math.hypot(e[0] - col[0], e[1] - col[1], e[2] - col[2]); ringHoles.push({ ring: r, hole: k + 1, collar: col, toe: e, len: L, charge: +(Math.PI * (0.089 / 2) ** 2 * Math.max(0, L - 2.5) * 850).toFixed(1) }); str(`RING_${rich.name}_R${String(r).padStart(2, '0')}_H${k + 1}`, 41, '#E879F9', [col, e], false, '89 mm uphole/downhole ring'); });
  }
}
// ---------------------------------------------------------------- underground infrastructure
const mid = LEVELS[Math.floor(LEVELS.length / 2)];
const Jm = junction[mid]; str(`Workshop_RL${mid}`, 50, '#A78BFA', sq(add(Jm.j, [SV[0], SV[1], 0], -35), 15, 7, stAng, mid), true, 'Underground workshop 30x14 m');
const J2 = junction[LEVELS[2]]; str(`Explosives_Magazine_RL${LEVELS[2]}`, 51, '#EF4444', sq(add(J2.j, [SV[0], SV[1], 0], -40), 6, 4, stAng, LEVELS[2]), true, 'Magazine — keep 60 m stand-off');
for (const li of [3, 9]) { const J = junction[LEVELS[li]]; if (J) str(`Refuge_Chamber_RL${LEVELS[li]}`, 52, '#34D399', sq(add(J.j, [SV[0], SV[1], 0], 18), 4, 2.5, stAng, LEVELS[li]), true, '16-person refuge chamber'); }
// surface
const lb = [[X0 + 40, Y0 + 40], [X0 + 1060, Y0 + 40], [X0 + 1060, Y0 + 1060], [X0 + 40, Y0 + 1060]].map(p => [p[0], p[1], dz(p[0], p[1]) + 1]);
str('Lease_boundary', 60, '#F87171', lb, true);
str('Portal_boxcut', 61, '#D1D5DB', sq(add(portal, awayDir, 25), 20, 12, Math.atan2(awayDir[1], awayDir[0]), 0).map(p => [p[0], p[1], dz(p[0], p[1])]), true, 'Portal box cut');
const rom = add(portal, awayDir, 220); str('ROM_pad', 62, '#FBBF24', sq(rom, 45, 30, stAng, 0).map(p => [p[0], p[1], dz(p[0], p[1])]), true, 'Run-of-mine pad');
const road = []; for (let k = 0; k <= 20; k++) { const p = [portal[0] + (rom[0] - portal[0]) * k / 20, portal[1] + (rom[1] - portal[1]) * k / 20]; road.push([p[0], p[1], dz(p[0], p[1]) + 0.5]); } str('Haul_road_portal_ROM', 63, '#9CA3AF', road);
const dumpC = add(rom, [SV[0], SV[1], 0], -160); str('Waste_dump_footprint', 64, '#F2B740', sq(dumpC, 70, 55, stAng, 0).map(p => [p[0], p[1], dz(p[0], p[1])]), true, 'Development waste dump');

// ---------------------------------------------------------------- drillholes: surface programme + underground fan
const db = P.db; db.fields = ['au_gpt', 'cu_pct']; const dirv = (az, dip) => [Math.sin(az * D2R) * Math.cos(dip * D2R), Math.cos(az * D2R) * Math.cos(dip * D2R), Math.sin(dip * D2R)];
const holeDefs = []; let hn = 0;
for (const u of [-200, -150, -100, -50, 0, 50, 100, 150, 200]) for (const w of [80, 180, 300, 430]) {
  if (Math.abs(u) === 200 && w === 430) continue; hn++;
  const T = [0, 1, 2].map(k => C[k] + SV[k] * (u + R.gauss() * 6) + DV[k] * (w + R.gauss() * 6)); const az = 315 + R.gauss() * 3, dip = -(65 + R.gauss() * 3); const t = dirv(az, dip);
  let L = (topo(T[0], T[1]) - T[2]) / -t[2]; for (let it = 0; it < 10; it++) { const q = [T[0] - t[0] * L, T[1] - t[1] * L, T[2] - t[2] * L]; L += (dz(q[0], q[1]) - q[2]) / -t[2]; }
  const c = [T[0] - t[0] * L, T[1] - t[1] * L]; holeDefs.push({ id: 'JN' + String(hn).padStart(3, '0'), x: c[0], y: c[1], z: dz(c[0], c[1]), az, dip, depth: Math.round(L + 35 + R() * 15), type: 'surface DD' });
}
// underground fan from a drill cuddy off the decline
{ let cud = null; for (const p of helix) if (!cud || Math.abs(p[2] - (LEVELS[9] + 4)) < Math.abs(cud[2] - (LEVELS[9] + 4))) cud = p;
  let k = 0; for (const u of [-120, -60, 0, 60]) for (const w of [560, 620]) { k++; const T = [0, 1, 2].map(i => C[i] + SV[i] * u + DV[i] * w); const d = [T[0] - cud[0], T[1] - cud[1], T[2] - cud[2]]; const L = Math.hypot(...d); const az = (Math.atan2(d[0], d[1]) / D2R + 360) % 360, dip = Math.asin(d[2] / L) / D2R; holeDefs.push({ id: 'UG' + String(k).padStart(3, '0'), x: cud[0], y: cud[1], z: cud[2], az, dip, depth: Math.round(L + 30), type: 'underground DD' }); } }
for (const h of holeDefs) {
  db.collars.push({ id: h.id, x: +h.x.toFixed(2), y: +h.y.toFixed(2), z: +h.z.toFixed(2), depth: h.depth });
  for (let at = 0; at <= h.depth; at += 30) db.surveys.push({ id: h.id, at, az: +((h.az + at * 0.02 + R.gauss() * 0.3 + 360) % 360).toFixed(1), dip: +(h.dip + at * (h.type === 'surface DD' ? 0.012 : 0.004) + R.gauss() * 0.2).toFixed(1) });
}
const svg = new Map(); db.surveys.forEach(s => { if (!svg.has(s.id)) svg.set(s.id, []); svg.get(s.id).push(s); });
for (const c of db.collars) {
  const st = TM.Drill.desurvey(c, svg.get(c.id)); let d = 0, cur = null;
  while (d < c.depth - 0.01) {
    const p = TM.Drill.posAt(st, d + 0.5), L = loc(p), near = Math.abs(L.v) < halfW(L.u, Math.max(L.w, 0)) + 10 && Math.abs(L.u) < 260;
    const len = Math.min(near ? 1 : 3, c.depth - d), m = TM.Drill.posAt(st, d + len / 2), sm = sample(m);
    db.assays.push({ id: c.id, from: +d.toFixed(2), to: +(d + len).toFixed(2), au_gpt: sm.au, cu_pct: sm.cu });
    if (cur && cur.code === sm.lith) cur.to = +(d + len).toFixed(2); else { cur = { id: c.id, from: +d.toFixed(2), to: +(d + len).toFixed(2), code: sm.lith }; db.lith.push(cur); }
    d += len;
  }
}
// planted QA/QC items for the validation demo
const hi = db.assays.filter(a => a.id === 'JN014' && a.au_gpt > 3); if (hi.length) hi[0].au_gpt = 86.4; // visible-gold nugget
const ov = db.assays.filter(a => a.id === 'JN021'); if (ov.length > 40) ov[40].from -= 0.5;
db.surveys = db.surveys.filter(s => s.id !== 'JN030'); // missing survey file for one hole
P.strings = S;
TM.setProject(P);

// ---------------------------------------------------------------- write files
const w = (n, s) => { fs.writeFileSync(path.join(OUT, n), s); console.log('wrote', path.relative(ROOT, path.join(OUT, n)), (fs.statSync(path.join(OUT, n)).size / 1024).toFixed(0) + ' kB'); };
w('collar.csv', IO.toCSV(['hole_id', 'east', 'north', 'rl', 'max_depth', 'hole_type'], db.collars.map(c => [c.id, c.x, c.y, c.z, c.depth, holeDefs.find(h => h.id === c.id).type])));
w('survey.csv', IO.toCSV(['hole_id', 'depth', 'azimuth', 'dip'], db.surveys.map(s => [s.id, s.at, s.az, s.dip])));
w('assay.csv', IO.toCSV(['hole_id', 'from', 'to', 'au_gpt', 'cu_pct'], db.assays.map(a => [a.id, a.from, a.to, a.au_gpt, a.cu_pct])));
w('lithology.csv', IO.toCSV(['hole_id', 'from', 'to', 'lith'], db.lith.map(l => [l.id, l.from, l.to, l.code])));
const tpp = P.surfaces[0].pts, rows = []; for (let i = 0; i < tpp.length; i += 3) rows.push([tpp[i], tpp[i + 1], tpp[i + 2]]); w('topography_points.csv', IO.toCSV(['x', 'y', 'z'], rows));
w('mine_layout.str', IO.writeSTR(S, 'jabal_nuhas_ug'));
w('mine_layout.dxf', IO.writeDXF({ strings: S, meshes: P.solids }));
w('stopes.dxf', IO.writeDXF({ meshes: P.solids.filter(s => s.name.startsWith('ST_')) }));
w('vein_wireframe.obj', IO.writeOBJ(P.solids[0]));
w('dev_face_pattern.csv', IO.toCSV(['hole', 'type', 'x_across_m', 'y_up_m', 'diameter_mm', 'length_m', 'emulsion_kg'], devHoles.map(h => [h.id, h.type, h.x, h.y, h.dia, h.len, h.charge])));
w('stope_ring_design.csv', IO.toCSV(['stope', 'ring', 'hole', 'collar_e', 'collar_n', 'collar_rl', 'toe_e', 'toe_n', 'toe_rl', 'length_m', 'anfo_kg'], ringHoles.map(h => [rich.name, h.ring, h.hole, ...r3(h.collar), ...r3(h.toe), +h.len.toFixed(2), h.charge])));
w('stope_list.csv', IO.toCSV(['stope', 'sublevel_top_rl', 'base_rl', 'strike_from_m', 'strike_to_m', 'design_volume_m3', 'design_tonnes'], stopes.map(s => { const v = TM.Solid.volume(s.mesh); return [s.name, s.top, s.base, s.u1, s.u2, Math.round(v), Math.round(v * P.settings.density)]; })));
w('levels_and_development.csv', IO.toCSV(['item', 'rl', 'length_m'], S.filter(s => s.strNo <= 3).map(s => [s.name, Math.round(s.pts[0][2]), +TM.Str.length(s).toFixed(1)])));
const json = TM.encode(P); fs.writeFileSync(path.join(OUT, 'JabalNuhas_UG.tmd'), zlib.gzipSync(json)); console.log('wrote JabalNuhas_UG.tmd', (fs.statSync(path.join(OUT, 'JabalNuhas_UG.tmd')).size / 1024).toFixed(0) + ' kB');
const devM = S.filter(s => [1, 2, 3].includes(s.strNo)).reduce((a, s) => a + TM.Str.length(s), 0);
const summary = { levels: LEVELS, decline_m: Math.round(declineLen), development_m: Math.round(devM), stopes: stopes.length, stope_tonnes: Math.round(stopes.reduce((a, s) => a + TM.Solid.volume(s.mesh), 0) * P.settings.density), holes: db.collars.length, assays: db.assays.length, portal: r3(portal), dev_face_holes: devHoles.length, ring_holes: ringHoles.length, ring_stope: rich && rich.name, vein_volume: Math.round(P.solids[0].volume) };
fs.writeFileSync(path.join(OUT, '_summary.json'), JSON.stringify(summary, null, 1)); console.log(JSON.stringify(summary));
