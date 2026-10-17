/**
 * @file Collection-day picker, in a native <dialog>.
 *
 * Availability lives inside the calendar. Baymard's finding is that when a
 * picker does not communicate availability, shoppers leave the flow to
 * verify it elsewhere — so every blocked day states its reason on the cell,
 * for sighted users via `title` and for everyone via `aria-label`.
 */

import { icons } from './icons.js';
import { date as fmtDate, dateLong, whenPhrase } from '../core/format.js';
import { startOfDay, today, addDays, dateKey, keyToDate, sameDay } from '../core/dates.js';
import { dayState, earliestFor, DAY_REASON } from '../core/fulfilment.js';
import * as session from '../services/session.js';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * @param {{leadDays?:number, selected?:Date, title?:string, note?:string,
 *          onSelect:(d:Date)=>void}} opts
 */
export function openDatePicker({
  leadDays = 0,
  selected = null,
  title = 'When are you collecting?',
  note = '',
  onSelect,
}) {
  const merchant = session.state.merchant;
  let chosen = selected ? startOfDay(selected) : null;
  let cursor = startOfDay(chosen ?? earliestFor(merchant, leadDays));
  cursor.setDate(1);

  const dlg = document.createElement('dialog');
  dlg.className = 'dialog';
  dlg.setAttribute('aria-label', title);
  dlg.innerHTML = `
    <div class="dialog__head">
      <div>
        <p class="label">Availability</p>
        <h2 class="t-3" style="margin-top:.2rem">${title}</h2>
        ${note ? `<p class="sm" style="margin-top:.4rem;max-width:34ch">${note}</p>` : ''}
      </div>
      <button class="dialog__close" type="button" data-close aria-label="Close">${icons.close}</button>
    </div>
    <div class="dialog__body">
      <div class="dp__head">
        <p class="dp__month" data-month aria-live="polite"></p>
        <div class="dp__nav">
          <button type="button" data-prev aria-label="Previous month">${icons.left}</button>
          <button type="button" data-next aria-label="Next month">${icons.right}</button>
        </div>
      </div>
      <div class="dp__dow" aria-hidden="true">${DOW.map((d) => `<span>${d}</span>`).join('')}</div>
      <div class="dp__grid" data-grid role="group" aria-label="Choose a day"></div>
      <div class="dp__legend">
        <span><i class="dp__key dp__key--sel"></i>Chosen</span>
        <span><i class="dp__key"></i>Available</span>
        <span><i class="dp__key dp__key--full"></i>Fully booked</span>
        <span><i class="dp__key dp__key--off"></i>Too soon or closed</span>
      </div>
      <p class="note" style="margin-top:var(--s-3)" data-note></p>
    </div>
  `;

  document.body.appendChild(dlg);

  const $ = (s) => dlg.querySelector(s);
  const grid = $('[data-grid]');

  function draw() {
    $('[data-month]').textContent = fmtDate(cursor, { month: 'long', year: 'numeric' });

    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

    let html = '';
    for (let i = 0; i < first.getDay(); i++) {
      html += '<span class="dp__day" data-state="empty"></span>';
    }

    for (let d = 1; d <= days; d++) {
      const day = startOfDay(new Date(cursor.getFullYear(), cursor.getMonth(), d));
      const state = dayState(merchant, day, leadDays);
      const isSel = chosen && sameDay(day, chosen);
      const label = `${dateLong(day)} — ${DAY_REASON[state]}`;

      html +=
        state === 'available'
          ? `<button type="button" class="dp__day" data-state="${isSel ? 'selected' : 'available'}"
               data-key="${dateKey(day)}" title="${label}" aria-label="${label}"
               ${isSel ? 'aria-current="date"' : ''}>${d}</button>`
          : `<span class="dp__day" data-state="${state}" title="${label}" aria-label="${label}"
               role="img" aria-disabled="true">${d}</span>`;
    }

    grid.innerHTML = html;

    const earliest = earliestFor(merchant, leadDays);
    const minMonth = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    const max = addDays(today(), merchant.maxDaysAhead ?? 60);
    $('[data-prev]').disabled = cursor <= minMonth;
    $('[data-next]').disabled = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) > max;

    $('[data-note]').innerHTML = `${icons.info} <span>${
      leadDays
        ? `This needs <strong>${leadDays} ${leadDays === 1 ? 'day' : 'days'}</strong> of notice. The soonest is <strong>${whenPhrase(earliest)}</strong>.`
        : `The soonest we can have anything ready is <strong>${whenPhrase(earliest)}</strong>.`
    }</span>`;
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-key]');
    if (!btn) return;
    chosen = keyToDate(btn.dataset.key);
    draw();
    onSelect?.(chosen);
    close();
  });

  $('[data-prev]').addEventListener('click', () => {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    draw();
  });
  $('[data-next]').addEventListener('click', () => {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    draw();
  });
  $('[data-close]').addEventListener('click', close);
  dlg.addEventListener('close', () => dlg.remove());

  // Clicking the backdrop closes, matching every other dialog on the web.
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) close();
  });

  function close() {
    if (dlg.open) dlg.close();
    else dlg.remove();
  }

  draw();
  dlg.showModal();
}
