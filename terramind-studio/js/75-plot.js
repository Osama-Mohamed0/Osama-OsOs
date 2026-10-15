/* TerraMind Studio — 2D plan & section views, section digitising and plot sheets (SVG / PNG / print) with title block. */
(function (TM) {
  'use strict';
  const PL = TM.Plot = {}; const L = (a, b) => TM.L(a, b), fmt = TM.fmt, esc = TM.esc;
  const st = PL.state = { planSlab: 0, mode: 'section', axis: 'x', pos: null, rl: null, width: 10, scale: 'fit', layers: { topo: true, holes: true, strings: true, solids: true, bm: true, pit: true }, title: '', author: '', digit: null, view: null };
  const PAPER = { w: 1587, h: 1123 }, M = { l: 70, r: 40, t: 50, b: 150 };

  // geometry helpers ------------------------------------------------------
  function frame() {
    const e = TM.extents(); if (st.pos == null) st.pos = Math.round(st.axis === 'x' ? e.cx : e.cy); if (st.rl == null) st.rl = Math.round((e.z0 + e.z1) / 2);
    if (st.mode === 'plan') return { kind: 'plan', toUV: p => [p[0], p[1]], off: p => p[2] - st.rl, range: [e.x0, e.x1, e.y0, e.y1], labels: ['E', 'N'] };
    const ax = st.axis; const toUV = ax === 'x' ? p => [p[1], p[2]] : p => [p[0], p[2]]; const off = ax === 'x' ? p => p[0] - st.pos : p => p[1] - st.pos;
    return { kind: 'section', toUV, off, range: ax === 'x' ? [e.y0, e.y1, e.z0 - 10, e.z1 + 10] : [e.x0, e.x1, e.z0 - 10, e.z1 + 10], labels: [ax === 'x' ? 'N' : 'E', 'RL'] };
  }
  function mapper(fr) {
    const W = PAPER.w - M.l - M.r, H = PAPER.h - M.t - M.b; let [u0, u1, v0, v1] = st.view || fr.range;
    let k; if (st.scale === 'fit') k = Math.min(W / (u1 - u0), H / (v1 - v0)); else k = 1000 / +st.scale * 96 / 25.4;
    const cu = (u0 + u1) / 2, cv = (v0 + v1) / 2; u0 = cu - W / 2 / k; u1 = cu + W / 2 / k; v0 = cv - H / 2 / k; v1 = cv + H / 2 / k;
    const X = u => M.l + (u - u0) * k, Y = v => M.t + H - (v - v0) * k; const inv = (x, y) => [u0 + (x - M.l) / k, v0 + (M.t + H - y) / k];
    return { X, Y, inv, k, u0, u1, v0, v1, W, H };
  }
  // slice a triangle mesh with the current plane → segments in (u,v)
  function sliceMesh(pos, idx, fr) {
    const segs = []; const P = i => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
    for (let t = 0; t < idx.length; t += 3) { const a = P(idx[t]), b = P(idx[t + 1]), c = P(idx[t + 2]); const da = fr.off(a), db = fr.off(b), dc = fr.off(c); const pts = []; for (const [p, q, dp, dq] of [[a, b, da, db], [b, c, db, dc], [c, a, dc, da]]) if ((dp > 0) !== (dq > 0)) { const s = dp / (dp - dq); pts.push(fr.toUV([p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s, p[2] + (q[2] - p[2]) * s])); } if (pts.length === 2) segs.push(pts); }
    return segs;
  }

  PL.svg = function () {
    const P = TM.P, s = P.settings, fr = frame(), m = mapper(fr), g = [], line = (pts, style) => pts.length > 1 ? `<polyline points="${pts.map(p => m.X(p[0]).toFixed(1) + ',' + m.Y(p[1]).toFixed(1)).join(' ')}" style="${style}"/>` : '';
    const inView = p => p[0] >= m.u0 && p[0] <= m.u1 && p[1] >= m.v0 && p[1] <= m.v1;
    g.push(`<rect x="0" y="0" width="${PAPER.w}" height="${PAPER.h}" fill="#fff"/><defs><clipPath id="cp"><rect x="${M.l}" y="${M.t}" width="${m.W}" height="${m.H}"/></clipPath></defs>`);
    // grid
    const step = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find(v => v * m.k > 70) || 1000; let gr = '';
    for (let u = Math.ceil(m.u0 / step) * step; u <= m.u1; u += step) gr += `<line x1="${m.X(u)}" x2="${m.X(u)}" y1="${M.t}" y2="${M.t + m.H}" stroke="#e3e7ee"/><text x="${m.X(u)}" y="${M.t + m.H + 14}" font-size="10" text-anchor="middle" fill="#555">${fr.labels[0]} ${fmt(u)}</text>`;
    for (let v = Math.ceil(m.v0 / step) * step; v <= m.v1; v += step) gr += `<line x1="${M.l}" x2="${M.l + m.W}" y1="${m.Y(v)}" y2="${m.Y(v)}" stroke="#e3e7ee"/><text x="${M.l - 6}" y="${m.Y(v) + 3}" font-size="10" text-anchor="end" fill="#555">${fr.labels[1]} ${fmt(v)}</text>`;
    g.push(gr); g.push('<g clip-path="url(#cp)">');
    const L_ = st.layers;
    // block model
    if (L_.bm && P.bm) { const bm = P.bm, d = bm.def; let r = '';
      for (let id = 0; id < bm.N; id++) { const gv = bm.grade[id]; if (!(gv >= s.cutoff)) continue; const i = id % d.nx, j = Math.floor(id / d.nx) % d.ny, k = Math.floor(id / (d.nx * d.ny)); const c = [d.x0 + (i + .5) * d.dx, d.y0 + (j + .5) * d.dy, d.z0 + (k + .5) * d.dz];
        const half = fr.kind === 'plan' ? d.dz / 2 : (st.axis === 'x' ? d.dx / 2 : d.dy / 2); if (Math.abs(fr.off(c)) > half) continue; const uv = fr.toUV(c); const du = fr.kind === 'plan' ? d.dx : (st.axis === 'x' ? d.dy : d.dx), dv = fr.kind === 'plan' ? d.dy : d.dz; if (!inView(uv)) continue;
        const col = TM.VP.cmap(gv).map(x => Math.round(x * 255)); r += `<rect x="${m.X(uv[0] - du / 2).toFixed(1)}" y="${m.Y(uv[1] + dv / 2).toFixed(1)}" width="${(du * m.k).toFixed(1)}" height="${(dv * m.k).toFixed(1)}" fill="rgb(${col})" fill-opacity=".75"/>`; }
      g.push(r); }
    // topography
    if (L_.topo && TM.rt.tin) {
      if (fr.kind === 'section') { const pts = []; for (let u = m.u0; u <= m.u1; u += Math.max(1, 2 / m.k)) { const x = st.axis === 'x' ? st.pos : u, y = st.axis === 'x' ? u : st.pos, z = TM.topoZ(x, y); if (isFinite(z)) pts.push([u, z]); } g.push(line(pts, 'fill:none;stroke:#6b5a2e;stroke-width:1.6')); }
      else { const c = TM.Surf.contours(TM.rt.tin, step >= 50 ? 10 : 5); for (const lv of c) for (const l of lv.lines) g.push(line(l.map(p => [p[0], p[1]]), `fill:none;stroke:${Math.round(lv.z) % 25 === 0 ? '#9c8b64' : '#cfc6ad'};stroke-width:${Math.round(lv.z) % 25 === 0 ? 1 : .6}`)); }
    }
    // pit: LG shell floor + design surface
    if (L_.pit) {
      const prof = (fn, style) => { if (fr.kind === 'section') { const pts = []; for (let u = m.u0; u <= m.u1; u += Math.max(1, 2 / m.k)) { const x = st.axis === 'x' ? st.pos : u, y = st.axis === 'x' ? u : st.pos, z = fn(x, y), t = TM.topoZ(x, y); if (isFinite(z) && isFinite(t) && z < t - 0.05) pts.push([u, z]); else if (pts.length) { g.push(line(pts, style)); pts.length = 0; } } g.push(line(pts, style)); } };
      if (TM.Pit.selected()) prof((x, y) => TM.Pit.floorAt(x, y), 'fill:none;stroke:#2563eb;stroke-width:1.4;stroke-dasharray:6 3');
      if (P.design) { prof((x, y) => TM.Design.zAt(P.design, x, y), 'fill:none;stroke:#0b6b4a;stroke-width:1.8'); if (fr.kind === 'plan') for (const ds of P.design.strings) g.push(line(ds.pts.map(p => [p[0], p[1]]), `fill:none;stroke:${ds.kind === 'ramp' ? '#c2410c' : '#0b6b4a'};stroke-width:${ds.kind === 'toe' ? 1.2 : .8}`)); }
    }
    // solids
    if (L_.solids) for (const so of P.solids) { if (TM.VP.hidden.has(so.id)) continue; const segs = sliceMesh(so.pos, so.idx, fr); g.push(`<g style="stroke:${so.color || '#10B981'};stroke-width:1.6">` + segs.map(sg => `<line x1="${m.X(sg[0][0]).toFixed(1)}" y1="${m.Y(sg[0][1]).toFixed(1)}" x2="${m.X(sg[1][0]).toFixed(1)}" y2="${m.Y(sg[1][1]).toFixed(1)}"/>`).join('') + '</g>'); }
    // strings (plan: all; section: parts within ±width)
    if (L_.strings) for (const so of P.strings) { if (TM.VP.hidden.has(so.id)) continue; const R = TM.Str.ring(so); if (fr.kind === 'plan' && st.planSlab > 0) { let cur = []; for (const p of R) { if (Math.abs(p[2] - st.rl) <= st.planSlab) cur.push([p[0], p[1]]); else { g.push(line(cur, `fill:none;stroke:${so.color || '#d97706'};stroke-width:1.3`)); cur = []; } } g.push(line(cur, `fill:none;stroke:${so.color || '#d97706'};stroke-width:1.3`)); } else if (fr.kind === 'plan') g.push(line(R.map(p => [p[0], p[1]]), `fill:none;stroke:${so.color || '#d97706'};stroke-width:1.1`)); else { let cur = []; for (const p of R) { if (Math.abs(fr.off(p)) <= st.width) cur.push(fr.toUV(p)); else { g.push(line(cur, `fill:none;stroke:${so.color || '#d97706'};stroke-width:1.1`)); cur = []; } } g.push(line(cur, `fill:none;stroke:${so.color || '#d97706'};stroke-width:1.1`)); } }
    // drillholes
    if (L_.holes) for (const h of TM.rt.holes) {
      if (fr.kind === 'plan') { const c = [h.collar.x, h.collar.y]; g.push(line(h.st.map(p => [p.x, p.y]), 'fill:none;stroke:#94a3b8;stroke-width:.8') + `<circle cx="${m.X(c[0])}" cy="${m.Y(c[1])}" r="3" fill="#111"/><text x="${m.X(c[0]) + 5}" y="${m.Y(c[1]) - 4}" font-size="9" fill="#111">${esc(h.id)}</text>`); continue; }
      let any = false; for (const sm of h.samples) { const a = TM.Drill.posAt(h.st, sm.from), b = TM.Drill.posAt(h.st, sm.to); if (Math.abs(fr.off(a)) > st.width && Math.abs(fr.off(b)) > st.width) continue; any = true; const gv = s.topCut ? Math.min(sm.g, s.topCut) : sm.g; const col = gv >= 0.15 ? `rgb(${TM.VP.cmap(gv).map(x => Math.round(x * 255))})` : '#9aa3b2'; const ua = fr.toUV(a), ub = fr.toUV(b); g.push(`<line x1="${m.X(ua[0]).toFixed(1)}" y1="${m.Y(ua[1]).toFixed(1)}" x2="${m.X(ub[0]).toFixed(1)}" y2="${m.Y(ub[1]).toFixed(1)}" stroke="${col}" stroke-width="4"/>`); }
      if (any) { const c = fr.toUV([h.collar.x, h.collar.y, h.collar.z]); g.push(`<text x="${m.X(c[0])}" y="${m.Y(c[1]) - 6}" font-size="10" text-anchor="middle" fill="#111">${esc(h.id)}</text>`); }
    }
    if (st.digit && st.digit.length) g.push(line(st.digit.map(p => fr.toUV(p)), 'fill:none;stroke:#dc2626;stroke-width:1.6;stroke-dasharray:4 2') + st.digit.map(p => { const q = fr.toUV(p); return `<circle cx="${m.X(q[0])}" cy="${m.Y(q[1])}" r="3.5" fill="#dc2626"/>`; }).join(''));
    g.push('</g>');
    // frame, north arrow, scale bar, title block
    g.push(`<rect x="${M.l}" y="${M.t}" width="${m.W}" height="${m.H}" fill="none" stroke="#111" stroke-width="1.2"/>`);
    if (fr.kind === 'plan') g.push(`<g transform="translate(${M.l + m.W - 40},${M.t + 50})"><polygon points="0,-30 9,8 0,2 -9,8" fill="#111"/><text y="-36" font-size="13" text-anchor="middle" font-weight="600">N</text></g>`);
    const sb = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find(v => v * m.k > 120) || 100; g.push(`<g transform="translate(${M.l},${PAPER.h - M.b + 34})"><rect width="${sb * m.k / 2}" height="6" fill="#111"/><rect x="${sb * m.k / 2}" width="${sb * m.k / 2}" height="6" fill="#fff" stroke="#111"/><text y="20" font-size="10">0</text><text x="${sb * m.k}" y="20" font-size="10" text-anchor="middle">${sb} m</text></g>`);
    const scaleTxt = st.scale === 'fit' ? `1:${fmt(Math.round(1000 * 96 / 25.4 / m.k))}` : `1:${fmt(+st.scale)}`;
    const title = st.title || (fr.kind === 'plan' ? `Plan at RL ${fmt(st.rl)}${st.planSlab > 0 ? ` (±${st.planSlab} m)` : ''}` : `Section ${st.axis === 'x' ? 'E' : 'N'} ${fmt(st.pos)} (±${st.width} m)`);
    const tb = { x: PAPER.w - 520, y: PAPER.h - M.b + 20, w: 480, h: 112 };
    g.push(`<g font-family="Arial,Helvetica,sans-serif"><rect x="${tb.x}" y="${tb.y}" width="${tb.w}" height="${tb.h}" fill="#fff" stroke="#111"/><line x1="${tb.x}" x2="${tb.x + tb.w}" y1="${tb.y + 38}" y2="${tb.y + 38}" stroke="#111"/><line x1="${tb.x + 300}" x2="${tb.x + 300}" y1="${tb.y + 38}" y2="${tb.y + tb.h}" stroke="#111"/>
      <text x="${tb.x + 10}" y="${tb.y + 25}" font-size="17" font-weight="700">${esc(title)}</text>
      <text x="${tb.x + 10}" y="${tb.y + 58}" font-size="11">${L('Project', 'المشروع')}: ${esc(P.name)}</text><text x="${tb.x + 10}" y="${tb.y + 76}" font-size="11">${L('Drawn by', 'الرسام')}: ${esc(st.author || '—')}</text><text x="${tb.x + 10}" y="${tb.y + 94}" font-size="11">${esc(P.crs)} · COG ${fmt(s.cutoff, 2)} ${esc(s.gradeUnit)}</text>
      <text x="${tb.x + 310}" y="${tb.y + 58}" font-size="11">${L('Scale', 'المقياس')} ${scaleTxt} (A3)</text><text x="${tb.x + 310}" y="${tb.y + 76}" font-size="11">${new Date().toISOString().slice(0, 10)}</text><text x="${tb.x + 310}" y="${tb.y + 94}" font-size="11">TerraMind Studio ${TM.version}</text></g>`);
    // legend
    g.push(`<g transform="translate(${M.l + 260},${PAPER.h - M.b + 30})" font-size="10" font-family="Arial"><text font-weight="600">${L('Legend', 'المفتاح')}</text>${[['#6b5a2e', L('Topography', 'السطح')], ['#0b6b4a', L('Pit design', 'تصميم الحفرة')], ['#2563eb', L('Optimised shell', 'الغلاف الأمثل')], ['#10B981', L('Solids', 'المجسمات')], ['#d97706', L('Strings', 'الخطوط')]].map((r, i) => `<line x1="${(i % 3) * 120}" x2="${(i % 3) * 120 + 22}" y1="${18 + Math.floor(i / 3) * 16}" y2="${18 + Math.floor(i / 3) * 16}" stroke="${r[0]}" stroke-width="2"/><text x="${(i % 3) * 120 + 28}" y="${21 + Math.floor(i / 3) * 16}">${esc(r[1])}</text>`).join('')}</g>`);
    PL.m = m; PL.fr = fr;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAPER.w} ${PAPER.h}" width="${PAPER.w}" height="${PAPER.h}" font-family="Arial,Helvetica,sans-serif">${g.join('')}</svg>`;
  };

  // window ------------------------------------------------------------------
  PL.open = function () {
    let el = document.querySelector('#plotWin');
    if (!el) { el = document.createElement('div'); el.id = 'plotWin'; el.className = 'plotwin'; document.body.appendChild(el); }
    el.hidden = false; frame(); PL.renderUI(); PL.draw();
  };
  PL.close = () => { const el = document.querySelector('#plotWin'); if (el) el.hidden = true; };
  PL.renderUI = function () {
    const el = document.querySelector('#plotWin'); const lay = Object.keys(st.layers);
    el.innerHTML = `<div class="plot-bar">
      <b>${L('Plan & section', 'المسقط والمقطع')}</b>
      <div class="seg" id="plMode"><button type="button" data-v="plan" aria-pressed="${st.mode === 'plan'}">${L('Plan', 'مسقط')}</button><button type="button" data-v="section" aria-pressed="${st.mode === 'section'}">${L('Section', 'مقطع')}</button></div>
      ${st.mode === 'section' ? `<div class="seg" id="plAxis"><button type="button" data-v="x" aria-pressed="${st.axis === 'x'}">E =</button><button type="button" data-v="y" aria-pressed="${st.axis === 'y'}">N =</button></div><input id="plPos" type="number" step="5" value="${st.pos ?? ''}" title="position"><label>±<input id="plW" type="number" step="5" value="${st.width}"> m</label><button class="btn" type="button" id="plPrev">◀</button><button class="btn" type="button" id="plNext">▶</button>` : `<label>RL <input id="plRL" type="number" step="5" value="${st.rl ?? ''}"></label><label title="0 = all strings">±<input id="plSlab" type="number" step="5" value="${st.planSlab}"> m</label>`}
      <label>${L('Scale', 'المقياس')} <select id="plScale">${['fit', 500, 1000, 2000, 2500, 5000, 10000].map(v => `<option value="${v}" ${String(st.scale) === String(v) ? 'selected' : ''}>${v === 'fit' ? L('Fit', 'ملاءمة') : '1:' + v}</option>`).join('')}</select></label>
      ${lay.map(k => `<label class="toggle"><input type="checkbox" data-layer="${k}" ${st.layers[k] ? 'checked' : ''}>${k}</label>`).join('')}
      <input id="plTitle" placeholder="${L('Sheet title', 'عنوان اللوحة')}" value="${esc(st.title)}"><input id="plAuthor" placeholder="${L('Drawn by', 'الرسام')}" value="${esc(st.author)}" style="width:110px">
      <button class="btn ${st.digit ? 'primary' : ''}" type="button" id="plDig">${st.digit ? L('Finish string', 'إنهاء الخط') : L('Digitize', 'رسم')}</button>
      <button class="btn" type="button" id="plSvg">SVG</button><button class="btn" type="button" id="plPng">PNG</button><button class="btn" type="button" id="plPrint">${L('Print / PDF', 'طباعة / PDF')}</button><button class="btn" type="button" id="plReset">${L('Reset view', 'إعادة العرض')}</button><button class="icon-btn" type="button" id="plClose" aria-label="Close">✕</button></div>
      <div class="plot-canvas" id="plCanvas"></div><div class="plot-status" id="plStatus"></div>`;
    const $ = s => el.querySelector(s);
    el.querySelectorAll('#plMode button').forEach(b => b.onclick = () => { st.mode = b.dataset.v; st.view = null; PL.renderUI(); PL.draw(); });
    el.querySelectorAll('#plAxis button').forEach(b => b.onclick = () => { st.axis = b.dataset.v; st.pos = null; st.view = null; PL.renderUI(); PL.draw(); });
    const num = (id, k) => { const i = $(id); if (i) i.onchange = () => { st[k] = +i.value; st.view = null; PL.draw(); }; };
    num('#plPos', 'pos'); num('#plW', 'width'); num('#plRL', 'rl'); num('#plSlab', 'planSlab');
    if ($('#plPrev')) { $('#plPrev').onclick = () => { st.pos -= st.width * 2; $('#plPos').value = st.pos; PL.draw(); }; $('#plNext').onclick = () => { st.pos += st.width * 2; $('#plPos').value = st.pos; PL.draw(); }; }
    $('#plScale').onchange = e => { st.scale = e.target.value; PL.draw(); };
    el.querySelectorAll('[data-layer]').forEach(c => c.onchange = () => { st.layers[c.dataset.layer] = c.checked; PL.draw(); });
    $('#plTitle').onchange = e => { st.title = e.target.value; PL.draw(); }; $('#plAuthor').onchange = e => { st.author = e.target.value; PL.draw(); };
    $('#plDig').onclick = () => { if (st.digit) { if (st.digit.length > 1) { TM.Undo.push('Digitize'); TM.P.strings.push({ id: TM.uid('str'), name: (st.mode === 'plan' ? 'Plan_RL' + st.rl : `Sec_${st.axis === 'x' ? 'E' : 'N'}${st.pos}`) + '_' + (TM.P.strings.length + 1), closed: false, pts: st.digit, color: '#DC2626', strNo: 50 }); TM.touch('strings'); TM.UI.toast(L(`String with ${st.digit.length} points added`, `أُضيف خط من ${st.digit.length} نقطة`)); } st.digit = null; } else st.digit = []; PL.renderUI(); PL.draw(); };
    $('#plSvg').onclick = () => TM.IO.download(PL.svg(), `${(st.title || 'plot').replace(/\s+/g, '_')}.svg`, 'image/svg+xml');
    $('#plPng').onclick = () => PL.png();
    $('#plPrint').onclick = () => { const pa = document.querySelector('#printArea'); pa.innerHTML = `<style>@page{size:A3 landscape;margin:8mm}</style>` + PL.svg().replace('<svg ', '<svg style="width:100%;height:auto" '); document.documentElement.classList.add('printing'); setTimeout(() => { window.print(); setTimeout(() => document.documentElement.classList.remove('printing'), 500); }, 50); };
    $('#plReset').onclick = () => { st.view = null; PL.draw(); };
    $('#plClose').onclick = PL.close;
    // pan / zoom / digitize
    const cv = $('#plCanvas'); let drag = null;
    const toPaper = e => { const svg = cv.querySelector('svg'); const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * PAPER.w, (e.clientY - r.top) / r.height * PAPER.h]; };
    cv.onwheel = e => { e.preventDefault(); const m = PL.m; const [px, py] = toPaper(e); const [u, v] = m.inv(px, py); const f = e.deltaY > 0 ? 1.25 : 0.8; st.scale = 'fit'; st.view = [u - (u - m.u0) * f, u + (m.u1 - u) * f, v - (v - m.v0) * f, v + (m.v1 - v) * f]; PL.draw(); };
    cv.onpointerdown = e => { drag = { x: e.clientX, y: e.clientY, view: [PL.m.u0, PL.m.u1, PL.m.v0, PL.m.v1], moved: false }; };
    cv.onpointermove = e => { const [px, py] = toPaper(e); const [u, v] = PL.m.inv(px, py); $('#plStatus').textContent = `${PL.fr.labels[0]} ${fmt(u, 2)}  ${PL.fr.labels[1]} ${fmt(v, 2)}`; if (!drag) return; const svg = cv.querySelector('svg').getBoundingClientRect(); const du = (e.clientX - drag.x) / svg.width * PAPER.w / PL.m.k, dv = (e.clientY - drag.y) / svg.height * PAPER.h / PL.m.k; if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) { drag.moved = true; st.scale = 'fit'; st.view = [drag.view[0] - du, drag.view[1] - du, drag.view[2] + dv, drag.view[3] + dv]; PL.draw(); } };
    cv.onpointerup = e => { const moved = drag && drag.moved; drag = null; if (moved || !st.digit) return; const [px, py] = toPaper(e); const [u, v] = PL.m.inv(px, py); const p = st.mode === 'plan' ? [u, v, st.rl] : (st.axis === 'x' ? [st.pos, u, v] : [u, st.pos, v]); st.digit.push(p.map(x => +x.toFixed(3))); PL.draw(); };
  };
  PL.draw = function () { const cv = document.querySelector('#plCanvas'); if (!cv) return; cv.innerHTML = PL.svg(); };
  PL.png = function () { const svg = PL.svg(); const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = PAPER.w * 2; c.height = PAPER.h * 2; const g = c.getContext('2d'); g.scale(2, 2); g.drawImage(img, 0, 0); c.toBlob(b => TM.saveBlob(b, `${(st.title || 'plot').replace(/\s+/g, '_')}.png`)); }; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
