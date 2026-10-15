/* TerraMind Studio — application shell: ribbon commands, dialogs, import wizards, boot. */
(function (TM) {
  'use strict';
  const App = TM.App = {}; const L = TM.L, fmt = TM.fmt, esc = TM.esc; const $ = s => document.querySelector(s);
  const UI = TM.UI, WF = TM.WF, VP = TM.VP, AI = TM.AI;
  const S = () => TM.P.settings;

  // ---------------------------------------------------------------- refresh
  App.refreshAll = function (rebuild3D = true) {
    if (rebuild3D) VP.rebuildAll();
    UI.renderLayers(); UI.renderKPIs(); UI.renderLegend(); AI.renderCards(); App.renderRibbon(); App.renderStatus();
    $('#cogVal').innerHTML = `${fmt(S().cutoff, 2)} <small>${esc(S().gradeUnit)} ${esc(S().gradeField)}</small>`; $('#cog').value = TM.clamp(S().cutoff, +$('#cog').min, +$('#cog').max);
    $('#visBlocks').textContent = TM.P.bm ? `${fmt(VP.bmCount || 0)} ${L('blocks', 'بلوك')}` : '—';
  };
  App.renderStatus = function () {
    const P = TM.P; $('#projName').textContent = P.name; const iss = TM.rt.issues; const c = $('#dbChip');
    if (!P.db.collars.length) { c.className = 'chip'; c.lastElementChild.textContent = L('No drillholes', 'لا توجد آبار'); return; }
    const e = iss ? iss.filter(i => i.sev === 'error').length : 0; c.className = 'chip ' + (e ? 'crit' : 'ok'); c.lastElementChild.textContent = e ? L(`${e} DB errors`, `${e} خطأ في القاعدة`) : L('DB validated', 'القاعدة سليمة');
  };
  // Change events → targeted refresh (cheap ones only)
  TM.on('changed', what => {
    if (App._mute) return;
    switch (what) {
      case 'cutoff': VP.filterBM(); UI.renderKPIs(); UI.renderLegend(); VP.buildHoles(); break;
      case 'db': TM.Drill.rebuild(); VP.buildHoles(); break;
      case 'bm': VP.buildBM(); break;
      case 'pit': VP.buildPit(); VP.filterBM(); break;
      case 'solids': VP.buildSolids(); break;
      case 'strings': VP.buildStrings(); break;
      case 'surfaces': TM.Surf.rebuildTopo(); VP.buildSurfaces(); break;
      case 'infill': VP.buildInfill(); break;
    }
    UI.renderLayers(); UI.renderKPIs(); AI.renderCards(); App.renderStatus(); $('#visBlocks').textContent = TM.P.bm ? `${fmt(VP.bmCount || 0)} ${L('blocks', 'بلوك')}` : '—';
  });
  TM.on('autosaved', d => { $('#saveState').textContent = L('Autosaved ', 'حُفظ تلقائياً ') + d.toLocaleTimeString(); });

  // ---------------------------------------------------------------- ribbon
  const TABS = {
    project: [['newP', 'file-plus'], ['openP', 'folder-open'], ['saveP', 'save'], ['demo', 'sparkles'], '|', ['settings', 'settings'], ['history', 'history']],
    data: [['importDH', 'upload'], ['browse', 'table'], ['validate', 'shield-check'], ['stats', 'bar-chart-3'], ['composite', 'combine'], ['exportComps', 'download']],
    terrain: [['importSurf', 'upload'], ['dtm', 'mountain'], ['contours', 'waves'], '|', ['sketch', 'pen-tool', true], ['cutfill', 'layers'], ['exportStr', 'download']],
    geology: [['slicer', 'scissors', true], ['implicit', 'box'], ['bmShell', 'boxes'], ['solidPit', 'git-merge'], ['exportSolid', 'download']],
    block: [['variogram', 'activity'], ['estimate', 'grid'], ['classify', 'award'], ['gt', 'line-chart'], ['swath', 'bar-chart-2'], ['exportBM', 'download']],
    pit: [['optPit', 'target'], ['pbp', 'trending-up'], ['design', 'trending-down'], ['designStr', 'spline'], ['schedule', 'calendar'], ['sens', 'sliders']],
    ai: [['aiSettings', 'cpu'], ['schemas', 'braces'], ['report', 'file-text'], '|', ['viewTop', 'arrow-down-to-line'], ['viewIso', 'rotate-3d'], ['shot', 'camera']]
  };
  const TAB_LABEL = { project: ['Project', 'المشروع'], data: ['Drillhole Data', 'بيانات الآبار'], terrain: ['Terrain & Strings', 'التضاريس والخطوط'], geology: ['Geological Modeling', 'النمذجة الجيولوجية'], block: ['Block Model & Resources', 'نموذج البلوكات والموارد'], pit: ['Pit Design & Schedule', 'تصميم الحفرة والجدولة'], ai: ['AI & Reports', 'الذكاء والتقارير'] };
  const TOOL_LABEL = {
    newP: ['New', 'جديد'], openP: ['Open .tmd', 'فتح ‎.tmd'], saveP: ['Save .tmd', 'حفظ ‎.tmd'], demo: ['Demo project', 'مشروع تجريبي'], settings: ['Project & economics', 'المشروع والاقتصاديات'], history: ['History', 'السجل'],
    importDH: ['Import drillholes (CSV/Excel)', 'استيراد الآبار (CSV/Excel)'], browse: ['Database browser', 'مستعرض القاعدة'], validate: ['Validate', 'تحقق'], stats: ['Statistics & top-cut', 'الإحصاء والسقف'], composite: ['Composite', 'التركيب'], exportComps: ['Export composites', 'تصدير المركبات'],
    importSurf: ['Import points / .str / DXF / OBJ', 'استيراد نقاط / ‎.str / DXF / OBJ'], dtm: ['Build DTM', 'إنشاء DTM'], contours: ['Contours', 'خطوط الكنتور'], sketch: ['Digitize string', 'رسم خط'], cutfill: ['Cut & fill', 'القطع والردم'], exportStr: ['Export .str / DXF', 'تصدير ‎.str / DXF'],
    slicer: ['Section slicer', 'المقطع الحي'], implicit: ['Implicit grade shell (RBF)', 'غلاف ضمني (RBF)'], bmShell: ['Solid from block model', 'مجسم من النموذج'], solidPit: ['Solid ∩ pit', 'المجسم ∩ الحفرة'], exportSolid: ['Export OBJ/STL/DXF', 'تصدير OBJ/STL/DXF'],
    variogram: ['Variography', 'التباين المكاني'], estimate: ['Estimate (OK/IDW/NN)', 'التقدير (OK/IDW/NN)'], classify: ['Classify resources', 'تصنيف الموارد'], gt: ['Grade-tonnage', 'التركيز-الحمولة'], swath: ['Validation swath', 'تحقق شرائحي'], exportBM: ['Export block model', 'تصدير النموذج'],
    optPit: ['Optimise pit (LG)', 'تحسين الحفرة (LG)'], pbp: ['Pit-by-pit', 'غلافاً بغلاف'], design: ['Bench design', 'تصميم المصاطب'], designStr: ['Design → strings', 'التصميم ← خطوط'], schedule: ['Schedule & cash flow', 'الجدولة والتدفق'], sens: ['Sensitivity', 'الحساسية'],
    aiSettings: ['AI engine & keys', 'محرك الذكاء والمفاتيح'], schemas: ['Tool schemas', 'مخططات الأدوات'], report: ['Executive report', 'التقرير التنفيذي'], viewTop: ['Plan view', 'منظر علوي'], viewIso: ['3D view', 'منظر ثلاثي'], shot: ['Screenshot', 'لقطة شاشة']
  };
  let curTab = 'project';
  App.renderRibbon = function () {
    $('#tabs').innerHTML = Object.keys(TABS).map(k => `<button class="tab" role="tab" type="button" data-tab="${k}" aria-selected="${k === curTab}">${L(...TAB_LABEL[k])}</button>`).join('');
    $('#tools').innerHTML = TABS[curTab].map(t => t === '|' ? '<span class="tool-sep"></span>' : `<button class="tool" type="button" data-tool="${t[0]}" ${t[2] ? `aria-pressed="${App.pressed(t[0])}"` : ''}><i data-lucide="${t[1]}"></i>${L(...TOOL_LABEL[t[0]])}</button>`).join('');
    UI.icons();
  };
  App.pressed = k => k === 'sketch' ? !!VP.sketch : k === 'slicer' ? VP.slice.enabled : false;

  // ---------------------------------------------------------------- commands
  App.cmd = async function (k) {
    try { await (CMD[k] || (() => UI.toast('Unknown command ' + k)))(); }
    catch (e) { console.error(e); UI.toast(e.message || String(e), 'err'); }
  };
  const need = (cond, msg) => { if (!cond) throw new Error(msg); };
  const needBM = () => need(TM.P.bm, L('Estimate a block model first (Block Model → Estimate).', 'قدّر نموذج البلوكات أولاً (نموذج البلوكات ← التقدير).'));
  const needPit = () => need(TM.P.pit, L('Optimise the pit first (Pit Design → Optimise pit).', 'حسّن الحفرة أولاً.'));
  const pickFile = (accept, multiple = false) => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = multiple; i.onchange = () => res(multiple ? [...i.files] : i.files[0]); i.click(); });
  const say = html => AI.addMsg('bot', html);

  const CMD = {
    async newP() { if (TM.rt.dirty && !(await App.confirm(L('Discard unsaved changes?', 'تجاهل التغييرات غير المحفوظة؟')))) return; const f = UI.form([{ id: 'name', label: L('Project name', 'اسم المشروع'), value: L('New project', 'مشروع جديد') }, { id: 'crs', label: L('Coordinate system', 'نظام الإحداثيات'), value: 'Local grid (m)' }], 1); UI.modal({ title: L('New project', 'مشروع جديد'), body: f, actions: [{ label: L('Create', 'إنشاء'), primary: true, fn: () => { const v = f.values(); const P = TM.newProject(v.name); P.crs = v.crs; TM.setProject(P); UI.closeModal(); App.afterLoad(); } }] }); },
    async openP() { const f = await pickFile('.tmd,.json'); if (!f) return; await UI.run(L('Opening project…', 'جارٍ فتح المشروع…'), () => TM.openProjectFile(f)); App.afterLoad(); UI.toast(L('Opened ', 'تم فتح ') + f.name); },
    async saveP() { const n = await TM.saveProjectFile(); UI.toast(L('Saved ', 'تم الحفظ ') + n); },
    async demo() { if (TM.rt.dirty && !(await App.confirm(L('Replace the current project with the demo?', 'استبدال المشروع الحالي بالتجريبي؟')))) return; WF.loadDemo(); App.afterLoad(); say(L('<b>Demo project loaded</b> (synthetic data): 21 holes with downhole surveys, assays, lithology, a topographic survey and two strings. Suggested workflow: validate → top-cut → kriging → pit → schedule → report. The cards above guide each step.', '<b>تم تحميل المشروع التجريبي</b> (بيانات اصطناعية): 21 بئراً بمسوحات وتحاليل وصخارة، ومسح طبوغرافي وخطّان. سير العمل المقترح: تحقق ← سقف ← كريجنغ ← حفرة ← جدولة ← تقرير.')); },
    settings() { App.settingsDialog(); },
    history() { const h = TM.P.history.slice().reverse(); UI.modal({ title: L('Project history', 'سجل المشروع'), body: UI.table([{ label: L('Time', 'الوقت'), get: r => r.t.replace('T', ' ').slice(0, 19) }, { label: L('Action', 'الإجراء'), key: 'action' }, { label: L('Detail', 'التفاصيل'), key: 'detail' }], h), wide: true }); },
    importDH() { App.importWizard(); },
    browse() { App.dbBrowser(); },
    validate() { const r = WF.validate(); App.showIssues(); say(AI.summarize('validate_database', r)); App.renderStatus(); AI.renderCards(); },
    stats() { App.statsDialog(); },
    composite() { const f = UI.form([{ id: 'len', label: L('Composite length (m)', 'طول التركيب (م)'), type: 'number', value: S().compLen, step: 0.5, min: 0.5 }, { id: 'lith', label: L('Restrict to lithology codes (comma separated, optional)', 'تقييد بأكواد صخارة (اختياري)'), value: '' }], 1); UI.modal({ title: L('Composite drillholes', 'تركيب الآبار'), body: f, actions: [{ label: L('Composite', 'تركيب'), primary: true, fn: () => { const v = f.values(); const lith = v.lith ? v.lith.split(',').map(x => x.trim()).filter(Boolean) : null; S().compLen = v.len; const c = TM.Drill.composite(v.len, { lith }); TM.touch('comps'); UI.closeModal(); say(L(`<b>${fmt(c.length)}</b> composites of ${v.len} m${lith ? ' in ' + lith.join(', ') : ''}. Mean ${fmt(TM.stats(c.map(x => x.g)).mean, 3)} g/t (top-cut ${S().topCut || 'none'}).`, `<b>${fmt(c.length)}</b> عينة مركبة بطول ${v.len} م. المتوسط ${fmt(TM.stats(c.map(x => x.g)).mean, 3)} غ/طن.`)); } }] }); },
    exportComps() { const c = TM.Drill.comps(); TM.IO.download(TM.IO.toCSV(['hole', 'from', 'to', 'x', 'y', 'z', S().gradeField, 'length', 'lith'], c.map(x => [x.id, x.from, x.to, x.x, x.y, x.z, x.g, x.len, x.lith])), 'composites.csv', 'text/csv'); },
    importSurf() { App.importSurfaceDialog(); },
    dtm() { App.dtmDialog(); },
    contours() { VP.vis.contours = !VP.vis.contours; VP.buildSurfaces(); UI.renderLayers(); },
    sketch() { App.toggleSketch(); },
    cutfill() { App.cutFillDialog(); },
    exportStr() { App.exportStrings(); },
    slicer() { VP.slice.enabled = !VP.slice.enabled; VP.applySlice(); App.syncSlicer(); App.renderRibbon(); },
    implicit() { App.implicitDialog(); },
    async bmShell() { needBM(); const r = WF.solidFromBM(S().cutoff); say(L(`<b>${r.solid}</b>: ${fmt(r.volume_m3)} m³ (${fmt(r.tonnes / 1e6, 2)} Mt).`, `<b>${r.solid}</b>: ${fmt(r.volume_m3)} م³ (${fmt(r.tonnes / 1e6, 2)} مليون طن).`)); },
    solidPit() { need(TM.P.solids.length, L('No solids in the project.', 'لا توجد مجسمات.')); App.pickSolid(L('Solid ∩ pit', 'المجسم ∩ الحفرة'), id => { const r = WF.solidVsPit(id); say(L(`<b>${r.solid}</b>: ${fmt(r.in_pit_t / 1e6, 2)} Mt inside the selected pit, ${fmt(r.below_pit_t / 1e6, 2)} Mt outside/below (${r.pit_capture_pct}% captured).`, `<b>${r.solid}</b>: ${fmt(r.in_pit_t / 1e6, 2)} مليون طن داخل الحفرة، ${fmt(r.below_pit_t / 1e6, 2)} خارجها (${r.pit_capture_pct}%).`)); }); },
    exportSolid() { need(TM.P.solids.length, L('No solids in the project.', 'لا توجد مجسمات.')); App.pickSolid(L('Export solid', 'تصدير مجسم'), id => { const s = TM.P.solids.find(x => x.id === id); const f = UI.form([{ id: 'fmt', label: L('Format', 'الصيغة'), type: 'select', value: 'obj', options: [['obj', 'OBJ'], ['stl', 'STL (ASCII)'], ['dxf', 'DXF 3DFACE']] }], 1); UI.modal({ title: s.name, body: f, actions: [{ label: L('Download', 'تنزيل'), primary: true, fn: () => { const v = f.values().fmt, n = s.name.replace(/\s+/g, '_'); if (v === 'obj') TM.IO.download(TM.IO.writeOBJ(s), n + '.obj'); else if (v === 'stl') TM.IO.download(TM.IO.writeSTL(s), n + '.stl'); else TM.IO.download(TM.IO.writeDXF({ meshes: [s] }), n + '.dxf'); UI.closeModal(); } }] }); }); },
    variogram() { App.variogramDialog(); },
    estimate() { App.estimateDialog(); },
    classify() { App.classifyDialog(); },
    gt() { needBM(); App.gtDialog(); },
    swath() { needBM(); const v = TM.Est.validateBM(TM.P.bm, TM.Drill.comps()); const body = document.createElement('div'); body.appendChild(UI.html(`<p class="hint">${L(`Composites mean ${fmt(v.comps.mean, 3)} vs blocks mean ${fmt(v.blocks.mean, 3)} (${fmt((v.blocks.mean / v.comps.mean - 1) * 100, 1)}%). Clustered drilling in high grade makes the declustered block mean lower; large swath departures flag bias.`, `متوسط المركبات ${fmt(v.comps.mean, 3)} مقابل متوسط البلوكات ${fmt(v.blocks.mean, 3)}.`)}</p>`)); body.appendChild(UI.chart({ title: L('Swath plot along Easting', 'مخطط شرائحي على الشرقيات'), series: [{ name: L('Composites', 'المركبات'), points: v.swath.map(s => [s.x, s.comp]), dots: true }, { name: L('Blocks', 'البلوكات'), points: v.swath.map(s => [s.x, s.block]), color: 'var(--series-b)', dash: true }], xLabel: 'Easting', yLabel: 'g/t', xFmt: x => fmt(x), yFmt: y => fmt(y, 2) })); UI.modal({ title: L('Estimation validation', 'التحقق من التقدير'), body, wide: true }); },
    exportBM() { needBM(); const bm = TM.P.bm, d = bm.def, rows = []; for (let id = 0; id < bm.N; id++) { if (!isFinite(bm.grade[id])) continue; const i = id % d.nx, j = Math.floor(id / d.nx) % d.ny, k = Math.floor(id / (d.nx * d.ny)); const c = TM.Est.center(d, i, j, k); rows.push([c[0], c[1], c[2], d.dx, d.dy, d.dz, +bm.grade[id].toFixed(4), isFinite(bm.kv[id]) ? +bm.kv[id].toFixed(4) : '', bm.ns[id], bm.cls[id], +(bm.frac[id] / 255).toFixed(3)]); } TM.IO.download(TM.IO.toCSV(['xc', 'yc', 'zc', 'xinc', 'yinc', 'zinc', S().gradeField, 'kvar', 'nsamp', 'class', 'topo_frac'], rows), 'block_model.csv', 'text/csv'); },
    optPit() { needBM(); App.pitDialog(); },
    pbp() { needPit(); App.pbpDialog(); },
    design() { needPit(); const r = WF.designPit(); say(AI.summarize('design_pit', r)); },
    designStr() { needPit(); const r = WF.designToStrings(); say(L(`${r.strings} design strings added (Strings layer, exportable to .str/DXF).`, `أُضيف ${r.strings} خط تصميم (طبقة الخطوط، قابلة للتصدير).`)); },
    schedule() { needPit(); WF.schedule(); App.showSchedule(); },
    sens() { needPit(); App.sensDialog(); },
    aiSettings() { App.aiDialog(); },
    schemas() { UI.modal({ title: L('AI tool schemas (JSON)', 'مخططات أدوات الذكاء (JSON)'), wide: true, body: `<p class="hint">${L('The same schemas are sent to Claude, OpenAI and Gemini function calling; the offline parser emits the same calls.', 'تُرسل نفس المخططات إلى Claude وOpenAI وGemini؛ والمحلل المحلي يصدر نفس الاستدعاءات.')}</p><pre class="json">${esc(JSON.stringify(AI.TOOLS, null, 2))}</pre>` }); },
    report() { TM.Report.open({ name: TM.P.name, sensitivity: true }); },
    viewTop() { VP.view('top'); }, viewIso() { VP.view('iso'); },
    shot() { const a = document.createElement('a'); a.href = VP.screenshot(); a.download = 'terramind_view.png'; a.click(); }
  };
  App.CMD = CMD;

  App.confirm = msg => new Promise(res => { UI.modal({ title: L('Confirm', 'تأكيد'), body: `<p>${esc(msg)}</p>`, actions: [{ label: L('Cancel', 'إلغاء'), fn: () => { UI.closeModal(true); res(false); } }, { label: L('Continue', 'متابعة'), primary: true, fn: () => { UI.closeModal(true); res(true); } }], onClose: () => res(false) }); });
  App.pickSolid = function (title, cb) { const f = UI.form([{ id: 'sid', label: L('Solid', 'المجسم'), type: 'select', value: TM.P.solids[TM.P.solids.length - 1].id, options: TM.P.solids.map(s => [s.id, s.name]) }], 1); UI.modal({ title, body: f, actions: [{ label: 'OK', primary: true, fn: () => { const id = f.values().sid; UI.closeModal(); cb(id); } }] }); };

  // ---------------------------------------------------------------- settings
  App.settingsDialog = function () {
    const s = S(); const f = UI.form([
      { type: 'section', label: L('Project', 'المشروع') }, { id: 'name', label: L('Name', 'الاسم'), value: TM.P.name }, { id: 'crs', label: L('Coordinate system', 'نظام الإحداثيات'), value: TM.P.crs },
      { id: 'gradeField', label: L('Grade field', 'حقل التركيز'), type: 'select', value: s.gradeField, options: (TM.P.db.fields.length ? TM.P.db.fields : [s.gradeField]).map(x => [x, x]) }, { id: 'gradeUnit', label: L('Grade unit', 'وحدة التركيز'), value: s.gradeUnit },
      { id: 'density', label: L('Density (t/m³)', 'الكثافة (طن/م³)'), type: 'number', step: 0.01, value: s.density },
      { type: 'section', label: L('Economics', 'الاقتصاديات') },
      { id: 'price', label: L('Metal price ($/oz)', 'سعر المعدن ($/أونصة)'), type: 'number', step: 10, value: s.price }, { id: 'sellCost', label: L('Selling & refining ($/oz)', 'البيع والتكرير ($/أونصة)'), type: 'number', step: 1, value: s.sellCost },
      { id: 'recovery', label: L('Recovery (%)', 'الاستخلاص (%)'), type: 'number', step: 0.5, value: s.recovery }, { id: 'mineCost', label: L('Mining cost ($/t moved)', 'تكلفة التعدين ($/طن)'), type: 'number', step: 0.1, value: s.mineCost },
      { id: 'procCost', label: L('Processing ($/t ore)', 'المعالجة ($/طن خام)'), type: 'number', step: 0.5, value: s.procCost }, { id: 'gaCost', label: L('G&A ($/t ore)', 'إدارية ($/طن خام)'), type: 'number', step: 0.5, value: s.gaCost },
      { id: 'capex', label: L('Capex ($M)', 'رأس المال (مليون $)'), type: 'number', step: 1, value: s.capex / 1e6 }, { id: 'closure', label: L('Closure ($M)', 'الإغلاق (مليون $)'), type: 'number', step: 0.5, value: s.closure / 1e6 },
      { id: 'millRate', label: L('Mill capacity (Mt/yr)', 'طاقة المصنع (مليون طن/سنة)'), type: 'number', step: 0.1, value: s.millRate / 1e6 }, { id: 'mineRate', label: L('Mining capacity (Mt/yr)', 'طاقة التعدين (مليون طن/سنة)'), type: 'number', step: 0.5, value: s.mineRate / 1e6 },
      { id: 'discount', label: L('Discount rate (%)', 'معدل الخصم (%)'), type: 'number', step: 0.5, value: s.discount },
      { type: 'section', label: L('Pit geometry', 'هندسة الحفرة') },
      { id: 'slope', label: L('Overall slope (°)', 'الميل الكلي (°)'), type: 'number', step: 1, value: s.slope }, { id: 'benchH', label: L('Bench height (m)', 'ارتفاع المصطبة (م)'), type: 'number', step: 1, value: s.benchH },
      { id: 'batter', label: L('Batter angle (°)', 'ميل الوجه (°)'), type: 'number', step: 1, value: s.batter }
    ], 2);
    const e = TM.Mine.econ(); f.appendChild(UI.html(`<p class="hint wide">${L(`Marginal cut-off ${fmt(e.marginalCOG, 2)} g/t · break-even (incl. mining) ${fmt(e.breakevenCOG, 2)} g/t at current inputs.`, `حد القطع الحدي ${fmt(e.marginalCOG, 2)} غ/طن · نقطة التعادل ${fmt(e.breakevenCOG, 2)} غ/طن.`)}</p>`));
    UI.modal({ title: L('Project & economics', 'المشروع والاقتصاديات'), body: f, wide: true, actions: [{ label: L('Apply', 'تطبيق'), primary: true, fn: () => { const v = f.values(); TM.P.name = v.name; TM.P.crs = v.crs; Object.assign(s, { gradeField: v.gradeField, gradeUnit: v.gradeUnit, density: v.density, price: v.price, sellCost: v.sellCost, recovery: v.recovery, mineCost: v.mineCost, procCost: v.procCost, gaCost: v.gaCost, capex: v.capex * 1e6, closure: v.closure * 1e6, millRate: v.millRate * 1e6, mineRate: v.mineRate * 1e6, discount: v.discount, slope: v.slope, benchH: v.benchH, batter: v.batter }); TM.Drill.rebuild(); if (TM.P.pit) TM.P.pit.stale = true; TM.touch('settings'); UI.closeModal(); App.refreshAll(false); VP.buildHoles(); } }] });
  };

  // ---------------------------------------------------------------- import wizard (collar / survey / assay / lithology)
  App.importWizard = function () {
    const body = document.createElement('div');
    body.innerHTML = `<p class="hint">${L('Choose one Excel workbook (sheets named collar/survey/assay/lith) or separate CSV/Excel files per table. Columns are matched automatically; adjust the mapping before importing. Dips may be negative-down or positive-down.', 'اختر ملف Excel واحداً (أوراق collar/survey/assay/lith) أو ملفات CSV/Excel منفصلة لكل جدول. تتم مطابقة الأعمدة تلقائياً ويمكنك تعديلها قبل الاستيراد.')}</p>
      <div class="form cols2">${[['collar', L('Collars *', 'الأطواق *')], ['survey', L('Surveys', 'المسوحات')], ['assay', L('Assays *', 'التحاليل *')], ['lith', L('Lithology', 'الصخارة')], ['book', L('…or one workbook', '…أو ملف عمل واحد')]].map(([k, l]) => `<label class="fld"><span>${l}</span><input type="file" data-t="${k}" accept=".csv,.txt,.xlsx,.xls"></label>`).join('')}</div><div id="mapArea"></div>
      <p class="hint">${L('Sample files: samples/demo_collar.csv, demo_survey.csv, demo_assay.csv, demo_lith.csv in the repository.', 'ملفات نموذجية: samples/demo_collar.csv وغيرها في المستودع.')}</p>`;
    const tables = {}; const FIELDS = { collar: ['hole', 'x', 'y', 'z', 'depth'], survey: ['hole', 'at', 'az', 'dip'], assay: ['hole', 'from', 'to'], lith: ['hole', 'from', 'to', 'code'] };
    const renderMap = () => {
      const area = body.querySelector('#mapArea'); area.innerHTML = '';
      for (const t of ['collar', 'survey', 'assay', 'lith']) {
        const tb = tables[t]; if (!tb) continue; const m = tb.map; const opts = ['<option value="-1">—</option>'].concat(tb.header.map((h, i) => `<option value="${i}">${esc(h)}</option>`)).join('');
        let h = `<div class="form-sec">${t} · ${fmt(tb.rows.length)} ${L('rows', 'صف')}</div><div class="map-grid">` + FIELDS[t].map(f => `<label class="fld"><span>${f}</span><select data-map="${t}.${f}">${opts}</select></label>`).join('');
        if (t === 'assay') { const used = new Set(Object.values(m)); h += `<label class="fld wide"><span>${L('Grade columns', 'أعمدة التركيز')}</span><select multiple size="4" data-grades>${tb.header.map((x, i) => `<option value="${i}" ${(!used.has(i) && tb.rows.slice(0, 50).some(r => isFinite(TM.IO.num(r[i])))) ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>`; }
        area.insertAdjacentHTML('beforeend', h + '</div>'); FIELDS[t].forEach(f => { area.querySelector(`[data-map="${t}.${f}"]`).value = m[f]; });
      }
    };
    body.addEventListener('change', async e => {
      const inp = e.target; if (inp.dataset.t) { const file = inp.files[0]; if (!file) return; try { const tb = await TM.IO.readTable(file);
        if (inp.dataset.t === 'book') { const sh = tb.sheets || {}; for (const [name, t] of Object.entries(sh)) { const n = name.toLowerCase(); const k = /coll/.test(n) ? 'collar' : /surv/.test(n) ? 'survey' : /assay|grade|sample/.test(n) ? 'assay' : /lith|geol|rock/.test(n) ? 'lith' : null; if (k) { t.map = TM.IO.autoMap(t.header, FIELDS[k]); tables[k] = t; } } }
        else { tb.map = TM.IO.autoMap(tb.header, FIELDS[inp.dataset.t]); tables[inp.dataset.t] = tb; }
        renderMap(); } catch (err) { UI.toast(err.message, 'err'); } }
      if (inp.dataset.map) { const [t, f] = inp.dataset.map.split('.'); tables[t].map[f] = +inp.value; }
    });
    UI.modal({ title: L('Import drillhole database', 'استيراد قاعدة بيانات الآبار'), body, wide: true, actions: [{ label: L('Import', 'استيراد'), primary: true, fn: () => {
      if (!tables.collar || !tables.assay) { UI.toast(L('Collar and assay tables are required.', 'جدولا الأطواق والتحاليل مطلوبان.'), 'err'); return; }
      const gs = body.querySelector('[data-grades]'); tables.assay.gradeCols = gs ? [...gs.selectedOptions].map(o => +o.value) : [];
      if (!tables.assay.gradeCols.length) { UI.toast(L('Select at least one grade column.', 'اختر عموداً واحداً للتركيز على الأقل.'), 'err'); return; }
      const db = TM.Drill.importTables(tables); const P = TM.P; P.db = db; P.settings.gradeField = db.fields[0]; P.bm = null; P.pit = null; P.settings.topCut = null; P.settings.variogram = null;
      TM.Drill.rebuild(); TM.logHistory('import', `${db.collars.length} collars, ${db.assays.length} assays`); TM.touch('db'); UI.closeModal(); App.afterLoad();
      const r = WF.validate(); say(L(`<b>Imported</b> ${db.collars.length} holes, ${fmt(db.surveys.length)} surveys, ${fmt(db.assays.length)} assays (${db.fields.join(', ')}), ${fmt(db.lith.length)} lithology intervals. Validation: ${r.errors} errors, ${r.warnings} warnings.`, `<b>تم الاستيراد</b>: ${db.collars.length} بئراً، ${fmt(db.surveys.length)} مسحاً، ${fmt(db.assays.length)} تحليلاً، ${fmt(db.lith.length)} فترة صخارة. التحقق: ${r.errors} خطأ و${r.warnings} تحذير.`)); if (r.errors) App.showIssues();
    } }] });
  };
  App.showIssues = function () { const iss = TM.rt.issues || TM.Drill.validate(); UI.modal({ title: L('Validation report', 'تقرير التحقق'), wide: true, body: iss.length ? UI.table([{ label: L('Severity', 'الأهمية'), get: r => r.sev, }, { label: L('Hole', 'البئر'), key: 'hole' }, { label: L('Table', 'الجدول'), key: 'table' }, { label: L('Issue', 'المشكلة'), key: 'msg' }], iss.map(i => Object.assign({ _cls: 'sev-' + i.sev }, i))) : `<p>${L('No issues found.', 'لا توجد مشكلات.')}</p>`, actions: [{ label: L('Auto-fix overlaps & duplicates', 'إصلاح التداخلات والمكررات'), primary: true, fn: () => { const r = TM.Drill.fix(); WF.validate(); UI.closeModal(); say(L(`Fixed ${r.overlaps} overlaps, ${r.duplicates} duplicates, clipped ${r.clipped} intervals.`, `أُصلح ${r.overlaps} تداخل و${r.duplicates} مكرر.`)); App.refreshAll(false); } }] }); };
  App.dbBrowser = function () {
    const body = document.createElement('div'); const db = TM.P.db; const tabs = [['collars', L('Collars', 'الأطواق')], ['surveys', L('Surveys', 'المسوحات')], ['assays', L('Assays', 'التحاليل')], ['lith', L('Lithology', 'الصخارة')]];
    body.innerHTML = `<div class="seg" id="dbTabs">${tabs.map(([k, l], i) => `<button type="button" data-k="${k}" aria-pressed="${i === 0}">${l} (${fmt(db[k].length)})</button>`).join('')}</div><input id="dbFilter" class="search" placeholder="${L('Filter by hole ID…', 'تصفية برقم البئر…')}"><div id="dbTable"></div>`;
    const show = () => { const k = body.querySelector('#dbTabs [aria-pressed=true]').dataset.k, q = body.querySelector('#dbFilter').value.trim().toLowerCase(); const rows = db[k].filter(r => !q || String(r.id).toLowerCase().includes(q)); const cols = rows.length ? Object.keys(rows[0]).map(c => ({ label: c, key: c, num: typeof rows[0][c] === 'number', fmt: v => typeof v === 'number' ? fmt(v, Math.abs(v) < 100 ? 3 : 2) : v })) : []; const t = body.querySelector('#dbTable'); t.innerHTML = ''; t.appendChild(UI.table(cols, rows, { max: 400 })); };
    body.addEventListener('click', e => { const b = e.target.closest('#dbTabs button'); if (b) { body.querySelectorAll('#dbTabs button').forEach(x => x.setAttribute('aria-pressed', x === b)); show(); } });
    body.addEventListener('input', e => { if (e.target.id === 'dbFilter') show(); });
    UI.modal({ title: L('Drillhole database', 'قاعدة بيانات الآبار'), body, wide: true, actions: [{ label: L('Export assays CSV', 'تصدير التحاليل CSV'), icon: 'download', fn: () => { const keys = Object.keys(db.assays[0] || { id: 0 }); TM.IO.download(TM.IO.toCSV(keys, db.assays.map(a => keys.map(k => a[k]))), 'assays.csv', 'text/csv'); } }] }); show();
  };
  App.statsDialog = function () {
    const raw = TM.rt.holes.flatMap(h => h.samples.map(s => s.g)).filter(isFinite); need(raw.length, L('No assays.', 'لا توجد تحاليل.')); const st = TM.stats(raw), sug = TM.Drill.suggestTopCut();
    const body = document.createElement('div'); body.appendChild(UI.html(`<div class="kgrid">${[['n', fmt(st.n)], ['mean', fmt(st.mean, 3)], ['median', fmt(st.median, 3)], ['CV', fmt(st.cv, 2)], ['P99', fmt(st.p99, 2)], ['max', fmt(st.max, 2)]].map(([a, b]) => `<div class="kbox"><div class="kpi-k">${a}</div><div class="kpi-v">${b}</div></div>`).join('')}</div><p class="hint">${L(`Suggested top-cut ${fmt(sug.value, 2)} g/t (${sug.nAbove} samples above; rule: ${sug.rule} — first >1.8× jump in the top 1% of assays, else P99 when CV > 2).`, `السقف المقترح ${fmt(sug.value, 2)} غ/طن (${sug.nAbove} عينة فوقه).`)}</p>`));
    const ch = document.createElement('div'); ch.className = 'charts'; ch.appendChild(UI.histogram(raw, { log: true, marker: S().topCut || sug.value, xLabel: S().gradeField, title: L('Histogram', 'المدرج التكراري') })); ch.appendChild(UI.probPlot(raw, { marker: S().topCut || sug.value, title: L('Log-probability', 'الاحتمال اللوغاريتمي') })); body.appendChild(ch);
    const f = UI.form([{ id: 'tc', label: L('Top-cut (g/t, empty = none)', 'السقف (غ/طن، فارغ = بدون)'), type: 'number', step: 0.1, value: S().topCut != null ? S().topCut : sug.value }], 1); body.appendChild(f);
    UI.modal({ title: L('Assay statistics & top-cut', 'إحصاء التحاليل والسقف'), body, wide: true, actions: [{ label: L('Apply top-cut', 'تطبيق السقف'), primary: true, fn: () => { const v = f.values().tc; const r = WF.audit({ apply_top_cut: v || 0, fix_overlaps: false }); UI.closeModal(); say(AI.summarize('audit_drillholes', r)); App.refreshAll(false); VP.buildHoles(); } }] });
  };

  // ---------------------------------------------------------------- surfaces & strings
  App.importSurfaceDialog = async function () {
    const files = await pickFile('.csv,.txt,.xyz,.str,.dxf,.obj', true); if (!files || !files.length) return;
    for (const file of files) {
      const n = file.name.toLowerCase(), base = file.name.replace(/\.[^.]+$/, '');
      try {
        if (n.endsWith('.str')) { const ss = TM.IO.readSTR(await file.text(), base); TM.P.strings.push(...ss); TM.touch('strings'); say(L(`${ss.length} string(s) from ${file.name}. Use Terrain → Build DTM to triangulate them.`, `${ss.length} خط من ${file.name}.`)); }
        else if (n.endsWith('.dxf')) { const r = TM.IO.readDXF(await file.text()); r.strings.forEach(s => TM.P.strings.push({ id: TM.uid('str'), name: s.name, closed: s.closed, pts: s.pts, color: '#F59E0B', strNo: 1 })); if (r.faces.length) { const m = TM.IO.facesToMesh(r.faces, base); TM.P.solids.push(TM.Solid.make(base, m, { source: 'DXF', color: '#A78BFA' })); TM.touch('solids'); } if (r.points.length > 3) { const s = { id: TM.uid('srf'), name: base, role: TM.P.surfaces.some(x => x.role === 'topo') ? 'surface' : 'topo', pts: new Float64Array(r.points.flat()), tri: null }; TM.Surf.ensureTri(s); TM.P.surfaces.push(s); TM.touch('surfaces'); } TM.touch('strings'); say(`${file.name}: ${r.strings.length} ${L('strings', 'خطوط')}, ${r.faces.length} ${L('faces', 'أوجه')}, ${r.points.length} ${L('points', 'نقاط')}.`); }
        else if (n.endsWith('.obj')) { const m = TM.IO.readOBJ(await file.text(), base); TM.P.solids.push(TM.Solid.make(base, m, { source: 'OBJ', color: '#A78BFA' })); TM.touch('solids'); say(`${file.name}: ${fmt(m.idx.length / 3)} ${L('triangles', 'مثلث')}.`); }
        else { const t = TM.IO.parseCSV(await file.text()); const m = TM.IO.autoMap(t.header, ['x', 'y', 'z']); const hasHdr = m.x >= 0 && m.y >= 0 && m.z >= 0; const rows = hasHdr ? t.rows : [t.header].concat(t.rows); const ix = hasHdr ? [m.x, m.y, m.z] : [0, 1, 2]; const pts = []; for (const r of rows) { const v = ix.map(i => TM.IO.num(r[i])); if (v.every(isFinite)) pts.push(...v); }
          need(pts.length >= 9, L('Need at least 3 XYZ points.', 'تحتاج 3 نقاط على الأقل.')); const s = { id: TM.uid('srf'), name: base, role: TM.P.surfaces.some(x => x.role === 'topo') ? 'surface' : 'topo', pts: TM.Surf.dedupe(pts), tri: null, color: '#6b7d5e' }; TM.Surf.ensureTri(s); TM.P.surfaces.push(s); TM.touch('surfaces'); say(L(`DTM <b>${base}</b>: ${fmt(s.pts.length / 3)} points, ${fmt(s.tri.length / 3)} triangles${s.role === 'topo' ? ' (set as topography)' : ''}.`, `سطح <b>${base}</b>: ${fmt(s.pts.length / 3)} نقطة، ${fmt(s.tri.length / 3)} مثلث.`)); }
      } catch (e) { UI.toast(`${file.name}: ${e.message}`, 'err'); }
    }
    App.refreshAll(true);
  };
  App.dtmDialog = function () {
    const P = TM.P; const f = UI.form([{ id: 'src', label: L('Source', 'المصدر'), type: 'select', value: 'strings', options: [['strings', L('All visible strings', 'كل الخطوط الظاهرة')], ['design', L('Pit design strings (Pit_RL*)', 'خطوط تصميم الحفرة')]] }, { id: 'name', label: L('Surface name', 'اسم السطح'), value: 'DTM_' + (P.surfaces.length + 1) }, { id: 'topo', label: L('Use as topography', 'استخدامه كطبوغرافيا'), type: 'check', value: !P.surfaces.some(s => s.role === 'topo') }], 1);
    UI.modal({ title: L('Build DTM from strings', 'إنشاء DTM من الخطوط'), body: f, actions: [{ label: L('Triangulate', 'تثليث'), primary: true, fn: () => { const v = f.values(); const ss = P.strings.filter(s => !VP.hidden.has(s.id) && (v.src !== 'design' || /^Pit_RL/.test(s.name))); if (ss.length < 1) { UI.toast(L('No strings to triangulate.', 'لا توجد خطوط.'), 'err'); return; } const s = TM.Surf.fromStrings(ss, v.name); if (v.topo) { P.surfaces.forEach(x => { if (x.role === 'topo') x.role = 'surface'; }); s.role = 'topo'; } P.surfaces.push(s); TM.touch('surfaces'); UI.closeModal(); App.refreshAll(true); say(L(`<b>${v.name}</b>: ${fmt(s.pts.length / 3)} points → ${fmt(s.tri.length / 3)} triangles.`, `<b>${v.name}</b>: ${fmt(s.pts.length / 3)} نقطة ← ${fmt(s.tri.length / 3)} مثلث.`)); } }] });
  };
  App.toggleSketch = function () {
    if (VP.sketch) { App.finishSketch(); return; }
    VP.sketch = { pts: [], onDone: () => App.finishSketch() }; $('#view').classList.add('sketching'); App.renderRibbon();
    UI.toast(L('Click on the terrain to add vertices; double-click or press Enter to finish, Esc to cancel.', 'انقر على السطح لإضافة نقاط؛ نقرة مزدوجة أو Enter للإنهاء وEsc للإلغاء.'));
  };
  App.finishSketch = function (cancel) {
    const sk = VP.sketch; VP.sketch = null; $('#view').classList.remove('sketching'); VP.sketchPreview(null); App.renderRibbon(); if (cancel || !sk || sk.pts.length < 2) return;
    const f = UI.form([{ id: 'name', label: L('String name', 'اسم الخط'), value: 'String_' + (TM.P.strings.length + 1) }, { id: 'closed', label: L('Closed polygon', 'مضلع مغلق'), type: 'check', value: sk.pts.length > 2 }], 1);
    UI.modal({ title: L('Save string', 'حفظ الخط'), body: f, actions: [{ label: L('Save', 'حفظ'), primary: true, fn: () => { const v = f.values(); TM.P.strings.push({ id: TM.uid('str'), name: v.name, closed: v.closed, pts: sk.pts, color: '#F59E0B', strNo: TM.P.strings.length + 1 }); TM.touch('strings'); UI.closeModal(); const len = sk.pts.reduce((a, p, i) => i ? a + Math.hypot(p[0] - sk.pts[i - 1][0], p[1] - sk.pts[i - 1][1]) : 0, 0); say(L(`String <b>${v.name}</b>: ${sk.pts.length} vertices, ${fmt(len, 1)} m${v.closed ? `, area ${fmt(TM.Surf.polyArea(sk.pts))} m²` : ''}.`, `الخط <b>${v.name}</b>: ${sk.pts.length} نقطة، ${fmt(len, 1)} م.`)); } }] });
  };
  App.cutFillDialog = function () {
    const polys = TM.P.strings.filter(s => s.closed && s.pts.length > 2); need(polys.length, L('Digitize or import a closed string (polygon) first.', 'ارسم أو استورد مضلعاً مغلقاً أولاً.'));
    const surf = TM.P.surfaces.filter(s => s.role !== 'topo'); const f = UI.form([{ id: 'poly', label: L('Boundary polygon', 'المضلع الحدّي'), type: 'select', value: polys[polys.length - 1].id, options: polys.map(s => [s.id, s.name]) }, { id: 'mode', label: L('Design', 'التصميم'), type: 'select', value: 'pad', options: [['pad', L('Level pad at RL', 'منصة أفقية عند منسوب')]].concat(surf.map(s => ['srf:' + s.id, L('Surface: ', 'سطح: ') + s.name])) }, { id: 'rl', label: L('Pad RL (empty = mean of polygon)', 'منسوب المنصة (فارغ = المتوسط)'), type: 'number', step: 0.1, value: '' }], 1);
    UI.modal({ title: L('Cut & fill volume', 'حجم القطع والردم'), body: f, actions: [{ label: L('Calculate', 'احسب'), primary: true, fn: () => { const v = f.values(); const poly = polys.find(p => p.id === v.poly).pts; let design, dl; if (v.mode === 'pad') { const rl = v.rl != null ? v.rl : poly.reduce((a, p) => a + TM.topoZ(p[0], p[1]), 0) / poly.length; design = rl; dl = `RL ${fmt(rl, 2)}`; } else { const s = TM.P.surfaces.find(x => 'srf:' + x.id === v.mode); design = TM.Surf.tinOf(s); dl = s.name; } const r = TM.Surf.cutFill(poly, design, 2); UI.closeModal(); say(L(`<b>Cut & fill</b> vs ${dl} over ${fmt(r.area)} m²: cut ${fmt(r.cut)} m³, fill ${fmt(r.fill)} m³, net ${r.net >= 0 ? '+' : '−'}${fmt(Math.abs(r.net))} m³ (${fmt(r.cut * S().density)} t cut).`, `<b>القطع والردم</b> مقابل ${dl} على ${fmt(r.area)} م²: قطع ${fmt(r.cut)} م³، ردم ${fmt(r.fill)} م³، الصافي ${fmt(r.net)} م³.`)); } }] });
  };
  App.exportStrings = function () { need(TM.P.strings.length, L('No strings.', 'لا توجد خطوط.')); const f = UI.form([{ id: 'fmt', label: L('Format', 'الصيغة'), type: 'select', value: 'str', options: [['str', 'Surpac .str'], ['dxf', 'DXF (3D polylines)'], ['csv', 'CSV']] }], 1); UI.modal({ title: L('Export strings', 'تصدير الخطوط'), body: f, actions: [{ label: L('Download', 'تنزيل'), primary: true, fn: () => { const v = f.values().fmt, ss = TM.P.strings.filter(s => !VP.hidden.has(s.id)); if (v === 'str') TM.IO.download(TM.IO.writeSTR(ss, TM.P.name), 'strings.str'); else if (v === 'dxf') TM.IO.download(TM.IO.writeDXF({ strings: ss }), 'strings.dxf'); else TM.IO.download(TM.IO.toCSV(['string', 'name', 'x', 'y', 'z'], ss.flatMap(s => s.pts.map(p => [s.strNo || 1, s.name, ...p]))), 'strings.csv', 'text/csv'); UI.closeModal(); } }] }); };

  // ---------------------------------------------------------------- geology
  App.implicitDialog = function () {
    const f = UI.form([{ id: 'th', label: L('Grade threshold (g/t)', 'حد التركيز (غ/طن)'), type: 'number', step: 0.05, value: S().cutoff }, { id: 'cell', label: L('Resolution (m)', 'الدقة (م)'), type: 'number', step: 1, value: 6, min: 2 }, { id: 'name', label: L('Solid name', 'اسم المجسم'), value: '' }], 1);
    f.appendChild(UI.html(`<p class="hint wide">${L('Fits a cubic RBF to the composites (signed grade indicator), honouring the variogram anisotropy when available, then extracts a closed iso-surface.', 'يلائم دالة RBF تكعيبية على العينات المركبة مع تباين الاتجاهات ثم يستخرج سطحاً مغلقاً.')}</p>`));
    UI.modal({ title: L('Implicit grade shell (RBF)', 'غلاف تركيز ضمني (RBF)'), body: f, actions: [{ label: L('Build', 'بناء'), primary: true, fn: async () => { const v = f.values(); UI.closeModal(); const r = await UI.run(L('Building implicit model…', 'جارٍ بناء النموذج الضمني…'), p => WF.implicitShell({ threshold: v.th, cell: v.cell, name: v.name || undefined }, p)); say(AI.summarize('build_grade_shell', r)); } }] });
  };

  // ---------------------------------------------------------------- estimation dialogs
  App.variogramDialog = function () {
    const comps = TM.Drill.comps(); need(comps.length > 30, L('Not enough composites.', 'عدد المركبات غير كافٍ.'));
    const body = document.createElement('div'); const f = UI.form([{ id: 'lag', label: L('Lag (m)', 'الخطوة (م)'), type: 'number', value: 10, step: 1 }, { id: 'n', label: L('Number of lags', 'عدد الخطوات'), type: 'number', value: 14, step: 1 }], 2); body.appendChild(f);
    const out = document.createElement('div'); body.appendChild(out);
    const run = () => { const v = f.values(); const r = WF.variography({ lag: v.lag, nLags: v.n }); const m = r.model, vm = TM.Est.makeModel(m); out.innerHTML = '';
      out.appendChild(UI.html(`<p class="hint">${L(`Fitted spherical model: nugget ${fmt(m.nugget, 3)}, sill ${fmt(m.sill, 3)} (${fmt(m.nugget / m.sill * 100, 0)}% nugget), ranges ${m.ranges.join(' / ')} m, major axis azimuth ${m.azi}° dip ${m.dip}°.`, `نموذج كروي: نوجيت ${fmt(m.nugget, 3)}، عتبة ${fmt(m.sill, 3)}، مدى ${m.ranges.join(' / ')} م، سمت المحور الرئيسي ${m.azi}° وميله ${m.dip}°.`)}</p>`));
      const ch = document.createElement('div'); ch.className = 'charts'; const curve = (r1) => Array.from({ length: 41 }, (_, i) => { const h = i / 40 * v.lag * v.n; return [h, vm.gammaH(h / r1)]; });
      ch.appendChild(UI.chart({ title: L('Omni-directional', 'كل الاتجاهات'), series: [{ name: L('experimental', 'تجريبي'), points: r.omni.map(p => [p.h, p.g]), dots: true, line: false }, { name: L('model (major)', 'النموذج'), points: curve(m.ranges[0]), color: 'var(--series-b)' }], xLabel: 'h (m)', yLabel: 'γ(h)', xFmt: x => fmt(x), yFmt: y => fmt(y, 2) }));
      ch.appendChild(UI.chart({ title: L('Directional: major / semi / minor', 'اتجاهي: رئيسي / ثانوي / أصغر'), series: [{ name: L('semi-major (exp.)', 'الثانوي (تجريبي)'), points: r.semi.map(p => [p.h, p.g]), dots: true, line: false }, { name: L('major model', 'نموذج الرئيسي'), points: curve(m.ranges[0]), color: 'var(--series-b)' }, { name: L('semi model', 'نموذج الثانوي'), points: curve(m.ranges[1]), color: 'var(--series-c)', dash: true }, { name: L('minor model', 'نموذج الأصغر'), points: curve(m.ranges[2]), color: 'var(--series-d)', dash: true }], xLabel: 'h (m)', yLabel: 'γ(h)', xFmt: x => fmt(x), yFmt: y => fmt(y, 2) }));
      out.appendChild(ch);
      out.appendChild(UI.table([{ label: L('Azimuth', 'السمت'), key: 'az' }, { label: L('Fitted range (m)', 'المدى (م)'), get: r => fmt(r.range), num: true }], r.fan)); };
    UI.modal({ title: L('Variography (auto-fit)', 'التباين المكاني (ملاءمة تلقائية)'), body, wide: true, actions: [{ label: L('Recalculate', 'إعادة الحساب'), fn: run }, { label: L('Use model', 'اعتماد النموذج'), primary: true, fn: () => { UI.closeModal(); say(L('Variogram model stored; ordinary kriging will use it.', 'حُفظ نموذج التباين؛ سيستخدمه الكريجنغ.')); } }] });
    setTimeout(run, 30);
  };
  App.estimateDialog = function () {
    const f = UI.form([{ id: 'method', label: L('Method', 'الطريقة'), type: 'select', value: 'ok', options: [['ok', L('Ordinary kriging (block)', 'كريجنغ عادي (بلوك)')], ['idw', L('Inverse distance (IDW)', 'مقلوب المسافة')], ['nn', L('Nearest neighbour', 'أقرب جار')]] }, { id: 'power', label: L('IDW power', 'أس IDW'), type: 'number', value: 2, step: 0.5 }, { id: 'dx', label: 'Block X (m)', type: 'number', value: 5, step: 1 }, { id: 'dy', label: 'Block Y (m)', type: 'number', value: 5, step: 1 }, { id: 'dz', label: 'Block Z (m)', type: 'number', value: 5, step: 1 }, { id: 'domain', label: L('Domain solid', 'مجسم المجال'), type: 'select', value: '', options: [['', L('None (all below topography)', 'بدون (كل ما تحت السطح)')]].concat(TM.P.solids.map(s => [s.id, s.name])) }, { id: 'minS', label: L('Min samples', 'أقل عدد عينات'), type: 'number', value: 4 }, { id: 'maxS', label: L('Max samples', 'أكثر عدد عينات'), type: 'number', value: 16 }, { id: 'mph', label: L('Max per hole', 'أقصى عدد لكل بئر'), type: 'number', value: 4 }, { id: 'sf', label: L('Search = variogram range ×', 'البحث = مدى التباين ×'), type: 'number', value: 1.2, step: 0.1 }], 2);
    const v0 = S().variogram; f.appendChild(UI.html(`<p class="hint wide">${v0 ? L(`Variogram: ranges ${v0.ranges.join('/')} m, azimuth ${v0.azi}°, dip ${v0.dip}°.`, `التباين: مدى ${v0.ranges.join('/')} م.`) : L('No variogram yet — one will be auto-fitted.', 'لا يوجد تباين — سيُلاءم تلقائياً.')} ${L('Top-cut', 'السقف')}: ${S().topCut || L('none', 'لا يوجد')}. ${L('Composites', 'المركبات')}: ${fmt(TM.Drill.comps().length)} × ${S().compLen} m.</p>`));
    UI.modal({ title: L('Block model estimation', 'تقدير نموذج البلوكات'), body: f, wide: true, actions: [{ label: L('Estimate', 'تقدير'), primary: true, fn: async () => { const v = f.values(); UI.closeModal(); const r = await UI.run(L('Estimating block model…', 'جارٍ تقدير نموذج البلوكات…'), p => WF.estimate({ method: v.method, power: v.power, dx: v.dx, dy: v.dy, dz: v.dz, domain: v.domain || null, minS: v.minS, maxS: v.maxS, maxPerHole: v.mph, searchFactor: v.sf }, p)); say(AI.summarize('run_estimation', r)); App.refreshAll(false); } }] });
  };
  App.classifyDialog = function () { needBM(); const r0 = TM.P.bm.classRules || {}; const f = UI.form([{ id: 'mDist', label: L('Measured: avg distance ≤ (m)', 'مقاس: متوسط المسافة ≤ (م)'), type: 'number', value: r0.mDist || 30 }, { id: 'mHoles', label: L('Measured: holes ≥', 'مقاس: آبار ≥'), type: 'number', value: r0.mHoles || 3 }, { id: 'mSamples', label: L('Measured: samples ≥', 'مقاس: عينات ≥'), type: 'number', value: r0.mSamples || 8 }, { id: 'iDist', label: L('Indicated: avg distance ≤ (m)', 'مؤشر: متوسط المسافة ≤ (م)'), type: 'number', value: r0.iDist || 60 }, { id: 'iHoles', label: L('Indicated: holes ≥', 'مؤشر: آبار ≥'), type: 'number', value: r0.iHoles || 2 }], 2);
    UI.modal({ title: L('Resource classification', 'تصنيف الموارد'), body: f, actions: [{ label: L('Classify', 'صنّف'), primary: true, fn: () => { const r = WF.classify(f.values()); UI.closeModal(); VP.vis.bmColor = 'class'; VP.filterBM(); UI.renderLegend(); App.resourceTable(); say(L(`Classified: ${fmt(r.measured)} Measured, ${fmt(r.indicated)} Indicated, ${fmt(r.inferred)} Inferred blocks.`, `التصنيف: ${fmt(r.measured)} مقاس، ${fmt(r.indicated)} مؤشر، ${fmt(r.inferred)} مستنتج.`)); } }] }); };
  App.resourceTable = function () { const rt = WF.resourceTable(); UI.modal({ title: L(`Mineral resource @ ${fmt(S().cutoff, 2)} g/t`, `المورد المعدني عند ${fmt(S().cutoff, 2)} غ/طن`), body: UI.table([{ label: L('Class', 'الفئة'), get: r => r.cls ? L(TM.Est.CLASS[r.cls].en, TM.Est.CLASS[r.cls].ar) : L('Total', 'الإجمالي') }, { label: 'Mt', get: r => fmt(r.tonnes / 1e6, 3), num: true }, { label: 'g/t', get: r => fmt(r.grade, 2), num: true }, { label: 'koz', get: r => fmt(r.oz / 1e3, 1), num: true }, { label: L('Blocks', 'بلوكات'), get: r => fmt(r.blocks), num: true }], rt) }); };
  App.gtDialog = function () {
    const bm = TM.P.bm, pitOn = !!TM.Pit.selected(); const cuts = Array.from({ length: 31 }, (_, i) => +(i * 0.1).toFixed(1)); const gr = TM.Est.gtCurve(bm, {}, cuts); const gp = pitOn ? cuts.map(c => { const k = WF.kpis(c); return { cutoff: c, tonnes: k.ore, grade: k.grade }; }) : null;
    const body = document.createElement('div'); const ch = document.createElement('div'); ch.className = 'charts';
    ch.appendChild(UI.chart({ title: L('Tonnage above cut-off (Mt)', 'الحمولة فوق حد القطع'), series: [{ name: L('Resource', 'المورد'), points: gr.map(g => [g.cutoff, g.tonnes / 1e6]) }].concat(gp ? [{ name: L('In pit', 'داخل الحفرة'), points: gp.map(g => [g.cutoff, g.tonnes / 1e6]), color: 'var(--series-b)', dash: true }] : []), xLabel: 'COG g/t', yLabel: 'Mt', xFmt: x => fmt(x, 1), yFmt: y => fmt(y, 1), markers: [{ x: S().cutoff, label: 'COG' }] }));
    ch.appendChild(UI.chart({ title: L('Grade above cut-off (g/t)', 'التركيز فوق حد القطع'), series: [{ name: L('Resource', 'المورد'), points: gr.map(g => [g.cutoff, g.tonnes ? g.grade : null]) }].concat(gp ? [{ name: L('In pit', 'داخل الحفرة'), points: gp.map(g => [g.cutoff, g.tonnes ? g.grade : null]), color: 'var(--series-b)', dash: true }] : []), xLabel: 'COG g/t', yLabel: 'g/t', xFmt: x => fmt(x, 1), yFmt: y => fmt(y, 1), markers: [{ x: S().cutoff, label: 'COG' }] }));
    body.appendChild(ch); body.appendChild(UI.table([{ label: 'COG', key: 'cutoff' }, { label: 'Mt', get: r => fmt(r.tonnes / 1e6, 2), num: true }, { label: 'g/t', get: r => fmt(r.grade, 2), num: true }, { label: 'koz', get: r => fmt(r.oz / 1e3, 1), num: true }], gr.filter((_, i) => i % 2 === 0).map(r => Object.assign({ _cls: Math.abs(r.cutoff - S().cutoff) < 0.05 ? 'cur' : '' }, r))));
    UI.modal({ title: L('Grade-tonnage', 'التركيز-الحمولة'), body, wide: true });
  };

  // ---------------------------------------------------------------- pit dialogs
  App.pitDialog = function () {
    const s = S(); const f = UI.form([{ id: 'slope_angle', label: L('Overall slope (°)', 'الميل الكلي (°)'), type: 'number', value: s.slope, step: 1 }, { id: 'gold_price_oz', label: L('Price ($/oz)', 'السعر ($/أونصة)'), type: 'number', value: s.price, step: 10 }, { id: 'mining_cost_t', label: L('Mining ($/t)', 'التعدين ($/طن)'), type: 'number', value: s.mineCost, step: 0.1 }, { id: 'processing_cost_t', label: L('Processing ($/t)', 'المعالجة ($/طن)'), type: 'number', value: s.procCost, step: 0.5 }, { id: 'cell', label: L('Optimisation block (m)', 'بلوك التحسين (م)'), type: 'number', value: 10, step: 5 }, { id: 'rfFrom', label: L('Revenue factor from', 'معامل الإيراد من'), type: 'number', value: 0.4, step: 0.05 }, { id: 'rfTo', label: L('to', 'إلى'), type: 'number', value: 1.2, step: 0.05 }, { id: 'rfStep', label: L('step', 'الخطوة'), type: 'number', value: 0.05, step: 0.01 }], 2);
    const e = TM.Mine.econ(); f.appendChild(UI.html(`<p class="hint wide">${L(`Exact maximum-closure (Lerchs-Grossmann) solution by max-flow on regularised blocks with ${s.benchH} m benches; precedence cones over two benches. Marginal cut-off ${fmt(e.marginalCOG, 2)} g/t.`, `حل دقيق لمسألة الإغلاق الأعظم (Lerchs-Grossmann) بالتدفق الأعظم على بلوكات منتظمة بارتفاع ${s.benchH} م. حد القطع الحدي ${fmt(e.marginalCOG, 2)} غ/طن.`)}</p>`));
    UI.modal({ title: L('Pit optimisation', 'تحسين الحفرة'), body: f, wide: true, actions: [{ label: L('Optimise', 'تحسين'), primary: true, fn: async () => { const v = f.values(); UI.closeModal(); const r = await UI.run(L('Optimising pit (Lerchs-Grossmann)…', 'جارٍ تحسين الحفرة…'), p => WF.optimisePit(v, p)); say(AI.summarize('run_pit_optimization', r)); App.refreshAll(false); App.pbpDialog(); } }] });
  };
  App.pbpDialog = function () {
    const p = TM.P.pit; const body = document.createElement('div');
    body.appendChild(UI.chart({ title: L('Pit-by-pit: NPV best / worst case ($M)', 'غلافاً بغلاف: صافي القيمة (مليون $)'), series: [{ name: L('Best (pushbacks)', 'أفضل (مراحل)'), points: p.pbp.map(q => [q.shell, q.best / 1e6]) }, { name: L('Worst (bench by bench)', 'أسوأ (مصطبة بمصطبة)'), points: p.pbp.map(q => [q.shell, q.worst / 1e6]), color: 'var(--series-b)', dash: true }], xLabel: L('Shell', 'الغلاف'), yLabel: '$M', xFmt: x => fmt(x), yFmt: y => fmt(y, 0), markers: [{ x: p.selected + 1, label: L('selected', 'المختار') }], zeroLine: true }));
    body.appendChild(UI.chart({ title: L('Ore and waste per shell (Mt)', 'الخام والنفايات لكل غلاف'), series: [{ name: L('Ore', 'خام'), points: p.pbp.map(q => [q.shell, q.ore / 1e6]) }, { name: L('Waste', 'نفايات'), points: p.pbp.map(q => [q.shell, q.waste / 1e6]), color: 'var(--series-c)' }], xLabel: L('Shell', 'الغلاف'), yLabel: 'Mt', xFmt: x => fmt(x), yFmt: y => fmt(y, 1) }));
    body.appendChild(UI.table([{ label: '#', key: 'shell' }, { label: 'RF', key: 'rf', num: true }, { label: L('Ore Mt', 'خام'), get: r => fmt(r.ore / 1e6, 2), num: true }, { label: 'g/t', get: r => fmt(r.grade, 2), num: true }, { label: 'koz', get: r => fmt(r.oz / 1e3, 1), num: true }, { label: 'SR', get: r => fmt(r.sr, 2), num: true }, { label: L('Best $M', 'أفضل'), get: r => fmt(r.best / 1e6, 1), num: true }, { label: L('Worst $M', 'أسوأ'), get: r => fmt(r.worst / 1e6, 1), num: true }], p.pbp.map((r, i) => Object.assign({ _cls: i === p.selected ? 'cur' : '' }, r)), { onRow: r => { WF.selectShell(r.shell - 1); UI.closeModal(); App.refreshAll(false); UI.toast(L('Shell ', 'الغلاف ') + r.shell); } }));
    body.appendChild(UI.html(`<p class="hint">${L('Click a row to select that shell as the final pit.', 'انقر صفاً لاختيار ذلك الغلاف كحفرة نهائية.')}</p>`));
    UI.modal({ title: L('Pit-by-pit analysis', 'تحليل غلافاً بغلاف'), body, wide: true });
  };
  App.showSchedule = function () {
    const r = TM.P.pit.schedule; if (!r) return; const body = document.createElement('div');
    body.appendChild(UI.html(`<div class="kgrid">${[['NPV', TM.usd(r.npv / 1e6) + 'M'], ['IRR', r.irr != null ? fmt(r.irr * 100, 1) + '%' : '—'], [L('Payback', 'الاسترداد'), r.payback != null ? fmt(r.payback, 1) + ' yr' : '—'], [L('Life', 'العمر'), r.life + ' yr'], [L('Ore', 'الخام'), fmt(r.total.ore / 1e6, 2) + ' Mt'], [L('Recovered', 'المستخلص'), fmt(r.total.oz / 1e3, 1) + ' koz']].map(([a, b]) => `<div class="kbox"><div class="kpi-k">${a}</div><div class="kpi-v">${b}</div></div>`).join('')}</div>`));
    body.appendChild(UI.chart({ title: L('Annual cash flow ($M)', 'التدفق النقدي السنوي'), series: [{ name: '$M', bars: true, points: r.years.map(y => [y.year, y.cash / 1e6, y.cash < 0 ? 'var(--crit)' : 'var(--series-a)']) }], xLabel: L('Year', 'السنة'), yLabel: '$M', xFmt: x => fmt(x), yFmt: y => fmt(y, 0), zeroLine: true }));
    body.appendChild(UI.table([{ label: L('Year', 'السنة'), key: 'year' }, { label: L('Ore Mt', 'خام'), get: y => fmt(y.ore / 1e6, 2), num: true }, { label: L('Waste Mt', 'نفايات'), get: y => fmt(y.waste / 1e6, 2), num: true }, { label: 'g/t', get: y => fmt(y.grade, 2), num: true }, { label: 'koz', get: y => fmt(y.oz / 1e3, 1), num: true }, { label: L('Revenue $M', 'الإيراد'), get: y => fmt(y.revenue / 1e6, 1), num: true }, { label: L('Cost $M', 'التكلفة'), get: y => fmt(y.cost / 1e6, 1), num: true }, { label: L('Cash $M', 'النقد'), get: y => fmt(y.cash / 1e6, 1), num: true }], r.years));
    UI.modal({ title: L('Production schedule & cash flow', 'جدول الإنتاج والتدفق النقدي'), body, wide: true, actions: [{ label: 'CSV', icon: 'download', fn: () => TM.IO.download(TM.IO.toCSV(['year', 'ore_t', 'waste_t', 'grade', 'oz_recovered', 'revenue', 'cost', 'cash'], r.years.map(y => [y.year, Math.round(y.ore), Math.round(y.waste), +y.grade.toFixed(3), Math.round(y.oz), Math.round(y.revenue), Math.round(y.cost), Math.round(y.cash)])), 'schedule.csv', 'text/csv') }] });
  };
  App.sensDialog = function () { const sv = WF.sensitivity(); const body = document.createElement('div'); body.appendChild(UI.chart({ title: L('NPV sensitivity ($M)', 'حساسية صافي القيمة'), series: [{ name: L('Price', 'السعر'), points: sv.factors.map((f, i) => [(f - 1) * 100, sv.price[i] / 1e6]), dots: true }, { name: L('Operating cost', 'التكاليف'), points: sv.factors.map((f, i) => [(f - 1) * 100, sv.cost[i] / 1e6]), color: 'var(--series-b)', dots: true, dash: true }], xLabel: L('Change (%)', 'التغير (%)'), yLabel: '$M', xFmt: x => fmt(x) + '%', yFmt: y => fmt(y, 0), zeroLine: true })); UI.modal({ title: L('Sensitivity', 'الحساسية'), body, wide: true }); };

  // ---------------------------------------------------------------- AI settings
  App.aiDialog = function () {
    const cfg = AI.cfg(); const body = document.createElement('div');
    const f = UI.form([{ id: 'provider', label: L('Provider', 'المزوّد'), type: 'select', value: cfg.provider, options: Object.entries(AI.PROVIDERS).map(([k, v]) => [k, v.label]) }, { id: 'model', label: L('Model', 'النموذج'), value: cfg.model || '' }, { id: 'key', label: L('API key', 'مفتاح API'), type: 'password', value: cfg.key || '' }], 1);
    body.appendChild(f); body.appendChild(UI.html(`<p class="hint">${L('Keys are stored only in this browser (localStorage) and sent directly to the provider you choose. The offline parser needs no key and understands common Arabic/English commands.', 'تُحفظ المفاتيح في هذا المتصفح فقط وتُرسل مباشرة إلى المزوّد. المحلل المحلي لا يحتاج مفتاحاً.')}</p><p class="hint" id="modelHint"></p>`));
    const hint = () => { const p = f.querySelector('#f_provider').value; body.querySelector('#modelHint').textContent = L('Suggested models: ', 'نماذج مقترحة: ') + AI.PROVIDERS[p].models.join(', '); const m = f.querySelector('#f_model'); if (!m.value || !AI.PROVIDERS[p].models.includes(m.value)) m.value = TM.prefs.get('ai.model.' + p, AI.PROVIDERS[p].models[0]); f.querySelector('#f_key').value = TM.prefs.get('ai.key.' + p, ''); };
    f.querySelector('#f_provider').addEventListener('change', hint); hint();
    UI.modal({ title: L('AI engine', 'محرك الذكاء الاصطناعي'), body, actions: [{ label: L('Save', 'حفظ'), primary: true, fn: () => { const v = f.values(); TM.prefs.set('ai.provider', v.provider); TM.prefs.set('ai.model.' + v.provider, v.model); TM.prefs.set('ai.key.' + v.provider, v.key); AI.resetConversation(); App.renderEngine(); UI.closeModal(); UI.toast(L('AI engine saved', 'تم حفظ إعدادات المحرك')); } }] });
  };
  App.renderEngine = function () { const c = AI.cfg(); const live = c.provider !== 'local' && c.key; $('#engineChip').className = 'chip ' + (live ? 'ok' : 'warn'); $('#engineTxt').textContent = live ? `${AI.PROVIDERS[c.provider].label.split(' ')[0]} · ${c.model || AI.PROVIDERS[c.provider].models[0]}` : L('Offline parser', 'المحلل المحلي'); };

  // ---------------------------------------------------------------- slicer / HUD
  App.syncSlicer = function () { const s = VP.slice, e = TM.extents(); $('#slOn').checked = s.enabled; const r = s.axis === 'z' ? [Math.floor(e.z0), Math.ceil(e.z1)] : s.axis === 'x' ? [Math.floor(e.x0), Math.ceil(e.x1)] : [Math.floor(e.y0), Math.ceil(e.y1)]; const sl = $('#slPos'); sl.min = r[0]; sl.max = r[1]; if (!(s.pos >= r[0] && s.pos <= r[1])) s.pos = Math.round((r[0] + r[1]) / 2); sl.value = s.pos; $('#slVal').textContent = fmt(s.pos); document.querySelectorAll('#slAxis button').forEach(b => b.setAttribute('aria-pressed', b.dataset.ax === s.axis)); $('#slThick').value = s.thick || 0; $('#hudSlice').textContent = s.enabled ? `${{ x: 'E', y: 'N', z: 'RL' }[s.axis]} ≤ ${fmt(s.pos)}${s.thick ? ` (${s.thick} m slab)` : ''}` : L('off', 'متوقف'); };
  TM.on('slice', () => App.syncSlicer());
  TM.on('hover', h => { if (!h) { $('#hudXYZ').textContent = 'E —  N —  RL —'; $('#hudHit').textContent = ''; return; } $('#hudXYZ').textContent = `E ${fmt(h.p.x, 1)}  N ${fmt(h.p.y, 1)}  RL ${fmt(h.p.z, 1)}`; const d = VP.describeHit(h.hit); $('#hudHit').textContent = d.kind === 'block' ? `block · ${fmt(TM.P.bm.grade[d.id], 2)} ${S().gradeUnit}` : (d.ref && d.ref.name) || d.kind; });
  TM.on('pick', info => UI.inspect(info));
  TM.on('sketch', sk => UI.toast(`${sk.pts.length} ${L('vertices', 'نقاط')}`));

  // ---------------------------------------------------------------- language
  App.applyLang = function () {
    const ar = TM.lang === 'ar'; document.documentElement.lang = TM.lang; document.documentElement.dir = ar ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-en]').forEach(el => el.textContent = ar ? el.dataset.ar : el.dataset.en);
    $('#langBtn').textContent = ar ? 'English' : 'العربية'; $('#prompt').placeholder = L('Type a command in English or Arabic…', 'اكتب أمراً بالعربية أو الإنجليزية…');
    App.renderSuggest(); App.renderEngine(); if (TM.P) { App.refreshAll(false); UI.inspect(null); App.syncSlicer(); }
  };
  App.renderSuggest = function () { const items = TM.lang === 'ar' ? ['اعرض فقط البلوكات التي يزيد تركيزها عن 1.2 جرام/طن واحسب نسبة الكشف', 'حسّن الحفرة بميل 48 درجة وسعر ذهب 2600', 'جدول الإنتاج', 'أنشئ التقرير التنفيذي مع تحليل الحساسية'] : ['Run kriging with 5 m blocks', 'Optimise the pit at 48° with gold at $2600', 'Show blocks above 1.2 g/t and the strip ratio', 'Generate an executive reserve report with the grade-tonnage curve']; $('#suggest').innerHTML = items.map(s => `<button class="sg" type="button" dir="auto">${esc(s)}</button>`).join(''); };

  App.afterLoad = function () { UI.resetKpiDelta(); AI.resetConversation(); TM.rt.issues = TM.Drill.validate(); VP.hidden.clear(); VP.slice.enabled = false; App.refreshAll(true); App.syncSlicer(); UI.inspect(null); };

  // ---------------------------------------------------------------- boot
  App.boot = async function () {
    TM.lang = TM.prefs.get('lang', 'en');
    if (typeof THREE === 'undefined' || !THREE.OrbitControls) { $('#loading').textContent = 'three.js failed to load'; return; }
    VP.labelsEl = $('#labels'); VP.gizmoEl = $('#gizmo'); VP.init($('#gl'));
    UI.bindLayers();
    $('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { curTab = b.dataset.tab; App.renderRibbon(); } });
    $('#tools').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) App.cmd(b.dataset.tool); });
    $('#langBtn').onclick = () => { TM.lang = TM.lang === 'en' ? 'ar' : 'en'; TM.prefs.set('lang', TM.lang); App.applyLang(); };
    $('#cog').addEventListener('input', e => { S().cutoff = +e.target.value; VP.filterBM(); UI.renderKPIs(); UI.renderLegend(); $('#cogVal').innerHTML = `${fmt(S().cutoff, 2)} <small>${esc(S().gradeUnit)}</small>`; $('#visBlocks').textContent = TM.P.bm ? `${fmt(VP.bmCount || 0)} ${L('blocks', 'بلوك')}` : '—'; });
    $('#cog').addEventListener('change', () => { TM.touch('cutoff'); });
    $('#slOn').onchange = e => { VP.slice.enabled = e.target.checked; VP.applySlice(); App.renderRibbon(); };
    $('#slPos').oninput = e => { VP.slice.pos = +e.target.value; VP.applySlice(); };
    $('#slThick').onchange = e => { VP.slice.thick = Math.max(0, +e.target.value || 0); VP.applySlice(); };
    $('#slAxis').onclick = e => { const b = e.target.closest('[data-ax]'); if (!b) return; VP.slice.axis = b.dataset.ax; VP.slice.pos = NaN; App.syncSlicer(); VP.applySlice(); };
    $('#cards').addEventListener('click', e => { const b = e.target.closest('[data-card]'); if (b) { b.disabled = true; AI.runCard(+b.dataset.card); } });
    $('#reportBtn').onclick = () => App.cmd('report');
    $('#composer').addEventListener('submit', e => { e.preventDefault(); const v = $('#prompt').value; $('#prompt').value = ''; AI.ask(v); });
    $('#prompt').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#composer').requestSubmit(); } });
    $('#suggest').addEventListener('click', e => { const b = e.target.closest('.sg'); if (b) AI.ask(b.textContent); });
    $('#modalClose').onclick = () => UI.closeModal(); $('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') UI.closeModal(); });
    $('#engineChip').onclick = () => App.cmd('aiSettings');
    document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => VP.view(b.dataset.view));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { if (!$('#modal').hidden) UI.closeModal(); else if (VP.sketch) App.finishSketch(true); }
      if (e.key === 'Enter' && VP.sketch && document.activeElement === document.body) App.finishSketch();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); App.cmd('saveP'); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); App.cmd('openP'); }
    });
    window.addEventListener('beforeunload', e => { if (TM.rt.dirty) { e.preventDefault(); e.returnValue = ''; } });
    App.applyLang();
    // restore the last session, else the demo
    const P = await TM.loadAutosave();
    if (P) { TM.setProject(P); App.afterLoad(); AI.addMsg('bot', L(`Restored <b>${esc(P.name)}</b> from the last session (autosave). Use Project → Open/Save for .tmd files.`, `تمت استعادة <b>${esc(P.name)}</b> من الجلسة السابقة.`)); }
    else { WF.loadDemo(); App.afterLoad(); AI.addMsg('bot', L('Welcome to <b>TerraMind Studio</b>. A synthetic demo project is loaded. Follow the decision-support cards above, use the ribbon, or type commands here (English or Arabic). Your work autosaves in this browser; use Project → Save .tmd to keep a file.', 'مرحباً بك في <b>TerraMind Studio</b>. تم تحميل مشروع تجريبي. اتبع بطاقات دعم القرار أو استخدم الشريط أو اكتب الأوامر هنا. يُحفظ العمل تلقائياً في المتصفح؛ استخدم المشروع ← حفظ ‎.tmd لحفظ ملف.')); }
    TM.rt.dirty = false; $('#loading').hidden = true;
  };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
