/* ==========================================================================
   SHARED — commerce-ui.js
   Commerce behaviour that every template needs, bound to data-attributes so
   each template supplies its own markup and styling.

   Templates provide the hooks:
     [data-cart-count]      the cart badge
     [data-readyby-text]    the current ready-by date
     [data-countdown]       + [data-countdown-time] / [data-countdown-label]
     .dp__* / .modal / .toast   styled per template, structure shared

   This file knows nothing about any particular brand.
   ========================================================================== */

const UI_ICONS = {
  left: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M7.5 1.5 3 6l4.5 4.5" stroke="currentColor" stroke-width="1.3"/></svg>',
  right:
    '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M4.5 1.5 9 6l-4.5 4.5" stroke="currentColor" stroke-width="1.3"/></svg>',
  close:
    '<svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="m1.5 1.5 10 10m0-10-10 10" stroke="currentColor" stroke-width="1.3"/></svg>',
  calendar:
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="1.5" y="3" width="13" height="11.5" stroke="currentColor" stroke-width="1.2"/><path d="M1.5 6.5h13M5 1.5V4M11 1.5V4" stroke="currentColor" stroke-width="1.2"/></svg>',
};

/* --------------------------------------------------------------------------
   Cart badge
   -------------------------------------------------------------------------- */
function updateCartCount() {
  const n = cartCount();
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.textContent = String(n);
    el.dataset.empty = String(n === 0);
  });
}

document.addEventListener('cart:change', updateCartCount);

/* --------------------------------------------------------------------------
   Ready-by label
   -------------------------------------------------------------------------- */
function paintReadyBy() {
  const el = document.querySelector('[data-readyby-text]');
  if (!el) return;
  const d = getReadyBy();
  const t = today();
  let prefix = '';
  if (sameDay(d, t)) prefix = 'Today, ';
  else if (sameDay(d, addDays(t, 1))) prefix = 'Tomorrow, ';
  el.textContent = prefix + fmtDate(d, { weekday: 'short', day: 'numeric', month: 'short' });
}

document.addEventListener('readyby:change', paintReadyBy);

/* --------------------------------------------------------------------------
   Cutoff countdown
   A static "order by 2pm" makes the customer do the arithmetic; a countdown
   does it for them. Past the cutoff it rolls to tomorrow's rather than
   disappearing, because the deadline is still real — it has only moved.
   -------------------------------------------------------------------------- */
