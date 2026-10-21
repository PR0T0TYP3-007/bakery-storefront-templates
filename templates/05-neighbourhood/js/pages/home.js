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
  imgSrc,
} from '../components/board.js';
import { renderTicket, bindTicket, mountMobileTicket } from '../components/ticket.js';
import { toast } from '../components/toast.js';
import { dayWord, date as fmtDate, whenPhrase, dayWordMid, weekdayName } from '../../../../shared/core/format.js';
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
    boardHead(when) +
    (everyday.length
      ? everyday.map((p) => renderRow(p, { when })).join('')
      : `<p class="board__empty">Nothing on the board for that day.</p>`);

  // The note under the board has to match what the column above it means.
  $('[data-board-foot]').textContent = isToday
    ? "What's left is what's on the shelf right now, and it goes down through the day."
    : "We haven't baked these yet. Everything here is made fresh that morning.";
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

  paintShopfront(voice.shopfront);
  paintMorning(voice.morning);
  paintOpenToday();
}

/**
 * Today's hours, under the lede.
 *
 * Read off `merchant.hours` rather than written into the markup — a shop
 * that is shut on Mondays should say so on a Monday, and a second merchant
 * keeping different hours should not need this sentence edited. The cutoff
 * is appended only where the merchant actually has one.
 */
function paintOpenToday() {
  const el = $('[data-open-today]');
  if (!el) return;

  const { merchant } = session.state;
  const name = weekdayName(today());
  const row = (merchant.hours ?? []).find((h) => h.day === name);

  if (!row || !row.open) {
    /* Closed today. The next day it opens is more use than the fact that it
       is shut, so say both. */
    const order = (merchant.hours ?? []).map((h) => h.day);
    const from = order.indexOf(name);
    const next =
      order.slice(from + 1).concat(order.slice(0, from + 1))
        .map((d) => (merchant.hours ?? []).find((h) => h.day === d))
        .find((h) => h && h.open);
    el.textContent = next
      ? `Closed today · open ${next.day} from ${next.open}`
      : 'Closed today';
    return;
  }

  const cutoff = merchant.cutoffHour;
  el.textContent =
    `Open today ${row.open}–${row.close}` +
    (cutoff ? ` · order by ${cutoff} for today` : '');
}

const escape = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

/**
 * The photograph beside the headline.
 *
 * Hidden in the markup and shown only once a merchant has actually supplied
 * one. A shop with no photograph gets the masthead it had before — words on
 * the wall — rather than an empty frame with a caption under it, which is
 * what a hardcoded figure would have given them.
 */
function paintShopfront(shot) {
  const el = $('[data-shopfront]');
  if (!el || !shot?.image) return;

  el.innerHTML = `
    <img src="${escape(imgSrc(shot.image, 800))}"
         srcset="${escape(imgSrc(shot.image, 800))} 800w, ${escape(imgSrc(shot.image, 1600))} 1600w"
         sizes="(min-width: 60rem) 38vw, 92vw"
         alt="${escape(shot.alt)}"
         width="800" height="1200" fetchpriority="high" decoding="async">
    ${shot.caption ? `<figcaption class="pinned__cap">${escape(shot.caption)}</figcaption>` : ''}`;
  el.hidden = false;
}

/**
 * The morning, in three photographs.
 *
 * An ordered list, because the whole point is that these happen in sequence
 * and before the shop opens — a reader who gets this page as a list of
 * headings should still get them in order and should still know it is an
 * order. The times are the list markers, so they are set as real content
 * rather than as generated counters.
 */
function paintMorning(steps) {
  const el = $('[data-morning]');
  if (!el) return;
  if (!Array.isArray(steps) || !steps.length) {
    el.closest('section')?.remove();
    return;
  }

  el.innerHTML = steps
    .map(
      (s) => `
      <li class="morning__step">
        <figure class="pinned">
          <img src="${escape(imgSrc(s.image, 800))}"
               srcset="${escape(imgSrc(s.image, 320))} 240w, ${escape(imgSrc(s.image, 800))} 800w"
               sizes="(min-width: 52rem) 30vw, 88vw"
               alt="${escape(s.alt)}"
               width="800" height="600" loading="lazy" decoding="async">
          <figcaption class="pinned__cap">
            <span class="morning__at">${escape(s.at)}</span>
            <span>${escape(s.what)}</span>
          </figcaption>
        </figure>
      </li>`
    )
    .join('');

  /* The last time in the list is the moment the doors open, so the section's
     own note is read off the data rather than written twice. */
  const foot = $('[data-morning-foot]');
  if (foot) foot.textContent = `Open from ${steps[steps.length - 1].at}`;
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
