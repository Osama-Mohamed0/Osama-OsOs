'use strict';
// مكونات الواجهة العامة: نوافذ منبثقة، تأكيد، إشعارات داخلية، تلميحات، قوائم

const UI = (() => {
  let stack = [];
  let openMenu = null;

  function modal({ title, body, footer = '', size = '', onMount, onClose }) {
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <header class="modal-head">
          <h2>${esc(title)}</h2>
          <button class="icon-btn" data-close aria-label="إغلاق" title="إغلاق (Esc)">${icon('x')}</button>
        </header>
        <div class="modal-body">${body}</div>
        ${footer ? `<footer class="modal-foot">${footer}</footer>` : ''}
      </div>`;
    const prevFocus = document.activeElement;
    const entry = { wrap };
    const close = () => {
      if (!wrap.isConnected) return;
      wrap.remove();
      stack = stack.filter((x) => x !== entry);
      if (onClose) onClose();
      if (prevFocus && prevFocus.isConnected && prevFocus.focus) prevFocus.focus();
    };
    entry.close = close;
    wrap.addEventListener('mousedown', (e) => {
      if (e.target === wrap) close();
    });
    wrap.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) close();
    });
    $('#modal-root').appendChild(wrap);
    stack.push(entry);
    const box = wrap.querySelector('.modal');
    if (onMount) onMount(box, close);
    const first = box.querySelector('[autofocus]') || box.querySelector('.modal-body input, .modal-body textarea, .modal-body select');
    if (first) first.focus();
    return close;
  }

  function closeTop() {
    const top = stack[stack.length - 1];
    if (!top) return false;
    top.close();
    return true;
  }

  const hasModal = () => stack.length > 0;

  function confirm({ title, message, ok = 'تأكيد', danger = false }) {
    return new Promise((resolve) => {
      let result = false;
      modal({
        title,
        size: 'sm',
        body: `<p class="confirm-msg">${esc(message)}</p>`,
        footer: `<button class="btn ghost" data-close ${danger ? 'autofocus' : ''}>إلغاء</button>
                 <button class="btn ${danger ? 'danger' : 'primary'}" data-ok ${danger ? '' : 'autofocus'}>${esc(ok)}</button>`,
        onMount(box, close) {
          box.querySelector('[data-ok]').addEventListener('click', () => {
            result = true;
            close();
          });
        },
        onClose: () => resolve(result),
      });
    });
  }

  function toast(message, { action, timeout = 4500, type = '' } = {}) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const text = document.createElement('span');
    text.textContent = message;
    el.appendChild(text);
    const remove = () => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 200);
    };
    if (action) {
      const b = document.createElement('button');
      b.className = 'toast-btn';
      b.textContent = action.label;
      b.addEventListener('click', () => {
        action.fn();
        remove();
      });
      el.appendChild(b);
    }
    $('#toast-root').appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(remove, timeout);
  }

  // تلميح عائم لكل عنصر يحمل data-tip (القيمة) و data-tip-label (الوصف)
  function initTooltip() {
    const tip = $('#tooltip');
    let current = null;
    const place = (x, y) => {
      const r = tip.getBoundingClientRect();
      const left = clamp(x - r.width / 2, 8, window.innerWidth - r.width - 8);
      const top = y - r.height - 12 < 8 ? y + 18 : y - r.height - 12;
      tip.style.left = `${left}px`;
      tip.style.top = `${top}px`;
    };
    const show = (el, x, y) => {
      current = el;
      const value = document.createElement('strong');
      value.textContent = el.dataset.tip;
      const label = document.createElement('span');
      label.textContent = el.dataset.tipLabel || '';
      tip.replaceChildren(value, label);
      tip.hidden = false;
      place(x, y);
    };
    const hide = () => {
      current = null;
      tip.hidden = true;
    };
    document.addEventListener('pointerover', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (el) show(el, e.clientX, e.clientY);
    });
    document.addEventListener('pointermove', (e) => {
      if (current) place(e.clientX, e.clientY);
    });
    document.addEventListener('pointerout', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) hide();
    });
    document.addEventListener('focusin', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (!el) return;
      const r = el.getBoundingClientRect();
      show(el, r.left + r.width / 2, r.top);
    });
    document.addEventListener('focusout', hide);
    document.addEventListener('scroll', hide, true);
    document.addEventListener('pointerdown', hide);
  }

  // قائمة منسدلة صغيرة مرتبطة بزر
  function menu(anchor, items) {
    closeMenu();
    const el = document.createElement('div');
    el.className = 'menu';
    el.setAttribute('role', 'menu');
    items.forEach((it) => {
      if (it === '-') {
        el.appendChild(Object.assign(document.createElement('hr'), { className: 'menu-sep' }));
        return;
      }
      const b = document.createElement('button');
      b.className = `menu-item${it.danger ? ' danger' : ''}`;
      b.setAttribute('role', 'menuitem');
      b.innerHTML = it.icon ? icon(it.icon) : it.swatch ? `<i class="key" style="background:${it.swatch}"></i>` : '';
      b.appendChild(document.createTextNode(it.label));
      b.addEventListener('click', () => {
        closeMenu();
        it.fn();
      });
      el.appendChild(b);
    });
    document.body.appendChild(el);
    const r = anchor.getBoundingClientRect();
    const m = el.getBoundingClientRect();
    el.style.top = `${r.bottom + m.height + 6 > window.innerHeight ? r.top - m.height - 6 : r.bottom + 6}px`;
    el.style.left = `${clamp(r.right - m.width, 8, window.innerWidth - m.width - 8)}px`; // محاذاة يمين (RTL)
    openMenu = el;
    const first = el.querySelector('button');
    if (first) first.focus();
    setTimeout(() => document.addEventListener('pointerdown', outside), 0);
  }

  function outside(e) {
    if (openMenu && !openMenu.contains(e.target)) closeMenu();
  }

  function closeMenu() {
    if (!openMenu) return false;
    openMenu.remove();
    openMenu = null;
    document.removeEventListener('pointerdown', outside);
    return true;
  }

  // ---------- عناصر نماذج ----------
  function colorPicker(name, selected) {
    return `<div class="swatches" role="radiogroup">${PALETTE.map(
      (p) => `<label class="swatch" title="${p.name}">
        <input type="radio" name="${name}" value="${p.id}" ${p.id === selected ? 'checked' : ''}>
        <span style="--c:${colorHex(p.id)}"></span></label>`
    ).join('')}</div>`;
  }

  function categoryOptions(selected, emptyLabel = 'بدون تصنيف') {
    return `<option value="">${emptyLabel}</option>${Store.state.categories
      .map((c) => `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${esc(c.name)}</option>`)
      .join('')}`;
  }

  function priorityOptions(selected) {
    return Object.entries(PRIORITIES)
      .map(([k, p]) => `<option value="${k}" ${k === selected ? 'selected' : ''}>أولوية ${p.label}</option>`)
      .join('');
  }

  function empty(emoji, title, text = '', actionHtml = '') {
    return `<div class="empty"><div class="empty-emoji">${emoji}</div><h3>${esc(title)}</h3>${
      text ? `<p>${esc(text)}</p>` : ''
    }${actionHtml}</div>`;
  }

  return { modal, closeTop, hasModal, confirm, toast, initTooltip, menu, closeMenu, colorPicker, categoryOptions, priorityOptions, empty };
})();
