'use strict';
// ربط خاص بأندرويد: جدولة الإشعارات، زر الرجوع، والحفظ عند الخروج للخلفية. يُحمَّل بعد app.js.
(() => {
  const N = window.Native;
  if (!N || !N.isNative) return;

  const LN = N.LocalNotifications;
  const CHANNEL = 'injaz';
  const TIMER_ID = 1;
  const HABIT_IDS = [2, 3];
  const TASK_BASE = 1000; // معرّفات إشعارات المهام تبدأ من هنا (500-999 للإشعارات الفورية)
  let exactAllowed = false;
  let scheduledTimerAt = -1;

  // رقم ثابت لكل مهمة (معرّفات الإشعارات أعداد صحيحة)
  function taskNotifId(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return TASK_BASE + (Math.abs(h) % 2000000000);
  }

  const when = (ms) => ({ at: new Date(ms), allowWhileIdle: true });
  const note = (id, title, body, at) => ({ id, title, body, channelId: CHANNEL, schedule: when(at), isExactNotification: exactAllowed });

  async function setup() {
    await LN.createChannel({ id: CHANNEL, name: 'تذكيرات إنجاز', description: 'تذكير المهام والعادات وانتهاء المؤقت', importance: 5, vibration: true }).catch(() => {});
    await LN.requestPermissions().catch(() => {});
    const exact = await LN.checkExactNotificationSetting().catch(() => null);
    exactAllowed = !!exact && exact.exact_alarm === 'granted';
  }

  // يعيد جدولة تذكيرات المهام والعادات القادمة بعد كل تغيير
  const rescheduleReminders = debounce(async () => {
    const s = Store.state.settings;
    const pending = await LN.getPending().catch(() => ({ notifications: [] }));
    const ours = pending.notifications.filter((n) => n.id !== TIMER_ID && (HABIT_IDS.includes(n.id) || n.id >= TASK_BASE));
    if (ours.length) await LN.cancel({ notifications: ours.map((n) => ({ id: n.id })) }).catch(() => {});
    if (!s.notifications) return;

    const now = Date.now();
    const list = [];
    for (const t of Store.state.tasks) {
      if (t.done || !t.due || !t.time) continue;
      const at = new Date(`${t.due}T${t.time}:00`).getTime();
      if (at > now) list.push(note(taskNotifId(t.id), '⏰ تذكير بمهمة', t.title, at));
    }
    list.sort((a, b) => a.schedule.at - b.schedule.at).splice(60);

    if (s.habitReminder && s.habitReminderTime) {
      const [hh, mm] = s.habitReminderTime.split(':').map(Number);
      [0, 1].forEach((offset) => {
        const k = D.add(D.today(), offset);
        const hb = Store.habitsOn(k);
        const left = offset === 0 ? hb.total - hb.done : hb.total;
        const at = D.parse(k);
        at.setHours(hh, mm, 0, 0);
        if (!left || at.getTime() <= now) return;
        const body = offset === 0 ? `بقي لديك ${pHabits(left)} لهذا اليوم. لا تكسر السلسلة!` : 'لا تنسَ عاداتك اليوم، خطوة صغيرة كل يوم 🌱';
        list.push(note(HABIT_IDS[offset], '🌱 عاداتك اليوم', body, at.getTime()));
      });
    }
    if (list.length) await LN.schedule({ notifications: list }).catch((err) => console.error(err));
  }, 1200);

  // إشعار نهاية المؤقت يُجدول مسبقاً، فيصل حتى لو كان التطبيق في الخلفية
  async function rescheduleTimer() {
    const s = Focus.snapshot();
    const at = s.status === 'running' && Store.state.settings.notifications ? s.endAt : 0;
    if (at === scheduledTimerAt) return;
    scheduledTimerAt = at;
    await LN.cancel({ notifications: [{ id: TIMER_ID }] }).catch(() => {});
    if (!at) return;
    const focus = s.mode === 'focus';
    await LN.schedule({
      notifications: [note(TIMER_ID, focus ? 'أحسنت! انتهت جلسة التركيز 🎉' : 'انتهت الاستراحة ☕', focus ? 'خذ استراحة قصيرة الآن.' : 'هل أنت جاهز لجلسة تركيز جديدة؟', at)],
    }).catch((err) => console.error(err));
  }

  setup().then(() => {
    rescheduleReminders();
    rescheduleTimer();
  });
  Store.subscribe(rescheduleReminders);
  Focus.subscribe((full) => full && rescheduleTimer());

  // زر الرجوع: يغلق النافذة المفتوحة، ثم يعود للرئيسية، ثم يصغّر التطبيق
  N.App.addListener('backButton', () => {
    if (UI.closeMenu() || UI.closeTop()) return;
    if (App.route() !== 'dashboard') App.go('dashboard');
    else N.App.minimizeApp();
  });

  N.App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) {
      Store.flush();
      return;
    }
    App.render(); // قد يكون اليوم تغيّر أو انتهى المؤقت
    rescheduleReminders();
    if (window.Sync && Sync.paired()) Sync.syncNow();
  });
})();
