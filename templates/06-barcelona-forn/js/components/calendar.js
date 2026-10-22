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

/** "6 de gener" — Catalan dates take "de" before the month. */
export function dayMonth(d, locale = 'ca-ES') {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(d);
}

/**
 * How far off something is, in words.
 *
 * Days rather than a date, because "d'aquí a 9 dies" is the thing a customer
 * is actually working out, and a date makes them do the arithmetic. Past
 * about a month the number stops meaning anything and the date is better.
 */
export function inDays(days, locale = 'ca-ES') {
  if (days <= 0) return 'ara mateix';
  if (days === 1) return 'demà';
  if (days <= 30) return `d'aquí a ${days} dies`;
  return null;
}

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
    <article class="tile-card${occasion ? ' tile-card--occasion' : ''}">
      <div class="tile-card__body">
        ${occasion ? `<p class="tile-card__day label">${esc(occasion.day)}</p>` : ''}
        <h3 class="tile-card__name t-3">
          <a href="producte.html?id=${encodeURIComponent(product.id)}">${esc(product.name)}</a>
        </h3>
        ${product.subtitle ? `<p class="tile-card__sub sm">${esc(product.subtitle)}</p>` : ''}
      </div>
      <p class="tile-card__price money">${esc(money(price, merchant))}</p>
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

  const everyday = catalogue.products.filter((p) => p.kind === 'everyday');

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
      ${seasonal.length ? '<p class="label dim shelf__label">I cada matí</p>' : ''}
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
      const when = inDays(o.days, merchant.locale);
      return `
        <li class="coming__item">
          <p class="coming__day label">${esc(o.entry.day)}</p>
          <h3 class="coming__name t-2">${esc(product ? product.name : o.entry.day)}</h3>
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
 * The sentence a product page needs when it is out of season.
 *
 * This is the template's one genuinely useful trick, and it only works if it
 * answers the real question. "Esgotat" is not true — nothing sold out, it is
 * simply March. So it says when it comes back.
 */
export function seasonLine(entry, { merchant, today = new Date() }) {
  const next = nextFor(entry, today);
  if (!next) return null;
  if (next.status === 'on') return { state: 'on', text: 'Ara al taulell.' };

  const when = inDays(next.days, merchant.locale);
  const date = dayMonth(next.on, merchant.locale);
  return {
    state: 'coming',
    iso: isoDate(next.on),
    text: when
      ? `Es fa per ${entry.day}. Torna el ${date}, ${when}.`
      : `Es fa per ${entry.day}, el ${date}.`,
  };
}

void session;
