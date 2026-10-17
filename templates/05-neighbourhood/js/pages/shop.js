/**
 * @file Shop — the full board, with category filters and search.
 */

import { startPage, $, esc } from './_page.js';
import * as session from '../services/session.js';
import { search } from '../services/api.js';
import {
  renderRow,
  renderTile,
  boardHead,
  skeletonRows,
  bindAdd,
  qsFirst,
} from '../components/board.js';
import { renderTicket, bindTicket } from '../components/ticket.js';
import { toast } from '../components/toast.js';
import { dayWord, date as fmtDate, whenPhrase } from '../core/format.js';
import { shelf } from '../core/fulfilment.js';
import { icons } from '../components/icons.js';

const boardEl = $('[data-board]');
boardEl.innerHTML = boardHead() + skeletonRows(8);

await startPage({ nav: 'Shop' });

const params = new URLSearchParams(location.search);
let category = params.get('cat') || 'all';
let query = params.get('q') || '';

$('[data-home-link]').href = `index.html${qsFirst()}`;
if (query) $('[data-search]').value = query;

/* -------------------------------------------------------------------------
   Filters
   ------------------------------------------------------------------------- */
function paintTabs() {
  const { catalogue } = session.state;
  const all = [{ id: 'all', label: 'Everything' }, ...catalogue.categories];

  $('[data-tabs]').innerHTML = all
    .map((c) => {
      const n =
        c.id === 'all'
          ? catalogue.products.length
          : catalogue.products.filter((p) => p.category === c.id).length;
      return `<button class="chip" type="button" data-cat="${c.id}" aria-pressed="${c.id === category}">
        ${esc(c.label)} <span class="chip__count">${n}</span>
      </button>`;
    })
    .join('');
}

$('[data-tabs]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-cat]');
  if (!btn) return;
  category = btn.dataset.cat;
  syncUrl();
  paintTabs();
  paintBoard();
});

$('[data-searchform]').addEventListener('submit', (e) => e.preventDefault());

$('[data-search]').addEventListener('input', (e) => {
  query = e.target.value.trim();
  syncUrl();
  paintBoard();
});

function syncUrl() {
  const url = new URL(location.href);
  category === 'all' ? url.searchParams.delete('cat') : url.searchParams.set('cat', category);
  query ? url.searchParams.set('q', query) : url.searchParams.delete('q');
  history.replaceState({}, '', url);
}

/* -------------------------------------------------------------------------
   The board
   ------------------------------------------------------------------------- */
function paintBoard() {
  const { merchant, catalogue } = session.state;
  const when = session.state.when;

  $('[data-when-label]').textContent = `${dayWord(when)}, ${fmtDate(when, {
    day: 'numeric',
    month: 'long',
  })}`;

  let items = catalogue.products;
  if (category !== 'all') items = items.filter((p) => p.category === category);
  if (query) items = search(items, query);

  // Sold-out items sink but are never hidden: someone who wanted a sourdough
  // should be told it has gone, not shown an empty shelf.
  const rows = items.filter((p) => p.kind !== 'cake');
  const cakes = items.filter((p) => p.kind === 'cake');

  const sorted = rows.slice().sort((a, b) => {
    const aOut = shelf(merchant, a, when).state === 'out';
    const bOut = shelf(merchant, b, when).state === 'out';
    return aOut === bOut ? 0 : aOut ? 1 : -1;
  });

  const count = items.length;
  $('[data-count]').textContent = `${count} ${count === 1 ? 'item' : 'items'}`;

  if (!count) {
    boardEl.innerHTML = `
      <div class="board__empty">
        <p class="t-3">Nothing matches that</p>
        <p class="sm" style="margin-top:var(--s-2)">Try a different word, or look at everything.</p>
        <p style="margin-top:var(--s-4)">
          <button class="btn btn--quiet" type="button" data-reset>Show everything</button>
        </p>
      </div>`;
    $('[data-note]').innerHTML = '';
    return;
  }

  boardEl.innerHTML =
    boardHead() +
    sorted.map((p) => renderRow(p, { when })).join('') +
    (cakes.length
      ? `<div class="section--tight">
           <h2 class="label" style="margin-bottom:var(--s-3)">Made to order</h2>
           <div class="tiles">${cakes.map((p) => renderTile(p, { when })).join('')}</div>
         </div>`
      : '');

  const soldOut = sorted.filter((p) => shelf(merchant, p, when).state === 'out').length;
  $('[data-note]').innerHTML = soldOut
    ? `<p class="note note--warn" style="margin-bottom:var(--s-4)">${icons.alert}
         <span><strong>${soldOut} ${soldOut === 1 ? 'item has' : 'items have'} sold out for
         ${esc(dayWord(when).toLowerCase())}.</strong> Pick a later day at the top of the page
         and they come back.</span></p>`
    : '';
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-reset]')) return;
  category = 'all';
  query = '';
  $('[data-search]').value = '';
  syncUrl();
  paintTabs();
  paintBoard();
});

/* -------------------------------------------------------------------------
   Ticket + wiring
   ------------------------------------------------------------------------- */
const ticketEl = $('[data-ticket]');
bindTicket(ticketEl);

bindAdd(document, (product, movedTo) => {
  toast({
    title: `${product.name} added`,
    detail: movedTo
      ? `Needs more notice — set for ${whenPhrase(movedTo)}.`
      : `Collect ${dayWord(session.state.when).toLowerCase()}.`,
  });
});

session.on('cart:change', () => renderTicket(ticketEl));
session.on('when:change', paintBoard);

paintTabs();
paintBoard();
renderTicket(ticketEl);