function startCountdown() {
  const el = document.querySelector('[data-countdown]');
  const time = document.querySelector('[data-countdown-time]');
  if (!el || !time) return;

  const label = el.querySelector('[data-countdown-label]');

  const tick = () => {
    const ms = msUntilCutoff();
    el.hidden = false;

    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    time.textContent = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s).padStart(2, '0')}s`;

    el.dataset.urgent = String(ms < 2 * 3600000);

    if (label) {
      label.textContent = `for ${fmtDate(earliestFor(0), { weekday: 'long' })} collection`;
    }
  };

  tick();
  setInterval(tick, 1000);
}

/* --------------------------------------------------------------------------
   Reveal on scroll
   -------------------------------------------------------------------------- */
function initReveal() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -5% 0px', threshold: 0 }
  );

  items.forEach((el) => io.observe(el));

  // A reveal animation must never be the reason a customer cannot see a
  // product. Anything still hidden shortly after load is shown regardless.
  setTimeout(() => {
    items.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
    });
  }, 1200);
}

/* --------------------------------------------------------------------------
   Toasts
   -------------------------------------------------------------------------- */
function toast({ title, detail, thumb, href, hrefLabel }) {
  let host = document.querySelector('.toasts');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toasts';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }

  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `
    ${thumb ? `<img class="toast__thumb" src="${thumb}" alt="">` : ''}
    <div class="toast__body">${title}${detail ? `<small>${detail}</small>` : ''}</div>
    ${href ? `<a href="${href}">${hrefLabel || 'View'}</a>` : ''}
  `;
  host.appendChild(el);

  setTimeout(() => {
    el.classList.add('is-out');
    setTimeout(() => el.remove(), 320);
  }, 4200);
}

/* --------------------------------------------------------------------------
   Date picker
   Availability lives inside the calendar. Baymard's finding is that when a
   picker does not communicate availability, shoppers leave the flow to verify
   it — so every blocked day carries its reason on the cell itself.
   -------------------------------------------------------------------------- */
function createDatePicker(mount, { leadDays = 0, selected = null, onSelect = () => {} } = {}) {
  let cursor = startOfDay(selected || earliestFor(leadDays));
  cursor.setDate(1);
  let chosen = selected ? startOfDay(selected) : null;

  mount.classList.add('datepicker');
  mount.innerHTML = `
    <div class="dp__head">
      <div class="dp__month" data-dp-month></div>
      <div class="dp__nav">
        <button type="button" data-dp-prev aria-label="Previous month">${UI_ICONS.left}</button>
        <button type="button" data-dp-next aria-label="Next month">${UI_ICONS.right}</button>
      </div>
    </div>
    <div class="dp__dow" aria-hidden="true">
      ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => `<span>${d}</span>`).join('')}
    </div>
    <div class="dp__grid" role="grid" data-dp-grid></div>
    <div class="dp__legend">
      <span><i class="dp__swatch dp__swatch--sel"></i>Chosen</span>
      <span><i class="dp__swatch"></i>Available</span>
      <span><i class="dp__swatch dp__swatch--full"></i>Fully booked</span>
      <span><i class="dp__swatch dp__swatch--off"></i>Too soon / closed</span>
    </div>
    <p class="dp__note" data-dp-note></p>
  `;

  const monthEl = mount.querySelector('[data-dp-month]');
  const gridEl = mount.querySelector('[data-dp-grid]');
  const noteEl = mount.querySelector('[data-dp-note]');
  const prevBtn = mount.querySelector('[data-dp-prev]');
  const nextBtn = mount.querySelector('[data-dp-next]');

  function draw() {
    monthEl.textContent = fmtDate(cursor, { month: 'long', year: 'numeric' });

    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const pad = first.getDay();

    let html = '';
    for (let i = 0; i < pad; i++) html += '<span class="dp__day" data-state="empty"></span>';

    for (let day = 1; day <= daysInMonth; day++) {
      const d = startOfDay(new Date(cursor.getFullYear(), cursor.getMonth(), day));
      const state = dayState(d, leadDays);
      const isSel = chosen && sameDay(d, chosen);
      const label = `${fmtDateLong(d)} — ${DAY_STATE_REASON[state]}`;

      if (state === 'available') {
        html += `<button type="button" class="dp__day" data-state="${isSel ? 'selected' : 'available'}"
          data-key="${dateKey(d)}" title="${label}" aria-label="${label}">${day}</button>`;
      } else {
        html += `<span class="dp__day" data-state="${state}" title="${label}" aria-label="${label}"
          aria-disabled="true">${day}</span>`;
      }
    }

    gridEl.innerHTML = html;

    const earliest = earliestFor(leadDays);
    const minMonth = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const maxDate = addDays(today(), MERCHANT.maxDaysAhead);
    prevBtn.disabled = cursor <= minMonth;
    nextBtn.disabled = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) > maxDate;

    noteEl.innerHTML = leadDays
      ? `This cake needs <b>${leadDays} ${leadDays === 1 ? 'day' : 'days'}</b> of notice. The earliest we can have it ready is <b>${fmtDateLong(earliest)}</b>.`
      : `The earliest we can have anything ready is <b>${fmtDateLong(earliest)}</b>.`;
  }

  gridEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-key]');
    if (!btn) return;
    chosen = keyToDate(btn.dataset.key);
    draw();
    onSelect(chosen);
  });

  prevBtn.addEventListener('click', () => {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    draw();
  });

  nextBtn.addEventListener('click', () => {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    draw();
  });

  draw();

  return {
    setLeadDays(n) {
      leadDays = n;
      // A lead-time change can invalidate the chosen date — move it forward
      // rather than silently keeping an impossible one.
      if (chosen && dayState(chosen, leadDays) !== 'available') {
        chosen = earliestFor(leadDays);
        cursor = new Date(chosen.getFullYear(), chosen.getMonth(), 1);
        onSelect(chosen);
      }
      draw();
    },
    get value() {
      return chosen;
    },
  };
}

/* --------------------------------------------------------------------------
   Date modal
   -------------------------------------------------------------------------- */
let modalEl = null;
let lastFocus = null;

function openDateModal({ leadDays = 0, selected = null, title = 'Choose a date', note = '', onSelect = () => {} }) {
  closeDateModal();
  lastFocus = document.activeElement;

  modalEl = document.createElement('div');
  modalEl.className = 'modal';
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.setAttribute('aria-label', title);
  modalEl.innerHTML = `
    <div class="modal__scrim" data-close></div>
    <div class="modal__panel">
      <div class="modal__head">
        <div>
          <p class="modal__kicker">Availability</p>
          <h2 class="modal__title">${title}</h2>
          ${note ? `<p class="modal__note">${note}</p>` : ''}
        </div>
        <button class="modal__close" type="button" data-close aria-label="Close">${UI_ICONS.close}</button>
      </div>
      <div data-dp-mount></div>
    </div>
  `;

  document.body.appendChild(modalEl);
  document.body.style.overflow = 'hidden';

  createDatePicker(modalEl.querySelector('[data-dp-mount]'), {
    leadDays,
    selected,
    onSelect: (d) => {
      onSelect(d);
      setTimeout(closeDateModal, 160);
    },
  });

  requestAnimationFrame(() => {
    modalEl.dataset.open = 'true';
    const focusable = modalEl.querySelector('.modal__close');
    if (focusable) focusable.focus();
  });

  modalEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closeDateModal();
  });
  document.addEventListener('keydown', onModalKey);
}

function onModalKey(e) {
  if (e.key === 'Escape') closeDateModal();
}

function closeDateModal() {
  if (!modalEl) return;
  const el = modalEl;
  modalEl = null;
  el.dataset.open = 'false';
  document.removeEventListener('keydown', onModalKey);
  document.body.style.overflow = '';
  setTimeout(() => el.remove(), 320);
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

/* --------------------------------------------------------------------------
   Escaping — used wherever customer-entered text is written back into markup.
   -------------------------------------------------------------------------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}
