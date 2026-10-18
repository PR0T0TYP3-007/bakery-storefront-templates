/**
 * @file The diary.
 *
 * A studio takes a handful of commissions a week, so this is a diary rather
 * than a shop's collection planner: most days are genuinely unavailable, and
 * the ones that are not are the whole point.
 *
 *
 * A native <dialog>, so focus trapping, Escape, the backdrop and making the
 * rest of the page inert are the platform's job. Every hand-rolled modal I
 * have read gets at least one of those four wrong.
 *
 * Two decisions worth stating:
 *
 * 1. A blocked day says why *on the cell*. "Closed", "Full", "Too soon" —
 *    a disabled square with no explanation makes the customer click it to
 *    find out, which is the one thing a disabled control cannot answer.
 * 2. Lead time is a property of the configuration, not the shop. A fondant
 *    figure adds four days, so the greyed-out region grows as you choose.
 *    The dialog is therefore passed `leadDays` and recomputes, rather than
 *    being handed a fixed list of dates.
 */

import * as session from '../services/session.js';
import { icons } from './icons.js';
import { today, addDays, dateKey, sameDay, startOfDay } from '../../../../shared/core/dates.js';
import { dayState, DAY_REASON, capacityFor, slotsFor } from '../../../../shared/core/fulfilment.js';
import { dateLong } from '../../../../shared/core/format.js';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const WHY = {
  closed: 'Shut',
  full: 'Taken',
  tooSoon: 'Too soon',
  tooFar: '—',
};

/**
 * @param {object} opts
 * @param {number} opts.leadDays        days of notice this configuration needs
 * @param {Date} opts.selected
 * @param {string} [opts.title]
 * @param {string} [opts.note]
 * @param {boolean} [opts.withSlots]    also choose a collection window
 * @param {string} [opts.slot]
 * @param {(when:Date, slot?:string)=>void} opts.onSelect
 */
