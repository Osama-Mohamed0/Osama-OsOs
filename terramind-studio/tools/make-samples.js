// Writes the demo project as import-ready sample files:  node terramind-studio/tools/make-samples.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ctx = { console, setTimeout, clearTimeout, Math, Date, JSON, Buffer, TextEncoder, TextDecoder }; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['vendor/delaunator.min.js', 'js/00-core.js', 'js/10-project.js', 'js/20-io.js', 'js/30-drillholes.js', 'js/35-surfaces.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
const TM = ctx.TM, P = TM.Drill.makeDemo(), IO = TM.IO, out = path.join(ROOT, 'samples');
const w = (n, s) => { fs.writeFileSync(path.join(out, n), s); console.log('wrote samples/' + n); };
w('demo_collar.csv', IO.toCSV(['hole_id', 'east', 'north', 'rl', 'max_depth'], P.db.collars.map(c => [c.id, c.x, c.y, c.z, c.depth])));
w('demo_survey.csv', IO.toCSV(['hole_id', 'depth', 'azimuth', 'dip'], P.db.surveys.map(s => [s.id, s.at, s.az, s.dip])));
w('demo_assay.csv', IO.toCSV(['hole_id', 'from', 'to', 'au_gpt'], P.db.assays.map(a => [a.id, a.from, a.to, a.au])));
w('demo_lith.csv', IO.toCSV(['hole_id', 'from', 'to', 'lith'], P.db.lith.map(l => [l.id, l.from, l.to, l.code])));
const t = P.surfaces[0].pts, rows = []; for (let i = 0; i < t.length; i += 3) rows.push([+t[i].toFixed(2), +t[i + 1].toFixed(2), t[i + 2]]);
w('demo_topo_points.csv', IO.toCSV(['x', 'y', 'z'], rows));
w('demo_strings.str', IO.writeSTR(P.strings, 'wadi_gold_demo'));
TM.setProject(P); const s = TM.Drill.suggestTopCut(); console.log('suggested top-cut', s.value, s.rule, s.nAbove);
