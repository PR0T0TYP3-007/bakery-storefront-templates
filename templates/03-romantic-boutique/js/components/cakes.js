/**
 * @file Cakes — tiles on the range, lines in the basket.
 *
 * One module, because both render the same products and keeping them
 * together is what stops them drifting into two ideas of what a cake looks
 * like. That drift is what made Template 05 v1 read as inconsistent.
 */

import * as session from '../services/session.js';
import { esc, photo, link } from '../pages/_page.js';
import { priceLine } from '../../../../shared/core/pricing.js';
import { money } from '../../../../shared/core/format.js';
import { describeSelections } from '../../../../shared/core/rules.js';
import { soldOnDay } from '../../../../shared/core/rules.js';
import { cardSummary, hasCard } from '../card.js';
import { icons } from './icons.js';

export const priceOf = (product, selections, addons, qty) =>
  priceLine(product, selections, addons, qty, session.state.catalogue);

export const hrefFor = (product) => link(`cake.html?id=${encodeURIComponent(product.id)}`);

/**
 * The cheapest this cake can be, and whether it can be more.
 *
 * The first version showed the price of the *default* configuration and put
 * "from" in front of it when that happened to equal the base — which labelled
 * The Written One at a flat £62 when it starts at £48, and The Pressed Heart
 * at "from £42" when £42 really is its floor. A range page promises a floor;
 * showing a mid-point as if it were one is the brief's "aesthetic decisions
 * that make prices difficult to understand", arrived at by accident.
 *
 * @returns {{low:number, ranged:boolean}}
 */
export function priceFloor(product) {
  const groups = session.groups();
  let low = product.price;
  let high = product.price;

  for (const id of product.options ?? []) {
    const options = groups[id]?.options ?? [];
    if (!options.length) continue;
    const prices = options.map((o) => o.price ?? 0);
    low += Math.min(...prices);
    high += Math.max(...prices);
  }

  return { low, ranged: high > low };
}

/**
 * A cake on the range.
 *
 * The photograph is cut into an arch — the separation method — and the name
 * and price sit under it with nothing drawn around them. The whole tile is
 * clickable: the title's stretched pseudo-element covers it, which is checked
 * with elementFromPoint in the style guide rather than asserted here.
 *
 * @param {object} product
 * @param {{when?:Date, shape?:string, frame?:'arch'|'oval'}} [opts]
 */
export function cakeTile(product, { when, shape = 'aperture--tall', frame = 'arch' } = {}) {
  const { low, ranged } = priceFloor(product);
  const seasonal = when ? !soldOnDay(product, when) : false;

  return `
    <article class="cake">
      <a class="cake__link" href="${hrefFor(product)}" tabindex="-1" aria-hidden="true"></a>
      <div class="aperture aperture--${frame} ${shape}">
        ${
          product.image
            ? `<img src="${photo(product.image, 'md')}"
                 srcset="${photo(product.image, 'sm')} 240w, ${photo(product.image, 'md')} 800w, ${photo(product.image, 'lg')} 1600w"
                 sizes="(min-width: 60rem) 28vw, 86vw"
                 alt="${esc(product.name)}" loading="lazy" decoding="async" width="800" height="1066">`
            : `<span class="aperture--empty">${esc(product.name.slice(0, 1))}</span>`
        }
      </div>
      <h3 class="cake__name t-3"><a href="${hrefFor(product)}">${esc(product.name)}</a></h3>
      <p class="cake__sub sm dim">${esc(product.subtitle)}</p>
      <p class="cake__price num">${ranged ? 'from ' : ''}${money(low)}</p>
      ${seasonal ? '<p class="state" data-state="out">Not this time of year</p>' : ''}
      ${
        product.inscribable
          ? ''
          : '<p class="state" data-state="note">Nothing written on this one</p>'
      }
    </article>`;
}

