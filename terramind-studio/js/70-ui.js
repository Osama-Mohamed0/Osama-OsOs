/* TerraMind Studio — UI kit: modal/form/progress/table, SVG charts, layer tree, KPI bar, HUD, inspector. */
(function (TM) {
  'use strict';
  const UI = TM.UI = {}; const $ = s => document.querySelector(s); UI.$ = $;
  const L = TM.L, fmt = TM.fmt, esc = TM.esc;
  UI.icons = () => { try { window.lucide && lucide.createIcons({ attrs: { 'stroke-width': 1.8 } }); } catch (e) { } };

  // ---------------------------------------------------------------- toast / modal / progress
  let toastT = 0;
  UI.toast = function (msg, kind = '') { const el = $('#toast'); el.textContent = msg; el.className = 'toast ' + kind; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 4200); };
  // Modal: sticky header (drag handle) · scrollable body · sticky footer (actions). Draggable, resizable from any edge/corner,
  // position and size remembered per dialog title for the session. Esc closes, Enter runs the primary action.
  const geo = new Map(); let modalKey = null, modalPrimary = null;
  UI.modal = function ({ title, body, actions = [], wide = false, onClose, hint = '' }) {
    const m = $('#modal'), sh = m.querySelector('.sheet'); $('#modalTitle').textContent = title; const b = $('#modalBody'); b.innerHTML = ''; if (typeof body === 'string') b.innerHTML = body; else if (body) b.appendChild(body);
    sh.classList.toggle('wide', !!wide); sh.classList.remove('max');
    const A = $('#modalActions'); A.innerHTML = ''; modalPrimary = null;
    actions.forEach(a => { const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn ' + (a.primary ? 'primary' : ''); btn.innerHTML = (a.icon ? `<i data-lucide="${a.icon}"></i>` : '') + esc(a.label); btn.onclick = () => a.fn(btn); A.appendChild(btn); if (a.primary && !modalPrimary) modalPrimary = btn; });
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn'; cancel.textContent = actions.length ? L('Cancel', 'إلغاء') : L('Close', 'إغلاق'); cancel.onclick = () => UI.closeModal(); if (!actions.some(a => /cancel|إلغاء/i.test(a.label))) A.insertBefore(cancel, A.firstChild);
    $('#modalHint').textContent = hint || (modalPrimary ? L('Enter = ', 'Enter = ') + modalPrimary.textContent.trim() + ' · Esc' : 'Esc');
    modalKey = (wide ? 'w:' : 'n:') + title; const g = geo.get(modalKey);
    sh.style.left = sh.style.top = sh.style.width = sh.style.height = sh.style.maxHeight = ''; sh.classList.toggle('placed', !!g);
    if (g) { sh.style.left = g.x + 'px'; sh.style.top = g.y + 'px'; if (g.w) { sh.style.width = g.w + 'px'; sh.style.height = g.h + 'px'; sh.style.maxHeight = 'none'; } UI.keepOnScreen(sh); }
    m.hidden = false; b.scrollTop = 0; UI._onClose = onClose; UI.icons(); setTimeout(() => { const f = b.querySelector('input:not([type=hidden]),select,textarea'); (f || b).focus({ preventScroll: true }); }, 30);
    return b;
  };
  UI.closeModal = function (silent) { $('#modal').hidden = true; const f = UI._onClose; UI._onClose = null; if (f && silent !== true) f(); };
  UI.modalOpen = () => !$('#modal').hidden;
  UI.modalKey = function (e) {
    if (!UI.modalOpen()) return false;
    if (e.key === 'Escape') { e.preventDefault(); UI.closeModal(); return true; }
    if (e.key === 'Enter' && !e.shiftKey && modalPrimary) { const t = e.target; if (/textarea/i.test(t.tagName) || (t.tagName === 'SELECT' && t.multiple) || t.tagName === 'BUTTON' || t.closest('.composer')) return false; e.preventDefault(); modalPrimary.click(); return true; }
    return false;
  };
  UI.keepOnScreen = function (sh) { const r = sh.getBoundingClientRect(), W = innerWidth, H = innerHeight; let x = Math.min(Math.max(r.left, 8 - r.width + 120), W - 120), y = Math.min(Math.max(r.top, 0), H - 48); sh.style.left = x + 'px'; sh.style.top = y + 'px'; };
  UI.bindModal = function () {
    const m = $('#modal'), sh = m.querySelector('.sheet'), head = $('#modalHead'), EDGE = 7; let op = null;
    const save = () => { const r = sh.getBoundingClientRect(); geo.set(modalKey, { x: r.left, y: r.top, w: sh.style.width ? r.width : 0, h: sh.style.height ? r.height : 0 }); };
    const place = () => { if (sh.classList.contains('placed')) return; const r = sh.getBoundingClientRect(); sh.classList.add('placed'); sh.style.left = r.left + 'px'; sh.style.top = r.top + 'px'; };
    const zone = e => { const r = sh.getBoundingClientRect(); let z = ''; if (e.clientY - r.top < EDGE) z += 'n'; else if (r.bottom - e.clientY < EDGE) z += 's'; if (e.clientX - r.left < EDGE) z += 'w'; else if (r.right - e.clientX < EDGE) z += 'e'; return z; };
    sh.addEventListener('pointermove', e => { if (op || sh.classList.contains('max')) return; const z = zone(e); sh.style.cursor = z ? z + '-resize' : ''; });
    sh.addEventListener('pointerdown', e => {
      if (e.button !== 0 || sh.classList.contains('max')) return; const z = zone(e); const onHead = !z && head.contains(e.target) && !e.target.closest('button');
      if (!z && !onHead) return; e.preventDefault(); place(); const r = sh.getBoundingClientRect(); op = { z, x: e.clientX, y: e.clientY, r }; sh.setPointerCapture(e.pointerId); document.body.classList.add('dragging');
    });
    sh.addEventListener('pointermove', e => {
      if (!op) return; const dx = e.clientX - op.x, dy = e.clientY - op.y, r = op.r, minW = 360, minH = 200;
      if (!op.z) { sh.style.left = Math.min(Math.max(r.left + dx, 120 - r.width), innerWidth - 120) + 'px'; sh.style.top = Math.min(Math.max(r.top + dy, 0), innerHeight - 48) + 'px'; return; }
      let { left, top, width, height } = r;
      if (op.z.includes('e')) width = Math.max(minW, r.width + dx); if (op.z.includes('s')) height = Math.max(minH, r.height + dy);
      if (op.z.includes('w')) { width = Math.max(minW, r.width - dx); left = r.right - width; } if (op.z.includes('n')) { height = Math.max(minH, r.height - dy); top = r.bottom - height; }
      Object.assign(sh.style, { left: left + 'px', top: Math.max(0, top) + 'px', width: width + 'px', height: Math.min(height, innerHeight - Math.max(0, top)) + 'px', maxHeight: 'none' });
    });
    const end = () => { if (!op) return; op = null; document.body.classList.remove('dragging'); save(); };
    sh.addEventListener('pointerup', end); sh.addEventListener('pointercancel', end);
    head.addEventListener('dblclick', e => { if (!e.target.closest('button')) $('#modalMax').click(); });
    $('#modalMax').onclick = () => sh.classList.toggle('max');
    $('#modalClose').onclick = () => UI.closeModal();
    addEventListener('resize', () => { if (!m.hidden && sh.classList.contains('placed')) UI.keepOnScreen(sh); });
  };
  UI.progress = function (label) {
    const el = $('#progress'); el.hidden = false; el.querySelector('span').textContent = label; const bar = el.querySelector('i'); bar.style.width = '0%';
    return { set(p, l) { bar.style.width = Math.round(p * 100) + '%'; if (l) el.querySelector('span').textContent = l; }, done() { el.hidden = true; } };
  };
  // Run an async job with progress + error handling
  UI.run = async function (label, fn) {
    const pr = UI.progress(label); try { await TM.nextFrame(); const r = await fn(p => pr.set(p)); return r; }
    catch (e) { console.error(e); UI.toast(e.message || String(e), 'err'); throw e; } finally { pr.done(); }
  };

  // Form builder: fields [{id,label,type:'number'|'text'|'select'|'check'|'file',value,options:[[v,l]],step,min,max,hint}]
  UI.form = function (fields, cols = 2) {
    const f = document.createElement('div'); f.className = 'form cols' + cols;
    for (const d of fields) {
      if (d.type === 'section') { const h = document.createElement('div'); h.className = 'form-sec'; h.textContent = d.label; f.appendChild(h); continue; }
      const w = document.createElement('label'); w.className = 'fld' + (d.type === 'check' ? ' chk' : '') + (d.wide ? ' wide' : '');
      let inp;
      if (d.type === 'select') { inp = document.createElement('select'); (d.options || []).forEach(o => { const op = document.createElement('option'); op.value = Array.isArray(o) ? o[0] : o; op.textContent = Array.isArray(o) ? o[1] : o; if (String(op.value) === String(d.value)) op.selected = true; inp.appendChild(op); }); if (d.multiple) { inp.multiple = true; inp.size = Math.min(6, (d.options || []).length); [...inp.options].forEach(o => o.selected = (d.value || []).map(String).includes(o.value)); } }
      else if (d.type === 'textarea') { inp = document.createElement('textarea'); inp.value = d.value || ''; inp.rows = d.rows || 4; }
      else { inp = document.createElement('input'); inp.type = d.type === 'check' ? 'checkbox' : (d.type || 'text'); if (d.type === 'check') inp.checked = !!d.value; else if (d.type !== 'file') inp.value = d.value == null ? '' : d.value; ['step', 'min', 'max', 'accept', 'placeholder'].forEach(k => d[k] != null && inp.setAttribute(k, d[k])); if (d.multipleFiles) inp.multiple = true; }
      inp.id = 'f_' + d.id; inp.dataset.k = d.id;
      const sp = document.createElement('span'); sp.textContent = d.label;
      if (d.type === 'check') { w.appendChild(inp); w.appendChild(sp); } else { w.appendChild(sp); w.appendChild(inp); }
      if (d.hint) { const h = document.createElement('small'); h.textContent = d.hint; w.appendChild(h); }
      f.appendChild(w);
    }
    f.values = () => { const o = {}; f.querySelectorAll('[data-k]').forEach(i => { const k = i.dataset.k; if (i.type === 'checkbox') o[k] = i.checked; else if (i.type === 'number') o[k] = i.value === '' ? null : +i.value; else if (i.type === 'file') o[k] = i.multiple ? [...i.files] : i.files[0]; else if (i.multiple) o[k] = [...i.selectedOptions].map(x => x.value); else o[k] = i.value; }); return o; };
    return f;
  };
  UI.table = function (cols, rows, { max = 500, cls = '', onRow } = {}) {
    const w = document.createElement('div'); w.className = 'tbl-wrap ' + cls;
    const shown = rows.slice(0, max);
    w.innerHTML = `<table><thead><tr>${cols.map(c => `<th class="${c.num ? 'n' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${shown.map((r, i) => `<tr data-i="${i}" class="${r._cls || ''}">${cols.map(c => { const v = typeof c.get === 'function' ? c.get(r) : r[c.key]; return `<td class="${c.num ? 'n' : ''}">${c.html ? v : esc(c.fmt ? c.fmt(v, r) : v)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>${rows.length > max ? `<div class="hint pad">${L(`Showing ${max} of ${fmt(rows.length)} rows`, `عرض ${max} من ${fmt(rows.length)} صف`)}</div>` : ''}`;
    if (onRow) w.querySelector('tbody').addEventListener('click', e => { const tr = e.target.closest('tr'); if (tr) onRow(shown[+tr.dataset.i]); });
    return w;
  };
  UI.html = (s) => { const d = document.createElement('div'); d.innerHTML = s; return d; };

  // ---------------------------------------------------------------- SVG charts (theme-token colours, hover tooltips)
  const SER = ['var(--series-a)', 'var(--series-b)', 'var(--series-c)', 'var(--series-d)'];
  function nice(min, max, n = 5) { if (min === max) { max = min + 1; } const span = max - min, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0))), st = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) || 10 * mag; const lo = Math.floor(min / st) * st, hi = Math.ceil(max / st) * st; const t = []; for (let v = lo; v <= hi + st * 1e-6; v += st) t.push(+v.toFixed(10)); return { lo, hi, ticks: t, step: st }; }
  UI.chart = function ({ series, xLabel = '', yLabel = '', xFmt = v => fmt(v, 1), yFmt = v => fmt(v, 1), markers = [], height = 220, bars = false, zeroLine = false, title = '' }) {
    const W = 460, H = height, m = { l: 54, r: 14, t: 14, b: 38 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const all = series.flatMap(s => s.points.filter(p => p[1] != null && isFinite(p[1])));
    if (!all.length) return UI.html(`<div class="chart empty">${L('No data', 'لا توجد بيانات')}</div>`);
    const xs = all.map(p => p[0]), ys = all.map(p => p[1]); const nx = nice(Math.min(...xs), Math.max(...xs)); const ny = nice(Math.min(0, ...ys), Math.max(...ys) * 1.05);
    const X = v => m.l + (v - nx.lo) / (nx.hi - nx.lo) * iw, Y = v => m.t + ih - (v - ny.lo) / (ny.hi - ny.lo) * ih;
    let g = '';
    for (const t of ny.ticks) g += `<line x1="${m.l}" x2="${m.l + iw}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/><text x="${m.l - 6}" y="${Y(t) + 3.5}" text-anchor="end" class="tick">${esc(yFmt(t))}</text>`;
    for (const t of nx.ticks) g += `<text x="${X(t)}" y="${H - 22}" text-anchor="middle" class="tick">${esc(xFmt(t))}</text>`;
    g += `<text x="${m.l + iw / 2}" y="${H - 5}" text-anchor="middle" class="axl">${esc(xLabel)}</text><text transform="translate(12,${m.t + ih / 2}) rotate(-90)" text-anchor="middle" class="axl">${esc(yLabel)}</text>`;
    if (zeroLine && ny.lo < 0) g += `<line x1="${m.l}" x2="${m.l + iw}" y1="${Y(0)}" y2="${Y(0)}" class="zero"/>`;
    series.forEach((s, si) => {
      const col = s.color || SER[si % SER.length]; const pts = s.points.filter(p => p[1] != null && isFinite(p[1]));
      if (bars || s.bars) { const bw = Math.max(3, iw / Math.max(pts.length, 1) / (series.length + 0.6)); pts.forEach(p => { const x = X(p[0]) - bw * series.length / 2 + si * bw, y0 = Y(0), y1 = Y(p[1]); g += `<rect x="${x}" y="${Math.min(y0, y1)}" width="${bw - 2}" height="${Math.max(1, Math.abs(y1 - y0))}" rx="2" style="fill:${p[2] || col}"/>`; }); }
      else { if (s.line !== false && pts.length > 1) g += `<path d="${pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join('')}" style="fill:none;stroke:${col};stroke-width:2;${s.dash ? 'stroke-dasharray:6 3' : ''}"/>`; if (s.dots) pts.forEach(p => g += `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="${s.r || 4}" style="fill:${col};stroke:var(--panel);stroke-width:2"/>`); }
    });
    for (const mk of markers) { if (mk.x == null || mk.x < nx.lo || mk.x > nx.hi) continue; g += `<line x1="${X(mk.x)}" x2="${X(mk.x)}" y1="${m.t}" y2="${m.t + ih}" style="stroke:${mk.color || 'var(--warn)'};stroke-dasharray:3 3"/><text x="${X(mk.x) + 4}" y="${m.t + 10}" class="mk" style="fill:${mk.color || 'var(--warn)'}">${esc(mk.label || '')}</text>`; }
    const wrap = document.createElement('div'); wrap.className = 'chart';
    wrap.innerHTML = `${title ? `<h4>${esc(title)}</h4>` : ''}${series.length > 1 ? `<div class="legend-row">${series.map((s, i) => `<span><i style="background:${s.color || SER[i % SER.length]}"></i>${esc(s.name)}</span>`).join('')}</div>` : ''}<svg viewBox="0 0 ${W} ${H}" role="img">${g}<line class="xh" y1="${m.t}" y2="${m.t + ih}" x1="0" x2="0"/><rect class="hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}"/></svg><div class="tip" hidden></div>`;
    const svg = wrap.querySelector('svg'), tip = wrap.querySelector('.tip'), xh = wrap.querySelector('.xh');
    wrap.querySelector('.hit').addEventListener('mousemove', e => {
      const r = svg.getBoundingClientRect(); const vx = (e.clientX - r.left) / r.width * W; const xv = nx.lo + (vx - m.l) / iw * (nx.hi - nx.lo);
      let best = null; for (const s of series) for (const p of s.points) if (p[1] != null && (!best || Math.abs(p[0] - xv) < Math.abs(best - xv))) best = p[0];
      if (best == null) return; xh.setAttribute('x1', X(best)); xh.setAttribute('x2', X(best)); xh.style.opacity = .6;
      tip.innerHTML = `<b>${esc(xFmt(best))}</b>` + series.map(s => { const p = s.points.find(q => q[0] === best); return p && p[1] != null ? `<br>${esc(s.name || '')} ${esc(yFmt(p[1]))}` : ''; }).join('');
      tip.hidden = false; const wr = wrap.getBoundingClientRect(); let lx = e.clientX - wr.left + 12; if (lx > wr.width - 170) lx -= 190; tip.style.left = Math.max(4, lx) + 'px'; tip.style.top = Math.max(0, e.clientY - wr.top - 30) + 'px';
    });
    wrap.querySelector('.hit').addEventListener('mouseleave', () => { tip.hidden = true; xh.style.opacity = 0; });
    return wrap;
  };
  UI.histogram = function (values, { bins = 30, log = true, marker, xLabel = '', title = '' } = {}) {
    const v = values.filter(x => isFinite(x) && (!log || x > 0)); if (!v.length) return UI.html('<div class="chart empty">—</div>');
    const tf = log ? Math.log10 : x => x, itf = log ? x => Math.pow(10, x) : x => x; const a = tf(Math.min(...v)), b = tf(Math.max(...v)); const w = (b - a) / bins || 1; const c = new Array(bins).fill(0);
    v.forEach(x => c[Math.min(bins - 1, Math.floor((tf(x) - a) / w))]++);
    return UI.chart({ title, series: [{ name: L('count', 'العدد'), bars: true, points: c.map((n, i) => [a + (i + .5) * w, n]) }], xLabel: xLabel + (log ? ' (log)' : ''), yLabel: L('Count', 'العدد'), xFmt: x => fmt(itf(x), itf(x) < 1 ? 2 : 1), yFmt: y => fmt(y), markers: marker ? [{ x: tf(marker), label: L('top-cut ', 'سقف ') + fmt(marker, 1) }] : [] });
  };
  UI.probPlot = function (values, { marker, title = '' } = {}) {
    const v = values.filter(x => x > 0).sort((a, b) => a - b), n = v.length; if (!n) return UI.html('—');
    const step = Math.max(1, Math.floor(n / 300)); const pts = []; for (let i = 0; i < n; i += step) pts.push([Math.log10(v[i]), (i + .5) / n * 100]);
    pts.push([Math.log10(v[n - 1]), 100 * (n - .5) / n]);
    return UI.chart({ title, series: [{ name: L('cumulative %', 'التراكمي %'), points: pts, dots: true, line: false, r: 2.5 }], xLabel: L('Grade (log)', 'التركيز (لوغاريتمي)'), yLabel: L('Cumulative %', 'التراكمي %'), xFmt: x => fmt(Math.pow(10, x), Math.pow(10, x) < 1 ? 2 : 1), yFmt: y => fmt(y, 0), markers: marker ? [{ x: Math.log10(marker), label: fmt(marker, 1) }] : [] });
  };

  // ---------------------------------------------------------------- KPI bar
  let prevK = null;
  UI.renderKPIs = function () {
    const el = $('#kpis'); const P = TM.P; if (!P) return; const s = P.settings;
    if (!P.bm) {
      const cards = [[L('Drillholes', 'الآبار'), fmt(P.db.collars.length), `${fmt(P.db.assays.length)} ${L('assays', 'تحليل')}`], [L('Metres drilled', 'الأمتار المحفورة'), fmt(P.db.collars.reduce((a, c) => a + (c.depth || 0), 0)), 'm'], [L('Surfaces', 'الأسطح'), fmt(P.surfaces.length), P.surfaces.map(x => x.name).join(', ') || '—'], [L('Strings', 'الخطوط'), fmt(P.strings.length), ''], [L('Solids', 'المجسمات'), fmt(P.solids.length), ''], [L('Next step', 'الخطوة التالية'), L('Estimate', 'التقدير'), L('Block Model → Estimate', 'نموذج البلوكات ← تقدير')]];
      el.innerHTML = cards.map(c => `<div class="kpi"><div class="kpi-k">${esc(c[0])}</div><div class="kpi-v">${esc(c[1])}</div><div class="kpi-s">${esc(c[2])}</div></div>`).join(''); return;
    }
    const k = TM.WF.kpis(); const d = (cur, key, f, u = '') => { if (!prevK || prevK[key] == null || cur == null) return ''; const dv = cur - prevK[key]; if (Math.abs(dv) < 1e-9) return ''; return ` <span class="${dv > 0 ? 'up' : 'dn'}">${dv > 0 ? '▲' : '▼'}${f(Math.abs(dv))}${u}</span>`; };
    const items = [
      [L('Ore tonnage', 'حمولة الخام'), `${fmt(k.ore / 1e6, 2)} <small>Mt</small>`, `${k.inPit ? L('mill ore', 'خام للمصنع') : L('resource', 'مورد')}` + (k.low ? ` · +${fmt(k.low / 1e6, 2)} Mt ${L('LG stockpile', 'مخزون منخفض')}` : ` · ${fmt(k.ore)} t`) + d(k.ore / 1e6, 'ore', v => fmt(v, 2), ' Mt')],
      [L('Average grade', 'متوسط التركيز'), `${fmt(k.grade, 2)} <small>${s.gradeUnit}</small>`, `≥ ${fmt(s.cutoff, 2)} COG` + d(k.grade, 'grade', v => fmt(v, 2))],
      [L('Contained metal', 'المعدن المحتوى'), `${fmt(k.oz / 1e3, 1)} <small>koz</small>`, `${fmt(k.oz * s.recovery / 100 / 1e3, 1)} koz ${L('recovered', 'مستخلص')}` + d(k.oz / 1e3, 'oz', v => fmt(v, 1), ' koz')],
      [L('Waste tonnage', 'حمولة النفايات'), k.waste != null ? `${fmt(k.waste / 1e6, 2)} <small>Mt</small>` : '—', k.waste != null ? `${L('pit', 'الحفرة')} ${fmt((k.waste + k.ore + (k.low || 0)) / 1e6, 2)} Mt` + d(k.waste / 1e6, 'waste', v => fmt(v, 2), ' Mt') : (s.mineType === 'underground' ? L('see stope reserves', 'راجع احتياطي الأعمال') : L('optimise pit', 'حسّن الحفرة'))],
      [L('Stripping ratio', 'نسبة الكشف'), k.sr != null ? `${fmt(k.sr, 2)} <small>W:O</small>` : '—', k.sr != null ? `${esc(k.pitLabel || '')}` + d(k.sr, 'sr', v => fmt(v, 2)) : ''],
      [`NPV @ ${s.discount}%`, k.npv != null ? `${TM.usd(k.npv / 1e6)} <small>M</small>` : '—', k.npv != null ? `${fmt(k.life)} ${L('yr', 'سنة')} · IRR ${k.irr != null ? fmt(k.irr * 100, 0) + '%' : '—'}` + d(k.npv / 1e6, 'npv', v => '$' + fmt(v, 1), 'M') : '', k.npv != null ? (k.npv >= 0 ? 'hero' : 'neg') : '']
    ];
    el.innerHTML = items.map(i => `<div class="kpi ${i[3] || ''}"><div class="kpi-k">${esc(i[0])}</div><div class="kpi-v">${i[1]}</div><div class="kpi-s">${i[2]}</div></div>`).join('');
    prevK = { ore: k.ore / 1e6, grade: k.grade, oz: k.oz / 1e3, waste: k.waste != null ? k.waste / 1e6 : null, sr: k.sr, npv: k.npv != null ? k.npv / 1e6 : null };
  };
  UI.resetKpiDelta = () => { prevK = null; };

  // ---------------------------------------------------------------- layer tree
  UI.renderLayers = function () {
    const P = TM.P, v = TM.VP.vis, el = $('#layerTree'); if (!P) return; const eye = on => `<i data-lucide="${on ? 'eye' : 'eye-off'}"></i>`;
    const row = (key, on, sw, name, badge, body = '', sub = false) => `<div class="layer ${on ? '' : 'off'} ${sub ? 'sub' : ''}"><div class="layer-row"><button class="eye" type="button" data-eye="${key}" aria-label="${esc(name)}">${eye(on)}</button><span class="swatch" style="background:${sw}"></span><span class="layer-name" title="${esc(name)}">${esc(name)}</span><span class="badge">${badge}</span></div>${body ? `<div class="layer-body">${body}</div>` : ''}</div>`;
    const rng = (k, val, min, max, step, out) => `<label class="ctl"><span>${L('Opacity', 'الشفافية')}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${val}" data-k="${k}"><output>${out}</output></label>`;
    let h = '';
    if (P.surfaces.length) { h += row('topo', v.topo, '#6b7d5e', L('Surfaces', 'الأسطح'), `${P.surfaces.length}`, rng('topoOpacity', v.topoOpacity, .05, 1, .05, Math.round(v.topoOpacity * 100) + '%') + `<div class="ctl"><span>${L('Mode', 'النمط')}</span><div class="seg" data-seg="topoMode"><button type="button" data-v="solid" aria-pressed="${v.topoMode === 'solid'}">${L('Solid', 'مصمت')}</button><button type="button" data-v="wire" aria-pressed="${v.topoMode === 'wire'}">${L('Wire', 'شبكي')}</button></div><span></span></div><label class="toggle"><input type="checkbox" data-k="contours" ${v.contours ? 'checked' : ''}>${L('Contours 5 m', 'خطوط كنتور 5 م')}</label>`); P.surfaces.forEach(s => h += row('id:' + s.id, !TM.VP.hidden.has(s.id), s.color || '#6b7d5e', s.name, `${fmt(s.pts.length / 3)} pts`, '', true)); }
    if (P.db.collars.length) h += row('holes', v.holes, '#F2C94C', L('Drillholes', 'الآبار'), `${P.db.collars.length} · ${fmt(P.db.collars.reduce((a, c) => a + (c.depth || 0), 0))} m`, `<div class="ctl"><span>${L('Colour by', 'التلوين')}</span><div class="seg" data-seg="colorBy"><button type="button" data-v="grade" aria-pressed="${v.colorBy === 'grade'}">${esc(P.settings.gradeField)}</button><button type="button" data-v="lith" aria-pressed="${v.colorBy === 'lith'}">${L('Lithology', 'الصخارة')}</button></div><span></span></div><label class="toggle"><input type="checkbox" data-k="labels" ${v.labels ? 'checked' : ''}>${L('Labels', 'التسميات')}</label>`);
    if (P.strings.length) { h += row('strings', v.strings, '#F59E0B', L('Strings', 'الخطوط'), `${P.strings.length}`); P.strings.slice(0, 60).forEach(s => h += row('id:' + s.id, !TM.VP.hidden.has(s.id), s.color || '#F59E0B', s.name, `${s.pts.length} v${s.closed ? ' ◯' : ''}`, '', true)); }
    if (P.solids.length) { h += row('solids', v.solids, '#10B981', L('Solids', 'المجسمات'), `${P.solids.length}`); P.solids.forEach(s => h += row('id:' + s.id, !TM.VP.hidden.has(s.id), s.color || '#10B981', s.name, `${fmt(s.volume / 1e3)}k m³`, '', true)); }
    if (P.bm) { const bm = P.bm; h += row('bm', v.bm, '#cf8a1c', L('Block model', 'نموذج البلوكات'), `${bm.def.dx}×${bm.def.dy}×${bm.def.dz} · ${(bm.method || '').toUpperCase()}`, rng('bmOpacity', v.bmOpacity, .2, 1, .05, Math.round(v.bmOpacity * 100) + '%') + `<div class="ctl"><span>${L('Colour', 'اللون')}</span><select class="sel" data-k="colormap">${['gold', 'viridis', 'turbo', 'class'].map(c => `<option value="${c}" ${(c === 'class' ? v.bmColor === 'class' : v.bmColor !== 'class' && P.settings.colormap === c) ? 'selected' : ''}>${c === 'class' ? L('Resource class', 'فئة المورد') : c}</option>`).join('')}</select><span></span></div><div class="ctl"><span>${L('Show', 'إظهار')}</span><div class="seg" data-seg="bmFilter"><button type="button" data-v="cog" aria-pressed="${v.bmFilter !== 'pit'}">≥ COG</button><button type="button" data-v="pit" aria-pressed="${v.bmFilter === 'pit'}">${L('In pit', 'داخل الحفرة')}</button></div><span></span></div>`); }
    if (P.pit) { const p = P.pit; h += row('pit', v.pit, '#3B82F6', L('Pit shell', 'غلاف الحفرة'), `${p.selected + 1}/${p.shells.length} · RF ${p.rfs[p.selected]}${p.stale ? ' ⚠' : ''}`, `<label class="ctl"><span>${L('Shell', 'الغلاف')}</span><input type="range" min="0" max="${p.shells.length - 1}" step="1" value="${p.selected}" data-k="shell"><output>${p.selected + 1}</output></label>`); if (p.design) h += row('design', v.design, '#7AA9F8', L('Pit design benches', 'مصاطب تصميم الحفرة'), `${p.design.length}`, '', true); }
    if (P.design) h += row('designP', v.designP !== false, P.design.kind === 'pit' ? '#34D399' : '#F2B740', P.design.kind === 'pit' ? L('Pit design', 'تصميم الحفرة') : L('Dump design', 'تصميم المكب'), `${P.design.stats.benches} · ${fmt(P.design.stats.volume / 1e6, 2)} Mm³${P.design.kind === 'pit' && P.settings.pitSource === 'design' ? ' · KPI' : ''}`);
    if (P.dump && P.dump !== P.design) h += row('dumpP', v.dumpP !== false, '#F2B740', L('Dump design', 'تصميم المكب'), `${P.dump.stats.benches} · ${fmt(P.dump.stats.volume / 1e6, 2)} Mm³`);
    if (P.blast) h += row('blast', v.blast !== false, '#F472B6', L('Blast pattern', 'نمط التفجير'), `${P.blast.holes.length} ${L('holes', 'ثقب')}`);
    if ((P.settings.infill || []).length) h += row('infill', v.infill, '#67E8F9', L('Proposed holes', 'آبار مقترحة'), `${P.settings.infill.length}`);
    el.innerHTML = h || `<p class="hint">${L('Empty project. Import data or load the demo.', 'مشروع فارغ. استورد البيانات أو حمّل المشروع التجريبي.')}</p>`; UI.icons();
  };
  UI.bindLayers = function () {
    const el = $('#layerTree'), V = TM.VP;
    el.addEventListener('click', e => {
      const eb = e.target.closest('[data-eye]'); if (eb) { const k = eb.dataset.eye; if (k.startsWith('id:')) { const id = k.slice(3); V.hidden.has(id) ? V.hidden.delete(id) : V.hidden.add(id); } else V.vis[k] = V.vis[k] === false ? true : (V.vis[k] === undefined ? false : !V.vis[k]); V.applyVis(); UI.renderLayers(); return; }
      const sb = e.target.closest('[data-seg] button'); if (sb) { const k = sb.parentElement.dataset.seg; V.vis[k] = sb.dataset.v; if (k === 'colorBy') { V.buildHoles(); UI.renderLegend(); } if (k === 'bmFilter') { V.filterBM(); UI.renderKPIs(); } V.applyVis(); UI.renderLayers(); }
    });
    el.addEventListener('input', e => {
      const k = e.target.dataset.k; if (!k) return; const out = e.target.parentElement.querySelector('output'); const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      if (k === 'topoOpacity' || k === 'bmOpacity') { V.vis[k] = +val; out.textContent = Math.round(val * 100) + '%'; V.applyVis(); }
      else if (k === 'labels') V.vis.labels = val;
      else if (k === 'contours') { V.vis.contours = val; V.buildSurfaces(); }
      else if (k === 'shell') { out.textContent = +val + 1; TM.WF.selectShell(+val); }
      else if (k === 'colormap') { if (val === 'class') V.vis.bmColor = 'class'; else { V.vis.bmColor = null; TM.P.settings.colormap = val; } V.filterBM(); V.buildHoles(); UI.renderLegend(); }
    });
  };

  // ---------------------------------------------------------------- legend / HUD / inspector
  UI.renderLegend = function () {
    const el = $('#legend'); const P = TM.P; if (!P) return; const V = TM.VP; let h = '';
    if (V.vis.bmColor === 'class' && P.bm) h = `<div class="hud-k">${L('Resource class', 'فئة المورد')}</div><div class="lith-key">${[1, 2, 3].map(c => `<span class="swatch" style="background:${TM.Est.CLASS[c].c}"></span><span>${L(TM.Est.CLASS[c].en, TM.Est.CLASS[c].ar)}</span>`).join('')}</div>`;
    else h = `<div class="hud-k">${esc(P.settings.gradeField)} ${esc(P.settings.gradeUnit)} · ${esc(P.settings.colormap)}</div><canvas width="344" height="20"></canvas><div class="ticks"><span>0</span><span>${fmt(V.gmax / 3, 1)}</span><span>${fmt(V.gmax * 2 / 3, 1)}</span><span>${fmt(V.gmax, 0)}+</span></div>`;
    if (V.vis.colorBy === 'lith' && P.db.lith.length) h += `<div class="hud-k" style="margin-top:6px">${L('Lithology', 'الصخارة')}</div><div class="lith-key">${V.lithCodes().slice(0, 8).map(c => `<span class="swatch" style="background:${V.lithColor(c)}"></span><span>${esc(c)}</span>`).join('')}</div>`;
    el.innerHTML = h; const cv = el.querySelector('canvas'); if (cv) { const g = cv.getContext('2d'); for (let x = 0; x < cv.width; x++) { const c = V.cmap(x / cv.width * V.gmax); g.fillStyle = `rgb(${c.map(q => Math.round(q * 255)).join(',')})`; g.fillRect(x, 0, 1, cv.height); } const cx = P.settings.cutoff / V.gmax * cv.width; g.fillStyle = 'rgba(11,15,25,.6)'; g.fillRect(0, 0, cx, cv.height); g.fillStyle = '#fff'; g.fillRect(cx - 1, 0, 2, cv.height); }
  };
  UI.inspect = function (info) {
    const el = $('#inspector'); if (!info) { el.innerHTML = `<p class="hint">${L('Click a block, drillhole interval, solid or surface.', 'انقر على بلوك أو مقطع بئر أو مجسم أو سطح.')}</p>`; return; }
    const rows = []; const P = TM.P, s = P.settings;
    if (info.kind === 'block') { const bm = P.bm, id = info.id, d = bm.def; const i = id % d.nx, j = Math.floor(id / d.nx) % d.ny, k = Math.floor(id / (d.nx * d.ny)); const c = TM.Est.center(d, i, j, k); rows.push(['Object', `Block ${i},${j},${k}`], ['E / N / RL', c.map(v => fmt(v, 1)).join(' / ')], [s.gradeField + ' (' + (bm.method || '').toUpperCase() + ')', fmt(bm.grade[id], 3) + ' ' + s.gradeUnit], [L('Kriging variance', 'تباين الكريجنغ'), isFinite(bm.kv[id]) ? fmt(bm.kv[id], 3) : '—'], [L('Samples / holes', 'العينات / الآبار'), `${bm.ns[id]} / ${bm.nh[id]}`], [L('Avg distance', 'متوسط المسافة'), fmt(bm.dist[id], 1) + ' m'], [L('Class', 'الفئة'), bm.cls[id] ? L(TM.Est.CLASS[bm.cls[id]].en, TM.Est.CLASS[bm.cls[id]].ar) : '—'], [L('Tonnes', 'الحمولة'), fmt(TM.Est.blockTonnes(bm, id)) + ' t']); const f = TM.Pit.floorAt(c[0], c[1]); if (TM.Pit.selected()) rows.push([L('Pit', 'الحفرة'), c[2] > f ? L('inside', 'داخل') : L('outside', 'خارج')]); }
    else if (info.kind === 'sample') { const h = info.hole, sm = info.s; rows.push(['Hole', h.id], [L('Interval', 'الفترة'), `${fmt(sm.from, 1)}–${fmt(sm.to, 1)} m`], [s.gradeField + ' raw', fmt(sm.g, 3)], ...(s.topCut && sm.g > s.topCut ? [[L('capped', 'بعد السقف'), fmt(s.topCut, 2)]] : []), [L('Lithology', 'الصخارة'), TM.Drill.lithAt(h, (sm.from + sm.to) / 2) || '—'], ['Collar', `E${fmt(h.collar.x, 1)} N${fmt(h.collar.y, 1)} RL${fmt(h.collar.z, 1)}`], [L('Depth', 'العمق'), fmt(h.collar.depth, 1) + ' m']); }
    else if (info.kind === 'string') { const st = TM.CAD.props(info.ref); rows.push(['String', st.name], [L('String no.', 'رقم الخط'), st.string_no || '—'], [L('Vertices', 'النقاط'), st.vertices], [L('Length 3D', 'الطول'), fmt(st.length_3d, 2) + ' m'], ...(st.area != null ? [[L('Area', 'المساحة'), fmt(st.area, 1) + ' m²']] : []), ['RL', `${fmt(st.z_min, 1)} – ${fmt(st.z_max, 1)}`]); if (info.vi >= 0) { const p = info.ref.pts[info.vi]; rows.push([L('Vertex', 'النقطة') + ' ' + (info.vi + 1), `${fmt(p[0], 2)}, ${fmt(p[1], 2)}, ${fmt(p[2], 2)}`]); } }
    else if (info.kind === 'solid') { const so = info.ref; rows.push(['Solid', so.name], [L('Volume', 'الحجم'), fmt(so.volume) + ' m³'], [L('Tonnes', 'الحمولة'), fmt(so.volume * s.density) + ' t'], [L('Closed', 'مغلق'), so.closed ? '✓' : '✗'], [L('Source', 'المصدر'), so.source || '—']); }
    else { const p = info.p; rows.push(['Object', info.ref && info.ref.name ? info.ref.name : info.kind], ['E / N', `${fmt(p.x, 2)} / ${fmt(p.y, 2)}`], ['RL', fmt(p.z, 2)]); if (TM.Pit.selected()) rows.push([L('Pit floor', 'قاع الحفرة'), fmt(Math.min(TM.Pit.floorAt(p.x, p.y), p.z), 1)]); }
    el.innerHTML = `<dl>${rows.map(r => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join('')}</dl>`;
  };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
