'use strict';
// أدوات مشتركة: تواريخ، تنسيق، أيقونات، DOM

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC_MAP[c]);

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// ---------- التواريخ (مفاتيح محلية YYYY-MM-DD) ----------
const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAY_LETTERS = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const D = {
  pad: (n) => String(n).padStart(2, '0'),
  key(d = new Date()) {
    return `${d.getFullYear()}-${D.pad(d.getMonth() + 1)}-${D.pad(d.getDate())}`;
  },
  today: () => D.key(),
  parse(k) {
    const [y, m, d] = k.split('-').map(Number);
    return new Date(y, m - 1, d);
  },
  add(k, n) {
    const d = D.parse(k);
    d.setDate(d.getDate() + n);
    return D.key(d);
  },
  addMonths(k, n) {
    const d = D.parse(k);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return D.key(d);
  },
  diff(a, b) {
    return Math.round((D.parse(a) - D.parse(b)) / 86400000);
  },
  weekday: (k) => D.parse(k).getDay(),
  // آخر n يوماً تنتهي بـ end (من الأقدم إلى الأحدث)
  range(end, n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) out.push(D.add(end, -i));
    return out;
  },
  time(ts) {
    const d = new Date(ts);
    return `${D.pad(d.getHours())}:${D.pad(d.getMinutes())}`;
  },
  short(k) {
    const d = D.parse(k);
    return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  },
  long(k) {
    const d = D.parse(k);
    return `${DAY_NAMES[d.getDay()]}، ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  },
  relative(k) {
    const n = D.diff(k, D.today());
    if (n === 0) return 'اليوم';
    if (n === 1) return 'غداً';
    if (n === -1) return 'أمس';
    if (n === 2) return 'بعد غد';
    if (n > 2 && n < 7) return DAY_NAMES[D.weekday(k)];
    const d = D.parse(k);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return sameYear ? D.short(k) : `${D.short(k)} ${d.getFullYear()}`;
  },
};

// صيغ الجمع العربية: [مفرد، مثنى، جمع (3-10)، تمييز (11+)]
function plural(n, [one, two, few, many]) {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}
const pDays = (n) => plural(n, ['يوم', 'يومان', 'أيام', 'يوماً']);
const pTasks = (n) => plural(n, ['مهمة واحدة', 'مهمتان', 'مهام', 'مهمة']);
const pTimes = (n) => plural(n, ['مرة', 'مرتان', 'مرات', 'مرة']);
const pHabits = (n) => plural(n, ['عادة واحدة', 'عادتان', 'عادات', 'عادة']);
const pSessions = (n) => plural(n, ['جلسة واحدة', 'جلستان', 'جلسات', 'جلسة']);

function fmtMinutes(min) {
  min = Math.round(min || 0);
  if (min < 60) return `${min} د`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} س ${m} د` : `${h} س`;
}

function fmtClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${D.pad(Math.floor(total / 60))}:${D.pad(total % 60)}`;
}

// منذ متى: «الآن»، «قبل 5 د»، «قبل 3 س»، أو التاريخ
function fmtAgo(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `قبل ${m} د`;
  const h = Math.round(m / 60);
  if (h < 24) return `قبل ${h} س`;
  return D.short(D.key(new Date(ts)));
}

const fmtNum = (n) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(n);

// ---------- الأيقونات ----------
const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  tasks: '<path d="M11 6h10M11 12h10M11 18h10"/><path d="M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
  habits: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M9 15l2 2 4-4"/>',
  focus: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  stats: '<path d="M3 21h18"/><path d="M6 17v-6M12 17V6M18 17v-4"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  skip: '<path d="M5 5l10 7-10 7z" fill="currentColor"/><path d="M19 5v14"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  repeat: '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  notes: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  subtasks: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  more: '<circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/>',
  archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
  folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
  chart: '<path d="M3 21h18"/><path d="M6 17v-6M12 17V6M18 17v-4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  coffee: '<path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17M7 2v3M11 2v3"/>',
  chevron: '<path d="M6 9l6 6 6-6"/>',
  restore: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 8v4l3 2"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
};

function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

// ---------- الألوان (لوحة الفئات المعتمدة بالترتيب الثابت) ----------
const PALETTE = [
  { id: 'blue', name: 'أزرق', light: '#2a78d6', dark: '#3987e5' },
  { id: 'orange', name: 'برتقالي', light: '#eb6834', dark: '#d95926' },
  { id: 'aqua', name: 'فيروزي', light: '#1baf7a', dark: '#199e70' },
  { id: 'yellow', name: 'أصفر', light: '#eda100', dark: '#c98500' },
  { id: 'magenta', name: 'وردي', light: '#e87ba4', dark: '#d55181' },
  { id: 'green', name: 'أخضر', light: '#008300', dark: '#008300' },
  { id: 'violet', name: 'بنفسجي', light: '#6250d6', dark: '#9085e9' },
  { id: 'red', name: 'أحمر', light: '#e34948', dark: '#e66767' },
];
const isDark = () => document.documentElement.dataset.theme === 'dark';
function colorHex(id) {
  const c = PALETTE.find((p) => p.id === id) || PALETTE[0];
  return isDark() ? c.dark : c.light;
}

const PRIORITIES = {
  high: { label: 'عالية', cls: 'p-high' },
  medium: { label: 'متوسطة', cls: 'p-medium' },
  low: { label: 'منخفضة', cls: 'p-low' },
  none: { label: 'بدون', cls: 'p-none' },
};
const PRIORITY_RANK = { high: 0, medium: 1, low: 2, none: 3 };

const REPEATS = {
  none: 'لا يتكرر',
  daily: 'يومياً',
  weekdays: 'أيام العمل (الأحد–الخميس)',
  weekly: 'أسبوعياً',
  monthly: 'شهرياً',
};
const REPEAT_SHORT = { daily: 'يومياً', weekdays: 'أيام العمل', weekly: 'أسبوعياً', monthly: 'شهرياً' };

// سجل الشاشات (تملؤه ملفات views)
const Views = {};
