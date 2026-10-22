/**
 * @file Home.
 *
 * Two questions, in this order: what is on the taulell now, and what is
 * coming. A forn organised by the calendar answers those before it says
 * anything about itself, which is why the shop note is at the bottom.
 *
 * Everything on the page comes from merchant config. Nothing here names a
 * product, a festival or a date — `js/year.js` resolves the year and
 * `components/calendar.js` draws it, so a second forn with a different
 * calendar needs no code.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter } from '../components/chrome.js';
import { renderShelf, renderComing, esc } from '../components/calendar.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader('home');
renderFooter();

const { merchant, catalogue } = session.state;
const today = new Date();

/* The title describes the shop, so it comes from the merchant. chrome.js
   only swaps the name before the dash, which on Template 05 left one bakery
   advertising another's bread. */
document.title = `${merchant.name} — ${merchant.tagline.split('.')[0]}`;

/* -------------------------------------------------------------------------
   The claim
   ------------------------------------------------------------------------- */
const { voice } = merchant;
if (voice) {
  const set = (sel, text) => {
    const el = $(sel);
    if (el && text) el.textContent = text;
  };
  set('[data-kicker]', voice.kicker);
  set('[data-headline]', voice.headline);
  set('[data-lede]', voice.lede);
}

/* -------------------------------------------------------------------------
   Today's date, in the shop's own language
   ------------------------------------------------------------------------- */
const dayEl = $('[data-today]');
if (dayEl) {
  dayEl.textContent = new Intl.DateTimeFormat(merchant.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(today);
}

/* -------------------------------------------------------------------------
   The shelf, and what is coming
   ------------------------------------------------------------------------- */
renderShelf($('[data-now]'), { merchant, catalogue, today });

const comingCount = renderComing($('[data-coming]'), { merchant, catalogue, today, limit: 3 });

/* A forn with nothing coming in the next stretch should not show an empty
   heading. The section removes itself rather than standing there blank. */
if (!comingCount) $('#coming')?.remove();

/* -------------------------------------------------------------------------
   The shop note
   ------------------------------------------------------------------------- */
/* Every sentence here is the merchant's, not the template's. The first
   draft had the template inventing "two rooms and four marble tables" out of
   an address, which is exactly the kind of claim D13 bans: nothing in the
   config knew how many rooms there were. */
const shop = voice?.shop;

if (shop) {
  $('[data-shop-head]').textContent = shop.head;
  $('[data-shop-body]').innerHTML = [...shop.body, merchant.allergenStatement]
    .map((para) => `<p>${esc(para)}</p>`)
    .join('');
}
