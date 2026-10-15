'use strict';
// شاشة الإعدادات

Views.settings = (() => {
  let info = null;
  let syncListening = false;
  const isDesktop = () => Store.api.platform === 'desktop';

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

  // ---------- المزامنة: بطاقة الكمبيوتر (رمز QR) ----------
  function desktopSyncHtml(st) {
    const head = `<h3>${icon('phone')}المزامنة مع الهاتف</h3>
      ${row('المزامنة عبر الواي فاي', 'يتصل تطبيق الهاتف بهذا الكمبيوتر مباشرة عبر شبكة البيت. البيانات مشفّرة ولا تمر عبر الإنترنت.', `<label class="switch"><input type="checkbox" data-sync-toggle ${st.enabled ? 'checked' : ''}><span></span></label>`)}`;
    if (!st.enabled) return head;
    if (st.error) {
      return `${head}<p class="notice danger">تعذّر تشغيل المزامنة${st.error === 'port-in-use' ? ` لأن المنفذ ${st.port} مستخدم من برنامج آخر` : ''}. أعد تشغيل إنجاز وحاول مجدداً.</p>`;
    }
    const addr = st.addresses[0];
    return `${head}
      ${addr ? '' : '<p class="notice">هذا الكمبيوتر غير متصل بأي شبكة حالياً. اتصل بشبكة الواي فاي في البيت.</p>'}
      <div class="pair-box">
        <img class="qr" src="${st.qr}" alt="رمز QR لربط الهاتف" width="196" height="196">
        <div class="pair-info">
          <ol class="steps">
            <li>ثبّت تطبيق إنجاز على هاتفك الأندرويد.</li>
            <li>افتح فيه: الإعدادات ← المزامنة مع الكمبيوتر ← <b>مسح رمز QR</b>.</li>
            <li>وجّه الكاميرا إلى هذا الرمز. تتم المزامنة بعدها تلقائياً.</li>
          </ol>
          <p class="muted small">أو أدخل يدوياً — العنوان: <b dir="ltr">${esc(addr || '—')}</b> · الرمز: <b dir="ltr">${esc(st.code)}</b></p>
          <p class="small sync-state ${st.lastSync ? 'ok' : ''}">${st.lastSync ? `${icon('check')}آخر مزامنة مع ${esc(st.lastSync.device)}: ${fmtAgo(st.lastSync.at)}` : 'لم يتصل أي هاتف بعد.'}</p>
          <button class="btn ghost sm" data-sync-regen>${icon('reset')}تغيير رمز الربط</button>
        </div>
      </div>
      <p class="muted small">💡 إن ظهرت نافذة «جدار حماية ويندوز» فاختر <b>السماح</b> (Allow access). وإن لم يتصل الهاتف، تأكد أن الواي فاي مضبوط كشبكة خاصة (Private) في إعدادات ويندوز.</p>`;
  }

  async function fillDesktopSync(card) {
    try {
      const st = await Store.api.syncStatus();
      if (card.isConnected) card.innerHTML = desktopSyncHtml(st);
    } catch (err) {
      console.error(err);
    }
  }

  // ---------- المزامنة: بطاقة الهاتف ----------
  function phoneSyncHtml() {
    const head = `<h3>${icon('sync')}المزامنة مع الكمبيوتر</h3>`;
    if (!Sync.paired()) {
      return `${head}
        <p class="muted small">اربط الهاتف بتطبيق إنجاز على الكمبيوتر لتتزامن المهام والعادات وجلسات التركيز تلقائياً عبر الواي فاي في البيت — دون إنترنت أو حسابات.</p>
        <ol class="steps">
          <li>على الكمبيوتر: الإعدادات ← المزامنة مع الهاتف ← فعّل المزامنة.</li>
          <li>هنا: اضغط «مسح رمز QR» ووجّه الكاميرا إلى الرمز.</li>
        </ol>
        <div class="btn-row">
          <button class="btn primary" data-sync-scan>${icon('camera')}مسح رمز QR</button>
          <button class="btn ghost" data-sync-manual>إدخال يدوي</button>
        </div>`;
    }
    const c = Sync.config;
    const st = Sync.status;
    const state =
      st === 'syncing'
        ? `${icon('sync')}جارٍ المزامنة…`
        : st === 'ok' || (!c.lastError && c.lastAt)
          ? `${icon('check')}متزامن — ${c.lastAt ? fmtAgo(c.lastAt) : ''}`
          : st === 'bad-code'
            ? 'رمز الربط تغيّر على الكمبيوتر. امسح الرمز الجديد.'
            : `غير متصل الآن. آخر مزامنة: ${c.lastAt ? fmtAgo(c.lastAt) : '—'}`;
    return `${head}
      ${row(`مرتبط بـ ${esc(c.pcName || 'الكمبيوتر')}`, '<span dir="ltr">' + esc(c.lastHost || c.hosts[0]) + '</span>', `<span class="small sync-state ${st === 'ok' ? 'ok' : st === 'syncing' ? '' : 'warn'}">${state}</span>`)}
      ${st === 'offline' ? '<p class="muted small">تتم المزامنة تلقائياً عندما يكون الهاتف والكمبيوتر على نفس شبكة الواي فاي وإنجاز مفتوح على الكمبيوتر. تعديلاتك محفوظة على الهاتف حتى ذلك الحين.</p>' : ''}
      <div class="btn-row">
        <button class="btn primary sm" data-sync-now>${icon('sync')}مزامنة الآن</button>
        ${st === 'bad-code' ? `<button class="btn ghost sm" data-sync-scan>${icon('camera')}مسح الرمز الجديد</button>` : ''}
        <span class="spacer"></span>
        <button class="btn ghost sm danger-text" data-sync-unpair>إلغاء الربط</button>
      </div>`;
  }

  async function doPair(info) {
    UI.toast('جارٍ الاتصال بالكمبيوتر…', { timeout: 2500 });
    try {
      const c = await Sync.pair(info);
      UI.toast(`تم الربط مع ${c.pcName} ✓ ستتزامن بياناتك تلقائياً.`, { type: 'success', timeout: 6000 });
      App.render();
    } catch (err) {
      UI.toast(Sync.messageFor(err.message), { type: 'error', timeout: 9000 });
    }
  }

  function manualPair() {
    UI.modal({
      title: 'ربط يدوي بالكمبيوتر',
      size: 'sm',
      body: `<form class="form" data-manual-form>
          <p class="muted small">ستجد العنوان والرمز في إنجاز على الكمبيوتر: الإعدادات ← المزامنة مع الهاتف.</p>
          <label class="field"><span>عنوان الكمبيوتر</span><input name="host" dir="ltr" inputmode="decimal" placeholder="192.168.1.5" autocomplete="off" autofocus></label>
          <label class="field"><span>رمز الربط</span><input name="code" dir="ltr" placeholder="ABCD-EFGH-JK" autocapitalize="characters" autocomplete="off"></label>
        </form>`,
      footer: `<button class="btn ghost" data-close>إلغاء</button><button class="btn primary" data-pair>ربط</button>`,
      onMount(box, close) {
        const form = $('[data-manual-form]', box);
        const go = (e) => {
          if (e) e.preventDefault();
          const host = form.elements.host.value.trim();
          const code = form.elements.code.value;
          if (!host) return UI.toast('اكتب عنوان الكمبيوتر', { type: 'error' });
          close();
          doPair({ hosts: [host.replace(/:\d+$/, '')], code });
        };
        form.addEventListener('submit', go);
        $('[data-pair]', box).addEventListener('click', go);
      },
    });
  }

  async function scanQr() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.jsQR) return manualPair();
    let stream = null;
    let timer = null;
    let closed = false;
    const close = UI.modal({
      title: 'مسح رمز الربط',
      size: 'md',
      body: `<p class="muted small">وجّه الكاميرا إلى رمز QR الظاهر في إعدادات إنجاز على الكمبيوتر.</p>
        <div class="scanner"><video playsinline muted></video><span class="scan-frame"></span></div>`,
      footer: `<button class="btn ghost" data-manual>إدخال يدوي</button><span class="spacer"></span><button class="btn ghost" data-close>إلغاء</button>`,
      onMount(box, closeFn) {
        $('[data-manual]', box).addEventListener('click', () => {
          closeFn();
          manualPair();
        });
      },
      onClose() {
        closed = true;
        clearInterval(timer);
        if (stream) stream.getTracks().forEach((t) => t.stop());
      },
    });
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    } catch {
      close();
      UI.toast('لم يُسمح باستخدام الكاميرا. يمكنك الربط يدوياً.', { type: 'error' });
      return manualPair();
    }
    if (closed) return stream.getTracks().forEach((t) => t.stop());
    const video = $('.scanner video');
    video.srcObject = stream;
    await video.play().catch(() => {});
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    timer = setInterval(() => {
      if (!video.videoWidth) return;
      const w = 480;
      const h = Math.round((video.videoHeight * w) / video.videoWidth);
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);
      const found = window.jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
      if (!found) return;
      let parsed;
      try {
        parsed = Sync.parseQr(found.data);
      } catch {
        return;
      }
      close();
      doPair(parsed);
    }, 250);
  }

  function render(root) {
    const s = Store.state.settings;
    const desktop = isDesktop();
    const web = Store.api.platform === 'web';
    const syncCard = desktop ? !!Store.api.syncStatus : Sync.isEnabled();
    const page = document.createElement('div');
    page.className = 'page narrow';
    page.innerHTML = `
      <header class="page-head"><div><h1>الإعدادات</h1><p class="sub">خصّص إنجاز ليناسب طريقتك في العمل.</p></div></header>
      ${web ? `<section class="card settings-card">
        <h3>${icon('download')}تثبيت إنجاز كتطبيق</h3>
        <p class="muted small">أضِفه إلى الشاشة الرئيسية في الهاتف أو الكمبيوتر ليفتح كتطبيق مستقل ويعمل حتى دون إنترنت.</p>
        ${window.InjazWeb && InjazWeb.canInstall()
          ? `<div class="btn-row"><button class="btn primary sm" data-install>${icon('download')}تثبيت الآن</button></div>`
          : '<p class="small">من قائمة المتصفح ⋮ اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». على آيفون (Safari): زر المشاركة ← «إضافة إلى الشاشة الرئيسية».</p>'}
      </section>` : ''}
      ${syncCard ? `<section class="card settings-card sync-card" data-sync-card>${desktop ? `<h3>${icon('phone')}المزامنة مع الهاتف</h3>` : phoneSyncHtml()}</section>` : ''}

      <section class="card settings-card">
        <h3>عام</h3>
        ${row('اسمك', 'يظهر في رسالة الترحيب.', `<input data-set="name" value="${esc(s.name)}" placeholder="اختياري" class="text-input">`)}
        ${row('المظهر', '', select('theme', s.theme, [['system', 'حسب النظام'], ['light', 'فاتح'], ['dark', 'داكن']]))}
        ${row('حجم الواجهة', desktop ? 'أو اضغط <kbd>Ctrl</kbd> مع <kbd>+</kbd> أو <kbd>−</kbd>' : '', select('zoom', s.zoom, [[0.9, '90%'], [1, '100%'], [1.1, '110%'], [1.25, '125%'], [1.4, '140%']]))}
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
        ${row(desktop ? 'إشعارات ويندوز' : web ? 'إشعارات المتصفح' : 'الإشعارات', web ? 'تذكير المهام وانتهاء المؤقت، ما دامت صفحة إنجاز مفتوحة.' : 'تذكير المهام ذات الوقت المحدد وانتهاء المؤقت.', toggle('notifications', s.notifications))}
        ${row('تذكير يومي بالعادات', 'إشعار إن بقيت عادات لم تُنجز.', `${toggle('habitReminder', s.habitReminder)}<input type="time" data-set="habitReminderTime" value="${esc(s.habitReminderTime)}" ${s.habitReminder ? '' : 'disabled'}>`)}
      </section>

      <section class="card settings-card">
        <h3>التصنيفات</h3>
        ${categoriesHtml()}
      </section>

      ${desktop ? `<section class="card settings-card">
        <h3>النظام</h3>
        ${row('التشغيل مع بدء ويندوز', 'يفتح إنجاز تلقائياً عند تشغيل الجهاز.', toggle('openAtLogin', info && info.openAtLogin))}
        ${row('البقاء في شريط المهام عند الإغلاق', 'زر الإغلاق يخفي النافذة ويبقي التذكيرات والمؤقت تعمل والمزامنة متاحة (أيقونة بجانب الساعة).', toggle('closeToTray', s.closeToTray))}
      </section>` : ''}

      <section class="card settings-card">
        <h3>البيانات والنسخ الاحتياطي</h3>
        <p class="muted small">${desktop ? 'تُحفظ بياناتك على جهازك فقط، مع نسخة احتياطية تلقائية يومية (آخر 14 يوماً).' : web ? 'تُحفظ بياناتك في هذا المتصفح على جهازك فقط، ولا تُرفع لأي خادم. مسح بيانات المتصفح يحذفها، فصدّر نسخة احتياطية من حين لآخر. ولنقلها إلى جهاز آخر: صدّرها هنا ثم استوردها هناك.' : 'تُحفظ بياناتك على هاتفك فقط، وتُنسخ إلى الكمبيوتر عند المزامنة.'}</p>
        ${info && desktop ? `<p class="path" dir="ltr">${esc(info.dataPath)}</p>` : ''}
        <div class="btn-row">
          <button class="btn ghost" data-export>${icon('download')}تصدير نسخة احتياطية</button>
          <button class="btn ghost" data-import>${icon('upload')}استيراد نسخة</button>
          ${desktop ? `<button class="btn ghost" data-folder>${icon('folder')}فتح مجلد البيانات</button>` : ''}
          <span class="spacer"></span>
          <button class="btn ghost danger-text" data-reset>${icon('trash')}مسح كل البيانات</button>
        </div>
      </section>

      ${desktop || web ? `<section class="card settings-card">
        <h3>اختصارات لوحة المفاتيح</h3>
        <div class="shortcuts">
          <span><kbd>Ctrl</kbd>+<kbd>N</kbd> مهمة جديدة</span>
          <span><kbd>Ctrl</kbd>+<kbd>F</kbd> بحث في المهام</span>
          <span><kbd>Ctrl</kbd>+<kbd>1</kbd>…<kbd>6</kbd> التنقل بين الشاشات</span>
          <span><kbd>مسافة</kbd> تشغيل/إيقاف المؤقت (في شاشة التركيز)</span>
          <span><kbd>Esc</kbd> إغلاق النافذة المنبثقة</span>
          <span><kbd>Ctrl</kbd>+<kbd>+</kbd> / <kbd>−</kbd> تكبير/تصغير الواجهة</span>
        </div>
      </section>` : ''}
      <p class="muted small center">إنجاز ${info ? `v${esc(info.version)}` : ''} · بياناتك ملكك ولا تغادر جهازك.</p>`;

    page.addEventListener('change', async (e) => {
      const el = e.target;
      if (el.matches('[data-sync-toggle]')) {
        el.disabled = true;
        const st = await Store.api.syncConfigure({ enabled: el.checked });
        $('[data-sync-card]', page).innerHTML = desktopSyncHtml(st);
        if (st.enabled && !st.error) UI.toast('المزامنة مفعّلة — امسح الرمز من تطبيق الهاتف', { type: 'success' });
        return;
      }
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
        if (key === 'notifications' && value && Store.api.requestNotify) Store.api.requestNotify();
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
      if (e.target.closest('[data-install]')) return window.InjazWeb && InjazWeb.install();
      if (e.target.closest('[data-sync-scan]')) return scanQr();
      if (e.target.closest('[data-sync-manual]')) return manualPair();
      if (e.target.closest('[data-sync-now]')) return Sync.syncNow({ quiet: false });
      if (e.target.closest('[data-sync-unpair]')) {
        const ok = await UI.confirm({ title: 'إلغاء الربط', message: 'سيتوقف الهاتف عن المزامنة مع الكمبيوتر. بياناتك تبقى على الجهازين.', ok: 'إلغاء الربط', danger: true });
        if (ok) {
          Sync.unpair();
          App.render();
        }
        return;
      }
      if (e.target.closest('[data-sync-regen]')) {
        const ok = await UI.confirm({ title: 'تغيير رمز الربط', message: 'سيتوقف أي هاتف مرتبط حالياً عن المزامنة حتى تمسح الرمز الجديد.', ok: 'تغيير الرمز' });
        if (ok) $('[data-sync-card]', page).innerHTML = desktopSyncHtml(await Store.api.syncConfigure({ regenerate: true }));
        return;
      }
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

    const card = $('[data-sync-card]', page);
    if (card && desktop) {
      fillDesktopSync(card);
      const poll = setInterval(() => (card.isConnected ? fillDesktopSync(card) : clearInterval(poll)), 8000);
    }
    if (card && !desktop && !syncListening) {
      syncListening = true;
      Sync.subscribe(() => {
        const c = $('[data-sync-card]');
        if (c) c.innerHTML = phoneSyncHtml();
      });
    }

    if (!info) {
      Store.api.info().then((res) => {
        info = res;
        if (App.route() === 'settings') App.render();
      });
    }
  }

  return { render };
})();
