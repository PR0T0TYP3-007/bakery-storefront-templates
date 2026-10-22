/**
 * @file Rendering the year — the shelf, and what is coming.
 *
 * `js/year.js` decides *when*; this decides *how it looks*. Keeping the two
 * apart is why the dates could be tested without a browser.
 */

import * as session from '../services/session.js';
import { onNow, coming, nextFor } from '../year.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

/** `2026-04-06`, for a `<time datetime>`. */
export const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "6 January". The locale decides the order, so this never has to. */
export function dayMonth(d, locale = 'en-GB') {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(d);
}

/**
 * How far off something is, in words.
 *
 * Days rather than a date, because "in 9 days" is the thing a customer is
 * actually working out and a date makes them do the arithmetic themselves.
 * Past about a month the number stops meaning anything, so this returns
 * null and the caller shows the date on its own.
 */
export function inDays(days) {
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days <= 30) return `in ${days} days`;
  return null;
}

/**
 * The picture for a thing, or the floor where there is no honest picture.
 *
 * Six of the seventeen things this forn makes have a photograph. The other
 * eleven are the calendar items — a tortell de Reis, a mona, panellets,
 * neules, the cocas, a xuixo — and no honest stock photograph of any of
 * them exists. Unsplash returns Mallorcan beaches for "ensaimada" and a
 * generic ring cake for "tortell", and captioning a generic ring cake
 * "Tortell de Reis" is exactly what D16 bans: the photography may not lie
 * about the product.
 *
 * So the ones without a photograph get the tiled floor instead. It is the
 * same pattern as the hero, it costs no request, and it is not pretending
 * to be anything — which a stand-in photograph of somebody else's cake
 * would be.
 */
export function picture(product, { eager = false, size = 'md' } = {}) {
  const img = product.image;

  /* No empty box where the photograph would be. A patterned rectangle in a
     grid of photographs reads as an image that failed to load, however
     carefully it is drawn — the first two goes at this proved it. The tile
     gets the tiling as its own surface instead, through
     `.tile-card--notshot`, and the words sit on it. */
  if (!img) return '';

  return `
    <img class="shot" src="assets/img/${esc(img.src)}-${esc(size)}.jpg"
         alt="${esc(img.alt)}"
         ${eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}>`;
}

/** The class that says which of the two a tile is. */
export const shotClass = (product) =>
  product.image ? 'tile-card--shot' : 'tile-card--notshot';

