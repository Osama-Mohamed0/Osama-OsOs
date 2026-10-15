/* TerraMind Studio — executive engineering & resource/reserve report (print, HTML download, Markdown). */
(function (TM) {
  'use strict';
  const R = TM.Report = {}; const L = TM.L, fmt = TM.fmt, esc = TM.esc, UI = () => TM.UI;

  R.build = function ({ name, sensitivity = true } = {}) {
    const P = TM.P, s = P.settings, WF = TM.WF, bm = P.bm, pit = P.pit, date = new Date().toISOString().slice(0, 10);
    const root = document.createElement('div'); root.className = 'rpt'; const md = [];
    const sec = (t) => { const h = document.createElement('h3'); h.textContent = t; root.appendChild(h); md.push(`\n## ${t}\n`); };
    const para = (html, text) => { const p = document.createElement('p'); p.innerHTML = html; root.appendChild(p); md.push((text || p.textContent) + '\n'); };
    const add = el => { root.appendChild(el); return el; };
    const tbl = (cols, rows) => { add(UI().table(cols, rows, { max: 200 })); md.push('| ' + cols.map(c => c.label).join(' | ') + ' |\n|' + cols.map(() => '---').join('|') + '|\n' + rows.map(r => '| ' + cols.map(c => { const v = typeof c.get === 'function' ? c.get(r) : r[c.key]; return c.fmt ? c.fmt(v, r) : v; }).join(' | ') + ' |').join('\n') + '\n'); };
    add(UI().html(`<div class="meta">${esc(name || P.name)} · ${date} · TerraMind Studio ${TM.version} · ${esc(P.crs)}</div>`)); md.push(`# ${name || P.name} — ${L('Executive Engineering & Resource Report', 'التقرير الهندسي التنفيذي')}\n_${date}_\n`);

    // 1 executive summary
    sec(L('1. Executive summary', '1. الملخص التنفيذي'));
    const k = bm ? WF.kpis() : null; let sch = null; try { sch = pit ? WF.schedule() : null; } catch (e) { }
    if (k) {
      para(L(`At a <b>${fmt(s.cutoff, 2)} g/t</b> cut-off ${k.inPit ? 'inside the selected pit shell' : '(global resource, no pit selected)'}, the model contains <b>${fmt(k.ore / 1e6, 2)} Mt @ ${fmt(k.grade, 2)} g/t</b> for <b>${fmt(k.oz / 1e3, 1)} koz</b> contained gold` + (k.waste != null ? `, with ${fmt(k.waste / 1e6, 2)} Mt of waste (strip ratio ${fmt(k.sr, 2)}).` : '.') + (sch ? ` The pushback schedule runs ${sch.years} years with NPV<sub>${s.discount}%</sub> <b>${TM.usd(sch.npv_musd)}M</b>, IRR ${sch.irr_pct != null ? sch.irr_pct + '%' : 'n/a'} and payback ${sch.payback_years != null ? sch.payback_years + ' years' : 'n/a'} at $${fmt(s.price)}/oz.` : ''),
        `عند حد قطع <b>${fmt(s.cutoff, 2)} غ/طن</b> ${k.inPit ? 'داخل غلاف الحفرة المختار' : '(المورد الكلي)'} يحتوي النموذج على <b>${fmt(k.ore / 1e6, 2)} مليون طن بتركيز ${fmt(k.grade, 2)} غ/طن</b> أي <b>${fmt(k.oz / 1e3, 1)} ألف أونصة</b>` + (k.waste != null ? `، مع ${fmt(k.waste / 1e6, 2)} مليون طن نفايات (نسبة كشف ${fmt(k.sr, 2)}).` : '.') + (sch ? ` جدول الإنتاج ${sch.years} سنوات بصافي قيمة حالية <b>${TM.usd(sch.npv_musd)} مليون</b> ومعدل عائد ${sch.irr_pct != null ? sch.irr_pct + '%' : '—'} واسترداد ${sch.payback_years != null ? sch.payback_years + ' سنة' : '—'} عند ${fmt(s.price)}$/أونصة.` : '')));
      add(UI().html(`<div class="kgrid">${[[L('Ore', 'الخام'), fmt(k.ore / 1e6, 2) + ' Mt'], [L('Grade', 'التركيز'), fmt(k.grade, 2) + ' g/t'], [L('Contained', 'المحتوى'), fmt(k.oz / 1e3, 1) + ' koz'], [L('Strip ratio', 'نسبة الكشف'), k.sr != null ? fmt(k.sr, 2) : '—'], ['NPV', sch ? TM.usd(sch.npv_musd) + 'M' : '—'], ['IRR', sch && sch.irr_pct != null ? sch.irr_pct + '%' : '—']].map(([a, b]) => `<div class="kbox"><div class="kpi-k">${a}</div><div class="kpi-v">${b}</div></div>`).join('')}</div>`));
    } else para(L('No block model has been estimated yet; this report covers the drillhole database only.', 'لم يُقدّر نموذج البلوكات بعد؛ يغطي التقرير قاعدة بيانات الآبار فقط.'));

    // 2 data & QA/QC
    sec(L('2. Drillhole database & QA/QC', '2. قاعدة بيانات الآبار وضبط الجودة'));
    const iss = TM.Drill.validate(); const st = TM.stats(P.db.assays.map(a => a[s.gradeField]).filter(isFinite));
    para(L(`${P.db.collars.length} drillholes, ${fmt(P.db.assays.length)} assay intervals, ${fmt(P.db.collars.reduce((a, c) => a + (c.depth || 0), 0))} m drilled. Validation: ${iss.filter(i => i.sev === 'error').length} errors, ${iss.filter(i => i.sev === 'warn').length} warnings. Top-cut: ${s.topCut ? fmt(s.topCut, 1) + ' g/t' : 'none'}. Composites: ${s.compLen} m.`, `${P.db.collars.length} بئراً، ${fmt(P.db.assays.length)} فترة تحليل، ${fmt(P.db.collars.reduce((a, c) => a + (c.depth || 0), 0))} م. التحقق: ${iss.filter(i => i.sev === 'error').length} خطأ و${iss.filter(i => i.sev === 'warn').length} تحذير. السقف: ${s.topCut ? fmt(s.topCut, 1) + ' غ/طن' : 'لا يوجد'}. المركبات: ${s.compLen} م.`));
    if (st.n) tbl([{ label: L('Statistic', 'الإحصاء'), key: 'k' }, { label: s.gradeField + ' (' + s.gradeUnit + ')', key: 'v', num: true }], [['n', fmt(st.n)], ['min', fmt(st.min, 3)], ['mean', fmt(st.mean, 3)], ['median', fmt(st.median, 3)], ['P99', fmt(st.p99, 2)], ['max', fmt(st.max, 2)], ['CV', fmt(st.cv, 2)]].map(([a, b]) => ({ k: a, v: b })));
    if (iss.length) tbl([{ label: L('Severity', 'الأهمية'), key: 'sev' }, { label: L('Hole', 'البئر'), key: 'hole' }, { label: L('Table', 'الجدول'), key: 'table' }, { label: L('Issue', 'المشكلة'), key: 'msg' }], iss.slice(0, 25));

    // 3 estimation
    if (bm) {
      sec(L('3. Mineral resource estimate', '3. تقدير المورد المعدني'));
      const v = s.variogram; para(L(`Method: ${(bm.method || '').toUpperCase()}, blocks ${bm.def.dx}×${bm.def.dy}×${bm.def.dz} m, ${fmt(bm.estimated)} estimated.` + (v ? ` Variogram: spherical, nugget ${fmt(v.nugget, 3)}, sill ${fmt(v.sill, 3)}, ranges ${v.ranges.join(' / ')} m, azimuth ${v.azi}°, dip ${v.dip}°.` : '') + ` Classification: Measured ≤ ${bm.classRules.mDist} m and ≥ ${bm.classRules.mHoles} holes; Indicated ≤ ${bm.classRules.iDist} m.`, `الطريقة: ${(bm.method || '').toUpperCase()}، بلوكات ${bm.def.dx}×${bm.def.dy}×${bm.def.dz} م، ${fmt(bm.estimated)} بلوك.` + (v ? ` التباين: كروي، نوجيت ${fmt(v.nugget, 3)}، عتبة ${fmt(v.sill, 3)}، مدى ${v.ranges.join(' / ')} م، سمت ${v.azi}°، ميل ${v.dip}°.` : '')));
      const rt = WF.resourceTable(); tbl([{ label: L('Class', 'الفئة'), get: r => r.cls ? L(TM.Est.CLASS[r.cls].en, TM.Est.CLASS[r.cls].ar) : L('Total', 'الإجمالي') }, { label: 'Mt', get: r => fmt(r.tonnes / 1e6, 2), num: true }, { label: 'g/t', get: r => fmt(r.grade, 2), num: true }, { label: 'koz', get: r => fmt(r.oz / 1e3, 1), num: true }], rt);
      const gt = TM.Est.gtCurve(bm, {}, Array.from({ length: 31 }, (_, i) => +(i * 0.1).toFixed(1)));
      const ch = document.createElement('div'); ch.className = 'charts';
      ch.appendChild(UI().chart({ title: L('Tonnage above cut-off (Mt)', 'الحمولة فوق حد القطع (مليون طن)'), series: [{ name: 'Mt', points: gt.map(g => [g.cutoff, g.tonnes / 1e6]) }], xLabel: L('Cut-off g/t', 'حد القطع غ/طن'), yLabel: 'Mt', xFmt: x => fmt(x, 1), yFmt: y => fmt(y, 1), markers: [{ x: s.cutoff, label: 'COG' }] }));
      ch.appendChild(UI().chart({ title: L('Average grade above cut-off (g/t)', 'متوسط التركيز فوق حد القطع'), series: [{ name: 'g/t', points: gt.map(g => [g.cutoff, g.tonnes ? g.grade : null]), color: 'var(--series-b)' }], xLabel: L('Cut-off g/t', 'حد القطع غ/طن'), yLabel: 'g/t', xFmt: x => fmt(x, 1), yFmt: y => fmt(y, 1), markers: [{ x: s.cutoff, label: 'COG' }] }));
      add(ch); md.push(gt.filter((_, i) => i % 5 === 0).map(g => `- COG ${g.cutoff}: ${fmt(g.tonnes / 1e6, 2)} Mt @ ${fmt(g.grade, 2)} g/t`).join('\n') + '\n');
    }
    // 4 pit
    if (pit) {
      sec(L('4. Pit optimisation & design', '4. تحسين الحفرة وتصميمها'));
      const e = TM.Mine.econ(); para(L(`Lerchs-Grossmann (max-flow) nested shells on ${pit.lg.cell} m × ${pit.lg.cell} m × ${pit.lg.benchH} m blocks, ${pit.params.slope}° overall slope, $${fmt(pit.params.price)}/oz, mining $${fmt(pit.params.mineCost, 2)}/t, processing + G&A $${fmt(s.procCost + s.gaCost, 1)}/t, recovery ${s.recovery}%. Marginal cut-off ${fmt(e.marginalCOG, 2)} g/t. Selected shell ${pit.selected + 1} (RF ${pit.rfs[pit.selected]}).` + (pit.stale ? ' ⚠ The block model changed after this optimisation.' : ''), `أغلفة متداخلة بطريقة Lerchs-Grossmann على بلوكات ${pit.lg.cell}×${pit.lg.cell}×${pit.lg.benchH} م، ميل ${pit.params.slope}°، سعر ${fmt(pit.params.price)}$، تكلفة التعدين ${fmt(pit.params.mineCost, 2)}$/طن. حد القطع الحدي ${fmt(e.marginalCOG, 2)} غ/طن. الغلاف المختار ${pit.selected + 1}.`));
      add(UI().chart({ title: L('Pit-by-pit NPV (best vs worst case)', 'صافي القيمة لكل غلاف (أفضل/أسوأ حالة)'), series: [{ name: L('Best case', 'أفضل حالة'), points: pit.pbp.map(p => [p.shell, p.best / 1e6]) }, { name: L('Worst case', 'أسوأ حالة'), points: pit.pbp.map(p => [p.shell, p.worst / 1e6]), color: 'var(--series-b)', dash: true }], xLabel: L('Shell', 'الغلاف'), yLabel: '$M', xFmt: x => fmt(x), yFmt: y => fmt(y, 0), markers: [{ x: pit.selected + 1, label: L('selected', 'المختار') }], zeroLine: true }));
      tbl([{ label: L('Shell', 'الغلاف'), key: 'shell' }, { label: 'RF', key: 'rf', num: true }, { label: L('Ore Mt', 'خام') + ' Mt', get: r => fmt(r.ore / 1e6, 2), num: true }, { label: 'g/t', get: r => fmt(r.grade, 2), num: true }, { label: 'SR', get: r => fmt(r.sr, 2), num: true }, { label: 'NPV best $M', get: r => fmt(r.best / 1e6, 1), num: true }, { label: 'NPV worst $M', get: r => fmt(r.worst / 1e6, 1), num: true }], pit.pbp.filter((_, i) => i % 2 === 0 || i === pit.selected));
    }
    // 5 schedule
    if (sch) {
      sec(L('5. Production schedule & cash flow', '5. جدول الإنتاج والتدفق النقدي'));
      add(UI().chart({ title: L('Annual cash flow ($M)', 'التدفق النقدي السنوي (مليون $)'), series: [{ name: '$M', bars: true, points: sch.table.map(y => [y.year, y.cash_musd, y.cash_musd < 0 ? 'var(--crit)' : 'var(--series-a)']) }], xLabel: L('Year', 'السنة'), yLabel: '$M', xFmt: x => fmt(x), yFmt: y => fmt(y, 0), zeroLine: true }));
      tbl([{ label: L('Year', 'السنة'), key: 'year' }, { label: L('Ore t', 'خام طن'), get: r => fmt(r.ore_t), num: true }, { label: L('Waste t', 'نفايات طن'), get: r => fmt(r.waste_t), num: true }, { label: 'g/t', get: r => fmt(r.grade, 2), num: true }, { label: L('Recovered oz', 'أونصة مستخلصة'), get: r => fmt(r.oz), num: true }, { label: L('Cash $M', 'النقد مليون $'), get: r => fmt(r.cash_musd, 1), num: true }], sch.table);
    }
    if (pit && sensitivity) {
      sec(L('6. Sensitivity', '6. تحليل الحساسية')); const sv = WF.sensitivity();
      tbl([{ label: 'NPV $M', key: 'k' }].concat(sv.factors.map((f, i) => ({ label: f === 1 ? L('Base', 'الأساس') : (f > 1 ? '+' : '−') + Math.round(Math.abs(f - 1) * 100) + '%', get: r => r.v[i], num: true }))), [{ k: L('Gold price', 'سعر الذهب'), v: sv.price.map(x => TM.usd(x / 1e6)) }, { k: L('Operating cost', 'تكاليف التشغيل'), v: sv.cost.map(x => TM.usd(x / 1e6)) }]);
    }
    // 7 recommendations
    sec(L('7. Recommendations', '7. التوصيات'));
    const recs = TM.AI.cards().map(c => c.text.replace(/<[^>]+>/g, ''));
    if (bm && bm.method !== 'ok') recs.push(L('Use ordinary kriging for the reportable estimate; IDW/NN are suitable as checks.', 'استخدم الكريجنغ العادي للتقدير المعتمد؛ IDW وNN للتحقق فقط.'));
    recs.push(L('Have a Competent Person review the domains, top-cut, variogram and classification before public reporting.', 'يجب أن يراجع الشخص المؤهل المجالات والسقف والتباين والتصنيف قبل الإفصاح العام.'));
    const ol = document.createElement('ol'); ol.className = 'recs'; recs.forEach(r => { const li = document.createElement('li'); li.textContent = r; ol.appendChild(li); }); add(ol); md.push(recs.map((r, i) => `${i + 1}. ${r}`).join('\n'));
    if (/demo|تجريبي/i.test(P.name)) add(UI().html(`<p class="hint">${L('All figures come from synthetic demonstration data.', 'كل الأرقام من بيانات تجريبية اصطناعية.')}</p>`));
    return { el: root, md: md.join('\n') };
  };

  R.open = function (opts = {}) {
    const r = R.build(opts);
    UI().modal({ title: L('Executive Engineering & Resource Report', 'التقرير الهندسي التنفيذي'), body: r.el, wide: true, actions: [
      { label: L('Print / PDF', 'طباعة / PDF'), icon: 'printer', fn: () => R.print(r.el) },
      { label: L('Download HTML', 'تنزيل HTML'), icon: 'download', fn: () => TM.IO.download(R.standalone(r.el), (TM.P.name || 'report').replace(/\s+/g, '_') + '_report.html', 'text/html') },
      { label: L('Copy Markdown', 'نسخ Markdown'), icon: 'copy', fn: () => { navigator.clipboard.writeText(r.md).then(() => TM.UI.toast(L('Copied', 'تم النسخ')), () => TM.UI.toast(L('Copy blocked by the browser', 'منع المتصفح النسخ'))); } }
    ] });
  };
  R.print = function (el) { const pa = document.querySelector('#printArea'); pa.innerHTML = ''; pa.appendChild(el.cloneNode(true)); document.documentElement.classList.add('printing'); setTimeout(() => { window.print(); setTimeout(() => document.documentElement.classList.remove('printing'), 500); }, 50); };
  R.standalone = function (el) {
    const css = [...document.styleSheets].map(ss => { try { return [...ss.cssRules].map(r => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n');
    return `<!doctype html><html lang="${TM.lang}" dir="${TM.lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(TM.P.name)} — report</title><style>${css}\nbody{overflow:auto;padding:24px;height:auto}</style></head><body><div class="rpt">${el.innerHTML}</div></body></html>`;
  };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
