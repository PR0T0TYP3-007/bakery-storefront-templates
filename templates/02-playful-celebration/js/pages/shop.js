/**
 * @file Shop — everything we make, filtered by occasion, kind and words.
 *
 * Filters write to the URL as they are used, so a filtered shelf can be sent
 * to somebody or bookmarked. `replaceState` rather than `pushState`: typing
 * a search should not bury the previous page under thirty history entries.
 */

import { startPage, $, esc, link } from './_page.js';
import * as session from '../services/session.js';
import { search } from '../services/api.js';
import { productCard, cardSkeleton } from '../components/cards.js';

$('[data-shelf]').innerHTML = cardSkeleton(6);

await startPage({ nav: 'Our cakes' });

const { catalogue } = session.state;

const params = new URLSearchParams(location.search);
let occasion = params.get('occasion') || 'all';
let category = params.get('cat') || 'all';
let query = params.get('q') || '';

$('[data-build-link]').href = link('build.html');
if (query) $('[data-search]').value = query;

/* -------------------------------------------------------------------------
   Filters
   ------------------------------------------------------------------------- */

function chip(id, label, pressed, count, icon = '') {
  return `<button class="chip" type="button" data-id="${esc(id)}" aria-pressed="${pressed}">
      ${icon ? `<span class="chip__emoji" aria-hidden="true">${esc(icon)}</span>` : ''}
      ${esc(label)}${count != null ? ` <span class="chip__count">${count}</span>` : ''}
    </button>`;
}

function paintFilters() {
  const all = catalogue.products;

  $('[data-occasions]').innerHTML =
    chip('all', 'Any day', occasion === 'all', all.length) +
    catalogue.occasions
      .map((o) =>
        chip(o.id, o.label, occasion === o.id, all.filter((p) => p.occasions?.includes(o.id)).length, o.icon)
      )
      .join('');

  $('[data-cats]').innerHTML =
    chip('all', 'Everything', category === 'all', all.length) +
    catalogue.categories
      .map((c) => chip(c.id, c.label, category === c.id, all.filter((p) => p.category === c.id).length))
      .join('');
}

$('[data-occasions]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-id]');
  if (!btn) return;
  occasion = btn.dataset.id;
  sync();
});

$('[data-cats]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-id]');
  if (!btn) return;
  category = btn.dataset.id;
  sync();
});

$('[data-searchform]').addEventListener('submit', (e) => e.preventDefault());
$('[data-search]').addEventListener('input', (e) => {
  query = e.target.value.trim();
  sync({ filtersUnchanged: true });
});

function sync({ filtersUnchanged = false } = {}) {
  const url = new URL(location.href);
  for (const [key, value] of [['occasion', occasion], ['cat', category], ['q', query]]) {
    value && value !== 'all' ? url.searchParams.set(key, value) : url.searchParams.delete(key);
  }
  history.replaceState({}, '', url);
  if (!filtersUnchanged) paintFilters();
  paintGrid();
}

/* -------------------------------------------------------------------------
   The grid
   ------------------------------------------------------------------------- */

function paintGrid() {
  let items = catalogue.products;
  if (occasion !== 'all') items = items.filter((p) => p.occasions?.includes(occasion));
  if (category !== 'all') items = items.filter((p) => p.category === category);
  if (query) items = search(items, query);

  const n = items.length;
  $('[data-found]').textContent = `${n} ${n === 1 ? 'cake' : 'things'}`;

  if (!n) {
    // The empty state names what was searched for and offers the way out,
    // rather than showing a shrug.
    $('[data-shelf]').innerHTML = `
      <div class="empty" style="grid-column:1/-1">
        <p class="t-3">Nothing matches that</p>
        <p class="sm" style="margin-top:var(--s-2)">
          We make nine things, so it is an easy shelf to run out of.
          ${query ? `Nothing here is called &ldquo;${esc(query)}&rdquo;.` : ''}
          You can always build the cake you are after instead.
        </p>
        <div class="row" style="justify-content:center;margin-top:var(--s-4)">
          <a class="btn btn--primary" href="${link('build.html')}">Build it yourself</a>
          <button class="btn btn--quiet" type="button" data-reset>Clear the filters</button>
        </div>
      </div>`;
    return;
  }

  // The builder leads, because it is the thing this shop does that others do
  // not, and because a configurable product is a poor second to a photograph
  // once a grid has started.
  const custom = items.filter((p) => p.kind === 'custom');
  const rest = items.filter((p) => p.kind !== 'custom');

  $('[data-shelf]').innerHTML = [...custom, ...rest]
    .map((p) => productCard(p, { when: session.state.when, tall: p.kind !== 'box' }))
    .join('');
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-reset]')) return;
  occasion = 'all';
  category = 'all';
  query = '';
  $('[data-search]').value = '';
  sync();
});

paintFilters();
paintGrid();
