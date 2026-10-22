/**
 * @file Visit us.
 *
 * The one page where the question is almost always "are you open now", so
 * that is what it answers first — today's row is marked, and when the shop
 * is shut the page says when it opens again rather than leaving somebody to
 * work it out from a table.
 *
 * Everything else is the merchant's own words, out of `voice` and `visit`.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter } from '../components/chrome.js';
import { esc } from '../components/calendar.js';
import { isClosed } from '../../../../shared/core/fulfilment.js';
import { addDays, startOfDay } from '../../../../shared/core/dates.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader('visit');
renderFooter();

const { merchant } = session.state;
const visit = merchant.visit ?? {};
const now = new Date();
const today = startOfDay(now);

const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const weekdayName = (d) =>
  new Intl.DateTimeFormat(merchant.locale, { weekday: 'long' }).format(d);

/* -------------------------------------------------------------------------
   The room
   ------------------------------------------------------------------------- */
if (visit.lede) $('[data-lede]').textContent = visit.lede;
if (visit.room) $('[data-room]').textContent = visit.room;

const roomImg = $('[data-room-img]');
if (roomImg) roomImg.alt = merchant.voice?.shop?.alt ?? '';

$('[data-today]').textContent = new Intl.DateTimeFormat(merchant.locale, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(today);

/* -------------------------------------------------------------------------
   Hours

   The row for today is marked with a word as well as a surface, because a
   highlighted row that only differs in colour is not a mark at all for
   somebody who cannot see the difference.
   ------------------------------------------------------------------------- */
const todayName = WEEK[today.getDay()];

$('[data-hours]').innerHTML = merchant.hours
  .map((h) => {
    const isToday = h.day === todayName;
    return `
      <tr class="hours__row${isToday ? ' is-today' : ''}">
        <th scope="row">
          ${esc(weekdayName(new Date(2024, 0, 7 + WEEK.indexOf(h.day))))}
          ${isToday ? '<span class="hours__mark">today</span>' : ''}
        </th>
        <td class="num">${h.open ? `${esc(h.open)}–${esc(h.close)}` : 'Closed'}</td>
      </tr>`;
  })
  .join('');

/* When the shop is shut, say when it opens again rather than leaving the
   table to be read backwards. */
if (isClosed(merchant, today)) {
  let d = addDays(today, 1);
  for (let i = 0; i < 8 && isClosed(merchant, d); i += 1) d = addDays(d, 1);

  const next = merchant.hours.find((h) => h.day === WEEK[d.getDay()]);
  const shut = $('[data-shut]');
  shut.textContent = next?.open
    ? `Closed today. We open again ${weekdayName(d)} at ${next.open}.`
    : 'Closed today.';
  shut.hidden = false;
}

/* -------------------------------------------------------------------------
   Calling
   ------------------------------------------------------------------------- */
const phone = visit.phone;
if (phone) {
  const el = $('[data-phone]');
  el.textContent = phone;
  /* A tel: link needs the number without the spaces a person reads. */
  el.href = `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/* -------------------------------------------------------------------------
   Getting here
   ------------------------------------------------------------------------- */
$('[data-ways]').innerHTML = (visit.getting ?? [])
  .map(
    (w) => `
      <div class="way">
        <dt class="way__how label">${esc(w.how)}</dt>
        <dd class="way__what">${esc(w.what)}</dd>
      </div>`
  )
  .join('');

const address = session.location().address;
$('[data-address]').textContent = address;

/* A search URL rather than a pin: coordinates would be invented, and a
   search for the address lands in whichever map the visitor actually uses. */
$('[data-map]').href = `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;
