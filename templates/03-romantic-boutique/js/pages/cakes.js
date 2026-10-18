/**
 * @file The range.
 *
 * Browsing by occasion rather than by category, because "a birthday" is what
 * somebody arrives with and "8 inch round" is not. §7 of the brief asks for
 * occasion browsing; this makes it the primary filter rather than a facet in
 * a sidebar.
 *
 * The filter is in the URL, so a chosen occasion can be sent to somebody,
 * bookmarked, and survives the back button.
 */

import { startPage, $, $$, esc, link } from './_page.js';
import * as session from '../services/session.js';
import { cakeTile, priceFloor } from '../components/cakes.js';
import { money } from '../../../../shared/core/format.js';

await startPage({ nav: 'Cakes' });

const { merchant, catalogue } = session.state;
const cakes = catalogue.products.filter((p) => p.kind === 'cake');

for (const el of $$('[data-home-link]')) el.href = link('index.html');

const wanted = new URLSearchParams(location.search).get('occasion');
const occasion = (catalogue.occasions ?? []).find((o) => o.id === wanted) ?? null;

/* ---- Heading ------------------------------------------------------------ */
const cheapest = Math.min(...cakes.map((p) => priceFloor(p).low));

if (occasion) {
  document.title = `${occasion.label} — ${merchant.name}`;
  $('[data-crumb]').textContent = occasion.label;
  $('[data-title]').textContent = `${occasion.label}.`;
} else {
  $('[data-title]').textContent = 'The cakes';
}

$('[data-lede]').textContent = occasion
  ? `What we would send for that. ${occasion.note}.`
  : `Eight of them, from ${money(cheapest)}, made in two rooms on ${merchant.locations[0].address.split(',')[0].replace(/^\d+\s+/, '')}. Every one can have something written on it except the one that cannot, and that one says so.`;

/* ---- Occasions ---------------------------------------------------------- */
$('[data-occasions]').innerHTML = [
  {
    id: null,
    label: 'Everything',
    note: `All ${cakes.length} of them`,
  },
  ...(catalogue.occasions ?? []),
]
  .map(
    (o) => `
    <li>
      <a class="occasion" href="${link(o.id ? `cakes.html?occasion=${encodeURIComponent(o.id)}` : 'cakes.html')}"
         ${(o.id ?? null) === wanted || (!o.id && !wanted) ? 'aria-current="page"' : ''}>
        <span class="occasion__label">${esc(o.label)}</span>
        <span class="occasion__note sm dimmer">${esc(o.note)}</span>
      </a>
    </li>`
  )
  .join('');

/* ---- The grid ----------------------------------------------------------- */
const shown = occasion ? cakes.filter((p) => p.occasions?.includes(occasion.id)) : cakes;

// Not `data-count`. Template 04 had a page find the wrong element because a
// short, common attribute name matched something in the masthead.
$('[data-found]').textContent =
  shown.length === cakes.length
    ? `${cakes.length} cakes`
    : `${shown.length} of ${cakes.length}`;

$('[data-grid]').innerHTML = shown
  .map((p) => cakeTile(p, { when: session.state.when }))
  .join('');

if (!shown.length) {
  const none = $('[data-none]');
  none.innerHTML = `We do not have anything standing for that one. <a href="${link('cakes.html')}">See all of them</a> — most of these work for most things.`;
  none.hidden = false;
}