export function openDatePicker({
  leadDays = 0,
  selected,
  title = 'When is it for?',
  note = '',
  withSlots = false,
  slot = null,
  onSelect,
}) {
  // A double tap, or a click that lands while one is already up, would
  // otherwise stack a second modal on the first — both open, only the top
  // one reachable, and closing it reveals a stale calendar underneath.
  if (document.querySelector('dialog[open]')) return;

  const { merchant } = session.state;

  let cursor = startOfDay(selected ?? today());
  let chosen = selected ? startOfDay(selected) : null;
  let chosenSlot = slot;
  let month = new Date(cursor.getFullYear(), cursor.getMonth(), 1);

  const first = addDays(today(), leadDays);
  const last = addDays(today(), merchant.maxDaysAhead);

  const dlg = document.createElement('dialog');
  dlg.className = 'diary';
  dlg.innerHTML = `
    <div class="dlg__head">
      <div>
        <h2 class="dlg__title" data-title></h2>
        <p class="dlg__note" data-note></p>
      </div>
      <button class="dlg__x" type="button" data-close aria-label="Close">${icons.close}</button>
    </div>
    <div class="dlg__body">
      <div class="cal__nav">
        <button class="cal__arrow" type="button" data-prev aria-label="Previous month">${icons.back}</button>
        <p class="cal__month" data-month aria-live="polite"></p>
        <button class="cal__arrow" type="button" data-next aria-label="Next month">${icons.arrow}</button>
      </div>
      <div class="cal__grid" data-dow></div>
      <div class="cal__grid" data-grid role="group" aria-label="Choose a day"></div>
      <div class="cal__key">
        <span><i style="background:var(--acid)"></i> Chosen</span>
        <span><i style="background:var(--ink-2)"></i> Today</span>
        <span><i style="background:var(--ground)"></i> Not available</span>
      </div>
      <div data-slots></div>
    </div>
    <div class="dlg__foot">
      <button class="btn btn--sm" type="button" data-close>Cancel</button>
      <button class="btn btn--acid btn--sm push" type="button" data-confirm disabled>Use this day</button>
    </div>`;

  document.body.append(dlg);

  const $ = (s) => dlg.querySelector(s);
  $('[data-title]').textContent = title;
  const noteEl = $('[data-note]');
  noteEl.textContent =
    note || (leadDays > 0 ? `This brief needs ${leadDays} ${leadDays === 1 ? 'day' : 'days'} on the bench.` : '');
  if (!noteEl.textContent) noteEl.hidden = true;

  $('[data-dow]').innerHTML = DOW.map((d) => `<p class="cal__dow">${d}</p>`).join('');

  function paint() {
    const y = month.getFullYear();
    const m = month.getMonth();
    $('[data-month]').textContent = month.toLocaleDateString(merchant.locale, {
      month: 'long',
      year: 'numeric',
    });

    // Monday-first. getDay() is Sunday-first, hence the shift.
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();

    let html = '';
    for (let i = 0; i < lead; i++) html += '<div class="cal__day cal__day--empty" aria-hidden="true"></div>';

    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d);
      const state = dayState(merchant, date, leadDays);
      const ok = state === 'available';
      const isToday = sameDay(date, today());
      const isChosen = chosen && sameDay(date, chosen);
      const cap = ok ? capacityFor(merchant, date) : null;

      const label = ok
        ? `${dateLong(date)}${cap ? `, ${cap.left} of ${cap.cap} slots left` : ''}`
        : `${dateLong(date)}, ${DAY_REASON[state] ?? 'not available'}`;

      html += `<button type="button" class="cal__day" data-key="${dateKey(date)}"
          ${ok ? '' : 'disabled'} ${isToday ? 'data-today' : ''}
          aria-pressed="${Boolean(isChosen)}" aria-label="${label}">
          <span>${d}</span>
          ${ok ? '' : `<span class="cal__why">${WHY[state] ?? ''}</span>`}
        </button>`;
    }

    $('[data-grid]').innerHTML = html;

    $('[data-prev]').disabled = new Date(y, m, 0) < new Date(first.getFullYear(), first.getMonth(), 1);
    $('[data-next]').disabled = new Date(y, m + 1, 1) > last;

    paintSlots();
    $('[data-confirm]').disabled = !chosen || (withSlots && !chosenSlot);
  }

  function paintSlots() {
    const host = $('[data-slots]');
    if (!withSlots || !chosen) {
      host.innerHTML = '';
      return;
    }
    const loc = session.location();
    const slots = slotsFor(merchant, loc, chosen);

    host.innerHTML = `
      <h3 class="label" style="margin:var(--s-4) 0 var(--s-3)">Collection window</h3>
      <div class="slots">
        ${slots
          .map(
            (s, i) => `
          <label class="slot">
            <input type="radio" name="dp-slot" value="${s.time}" ${s.full ? 'disabled' : ''}
              ${chosenSlot === s.time ? 'checked' : ''}>
            <span class="slot__face">
              <span>${s.time}</span>
              <span class="slot__left">${s.full ? 'Full' : `${s.left} left`}</span>
            </span>
          </label>`
          )
          .join('')}
      </div>`;

    host.addEventListener('change', (e) => {
      if (e.target.name !== 'dp-slot') return;
      chosenSlot = e.target.value;
      $('[data-confirm]').disabled = false;
    });
  }

  $('[data-grid]').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-key]');
    if (!btn || btn.disabled) return;
    chosen = startOfDay(new Date(btn.dataset.key + 'T00:00:00'));
    // Changing the day invalidates the window: slot capacity is per day.
    chosenSlot = null;
    paint();
  });

  // Arrow keys move day to day across month boundaries, which a grid of
  // buttons does not give for free.
  $('[data-grid]').addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    const from = chosen ?? first;
    const to = addDays(from, step);
    if (to < new Date(first.getFullYear(), first.getMonth(), 1) || to > last) return;
    chosen = to;
    chosenSlot = null;
    month = new Date(to.getFullYear(), to.getMonth(), 1);
    paint();
    dlg.querySelector(`[data-key="${dateKey(to)}"]`)?.focus();
  });

  $('[data-prev]').addEventListener('click', () => {
    month = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    paint();
  });
  $('[data-next]').addEventListener('click', () => {
    month = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    paint();
  });

  dlg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dlg.close()));

  $('[data-confirm]').addEventListener('click', () => {
    if (!chosen) return;
    onSelect(chosen, chosenSlot);
    dlg.close();
  });

  // Clicking the backdrop closes it. <dialog> reports backdrop clicks as
  // clicks on the dialog itself, so the target check is the whole test.
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close();
  });

  dlg.addEventListener('close', () => dlg.remove());

  paint();
  dlg.showModal();
  // Open on the chosen day rather than the dialog's first control, so the
  // keyboard lands where the decision is.
  dlg.querySelector('[aria-pressed="true"]')?.focus();
}
