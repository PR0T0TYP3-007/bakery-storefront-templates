/**
 * @file Confirmation.
 *
 * The reference is set at display scale, because it is the one thing the
 * customer will be asked for on the phone and the one thing worth being
 * able to read across a room.
 *
 * The receipt is read from this device's storage. A real studio would also
 * fetch it by reference, which is why the "no recent order" state explains
 * where else to look rather than just saying nothing was found — booking on
 * a phone and opening the link on a laptop is normal, not an error.
 */

import { startPage, $, esc, link } from './_page.js';
import * as session from '../services/session.js';
import { basketLine } from '../components/pieces.js';
import { money, dateLong } from '../../../../shared/core/format.js';
import { keyToDate } from '../../../../shared/core/dates.js';

await startPage({ nav: null });

for (const el of document.querySelectorAll('[data-home-link], [data-home-link-2]')) el.href = link('index.html');

/** The method's own label from config, so the receipt names what was used. */
const payLabel = (id) =>
  (session.state.merchant.payment?.methods ?? []).find((m) => m.id === id)?.label ?? 'Card';

const r = session.state.store.read('lastReceipt', null);
const { merchant } = session.state;

if (!r) {
  $('[data-none]').hidden = false;
} else {
  $('[data-receipt]').hidden = false;

  const when = keyToDate(r.readyBy);
  const isPickup = r.method === 'pickup';
  const t = r.totals ?? {};

  $('[data-ref]').textContent = r.reference;
  document.title = `${r.reference} — ${merchant.name}`;

  $('[data-lede]').textContent = t.hasCommission
    ? `The slot is held. We will ring ${r.customer.phone} within two working days to talk the brief through, and the spec sheet is on its way to ${r.customer.email}.`
    : `${isPickup ? 'Ready to collect' : 'We will bring it'} ${dateLong(when)}${
        isPickup && r.slot ? `, between ${r.slot}` : ''
      }. The receipt is on its way to ${r.customer.email}.`;

  $('[data-details]').innerHTML = `
    <div><dt class="label">Ready</dt><dd>${esc(dateLong(when))}</dd></div>
    <div>
      <dt class="label">${isPickup ? 'Collect from' : 'We bring it to'}</dt>
      <dd>${
        isPickup
          ? `${esc(r.locationName)}<span class="sheet__note">${esc(r.locationAddress)}${r.slot ? `<br>${esc(r.slot)}` : ''}</span>`
          : esc(r.address ?? '')
      }</dd>
    </div>
    <div><dt class="label">Booked by</dt><dd>${esc(r.customer.name)}<span class="sheet__note">${esc(r.customer.phone)}</span></dd></div>
    <div><dt class="label">Placed</dt><dd>${esc(dateLong(new Date(r.placedAt)))}</dd></div>
    <div><dt class="label">Paid with</dt><dd>${esc(payLabel(r.payment?.method))}</dd></div>
    ${
      r.gift?.isGift
        ? `<div style="grid-column:1/-1">
             <dt class="label">A present for</dt>
             <dd>${esc(r.gift.recipient?.name || 'someone')}${
               r.gift.recipient?.phone ? `<span class="sheet__note">${esc(r.gift.recipient.phone)}</span>` : ''
             }${r.gift.message ? `<span class="sheet__note">&ldquo;${esc(r.gift.message)}&rdquo;</span>` : ''}${
               r.gift.hidePrices ? '<span class="sheet__note">Prices left off everything in the box.</span>' : ''
             }</dd>
           </div>`
        : ''
    }`;

  // The same component the basket uses, read-only. One renderer for a line
  // means the receipt shows what was ordered, not a second idea of it.
  $('[data-lines]').innerHTML = r.lines.map((l) => basketLine(l, { editable: false })).join('');

  $('[data-total]').textContent = money(t.total ?? 0);

  if (t.hasCommission) {
    $('[data-due]').hidden = false;
    $('[data-later]').hidden = false;
    $('[data-due-now]').textContent = money(t.dueNow ?? 0);
    $('[data-due-later]').textContent = money(t.dueLater ?? 0);
  }

  const c = merchant.commission;
  $('[data-next]').innerHTML = (t.hasCommission
    ? [
        `We ring you within two working days. If the brief and the budget have drifted apart, we say so then.`,
        `The piece is built on the bench in the ${c.leadNote ?? 'days'} before collection. One of us does the whole thing.`,
        `The balance, ${money(t.dueLater ?? 0)}, is due when you pick it up.`,
        `Something changed? Ring ${merchant.locations[0].phone} and quote ${r.reference}. Up to two weeks out we can usually move it.`,
      ]
    : [
        `It goes on the list for ${dateLong(when)}.`,
        `You get a message when it is boxed.`,
        `Something changed? Ring ${merchant.locations[0].phone} and quote ${r.reference}.`,
      ]
  )
    .map((s) => `<li>${esc(s)}</li>`)
    .join('');

  $('[data-print]').addEventListener('click', () => window.print());
}
