'use strict';
// شاشة الإعدادات

Views.settings = (() => {
  let info = null;

  const row = (label, desc, control) => `
    <div class="setting-row">
      <div class="setting-text"><strong>${label}</strong>${desc ? `<span>${desc}</span>` : ''}</div>
      <div class="setting-control">${control}</div>
    </div>`;

  const toggle = (key, on) => `<label class="switch"><input type="checkbox" data-set="${key}" ${on ? 'checked' : ''}><span></span></label>`;
  const number = (key, value, min, max, suffix = '') =>
    `<span class="num-input"><input type="number" data-set="${key}" value="${value}" min="${min}" max="${max}">${suffix ? `<small>${suffix}</small>` : ''}</span>`;
  const select = (key, value, options) =>
    `<select data-set="${key}">${options.map(([v, l]) => `<option value="${v}" ${String(v) === String(value) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;

  function categoriesHtml() {
    const cats = Store.state.categories;
    return `<div class="cat-list">${cats
      .map((c) => {
        const count = Store.state.tasks.filter((t) => t.categoryId === c.id && !t.done).length;
        return `<div class="cat-row" data-cat="${c.id}">
          <button class="swatch-btn" data-cat-color style="--c:${colorHex(c.color)}" title="تغيير اللون" aria-label="تغيير لون ${esc(c.name)}"></button>
          <input class="cat-name" value="${esc(c.name)}" data-cat-name aria-label="اسم التصنيف">
          <span class="muted small">${count ? pTasks(count) : 'لا مهام'}</span>
          <button class="icon-btn sm" data-cat-del title="حذف التصنيف">${icon('trash')}</button>
        </div>`;
      })
      .join('')}</div>
      <form class="cat-add" data-cat-add><input name="name" placeholder="تصنيف جديد…" autocomplete="off"><button class="btn ghost sm">${icon('plus')}إضافة</button></form>`;
  }

  function render(root) {
    const s = Store.state.settings;
    const page = document.createElement('div');
    page.className = 'page narrow';
    page.innerHTML = `
      <header class="page-head"><div><h1>الإعدادات</h1><p class="sub">خصّص إنجاز ليناسب طريقتك في العمل.</p></div></header>

      <section class="card settings-card">
        <h3>عام</h3>
        ${row('اسمك', 'يظهر في رسالة الترحيب.', `<input data-set="name" value="${esc(s.name)}" placeholder="اختياري" class="text-input">`)}
        ${row('المظهر', '', select('theme', s.theme, [['system', 'حسب النظام'], ['light', 'فاتح'], ['dark', 'داكن']]))}
        ${row('حجم الواجهة', 'أو اضغط <kbd>Ctrl</kbd> مع <kbd>+</kbd> أو <kbd>−</kbd>', select('zoom', s.zoom, [[0.9, '90%'], [1, '100%'], [1.1, '110%'], [1.25, '125%'], [1.4, '140%']]))}
        ${row('بداية الأسبوع', 'تُستخدم في سجل العادات والإحصائيات.', select('weekStart', s.weekStart, [[6, 'السبت'], [0, 'الأحد'], [1, 'الاثنين']]))}
      </section>

      <section class="card settings-card">
        <h3>الأهداف اليومية</h3>
        ${row('عدد المهام المنجزة', 'هدفك اليومي من المهام.', number('goalTasks', s.goalTasks, 0, 50, 'مهمة'))}
        ${row('دقائق التركيز', 'هدفك اليومي من وقت التركيز.', number('goalFocus', s.goalFocus, 0, 720, 'دقيقة'))}
      </section>

      <section class="card settings-card">
        <h3>مؤقّت التركيز</h3>
        ${row('مدة جلسة التركيز', '', number('focusMin', s.focusMin, 1, 180, 'دقيقة'))}
        ${row('الاستراحة القصيرة', '', number('shortMin', s.shortMin, 1, 60, 'دقيقة'))}
        ${row('الاستراحة الطويلة', '', number('longMin', s.longMin, 1, 90, 'دقيقة'))}
        ${row('استراحة طويلة بعد', 'عدد جلسات التركيز قبل الاستراحة الطويلة.', number('longEvery', s.longEvery, 2, 12, 'جلسات'))}
        ${row('بدء الاستراحة تلقائياً', 'تبدأ الاستراحة فور انتهاء جلسة التركيز.', toggle('autoBreak', s.autoBreak))}
        ${row('صوت التنبيه', 'نغمة قصيرة عند انتهاء المؤقت.', toggle('sound', s.sound))}
      </section>

      <section class="card settings-card">
        <h3>التنبيهات</h3>
        ${row('إشعارات ويندوز', 'تذكير المهام ذات الوقت المحدد وانتهاء المؤقت.', toggle('notifications', s.notifications))}
        ${row('تذكير يومي بالعادات', 'إشعار إن بقيت عادات لم تُنجز.', `${toggle('habitReminder', s.habitReminder)}<input type="time" data-set="habitReminderTime" value="${esc(s.habitReminderTime)}" ${s.habitReminder ? '' : 'disabled'}>`)}
      </section>

      <section class="card settings-card">
        <h3>التصنيفات</h3>
        ${categoriesHtml()}
      </section>

      <section class="card settings-card">
        <h3>النظام</h3>
        ${row('التشغيل مع بدء ويندوز', 'يفتح إنجاز تلقائياً عند تشغيل الجهاز.', toggle('openAtLogin', info && info.openAtLogin))}
        ${row('البقاء في شريط المهام عند الإغلاق', 'زر الإغلاق يخفي النافذة ويبقي التذكيرات والمؤقت تعمل (أيقونة بجانب الساعة).', toggle('closeToTray', s.closeToTray))}
      </section>

      <section class="card settings-card">
        <h3>البيانات والنسخ الاحتياطي</h3>
        <p class="muted small">تُحفظ بياناتك على جهازك فقط، مع نسخة احتياطية تلقائية يومية (آخر 14 يوماً).</p>
        ${info ? `<p class="path" dir="ltr">${esc(info.dataPath)}</p>` : ''}
        <div class="btn-row">
          <button class="btn ghost" data-export>${icon('download')}تصدير نسخة احتياطية</button>
          <button class="btn ghost" data-import>${icon('upload')}استيراد نسخة</button>
          <button class="btn ghost" data-folder>${icon('folder')}فتح مجلد البيانات</button>
          <span class="spacer"></span>
          <button class="btn ghost danger-text" data-reset>${icon('trash')}مسح كل البيانات</button>
        </div>
      </section>

      <section class="card settings-card">
        <h3>اختصارات لوحة المفاتيح</h3>
        <div class="shortcuts">
          <span><kbd>Ctrl</kbd>+<kbd>N</kbd> مهمة جديدة</span>
          <span><kbd>Ctrl</kbd>+<kbd>F</kbd> بحث في المهام</span>
          <span><kbd>Ctrl</kbd>+<kbd>1</kbd>…<kbd>6</kbd> التنقل بين الشاشات</span>
          <span><kbd>مسافة</kbd> تشغيل/إيقاف المؤقت (في شاشة التركيز)</span>
          <span><kbd>Esc</kbd> إغلاق النافذة المنبثقة</span>
          <span><kbd>Ctrl</kbd>+<kbd>+</kbd> / <kbd>−</kbd> تكبير/تصغير الواجهة</span>
        </div>
      </section>
      <p class="muted small center">إنجاز ${info ? `v${esc(info.version)}` : ''} · بياناتك ملكك ولا تغادر جهازك.</p>`;

    page.addEventListener('change', async (e) => {
      const el = e.target;
      const key = el.dataset.set;
      if (key) {
        let value = el.type === 'checkbox' ? el.checked : el.value;
        if (el.type === 'number') value = clamp(Number(value) || 0, Number(el.min), Number(el.max));
        if (['weekStart'].includes(key)) value = Number(value);
        if (key === 'zoom') value = Number(value);
        if (key === 'openAtLogin') {
          const res = await Store.api.applySettings({ ...App.nativeSettings(), openAtLogin: value });
          if (info) info.openAtLogin = res.openAtLogin;
          UI.toast(res.openAtLogin ? 'سيعمل إنجاز مع بدء ويندوز' : 'أُلغي التشغيل التلقائي');
          return;
        }
        Store.setSettings({ [key]: value });
        if (key === 'theme') App.applyTheme();
        if (key === 'zoom') App.applyZoom();
        if (['theme', 'closeToTray'].includes(key)) Store.api.applySettings(App.nativeSettings());
        return;
      }
      if (el.matches('[data-cat-name]')) {
        const name = el.value.trim();
        if (name) Store.updateCategory(el.closest('[data-cat]').dataset.cat, { name });
        else App.render();
      }
    });

    page.addEventListener('submit', (e) => {
      const form = e.target.closest('[data-cat-add]');
      if (!form) return;
      e.preventDefault();
      const name = form.elements.name.value.trim();
      if (!name) return;
      const used = Store.state.categories.map((c) => c.color);
      const color = (PALETTE.find((p) => !used.includes(p.id)) || PALETTE[Store.state.categories.length % PALETTE.length]).id;
      Store.addCategory(name, color);
    });

    page.addEventListener('click', async (e) => {
      const colorBtn = e.target.closest('[data-cat-color]');
      if (colorBtn) {
        const id = colorBtn.closest('[data-cat]').dataset.cat;
        UI.menu(
          colorBtn,
          PALETTE.map((p) => ({ label: p.name, swatch: colorHex(p.id), fn: () => Store.updateCategory(id, { color: p.id }) }))
        );
        return;
      }
      const del = e.target.closest('[data-cat-del]');
      if (del) {
        const c = Store.getCategory(del.closest('[data-cat]').dataset.cat);
        const ok = await UI.confirm({ title: 'حذف التصنيف', message: `حذف «${c.name}»؟ ستبقى مهامه لكن بدون تصنيف.`, ok: 'حذف', danger: true });
        if (ok) Store.deleteCategory(c.id);
        return;
      }
      if (e.target.closest('[data-export]')) {
        const res = await Store.api.exportData(JSON.stringify(Store.state, null, 2));
        if (res && res.ok) UI.toast('تم تصدير النسخة الاحتياطية ✓', { type: 'success' });
      } else if (e.target.closest('[data-import]')) {
        const res = await Store.api.importData();
        if (!res || !res.ok) {
          if (res && res.error) UI.toast('الملف غير صالح', { type: 'error' });
          return;
        }
        if (!Store.looksLikeBackup(res.data)) return UI.toast('هذا الملف ليس نسخة احتياطية من إنجاز', { type: 'error' });
        const ok = await UI.confirm({ title: 'استيراد نسخة احتياطية', message: 'ستُستبدل كل بياناتك الحالية ببيانات الملف. هل تريد المتابعة؟', ok: 'استيراد', danger: true });
        if (!ok) return;
        Store.replaceAll(res.data);
        App.applyTheme();
        App.applyZoom();
        UI.toast('تم استيراد البيانات ✓', { type: 'success' });
      } else if (e.target.closest('[data-folder]')) {
        Store.api.openDataFolder();
      } else if (e.target.closest('[data-reset]')) {
        const ok = await UI.confirm({ title: 'مسح كل البيانات', message: 'سيُحذف كل شيء: المهام والعادات والجلسات والإعدادات. ننصح بتصدير نسخة احتياطية أولاً.', ok: 'مسح نهائي', danger: true });
        if (!ok) return;
        const fresh = Store.defaults();
        fresh.tasks = [];
        Store.replaceAll(fresh);
        App.applyTheme();
        App.applyZoom();
        UI.toast('تم مسح البيانات');
      }
    });

    root.replaceChildren(page);

    if (!info) {
      Store.api.info().then((res) => {
        info = res;
        if (App.route() === 'settings') App.render();
      });
    }
  }

  return { render };
})();
