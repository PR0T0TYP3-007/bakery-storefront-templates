/**
 * @file La botiga — the whole year on one page.
 *
 * The usual shop hides what it cannot sell today. This one does the
 * opposite: a tortell in March is still listed, still priced, and says
 * "torna el 6 de gener" instead of "esgotat". Hiding it would throw away
 * the only thing this template knows that the others do not.
 *
 * Filtering is by URL (`?c=pa&q=coca`), so a filtered shop is a link
 * somebody can send, and the back button walks the filters.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter } from '../components/chrome.js';
import { shopTile, entryFor, esc } from '../components/calendar.js';
import { nextFor } from '../year.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader('botiga');
renderFooter();

const { merchant, catalogue } = session.state;
const today = new Date();

const ALL = { id: '', label: 'Tot', note: null };
const categories = [ALL, ...catalogue.categories];

/* -------------------------------------------------------------------------
   Filter state, which lives in the URL and nowhere else
   ------------------------------------------------------------------------- */
const read = () => {
  const p = new URLSearchParams(location.search);
  return { c: p.get('c') ?? '', q: p.get('q') ?? '' };
};

function write(next, { replace = false } = {}) {
  const p = new URLSearchParams(location.search);
  for (const [k, v] of Object.entries(next)) {
    if (v) p.set(k, v);
    else p.delete(k);
  }
  const url = `${location.pathname}${p.toString() ? `?${p}` : ''}`;
  history[replace ? 'replaceState' : 'pushState'](null, '', url);
  paint();
}

/* -------------------------------------------------------------------------
   The filter tiles
   ------------------------------------------------------------------------- */
function paintFilters() {
  const { c } = read();
  $('[data-filters]').innerHTML = categories
    .map(
      (cat) => `
        <button class="filter${cat.id === c ? ' is-on' : ''}" type="button"
                data-c="${esc(cat.id)}" aria-pressed="${cat.id === c}">
          <span class="filter__label">${esc(cat.label)}</span>
          ${cat.note ? `<span class="filter__note sm">${esc(cat.note)}</span>` : ''}
        </button>`
    )
    .join('');
}

$('[data-filters]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-c]');
  if (btn) write({ c: btn.dataset.c });
});

/* -------------------------------------------------------------------------
   Search
   ------------------------------------------------------------------------- */
const form = $('[data-find]');
const input = form.querySelector('input');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  write({ q: input.value.trim() });
});

/* An empty box means no search, and waiting for a submit to say so leaves
   the list disagreeing with the field in front of it. */
input.addEventListener('input', () => {
  if (!input.value.trim() && read().q) write({ q: '' }, { replace: true });
});

window.addEventListener('popstate', paint);

/* -------------------------------------------------------------------------
   The list
   ------------------------------------------------------------------------- */
function match(products, { c, q }) {
  let items = c ? products.filter((p) => p.category === c) : products.slice();
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter((p) =>
      [p.name, p.subtitle, p.description].join(' ').toLowerCase().includes(needle)
    );
  }
  return items;
}

/**
 * Order by the year, not by the catalogue file.
 *
 * On the taulell today, then whatever is nearest, then everything that is
 * made every morning. A shop that argues the calendar decides cannot then
 * list its things in the order somebody happened to type them.
 */
function byYear(items) {
  const rank = (p) => {
    const entry = entryFor(merchant, p.id);
    if (!entry) return { tier: 2, days: 0 };
    const next = nextFor(entry, today);
    if (!next) return { tier: 3, days: 0 };
    return next.status === 'on' ? { tier: 0, days: 0 } : { tier: 1, days: next.days };
  };

  return items
    .map((p, i) => ({ p, i, ...rank(p) }))
    .sort((a, b) => a.tier - b.tier || a.days - b.days || a.i - b.i)
    .map((x) => x.p);
}

/** Count sentences, in Catalan, saying what the filter did. */
function countLine(n, { c, q }) {
  if (!n) return q ? `Res que es digui "${q}".` : 'Res en aquest calaix.';
  const thing = n === 1 ? '1 cosa' : `${n} coses`;
  if (q) return `${thing} per "${q}".`;
  const cat = categories.find((x) => x.id === c);
  return c ? `${thing} a ${cat ? cat.label.toLowerCase() : c}.` : `${thing}, tot l'any.`;
}

function paint() {
  const filter = read();
  input.value = filter.q;
  paintFilters();

  const items = byYear(match(catalogue.products, filter));
  $('[data-count]').textContent = countLine(items.length, filter);

  if (!items.length) {
    $('[data-list]').innerHTML = `
      <p class="note">
        No hi ha res amb aquest nom. Proveu <button class="link btn-as-link" type="button" data-clear>tot el forn</button>,
        o truqueu-nos al 93 441 00 00.
      </p>`;
    return;
  }

  $('[data-list]').innerHTML = `
    <div class="tiles">
      ${items.map((p) => shopTile(p, { merchant, today })).join('')}
    </div>`;
}

$('[data-list]').addEventListener('click', (e) => {
  if (e.target.closest('[data-clear]')) write({ c: '', q: '' });
});

paint();
