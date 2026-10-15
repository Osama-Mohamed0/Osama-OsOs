'use strict';
// شاشة الإحصائيات: الإنتاجية عبر الزمن

Views.stats = (() => {
  const view = { range: 30, table: false };
  const RANGES = [
    { n: 7, label: '7 أيام' },
    { n: 30, label: '30 يوماً' },
    { n: 90, label: '90 يوماً' },
  ];

  const sum = (keys, fn) => keys.reduce((a, k) => a + fn(k), 0);

  // التغيّر عن الفترة السابقة: نسبة مئوية للكميات، ونقاط للنسب والدرجات
  function delta(cur, prev, points = false) {
    if (!points && !prev) return cur ? '<span class="delta up">▲ جديد</span>' : '<span class="delta">—</span>';
    const diff = points ? Math.round(cur - prev) : Math.round(((cur - prev) / prev) * 100);
    if (diff === 0) return '<span class="delta">بلا تغيير عن الفترة السابقة</span>';
    const unit = points ? (Math.abs(diff) === 1 ? ' نقطة' : Math.abs(diff) === 2 ? ' نقطتان' : Math.abs(diff) <= 10 ? ' نقاط' : ' نقطة') : '%';
    return `<span class="delta ${diff > 0 ? 'up' : 'down'}">${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)}${unit}<span class="muted"> عن الفترة السابقة</span></span>`;
  }

  // نسبة الالتزام بعادة خلال مجموعة أيام (اليوم يُحسب فقط إن أُنجز)
  function rateIn(h, days, today) {
    let total = 0;
    let done = 0;
    for (const k of days) {
      if (!Store.isScheduled(h, k)) continue;
      const ok = Store.isHabitDone(h, k);
      if (k === today && !ok) continue;
      total++;
      if (ok) done++;
    }
    return { total, done };
  }

  function render(root) {
    const today = D.today();
    const n = view.range;
    const days = D.range(today, n);
    const prev = D.range(D.add(today, -n), n);
    const tasks = sum(days, Store.doneOn);
    const focus = sum(days, Store.focusOn);
    const startKey = D.key(new Date(Store.state.createdAt));
    const scoreDays = days.filter((k) => k >= startKey);
    const avgScore = scoreDays.length ? Math.round(sum(scoreDays, Store.dayScore) / scoreDays.length) : 0;
    const prevScoreDays = prev.filter((k) => k >= startKey);
    const prevAvg = prevScoreDays.length ? Math.round(sum(prevScoreDays, Store.dayScore) / prevScoreDays.length) : 0;

    const habits = Store.activeHabits();
    const habitRates = habits.map((h) => ({ h, ...rateIn(h, days, today) }));
    const hTotal = habitRates.reduce((a, r) => a + r.total, 0);
    const hDone = habitRates.reduce((a, r) => a + r.done, 0);
    const prevHabit = habits.map((h) => rateIn(h, prev, today)).reduce((a, r) => ({ total: a.total + r.total, done: a.done + r.done }), { total: 0, done: 0 });

    const label = (k) => (n <= 7 ? (k === today ? 'اليوم' : DAY_NAMES[D.weekday(k)]) : `${D.parse(k).getDate()}/${D.parse(k).getMonth() + 1}`);
    const tasksData = days.map((k) => ({ label: label(k), tipLabel: D.long(k), value: Store.doneOn(k) }));
    const focusData = days.map((k) => ({ label: label(k), tipLabel: D.long(k), value: Store.focusOn(k) }));

    // حسب التصنيف
    const byCat = {};
    days.forEach((k) => Store.doneCategoriesOn(k).forEach((c) => (byCat[c || ''] = (byCat[c || ''] || 0) + 1)));
    const catRows = Object.entries(byCat)
      .map(([id, value]) => {
        const c = id && Store.getCategory(id);
        return { label: c ? c.name : 'بدون تصنيف', value, color: c ? colorHex(c.color) : 'var(--muted)', text: String(value) };
      })
      .sort((a, b) => b.value - a.value);

    // متوسط المهام حسب يوم الأسبوع
    const ws = Store.state.settings.weekStart;
    const weekdayData = Array.from({ length: 7 }, (_, i) => {
      const wd = (ws + i) % 7;
      const ks = days.filter((k) => D.weekday(k) === wd && k >= startKey);
      const avg = ks.length ? sum(ks, Store.doneOn) / ks.length : 0;
      return { label: DAY_NAMES[wd].replace('ال', ''), tipLabel: `متوسط يوم ${DAY_NAMES[wd]}`, value: Math.round(avg * 10) / 10 };
    });

    // أبرز الأرقام
    const bestDay = days.reduce((best, k) => (Store.doneOn(k) > (best ? Store.doneOn(best) : 0) ? k : best), null);
    const rangeSessions = Store.state.sessions.filter((s) => D.key(new Date(s.start)) >= days[0]);
    const longest = rangeSessions.reduce((m, s) => Math.max(m, s.minutes), 0);
    const bestHabit = habits.map((h) => ({ h, best: Store.habitBest(h) })).sort((a, b) => b.best - a.best)[0];

    const chartOrTable = (key, data, valLabel, fmt) =>
      view.table ? Charts.table(data, 'اليوم', valLabel, fmt) : `<div class="chart-box" data-chart="${key}"></div>`;

    const page = document.createElement('div');
    page.className = 'page';
    page.innerHTML = `
      <header class="page-head"><div><h1>الإحصائيات</h1><p class="sub">نظرة على إنتاجيتك وتطوّرها مع الوقت.</p></div></header>
      <div class="filter-row">
        <div class="seg" role="tablist">${RANGES.map((r) => `<button role="tab" class="${r.n === n ? 'active' : ''}" data-range="${r.n}">آخر ${r.label}</button>`).join('')}</div>
        <button class="btn ghost sm" data-table>${icon(view.table ? 'chart' : 'table')}${view.table ? 'عرض كمخططات' : 'عرض كجداول'}</button>
      </div>

      <div class="tiles four">
        <div class="stat card"><span class="stat-label">المهام المنجزة</span><strong class="stat-value">${tasks}</strong>${delta(tasks, sum(prev, Store.doneOn))}</div>
        <div class="stat card"><span class="stat-label">وقت التركيز</span><strong class="stat-value">${fmtMinutes(focus)}</strong>${delta(focus, sum(prev, Store.focusOn))}</div>
        <div class="stat card"><span class="stat-label">متوسط نقاط اليوم</span><strong class="stat-value">${avgScore}</strong>${prevScoreDays.length ? delta(avgScore, prevAvg, true) : '<span class="delta">من 100</span>'}</div>
        <div class="stat card"><span class="stat-label">الالتزام بالعادات</span><strong class="stat-value">${hTotal ? `${Math.round((hDone / hTotal) * 100)}%` : '—'}</strong>${
          hTotal ? (prevHabit.total ? delta((hDone / hTotal) * 100, (prevHabit.done / prevHabit.total) * 100, true) : '<span class="delta">—</span>') : '<span class="delta">أضف عادات لتظهر هنا</span>'
        }</div>
      </div>

      <div class="grid-2">
        <section class="card"><header class="card-head"><h3>المهام المنجزة يومياً</h3></header>${chartOrTable('tasks', tasksData, 'المهام', fmtNum)}</section>
        <section class="card"><header class="card-head"><h3>دقائق التركيز يومياً</h3></header>${chartOrTable('focus', focusData, 'الدقائق', fmtNum)}</section>
      </div>

      <div class="grid-2">
        <section class="card">
          <header class="card-head"><h3>الالتزام بكل عادة</h3></header>
          ${habitRates.length ? Charts.hbars(habitRates.map((r) => ({ label: `${r.h.icon} ${r.h.name}`, value: r.total ? (r.done / r.total) * 100 : 0, max: 100, color: colorHex(r.h.color), text: r.total ? `${Math.round((r.done / r.total) * 100)}%` : '—' }))) : UI.empty('🌱', 'لا عادات بعد', 'أضف عاداتك من شاشة العادات.')}
        </section>
        <section class="card">
          <header class="card-head"><h3>المهام المنجزة حسب التصنيف</h3></header>
          ${catRows.length ? Charts.hbars(catRows) : UI.empty('🏷️', 'لا بيانات بعد', 'أنجز مهاماً مصنّفة لتظهر هنا.')}
        </section>
      </div>

      <div class="grid-2">
        <section class="card"><header class="card-head"><h3>متوسط المهام حسب يوم الأسبوع</h3></header>${view.table ? Charts.table([...weekdayData].reverse(), 'اليوم', 'المتوسط', fmtNum) : '<div class="chart-box" data-chart="weekday"></div>'}</section>
        <section class="card">
          <header class="card-head"><h3>أبرز الأرقام</h3></header>
          <ul class="highlights">
            <li><span>🏆 أفضل يوم</span><strong>${bestDay ? `${esc(D.long(bestDay))} — ${pTasks(Store.doneOn(bestDay))}` : '—'}</strong></li>
            <li><span>⏱️ أطول جلسة تركيز</span><strong>${longest ? fmtMinutes(longest) : '—'}</strong></li>
            <li><span>🎯 عدد جلسات التركيز</span><strong>${rangeSessions.length}</strong></li>
            <li><span>🔥 أطول سلسلة عادة</span><strong>${bestHabit && bestHabit.best ? `${esc(bestHabit.h.icon)} ${esc(bestHabit.h.name)} — ${bestHabit.best}` : '—'}</strong></li>
            <li><span>📌 مهام مفتوحة حالياً</span><strong>${Store.state.tasks.filter((t) => !t.done).length}</strong></li>
          </ul>
        </section>
      </div>`;

    page.addEventListener('click', (e) => {
      const r = e.target.closest('[data-range]');
      if (r) {
        view.range = Number(r.dataset.range);
        App.render();
      }
      if (e.target.closest('[data-table]')) {
        view.table = !view.table;
        App.render();
      }
    });
    root.replaceChildren(page);

    if (!view.table) {
      Charts.mount($('[data-chart="tasks"]', page), Charts.bars(tasksData, { height: 220, aria: 'المهام المنجزة يومياً', fmt: (v) => (v ? pTasks(v) : 'لا مهام') }));
      Charts.mount($('[data-chart="focus"]', page), Charts.bars(focusData, { height: 220, aria: 'دقائق التركيز يومياً', fmt: fmtMinutes }));
      Charts.mount($('[data-chart="weekday"]', page), Charts.bars(weekdayData, { height: 200, aria: 'متوسط المهام المنجزة حسب يوم الأسبوع', fmt: (v) => `${fmtNum(v)} مهمة في المتوسط` }));
    }
  }

  return { render };
})();
