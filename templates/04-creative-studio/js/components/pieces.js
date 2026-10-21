/**
 * @file Pieces — editions on the index, and lines in the basket.
 *
 * One module, because both render the same products and keeping them
 * together is what stops them drifting into two ideas of what a piece looks
 * like. That drift is what made Template 05 v1 read as inconsistent.
 */

import * as session from '../services/session.js';
import { esc, photo, link } from '../pages/_page.js';
import { priceAnyWith } from '../commission.js';
import { priceLine } from '../../../../shared/core/pricing.js';
import { money } from '../../../../shared/core/format.js';
import { shelf } from '../../../../shared/core/fulfilment.js';
import { describeSelections } from '../../../../shared/core/rules.js';
import { icons } from './icons.js';
// The spec sheet owns the reference hash. Two implementations of it would
// drift, and the basket row and the sheet must never disagree on a number
// the customer is going to quote back over the phone.
import { reference } from './specsheet.js';

/** Price of a line, whichever of the two models applies. */
export const priceOf = (product, selections, addons, qty) =>
  priceAnyWith(priceLine, product, selections, addons, qty, session.state.catalogue, session.state.merchant);

export const hrefFor = (product) =>
  product.kind === 'commission'
    ? link('commission.html')
    : link(`piece.html?id=${encodeURIComponent(product.id)}`);

/**
 * An edition on the work index. A photograph with its number and name set
 * under it — no card, no outline, no shadow.
 *
 * @param {object} product
 * @param {{when?:Date, n?:number, media?:string}} [opts]
 */
export function pieceTile(product, { when, n, media = '' } = {}) {
  const { merchant } = session.state;
  const state = when ? shelf(merchant, product, when) : null;
  const price = priceOf(product, product.defaults, [], 1);

  return `
    <article class="piece" data-state="${state?.state ?? 'in'}">
      <div class="piece__media ${media}">
        ${n != null ? `<p class="piece__n">${String(n).padStart(2, '0')}</p>` : ''}
        ${
          product.image
            ? `<img src="${photo(product.image, 'md')}"
                 srcset="${photo(product.image, 'sm')} 240w, ${photo(product.image, 'md')} 800w, ${photo(product.image, 'lg')} 1600w"
                 sizes="(min-width: 60rem) 32vw, 90vw"
                 alt="${esc(product.name)}" loading="lazy" decoding="async" width="800" height="1000">`
            : ''
        }
      </div>
      <div class="piece__head">
        <h3 class="piece__name"><a href="${hrefFor(product)}">${esc(product.name)}</a></h3>
        <p class="piece__price num">${money(price.unit)}</p>
      </div>
      <p class="piece__sub">${esc(product.subtitle)}</p>
      ${state ? `<p class="state" data-state="${state.state}">${esc(state.short)}</p>` : ''}
    </article>`;
}

/** Placeholders shaped like the tiles, so the grid does not jump. */
export const tileSkeletons = (n = 3) =>
  Array.from(
    { length: n },
    () => `
      <article class="piece" aria-hidden="true">
        <div class="piece__media"><div class="skel" style="position:absolute;inset:0"></div></div>
        <div class="skel" style="height:1.3em;width:60%"></div>
        <div class="skel" style="height:0.9em;width:85%"></div>
      </article>`
  ).join('');

/* --------------------------------------------------------------------------
   Basket lines
   -------------------------------------------------------------------------- */

/**
 * A commission has no photograph — it does not exist yet. It gets its
 * reference instead, which is the honest thing to show and happens to be
 * what the customer will quote on the phone.
 */
export function basketLine(line, { editable = true } = {}) {
  const product = session.product(line.productId);
  if (!product) return '';

  const price = priceOf(product, line.selections, line.addons, line.qty);
  const isCommission = product.kind === 'commission';

  const extras = (line.addons ?? [])
    .map((id) => session.state.catalogue.addons.find((a) => a.id === id)?.label)
    .filter(Boolean);

  const spec = isCommission
    ? commissionSpec(line)
    : [describeSelections(product, line.selections, session.groups()), ...extras]
        .filter(Boolean)
        .join(' · ');

  const thumb = product.image
    ? `<img src="${photo(product.image, 'sm')}" alt="" loading="lazy" decoding="async" width="200" height="200">`
    : `<span class="line__thumb--none" style="position:absolute;inset:0">${esc(reference(line.selections ?? {}, line.addons ?? []))}</span>`;

  return `
    <article class="line" data-line="${esc(line.id)}">
      <div class="line__thumb">${thumb}</div>
      <div>
        <h3 class="line__name">${esc(product.name)}</h3>
        ${spec ? `<p class="line__spec">${esc(spec)}</p>` : ''}
        ${line.inscription ? `<p class="line__spec">&ldquo;${esc(line.inscription)}&rdquo;</p>` : ''}
        ${briefLines(line)}
        ${
          isCommission && price.commission
            ? `<p class="line__spec">${price.commission.leadDays} days on the bench &middot;
                 ${money(price.commission.deposit)} of this is the deposit</p>`
            : ''
        }
        <div class="line__foot">
          ${
            editable
              ? `<div class="step" role="group" aria-label="How many ${esc(product.name)}">
                   <button type="button" data-less aria-label="One fewer" ${line.qty <= 1 ? 'disabled' : ''}>${icons.minus}</button>
                   <output>${line.qty}</output>
                   <button type="button" data-more aria-label="One more">${icons.plus}</button>
                 </div>
                 <a class="btn btn--sm btn--bare" href="${hrefFor(product)}">Change</a>
                 <button class="linkish" type="button" data-remove>Remove</button>`
              : `<p class="sm dim">${line.qty} × ${money(price.unit + price.addons)}</p>`
          }
          <p class="line__price num">${money(price.total)}</p>
        </div>
      </div>
    </article>`;
}

/**
 * The written brief on a basket row. It is the part of a commission that is
 * neither a number nor a checkbox, so it has to survive all the way to the
 * receipt — somebody checking their order is checking this.
 */
function briefLines(line) {
  const b = line.meta?.brief;
  if (!b) return '';
  return [
    b.occasion && `<p class="line__spec">For: ${esc(b.occasion)}</p>`,
    b.idea && `<p class="line__said">&ldquo;${esc(b.idea)}&rdquo;</p>`,
    b.avoid && `<p class="line__spec">Avoiding: ${esc(b.avoid)}</p>`,
  ].filter(Boolean).join('');
}

/** The brief, in one line, for a basket row. */
function commissionSpec(line) {
  const groups = session.groups();
  const pick = (g) => groups[g]?.options.find((o) => o.id === line.selections?.[g])?.label;
  const techniques = (line.addons ?? [])
    .map((id) => session.state.catalogue.addons.find((a) => a.id === id)?.label)
    .filter(Boolean);

  return [pick('scale'), pick('ambition'), pick('palette'), ...techniques].filter(Boolean).join(' · ');
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
