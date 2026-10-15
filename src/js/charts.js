'use strict';
// رسوم بيانية خفيفة بـ SVG دون مكتبات خارجية

const Charts = (() => {
  const observer = new ResizeObserver((entries) => {
    for (const e of entries) if (e.target._draw) e.target._draw();
  });
  const mounted = new Set();

  // إيقاف مراقبة المخططات التي أُزيلت من الصفحة
  function cleanup() {
    for (const el of mounted) {
      if (el.isConnected) continue;
      observer.unobserve(el);
      mounted.delete(el);
    }
  }

  // يرسم المخطط بعرض الحاوية الفعلي ويعيد الرسم عند تغيّر الحجم
  function mount(el, draw) {
    el._lastW = 0;
    el._draw = () => {
      const w = Math.floor(el.clientWidth);
      if (w <= 0 || w === el._lastW) return;
      el._lastW = w;
      el.innerHTML = draw(w);
    };
    el._draw();
    observer.observe(el);
    mounted.add(el);
  }

  function niceScale(maxV, ticks = 4) {
    if (maxV <= 0) return { max: ticks, step: 1 };
    const raw = maxV / ticks;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    let step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    step = Math.max(1, step);
    return { max: Math.ceil(maxV / step) * step, step };
  }

  const fmtTick = (v) => (v >= 1000 ? `${fmtNum(v / 1000)}K` : String(v));

  // عمود بزاوية علوية مستديرة 4px وقاعدة مستوية
  function barPath(x, y, w, h) {
    const r = Math.min(4, w / 2, h);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }

  // مخطط أعمدة لسلسلة واحدة. data: [{label, tipLabel, value}]
  // fmt: نص التلميح، labelFmt: الرقم المكتوب فوق العمود
  function bars(data, { fmt = fmtNum, labelFmt = fmtNum, height = 200, color = 'var(--series-1)', aria = '' } = {}) {
    return (w) => {
      const padL = 34;
      const padR = 6;
      const padT = 22;
      const padB = 28;
      const pw = w - padL - padR;
      const ph = height - padT - padB;
      const { max, step } = niceScale(Math.max(0, ...data.map((d) => d.value)));
      const y = (v) => padT + ph - (v / max) * ph;
      const band = pw / data.length;
      const bw = Math.max(2, Math.min(24, band * 0.62));
      const every = Math.max(1, Math.ceil(46 / band));
      const last = data.length - 1;
      let maxIdx = -1;
      data.forEach((d, i) => {
        if (d.value > 0 && (maxIdx < 0 || d.value >= data[maxIdx].value)) maxIdx = i;
      });
      // نكتب قيمة آخر عمود وأعلى عمود فقط، ونتجنب تداخلهما
      const labelMax = maxIdx >= 0 && maxIdx !== last && (data[last].value === 0 || (last - maxIdx) * band > 34);

      let svg = `<svg class="chart" width="${w}" height="${height}" viewBox="0 0 ${w} ${height}" role="img" aria-label="${esc(aria)}">`;
      for (let v = 0; v <= max + 1e-9; v += step) {
        const yy = Math.round(y(v)) + 0.5;
        svg += `<line class="${v === 0 ? 'axis' : 'grid'}" x1="${padL}" x2="${w - padR}" y1="${yy}" y2="${yy}"/>`;
        svg += `<text class="tick" x="${padL - 8}" y="${yy + 4}" text-anchor="end">${fmtTick(v)}</text>`;
      }
      data.forEach((d, i) => {
        const cx = padL + band * i + band / 2;
        const top = y(d.value);
        const hgt = y(0) - top;
        svg += `<g class="bar-g" tabindex="${data.length <= 31 ? 0 : -1}" data-tip="${esc(fmt(d.value))}" data-tip-label="${esc(d.tipLabel)}">`;
        svg += `<rect class="hit" x="${padL + band * i}" y="${padT}" width="${band}" height="${ph}"/>`;
        if (d.value > 0) svg += `<path class="bar" style="fill:${color}" d="${barPath(cx - bw / 2, top, bw, hgt)}"/>`;
        svg += '</g>';
        if (d.value > 0 && (i === last || (i === maxIdx && labelMax))) {
          svg += `<text class="val" x="${cx}" y="${top - 6}" text-anchor="middle">${esc(labelFmt(d.value))}</text>`;
        }
        if ((last - i) % every === 0) {
          svg += `<text class="xl" x="${cx}" y="${height - 8}" text-anchor="middle">${esc(d.label)}</text>`;
        }
      });
      return `${svg}</svg>`;
    };
  }

  // جدول بديل لكل مخطط (للوصول وقراءة القيم بدقة)
  function table(data, colLabel, valLabel, fmt = fmtNum) {
    const rows = [...data]
      .reverse()
      .map((d) => `<tr><td>${esc(d.tipLabel)}</td><td class="num">${esc(fmt(d.value))}</td></tr>`)
      .join('');
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>${esc(colLabel)}</th><th class="num">${esc(valLabel)}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  // حلقة تقدّم (0-100)
  function ring(value, { size = 132, stroke = 12, cls = '' } = {}) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const off = c * (1 - clamp(value, 0, 100) / 100);
    const mid = size / 2;
    return `<svg class="ring ${cls}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle class="ring-track" cx="${mid}" cy="${mid}" r="${r}" stroke-width="${stroke}"/>
      <circle class="ring-fill" cx="${mid}" cy="${mid}" r="${r}" stroke-width="${stroke}"
        stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${mid} ${mid})"/>
    </svg>`;
  }

  // خريطة حرارية لعادة واحدة: أعمدة = أسابيع، صفوف = أيام
  function heatmap(habit) {
    return (w) => {
      const ws = Store.state.settings.weekStart;
      const today = D.today();
      const labelW = 22;
      const gap = 3;
      // عدد الأسابيع: منذ بداية العادة (8 على الأقل) وبما يتسع له العرض
      const sinceStart = Math.ceil((D.diff(today, habit.startKey) + 7) / 7);
      const weeks = clamp(Math.min(sinceStart, Math.floor((w - labelW) / 17)), 8, 30);
      const cs = Math.min(16, Math.floor((w - labelW) / weeks) - gap);
      const top = 18;
      const height = top + 7 * (cs + gap);
      const lastWeekStart = D.add(today, -((D.weekday(today) - ws + 7) % 7));
      const firstWeekStart = D.add(lastWeekStart, -7 * (weeks - 1));
      const color = colorHex(habit.color);
      const width = labelW + weeks * (cs + gap);
      let svg = `<svg class="chart heat" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="سجل ${esc(habit.name)}">`;
      for (let r = 0; r < 7; r += 2) {
        const wd = (ws + r) % 7;
        svg += `<text class="tick" x="${labelW - 6}" y="${top + r * (cs + gap) + cs - 3}" text-anchor="end">${DAY_LETTERS[wd]}</text>`;
      }
      let prevMonth = -1;
      for (let c = 0; c < weeks; c++) {
        const colStart = D.add(firstWeekStart, c * 7);
        const month = D.parse(colStart).getMonth();
        const x = labelW + c * (cs + gap);
        if (month !== prevMonth && c < weeks - 1) {
          svg += `<text class="tick" x="${x}" y="11" text-anchor="start">${MONTHS[month]}</text>`;
          prevMonth = month;
        }
        for (let r = 0; r < 7; r++) {
          const k = D.add(colStart, r);
          if (k > today) continue;
          const y = top + r * (cs + gap);
          const count = Store.habitCount(habit, k);
          let cls = 'cell';
          let fill = '';
          let tip;
          const weekdayOn = habit.days.includes(D.weekday(k));
          if (!Store.isScheduled(habit, k) && !(weekdayOn && count)) {
            cls += ' off';
            tip = count ? `${count}/${habit.target}` : 'غير مجدولة';
          } else if (count >= habit.target) {
            fill = `fill:${color}`;
            tip = 'أُنجزت ✓';
          } else if (count > 0) {
            fill = `fill:${color};fill-opacity:.45`;
            tip = `${count}/${habit.target}`;
          } else {
            cls += ' zero';
            tip = 'لم تُنجز';
          }
          if (!Store.isScheduled(habit, k) && weekdayOn && !count) tip = 'قبل بداية العادة';
          const hk = weekdayOn ? ` data-hk="${k}"` : '';
          svg += `<rect class="${cls}" style="${fill}" x="${x}" y="${y}" width="${cs}" height="${cs}" rx="3"${hk} data-tip="${esc(tip)}" data-tip-label="${esc(D.long(k))}"/>`;
        }
      }
      return `${svg}</svg>`;
    };
  }

  // أشرطة أفقية HTML (تتبع اتجاه RTL تلقائياً)
  function hbars(rows) {
    const max = Math.max(1, ...rows.map((r) => r.max ?? r.value));
    return `<div class="hbars">${rows
      .map((r) => {
        const pct = clamp(((r.value || 0) / (r.max ?? max)) * 100, 0, 100);
        return `<div class="hbar-row">
          <span class="hbar-label"><i class="key" style="background:${r.color}"></i><span>${esc(r.label)}</span></span>
          <span class="hbar-track"><span class="hbar-fill" style="width:${pct}%;background:${r.color}"></span></span>
          <span class="hbar-val">${esc(r.text)}</span>
        </div>`;
      })
      .join('')}</div>`;
  }

  return { mount, cleanup, bars, table, ring, heatmap, hbars, niceScale };
})();
