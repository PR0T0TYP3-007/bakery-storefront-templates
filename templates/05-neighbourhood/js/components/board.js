/**
 * @file The Board — ruled rows, and photo-led tiles for made-to-order cakes.
 *
 * The split is deliberate: you buy a loaf from memory and a celebration cake
 * with your eyes. One uniform card for both is what made the previous
 * version read as a generic storefront.
 */

import { icons } from './icons.js';
import { money, dayWord } from '../core/format.js';
import { shelf, earliestFor } from '../core/fulfilment.js';
import * as session from '../services/session.js';

/** Photography lives in the shared store at three widths. */
export function imgSrc(id, width = 800) {
  if (!id) return null;
  const bucket = width <= 320 ? 'sm' : width <= 900 ? 'md' : 'lg';
  return `../../shared/img/${id}-${bucket}.jpg`;
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

/**
 * A designed fallback for a merchant with no photograph for an item.
 * The row still works; only a photo tile would have looked broken.
 */
function thumb(product) {
  const src = imgSrc(product.image, 240);
  if (!src) {
    return `<span class="monogram" aria-hidden="true">${esc(product.name.trim()[0] ?? '·')}</span>`;
  }
  return `<img src="${src}" alt="" loading="lazy" decoding="async" width="64" height="64">`;
}

/**
 * One board row.
 * @param {object} product
 * @param {{when:Date}} opts
 */
export function renderRow(product, { when }) {
  const { merchant } = session.state;
  const s = shelf(merchant, product, when);
  const lead = session.leadFor(product);
  const soldOut = s.state === 'out';
  const isMade = s.mode === 'made';

  const meta = isMade
    ? `from ${dayWord(earliestFor(merchant, lead))}`
    : esc(product.subtitle);

  const action = isMade
    ? `<a class="btn btn--sm btn--quiet" href="product.html?id=${product.id}${qs()}">Choose</a>`
    : soldOut
      ? `<button class="btn btn--sm btn--quiet" type="button" disabled>Sold out</button>`
      : `<button class="btn btn--sm" type="button" data-add="${product.id}"
           aria-label="Add ${esc(product.name)} to basket">${icons.plus}<span class="vh">Add</span></button>`;

  return `
    <article class="row" data-available="${!soldOut}">
      <span class="row__thumb">${thumb(product)}</span>

      <div class="row__title">
        <h3 class="row__name">
          <a href="product.html?id=${product.id}${qs()}">${esc(product.name)}</a>
        </h3>
        <p class="row__sub">${meta}</p>
      </div>

      <p class="row__meta">
        <span class="status" data-state="${s.state}">${esc(s.short)}</span>
      </p>

      <p class="row__price money">
        ${money(product.price)}
        ${product.options.length ? '<small>from</small>' : ''}
      </p>

      <span class="row__add">${action}</span>
    </article>
  `;
}

/** A photo-led tile — only for made-to-order cakes. */
export function renderTile(product, { when }) {
  const { merchant } = session.state;
  const lead = session.leadFor(product);
  const src = imgSrc(product.image, 800);

  return `
    <article class="tile">
      <div class="tile__media">
        ${
          src
            ? `<img src="${src}" alt="${esc(product.name)} — ${esc(product.subtitle)}" loading="lazy" decoding="async" width="800" height="640">`
            : `<span class="monogram" style="font-size:3rem">${esc(product.name.trim()[0])}</span>`
        }
      </div>
      <div class="tile__body">
        <h3 class="tile__name">
          <a href="product.html?id=${product.id}${qs()}">${esc(product.name)}</a>
        </h3>
        <p class="sm">${esc(product.subtitle)}</p>
        <p class="status" data-state="made">${lead} ${lead === 1 ? 'day' : 'days'} notice · from ${dayWord(earliestFor(merchant, lead))}</p>
        <div class="tile__foot">
          <p class="tile__price money">${money(product.price)} <small>from</small></p>
          <span class="link">Choose</span>
        </div>
      </div>
    </article>
  `;
}

/** Column headings — what makes the board read as a board. */
export function boardHead() {
  return `
    <div class="board__head" aria-hidden="true">
      <span></span>
      <span class="label">Item</span>
      <span class="label">Today</span>
      <span class="label">Price</span>
      <span></span>
    </div>
  `;
}

/** Skeleton rows that reserve the exact final height, so nothing shifts. */
export function skeletonRows(n = 5) {
  return Array.from({ length: n })
    .map(
      () => `
      <article class="row row--skeleton" aria-hidden="true">
        <span class="row__thumb"><span class="skel skel--thumb"></span></span>
        <span class="row__name"><span class="skel skel--name"></span></span>
        <span class="row__meta"><span class="skel skel--meta"></span></span>
        <span class="row__price"><span class="skel" style="width:3rem"></span></span>
        <span class="row__add"></span>
      </article>`
    )
    .join('');
}

/** Preserve ?merchant= across internal links. */
export function qs() {
  const m = new URLSearchParams(location.search).get('merchant');
  return m ? `&merchant=${m}` : '';
}

/** Same, for links with no existing query string. */
export function qsFirst() {
  const m = new URLSearchParams(location.search).get('merchant');
  return m ? `?merchant=${m}` : '';
}

/**
 * Wires one-tap adding for any board inside `scope`.
 * The express path: the house configuration, the current collection day, and
 * no page change.
 */
export function bindAdd(scope = document, onAdded) {
  scope.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    e.preventDefault();
    const p = session.product(btn.dataset.add);
    if (!p) return;
    const { movedTo } = session.add({ productId: p.id, selections: { ...p.defaults } });
    onAdded?.(p, movedTo);
  });
}
