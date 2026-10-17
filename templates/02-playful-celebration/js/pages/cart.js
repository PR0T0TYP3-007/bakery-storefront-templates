/**
 * @file The basket.
 *
 * Two things this page has to get right, both of which come from the
 * checkout research rather than from taste:
 *
 * 1. One ready-by date for the whole order. A basket holding a four-day
 *    cake and a one-day brownie is ready in four days, and saying so here
 *    rather than at checkout is the difference between a decision and a
 *    nasty surprise.
 * 2. A price that moved since something was added gets said out loud. A
 *    silently updated total is the single fastest way to lose trust.
 */

import { startPage, $, esc, link } from './_page.js';
import * as session from '../services/session.js';
import { basketLine, bindBasketLines } from '../components/cards.js';
import { icons } from '../components/icons.js';
import { money, whenPhrase } from '../../../../shared/core/format.js';
import { orderTotals } from '../../../../shared/core/pricing.js';

await startPage({ nav: null });

const { merchant } = session.state;

for (const el of document.querySelectorAll('[data-shop-link], [data-shop-link-2]')) {
  el.href = link('shop.html');
}
$('[data-build-link]').href = link('build.html');
$('[data-checkout]').href = link('checkout.html');

const linesEl = $('[data-lines]');

function paint() {
  const { cart } = session.state;
  const empty = cart.lines.length === 0;

  $('[data-empty]').hidden = !empty;
  $('[data-aside]').hidden = empty;
  linesEl.hidden = empty;
  $('[data-clear]').hidden = empty;
  document.querySelector('[data-shop-link]').hidden = empty;

  if (empty) {
    $('[data-ready]').hidden = true;
    $('[data-stale]').hidden = true;
    linesEl.innerHTML = '';
    return;
  }

  linesEl.innerHTML = cart.lines.map((l) => basketLine(l)).join('');

  /* ---- The one date that matters -------------------------------------- */
  const readyBy = session.orderReadyBy();
  const slowest = cart.lines.reduce((worst, l) => {
    const p = session.product(l.productId);
    const lead = p ? session.leadFor(p, l.selections) : 0;
    return lead > worst.lead ? { lead, name: p?.name } : worst;
  }, { lead: -1, name: null });

  const ready = $('[data-ready]');
  ready.hidden = false;
  ready.innerHTML = `${icons.calendar}<span><strong>Everything is ready ${esc(whenPhrase(readyBy))}.</strong>
    ${cart.lines.length > 1 && slowest.name
      ? `${esc(slowest.name)} takes the longest, so the rest waits for it.`
      : ''}</span>`;

  /* ---- Prices that moved ----------------------------------------------- */
  const moved = session.stale();
  const stale = $('[data-stale]');
  if (moved.length) {
    stale.hidden = false;
    stale.innerHTML = `${icons.alert}<span><strong>${moved.length === 1 ? 'A price has' : `${moved.length} prices have`} changed
      since ${moved.length === 1 ? 'it was' : 'they were'} added.</strong>
      The figures below are today's. Nothing has been charged.</span>`;
  } else {
    stale.hidden = true;
  }

  /* ---- Totals ----------------------------------------------------------- */
  // Collection, because no address has been given yet. Delivery is priced at
  // checkout once a postcode names a zone — quoting a guess here would be a
  // number that changes on the next page, which is what people complain about.
  const totals = orderTotals(cart.lines, merchant, session.state.catalogue, { method: 'pickup' });

  $('[data-totals]').innerHTML = `
    <div class="sum"><span>${cart.lines.length} ${cart.lines.length === 1 ? 'thing' : 'things'}</span>
      <span class="money">${money(totals.subtotal)}</span></div>
    <div class="sum"><span>Collection</span><span class="money">Free</span></div>
    ${totals.tax ? `<div class="sum"><span>VAT</span><span class="money">${money(totals.tax)}</span></div>` : ''}
    <div class="sum sum--total"><span>Total</span><span class="money">${money(totals.total)}</span></div>
    <p class="xs quiet" style="margin-top:var(--s-2)">${esc(merchant.taxNote)} Delivery is added at checkout if you want it.</p>`;

  const free = $('[data-free]');
  if (totals.freeDeliveryGap > 0) {
    free.hidden = false;
    free.innerHTML = `${icons.van}<span>Another <strong>${money(totals.freeDeliveryGap)}</strong>
      and delivery is free.</span>`;
  } else {
    free.hidden = false;
    free.className = 'note note--good';
    free.innerHTML = `${icons.check}<span>Delivery is free on this order.</span>`;
  }
}

bindBasketLines(linesEl, paint);

$('[data-clear]').addEventListener('click', () => {
  if (!session.state.cart.lines.length) return;
  // A confirm() rather than an undo toast: emptying a basket of configured
  // cakes throws away six decisions per line, and an undo that depends on
  // this tab staying open is not a safety net.
  const ok = window.confirm('Empty the basket? The cakes you configured will be gone.');
  if (ok) session.clear();
});

session.on('cart:change', paint);
paint();
