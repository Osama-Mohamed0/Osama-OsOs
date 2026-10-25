/* TerraMind Studio — application menu bar (File / Edit / View / Tools / Help), keyboard shortcuts and recent projects. */
(function (TM) {
  'use strict';
  const Menu = TM.Menu = {}; const L = TM.L, esc = TM.esc; const $ = s => document.querySelector(s);

  // [command, english, arabic, icon, shortcut] · '-' separator · {sub, en, ar, icon, items | build}
  Menu.DEF = () => [
    { id: 'file', en: 'File', ar: 'ملف', items: [
      ['newP', 'New project', 'مشروع جديد', 'file-plus', 'Ctrl+N'], ['openP', 'Open project .tmd…', 'فتح مشروع ‎.tmd…', 'folder-open', 'Ctrl+O'],
      { sub: 'recent', en: 'Recent projects', ar: 'المشاريع الأخيرة', icon: 'history', build: Menu.recentItems }, '-',
      ['saveP', 'Save', 'حفظ', 'save', 'Ctrl+S'], ['saveAs', 'Save as…', 'حفظ باسم…', 'save-all', 'Ctrl+Shift+S'], '-',
      { sub: 'import', en: 'Import', ar: 'استيراد شامل', icon: 'upload', items: [
        ['importDH', 'Drillholes (CSV / Excel)…', 'آبار (CSV / Excel)…', 'table'], ['importSurf', 'Points, surfaces & solids (XYZ / .str / DXF / OBJ / STL)…', 'نقاط وأسطح ومجسمات (XYZ / ‎.str / DXF / OBJ / STL)…', 'layers'], ['importDatamine', 'Datamine strings / points (ASCII CSV)…', 'خطوط ونقاط Datamine (CSV نصي)…', 'database']] },
      { sub: 'export', en: 'Export', ar: 'تصدير شامل', icon: 'download', items: [
        ['reportPdf', 'Executive report (PDF)', 'التقرير التنفيذي (PDF)', 'file-text'], ['plot', 'Plan / section sheets (PDF / SVG / PNG)…', 'لوحات المسقط والمقطع (PDF / SVG / PNG)…', 'map', 'F7'],
        ['exportStr', 'Strings & surfaces (DXF / .str)…', 'الخطوط والأسطح (DXF / ‎.str)…', 'spline'], ['exportSolid', 'Solids (OBJ / STL / DXF)…', 'المجسمات (OBJ / STL / DXF)…', 'box'],
        ['exportBM', 'Block model (CSV)', 'نموذج البلوكات (CSV)', 'grid'], ['blastExport', 'Blast holes (CSV)', 'ثقوب التفجير (CSV)', 'zap']] }, '-',
      ['settings', 'Project & economics…', 'المشروع والاقتصاديات…', 'settings', 'Ctrl+,'], '-', ['exit', 'Exit', 'خروج', 'log-out', 'Alt+F4']] },
    { id: 'edit', en: 'Edit', ar: 'تحرير', items: [
      ['undo', 'Undo', 'تراجع', 'undo-2', 'Ctrl+Z'], ['redo', 'Redo', 'إعادة', 'redo-2', 'Ctrl+Y'], '-',
      ['selectAll', 'Select all strings', 'تحديد الكل', 'box-select', 'Ctrl+A'], ['deselect', 'Deselect', 'إلغاء التحديد', 'square-dashed', 'Esc'], ['deleteSel', 'Delete selected', 'حذف العنصر المحدد', 'trash-2', 'Delete'], '-',
      ['cleanStrings', 'Clean & close strings', 'تنظيف وإغلاق الخطوط', 'sparkles'], ['fixDH', 'Fix drillhole overlaps & duplicates', 'إصلاح تداخلات ومكررات الآبار', 'wrench']] },
    { id: 'view', en: 'View', ar: 'عرض', items: [
      ['viewIso', '3D perspective', 'منظور ثلاثي الأبعاد', 'rotate-3d', 'F6'], ['viewTop', 'Plan view', 'مسقط أفقي', 'arrow-down-to-line', 'F5'],
      { sub: 'sections', en: 'Section views', ar: 'مقاطع الاتجاهات', icon: 'compass', items: [['viewNorth', 'Looking north', 'شمالي', 'arrow-up'], ['viewSouth', 'Looking south', 'جنوبي', 'arrow-down'], ['viewEast', 'Looking east', 'شرقي', 'arrow-right'], ['viewWest', 'Looking west', 'غربي', 'arrow-left']] },
      ['zoomExt', 'Zoom to extents', 'احتواء المشهد بالكامل', 'maximize', 'F'], '-',
      ['slicer', 'Toggle section slicer', 'تفعيل/إيقاف المقطع الحي', 'scissors', 'S'], ['toggleGrid', 'Show / hide ground grid', 'إظهار/إخفاء الشبكة الأرضية', 'grid-3x3', 'G'], ['toggleAxes', 'Show / hide compass & axes', 'إظهار/إخفاء البوصلة والمحاور', 'compass'],
      ['toggleLayers', 'Show / hide layers panel', 'إظهار/إخفاء لوحة الطبقات', 'panel-left', 'Ctrl+L'], ['toggleAI', 'Show / hide AI copilot', 'إظهار/إخفاء المساعد الذكي', 'panel-right', 'Ctrl+J'], '-',
      ['plot', 'Plan / section plots', 'لوحات المسقط والمقطع', 'map', 'F7'], ['fullscreen', 'Full screen', 'ملء الشاشة', 'expand', 'F11']] },
    { id: 'tools', en: 'Tools', ar: 'أدوات هندسية', items: [
      ['bmCalc', 'Block model attribute calculator…', 'حاسبة الحقول في نموذج البلوكات…', 'calculator'], ['measure', '3D measure tool', 'أداة القياس ثلاثي الأبعاد', 'ruler', 'M'], ['cutfill', 'Cut & fill volume…', 'حجم القطع والردم…', 'layers'],
      ['reconcile', 'Survey reconciliation (model vs actual)…', 'المطابقة المساحية (المخطط مقابل الفعلي)…', 'git-compare'], ['validate', 'QA/QC validation report', 'تقرير التحقق وضبط الجودة', 'shield-check'], '-',
      ['transition', 'Open-pit → underground transition…', 'نقطة التحول من سطحي إلى تحت سطحي…', 'arrow-down-up'], ['aiSettings', 'AI engine & keys…', 'إعدادات محرك الذكاء والمفاتيح…', 'cpu']] },
    { id: 'help', en: 'Help', ar: 'مساعدة', items: [
      ['guide', 'Quick user guide', 'دليل المستخدم السريع', 'book-open', 'F1'], ['shortcuts', 'Keyboard shortcuts', 'قائمة اختصارات لوحة المفاتيح', 'keyboard', 'Ctrl+/'], '-',
      ['demo', 'Load demo project', 'تحميل المشروع التجريبي', 'sparkles'], ['dbCheck', 'Project integrity check', 'فحص سلامة قاعدة البيانات', 'stethoscope'], '-', ['about', 'About TerraMind Studio', 'حول البرنامج', 'info']] }
  ];

  // ---------------------------------------------------------------- recent projects (desktop: file path · browser: IndexedDB copy)
  Menu.recent = () => TM.prefs.get('recent', []);
  Menu.addRecent = async function (name, path) {
    const key = path || 'recent:' + name; let r = Menu.recent().filter(x => x.key !== key);
    r.unshift({ key, name, path: path || null, t: new Date().toISOString() }); const drop = r.slice(8); r = r.slice(0, 8); TM.prefs.set('recent', r);
    if (!path) { try { await TM.idbPut(key, TM.encode(TM.P)); } catch (e) { } }
    for (const d of drop) if (!d.path) { try { await TM.idbDel(d.key); } catch (e) { } }
  };
  Menu.recentItems = () => { const r = Menu.recent(); if (!r.length) return [['', 'No recent projects', 'لا توجد مشاريع حديثة', 'minus', '', true]]; return r.map((x, i) => ['recent:' + i, x.name + (x.path ? ' — ' + x.path.split(/[\\/]/).slice(-2).join('/') : ''), x.name + (x.path ? ' — ' + x.path.split(/[\\/]/).slice(-2).join('/') : ''), x.path ? 'file' : 'hard-drive']).concat(['-', ['clearRecent', 'Clear list', 'مسح القائمة', 'x']]); };
  Menu.openRecent = async function (i) {
    const x = Menu.recent()[i]; if (!x) return;
    if (TM.rt.dirty && !(await TM.App.confirm(L('Discard unsaved changes?', 'تجاهل التغييرات غير المحفوظة؟')))) return;
    if (x.path) { if (!TM.native || !TM.native.openPath) throw new Error(L('This file can only be reopened in the desktop app.', 'يمكن فتح هذا الملف من تطبيق سطح المكتب فقط.')); const f = await TM.native.openPath(x.path); if (!f) throw new Error(L('File not found: ', 'الملف غير موجود: ') + x.path); await TM.App.openNativeFile(f); return; }
    const s = await TM.idbGet(x.key); if (!s) throw new Error(L('The stored copy is no longer available.', 'النسخة المحفوظة لم تعد متاحة.'));
    const P = TM.decode(s); P.settings = Object.assign(TM.defaultSettings(), P.settings || {}); P.history = P.history || []; P.ai = P.ai || { log: [] }; TM.setProject(P); TM.App.afterLoad(); TM.UI.toast(L('Opened ', 'تم فتح ') + x.name);
  };

  // ---------------------------------------------------------------- rendering
  const kbd = k => k ? `<kbd>${esc(k)}</kbd>` : '';
  function itemsHTML(items) {
    return items.map(it => {
      if (it === '-') return '<div class="mi-sep" role="separator"></div>';
      if (it.sub) { const sub = it.build ? it.build() : it.items; return `<div class="mi has-sub" role="menuitem" tabindex="-1" aria-haspopup="true"><i data-lucide="${it.icon || 'chevron-right'}"></i><span>${esc(L(it.en, it.ar))}</span><i data-lucide="chevron-right" class="mi-arrow"></i><div class="menu sub" role="menu">${itemsHTML(sub)}</div></div>`; }
      const [cmd, en, ar, icon, key, dis] = it; return `<button type="button" class="mi" role="menuitem" tabindex="-1" data-mcmd="${esc(cmd)}" ${dis ? 'disabled' : ''}><i data-lucide="${icon || 'dot'}"></i><span>${esc(L(en, ar))}</span>${kbd(key)}</button>`;
    }).join('');
  }
  let openId = null;
  Menu.render = function () {
    const el = $('#menubar'); if (!el) return;
    el.innerHTML = Menu.DEF().map(m => `<div class="mb-item ${openId === m.id ? 'open' : ''}" data-menu="${m.id}"><button type="button" class="mb-btn" role="menuitem" aria-haspopup="true" aria-expanded="${openId === m.id}">${esc(L(m.en, m.ar))}</button><div class="menu" role="menu">${openId === m.id ? itemsHTML(m.items) : ''}</div></div>`).join('');
    TM.UI.icons();
  };
  Menu.open = id => { openId = id; Menu.render(); const first = document.querySelector('.mb-item.open .menu .mi:not([disabled])'); if (first) first.focus({ preventScroll: true }); };
  Menu.close = () => { if (openId == null) return; openId = null; Menu.render(); };
  Menu.bind = function () {
    const el = $('#menubar');
    el.addEventListener('click', e => {
      const b = e.target.closest('.mb-btn'); if (b) { const id = b.parentElement.dataset.menu; openId === id ? Menu.close() : Menu.open(id); return; }
      const mi = e.target.closest('[data-mcmd]'); if (mi && !mi.disabled) { const c = mi.dataset.mcmd; Menu.close(); Menu.run(c); }
    });
    el.addEventListener('mouseover', e => { const b = e.target.closest('.mb-btn'); if (b && openId != null && b.parentElement.dataset.menu !== openId) Menu.open(b.parentElement.dataset.menu); });
    el.addEventListener('keydown', e => {
      if (openId == null) return; const items = [...document.querySelectorAll('.mb-item.open > .menu > .mi:not([disabled])')]; const i = items.indexOf(document.activeElement); const ids = Menu.DEF().map(m => m.id), rtl = TM.lang === 'ar';
      if (e.key === 'ArrowDown') { e.preventDefault(); (items[(i + 1) % items.length] || items[0]).focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); (items[(i - 1 + items.length) % items.length] || items[0]).focus(); }
      else if (e.key === (rtl ? 'ArrowLeft' : 'ArrowRight') || e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) { e.preventDefault(); const d = (e.key === 'ArrowRight') !== rtl ? 1 : -1; Menu.open(ids[(ids.indexOf(openId) + d + ids.length) % ids.length]); }
      else if (e.key === 'Escape') { e.preventDefault(); Menu.close(); }
    });
    document.addEventListener('mousedown', e => { if (openId != null && !e.target.closest('#menubar')) Menu.close(); });
  };
  Menu.run = function (c) {
    if (!c) return; if (c.startsWith('recent:')) return Menu.openRecent(+c.slice(7)).catch(e => TM.UI.toast(e.message, 'err'));
    if (c === 'clearRecent') { for (const x of Menu.recent()) if (!x.path) TM.idbDel(x.key).catch(() => { }); TM.prefs.set('recent', []); return; }
    TM.App.cmd(c);
  };

  // ---------------------------------------------------------------- keyboard shortcuts (one dispatcher for the whole app)
  Menu.shortcuts = function () { const out = []; const walk = items => items.forEach(it => { if (it === '-') return; if (it.sub) { if (it.items) walk(it.items); return; } if (it[4]) out.push({ cmd: it[0], label: L(it[1], it[2]), key: it[4] }); }); Menu.DEF().forEach(m => walk(m.items)); return out; };
  const comboOf = e => { const code = /^Key([A-Z])$/.exec(e.code || ''); const k = code ? code[1] : e.code === 'Comma' ? ',' : e.code === 'Slash' ? '/' : e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key; return (e.ctrlKey || e.metaKey ? 'Ctrl+' : '') + (e.shiftKey ? 'Shift+' : '') + (e.altKey ? 'Alt+' : '') + k; };
  Menu.onKey = function (e) {
    if (e.defaultPrevented) return; const ae = document.activeElement || document.body; const typing = /input|textarea|select/i.test(ae.tagName) || ae.isContentEditable;
    const combo = comboOf(e); if (combo === 'Alt+F4' || combo === 'Esc') return;
    if (e.key === 'Escape') { if (openId != null) { Menu.close(); return; } if (TM.UI.modalOpen()) return; if (!typing) Menu.run('deselect'); return; }
    if (TM.UI.modalOpen() && combo !== 'F11') return;
    const sc = Menu.shortcuts().find(s => s.key === combo || (s.key === 'Ctrl+/' && combo === 'Ctrl+?'));
    if (!sc) return; const plain = !/^(Ctrl|Alt)\+/.test(sc.key) && !/^F\d+$/.test(sc.key);
    if (typing && (plain || sc.key === 'Ctrl+A' || sc.key === 'Ctrl+Z' || sc.key === 'Ctrl+Y')) return;
    if (sc.cmd === 'measure' && TM.CAD && TM.CAD.mode === 'measure') return;
    e.preventDefault(); Menu.run(sc.cmd);
  };
})(typeof window !== 'undefined' ? window.TM : globalThis.TM);
