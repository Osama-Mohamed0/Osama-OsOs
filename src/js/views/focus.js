'use strict';
// مؤقّت التركيز (بومودورو): المحرّك + الشاشة

const Focus = (() => {
  const MODES = {
    focus: { label: 'تركيز', key: 'focusMin', icon: 'target' },
    short: { label: 'استراحة قصيرة', key: 'shortMin', icon: 'coffee' },
    long: { label: 'استراحة طويلة', key: 'longMin', icon: 'coffee' },
  };
  const t = { mode: 'focus', status: 'idle', endAt: 0, remaining: 0, duration: 0, taskId: null, cycle: 0, startedAt: null, focusedMs: 0, resumedAt: 0 };
  const subs = new Set();
  let timer = null;
  let audio = null;

  const settings = () => Store.state.settings;
  const minutesFor = (mode) => clamp(Number(settings()[MODES[mode].key]) || 1, 1, 180);
  const longEvery = () => clamp(Number(settings().longEvery) || 4, 2, 12);
  const emit = (full = true) => subs.forEach((fn) => fn(full));

  function remainingMs() {
    if (t.status === 'running') return Math.max(0, t.endAt - Date.now());
    if (t.status === 'paused') return t.remaining;
    return minutesFor(t.mode) * 60000;
  }
  const totalMs = () => (t.status === 'idle' ? minutesFor(t.mode) * 60000 : t.duration);
  const progress = () => clamp(1 - remainingMs() / totalMs(), 0, 1);
  const elapsedFocusMs = () => t.focusedMs + (t.status === 'running' ? Date.now() - t.resumedAt : 0);

  function start() {
    if (t.status === 'running') return;
    if (t.status === 'idle') {
      t.duration = minutesFor(t.mode) * 60000;
      t.remaining = t.duration;
      t.startedAt = Date.now();
      t.focusedMs = 0;
    }
    t.endAt = Date.now() + t.remaining;
    t.resumedAt = Date.now();
    t.status = 'running';
    unlockAudio();
    if (!timer) timer = setInterval(tick, 250);
    emit();
  }

  function pause() {
    if (t.status !== 'running') return;
    t.remaining = Math.max(0, t.endAt - Date.now());
    t.focusedMs += Date.now() - t.resumedAt;
    t.status = 'paused';
    emit();
  }

  const toggle = () => (t.status === 'running' ? pause() : start());

  function clearRun() {
    t.status = 'idle';
    t.remaining = 0;
    t.startedAt = null;
    t.focusedMs = 0;
  }

  function reset() {
    clearRun();
    emit();
  }

  function record(ms) {
    const minutes = Math.round(ms / 60000);
    if (minutes < 1) return null;
    return Store.addSession({ start: t.startedAt || Date.now() - ms, end: Date.now(), minutes, taskId: t.taskId });
  }

  function nextMode(completedFocus) {
    if (t.mode !== 'focus') return 'focus';
    return completedFocus && t.cycle % longEvery() === 0 ? 'long' : 'short';
  }

  // تخطي: يسجّل ما تم من التركيز (دقيقة فأكثر) ثم ينتقل للمرحلة التالية
  function skip() {
    if (t.mode === 'focus' && t.status !== 'idle') record(elapsedFocusMs());
    t.mode = nextMode(false);
    clearRun();
    emit();
  }

  function setMode(mode) {
    if (!MODES[mode] || mode === t.mode) return;
    if (t.mode === 'focus' && t.status !== 'idle') record(elapsedFocusMs());
    t.mode = mode;
    clearRun();
    emit();
  }

  function setTask(id) {
    t.taskId = id || null;
    emit();
  }

  function startForTask(id) {
    t.taskId = id;
    if (t.mode !== 'focus' && t.status === 'idle') t.mode = 'focus';
    if (t.status !== 'running') start();
    else emit();
  }

  function complete() {
    const wasFocus = t.mode === 'focus';
    if (wasFocus) {
      record(t.duration);
      t.cycle++;
      const task = t.taskId && Store.getTask(t.taskId);
      notify('أحسنت! انتهت جلسة التركيز 🎉', `${minutesFor('focus')} دقيقة تركيز${task ? ` على «${task.title}»` : ''}. خذ استراحة قصيرة الآن.`);
    } else {
      notify('انتهت الاستراحة ☕', 'هل أنت جاهز لجلسة تركيز جديدة؟');
    }
    beep();
    Store.api.attention();
    t.mode = nextMode(wasFocus);
    clearRun();
    if (wasFocus && settings().autoBreak) start();
    else emit();
  }

  function tick() {
    if (t.status !== 'running') {
      clearInterval(timer);
      timer = null;
      return;
    }
    if (Date.now() >= t.endAt) complete();
    else emit(false);
  }

  function notify(title, body) {
    UI.toast(title, { type: 'success', timeout: 6000 });
    if (settings().notifications) Store.api.notify(title, body);
  }

  // ---------- الصوت (WebAudio بلا ملفات) ----------
  function unlockAudio() {
    try {
      audio = audio || new AudioContext();
      if (audio.state === 'suspended') audio.resume();
    } catch {
      audio = null;
    }
  }

  function beep() {
    if (!settings().sound) return;
    unlockAudio();
    if (!audio) return;
    const now = audio.currentTime;
    [0, 0.3, 0.6].forEach((d, i) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.value = i === 2 ? 1046.5 : 784;
      gain.gain.setValueAtTime(0.0001, now + d);
      gain.gain.exponentialRampToValueAtTime(0.25, now + d + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + d + 0.26);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + d);
      osc.stop(now + d + 0.3);
    });
  }

  const subscribe = (fn) => {
    subs.add(fn);
    return () => subs.delete(fn);
  };

  const snapshot = () => ({
    ...t,
    remaining: remainingMs(),
    total: totalMs(),
    progress: progress(),
    label: MODES[t.mode].label,
    dots: t.cycle % longEvery() || (t.cycle && t.mode === 'long' ? longEvery() : 0),
    longEvery: longEvery(),
  });

  // ---------- الشاشة ----------
  const RING = 280;

  function statusText(s) {
    if (s.status === 'running') return s.mode === 'focus' ? 'ركّز… أنت تبلي حسناً' : 'استرخِ قليلاً';
    if (s.status === 'paused') return 'متوقف مؤقتاً';
    return s.mode === 'focus' ? 'جاهز للتركيز' : 'وقت الاستراحة';
  }

  function render(root) {
    const s = snapshot();
    const today = D.today();
    const sessions = Store.sessionsOn(today);
    const minutes = Store.focusOn(today);
    const goal = settings().goalFocus;
    const openTasks = Store.sortTasks(Store.state.tasks.filter((x) => !x.done)).slice(0, 150);
    const task = s.taskId && Store.getTask(s.taskId);

    const page = document.createElement('div');
    page.className = 'page';
    page.innerHTML = `
      <header class="page-head">
        <div><h1>التركيز</h1><p class="sub">تقنية بومودورو: ${minutesFor('focus')} دقيقة تركيز، ثم استراحة قصيرة، واستراحة طويلة كل ${s.longEvery} جلسات.</p></div>
        <div class="head-actions"><button class="btn ghost" data-go="settings">${icon('settings')}تعديل المدد</button></div>
      </header>
      <div class="focus-grid">
        <section class="card focus-card mode-${s.mode}">
          <div class="seg" role="tablist">
            ${Object.entries(MODES).map(([k, m]) => `<button role="tab" class="${k === s.mode ? 'active' : ''}" data-mode="${k}">${m.label}<small>${minutesFor(k)} د</small></button>`).join('')}
          </div>
          <div class="timer">
            ${Charts.ring(s.progress * 100, { size: RING, stroke: 14, cls: 'timer-ring' })}
            <div class="timer-center">
              <div class="timer-clock" data-clock>${fmtClock(s.remaining)}</div>
              <div class="timer-status" data-status>${statusText(s)}</div>
            </div>
          </div>
          <div class="cycle-dots" title="الجلسات حتى الاستراحة الطويلة">
            ${Array.from({ length: s.longEvery }, (_, i) => `<i class="${i < s.dots ? 'on' : ''}"></i>`).join('')}
          </div>
          <div class="timer-controls">
            <button class="icon-btn lg" data-act="reset" title="إعادة الضبط">${icon('reset')}</button>
            <button class="play-btn" data-act="toggle" aria-label="${s.status === 'running' ? 'إيقاف مؤقت' : 'ابدأ'}" title="${s.status === 'running' ? 'إيقاف مؤقت' : 'ابدأ'} (مسافة)">${icon(s.status === 'running' ? 'pause' : 'play')}</button>
            <button class="icon-btn lg" data-act="skip" title="تخطٍّ إلى المرحلة التالية">${icon('skip', 'flip')}</button>
          </div>
          <label class="field focus-task">
            <span>${icon('tasks')}المهمة التي تعمل عليها</span>
            <select data-task>
              <option value="">— بدون مهمة محددة —</option>
              ${openTasks.map((x) => `<option value="${x.id}" ${x.id === s.taskId ? 'selected' : ''}>${esc(x.title.length > 70 ? `${x.title.slice(0, 70)}…` : x.title)}</option>`).join('')}
              ${task && task.done ? `<option value="${task.id}" selected>${esc(task.title)} (منجزة)</option>` : ''}
            </select>
          </label>
          ${task && !task.done ? `<button class="btn ghost sm" data-done-task>${icon('check')}إنجاز «${esc(task.title.length > 40 ? `${task.title.slice(0, 40)}…` : task.title)}»</button>` : ''}
        </section>

        <section class="card">
          <header class="card-head"><h3>تركيز اليوم</h3></header>
          <div class="focus-today">
            <div class="stat"><span class="stat-label">وقت التركيز</span><strong class="stat-value">${fmtMinutes(minutes)}</strong><span class="stat-sub">من هدف ${fmtMinutes(goal)}</span></div>
            <div class="stat"><span class="stat-label">الجلسات</span><strong class="stat-value">${sessions.length}</strong><span class="stat-sub">${sessions.length ? `آخر جلسة انتهت ${D.time(sessions[sessions.length - 1].end)}` : 'ابدأ أول جلسة'}</span></div>
          </div>
          <div class="meter" title="${Math.round((minutes / Math.max(1, goal)) * 100)}% من الهدف"><span style="width:${clamp((minutes / Math.max(1, goal)) * 100, 0, 100)}%"></span></div>
          <h4 class="list-title">جلسات اليوم</h4>
          ${sessions.length ? `<ul class="session-list">${sessions
            .slice()
            .reverse()
            .map((x) => {
              const tk = x.taskId && Store.getTask(x.taskId);
              return `<li data-sid="${x.id}"><span class="session-time">${D.time(x.start)} – ${D.time(x.end)}</span>
                <span class="session-task">${tk ? esc(tk.title) : '<span class="muted">بدون مهمة</span>'}</span>
                <span class="session-min">${x.minutes} د</span>
                <button class="icon-btn sm" data-del-session title="حذف الجلسة">${icon('x')}</button></li>`;
            })
            .join('')}</ul>` : '<p class="muted small">لم تسجّل جلسات بعد. اختر مهمة واضغط زر التشغيل.</p>'}
        </section>
      </div>`;

    page.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]');
      if (act) {
        if (act.dataset.act === 'toggle') toggle();
        if (act.dataset.act === 'reset') reset();
        if (act.dataset.act === 'skip') skip();
        return;
      }
      const mode = e.target.closest('[data-mode]');
      if (mode && mode.dataset.mode !== t.mode) {
        if (t.status !== 'idle') {
          const ok = await UI.confirm({ title: 'تغيير المرحلة', message: 'سيتوقف المؤقت الحالي. هل تريد المتابعة؟', ok: 'نعم، غيّر' });
          if (!ok) return;
        }
        setMode(mode.dataset.mode);
        return;
      }
      if (e.target.closest('[data-done-task]') && t.taskId) {
        Store.toggleTask(t.taskId);
        UI.toast('تم إنجاز المهمة ✓');
        return;
      }
      const del = e.target.closest('[data-del-session]');
      if (del) {
        const ok = await UI.confirm({ title: 'حذف الجلسة', message: 'هل تريد حذف هذه الجلسة من السجل؟', ok: 'حذف', danger: true });
        if (ok) Store.deleteSession(del.closest('[data-sid]').dataset.sid);
      }
    });
    page.addEventListener('change', (e) => {
      if (e.target.matches('[data-task]')) setTask(e.target.value);
    });
    root.replaceChildren(page);
  }

  // تحديث خفيف كل ربع ثانية دون إعادة بناء الشاشة
  function update(root) {
    const s = snapshot();
    const clock = $('[data-clock]', root);
    if (!clock) return;
    clock.textContent = fmtClock(s.remaining);
    $('[data-status]', root).textContent = statusText(s);
    const fill = $('.timer-ring .ring-fill', root);
    if (fill) {
      const c = parseFloat(fill.getAttribute('stroke-dasharray'));
      fill.setAttribute('stroke-dashoffset', (c * (1 - s.progress)).toFixed(2));
    }
  }

  return { MODES, start, pause, toggle, reset, skip, setMode, setTask, startForTask, snapshot, subscribe, render, update };
})();

Views.focus = { render: Focus.render, update: Focus.update };
