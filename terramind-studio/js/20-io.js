/* TerraMind Studio — file formats: CSV/XLSX tables, Surpac .str, DXF, OBJ, STL. */
(function (TM) {
  'use strict';
  const IO = TM.IO = {};

  // ---------------------------------------------------------------- CSV
  IO.parseCSV = function (text) {
    text = String(text).replace(/^﻿/, '');
    const first = text.split(/\r?\n/, 1)[0] || '';
    const delim = [',', ';', '\t', '|'].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
      if (c === '"') q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(x => x.trim() !== '')) rows.push(row); row = []; }
      else cell += c;
    }
    row.push(cell); if (row.some(x => x.trim() !== '')) rows.push(row);
    if (!rows.length) return { header: [], rows: [] };
    const header = rows.shift().map(h => h.trim());
    return { header, rows };
  };
  IO.toCSV = function (header, rows) {
    const q = v => { const s = v == null ? '' : (typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(+v.toFixed(6))) : String(v)); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    return [header.map(q).join(',')].concat(rows.map(r => r.map(q).join(','))).join('\r\n');
  };
  // Read a CSV or Excel file → {header, rows} (first sheet for Excel)
  IO.readTable = async function (file) {
    const name = file.name.toLowerCase();
    if (/\.(xlsx|xlsm|xls|ods)$/.test(name)) {
      if (typeof XLSX === 'undefined') throw new Error(TM.L('Excel reader not loaded (offline?) — save the sheet as CSV.', 'قارئ Excel غير محمّل — احفظ الورقة بصيغة CSV.'));
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const out = {};
      for (const sn of wb.SheetNames) {
        const arr = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' });
        const rows = arr.filter(r => r.some(c => String(c).trim() !== ''));
        if (rows.length) out[sn] = { header: rows.shift().map(h => String(h).trim()), rows: rows.map(r => r.map(c => String(c))) };
      }
      const names = Object.keys(out); if (!names.length) throw new Error('Empty workbook');
      const t = out[names[0]]; t.sheets = out; return t;
    }
    return IO.parseCSV(await file.text());
  };

  // Column auto-mapping: returns index for each wanted field given header names.
  const SYN = {
    hole: ['holeid', 'hole_id', 'hole', 'bhid', 'dhid', 'id', 'drillhole', 'well', 'رقم البئر', 'البئر'],
    x: ['x', 'east', 'easting', 'e', 'xcollar', 'x_collar', 'شرق'],
    y: ['y', 'north', 'northing', 'n', 'ycollar', 'y_collar', 'شمال'],
    z: ['z', 'rl', 'elev', 'elevation', 'zcollar', 'z_collar', 'منسوب'],
    depth: ['depth', 'max_depth', 'maxdepth', 'eoh', 'length', 'td', 'العمق'],
    at: ['at', 'depth', 'distance', 'survey_depth', 'from'],
    az: ['az', 'azi', 'azimuth', 'brg', 'bearing', 'السمت'],
    dip: ['dip', 'inclination', 'incl', 'الميل'],
    from: ['from', 'depth_from', 'mfrom', 'من'],
    to: ['to', 'depth_to', 'mto', 'إلى', 'الى'],
    code: ['lith', 'lithology', 'rock', 'rocktype', 'code', 'geology', 'الصخر'],
    grade: ['au', 'au_gpt', 'au_ppm', 'gold', 'grade', 'cu', 'cu_pct', 'ag', 'zn', 'pb', 'fe']
  };
  IO.autoMap = function (header, fields) {
    const H = header.map(h => h.toLowerCase().replace(/[\s.()]+/g, '_').replace(/_+$/, ''));
    const used = new Set(), map = {};
    for (const f of fields) {
      let idx = -1;
      for (const s of SYN[f] || [f]) { idx = H.findIndex((h, i) => !used.has(i) && (h === s || h.replace(/_/g, '') === s.replace(/_/g, ''))); if (idx >= 0) break; }
      if (idx < 0) for (const s of SYN[f] || [f]) { idx = H.findIndex((h, i) => !used.has(i) && h.startsWith(s)); if (idx >= 0) break; }
      map[f] = idx; if (idx >= 0) used.add(idx);
    }
    return map;
  };
  IO.num = v => { if (v == null) return NaN; const s = String(v).trim(); if (!s || /^(-|na|n\/a|null|nan|is|ns|lnr|bdl)$/i.test(s)) return NaN; if (s.startsWith('<')) return parseFloat(s.slice(1)) / 2; return parseFloat(s.replace(',', '.')); };

  // ---------------------------------------------------------------- Surpac .str
  // Format: header line, axis line, then "string, Y, X, Z, desc..." records; "0,0,0,0" ends a segment; "0,0,0,0,END" ends file.
  // ---------------------------------------------------------------- Surpac binary strings & DTMs (GEOVIA Surpac 6+)
  // Binary .str/.dtm: two text header lines, then records [int32 string-no (BE)][Y f64][X f64][Z f64][D-fields text \0];
  // string-no 0 separates strings, D = "END" ends the point section. A .dtm then carries [int32 type] records:
  // 1 = object (int32 id, text), 2 = trisolation (int32 id, text), 3 = triangle (int32 id, v1 v2 v3, n1 n2 n3, text).
  const u8 = b => b instanceof Uint8Array ? b : new Uint8Array(b.buffer ? b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) : b);
  IO.isSurpacBinary = function (buf, nh = 2) { const b = u8(buf); let n = 0, i = 0; for (; i < b.length && n < nh; i++) if (b[i] === 10) n++; const tail = b.subarray(i, i + 64); let bad = 0; for (const c of tail) if (c < 9 || (c > 13 && c < 32) || c > 126) bad++; return tail.length > 8 && bad > 4; };
  IO.surpacBinary = function (buf, nh = 2) {
    const b = u8(buf), dv = new DataView(b.buffer, b.byteOffset, b.byteLength); let i = 0, n = 0; while (i < b.length && n < nh) { if (b[i] === 10) n++; i++; }
    const header = new TextDecoder('latin1').decode(b.subarray(0, i)).split(/\r?\n/)[0]; const pts = []; let p = i;
    const cstr = () => { let e = p; while (e < b.length && b[e] !== 0) e++; const t = new TextDecoder('latin1').decode(b.subarray(p, e)); p = e + 1; return t; };
    if (p + 5 <= b.length && dv.getInt32(p) === 0 && b[p + 4] === 0) p += 5; // leading empty record after the axis line
    while (p + 28 <= b.length) {
      const sn = dv.getInt32(p); p += 4; const y = dv.getFloat64(p), x = dv.getFloat64(p + 8), z = dv.getFloat64(p + 16); p += 24; const d = cstr();
      if (sn === 0) { if (/^END/.test(d)) break; pts.push(null); continue; } pts.push({ sn, x, y, z, d: d.replace(/^,/, '') });
    }
    const tris = []; let objects = 0;
    while (p + 4 <= b.length) {
      const t = dv.getInt32(p); p += 4;
      if (t === 3 && p + 28 <= b.length) { tris.push([dv.getInt32(p + 4), dv.getInt32(p + 8), dv.getInt32(p + 12)]); p += 28; cstr(); }
      else if ((t === 1 || t === 2) && p + 4 <= b.length) { if (t === 1) objects++; p += 4; cstr(); }
      else break;
    }
    return { header, pts, tris, objects };
  };
  const recordsToStrings = (recs, name) => { const out = []; let cur = null; for (const r of recs) { if (!r) { cur = null; continue; } if (!cur || cur.strNo !== r.sn) { cur = { strNo: r.sn, pts: [], desc: r.d }; out.push(cur); } cur.pts.push([r.x, r.y, r.z]); } return out.map((s, k) => { const p = s.pts, closed = p.length > 2 && Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1], p[0][2] - p[p.length - 1][2]) < 1e-6; if (closed) p.pop(); return { id: TM.uid('str'), name: `${name || 'str'} #${s.strNo}${out.length > 1 ? '.' + (k + 1) : ''}`, strNo: s.strNo, closed, pts: p, color: '#F59E0B', desc: s.desc }; }); };
  // Text Surpac rows → the same record list (null = separator)
  IO.surpacText = function (text) { const lines = String(text).split(/\r?\n/), recs = [], tris = []; let header = lines[0] || '', inTri = false;
    for (let i = 2; i < lines.length; i++) { const L = lines[i].trim(); if (!L) continue; const c = L.split(',').map(q => q.trim()); if (/^(OBJECT|TRISOLATION)/i.test(c[0])) { inTri = true; continue; }
      if (inTri) { const v = c.map(Number); if (v.length >= 4 && v.every(isFinite)) tris.push([v[1], v[2], v[3]]); continue; }
      const sn = parseInt(c[0], 10); if (sn === 0) { if (/END/i.test(L)) inTri = true; recs.push(null); continue; }
      const y = parseFloat(c[1]), x = parseFloat(c[2]), z = parseFloat(c[3]); if ([x, y, z].every(isFinite)) recs.push({ sn, x, y, z, d: c.slice(4).join(',') }); }
    return { header, pts: recs, tris }; };
  // .dtm → mesh. A DTM whose points live in its .str (header "name.str,...", no points) needs that string file's records.
  IO.readDTM = function (input, name, strInput) {
    const parse = (q, nh) => typeof q === 'string' ? IO.surpacText(q) : (IO.isSurpacBinary(q, nh) ? IO.surpacBinary(q, nh) : IO.surpacText(new TextDecoder('latin1').decode(u8(q))));
    // vertex numbers count every record of the point list, string separators included (1-based)
    const d = parse(input, 1); let recs = d.pts; let vmax = 0; for (const t of d.tris) vmax = Math.max(vmax, t[0], t[1], t[2]);
    if (vmax > recs.length && strInput) recs = parse(strInput, 2).pts; // triangles index the companion .str records
    if (!d.tris.length) throw new Error(TM.L('No triangles in this DTM.', 'لا توجد مثلثات في ملف DTM.'));
    if (vmax > recs.length) throw new Error(TM.L(`This DTM keeps its points in ${d.header.split(',')[0]} — import both files together.`, `هذا الملف يأخذ نقاطه من ${d.header.split(',')[0]} — استورد الملفين معاً.`));
    const map = new Int32Array(recs.length).fill(-1), P = []; const use = new Set(); for (const t of d.tris) for (const v of t) use.add(v - 1);
    recs.forEach((r, k) => { if (r && use.has(k)) { map[k] = P.length / 3; P.push(r.x, r.y, r.z); } });
    const pos = new Float64Array(P); const idx = []; for (const t of d.tris) { const a = map[t[0] - 1], b = map[t[1] - 1], c = map[t[2] - 1]; if (a >= 0 && b >= 0 && c >= 0) idx.push(a, b, c); }
    return { name, pos, idx: new Uint32Array(idx), strFile: d.header.split(',')[0], triangles: idx.length / 3, points: pos.length / 3 };
  };
  IO.readSTR = function (input, name) {
    if (input && typeof input !== 'string') { if (IO.isSurpacBinary(input)) return recordsToStrings(IO.surpacBinary(input).pts, name); input = new TextDecoder('latin1').decode(u8(input)); }
    const text = input;
    const lines = String(text).split(/\r?\n/); const strings = []; let cur = null;
    for (let i = 2; i < lines.length; i++) {
      const L = lines[i].trim(); if (!L) continue; const c = L.split(',').map(s => s.trim());
      const sn = parseInt(c[0], 10);
      if (sn === 0) { if (cur && cur.pts.length) strings.push(cur); cur = null; if (/END/i.test(L)) break; continue; }
      const y = parseFloat(c[1]), x = parseFloat(c[2]), z = parseFloat(c[3]); if (![x, y, z].every(isFinite)) continue;
      if (!cur || cur.strNo !== sn) { if (cur && cur.pts.length) strings.push(cur); cur = { strNo: sn, pts: [], desc: c.slice(4).join(',') }; }
      cur.pts.push([x, y, z]);
    }
    if (cur && cur.pts.length) strings.push(cur);
    return strings.map((s, k) => {
      const p = s.pts, closed = p.length > 2 && Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1], p[0][2] - p[p.length - 1][2]) < 1e-6;
      if (closed) p.pop();
      return { id: TM.uid('str'), name: `${name || 'str'} #${s.strNo}${strings.length > 1 ? '.' + (k + 1) : ''}`, strNo: s.strNo, closed, pts: p, color: '#F59E0B', desc: s.desc };
    });
  };
  IO.writeSTR = function (strings, title = 'terramind') {
    const f = v => v.toFixed(3); const out = [`${title},${new Date().toISOString().slice(0, 10)},,TerraMind Studio`, '0,           0.000,           0.000,           0.000,           0.000,           0.000,           0.000'];
    for (const s of strings) {
      const n = s.strNo || 1; const pts = s.closed ? s.pts.concat([s.pts[0]]) : s.pts;
      for (const p of pts) out.push(`${n}, ${f(p[1])}, ${f(p[0])}, ${f(p[2])},${s.desc || ''}`);
      out.push('0, 0.000, 0.000, 0.000,');
    }
    out.push('0, 0.000, 0.000, 0.000, END'); return out.join('\r\n');
  };

  // ---------------------------------------------------------------- DXF (R12 ASCII)
  IO.writeDXF = function ({ strings = [], meshes = [] }) {
    const o = ['0', 'SECTION', '2', 'ENTITIES'];
    for (const s of strings) {
      o.push('0', 'POLYLINE', '8', (s.name || 'STRING').replace(/[^\w-]/g, '_'), '66', '1', '70', s.closed ? '9' : '8');
      for (const p of s.pts) o.push('0', 'VERTEX', '8', (s.name || 'STRING').replace(/[^\w-]/g, '_'), '10', p[0].toFixed(3), '20', p[1].toFixed(3), '30', p[2].toFixed(3), '70', '32');
      o.push('0', 'SEQEND');
    }
    for (const m of meshes) {
      const L = (m.name || 'MESH').replace(/[^\w-]/g, '_'), P = m.pos, I = m.idx;
      for (let t = 0; t < I.length; t += 3) {
        const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
        o.push('0', '3DFACE', '8', L, '10', P[a].toFixed(3), '20', P[a + 1].toFixed(3), '30', P[a + 2].toFixed(3), '11', P[b].toFixed(3), '21', P[b + 1].toFixed(3), '31', P[b + 2].toFixed(3), '12', P[c].toFixed(3), '22', P[c + 1].toFixed(3), '32', P[c + 2].toFixed(3), '13', P[c].toFixed(3), '23', P[c + 1].toFixed(3), '33', P[c + 2].toFixed(3));
      }
    }
    o.push('0', 'ENDSEC', '0', 'EOF'); return o.join('\r\n');
  };
  // Minimal DXF reader: POLYLINE/VERTEX, LWPOLYLINE, LINE, 3DFACE, POINT
  IO.readDXF = function (text) {
    const L = String(text).split(/\r?\n/); const pairs = []; for (let i = 0; i + 1 < L.length; i += 2) pairs.push([L[i].trim(), L[i + 1].trim()]);
    const strings = [], faces = [], points = []; let i = 0;
    const ent = () => { const e = { type: pairs[i][1], g: [] }; i++; while (i < pairs.length && pairs[i][0] !== '0') { e.g.push(pairs[i]); i++; } return e; };
    const val = (e, c) => { const p = e.g.find(g => g[0] === c); return p ? parseFloat(p[1]) : 0; };
    while (i < pairs.length) {
      if (pairs[i][0] !== '0') { i++; continue; }
      const t = pairs[i][1];
      if (t === 'POLYLINE') { const head = ent(); const pts = []; while (i < pairs.length && pairs[i][1] === 'VERTEX') { const v = ent(); pts.push([val(v, '10'), val(v, '20'), val(v, '30')]); } if (i < pairs.length && pairs[i][1] === 'SEQEND') ent(); const fl = val(head, '70'); const lay = (head.g.find(g => g[0] === '8') || [0, 'DXF'])[1]; if (fl & 64) { /* polyface mesh: skip */ } else if (pts.length > 1) strings.push({ name: lay, closed: !!(fl & 1), pts }); }
      else if (t === 'LWPOLYLINE') { const e = ent(); const xs = e.g.filter(g => g[0] === '10').map(g => +g[1]), ys = e.g.filter(g => g[0] === '20').map(g => +g[1]); const z = val(e, '38'); const lay = (e.g.find(g => g[0] === '8') || [0, 'DXF'])[1]; strings.push({ name: lay, closed: !!(val(e, '70') & 1), pts: xs.map((x, k) => [x, ys[k], z]) }); }
      else if (t === 'LINE') { const e = ent(); strings.push({ name: 'LINE', closed: false, pts: [[val(e, '10'), val(e, '20'), val(e, '30')], [val(e, '11'), val(e, '21'), val(e, '31')]] }); }
      else if (t === '3DFACE') { const e = ent(); faces.push([[val(e, '10'), val(e, '20'), val(e, '30')], [val(e, '11'), val(e, '21'), val(e, '31')], [val(e, '12'), val(e, '22'), val(e, '32')], [val(e, '13'), val(e, '23'), val(e, '33')]]); }
      else if (t === 'POINT') { const e = ent(); points.push([val(e, '10'), val(e, '20'), val(e, '30')]); }
      else i++;
    }
    return { strings, faces, points };
  };
  IO.facesToMesh = function (faces, name) {
    const pos = [], idx = [], key = new Map();
    const vid = p => { const k = p.map(v => v.toFixed(3)).join(','); let id = key.get(k); if (id == null) { id = pos.length / 3; pos.push(p[0], p[1], p[2]); key.set(k, id); } return id; };
    for (const f of faces) { const a = vid(f[0]), b = vid(f[1]), c = vid(f[2]), d = vid(f[3]); idx.push(a, b, c); if (d !== c) idx.push(a, c, d); }
    return { name, pos: new Float64Array(pos), idx: new Uint32Array(idx) };
  };

  // ---------------------------------------------------------------- OBJ / STL
  IO.writeOBJ = function (m) { const P = m.pos, I = m.idx, o = [`# TerraMind Studio — ${m.name || 'mesh'}`]; for (let i = 0; i < P.length; i += 3) o.push(`v ${P[i].toFixed(3)} ${P[i + 1].toFixed(3)} ${P[i + 2].toFixed(3)}`); for (let t = 0; t < I.length; t += 3) o.push(`f ${I[t] + 1} ${I[t + 1] + 1} ${I[t + 2] + 1}`); return o.join('\n'); };
  IO.readOBJ = function (text, name) { const pos = [], idx = []; for (const L of String(text).split(/\r?\n/)) { const c = L.trim().split(/\s+/); if (c[0] === 'v') pos.push(+c[1], +c[2], +c[3]); else if (c[0] === 'f') { const ids = c.slice(1).map(s => parseInt(s, 10) - 1); for (let k = 1; k + 1 < ids.length; k++) idx.push(ids[0], ids[k], ids[k + 1]); } } return { name, pos: new Float64Array(pos), idx: new Uint32Array(idx) }; };
  IO.writeSTL = function (m) {
    const P = m.pos, I = m.idx, o = [`solid ${m.name || 'mesh'}`];
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3; const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      o.push(` facet normal ${nx.toFixed(5)} ${ny.toFixed(5)} ${nz.toFixed(5)}`, '  outer loop', ...[a, b, c].map(k => `   vertex ${P[k].toFixed(3)} ${P[k + 1].toFixed(3)} ${P[k + 2].toFixed(3)}`), '  endloop', ' endfacet');
    }
    o.push(`endsolid ${m.name || 'mesh'}`); return o.join('\n');
  };

  // STL (ASCII or binary) → indexed mesh with merged vertices
  IO.readSTL = function (buf, name) {
    const u = new Uint8Array(buf); const faces = []; const head = new TextDecoder().decode(u.subarray(0, Math.min(u.length, 512)));
    const nBin = u.length >= 84 ? new DataView(u.buffer, u.byteOffset, u.byteLength).getUint32(80, true) : 0;
    if (u.length >= 84 && 84 + nBin * 50 === u.length) { const dv = new DataView(u.buffer, u.byteOffset, u.byteLength); for (let t = 0; t < nBin; t++) { const o = 84 + t * 50 + 12, v = k => [dv.getFloat32(o + k * 12, true), dv.getFloat32(o + k * 12 + 4, true), dv.getFloat32(o + k * 12 + 8, true)]; const a = v(0), b = v(1), c = v(2); faces.push([a, b, c, c]); } }
    else if (/^\s*solid/i.test(head)) { const vs = []; for (const m of new TextDecoder().decode(u).matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g)) vs.push([+m[1], +m[2], +m[3]]); for (let i = 0; i + 2 < vs.length; i += 3) faces.push([vs[i], vs[i + 1], vs[i + 2], vs[i + 2]]); }
    if (!faces.length) throw new Error('No triangles found in STL');
    return IO.facesToMesh(faces, name);
  };
  // Datamine ASCII export (CSV with XP, YP, ZP and optional PVALUE / PTN / PVALUE-grouped strings)
  IO.readDatamine = function (text, name) {
    const t = IO.parseCSV(text), H = t.header.map(h => String(h).trim().toUpperCase()); const c = k => H.indexOf(k);
    const ix = c('XP') >= 0 ? c('XP') : c('X'), iy = c('YP') >= 0 ? c('YP') : c('Y'), iz = c('ZP') >= 0 ? c('ZP') : c('Z'), ip = c('PVALUE'), it = c('PTN');
    if (ix < 0 || iy < 0 || iz < 0) throw new Error('Datamine file needs XP, YP, ZP columns');
    if (ip < 0) { const pts = []; for (const r of t.rows) { const v = [IO.num(r[ix]), IO.num(r[iy]), IO.num(r[iz])]; if (v.every(isFinite)) pts.push(...v); } return { strings: [], points: pts }; }
    const groups = new Map(); for (const r of t.rows) { const v = [IO.num(r[ix]), IO.num(r[iy]), IO.num(r[iz])]; if (!v.every(isFinite)) continue; const k = String(r[ip]).trim(); if (!groups.has(k)) groups.set(k, []); groups.get(k).push({ n: it >= 0 ? IO.num(r[it]) : groups.get(k).length, p: v }); }
    const strings = []; for (const [k, arr] of groups) { arr.sort((a, b) => a.n - b.n); const pts = arr.map(a => a.p); const f = pts[0], l = pts[pts.length - 1]; const closed = pts.length > 3 && Math.hypot(f[0] - l[0], f[1] - l[1], f[2] - l[2]) < 1e-3; if (closed) pts.pop(); if (pts.length >= 2) strings.push({ id: TM.uid('str'), name: `${name}_${k}`, strNo: +k || 1, closed, pts, color: '#22D3EE' }); }
    return { strings, points: [] };
  };
  // Surfer grids (.grd): Surfer 7 binary (DSRB), Surfer 6 binary (DSBB) or ASCII (DSAA) → XYZ points (blanked nodes skipped)
  IO.readSurferGrid = function (buf, step = 1) {
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf), dv = new DataView(b.buffer, b.byteOffset, b.byteLength), tag = String.fromCharCode(b[0], b[1], b[2], b[3]); const pts = [];
    const push = (nx, ny, x0, y0, dx, dy, get, blank) => { for (let j = 0; j < ny; j += step) for (let i = 0; i < nx; i += step) { const z = get(i, j); if (!isFinite(z) || Math.abs(z) >= blank) continue; pts.push(x0 + i * dx, y0 + j * dy, z); } };
    if (tag === 'DSRB') { let p = 0, ny = 0, nx = 0, x0, y0, dx, dy, blank = 1e30, data = -1;
      while (p + 8 <= b.length) { const id = String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]), size = dv.getInt32(p + 4, true); p += 8;
        if (id === 'GRID') { ny = dv.getInt32(p, true); nx = dv.getInt32(p + 4, true); x0 = dv.getFloat64(p + 8, true); y0 = dv.getFloat64(p + 16, true); dx = dv.getFloat64(p + 24, true); dy = dv.getFloat64(p + 32, true); blank = dv.getFloat64(p + 64, true) * 0.999; }
        if (id === 'DATA') { data = p; break; } p += size; }
      if (data < 0) throw new Error('Surfer grid without DATA section'); push(nx, ny, x0, y0, dx, dy, (i, j) => dv.getFloat64(data + 8 * (j * nx + i), true), blank); }
    else if (tag === 'DSBB') { const nx = dv.getInt16(4, true), ny = dv.getInt16(6, true), x0 = dv.getFloat64(8, true), x1 = dv.getFloat64(16, true), y0 = dv.getFloat64(24, true), y1 = dv.getFloat64(32, true); push(nx, ny, x0, y0, (x1 - x0) / (nx - 1), (y1 - y0) / (ny - 1), (i, j) => dv.getFloat32(56 + 4 * (j * nx + i), true), 1.7e38); }
    else if (tag === 'DSAA') { const v = new TextDecoder().decode(b).trim().split(/\s+/).slice(1).map(Number); const nx = v[0], ny = v[1], x0 = v[2], x1 = v[3], y0 = v[4], y1 = v[5]; push(nx, ny, x0, y0, (x1 - x0) / (nx - 1), (y1 - y0) / (ny - 1), (i, j) => v[8 + j * nx + i], 1.7e38); }
    else throw new Error('Unknown Surfer grid format');
    return pts;
  };
  IO.download = (text, filename, type = 'text/plain') => TM.saveBlob(new Blob([text], { type }), filename);
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