const money = (n, merchant) =>
  new Intl.NumberFormat(merchant.locale, {
    style: 'currency',
    currency: merchant.currency,
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);

/**
 * One thing on the shelf.
 *
 * A tile. Square-edged, no border, no shadow — it sits against its
 * neighbours and the join is the division.
 */
export function shelfTile(product, { merchant, occasion = null } = {}) {
  const price = product.price;
  return `
    <article class="tile-card ${shotClass(product)}${occasion ? ' tile-card--occasion' : ''}">
      ${picture(product)}
      <div class="tile-card__body">
        ${occasion ? `<p class="tile-card__day label">${esc(occasion.day)}</p>` : ''}
        <h3 class="tile-card__name t-3" lang="ca">
          <a href="product.html?id=${encodeURIComponent(product.id)}">${esc(product.name)}</a>
        </h3>
        ${product.subtitle ? `<p class="tile-card__sub sm">${esc(product.subtitle)}</p>` : ''}
      </div>
      <p class="tile-card__price money">${
        product.options?.length ? '<span class="tile-card__from sm">from </span>' : ''
      }${esc(money(price, merchant))}</p>
    </article>`;
}

/**
 * The shelf: what the calendar has opened, then what is made every morning.
 *
 * Calendar items lead. On the day before Sant Joan the coca is the reason
 * anybody is on the page, and burying it under the daily croissants would
 * be the wrong order.
 */
export function renderShelf(el, { merchant, catalogue, today = new Date() }) {
  if (!el) return;

  const byId = new Map(catalogue.products.map((p) => [p.id, p]));
  const open = onNow(merchant.year ?? [], today);

  const seasonal = open
    .map((o) => ({ product: byId.get(o.entry.productId), occasion: o.entry }))
    .filter((x) => x.product);

  /* Food only. The drinks are `kind: 'everyday'` too — they are made every
     day — but the counter answers "what is baked today", and a coffee is not
     an answer to that. They have their own card further down the page, and
     listing them in both places made the counter look like a menu. */
  const everyday = catalogue.products.filter(
    (p) => p.kind === 'everyday' && p.category !== 'begudes'
  );

  el.innerHTML = `
    ${
      seasonal.length
        ? `<div class="shelf__group">
             <div class="tiles tiles--fit">
               ${seasonal.map((x) => shelfTile(x.product, { merchant, occasion: x.occasion })).join('')}
             </div>
           </div>`
        : ''
    }
    <div class="shelf__group">
      ${seasonal.length ? '<p class="label dim shelf__label">And every morning</p>' : ''}
      <div class="tiles">
        ${everyday.map((p) => shelfTile(p, { merchant })).join('')}
      </div>
    </div>`;

  return seasonal.length;
}

/**
 * What is coming.
 *
 * Each entry says the day it is for, the date, and how far off — and
 * nothing else. The temptation is to explain each festival here; the
 * explanation belongs on the product, and a list that explains itself nine
 * times is a list nobody reads.
 */
export function renderComing(el, { merchant, catalogue, today = new Date(), limit = 3 }) {
  if (!el) return;

  const byId = new Map(catalogue.products.map((p) => [p.id, p]));
  const next = coming(merchant.year ?? [], today, limit);

  if (!next.length) {
    el.innerHTML = '';
    return 0;
  }

  el.innerHTML = next
    .map((o) => {
      const product = byId.get(o.entry.productId);
      const when = inDays(o.days);
      return `
        <li class="coming__item">
          <p class="coming__day label" lang="ca">${esc(o.entry.day)}</p>
          <h3 class="coming__name t-2" lang="ca">${esc(product ? product.name : o.entry.day)}</h3>
          <p class="coming__when sm">
            <time datetime="${esc(isoDate(o.on))}">${esc(dayMonth(o.on, merchant.locale))}</time>${
              when ? ` · ${esc(when)}` : ''
            }
          </p>
          ${o.entry.note ? `<p class="coming__note sm dim">${esc(o.entry.note)}</p>` : ''}
        </li>`;
    })
    .join('');

  return next.length;
}

/**
 * The year entry that governs a product, if one does.
 *
 * The join is `productId` on the merchant's year, not a flag on the product,
 * because the same cake could be a calendar item at one forn and an everyday
 * one at another. The calendar belongs to the shop.
 */
export function entryFor(merchant, productId) {
  return (merchant.year ?? []).find((e) => e.productId === productId) ?? null;
}

/**
 * One thing in the shop, with its place in the year on it.
 *
 * The state line is the point. A shop that hid what it cannot sell today
 * would be every other shop, and it would throw away the only thing this
 * template knows: that a tortell in March is not sold out, it is simply
 * March, and it comes back on the sixth of January.
 */
export function shopTile(product, { merchant, today = new Date() } = {}) {
  const entry = entryFor(merchant, product.id);
  const season = entry ? seasonLine(entry, { merchant, today }) : null;

  return `
    <article class="tile-card ${shotClass(product)}${season ? ` is-${season.state}` : ''}">
      ${picture(product)}
      <div class="tile-card__body">
        ${
          season
            ? `<p class="state state--${season.state}">
                 <span class="state__dot" aria-hidden="true"></span>
                 ${season.state === 'on' ? 'On the counter now' : `<span lang="ca">${esc(entry.day)}</span>`}
               </p>`
            : ''
        }
        <h3 class="tile-card__name t-3" lang="ca">
          <a href="product.html?id=${encodeURIComponent(product.id)}">${esc(product.name)}</a>
        </h3>
        ${product.subtitle ? `<p class="tile-card__sub sm">${esc(product.subtitle)}</p>` : ''}
        ${
          season && season.state === 'coming'
            ? `<p class="tile-card__when sm">${esc(season.text)}</p>`
            : ''
        }
      </div>
      <p class="tile-card__price money">${
        product.options?.length ? '<span class="tile-card__from sm">from </span>' : ''
      }${esc(money(product.price, merchant))}</p>
    </article>`;
}

/**
 * The sentence a product page needs when it is out of season.
 *
 * This is the template's one genuinely useful trick, and it only works if it
 * answers the real question. "Sold out" is not true — nothing sold out, it
 * is simply March. So it says when the thing comes back.
 *
 * The feast day keeps its Catalan name, because that is its name.
 */
export function seasonLine(entry, { merchant, today = new Date() }) {
  const next = nextFor(entry, today);
  if (!next) return null;
  if (next.status === 'on') return { state: 'on', text: 'On the counter now.' };

  const when = inDays(next.days);
  const date = dayMonth(next.on, merchant.locale);
  return {
    state: 'coming',
    iso: isoDate(next.on),
    day: entry.day,
    text: when
      ? `Made for ${entry.day}. Back on ${date}, ${when}.`
      : `Made for ${entry.day}, on ${date}.`,
  };
}

void session;
