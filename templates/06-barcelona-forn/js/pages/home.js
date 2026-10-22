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
  set('[data-motto]', voice.motto);
}

/* The pictures are in the markup so they start downloading with the page;
   only their alt text comes from config, because the words are the
   merchant's and an empty alt on a photograph of their shop is a shrug. */
const shopfront = $('[data-shopfront]');
if (shopfront && voice?.shopfront?.alt) shopfront.alt = voice.shopfront.alt;

const shopImg = $('[data-shop-img]');
if (shopImg && voice?.shop?.alt) shopImg.alt = voice.shop.alt;

/* -------------------------------------------------------------------------
   Today's date
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
   The card: what you can drink, and what it costs
   ------------------------------------------------------------------------- */
const drinks = catalogue.products.filter((p) => p.category === 'begudes');
const drinkEl = $('[data-drinks]');

if (drinkEl && drinks.length) {
  const money = new Intl.NumberFormat(merchant.locale, {
    style: 'currency',
    currency: merchant.currency,
    minimumFractionDigits: 2,
  });

  drinkEl.innerHTML = drinks
    .map(
      (p) => `
        <div class="card__row">
          <dt class="card__name">
            <a href="product.html?id=${encodeURIComponent(p.id)}" lang="ca">${esc(p.name)}</a>
            <span class="card__sub sm">${esc(p.subtitle)}</span>
          </dt>
          <dd class="card__price money">${esc(money.format(p.price))}</dd>
        </div>`
    )
    .join('');
} else if (drinkEl) {
  /* A forn with no drinks in its catalogue should not show an empty card. */
  $('#drink')?.remove();
}

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
