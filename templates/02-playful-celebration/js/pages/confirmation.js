/**
 * @file Confirmation.
 *
 * The receipt is read from this device's storage. A real shop would also be
 * able to fetch it by reference, which is why the "no recent order" state
 * explains where else to look instead of just saying nothing was found —
 * ordering on a phone and opening the link on a laptop is normal, not an
 * error.
 */

import { startPage, $, esc, link } from './_page.js';
import * as session from '../services/session.js';
import { basketLine } from '../components/cards.js';
import { money, whenPhrase, whenPhraseMid, dateLong } from '../../../../shared/core/format.js';
import { keyToDate } from '../../../../shared/core/dates.js';

await startPage({ nav: null });

for (const el of document.querySelectorAll('[data-home-link], [data-home-link-2]')) {
  el.href = link('index.html');
}

const r = session.state.store.read('lastReceipt', null);

if (!r) {
  $('[data-none]').hidden = false;
} else {
  $('[data-receipt]').hidden = false;

  const when = keyToDate(r.readyBy);
  const isPickup = r.method === 'pickup';

  $('[data-ref]').textContent = r.reference;
  document.title = `${r.reference} — Many Happy Returns`;

  $('[data-lede]').textContent = isPickup
    ? `It will be boxed and waiting ${whenPhraseMid(when)}, between ${r.slot}. The receipt is on its way to ${r.customer.email}.`
    : `We will bring it over ${whenPhraseMid(when)}, between 8am and midday. The receipt is on its way to ${r.customer.email}.`;

  $('[data-phone]').textContent = session.state.merchant.locations[0].phone;

  $('[data-details]').innerHTML = `
    <div><dt>Ready</dt><dd>${esc(whenPhrase(when))}</dd></div>
    <div>
      <dt>${isPickup ? 'Collect from' : 'Delivering to'}</dt>
      <dd>${
        isPickup
          ? `${esc(r.locationName)}<br>${esc(r.locationAddress)}<br>${esc(r.slot ?? '')}`
          : esc(r.address ?? '')
      }</dd>
    </div>
    <div><dt>Ordered by</dt><dd>${esc(r.customer.name)}<br>${esc(r.customer.phone)}</dd></div>
    <div><dt>Placed</dt><dd>${esc(dateLong(new Date(r.placedAt)))}</dd></div>
    ${
      r.gift?.isGift
        ? `<div style="grid-column:1/-1">
             <dt>A present for</dt>
             <dd>${esc(r.gift.recipient?.name || 'someone lucky')}${
               r.gift.message ? `<br><span style="font-weight:600">&ldquo;${esc(r.gift.message)}&rdquo;</span>` : ''
             }${r.gift.hidePrices ? '<br><span class="sm quiet">Prices left off everything in the box.</span>' : ''}</dd>
           </div>`
        : ''
    }`;

  // The same component the basket uses, in read-only mode. One renderer for
  // a cake line means the drawing on the receipt is the drawing that was
  // ordered, not a second idea of it.
  $('[data-lines]').innerHTML = r.lines.map((l) => basketLine(l, { editable: false })).join('');

  $('[data-total]').textContent = money(r.totals.total);

  $('[data-print]').addEventListener('click', () => window.print());

  /* ---- Confetti --------------------------------------------------------
     Twelve spans, thrown with CSS custom properties. It runs once, it is
     aria-hidden, and prefers-reduced-motion removes it entirely. */
  const colours = ['var(--berry)', 'var(--grape)', 'var(--mint)', 'var(--tangerine)', 'var(--lemon)'];
  $('[data-burst]').innerHTML = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const dist = 110 + (i % 4) * 36;
    return `<i style="--c:${colours[i % colours.length]};
      --x:${Math.round(Math.cos(angle) * dist)}px;
      --y:${Math.round(Math.sin(angle) * dist * 0.75 + 40)}px;
      --r2:${(i * 73) % 360}deg;
      --d:${i * 22}ms"></i>`;
  }).join('');
}
