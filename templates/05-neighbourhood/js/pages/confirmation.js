/**
 * @file Confirmation — the ticket, stamped.
 *
 * The receipt is read from this device's storage. A real shop would also
 * fetch it by reference, which is why the "no recent order" state explains
 * where else to look rather than just saying nothing was found.
 */

import { startPage, $, esc } from './_page.js';
import * as session from '../services/session.js';
import { moneyExact, whenPhrase, date as fmtDate } from '../../../../shared/core/format.js';
import { describeSelections } from '../../../../shared/core/rules.js';
import { keyToDate } from '../../../../shared/core/dates.js';

await startPage({ nav: null, mobileTicket: false });

const q = new URLSearchParams(location.search).get('merchant');
const qs = q ? `?merchant=${q}` : '';
$('[data-home-link]').href = `index.html${qs}`;
$('[data-shop-link]').href = `shop.html${qs}`;

const r = session.state.store.read('lastReceipt', null);

if (!r) {
  $('[data-none]').hidden = false;
} else {
  $('[data-receipt]').hidden = false;

  const when = keyToDate(r.readyBy);
  const isPickup = r.method === 'pickup';

  $('[data-ref]').textContent = r.reference;
  $('[data-placed]').textContent = fmtDate(new Date(r.placedAt), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  $('[data-lede]').textContent = isPickup
    ? `It'll be bagged up and waiting ${whenPhrase(when)}, between ${r.slot}. The receipt is on its way to ${r.customer.email}.`
    : `We'll bring it over ${whenPhrase(when)}, between 8am and midday. The receipt is on its way to ${r.customer.email}.`;

  $('[data-details]').innerHTML = `
    <div><dt>Ready</dt><dd>${esc(whenPhrase(when))}</dd></div>
    <div>
      <dt>${isPickup ? 'Collection' : 'Delivery'}</dt>
      <dd>${
        isPickup
          ? `${esc(r.locationName)}<br>${esc(r.locationAddress)}<br>${esc(r.slot ?? '')}`
          : esc(r.address ?? '')
      }</dd>
    </div>
    <div><dt>Name</dt><dd>${esc(r.customer.name)}</dd></div>
    <div><dt>Mobile</dt><dd>${esc(r.customer.phone)}</dd></div>
    ${r.gift?.message ? `<div style="grid-column:1/-1"><dt>Card message</dt><dd>“${esc(r.gift.message)}”</dd></div>` : ''}
    ${r.notes ? `<div style="grid-column:1/-1"><dt>Your notes</dt><dd>${esc(r.notes)}</dd></div>` : ''}
  `;

  $('[data-lines]').innerHTML = r.lines
    .map((line) => {
      const p = session.product(line.productId);
      if (!p) return '';
      const price = session.priceOf(p, line.selections, line.addons, line.qty);
      const spec = describeSelections(p, line.selections, session.groups());
      return `
        <div class="ticket__sum" style="align-items:flex-start;padding-block:var(--s-2)">
          <span>
            <strong>${line.qty > 1 ? `${line.qty} × ` : ''}${esc(p.name)}</strong>
            ${spec || line.inscription ? `<br><span class="sm">${esc(spec)}${line.inscription ? ` · “${esc(line.inscription)}”` : ''}</span>` : ''}
          </span>
          <span class="money">${moneyExact(price.total)}</span>
        </div>`;
    })
    .join('');

  $('[data-total]').textContent = moneyExact(r.totals.total);

  $('[data-print]').addEventListener('click', () => window.print());
}
