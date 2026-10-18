/**
 * @file The basket.
 *
 * One ready-by date for the whole order, because the slowest thing in it
 * decides when all of it is ready — and saying so here rather than at
 * checkout is the difference between a decision and a nasty surprise.
 *
 * Every line shows its card, not a note saying it has one. A basket that
 * said "card added" would put the customer back where the rest of the market
 * already has them: trusting words they cannot see.
 */

import { startPage, $, $$, esc, link } from './_page.js';
import * as session from '../services/session.js';
import { basketLine, bindBasketLines } from '../components/cakes.js';
import { icons } from '../components/icons.js';
import { orderTotals } from '../../../../shared/core/pricing.js';
import { money, dateLong } from '../../../../shared/core/format.js';

await startPage({ nav: null });

const { merchant, catalogue } = session.state;

for (const el of $$('[data-cakes-link]')) el.href = link('cakes.html');
$('[data-checkout-link]').href = link('checkout.html');

const linesEl = $('[data-lines]');

function paint() {
  const { cart } = session.state;
  const empty = cart.lines.length === 0;

  $('[data-filled]').hidden = empty;
  $('[data-nothing]').hidden = !empty;
  if (empty) {
    linesEl.innerHTML = '';
    return;
  }

  linesEl.innerHTML = cart.lines.map((l) => basketLine(l)).join('');

  /* ---- The one date that matters ---------------------------------------- */
  const readyBy = session.orderReadyBy();
  const slowest = cart.lines.reduce(
    (worst, l) => {
      const p = session.product(l.productId);
      if (!p) return worst;
      const lead = session.leadFor(p, l.selections);
      return lead > worst.lead ? { lead, name: p.name } : worst;
    },
    { lead: -1, name: null }
  );

  const ready = $('[data-ready]');
  ready.innerHTML = `${icons.calendar}<span><strong>Ready ${esc(dateLong(readyBy))}.</strong>
    ${
      cart.lines.length > 1 && slowest.name
        ? `${esc(slowest.name)} takes the longest, so the rest waits for it.`
        : ''
    }</span>`;

  /* ---- Prices that moved ------------------------------------------------ */
  const moved = session.stale();
  const stale = $('[data-stale]');
  stale.hidden = !moved.length;
  if (moved.length) {
    stale.innerHTML = `${icons.alert}<span><strong>${
      moved.length === 1 ? 'A price has' : `${moved.length} prices have`
    } changed since ${moved.length === 1 ? 'it was' : 'they were'} added.</strong>
    The figures below are today's. Nothing has been charged.</span>`;
  }

  /* ---- Totals ------------------------------------------------------------
     Collection, because no address has been given yet. Delivery is priced at
     checkout once a postcode names a zone; quoting a guess here would be a
     number that changes on the next page. */
  const t = orderTotals(cart.lines, merchant, catalogue, { method: 'pickup' });
  const n = cart.lines.reduce((sum, l) => sum + l.qty, 0);

  $('[data-totals]').innerHTML = `
    <div><dt>${n} ${n === 1 ? 'cake' : 'cakes'}</dt><dd class="num">${money(t.subtotal)}</dd></div>
    <div><dt>Collection</dt><dd>Free</dd></div>
    <div><dt>Cards</dt><dd>No charge</dd></div>
    <div class="totals__big"><dt>Total</dt><dd class="num">${money(t.total)}</dd></div>`;

  // The free-delivery line only appears when it is within reach. Template 04
  // told an 85-euro order it was 815 away from free delivery, which reads as
  // a joke at the customer's expense.
  const within = merchant.delivery?.nudgeWithin ?? Infinity;
  const tax = $('[data-tax]');
  if (t.freeDeliveryGap > 0 && t.freeDeliveryGap <= within) {
    tax.textContent = `Another ${money(t.freeDeliveryGap)} and we bring it over for nothing.`;
  } else if (t.freeDeliveryGap === 0) {
    tax.textContent = 'Delivery is free on this order, if you want it brought.';
  } else {
    tax.textContent = merchant.taxNote;
  }
}

bindBasketLines(linesEl, paint);

session.on('cart:change', paint);
paint();
