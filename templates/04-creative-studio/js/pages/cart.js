/**
 * @file The basket.
 *
 * Two things this has to get right, and they come from the model rather
 * than from taste:
 *
 * 1. One ready-by date for the whole order. A basket holding a six-week
 *    commission and a next-day box of offcuts is ready in six weeks, and
 *    saying so here rather than at checkout is the difference between a
 *    decision and a nasty surprise.
 * 2. A basket with a commission in it is a commission order, so what is
 *    taken now is the deposit and the balance is named. Showing the full
 *    total as "to pay" would be wrong by a factor of three.
 */

import { startPage, $, esc, link } from './_page.js';
import * as session from '../services/session.js';
import { basketLine, bindBasketLines, priceOf } from '../components/pieces.js';
import { orderTotalsWith } from '../commission.js';
import { priceLine } from '../../../../shared/core/pricing.js';
import { icons } from '../components/icons.js';
import { money, dateLong } from '../../../../shared/core/format.js';

await startPage({ nav: null });

const { merchant, catalogue } = session.state;

for (const el of document.querySelectorAll('[data-work-link], [data-work-link-2]')) el.href = link('work.html');
$('[data-commission-link]').href = link('commission.html');
$('[data-checkout]').href = link('checkout.html');

const linesEl = $('[data-lines]');

function paint() {
  const { cart } = session.state;
  const empty = cart.lines.length === 0;

  $('[data-empty]').hidden = !empty;
  $('[data-aside]').hidden = empty;
  linesEl.hidden = empty;
  $('[data-clear]').hidden = empty;
  document.querySelector('[data-work-link]').hidden = empty;

  if (empty) {
    $('[data-ready]').hidden = true;
    $('[data-stale]').hidden = true;
    linesEl.innerHTML = '';
    return;
  }

  linesEl.innerHTML = cart.lines.map((l) => basketLine(l)).join('');

  /* ---- The one date that matters -------------------------------------- */
  const readyBy = session.orderReadyBy();
  const slowest = cart.lines.reduce(
    (worst, l) => {
      const p = session.product(l.productId);
      if (!p) return worst;
      const price = priceOf(p, l.selections, l.addons, l.qty);
      const lead = price.commission ? price.commission.leadDays : session.leadFor(p, l.selections);
      return lead > worst.lead ? { lead, name: p.name } : worst;
    },
    { lead: -1, name: null }
  );

  const ready = $('[data-ready]');
  ready.hidden = false;
  ready.innerHTML = `${icons.calendar}<span><strong>Ready ${esc(dateLong(readyBy))}.</strong>
    ${cart.lines.length > 1 && slowest.name ? `${esc(slowest.name)} takes the longest, so the rest waits for it.` : ''}</span>`;

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
  const t = orderTotalsWith(priceLine, cart.lines, merchant, catalogue, { method: 'pickup' });

  $('[data-totals]').innerHTML = `
    <div class="sum"><span>${cart.lines.length} ${cart.lines.length === 1 ? 'thing' : 'things'}</span>
      <span>${money(t.subtotal)}</span></div>
    <div class="sum"><span>Collection</span><span>Free</span></div>
    <div class="sum"><span>VAT at ${Math.round((merchant.taxRate ?? 0) * 100)}%</span><span>${money(t.tax)}</span></div>
    <div class="sum sum--total"><span>Total</span><span>${money(t.total)}</span></div>
    ${
      t.hasCommission
        ? `<div class="sum sum--due" style="margin-top:var(--s-3)">
             <span>Deposit now</span><span>${money(t.dueNow)}</span></div>
           <div class="sum"><span>On collection</span><span>${money(t.dueLater)}</span></div>
           <p class="xs dim" style="margin-top:var(--s-3)">
             A commission takes a ${Math.round((merchant.commission.depositPct ?? 0) * 100)}% deposit to hold
             the slot in the diary. The rest is due when you pick it up.</p>`
        : ''
    }`;

  const free = $('[data-free]');
  free.hidden = false;
  if (t.freeDeliveryGap > 0) {
    free.className = 'note';
    free.innerHTML = `${icons.info}<span>Another <strong>${money(t.freeDeliveryGap)}</strong> and we drive it over for nothing.</span>`;
  } else {
    free.className = 'note note--good';
    free.innerHTML = `${icons.check}<span>Delivery is free on this order.</span>`;
  }
}

bindBasketLines(linesEl, paint);

$('[data-clear]').addEventListener('click', () => {
  if (!session.state.cart.lines.length) return;
  // A confirm rather than an undo toast: emptying this basket throws away a
  // brief that took six decisions to write, and an undo that depends on this
  // tab staying open is not a safety net.
  if (window.confirm('Empty the basket? Any brief in it goes with it.')) session.clear();
});

session.on('cart:change', paint);
paint();
