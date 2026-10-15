'use strict';
// شاشة المهام + مكوّن صف المهمة ومحرّر التفاصيل (مشتركة مع الرئيسية)

const Tasks = (() => {
  const view = { filter: 'today', category: null, search: '', sort: 'smart' };

  const FILTERS = [
    { id: 'today', label: 'اليوم' },
    { id: 'upcoming', label: 'القادمة' },
    { id: 'all', label: 'كل المهام' },
    { id: 'done', label: 'المنجزة' },
  ];

  // ---------- صف المهمة ----------
  function row(t) {
    const today = D.today();
    const overdue = !t.done && t.due && t.due < today;
    const cat = t.categoryId && Store.getCategory(t.categoryId);
    const subDone = t.subtasks.filter((s) => s.done).length;
    const focusMin = Store.taskFocusMinutes(t.id);
    const p = PRIORITIES[t.priority];
    const chips = [];
    if (t.due) {
      const cls = overdue ? 'danger' : t.due === today ? 'accent' : '';
      chips.push(`<span class="chip ${cls}">${icon('calendar')}${esc(D.relative(t.due))}${t.time ? ` · ${esc(t.time)}` : ''}</span>`);
    } else if (t.time) {
      chips.push(`<span class="chip">${icon('bell')}${esc(t.time)}</span>`);
    }
    if (t.priority !== 'none') chips.push(`<span class="chip prio ${p.cls}">${icon('flag')}${p.label}</span>`);
    if (cat) chips.push(`<span class="chip"><i class="key" style="background:${colorHex(cat.color)}"></i>${esc(cat.name)}</span>`);
    if (t.repeat !== 'none') chips.push(`<span class="chip" title="${esc(REPEATS[t.repeat])}">${icon('repeat')}${REPEAT_SHORT[t.repeat]}</span>`);
    if (t.subtasks.length) chips.push(`<span class="chip">${icon('subtasks')}${subDone}/${t.subtasks.length}</span>`);
    if (focusMin) chips.push(`<span class="chip">${icon('clock')}${fmtMinutes(focusMin)}</span>`);
    if (t.notes) chips.push(`<span class="chip" title="فيها ملاحظات">${icon('notes')}</span>`);

    return `<div class="task ${t.done ? 'done' : ''} ${p.cls}" data-id="${t.id}">
      <button class="check" data-act="toggle" role="checkbox" aria-checked="${t.done}" aria-label="${t.done ? 'إلغاء الإنجاز' : 'إنجاز المهمة'}">${icon('check')}</button>
      <button class="task-main" data-act="open">
        <span class="task-title">${esc(t.title)}</span>
        ${chips.length ? `<span class="task-meta">${chips.join('')}</span>` : ''}
      </button>
      <div class="task-actions">
        ${t.done ? '' : `<button class="icon-btn" data-act="focus" title="ابدأ جلسة تركيز لهذه المهمة">${icon('play')}</button>`}
        <button class="icon-btn" data-act="delete" title="حذف">${icon('trash')}</button>
      </div>
    </div>`;
  }

  // معالج موحّد لأزرار صفوف المهام
  function handle(e) {
    const btn = e.target.closest('[data-act]');
    const rowEl = btn && btn.closest('.task[data-id]');
    if (!rowEl) return false;
    const id = rowEl.dataset.id;
    switch (btn.dataset.act) {
      case 'toggle':
        complete(id, rowEl);
        return true;
      case 'open':
        openEditor(id);
        return true;
      case 'focus':
        Focus.startForTask(id);
        App.go('focus');
        return true;
      case 'delete':
        remove(id);
        return true;
      default:
        return false;
    }
  }

  function complete(id, rowEl) {
    const t = Store.getTask(id);
    if (!t) return;
    const finishing = !t.done;
    const apply = () => {
      Store.toggleTask(id);
      if (!finishing) return;
      const today = D.today();
      const left = Store.state.tasks.filter((x) => !x.done && x.due && x.due <= today).length;
      if (left === 0 && t.due && t.due <= today) {
        UI.toast('أنجزت كل مهام اليوم! 🎉 أحسنت', { type: 'success' });
      } else {
        UI.toast('تم إنجاز المهمة ✓', { action: { label: 'تراجع', fn: () => Store.toggleTask(id) } });
      }
    };
    if (finishing && rowEl) {
      rowEl.classList.add('completing');
      setTimeout(apply, 280);
    } else apply();
  }

  function remove(id) {
    const rec = Store.deleteTask(id);
    if (rec) UI.toast('حُذفت المهمة', { action: { label: 'تراجع', fn: () => Store.restoreTask(rec) } });
  }

  // ---------- محرّر المهمة ----------
  function openEditor(id, preset = {}) {
    const existing = id && Store.getTask(id);
    const draft = existing
      ? JSON.parse(JSON.stringify(existing))
      : { title: '', notes: '', due: null, time: null, priority: 'none', categoryId: null, repeat: 'none', subtasks: [], ...preset };
    const original = JSON.stringify(draft);
    const focusMin = existing ? Store.taskFocusMinutes(existing.id) : 0;
    let deleted = false;

    const body = `
      <div class="form">
        <input class="title-input" name="title" value="${esc(draft.title)}" placeholder="ماذا تريد أن تنجز؟" autocomplete="off" autofocus>
        <textarea name="notes" rows="3" placeholder="ملاحظات أو تفاصيل…">${esc(draft.notes)}</textarea>
        <div class="form-grid">
          <label class="field"><span>${icon('calendar')}الموعد</span><input type="date" name="due" value="${draft.due || ''}"></label>
          <label class="field"><span>${icon('bell')}وقت التذكير</span><input type="time" name="time" value="${draft.time || ''}"></label>
          <label class="field"><span>${icon('flag')}الأولوية</span><select name="priority">${UI.priorityOptions(draft.priority)}</select></label>
          <label class="field"><span>${icon('tag')}التصنيف</span><select name="categoryId">${UI.categoryOptions(draft.categoryId)}</select></label>
          <label class="field span-2"><span>${icon('repeat')}التكرار</span><select name="repeat">${Object.entries(REPEATS)
            .map(([k, v]) => `<option value="${k}" ${k === draft.repeat ? 'selected' : ''}>${v}</option>`)
            .join('')}</select></label>
        </div>
        <div class="subtasks">
          <h4>${icon('subtasks')}المهام الفرعية <span class="muted" data-sub-count></span></h4>
          <ul class="sub-list" data-sub-list></ul>
          <input class="sub-add" data-sub-add placeholder="أضف مهمة فرعية ثم اضغط Enter" autocomplete="off">
        </div>
        ${existing ? `<p class="muted small">أُضيفت ${esc(D.short(D.key(new Date(existing.createdAt))))}${focusMin ? ` · وقت التركيز: ${fmtMinutes(focusMin)}` : ''}${existing.done && existing.doneAt ? ` · أُنجزت ${esc(D.short(D.key(new Date(existing.doneAt))))}` : ''}</p>` : ''}
        <p class="muted small" data-time-hint hidden>💡 حدّد موعداً حتى يعمل التذكير في الوقت المحدد.</p>
      </div>`;
    const footer = `
      ${existing ? `<button class="btn ghost danger-text" data-del>${icon('trash')}حذف</button>` : ''}
      <span class="spacer"></span>
      ${existing && !existing.done ? `<button class="btn ghost" data-focus>${icon('play')}ابدأ التركيز</button>` : ''}
      <button class="btn primary" data-close>${existing ? 'تم' : 'إضافة المهمة'}</button>`;

    UI.modal({
      title: existing ? 'تفاصيل المهمة' : 'مهمة جديدة',
      body,
      footer,
      size: 'md',
      onMount(box, close) {
        const subList = $('[data-sub-list]', box);
        const timeHint = $('[data-time-hint]', box);
        const renderSubs = () => {
          subList.innerHTML = draft.subtasks
            .map(
              (s, i) => `<li class="sub ${s.done ? 'done' : ''}" data-i="${i}">
                <input type="checkbox" ${s.done ? 'checked' : ''} aria-label="إنجاز">
                <input class="sub-title" value="${esc(s.title)}" aria-label="عنوان المهمة الفرعية">
                <button class="icon-btn sm" data-sub-del title="حذف">${icon('x')}</button></li>`
            )
            .join('');
          const done = draft.subtasks.filter((s) => s.done).length;
          $('[data-sub-count]', box).textContent = draft.subtasks.length ? `${done}/${draft.subtasks.length}` : '';
        };
        renderSubs();
        const syncHint = () => {
          timeHint.hidden = !(draft.time && !draft.due);
        };
        syncHint();

        box.addEventListener('input', (e) => {
          const el = e.target;
          if (el.name === 'title' || el.name === 'notes') draft[el.name] = el.value;
          if (el.classList.contains('sub-title')) draft.subtasks[el.closest('.sub').dataset.i].title = el.value;
        });
        box.addEventListener('change', (e) => {
          const el = e.target;
          if (['due', 'time', 'categoryId'].includes(el.name)) draft[el.name] = el.value || null;
          if (el.name === 'priority' || el.name === 'repeat') draft[el.name] = el.value;
          if (el.type === 'checkbox' && el.closest('.sub')) {
            draft.subtasks[el.closest('.sub').dataset.i].done = el.checked;
            renderSubs();
          }
          syncHint();
        });
        box.addEventListener('click', (e) => {
          if (e.target.closest('[data-sub-del]')) {
            draft.subtasks.splice(e.target.closest('.sub').dataset.i, 1);
            renderSubs();
          } else if (e.target.closest('[data-del]')) {
            deleted = true;
            close();
            remove(existing.id);
          } else if (e.target.closest('[data-focus]')) {
            close();
            Focus.startForTask(existing.id);
            App.go('focus');
          }
        });
        const addInput = $('[data-sub-add]', box);
        addInput.addEventListener('keydown', (e) => {
          if (e.key !== 'Enter' || !addInput.value.trim()) return;
          e.preventDefault();
          draft.subtasks.push({ id: uid(), title: addInput.value.trim(), done: false });
          addInput.value = '';
          renderSubs();
        });
        $('.title-input', box).addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            close();
          }
        });
      },
      onClose() {
        if (deleted) return;
        draft.title = draft.title.trim();
        draft.subtasks = draft.subtasks.filter((s) => s.title.trim());
        if (!existing) {
          if (draft.title) Store.addTask(draft);
          return;
        }
        if (!draft.title) draft.title = existing.title;
        if (JSON.stringify(draft) === original) return;
        const { title, notes, due, time, priority, categoryId, repeat, subtasks } = draft;
        Store.updateTask(existing.id, { title, notes, due, time, priority, categoryId, repeat, subtasks });
      },
    });
  }

  // ---------- الإضافة السريعة ----------
  function quickAdd({ id, due = '', category = null, compact = false }) {
    return `<form class="quick-add" data-quick-add autocomplete="off">
      <span class="qa-icon">${icon('plus')}</span>
      <input id="${id}" name="title" placeholder="أضف مهمة جديدة واضغط Enter…" aria-label="عنوان المهمة الجديدة">
      ${compact ? `<input type="hidden" name="due" value="${due}">` : `
      <input type="date" name="due" value="${due}" title="الموعد" aria-label="الموعد">
      <select name="priority" title="الأولوية" aria-label="الأولوية">${UI.priorityOptions('none')}</select>
      <select name="categoryId" title="التصنيف" aria-label="التصنيف">${UI.categoryOptions(category)}</select>`}
      <button class="btn primary sm" type="submit">إضافة</button>
    </form>`;
  }

  function bindQuickAdd(root) {
    root.addEventListener('submit', (e) => {
      const form = e.target.closest('[data-quick-add]');
      if (!form) return;
      e.preventDefault();
      const f = new FormData(form);
      const title = String(f.get('title') || '').trim();
      if (!title) return;
      form.querySelector('[name=title]').value = ''; // يُفرَّغ قبل إعادة الرسم التي تحفظ قيمة الحقل النشط
      Store.addTask({
        title,
        due: f.get('due') || null,
        priority: f.get('priority') || 'none',
        categoryId: f.get('categoryId') || null,
      });
    });
  }

  // ---------- القوائم والتجميع ----------
  function groupsFor(list) {
    const today = D.today();
    const tomorrow = D.add(today, 1);
    const week = D.add(today, 7);
    const s = (arr) => Store.sortTasks(arr, view.sort);

    if (view.search) {
      return [
        { title: 'نتائج البحث', items: s(list.filter((t) => !t.done)) },
        { title: 'منجزة', items: list.filter((t) => t.done).sort((a, b) => b.doneAt - a.doneAt) },
      ];
    }
    switch (view.filter) {
      case 'today': {
        const open = list.filter((t) => !t.done && t.due && t.due <= today);
        const doneToday = list.filter((t) => t.done && t.doneAt && D.key(new Date(t.doneAt)) === today);
        return [
          { title: 'متأخرة', tone: 'danger', items: s(open.filter((t) => t.due < today)) },
          { title: 'اليوم', items: s(open.filter((t) => t.due === today)) },
          { title: 'أُنجزت اليوم', items: doneToday.sort((a, b) => b.doneAt - a.doneAt) },
        ];
      }
      case 'upcoming': {
        const byDay = {};
        list.filter((t) => !t.done && t.due && t.due > today).forEach((t) => (byDay[t.due] = byDay[t.due] || []).push(t));
        return Object.keys(byDay)
          .sort()
          .map((k) => ({ title: `${D.relative(k)}`, hint: D.long(k), items: s(byDay[k]) }));
      }
      case 'all': {
        const open = list.filter((t) => !t.done);
        return [
          { title: 'متأخرة', tone: 'danger', items: s(open.filter((t) => t.due && t.due < today)) },
          { title: 'اليوم', items: s(open.filter((t) => t.due === today)) },
          { title: 'غداً', items: s(open.filter((t) => t.due === tomorrow)) },
          { title: 'هذا الأسبوع', items: s(open.filter((t) => t.due > tomorrow && t.due <= week)) },
          { title: 'لاحقاً', items: s(open.filter((t) => t.due > week)) },
          { title: 'بدون موعد', items: s(open.filter((t) => !t.due)) },
        ];
      }
      case 'done': {
        const byDay = {};
        list
          .filter((t) => t.done)
          .sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0))
          .slice(0, 300)
          .forEach((t) => {
            const k = t.doneAt ? D.key(new Date(t.doneAt)) : 'غير معروف';
            (byDay[k] = byDay[k] || []).push(t);
          });
        return Object.keys(byDay).map((k) => ({ title: k.includes('-') ? D.relative(k) : k, hint: k.includes('-') ? D.long(k) : '', items: byDay[k] }));
      }
      default:
        return [];
    }
  }

  function counts() {
    const today = D.today();
    const base = Store.state.tasks.filter((t) => !view.category || t.categoryId === view.category);
    return {
      today: base.filter((t) => !t.done && t.due && t.due <= today).length,
      upcoming: base.filter((t) => !t.done && t.due && t.due > today).length,
      all: base.filter((t) => !t.done).length,
      done: base.filter((t) => t.done).length,
    };
  }

  function emptyFor() {
    if (view.search) return UI.empty('🔍', 'لا نتائج', 'جرّب كلمة بحث أخرى.');
    return {
      today: UI.empty('🌤️', 'لا مهام لليوم', 'يومك صافٍ! أضف مهمة جديدة أو استمتع بوقتك.'),
      upcoming: UI.empty('📅', 'لا مهام قادمة', 'المهام ذات المواعيد المستقبلية ستظهر هنا.'),
      all: UI.empty('✨', 'قائمتك فارغة', 'ابدأ بإضافة أول مهمة من الشريط أعلاه.'),
      done: UI.empty('🏁', 'لم تُنجز مهام بعد', 'كل مهمة تنجزها ستظهر هنا.'),
    }[view.filter];
  }

  function renderList(container) {
    const q = view.search.trim().toLowerCase();
    let list = Store.state.tasks.filter((t) => !view.category || t.categoryId === view.category);
    if (q) list = list.filter((t) => t.title.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q) || t.subtasks.some((s) => s.title.toLowerCase().includes(q)));
    const groups = groupsFor(list).filter((g) => g.items.length);
    container.innerHTML = groups.length
      ? groups
          .map(
            (g) => `<section class="task-group">
              <h3 class="group-title ${g.tone || ''}">${esc(g.title)} <span class="count">${g.items.length}</span>${g.hint ? `<span class="hint">${esc(g.hint)}</span>` : ''}</h3>
              <div class="task-list">${g.items.map(row).join('')}</div>
            </section>`
          )
          .join('')
      : emptyFor();
  }

  // ---------- الشاشة ----------
  function render(root, params = {}) {
    if (params.category !== undefined) view.category = params.category;
    if (params.filter) view.filter = params.filter;
    const c = counts();
    const cat = view.category && Store.getCategory(view.category);
    if (view.category && !cat) view.category = null;

    const page = document.createElement('div');
    page.className = 'page';
    page.innerHTML = `
      <header class="page-head">
        <div>
          <h1>${cat ? `<i class="key lg" style="background:${colorHex(cat.color)}"></i>${esc(cat.name)}` : 'المهام'}</h1>
          <p class="sub">${c.all ? `لديك ${pTasks(c.all)} غير منجزة${c.today ? `، منها ${c.today} لليوم` : ''}` : 'لا مهام مفتوحة — عمل رائع!'}</p>
        </div>
        <div class="head-actions">
          <label class="search">${icon('search')}<input id="task-search" type="search" placeholder="بحث في المهام… (Ctrl+F)" value="${esc(view.search)}"></label>
          <button class="btn primary" data-new>${icon('plus')}مهمة جديدة</button>
        </div>
      </header>
      ${quickAdd({ id: 'qa-tasks', due: view.filter === 'today' ? D.today() : '', category: view.category })}
      <div class="toolbar">
        <div class="tabs" role="tablist">
          ${FILTERS.map((f) => `<button role="tab" class="tab ${view.filter === f.id && !view.search ? 'active' : ''}" data-filter="${f.id}" aria-selected="${view.filter === f.id}">${f.label}<span class="count">${c[f.id]}</span></button>`).join('')}
        </div>
        <div class="toolbar-end">
          ${cat ? `<button class="btn ghost sm" data-clear-cat>${icon('x')}إظهار كل التصنيفات</button>` : ''}
          <label class="select-inline">ترتيب:
            <select data-sort>
              <option value="smart" ${view.sort === 'smart' ? 'selected' : ''}>الموعد</option>
              <option value="priority" ${view.sort === 'priority' ? 'selected' : ''}>الأولوية</option>
              <option value="created" ${view.sort === 'created' ? 'selected' : ''}>الأحدث</option>
            </select>
          </label>
        </div>
      </div>
      <div data-list></div>`;

    const listEl = $('[data-list]', page);
    renderList(listEl);

    page.addEventListener('click', (e) => {
      if (handle(e)) return;
      const f = e.target.closest('[data-filter]');
      if (f) {
        view.filter = f.dataset.filter;
        view.search = '';
        App.render();
      } else if (e.target.closest('[data-new]')) {
        openEditor(null, { due: view.filter === 'today' ? D.today() : null, categoryId: view.category });
      } else if (e.target.closest('[data-clear-cat]')) {
        view.category = null;
        App.render();
      }
    });
    page.addEventListener('change', (e) => {
      if (e.target.matches('[data-sort]')) {
        view.sort = e.target.value;
        renderList(listEl);
      }
    });
    const search = $('#task-search', page);
    search.addEventListener(
      'input',
      debounce(() => {
        view.search = search.value;
        $$('.tab', page).forEach((t) => t.classList.toggle('active', !view.search && t.dataset.filter === view.filter));
        renderList(listEl);
      }, 120)
    );
    bindQuickAdd(page);
    root.replaceChildren(page);
  }

  return { row, handle, openEditor, quickAdd, bindQuickAdd, render, view };
})();

Views.tasks = { render: Tasks.render };
