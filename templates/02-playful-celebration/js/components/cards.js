/**
 * @file Product cards, occasion tiles and basket lines.
 *
 * One module, because all three render the same product data and keeping
 * them together is what stops them drifting into three different ideas of
 * what a cake looks like — which is the inconsistency Template 05 v1 was
 * criticised for.
 */

import * as session from '../services/session.js';
import { esc, photo, link } from '../pages/_page.js';
import { icons } from './icons.js';
import { cakeSVG, specFrom } from './cake.js';
import { money } from '../../../../shared/core/format.js';
import { shelf } from '../../../../shared/core/fulfilment.js';
import { describeSelections } from '../../../../shared/core/rules.js';

/**
 * Where a product's "look at this" page is. Everything configurable goes to
 * the builder; a fixed box goes to the shop, because there is nothing to
 * configure and a page saying so would waste a click.
 */
export function hrefFor(product) {
  return product.kind === 'box'
    ? link(`shop.html?cat=${product.category}`)
    : link(`build.html?product=${product.id}`);
}

/** The picture for a product: its photograph, or a drawing of the cake. */
function media(product, { tall = false } = {}) {
  const cls = `card__media${tall ? ' card__media--tall' : ''}`;

  if (product.image) {
    return `<div class="${cls}">
        <img src="${photo(product.image, 'md')}"
             srcset="${photo(product.image, 'sm')} 480w, ${photo(product.image, 'md')} 800w, ${photo(product.image, 'lg')} 1200w"
             sizes="(min-width: 60rem) 340px, 90vw"
             alt="${esc(product.name)}" loading="lazy" decoding="async" width="800" height="600">
      </div>`;
  }

  // No photograph, so draw the cake its defaults describe. This is how the
  // "build your own" card shows what it is without a stock photo of someone
  // else's cake.
  const spec = specFrom(product, product.defaults, session.groups(), '');
  return `<div class="${cls}" style="background:var(--grape-wash)">
      ${cakeSVG(spec, { compact: true, title: `A ${product.name.toLowerCase()} cake` })}
    </div>`;
}

/**
 * @param {object} product
 * @param {{when?:Date, tall?:boolean, flag?:string}} [opts]
 */
export function productCard(product, { when, tall = false, flag } = {}) {
  const { merchant } = session.state;
  const state = when ? shelf(merchant, product, when).state : 'ok';
  const price = session.priceOf(product, product.defaults, [], 1);

  const lead = session.leadFor(product);
  const leadWord =
    lead === 0 ? 'Today' : lead === 1 ? '1 day' : `${lead} days`;

  return `
    <article class="card" data-state="${state}">
      ${flag ? `<p class="card__flag">${esc(flag)}</p>` : ''}
      ${media(product, { tall })}
      <div class="card__body">
        <h3 class="card__name"><a href="${hrefFor(product)}">${esc(product.name)}</a></h3>
        <p class="card__sub">${esc(product.subtitle)}</p>
        <div class="card__foot">
          <p class="card__price">${money(price.unit)}<span>${esc(leadWord)}' notice</span></p>
          <span class="btn btn--sm btn--primary" aria-hidden="true">
            ${product.kind === 'custom' ? 'Build it' : 'Have a look'}
          </span>
        </div>
      </div>
    </article>`;
}

/** A card-shaped placeholder, so the layout does not jump when data lands. */
export function cardSkeleton(n = 3) {
  return Array.from(
    { length: n },
    () => `
      <article class="card" aria-hidden="true">
        <div class="card__media"><div class="skel" style="position:absolute;inset:0"></div></div>
        <div class="card__body">
          <div class="skel" style="height:1.3em;width:70%"></div>
          <div class="skel" style="height:0.9em;width:90%"></div>
          <div class="card__foot"><div class="skel" style="height:1.1em;width:4.5em"></div></div>
        </div>
      </article>`
  ).join('');
}

/** An occasion tile. Illustration and a count, no photograph. */
export function occasionTile(occasion, count) {
  return `
    <a class="occ" href="${link(`shop.html?occasion=${occasion.id}`)}" style="--tile:${esc(occasion.tile)}">
      <span class="occ__icon" aria-hidden="true">${esc(occasion.icon)}</span>
      <span class="occ__name">${esc(occasion.label)}</span>
      <span class="occ__n">${count} ${count === 1 ? 'cake' : 'cakes'}</span>
    </a>`;
}

/* --------------------------------------------------------------------------
   Basket lines
   -------------------------------------------------------------------------- */

/**
 * One line in the basket. Shows the drawing of the exact cake that was
 * configured, not a generic thumbnail — the whole promise of this template
 * is that what you drew is what you ordered, and the basket is where that
 * promise is most easily broken.
 *
 * @param {object} line
 * @param {{editable?:boolean}} [opts]
 */
export function basketLine(line, { editable = true } = {}) {
  const product = session.product(line.productId);
  if (!product) return '';

  const price = session.priceOf(product, line.selections, line.addons, line.qty);
  const spec = describeSelections(product, line.selections, session.groups());
  const addonLabels = (line.addons ?? [])
    .map((id) => session.state.catalogue.addons.find((a) => a.id === id)?.label)
    .filter(Boolean);

  const thumb = product.image
    ? `<img src="${photo(product.image, 'sm')}" alt="" loading="lazy" decoding="async" width="200" height="200">`
    : cakeSVG(specFrom(product, line.selections, session.groups(), ''), {
        compact: true,
        title: '',
      });

  return `
    <div class="line" data-line="${esc(line.id)}">
      <div class="line__thumb">${thumb}</div>
      <div>
        <h3 class="line__name">${esc(product.name)}</h3>
        ${spec ? `<p class="line__spec">${esc(spec)}</p>` : ''}
        ${addonLabels.length ? `<p class="line__spec">Plus ${esc(addonLabels.join(', ').toLowerCase())}</p>` : ''}
        ${line.inscription ? `<p class="line__said">Iced: &ldquo;${esc(line.inscription)}&rdquo;</p>` : ''}
        <div class="line__foot">
          ${
            editable
              ? `<div class="step" role="group" aria-label="How many ${esc(product.name)}">
                   <button type="button" data-less aria-label="One fewer" ${line.qty <= 1 ? 'disabled' : ''}>−</button>
                   <output>${line.qty}</output>
                   <button type="button" data-more aria-label="One more">+</button>
                 </div>
                 <a class="btn btn--quiet btn--sm" href="${hrefFor(product)}">${icons.pencil}<span>Change</span></a>
                 <button class="linkish" type="button" data-remove>Remove</button>`
              : `<p class="sm quiet">${line.qty} × ${money(price.unit + price.addons)}</p>`
          }
          <p class="line__price">${money(price.total)}</p>
        </div>
      </div>
    </div>`;
}

/**
 * Wires the steppers and remove buttons for a container of basket lines.
 * Delegated, so re-rendering the list does not need re-binding.
 */
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
