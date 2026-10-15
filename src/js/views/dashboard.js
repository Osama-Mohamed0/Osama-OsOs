'use strict';
// الشاشة الرئيسية: ملخص اليوم

Views.dashboard = {
  render(root) {
    const s = Store.state.settings;
    const today = D.today();
    const score = Store.dayScore(today);
    const done = Store.doneOn(today);
    const focus = Store.focusOn(today);
    const hb = Store.habitsOn(today);
    const streak = Store.productiveStreak();
    const hour = new Date().getHours();
    const greet = hour < 5 ? 'مساء الخير' : hour < 12 ? 'صباح الخير' : 'مساء الخير';
    const name = s.name ? `، ${esc(s.name)}` : '';

    const message =
      score >= 100
        ? 'أحسنت! حققت كل أهداف اليوم 🎉'
        : score >= 75
          ? 'رائع! أنت قريب جداً من أهدافك'
          : score >= 50
            ? 'يوم منتج — واصل على هذا الإيقاع'
            : score > 0
              ? 'بداية جيدة، استمر خطوة بخطوة'
              : 'يومك بانتظارك — ابدأ بمهمة صغيرة';

    const open = Store.sortTasks(Store.state.tasks.filter((t) => !t.done && t.due && t.due <= today));
    const doneToday = Store.state.tasks.filter((t) => t.done && t.doneAt && D.key(new Date(t.doneAt)) === today);
    const shown = open.slice(0, 8);

    const meter = (label, value, goal, text) => {
      const pct = goal > 0 ? clamp((value / goal) * 100, 0, 100) : 0;
      return `<div class="meter-row">
        <div class="meter-head"><span>${label}</span><span class="meter-val">${text}</span></div>
        <div class="meter"><span style="width:${pct}%"></span></div>
      </div>`;
    };

    const days = D.range(today, 7).map((k) => ({ k, label: k === today ? 'اليوم' : DAY_NAMES[D.weekday(k)], tipLabel: D.long(k) }));
    const tasksData = days.map((d) => ({ ...d, value: Store.doneOn(d.k) }));
    const focusData = days.map((d) => ({ ...d, value: Store.focusOn(d.k) }));

    const page = document.createElement('div');
    page.className = 'page';
    page.innerHTML = `
      <header class="page-head">
        <div><h1>${greet}${name} 👋</h1><p class="sub">${esc(D.long(today))}${
          window.Sync && Sync.paired()
            ? ` · <button class="link dash-sync" data-go="settings">${icon('sync')}${Sync.status === 'offline' || Sync.status === 'bad-code' ? 'غير متصل بالكمبيوتر' : `متزامن ${Sync.config.lastAt ? fmtAgo(Sync.config.lastAt) : ''}`}</button>`
            : ''
        }</p></div>
        <div class="head-actions">
          <button class="btn ghost" data-go="focus">${icon('focus')}جلسة تركيز</button>
          <button class="btn primary" data-new-task>${icon('plus')}مهمة جديدة</button>
        </div>
      </header>

      <section class="card hero">
        <div class="hero-ring">
          ${Charts.ring(score, { size: 148, stroke: 13 })}
          <div class="ring-center"><strong>${score}</strong><span>نقاط اليوم</span></div>
        </div>
        <div class="hero-body">
          <h2>${message}</h2>
          <p class="muted small">النقاط = متوسط ما حققته من أهدافك اليومية في المهام والتركيز والعادات.</p>
          <div class="meters">
            ${meter('المهام المنجزة', done, s.goalTasks, `${done} / ${s.goalTasks}`)}
            ${meter('وقت التركيز', focus, s.goalFocus, `${fmtMinutes(focus)} / ${fmtMinutes(s.goalFocus)}`)}
            ${hb.total ? meter('العادات', hb.done, hb.total, `${hb.done} / ${hb.total}`) : ''}
          </div>
        </div>
        <div class="hero-streak" title="أيام متتالية حققت فيها 50% أو أكثر من أهدافك">
          <span class="flame">🔥</span>
          <strong>${streak}</strong>
          <span>${streak === 1 ? 'يوم منتج' : streak === 2 ? 'يومان منتجان' : 'أيام منتجة متتالية'}</span>
        </div>
      </section>

      <div class="grid-2">
        <section class="card">
          <header class="card-head">
            <h3>مهام اليوم ${open.length ? `<span class="count">${open.length}</span>` : ''}</h3>
            <button class="link" data-go="tasks">عرض الكل</button>
          </header>
          ${Tasks.quickAdd({ id: 'qa-dash', due: today, compact: true })}
          <div class="task-list">${shown.map(Tasks.row).join('')}</div>
          ${open.length > shown.length ? `<button class="link more" data-go="tasks">+ ${open.length - shown.length} مهام أخرى</button>` : ''}
          ${!open.length ? UI.empty(doneToday.length ? '🎉' : '🌤️', doneToday.length ? 'أنجزت كل مهام اليوم!' : 'لا مهام لليوم', doneToday.length ? `أنجزت ${pTasks(doneToday.length)} اليوم.` : 'أضف مهمة من الشريط أعلاه.') : ''}
        </section>

        <section class="card">
          <header class="card-head">
            <h3>عادات اليوم ${hb.total ? `<span class="count">${hb.done}/${hb.total}</span>` : ''}</h3>
            <button class="link" data-go="habits">إدارة العادات</button>
          </header>
          ${hb.total ? `<div class="today-habits">${hb.list.map((h) => Habits.todayItem(h, today)).join('')}</div>` : UI.empty('🌱', 'لا عادات لليوم', 'أضف عادة صغيرة تبني بها يومك.', `<button class="btn primary sm" data-go="habits">${icon('plus')}إضافة عادة</button>`)}
        </section>
      </div>

      <div class="grid-2">
        <section class="card">
          <header class="card-head"><h3>المهام المنجزة — آخر 7 أيام</h3></header>
          <div class="chart-box" data-chart="tasks"></div>
        </section>
        <section class="card">
          <header class="card-head"><h3>دقائق التركيز — آخر 7 أيام</h3></header>
          <div class="chart-box" data-chart="focus"></div>
        </section>
      </div>`;

    page.addEventListener('click', (e) => {
      if (Tasks.handle(e)) return;
      if (Habits.handle(e)) return;
      if (e.target.closest('[data-new-task]')) Tasks.openEditor(null, { due: today });
    });
    page.addEventListener('contextmenu', (e) => Habits.handle(e));
    Tasks.bindQuickAdd(page);
    root.replaceChildren(page);

    Charts.mount($('[data-chart="tasks"]', page), Charts.bars(tasksData, { height: 190, aria: 'المهام المنجزة يومياً خلال آخر 7 أيام', fmt: (v) => (v ? pTasks(v) : 'لا مهام') }));
    Charts.mount($('[data-chart="focus"]', page), Charts.bars(focusData, { height: 190, aria: 'دقائق التركيز يومياً خلال آخر 7 أيام', fmt: (v) => fmtMinutes(v) }));
  },
};
