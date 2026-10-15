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
  IO.readSTR = function (text, name) {
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

  IO.download = (text, filename, type = 'text/plain') => TM.saveBlob(new Blob([text], { type }), filename);
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