/** Placeholders shaped like the tiles, so the grid does not jump. */
export const tileSkeletons = (n = 3) =>
  Array.from(
    { length: n },
    () => `
      <article class="cake" aria-hidden="true">
        <div class="aperture aperture--arch aperture--tall"><span class="skel" style="position:absolute;inset:0"></span></div>
        <div class="skel" style="height:1.3em;width:60%;margin-top:var(--s-3)"></div>
        <div class="skel" style="height:0.9em;width:85%;margin-top:var(--s-2)"></div>
      </article>`
  ).join('');

/* --------------------------------------------------------------------------
   Basket lines
   -------------------------------------------------------------------------- */

/**
 * One line in the basket, or on the receipt when `editable` is false.
 *
 * The card is shown here, not just mentioned. A basket that said "card
 * added" would put the customer back where the market already has them:
 * trusting that the words they cannot see are the words they wrote.
 */
export function basketLine(line, { editable = true } = {}) {
  const product = session.product(line.productId);
  if (!product) return '';

  const price = priceOf(product, line.selections, line.addons, line.qty);

  const extras = (line.addons ?? [])
    .map((id) => session.state.catalogue.addons.find((a) => a.id === id)?.label)
    .filter(Boolean);

  const spec = [describeSelections(product, line.selections, session.groups()), ...extras]
    .filter(Boolean)
    .join(' · ');

  const card = line.meta?.card ?? null;

  return `
    <article class="line" data-line="${esc(line.id)}">
      <div class="aperture aperture--oval line__thumb">
        ${
          product.image
            ? `<img src="${photo(product.image, 'sm')}" alt="" loading="lazy" decoding="async" width="200" height="200">`
            : `<span class="aperture--empty">${esc(product.name.slice(0, 1))}</span>`
        }
      </div>
      <div>
        <h3 class="line__name t-3">${esc(product.name)}</h3>
        ${spec ? `<p class="line__spec sm dim">${esc(spec)}</p>` : ''}
        ${
          line.inscription
            ? `<p class="line__spec sm">Piped on the cake: &ldquo;${esc(line.inscription)}&rdquo;</p>`
            : ''
        }
        ${
          hasCard(card)
            ? `<p class="line__card sm">${icons.card}<span>${esc(cardSummary(card))}</span></p>`
            : editable
              ? `<p class="line__card sm dimmer">${icons.card}<span>No card ·
                   <a href="${link(`card.html?line=${encodeURIComponent(line.id)}`)}">write one</a></span></p>`
              : ''
        }
        <div class="line__foot">
          ${
            editable
              ? `<div class="step" role="group" aria-label="How many ${esc(product.name)}">
                   <button type="button" data-less aria-label="One fewer" ${line.qty <= 1 ? 'disabled' : ''}>${icons.minus}</button>
                   <output class="num">${line.qty}</output>
                   <button type="button" data-more aria-label="One more">${icons.plus}</button>
                 </div>
                 <a class="btn btn--sm btn--bare" href="${link(`card.html?line=${encodeURIComponent(line.id)}`)}">${
                   hasCard(card) ? 'Change the card' : 'Write a card'
                 }</a>
                 <button class="linkish" type="button" data-remove>Remove</button>`
              : `<p class="sm dim">${line.qty} × ${money(price.unit + price.addons)}</p>`
          }
          <p class="line__price num">${money(price.total)}</p>
        </div>
      </div>
    </article>`;
}

/** Delegated wiring for a container of basket lines. */
export function bindBasketLines(root, onChange) {
  root.addEventListener('click', (e) => {
    const row = e.target.closest('[data-line]');
    if (!row) return;
    const id = row.dataset.line;
    const line = session.state.cart.lines.find((l) => l.id === id);
    if (!line) return;

    if (e.target.closest('[data-more]')) session.setQty(id, line.qty + 1);
    else if (e.target.closest('[data-less]')) session.setQty(id, line.qty - 1);
    else if (e.target.closest('[data-remove]')) session.remove(id);
    else return;

    onChange?.();
  });
}
