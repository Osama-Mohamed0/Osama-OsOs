'use strict';
// شاشة العادات: التتبع اليومي، السلاسل، السجل الحراري

const Habits = (() => {
  const view = { showArchived: false };
  const DAY_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const EMOJIS = ['✅', '💧', '📖', '📚', '🏃', '🧘', '🕌', '📿', '🤲', '🥗', '😴', '✍️', '💪', '🚶', '🚭', '📵', '🎯', '🧠', '💊', '🦷', '🎨', '🎵', '☀️', '🌿', '💰', '🧹', '❤️', '⏰'];
  const TEMPLATES = [
    { name: 'شرب الماء', icon: '💧', color: 'blue', target: 8, unit: 'أكواب' },
    { name: 'ورد القرآن', icon: '📖', color: 'green' },
    { name: 'الصلاة في وقتها', icon: '🕌', color: 'aqua', target: 5, unit: 'صلوات' },
    { name: 'أذكار الصباح والمساء', icon: '📿', color: 'magenta', target: 2, unit: 'مرات' },
    { name: 'القراءة 20 دقيقة', icon: '📚', color: 'violet' },
    { name: 'رياضة', icon: '🏃', color: 'orange', days: [0, 2, 4] },
    { name: 'المشي 30 دقيقة', icon: '🚶', color: 'yellow' },
    { name: 'النوم قبل 11 مساءً', icon: '😴', color: 'violet' },
    { name: 'تأمّل وتنفّس عميق', icon: '🧘', color: 'aqua' },
    { name: 'بدون هاتف قبل النوم', icon: '📵', color: 'red' },
  ];

  const orderedDays = () => Array.from({ length: 7 }, (_, i) => (Store.state.settings.weekStart + i) % 7);

  function freqText(h) {
    const d = [...h.days].sort().join();
    if (h.days.length === 7) return 'كل يوم';
    if (d === '0,1,2,3,4') return 'أيام العمل';
    if (d === '5,6') return 'نهاية الأسبوع';
    return orderedDays()
      .filter((x) => h.days.includes(x))
      .map((x) => DAY_SHORT[x])
      .join('، ');
  }

  const targetText = (h) => (h.target > 1 ? `${h.target} ${h.unit || 'مرات'} يومياً` : '');

  function cell(h, k, big = false) {
    const count = Store.habitCount(h, k);
    const scheduled = h.days.includes(D.weekday(k));
    if (!scheduled && !count) return `<span class="hcell off${big ? ' big' : ''}" aria-hidden="true">–</span>`;
    const done = count >= h.target;
    const pct = Math.round(Math.min(1, count / h.target) * 100);
    const tip = done ? 'أُنجزت ✓' : count ? `${count} من ${h.target}` : 'لم تُنجز بعد';
    const cls = [done ? 'done' : count ? 'partial' : '', k === D.today() ? 'today' : '', big ? 'big' : ''].join(' ');
    return `<button class="hcell ${cls}" data-habit="${h.id}" data-key="${k}" style="--c:${colorHex(h.color)};--p:${pct}"
      data-tip="${esc(tip)}" data-tip-label="${esc(D.long(k))}" aria-label="${esc(h.name)} — ${esc(D.long(k))}: ${esc(tip)}">${
        done ? icon('check') : count ? `<span>${count}</span>` : ''
      }</button>`;
  }

  // النقر يزيد العدّاد، والنقر الأيمن ينقصه
  function handle(e) {
    const c = e.target.closest('[data-habit][data-key]');
    if (c) {
      if (e.type === 'contextmenu') e.preventDefault();
      bump(c.dataset.habit, c.dataset.key, e.type === 'contextmenu' ? -1 : 1);
      return true;
    }
    if (e.type !== 'click') return false;
    const open = e.target.closest('[data-habit-open]');
    if (open) {
      details(open.dataset.habitOpen);
      return true;
    }
    const more = e.target.closest('[data-habit-menu]');
    if (more) {
      const h = Store.getHabit(more.dataset.habitMenu);
      UI.menu(more, [
        { label: 'السجل والإحصائيات', icon: 'chart', fn: () => details(h.id) },
        { label: 'تعديل', icon: 'edit', fn: () => editor(h.id) },
        h.archived ? { label: 'استعادة من الأرشيف', icon: 'restore', fn: () => Store.updateHabit(h.id, { archived: false }) } : { label: 'أرشفة', icon: 'archive', fn: () => archive(h.id) },
        '-',
        { label: 'حذف', icon: 'trash', danger: true, fn: () => remove(h.id) },
      ]);
      return true;
    }
    return false;
  }

  function bump(id, k, delta) {
    const h = Store.getHabit(id);
    if (!h) return;
    const wasDone = Store.isHabitDone(h, k);
    Store.bumpHabit(id, k, delta);
    if (!wasDone && Store.isHabitDone(h, k) && k === D.today()) {
      const streak = Store.habitStreak(h);
      UI.toast(`${h.icon} أحسنت! ${h.name}${streak > 1 ? ` — سلسلة ${streak} 🔥` : ''}`, { type: 'success' });
    }
  }

  function archive(id) {
    Store.updateHabit(id, { archived: true });
    UI.toast('أُرشفت العادة', { action: { label: 'تراجع', fn: () => Store.updateHabit(id, { archived: false }) } });
  }

  async function remove(id) {
    const h = Store.getHabit(id);
    const ok = await UI.confirm({ title: 'حذف العادة', message: `سيُحذف «${h.name}» مع كل سجله. يمكنك الأرشفة بدلاً من ذلك للاحتفاظ بالسجل.`, ok: 'حذف نهائي', danger: true });
    if (!ok) return;
    const rec = Store.deleteHabit(id);
    if (rec) UI.toast('حُذفت العادة', { action: { label: 'تراجع', fn: () => Store.restoreHabit(rec) } });
  }

  function todayItem(h, today) {
    const count = Store.habitCount(h, today);
    const streak = Store.habitStreak(h);
    return `<div class="today-habit ${count >= h.target ? 'done' : ''}">
      <button class="habit-icon" style="--c:${colorHex(h.color)}" data-habit-open="${h.id}" title="السجل">${esc(h.icon)}</button>
      <div class="th-body">
        <strong>${esc(h.name)}</strong>
        <span class="muted small">${h.target > 1 ? `${count} / ${h.target} ${esc(h.unit || '')} · ` : ''}${streak ? `🔥 ${streak}` : 'ابدأ السلسلة اليوم'}</span>
      </div>
      ${cell(h, today, true)}
    </div>`;
  }

  // ---------- المحرّر ----------
  function editor(id) {
    const existing = id && Store.getHabit(id);
    const draft = existing ? { ...existing, days: [...existing.days] } : { name: '', icon: '✅', color: 'blue', days: [0, 1, 2, 3, 4, 5, 6], target: 1, unit: '' };
    const body = `
      ${existing ? '' : `<div class="templates"><span class="muted small">اقتراحات سريعة:</span>${TEMPLATES.map((t, i) => `<button type="button" class="chip-btn" data-tpl="${i}">${t.icon} ${esc(t.name)}</button>`).join('')}</div>`}
      <form class="form" data-habit-form>
        <label class="field"><span>اسم العادة</span><input name="name" value="${esc(draft.name)}" placeholder="مثال: قراءة 10 صفحات" autocomplete="off" autofocus></label>
        <div class="field"><span>الأيقونة</span>
          <div class="emoji-grid">${EMOJIS.map((e) => `<label class="emoji-opt"><input type="radio" name="icon" value="${e}" ${e === draft.icon ? 'checked' : ''}><span>${e}</span></label>`).join('')}</div>
        </div>
        <div class="field"><span>اللون</span>${UI.colorPicker('color', draft.color)}</div>
        <div class="field"><span>أيام التكرار</span>
          <div class="day-picker">${orderedDays().map((d) => `<label class="day-opt"><input type="checkbox" name="days" value="${d}" ${draft.days.includes(d) ? 'checked' : ''}><span>${DAY_SHORT[d]}</span></label>`).join('')}</div>
          <div class="day-presets">
            <button type="button" class="link" data-days="0,1,2,3,4,5,6">كل يوم</button>
            <button type="button" class="link" data-days="0,1,2,3,4">أيام العمل</button>
            <button type="button" class="link" data-days="5,6">نهاية الأسبوع</button>
          </div>
        </div>
        <div class="form-grid">
          <label class="field"><span>الهدف اليومي (عدد المرات)</span><input type="number" name="target" min="1" max="99" value="${draft.target}"></label>
          <label class="field"><span>الوحدة (اختياري)</span><input name="unit" value="${esc(draft.unit)}" placeholder="مثال: أكواب، صفحات"></label>
        </div>
      </form>`;
    UI.modal({
      title: existing ? 'تعديل العادة' : 'عادة جديدة',
      body,
      size: 'md',
      footer: `<span class="spacer"></span><button class="btn ghost" data-close>إلغاء</button><button class="btn primary" data-save>${existing ? 'حفظ' : 'إضافة العادة'}</button>`,
      onMount(box, close) {
        const form = $('[data-habit-form]', box);
        const setDays = (days) => $$('[name=days]', form).forEach((c) => (c.checked = days.includes(Number(c.value))));
        const save = () => {
          const f = new FormData(form);
          const data = {
            name: String(f.get('name') || '').trim(),
            icon: f.get('icon') || '✅',
            color: f.get('color') || 'blue',
            days: f.getAll('days').map(Number),
            target: clamp(parseInt(f.get('target'), 10) || 1, 1, 99),
            unit: String(f.get('unit') || '').trim(),
          };
          if (!data.name) return UI.toast('اكتب اسماً للعادة', { type: 'error' });
          if (!data.days.length) return UI.toast('اختر يوماً واحداً على الأقل', { type: 'error' });
          close();
          if (existing) Store.updateHabit(existing.id, data);
          else {
            Store.addHabit(data);
            UI.toast(`${data.icon} أُضيفت العادة — بالتوفيق!`, { type: 'success' });
          }
        };
        box.addEventListener('click', (e) => {
          const tpl = e.target.closest('[data-tpl]');
          if (tpl) {
            const t = TEMPLATES[tpl.dataset.tpl];
            form.elements.name.value = t.name;
            form.elements.target.value = t.target || 1;
            form.elements.unit.value = t.unit || '';
            $$('[name=icon]', form).forEach((r) => (r.checked = r.value === t.icon));
            $$('[name=color]', form).forEach((r) => (r.checked = r.value === t.color));
            setDays(t.days || [0, 1, 2, 3, 4, 5, 6]);
          }
          const preset = e.target.closest('[data-days]');
          if (preset) setDays(preset.dataset.days.split(',').map(Number));
          if (e.target.closest('[data-save]')) save();
        });
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          save();
        });
      },
    });
  }

  // ---------- التفاصيل والسجل ----------
  function details(id) {
    const h = Store.getHabit(id);
    if (!h) return;
    const tiles = () => {
      const rate = Store.habitRate(h, 30);
      const total = Object.keys(h.log).filter((k) => h.log[k] >= h.target).length;
      return `
        <div class="stat"><span class="stat-label">السلسلة الحالية</span><strong class="stat-value">🔥 ${Store.habitStreak(h)}</strong></div>
        <div class="stat"><span class="stat-label">أفضل سلسلة</span><strong class="stat-value">${Store.habitBest(h)}</strong></div>
        <div class="stat"><span class="stat-label">الالتزام (30 يوماً)</span><strong class="stat-value">${rate.total ? `${Math.round(rate.rate * 100)}%` : '—'}</strong><span class="stat-sub">${rate.done} من ${rate.total} يوم</span></div>
        <div class="stat"><span class="stat-label">أيام الإنجاز</span><strong class="stat-value">${total}</strong></div>`;
    };
    UI.modal({
      title: `${h.icon} ${h.name}`,
      size: 'lg',
      body: `
        <p class="muted">${esc(freqText(h))}${targetText(h) ? ` · ${esc(targetText(h))}` : ''} · بدأت ${esc(D.short(h.startKey))}</p>
        <div class="tiles four" data-tiles>${tiles()}</div>
        <h4 class="list-title">السجل</h4>
        <div class="chart-box heat-box" data-heat></div>
        <p class="muted small">💡 انقر على أي يوم في السجل لتسجيله أو إلغائه، والنقر الأيمن للإنقاص.</p>`,
      footer: `<button class="btn ghost danger-text" data-del>${icon('trash')}حذف</button>
        <button class="btn ghost" data-arch>${icon(h.archived ? 'restore' : 'archive')}${h.archived ? 'استعادة' : 'أرشفة'}</button>
        <span class="spacer"></span>
        <button class="btn ghost" data-edit>${icon('edit')}تعديل</button>
        <button class="btn primary" data-close>إغلاق</button>`,
      onMount(box, close) {
        const heat = $('[data-heat]', box);
        Charts.mount(heat, Charts.heatmap(h));
        const refresh = () => {
          heat._lastW = 0;
          heat._draw();
          $('[data-tiles]', box).innerHTML = tiles();
        };
        const onCell = (e) => {
          const r = e.target.closest('[data-hk]');
          if (!r) return;
          e.preventDefault();
          bump(h.id, r.dataset.hk, e.type === 'contextmenu' ? -1 : 1);
          refresh();
        };
        heat.addEventListener('click', onCell);
        heat.addEventListener('contextmenu', onCell);
        box.addEventListener('click', (e) => {
          if (e.target.closest('[data-edit]')) {
            close();
            editor(h.id);
          } else if (e.target.closest('[data-arch]')) {
            close();
            if (h.archived) Store.updateHabit(h.id, { archived: false });
            else archive(h.id);
          } else if (e.target.closest('[data-del]')) {
            close();
            remove(h.id);
          }
        });
      },
    });
  }

  // ---------- الشاشة ----------
  function habitRow(h, days) {
    const streak = Store.habitStreak(h);
    const rate = Store.habitRate(h, 30);
    const sub = [freqText(h), targetText(h)].filter(Boolean).join(' · ');
    return `<div class="habit-row ${h.archived ? 'archived' : ''}">
      <button class="habit-info" data-habit-open="${h.id}" title="السجل والإحصائيات">
        <span class="habit-icon" style="--c:${colorHex(h.color)}">${esc(h.icon)}</span>
        <span class="hi-text"><strong>${esc(h.name)}</strong><small>${esc(sub)}</small></span>
      </button>
      ${days.map((k) => `<span class="hcol">${cell(h, k)}</span>`).join('')}
      <span class="streak ${streak ? 'on' : ''}" title="السلسلة الحالية">${streak ? '🔥 ' : ''}${streak}</span>
      <span class="rate" title="نسبة الالتزام خلال 30 يوماً">${rate.total ? `${Math.round(rate.rate * 100)}%` : '—'}</span>
      <button class="icon-btn" data-habit-menu="${h.id}" title="خيارات" aria-label="خيارات ${esc(h.name)}">${icon('more')}</button>
    </div>`;
  }

  function render(root) {
    const today = D.today();
    const days = D.range(today, 7);
    const active = Store.activeHabits();
    const archived = Store.state.habits.filter((h) => h.archived);
    const hb = Store.habitsOn(today);

    const page = document.createElement('div');
    page.className = 'page';
    page.innerHTML = `
      <header class="page-head">
        <div><h1>العادات</h1><p class="sub">${hb.total ? `أنجزت ${hb.done} من ${hb.total} لليوم${hb.done === hb.total ? ' — يوم مثالي! 🌟' : ''}` : 'العادات الصغيرة المتكررة تصنع الفرق الكبير.'}</p></div>
        <div class="head-actions"><button class="btn primary" data-new-habit>${icon('plus')}عادة جديدة</button></div>
      </header>
      ${active.length ? `
      <section class="card habit-table">
        <div class="habit-row head">
          <span class="col-h start">العادة</span>
          ${days.map((k) => `<span class="hcol day-head ${k === today ? 'today' : ''}"><b>${k === today ? 'اليوم' : DAY_SHORT[D.weekday(k)]}</b><small>${D.parse(k).getDate()}</small></span>`).join('')}
          <span class="col-h">السلسلة</span><span class="col-h">30 يوماً</span><span></span>
        </div>
        ${active.map((h) => habitRow(h, days)).join('')}
      </section>
      <p class="muted small hint">💡 انقر على الخانة لتسجيل الإنجاز (للعادات ذات العدد: كل نقرة +1)، والنقر الأيمن للإنقاص.</p>` : `
      <section class="card">
        ${UI.empty('🌱', 'ابدأ أول عادة', 'اختر من الاقتراحات أو أنشئ عادتك الخاصة.')}
        <div class="templates center">${TEMPLATES.map((t, i) => `<button class="chip-btn" data-quick-tpl="${i}">${t.icon} ${esc(t.name)}</button>`).join('')}</div>
      </section>`}
      ${archived.length ? `
      <button class="link archived-toggle" data-toggle-archived>${icon('archive')}العادات المؤرشفة (${archived.length}) ${icon('chevron', view.showArchived ? 'rot' : '')}</button>
      ${view.showArchived ? `<section class="card habit-table archived-list">${archived.map((h) => habitRow(h, days)).join('')}</section>` : ''}` : ''}`;

    page.addEventListener('click', (e) => {
      if (handle(e)) return;
      if (e.target.closest('[data-new-habit]')) editor(null);
      const q = e.target.closest('[data-quick-tpl]');
      if (q) {
        const t = TEMPLATES[q.dataset.quickTpl];
        Store.addHabit({ ...t });
        UI.toast(`${t.icon} أُضيفت «${t.name}»`, { type: 'success' });
      }
      if (e.target.closest('[data-toggle-archived]')) {
        view.showArchived = !view.showArchived;
        App.render();
      }
    });
    page.addEventListener('contextmenu', handle);
    root.replaceChildren(page);
  }

  return { render, handle, todayItem, editor, details, freqText };
})();

Views.habits = { render: Habits.render };
