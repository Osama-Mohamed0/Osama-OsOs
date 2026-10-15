'use strict';
// نقطة البداية: التنقل، الشريط الجانبي، المظهر، التذكيرات، الاختصارات

const App = (() => {
  const NAV = [
    { id: 'dashboard', label: 'الرئيسية', icon: 'dashboard' },
    { id: 'tasks', label: 'المهام', icon: 'tasks' },
    { id: 'habits', label: 'العادات', icon: 'habits' },
    { id: 'focus', label: 'التركيز', icon: 'focus' },
    { id: 'stats', label: 'الإحصائيات', icon: 'stats' },
    { id: 'settings', label: 'الإعدادات', icon: 'settings' },
  ];
  let current = 'dashboard';
  let params = {};
  let lastDay = D.today();
  let lastProgressSecond = -1;
  let saveErrorShown = 0;

  const route = () => current;

  function go(r, p = {}) {
    if (!Views[r]) return;
    current = r;
    params = p;
    render();
    $('#view').scrollTop = 0;
  }

  // ---------- الرسم ----------
  function render() {
    renderSidebar();
    renderView();
  }

  function renderView() {
    const root = $('#view');
    const scroll = root.scrollTop;
    // نحفظ الحقل النشط (قيمته وموضع المؤشر) حتى لا يضيع ما يكتبه المستخدم عند إعادة الرسم
    const active = document.activeElement;
    const keep = active && active.id && root.contains(active) ? { id: active.id, value: active.value, start: active.selectionStart, end: active.selectionEnd } : null;
    Charts.cleanup();
    Views[current].render(root, params);
    params = {};
    root.scrollTop = scroll;
    if (keep) {
      const el = document.getElementById(keep.id);
      if (el) {
        if (typeof keep.value === 'string') el.value = keep.value;
        el.focus();
        try {
          el.setSelectionRange(keep.start, keep.end);
        } catch {
          /* بعض الحقول لا تدعم التحديد */
        }
      }
    }
  }

  function renderSidebar() {
    const today = D.today();
    const tasksToday = Store.state.tasks.filter((t) => !t.done && t.due && t.due <= today).length;
    const hb = Store.habitsOn(today);
    const habitsLeft = hb.total - hb.done;
    const badges = { tasks: tasksToday, habits: habitsLeft };
    const cats = Store.state.categories;
    const activeCat = current === 'tasks' ? Tasks.view.category : null;
    const dark = isDark();

    $('#sidebar').innerHTML = `
      <div class="brand">
        <img src="assets/icon.png" alt="" width="36" height="36">
        <div><strong>إنجاز</strong><span>مهامك · تركيزك · عاداتك</span></div>
      </div>
      <nav class="nav">
        ${NAV.map((n, i) => `<button class="nav-item ${current === n.id && !(n.id === 'tasks' && activeCat) ? 'active' : ''}" data-nav="${n.id}" title="${n.label} (Ctrl+${i + 1})">
          ${icon(n.icon)}<span>${n.label}</span>${badges[n.id] ? `<span class="badge">${badges[n.id]}</span>` : ''}</button>`).join('')}
      </nav>
      <div class="side-label"><span>التصنيفات</span><button class="icon-btn sm" data-nav="settings" title="إدارة التصنيفات">${icon('settings')}</button></div>
      <div class="side-cats">
        ${cats.map((c) => {
          const n = Store.state.tasks.filter((t) => !t.done && t.categoryId === c.id).length;
          return `<button class="cat-item ${activeCat === c.id ? 'active' : ''}" data-cat="${c.id}"><i class="key" style="background:${colorHex(c.color)}"></i><span>${esc(c.name)}</span>${n ? `<span class="count">${n}</span>` : ''}</button>`;
        }).join('')}
      </div>
      <div class="side-spacer"></div>
      <button class="mini-timer" data-nav="focus" hidden></button>
      <div class="side-foot">
        <button class="btn ghost sm theme-btn" data-theme-toggle title="تبديل المظهر">${icon(dark ? 'sun' : 'moon')}${dark ? 'المظهر الفاتح' : 'المظهر الداكن'}</button>
      </div>`;
    // شريط التنقل السفلي (يظهر على الشاشات الصغيرة والهاتف فقط)
    const SHORT = { stats: 'الإحصاء', settings: 'الإعدادات' };
    $('#bottom-nav').innerHTML = NAV.map(
      (n) => `<button class="bnav-item ${current === n.id ? 'active' : ''}" data-nav="${n.id}" aria-label="${n.label}">
        ${icon(n.icon)}<span class="bnav-label">${SHORT[n.id] || n.label}</span>${badges[n.id] ? `<span class="badge">${badges[n.id]}</span>` : ''}</button>`
    ).join('');
    updateTimerUi();
  }

  // ---------- المؤقت في الشريط الجانبي وعنوان النافذة وشريط المهام ----------
  function updateTimerUi() {
    const s = Focus.snapshot();
    const mini = $('.mini-timer');
    const active = s.status !== 'idle';
    if (mini) {
      mini.hidden = !active;
      if (active) {
        mini.className = `mini-timer ${s.mode === 'focus' ? '' : 'break'} ${s.status}`;
        mini.innerHTML = `${icon(s.status === 'running' ? (s.mode === 'focus' ? 'target' : 'coffee') : 'pause')}<span>${s.label}</span><strong>${fmtClock(s.remaining)}</strong>`;
      }
    }
    document.title = active ? `${fmtClock(s.remaining)} · ${s.label} — إنجاز` : 'إنجاز';
    const bnavFocus = $('#bottom-nav [data-nav="focus"] .bnav-label');
    if (bnavFocus) {
      bnavFocus.textContent = active ? fmtClock(s.remaining) : 'التركيز';
      bnavFocus.parentElement.classList.toggle('timing', active);
    }
    const second = active ? Math.floor(s.remaining / 1000) : -1;
    if (second !== lastProgressSecond) {
      lastProgressSecond = second;
      Store.api.progress(active ? s.progress : -1, active ? `${s.label}: ${fmtClock(s.remaining)}` : 'إنجاز');
    }
  }

  function onFocusChange(full) {
    if (full) {
      render();
      return;
    }
    updateTimerUi();
    if (current === 'focus' && Views.focus.update) Views.focus.update($('#view'));
  }

  // ---------- المظهر والحجم ----------
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  function applyTheme() {
    const pref = Store.state.settings.theme;
    document.documentElement.dataset.theme = pref === 'system' ? (media.matches ? 'dark' : 'light') : pref;
  }

  function applyZoom() {
    Store.api.setZoom(clamp(Number(Store.state.settings.zoom) || 1, 0.7, 1.6));
  }

  function zoomBy(delta) {
    const z = delta ? clamp(Math.round(((Number(Store.state.settings.zoom) || 1) + delta) * 10) / 10, 0.7, 1.6) : 1;
    Store.setSettings({ zoom: z });
    applyZoom();
    UI.toast(`حجم الواجهة: ${Math.round(z * 100)}%`, { timeout: 1500 });
  }

  const nativeSettings = () => ({ closeToTray: !!Store.state.settings.closeToTray, theme: Store.state.settings.theme });

  // ---------- التذكيرات ----------
  function notify(title, body) {
    UI.toast(`${title} — ${body}`, { timeout: 8000 });
    // على أندرويد يجدول النظام هذه الإشعارات مسبقاً، فلا نكررها
    if (!Store.api.schedulesReminders) Store.api.notify(title, body);
  }

  function checkReminders() {
    const s = Store.state.settings;
    const now = Date.now();
    const SIX_HOURS = 6 * 3600 * 1000;
    if (s.notifications) {
      for (const t of Store.state.tasks) {
        if (t.done || !t.due || !t.time || t.remindedAt) continue;
        const at = new Date(`${t.due}T${t.time}:00`).getTime();
        if (Number.isNaN(at) || now < at) continue;
        // تذكير فات منذ زمن طويل (التطبيق كان مغلقاً) يُعلَّم دون إزعاج
        if (now - at < SIX_HOURS) notify('⏰ تذكير بمهمة', t.title);
        Store.updateTask(t.id, { remindedAt: now });
      }
    }
    const today = D.today();
    if (s.notifications && s.habitReminder && s.habitReminderTime && Store.state.meta.lastHabitReminder !== today) {
      const [hh, mm] = s.habitReminderTime.split(':').map(Number);
      const at = new Date();
      at.setHours(hh, mm, 0, 0);
      if (now >= at.getTime()) {
        const hb = Store.habitsOn(today);
        const left = hb.total - hb.done;
        if (left > 0 && now - at.getTime() < SIX_HOURS) notify('🌱 عاداتك اليوم', `بقي لديك ${pHabits(left)} لهذا اليوم. لا تكسر السلسلة!`);
        Store.setMeta({ lastHabitReminder: today });
      }
    }
    if (today !== lastDay) {
      lastDay = today;
      render();
    }
  }

  // ---------- الأحداث العامة ----------
  function bindGlobal() {
    $('#bottom-nav').addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (!nav) return;
      if (nav.dataset.nav === 'tasks') Tasks.view.category = null;
      go(nav.dataset.nav);
    });

    $('#sidebar').addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        if (nav.dataset.nav === 'tasks') Tasks.view.category = null;
        go(nav.dataset.nav);
        return;
      }
      const cat = e.target.closest('[data-cat]');
      if (cat) {
        go('tasks', { category: cat.dataset.cat, filter: 'all' });
        return;
      }
      if (e.target.closest('[data-theme-toggle]')) {
        Store.setSettings({ theme: isDark() ? 'light' : 'dark' });
        applyTheme();
        Store.api.applySettings(nativeSettings());
        render();
      }
    });

    // روابط التنقل داخل الشاشات
    $('#view').addEventListener('click', (e) => {
      const link = e.target.closest('[data-go]');
      if (link) go(link.dataset.go);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (UI.closeMenu() || UI.closeTop()) e.preventDefault();
        return;
      }
      const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
      if (e.ctrlKey && !e.altKey) {
        const digit = /^Digit([1-6])$/.exec(e.code);
        if (digit && !e.shiftKey) {
          e.preventDefault();
          UI.closeTop();
          go(NAV[Number(digit[1]) - 1].id);
        } else if (e.code === 'KeyN') {
          e.preventDefault();
          if (!UI.hasModal()) Tasks.openEditor(null, { due: D.today() });
        } else if (e.code === 'KeyF') {
          e.preventDefault();
          if (UI.hasModal()) return;
          if (current !== 'tasks') go('tasks');
          const s = $('#task-search');
          if (s) s.focus();
        } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
          e.preventDefault();
          zoomBy(0.1);
        } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
          e.preventDefault();
          zoomBy(-0.1);
        } else if (e.code === 'Digit0' || e.code === 'Numpad0') {
          e.preventDefault();
          zoomBy(0);
        }
        return;
      }
      if (!inField && !UI.hasModal() && current === 'focus' && e.code === 'Space') {
        e.preventDefault();
        Focus.toggle();
      }
    });

    media.addEventListener('change', () => {
      if (Store.state.settings.theme === 'system') {
        applyTheme();
        render();
      }
    });

    window.addEventListener('beforeunload', () => Store.flushSync());
    window.addEventListener('injaz:save-error', () => {
      if (Date.now() - saveErrorShown < 30000) return;
      saveErrorShown = Date.now();
      UI.toast('تعذّر حفظ البيانات! تأكد من المساحة المتاحة على القرص.', { type: 'error', timeout: 8000 });
    });
  }

  async function boot() {
    const res = await Store.init();
    applyTheme();
    applyZoom();
    UI.initTooltip();
    bindGlobal();
    Store.subscribe(render);
    Focus.subscribe(onFocusChange);
    Focus.restore();
    render();
    Store.api.applySettings(nativeSettings());
    // المزامنة: الكمبيوتر يستقبل طلبات الهاتف، والهاتف يتصل بالكمبيوتر
    if (Store.api.onSyncRequest) Store.api.onSyncRequest((json) => Store.mergeRemote(json).json);
    if (window.Sync && Sync.isEnabled()) Sync.start();
    if (res.recoveredFrom) UI.toast('كان ملف البيانات تالفاً، فاستُعيدت بياناتك من آخر نسخة احتياطية.', { timeout: 9000 });
    checkReminders();
    setInterval(checkReminders, 20000);
  }

  return { go, render, route, applyTheme, applyZoom, nativeSettings, boot };
})();

App.boot();
