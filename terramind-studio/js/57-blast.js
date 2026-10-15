/* TerraMind Studio — drill & blast: pattern layout inside a polygon, charging, powder factor, tie-up sequence. */
(function (TM) {
  'use strict';
  const B = TM.Blast = {};
  B.EXPLOSIVES = { ANFO: 0.82, Emulsion: 1.20, 'Heavy ANFO 50/50': 1.10, 'Packaged emulsion': 1.15 };
  // opts: {poly:[[x,y,z]], burden, spacing, pattern:'square'|'staggered', azimuth (row direction, deg), dip (deg from horizontal, 90 = vertical),
  //        benchH, subdrill, stemming, diameter (mm), explosive, density (rock t/m3), delayRow (ms), delayHole (ms)}
  B.pattern = function (o) {
    const poly = o.poly, zc = o.rl != null ? o.rl : poly.reduce((a, p) => a + p[2], 0) / poly.length;
    const az = (o.azimuth || 0) * TM.D2R, ux = Math.sin(az), uy = Math.cos(az), vx = uy, vy = -ux; // u = along row (spacing), v = across rows (burden)
    const c = TM.Str.centroid(poly); let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
    for (const p of poly) { const du = (p[0] - c[0]) * ux + (p[1] - c[1]) * uy, dv = (p[0] - c[0]) * vx + (p[1] - c[1]) * vy; umin = Math.min(umin, du); umax = Math.max(umax, du); vmin = Math.min(vmin, dv); vmax = Math.max(vmax, dv); }
    const holes = []; let row = 0;
    const dip = (o.dip == null ? 90 : o.dip) * TM.D2R, len = (o.benchH + o.subdrill) / Math.sin(dip); const dirH = Math.cos(dip); // horizontal component along burden direction (toward the free face, -v)
    for (let v = vmax - o.burden / 2; v >= vmin; v -= o.burden, row++) {
      const shift = o.pattern === 'staggered' && row % 2 ? o.spacing / 2 : 0; let col = 0;
      for (let u = umin + o.spacing / 2 + shift; u <= umax; u += o.spacing) {
        const x = c[0] + u * ux + v * vx, y = c[1] + u * uy + v * vy; if (!TM.Surf.pointInPoly(x, y, poly)) continue;
        const z = o.collarOnTopo ? (TM.topoZ(x, y) || zc) : zc; const ex = x - vx * len * dirH, ey = y - vy * len * dirH, ez = z - len * Math.sin(dip);
        holes.push({ id: `R${String(row + 1).padStart(2, '0')}H${String(++col).padStart(2, '0')}`, row: row + 1, col, x, y, z, ex, ey, ez, length: len });
      }
    }
    const r = (o.diameter / 1000) / 2, dens = B.EXPLOSIVES[o.explosive] || o.explDensity || 0.82; const chargeLen = Math.max(0, holes.length ? holes[0].length - o.stemming : 0); const kgHole = Math.PI * r * r * chargeLen * dens * 1000;
    const volHole = o.burden * o.spacing * o.benchH, tHole = volHole * (o.density || TM.P.settings.density);
    holes.forEach(h => { h.charge = kgHole; h.delay = (h.row - 1) * (o.delayRow || 67) + (h.col - 1) * (o.delayHole || 17); });
    const area = TM.Str.area(poly), volume = area * o.benchH, tonnes = volume * (o.density || TM.P.settings.density), kg = kgHole * holes.length;
    return { holes, summary: { holes: holes.length, rows: row, drill_m: holes.reduce((a, h) => a + h.length, 0), charge_kg_per_hole: kgHole, explosive_kg: kg, volume_bcm: volume, tonnes, powder_factor_kg_t: tonnes ? kg / tonnes : 0, powder_factor_kg_m3: volume ? kg / volume : 0, yield_t_per_m: holes.length ? tonnes / holes.reduce((a, h) => a + h.length, 0) : 0, t_per_hole: tHole, max_kg_per_delay: B.maxPerDelay(holes) } };
  };
  B.maxPerDelay = holes => { const m = new Map(); holes.forEach(h => m.set(h.delay, (m.get(h.delay) || 0) + h.charge)); let mx = 0; m.forEach(v => mx = Math.max(mx, v)); return mx; };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
