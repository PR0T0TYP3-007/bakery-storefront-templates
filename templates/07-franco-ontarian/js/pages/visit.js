/**
 * @file Nous trouver / Find us.
 *
 * The question almost everybody arrives with is "are you open now", so that
 * is what the page answers first: today's row is marked, and when the shop
 * is shut it says when it opens again rather than leaving the table to be
 * read backwards.
 *
 * Everything else is the merchant's own words, out of `voice` and `visit`.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter, esc } from '../components/chrome.js';
import { lang, onLang, t, bcp47 } from '../services/locale.js';
import { isClosed } from '../../../../shared/core/fulfilment.js';
import { addDays, startOfDay } from '../../../../shared/core/dates.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader('visit');
renderFooter();

const { merchant } = session.state;
const visit = merchant.visit ?? {};
const today = startOfDay(new Date());

const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const COPY = {
  skip: { fr: 'Aller aux heures', en: 'Skip to the hours' },
  head: { fr: 'Rue Principale, Hearst.', en: 'Rue Principale, Hearst.' },
  hours: { fr: 'Les heures', en: 'Hours' },
  hoursCaption: {
    fr: 'Les heures d’ouverture par jour',
    en: 'Opening hours by day',
  },
  todayMark: { fr: 'aujourd’hui', en: 'today' },
  closed: { fr: 'Fermé', en: 'Closed' },
  room: { fr: 'La place', en: 'The room' },
  language: { fr: 'La langue', en: 'Language' },
  call: { fr: 'Nous appeler', en: 'Calling' },
  ways: { fr: 'Comment venir', en: 'Getting here' },
  /* The tab title matches what the NAV calls this page, not what the
     getting-here section is headed. They were different words. */
  title: { fr: 'Nous trouver', en: 'Find us' },
  map: { fr: 'Ouvrir dans une carte', en: 'Open in a map' },
};

const weekdayName = (d, which) =>
  new Intl.DateTimeFormat(bcp47(which), { weekday: 'long' }).format(d);

function draw() {
  const which = lang();

  document.title = `${t(COPY.title, which)} — ${merchant.name}`;

  const set = (sel, value) => {
    const el = $(sel);
    if (el) el.textContent = value;
  };

  set('[data-skip]', t(COPY.skip, which));
  set('[data-kicker]', t(merchant.voice.kicker, which));
  set('[data-head]', t(COPY.head, which));
  set('[data-lede]', t(visit.lede, which));
  set('[data-hours-head]', t(COPY.hours, which));
  set('[data-hours-caption]', t(COPY.hoursCaption, which));
  set('[data-room-label]', t(COPY.room, which));
  set('[data-room]', t(visit.room, which));
  set('[data-lang-label]', t(COPY.language, which));
  set('[data-lang-note]', t(visit.language, which));
  set('[data-call-label]', t(COPY.call, which));
  set('[data-ways-head]', t(COPY.ways, which));
  set('[data-map-text]', t(COPY.map, which));

  set(
    '[data-today]',
    new Intl.DateTimeFormat(bcp47(which), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(today)
  );

  paintHours(which);
  paintPhone();
  paintWays(which);
}

/**
 * The hours.
 *
 * Today's row is marked by surface AND by the word, because a row that
 * differs only in colour is not marked at all for somebody who cannot see
 * the difference.
 */
function paintHours(which) {
  const todayName = WEEK[today.getDay()];

  $('[data-hours]').innerHTML = merchant.hours
    .map((h) => {
      const isToday = h.day === todayName;
      const name = weekdayName(new Date(Date.UTC(2024, 0, 7 + WEEK.indexOf(h.day))), which);
      const shown = name.charAt(0).toUpperCase() + name.slice(1);

      return `
        <tr class="hours__row${isToday ? ' is-today' : ''}">
          <th scope="row">
            ${esc(shown)}
            ${isToday ? `<span class="hours__mark">${esc(t(COPY.todayMark, which))}</span>` : ''}
          </th>
          <td class="num">${
            h.open ? `${esc(h.open)}–${esc(h.close)}` : esc(t(COPY.closed, which))
          }</td>
        </tr>`;
    })
    .join('');

  /* Shut today? Say when it opens again rather than making somebody read
     the table backwards to work it out. */
  const shut = $('[data-shut]');
  if (!isClosed(merchant, today)) {
    shut.hidden = true;
    return;
  }

  let d = addDays(today, 1);
  for (let i = 0; i < 8 && isClosed(merchant, d); i += 1) d = addDays(d, 1);

  const next = merchant.hours.find((h) => h.day === WEEK[d.getDay()]);
  const day = weekdayName(d, which);

  shut.textContent = next?.open
    ? which === 'fr'
      ? `Fermé aujourd’hui. On rouvre ${day} à ${next.open}.`
      : `Closed today. We open again ${day} at ${next.open}.`
    : which === 'fr'
      ? 'Fermé aujourd’hui.'
      : 'Closed today.';
  shut.hidden = false;
}

function paintPhone() {
  const el = $('[data-phone]');
  if (!el || !merchant.phone) return;
  el.textContent = merchant.phone;
  /* A tel: link needs the number without the spaces a person reads. */
  el.href = `tel:${String(merchant.phone).replace(/[^\d+]/g, '')}`;
}

function paintWays(which) {
  $('[data-ways]').innerHTML = (visit.getting ?? [])
    .map(
      (w) => `
        <div class="way plate plate--rim">
          <dt class="way__how label">${esc(t(w.how, which))}</dt>
          <dd class="way__what">${esc(t(w.what, which))}</dd>
        </div>`
    )
    .join('');

  const address = session.location().address;
  $('[data-address]').textContent = address;

  /* A search rather than a pin: coordinates would be invented, and a search
     lands in whichever map the visitor actually uses. */
  $('[data-map]').href = `https://www.openstreetmap.org/search?query=${encodeURIComponent(
    address
  )}`;
}

draw();
onLang(draw);
