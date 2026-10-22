/**
 * @file The year, laid out.
 *
 * Twelve months that abut, each holding whatever the oven keeps that month.
 * Four of the eleven days hang off Easter, so for any chosen year they are
 * computed from `js/year.js` rather than read from a list — which is the
 * point of the page as much as the shop's.
 *
 * The chosen year lives in the URL (`?y=2027`), so a particular year is a
 * link and the back button walks them.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter } from '../components/chrome.js';
import { esc, isoDate } from '../components/calendar.js';
import { windowOf, easter, startOfDay, daysBetween } from '../year.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader('calendar');
renderFooter();

const { merchant, catalogue } = session.state;
const today = startOfDay(new Date());
const thisYear = today.getFullYear();

/* Three years: the one we are in and the two after it. Further ahead than
   that is arithmetic nobody is asking for, and the shop does not plan it. */
const YEARS = [thisYear, thisYear + 1, thisYear + 2];

const byId = new Map(catalogue.products.map((p) => [p.id, p]));

const monthName = (i) =>
  new Intl.DateTimeFormat(merchant.locale, { month: 'long' }).format(new Date(2026, i, 1));

const dayMonth = (d) =>
  new Intl.DateTimeFormat(merchant.locale, { day: 'numeric', month: 'long' }).format(d);

const weekday = (d) =>
  new Intl.DateTimeFormat(merchant.locale, { weekday: 'long' }).format(d);

/* -------------------------------------------------------------------------
   Which year
   ------------------------------------------------------------------------- */
const readYear = () => {
  const y = Number(new URLSearchParams(location.search).get('y'));
  return YEARS.includes(y) ? y : thisYear;
};

function setYear(y, { replace = false } = {}) {
  const p = new URLSearchParams(location.search);
  if (y === thisYear) p.delete('y');
  else p.set('y', String(y));
  const url = `${location.pathname}${p.toString() ? `?${p}` : ''}`;
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
  paint();
}

/* -------------------------------------------------------------------------
   One entry, resolved into a given year
   ------------------------------------------------------------------------- */
function resolve(year) {
  return (merchant.year ?? [])
    .map((entry) => {
      const w = windowOf(entry, year);
      if (!w) return null;

      /* Three states, and only one of them is about today. A year that is
         not this one has no "now" in it at all. */
      let state = 'later';
      if (year === thisYear) {
        if (today >= w.from && today <= w.to) state = 'now';
        else if (today > w.to) state = 'gone';
      } else if (year < thisYear) {
        state = 'gone';
      }

      return {
        entry,
        ...w,
        state,
        moves: typeof entry.easter === 'number',
        product: byId.get(entry.productId) ?? null,
        days: daysBetween(today, w.from),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.on - b.on);
}

/* -------------------------------------------------------------------------
   Paint
   ------------------------------------------------------------------------- */
function paintYears() {
  const y = readYear();
  $('[data-years]').innerHTML = YEARS.map(
    (candidate) => `
      <button class="year${candidate === y ? ' is-on' : ''}" type="button"
              data-y="${candidate}" aria-pressed="${candidate === y}">
        ${candidate}
      </button>`
  ).join('');

  $('[data-year-head]').textContent =
    y === thisYear ? `${y} — this year` : String(y);
}

function entryHTML(o) {
  const name = o.product ? o.product.name : o.entry.day;

  return `
    <article class="feast feast--${o.state}">
      <p class="feast__day label" lang="ca">${esc(o.entry.day)}</p>

      <h4 class="feast__name t-3" lang="ca">${
        o.product
          ? `<a href="product.html?id=${encodeURIComponent(o.product.id)}">${esc(name)}</a>`
          : esc(name)
      }</h4>

      <p class="feast__when sm">
        <time datetime="${esc(isoDate(o.on))}">${esc(weekday(o.on))} ${esc(dayMonth(o.on))}</time>
        ${o.moves ? '<span class="feast__moves" title="Worked out from Easter">moves</span>' : ''}
      </p>

      ${
        o.state === 'now'
          ? '<p class="feast__state state state--on"><span class="state__dot" aria-hidden="true"></span>On the counter now</p>'
          : ''
      }
      ${
        o.state === 'later' && o.days > 0 && o.days <= 30
          ? `<p class="feast__state state state--coming"><span class="state__dot" aria-hidden="true"></span>In ${o.days} days</p>`
          : ''
      }

      ${o.entry.note ? `<p class="feast__note sm">${esc(o.entry.note)}</p>` : ''}
    </article>`;
}

function paintMonths() {
  const year = readYear();
  const all = resolve(year);

  const months = Array.from({ length: 12 }, (_, i) => ({
    i,
    entries: all.filter((o) => o.on.getMonth() === i),
  }));

  $('[data-months]').innerHTML = months
    .map(
      (m) => `
        <section class="month${m.entries.length ? '' : ' month--quiet'}"
                 aria-labelledby="m-${m.i}">
          <h3 class="month__name label" id="m-${m.i}">${esc(monthName(m.i))}</h3>
          ${
            m.entries.length
              ? `<div class="month__feasts">${m.entries.map(entryHTML).join('')}</div>`
              : '<p class="month__none sm">Bread and the everyday things.</p>'
          }
        </section>`
    )
    .join('');
}

function paint() {
  paintYears();
  paintMonths();
}

/**
 * The two sentences that count the days.
 *
 * Counted from the config, not written down. The first draft said "seven are
 * fixed, the other four hang off Easter" — it is eight and three, and a
 * template whose whole subject is dates had a wrong number on the page about
 * how its dates work. D13: don't make a measurable claim you haven't
 * measured, and the cheapest way to keep one true is to compute it.
 */
function paintCounts() {
  const all = merchant.year ?? [];
  const moving = all.filter((e) => typeof e.easter === 'number');
  const fixed = all.length - moving.length;

  /* Spelled out, because a sentence that opens with a digit reads like a
     spreadsheet and this one is the shop talking. Past twenty the numeral is
     the clearer thing, and no forn keeps twenty-one feast days anyway. */
  const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
    'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
    'seventeen', 'eighteen', 'nineteen', 'twenty'];
  const spell = (n) => WORDS[n] ?? String(n);
  const Spell = (n) => {
    const w = spell(n);
    return w.charAt(0).toUpperCase() + w.slice(1);
  };

  const names = new Intl.ListFormat(merchant.locale, { style: 'long', type: 'conjunction' });
  const movingNames = names.format(moving.map((e) => e.day));
  const anFixed = all.find((e) => typeof e.on === 'string');

  $('[data-lede]').textContent =
    `${Spell(all.length)} days the oven keeps. ${Spell(fixed)} of them sit still and ` +
    `${spell(moving.length)} move with Easter, which is why this page is worked out ` +
    'rather than written down.';

  $('[data-how]').innerHTML = `
    <p>
      ${Spell(fixed)} of these days are fixed — ${esc(anFixed ? anFixed.day : 'Reis')} is on
      the same date every year. The other ${spell(moving.length)} hang off Easter, which
      moves, so they are worked out from it each time the page is opened.
    </p>
    <p>
      That is why you can change the year above and watch ${esc(movingNames)} move while the
      rest stay where they are.
    </p>`;
}

$('[data-years]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-y]');
  if (b) setYear(Number(b.dataset.y));
});

window.addEventListener('popstate', paint);

/* A year in the URL that is not one of the three is quietly corrected rather
   than rendered as an empty page. */
if (new URLSearchParams(location.search).has('y') && !YEARS.includes(Number(new URLSearchParams(location.search).get('y')))) {
  setYear(thisYear, { replace: true });
} else {
  paint();
}

paintCounts();

void easter;
