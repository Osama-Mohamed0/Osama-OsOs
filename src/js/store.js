'use strict';
// مخزن البيانات: الحالة، الحفظ التلقائي، والعمليات على المهام والعادات والجلسات

const Store = (() => {
  const SCHEMA = 1;
  const subs = new Set();
  let state = null;
  let saveTimer = null;
  let dirty = false;
  let cache = null;
  let lastStamp = 0;
  let localVersion = 0; // يزيد مع كل تعديل محلي (لا يشمل ما يأتي من المزامنة)

  // ختم زمني متزايد دائماً، يحدد أي تعديل أحدث عند المزامنة بين الأجهزة
  const stamp = () => (lastStamp = Math.max(Date.now(), lastStamp + 1));
  const touch = (x) => {
    x.updatedAt = stamp();
    return x;
  };
  // إعدادات تتزامن بين الأجهزة (المظهر والحجم وغيرها تبقى خاصة بكل جهاز)
  const SYNCED_SETTINGS = ['name', 'weekStart', 'goalTasks', 'goalFocus', 'focusMin', 'shortMin', 'longMin', 'longEvery', 'autoBreak', 'habitReminder', 'habitReminderTime'];

  // بديل عند فتح الواجهة في متصفح عادي (للتجربة) — يحفظ في localStorage
  function browserApi() {
    const KEY = 'injaz-data';
    const write = (json) => {
      try {
        localStorage.setItem(KEY, json);
        return true;
      } catch {
        return false;
      }
    };
    return {
      async load() {
        try {
          const raw = localStorage.getItem(KEY);
          return { data: raw ? JSON.parse(raw) : null };
        } catch {
          return { data: null };
        }
      },
      save: async (json) => write(json),
      saveSync: write,
      async exportData(json) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        a.download = `injaz-backup-${D.today()}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        return { ok: true };
      },
      importData() {
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'application/json,.json';
          input.onchange = async () => {
            try {
              resolve({ ok: true, data: JSON.parse(await input.files[0].text()) });
            } catch {
              resolve({ ok: false, error: 'invalid' });
            }
          };
          input.click();
        });
      },
      openDataFolder: async () => {},
      info: async () => ({ version: 'web', dataPath: 'localStorage', openAtLogin: false, platform: 'web' }),
      platform: 'web',
      applySettings: async () => ({ openAtLogin: false }),
      notify(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body });
      },
      progress: () => {},
      attention: () => {},
      setZoom: (f) => {
        document.documentElement.style.zoom = f;
      },
    };
  }

  const api = window.api || browserApi();

  // ---------- النماذج ----------
  function makeTask(p = {}) {
    const t = {
      id: uid(),
      title: '',
      notes: '',
      due: null,
      time: null,
      priority: 'none',
      categoryId: null,
      repeat: 'none',
      subtasks: [],
      done: false,
      doneAt: null,
      createdAt: Date.now(),
      remindedAt: null,
      nextId: null,
      updatedAt: 0,
      ...p,
    };
    if (!t.updatedAt) t.updatedAt = t.doneAt || t.createdAt || Date.now();
    if (!Array.isArray(t.subtasks)) t.subtasks = [];
    if (!PRIORITIES[t.priority]) t.priority = 'none';
    if (!REPEATS[t.repeat]) t.repeat = 'none';
    return t;
  }

  function makeHabit(p = {}) {
    const h = {
      id: uid(),
      name: '',
      icon: '✅',
      color: 'blue',
      days: [0, 1, 2, 3, 4, 5, 6],
      target: 1,
      unit: '',
      createdAt: Date.now(),
      startKey: D.today(),
      archived: false,
      log: {},
      logTs: {},
      updatedAt: 0,
      ...p,
    };
    if (!h.updatedAt) h.updatedAt = h.createdAt || Date.now();
    if (!h.logTs || typeof h.logTs !== 'object') h.logTs = {};
    if (!Array.isArray(h.days) || !h.days.length) h.days = [0, 1, 2, 3, 4, 5, 6];
    if (!h.log || typeof h.log !== 'object') h.log = {};
    h.target = clamp(parseInt(h.target, 10) || 1, 1, 99);
    return h;
  }

  function defaults() {
    const today = D.today();
    const now = Date.now();
    const cats = [
      { id: uid(), name: 'عمل', color: 'blue', updatedAt: now, seed: true },
      { id: uid(), name: 'شخصي', color: 'aqua', updatedAt: now, seed: true },
      { id: uid(), name: 'دراسة', color: 'violet', updatedAt: now, seed: true },
      { id: uid(), name: 'صحة', color: 'green', updatedAt: now, seed: true },
    ];
    return {
      schema: SCHEMA,
      createdAt: Date.now(),
      settings: {
        name: '',
        theme: 'system',
        weekStart: 6,
        zoom: 1,
        goalTasks: 5,
        goalFocus: 120,
        focusMin: 25,
        shortMin: 5,
        longMin: 15,
        longEvery: 4,
        autoBreak: false,
        sound: true,
        notifications: true,
        habitReminder: true,
        habitReminderTime: '21:00',
        closeToTray: false,
      },
      categories: cats,
      tasks: [
        makeTask({ title: 'مرحباً بك في إنجاز 👋 اضغط على الدائرة لإنجاز هذه المهمة', due: today, priority: 'medium', categoryId: cats[1].id, seed: true }),
        makeTask({
          title: 'اكتب مهام اليوم في شريط الإضافة السريعة',
          due: today,
          categoryId: cats[0].id,
          subtasks: [
            { id: uid(), title: 'اضغط على المهمة لفتح التفاصيل', done: false },
            { id: uid(), title: 'حدّد موعداً ووقتاً للتذكير', done: false },
          ],
          seed: true,
        }),
        makeTask({ title: 'جرّب جلسة تركيز لمدة 25 دقيقة', due: today, priority: 'low', categoryId: cats[0].id, seed: true }),
      ],
      habits: [],
      sessions: [],
      deleted: {}, // معرّف العنصر المحذوف ← وقت حذفه (ليُحذف من الأجهزة الأخرى أيضاً)
      settingsAt: 0,
      meta: { lastHabitReminder: null },
    };
  }

  function migrate(d) {
    const base = defaults();
    if (!d || typeof d !== 'object') return base;
    return {
      schema: SCHEMA,
      createdAt: d.createdAt || Date.now(),
      settings: { ...base.settings, ...(d.settings || {}) },
      categories: Array.isArray(d.categories) ? d.categories.filter((c) => c && c.id).map((c) => ({ ...c, updatedAt: c.updatedAt || 0 })) : base.categories,
      tasks: Array.isArray(d.tasks) ? d.tasks.filter((t) => t && t.id).map((t) => makeTask(t)) : [],
      habits: Array.isArray(d.habits) ? d.habits.filter((h) => h && h.id).map((h) => makeHabit(h)) : [],
      sessions: Array.isArray(d.sessions) ? d.sessions.filter((x) => x && x.start && x.minutes > 0).map((x) => ({ ...x, updatedAt: x.updatedAt || x.end || x.start })) : [],
      deleted: d.deleted && typeof d.deleted === 'object' ? { ...d.deleted } : {},
      settingsAt: d.settingsAt || 0,
      meta: { ...base.meta, ...(d.meta || {}) },
    };
  }

  // ---------- الحفظ ----------
  async function init() {
    let res;
    try {
      res = await api.load();
    } catch {
      res = { data: null };
    }
    const fresh = !res || !res.data;
    state = migrate(res && res.data);
    if (fresh) {
      dirty = true;
      flush();
    }
    return { fresh, recoveredFrom: res && res.recoveredFrom, corrupt: res && res.corrupt };
  }

  async function flush() {
    if (!dirty) return;
    dirty = false;
    clearTimeout(saveTimer);
    try {
      const ok = await api.save(JSON.stringify(state));
      if (ok === false) throw new Error('save failed');
    } catch (err) {
      dirty = true;
      console.error(err);
      window.dispatchEvent(new CustomEvent('injaz:save-error'));
    }
  }

  function flushSync() {
    if (!dirty) return;
    clearTimeout(saveTimer);
    try {
      api.saveSync(JSON.stringify(state));
      dirty = false;
    } catch (err) {
      console.error(err);
    }
  }

  function commit(fromSync = false) {
    if (!fromSync) localVersion++;
    cache = null;
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 400);
    subs.forEach((fn) => fn());
  }

  const subscribe = (fn) => {
    subs.add(fn);
    return () => subs.delete(fn);
  };

  // ---------- المهام ----------
  const getTask = (id) => state.tasks.find((t) => t.id === id);

  function addTask(p) {
    const t = makeTask({ ...p, title: String(p.title || '').trim(), updatedAt: stamp() });
    state.tasks.unshift(t);
    commit();
    return t;
  }

  function updateTask(id, patch) {
    const t = getTask(id);
    if (!t) return;
    if (('due' in patch && patch.due !== t.due) || ('time' in patch && patch.time !== t.time)) patch.remindedAt = null;
    Object.assign(t, patch);
    touch(t);
    commit();
  }

  function stepDue(k, repeat) {
    switch (repeat) {
      case 'daily':
        return D.add(k, 1);
      case 'weekdays': {
        let n = D.add(k, 1);
        while (D.weekday(n) === 5 || D.weekday(n) === 6) n = D.add(n, 1);
        return n;
      }
      case 'weekly':
        return D.add(k, 7);
      case 'monthly':
        return D.addMonths(k, 1);
      default:
        return null;
    }
  }

  function nextDue(t) {
    const today = D.today();
    let n = stepDue(t.due || today, t.repeat);
    while (n && n <= today) n = stepDue(n, t.repeat);
    return n;
  }

  function toggleTask(id) {
    const t = getTask(id);
    if (!t) return null;
    if (!t.done) {
      t.done = true;
      t.doneAt = Date.now();
      if (t.repeat !== 'none') {
        const next = makeTask({
          title: t.title,
          notes: t.notes,
          priority: t.priority,
          categoryId: t.categoryId,
          repeat: t.repeat,
          time: t.time,
          due: nextDue(t),
          subtasks: t.subtasks.map((s) => ({ id: uid(), title: s.title, done: false })),
          updatedAt: stamp(),
        });
        state.tasks.splice(state.tasks.indexOf(t), 0, next);
        t.nextId = next.id;
      }
    } else {
      t.done = false;
      t.doneAt = null;
      if (t.nextId) {
        const n = getTask(t.nextId);
        if (n && !n.done) {
          state.tasks.splice(state.tasks.indexOf(n), 1);
          state.deleted[n.id] = stamp();
        }
        t.nextId = null;
      }
    }
    touch(t);
    commit();
    return t;
  }

  function deleteTask(id) {
    const index = state.tasks.findIndex((t) => t.id === id);
    if (index < 0) return null;
    const [task] = state.tasks.splice(index, 1);
    state.deleted[id] = stamp();
    commit();
    return { task, index };
  }

  function restoreTask({ task, index }) {
    delete state.deleted[task.id];
    state.tasks.splice(Math.min(index, state.tasks.length), 0, touch(task));
    commit();
  }

  function sortTasks(list, mode = 'smart') {
    const byCreated = (a, b) => b.createdAt - a.createdAt;
    const byPriority = (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    const byDue = (a, b) => {
      if (a.due === b.due) return (a.time || '99') < (b.time || '99') ? -1 : (a.time || '99') > (b.time || '99') ? 1 : 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due < b.due ? -1 : 1;
    };
    const cmp = {
      smart: (a, b) => byDue(a, b) || byPriority(a, b) || byCreated(a, b),
      priority: (a, b) => byPriority(a, b) || byDue(a, b) || byCreated(a, b),
      created: byCreated,
    }[mode];
    return [...list].sort(cmp || byCreated);
  }

  // ---------- التصنيفات ----------
  const getCategory = (id) => state.categories.find((c) => c.id === id);

  function addCategory(name, color) {
    const c = { id: uid(), name: String(name).trim(), color, updatedAt: stamp() };
    state.categories.push(c);
    commit();
    return c;
  }

  function updateCategory(id, patch) {
    const c = getCategory(id);
    if (!c) return;
    Object.assign(c, patch);
    touch(c);
    commit();
  }

  function deleteCategory(id) {
    state.categories = state.categories.filter((c) => c.id !== id);
    state.deleted[id] = stamp();
    state.tasks.forEach((t) => {
      if (t.categoryId !== id) return;
      t.categoryId = null;
      touch(t);
    });
    commit();
  }

  // ---------- العادات ----------
  const getHabit = (id) => state.habits.find((h) => h.id === id);

  function addHabit(p) {
    const h = makeHabit({ ...p, name: String(p.name || '').trim(), updatedAt: stamp() });
    state.habits.push(h);
    commit();
    return h;
  }

  function updateHabit(id, patch) {
    const h = getHabit(id);
    if (!h) return;
    Object.assign(h, patch);
    h.target = clamp(parseInt(h.target, 10) || 1, 1, 99);
    touch(h);
    commit();
  }

  function deleteHabit(id) {
    const index = state.habits.findIndex((h) => h.id === id);
    if (index < 0) return null;
    const [habit] = state.habits.splice(index, 1);
    state.deleted[id] = stamp();
    commit();
    return { habit, index };
  }

  function restoreHabit({ habit, index }) {
    delete state.deleted[habit.id];
    state.habits.splice(Math.min(index, state.habits.length), 0, touch(habit));
    commit();
  }

  const habitCount = (h, k) => h.log[k] || 0;
  const isScheduled = (h, k) => k >= h.startKey && h.days.includes(D.weekday(k));
  const isHabitDone = (h, k) => habitCount(h, k) >= h.target;

  function setHabitCount(id, k, count) {
    const h = getHabit(id);
    if (!h) return;
    count = clamp(count, 0, 99);
    if (count) h.log[k] = count;
    else delete h.log[k];
    h.logTs[k] = stamp(); // كل يوم له ختمه الخاص، فلا تضيع علامات يوم سُجّلت على جهاز آخر
    if (count && k < h.startKey) h.startKey = k;
    commit();
  }

  // نقرة: زيادة حتى الهدف ثم تصفير. نقرة يمين: إنقاص
  function bumpHabit(id, k, delta = 1) {
    const h = getHabit(id);
    if (!h) return;
    const c = habitCount(h, k);
    const next = delta > 0 ? (c >= h.target ? 0 : c + 1) : Math.max(0, c - 1);
    setHabitCount(id, k, next);
  }

  function habitStreak(h) {
    let k = D.today();
    if (!isHabitDone(h, k)) k = D.add(k, -1); // اليوم لم ينتهِ بعد فلا يكسر السلسلة
    let n = 0;
    for (let i = 0; i < 3660 && k >= h.startKey; i++, k = D.add(k, -1)) {
      if (!h.days.includes(D.weekday(k))) continue;
      if (isHabitDone(h, k)) n++;
      else break;
    }
    return n;
  }

  function habitBest(h) {
    const today = D.today();
    let best = 0;
    let cur = 0;
    for (let k = h.startKey, i = 0; k <= today && i < 3660; k = D.add(k, 1), i++) {
      if (!h.days.includes(D.weekday(k))) continue;
      if (isHabitDone(h, k)) best = Math.max(best, ++cur);
      else if (k !== today) cur = 0;
    }
    return best;
  }

  // نسبة الالتزام خلال آخر n يوماً (اليوم يُحسب فقط إن أُنجز)
  function habitRate(h, n = 30) {
    const today = D.today();
    let total = 0;
    let done = 0;
    for (const k of D.range(today, n)) {
      if (!isScheduled(h, k)) continue;
      const ok = isHabitDone(h, k);
      if (k === today && !ok) continue;
      total++;
      if (ok) done++;
    }
    return { done, total, rate: total ? done / total : 0 };
  }

  const activeHabits = () => state.habits.filter((h) => !h.archived);

  function habitsOn(k) {
    const list = activeHabits().filter((h) => isScheduled(h, k));
    return { list, total: list.length, done: list.filter((h) => isHabitDone(h, k)).length };
  }

  // ---------- جلسات التركيز ----------
  function addSession(s) {
    const session = { id: uid(), taskId: null, ...s, minutes: Math.round(s.minutes), updatedAt: stamp() };
    if (session.minutes < 1) return null;
    state.sessions.push(session);
    commit();
    return session;
  }

  function deleteSession(id) {
    state.sessions = state.sessions.filter((s) => s.id !== id);
    state.deleted[id] = stamp();
    commit();
  }

  const sessionsOn = (k) => state.sessions.filter((s) => D.key(new Date(s.start)) === k).sort((a, b) => a.start - b.start);
  const taskFocusMinutes = (id) => state.sessions.reduce((sum, s) => sum + (s.taskId === id ? s.minutes : 0), 0);

  // ---------- مؤشرات الأيام ----------
  function index() {
    if (cache) return cache;
    const done = {};
    const focus = {};
    const doneByCat = {};
    for (const t of state.tasks) {
      if (!t.done || !t.doneAt) continue;
      const k = D.key(new Date(t.doneAt));
      done[k] = (done[k] || 0) + 1;
      (doneByCat[k] = doneByCat[k] || []).push(t.categoryId);
    }
    for (const s of state.sessions) {
      const k = D.key(new Date(s.start));
      focus[k] = (focus[k] || 0) + s.minutes;
    }
    cache = { done, focus, doneByCat };
    return cache;
  }

  const doneOn = (k) => index().done[k] || 0;
  const focusOn = (k) => index().focus[k] || 0;
  const doneCategoriesOn = (k) => index().doneByCat[k] || [];

  // نقاط اليوم: متوسط نسب تحقيق الأهداف (المهام، التركيز، العادات)
  function dayScore(k) {
    const s = state.settings;
    const parts = [];
    if (s.goalTasks > 0) parts.push(Math.min(1, doneOn(k) / s.goalTasks));
    if (s.goalFocus > 0) parts.push(Math.min(1, focusOn(k) / s.goalFocus));
    const hb = habitsOn(k);
    if (hb.total) parts.push(hb.done / hb.total);
    return parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) : 0;
  }

  // عدد الأيام المتتالية التي حققت فيها 50% أو أكثر من أهدافك
  function productiveStreak() {
    let k = D.today();
    if (dayScore(k) < 50) k = D.add(k, -1);
    let n = 0;
    for (let i = 0; i < 1000 && dayScore(k) >= 50; i++, k = D.add(k, -1)) n++;
    return n;
  }

  // ---------- الإعدادات والبيانات ----------
  function setSettings(patch) {
    Object.assign(state.settings, patch);
    if (Object.keys(patch).some((k) => SYNCED_SETTINGS.includes(k))) state.settingsAt = stamp();
    commit();
  }

  function setMeta(patch) {
    Object.assign(state.meta, patch);
    dirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, 400);
  }

  // استبدال كل البيانات (استيراد أو مسح): ما لم يعد موجوداً يُعلَّم محذوفاً ليُحذف من الأجهزة المرتبطة أيضاً
  function replaceAll(data) {
    const next = migrate(data);
    const keep = new Set([...next.tasks, ...next.habits, ...next.categories, ...next.sessions].map((x) => x.id));
    const now = stamp();
    for (const x of [...state.tasks, ...state.habits, ...state.categories, ...state.sessions]) {
      if (!keep.has(x.id)) next.deleted[x.id] = now;
    }
    next.settingsAt = stamp();
    state = next;
    commit();
  }

  // ---------- المزامنة: دمج بيانات جهاز آخر ----------
  const syncedView = (s) => JSON.stringify([s.categories, s.tasks, s.habits, s.sessions, s.deleted, s.settingsAt, SYNCED_SETTINGS.map((k) => s.settings[k])]);

  function mergeHabit(x, y) {
    const newer = (y.updatedAt || 0) > (x.updatedAt || 0) ? y : x;
    const h = { ...newer, log: {}, logTs: {} };
    const keys = new Set([...Object.keys(x.log), ...Object.keys(y.log), ...Object.keys(x.logTs), ...Object.keys(y.logTs)]);
    for (const k of keys) {
      const tx = x.logTs[k] || 0;
      const ty = y.logTs[k] || 0;
      const src = ty > tx ? y : tx > ty ? x : (y.log[k] || 0) > (x.log[k] || 0) ? y : x;
      if (src.log[k]) h.log[k] = src.log[k];
      if (tx || ty) h.logTs[k] = Math.max(tx, ty);
    }
    h.startKey = x.startKey < y.startKey ? x.startKey : y.startKey;
    return h;
  }

  // دمج دون فقدان: لكل عنصر تُعتمد النسخة الأحدث، والحذف يغلب التعديلات الأقدم منه
  function mergeState(local, remote) {
    const deleted = { ...local.deleted };
    for (const [id, ts] of Object.entries(remote.deleted || {})) deleted[id] = Math.max(deleted[id] || 0, ts);
    const cutoff = Date.now() - 400 * 86400000;
    for (const id of Object.keys(deleted)) if (deleted[id] < cutoff) delete deleted[id];
    const merge = (a, b, combine) => {
      const map = new Map(a.map((x) => [x.id, x]));
      for (const y of b) {
        const x = map.get(y.id);
        map.set(y.id, !x ? y : combine ? combine(x, y) : (y.updatedAt || 0) > (x.updatedAt || 0) ? y : x);
      }
      return [...map.values()].filter((x) => !(deleted[x.id] >= (x.updatedAt || 0)));
    };
    const remoteNewer = (remote.settingsAt || 0) > (local.settingsAt || 0);
    const settings = { ...local.settings };
    if (remoteNewer) SYNCED_SETTINGS.forEach((k) => (settings[k] = remote.settings[k]));
    return {
      ...local,
      categories: merge(local.categories, remote.categories),
      tasks: merge(local.tasks, remote.tasks).sort((a, b) => b.createdAt - a.createdAt),
      habits: merge(local.habits, remote.habits, mergeHabit).sort((a, b) => a.createdAt - b.createdAt),
      sessions: merge(local.sessions, remote.sessions).sort((a, b) => a.start - b.start),
      deleted,
      settings,
      settingsAt: Math.max(local.settingsAt || 0, remote.settingsAt || 0),
    };
  }

  // عند أول ربط بجهاز آخر: نحذف مهام الترحيب التي لم تُعدَّل، ونوحّد التصنيفات الافتراضية
  // مع تصنيفات الجهاز الآخر بالاسم، حتى لا تتكرر على الجهازين
  function adoptRemoteDefaults(remoteData) {
    const remote = migrate(typeof remoteData === 'string' ? JSON.parse(remoteData) : remoteData);
    const byName = new Map(remote.categories.map((c) => [String(c.name).trim(), c.id]));
    const remap = {};
    state.categories = state.categories.filter((c) => {
      const target = c.seed && byName.get(String(c.name).trim());
      if (target && target !== c.id) remap[c.id] = target;
      return !(target && target !== c.id);
    });
    state.tasks = state.tasks.filter((t) => !(t.seed && !t.done && t.updatedAt === t.createdAt));
    state.tasks.forEach((t) => {
      if (!remap[t.categoryId]) return;
      t.categoryId = remap[t.categoryId];
      touch(t);
    });
    commit();
  }

  // يدمج بيانات جهاز آخر في البيانات المحلية، ويعيد النتيجة لإرسالها إليه
  function mergeRemote(remoteData) {
    const remote = migrate(typeof remoteData === 'string' ? JSON.parse(remoteData) : remoteData);
    // نتقدّم بساعتنا المنطقية بعد أحدث ختم رأيناه، حتى لو كانت ساعة الجهاز الآخر متقدمة
    const seen = [remote.settingsAt, ...Object.values(remote.deleted)];
    for (const x of [...remote.tasks, ...remote.categories, ...remote.sessions, ...remote.habits]) seen.push(x.updatedAt || 0);
    for (const h of remote.habits) seen.push(...Object.values(h.logTs));
    for (const v of seen) if (Number.isFinite(v) && v > lastStamp) lastStamp = v;
    const merged = mergeState(state, remote);
    const changed = syncedView(merged) !== syncedView(state);
    if (changed) {
      state = merged;
      commit(true);
    }
    return { changed, json: JSON.stringify(state) };
  }

  const looksLikeBackup = (d) => d && typeof d === 'object' && Array.isArray(d.tasks) && Array.isArray(d.habits);

  return {
    api,
    get state() {
      return state;
    },
    init,
    flush,
    flushSync,
    subscribe,
    defaults,
    getTask,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    restoreTask,
    sortTasks,
    getCategory,
    addCategory,
    updateCategory,
    deleteCategory,
    getHabit,
    addHabit,
    updateHabit,
    deleteHabit,
    restoreHabit,
    habitCount,
    isScheduled,
    isHabitDone,
    setHabitCount,
    bumpHabit,
    habitStreak,
    habitBest,
    habitRate,
    activeHabits,
    habitsOn,
    addSession,
    deleteSession,
    sessionsOn,
    taskFocusMinutes,
    doneOn,
    focusOn,
    doneCategoriesOn,
    dayScore,
    productiveStreak,
    setSettings,
    setMeta,
    replaceAll,
    looksLikeBackup,
    mergeRemote,
    adoptRemoteDefaults,
    get localVersion() {
      return localVersion;
    },
  };
})();
