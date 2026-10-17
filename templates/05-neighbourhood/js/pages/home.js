/**
 * @file Home — the Counter.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter } from '../components/chrome.js';
import {
  renderRow,
  renderTile,
  boardHead,
  skeletonRows,
  bindAdd,
} from '../components/board.js';
import { renderTicket, bindTicket, mountMobileTicket } from '../components/ticket.js';
import { toast } from '../components/toast.js';
import { dayWord, date as fmtDate, whenPhrase, dayWordMid } from '../../../../shared/core/format.js';
import { today, sameDay, dateKey } from '../../../../shared/core/dates.js';
import { shelf } from '../../../../shared/core/fulfilment.js';

const $ = (s) => document.querySelector(s);

/* Skeleton first, so the row heights are reserved before data lands. */
const boardEl = $('[data-board]');
boardEl.innerHTML = boardHead() + skeletonRows(6);

await session.boot();

renderHeader('Shop');
renderFooter();
mountMobileTicket();

// The homepage title describes the shop, so it has to come from the merchant.
// chrome.js only swaps the name in front of the dash, which left Corner Crumb
// advertising Hazel & Rye's bread. Trimmed at the first sentence, because a
// tagline may be two and a title should not be.
document.title = `${session.state.merchant.name} — ${session.state.merchant.tagline.split('.')[0]}`;

/* -------------------------------------------------------------------------
   The board
   ------------------------------------------------------------------------- */
function paintBoard() {
  const { merchant, catalogue } = session.state;
  const when = session.state.when;
  const isToday = sameDay(when, today());

  $('[data-board-day]').textContent = `${dayWord(when)}, ${fmtDate(when, {
    day: 'numeric',
    month: 'long',
  })}`;

  const everyday = catalogue.products.filter((p) => p.kind === 'everyday');

  boardEl.innerHTML =
    boardHead() +
    (everyday.length
      ? everyday.map((p) => renderRow(p, { when })).join('')
      : `<p class="board__empty">Nothing on the board for that day.</p>`);

  // The heading must match what the numbers underneath actually mean.
  $('[data-board-foot]').textContent = isToday
    ? 'Counts are what is on the shelf right now, and fall through the day as things sell.'
    : "We haven't baked this yet — these are the batch sizes we plan for.";
}

/* -------------------------------------------------------------------------
   Cakes — only if this merchant makes them
   ------------------------------------------------------------------------- */
function paintCakes() {
  const { merchant, catalogue } = session.state;
  const cakes = catalogue.products.filter((p) => p.kind === 'cake');

  if (!merchant.capabilities.customCakes || !cakes.length) {
    $('[data-cakes-section]').hidden = true;
    return;
  }
  $('[data-cakes-section]').hidden = false;
  $('[data-cakes]').innerHTML = cakes
    .map((p) => renderTile(p, { when: session.state.when }))
    .join('');
}

/* -------------------------------------------------------------------------
   Merchant voice + capability-driven copy
   The masthead is written in the HTML for the default merchant, so it is
   meaningful before JS runs, then replaced for any other one.
   ------------------------------------------------------------------------- */
function paintVoice() {
  const { voice } = session.state.merchant;
  if (!voice) return;
  const set = (sel, text) => {
    const el = $(sel);
    if (el && text) el.textContent = text;
  };
  set('[data-kicker]', voice.kicker);
  set('[data-headline]', voice.headline);
  set('[data-lede]', voice.lede);
}

function paintCapabilities() {
  const { merchant } = session.state;
  const copy = $('[data-delivery-copy]');
  if (!copy) return;
  copy.textContent = merchant.capabilities.delivery
    ? merchant.delivery.note
    : `Collection only, from ${merchant.locations.map((l) => l.name).join(' and ')}. We'd rather hand it to you over the counter.`;
  copy.previousElementSibling.textContent = merchant.capabilities.delivery
    ? '4 — Or we’ll bike it'
    : '4 — Collection only';
}

/* -------------------------------------------------------------------------
   Your usual — read from this device, not a profile anyone else holds
   ------------------------------------------------------------------------- */
function paintUsual() {
  const el = $('[data-usual]');
  const last = session.state.store.read('lastOrder', null);
  const lines = (last?.lines ?? [])
    .map((l) => ({ ...l, product: session.product(l.productId) }))
    .filter((l) => l.product);

  if (!lines.length) {
    el.hidden = true;
    return;
  }

  el.hidden = false;
  $('[data-usual-detail]').textContent = lines
    .map((l) => `${l.qty > 1 ? `${l.qty} × ` : ''}${l.product.name}`)
    .join(', ');

  $('[data-usual-add]').onclick = () => {
    let n = 0;
    for (const l of lines) {
      session.add({ productId: l.productId, selections: l.selections, qty: l.qty });
      n += l.qty;
    }
    toast({ title: `${n} item${n === 1 ? '' : 's'} added`, detail: 'Same as last time.' });
  };
}

/* -------------------------------------------------------------------------
   Ticket
   ------------------------------------------------------------------------- */
const ticketEl = $('[data-ticket]');
bindTicket(ticketEl);

function paintTicket() {
  renderTicket(ticketEl);
}

/* -------------------------------------------------------------------------
   Wiring
   ------------------------------------------------------------------------- */
bindAdd(document, (product, movedTo) => {
  toast({
    title: `${product.name} added`,
    detail: movedTo
      ? `Needs more notice — set for ${whenPhrase(movedTo)}.`
      : `Collect ${dayWordMid(session.state.when)}.`,
  });
});

session.on('cart:change', paintTicket);
session.on('when:change', () => {
  paintBoard();
  paintCakes();
});

paintVoice();
paintBoard();
paintCakes();
paintCapabilities();
paintUsual();
paintTicket();
