/**
 * @file Confirmation.
 *
 * The receipt is read from this device's storage. A real shop would also
 * fetch it by reference, which is why the "nothing recent" state explains
 * where else to look rather than just saying nothing was found — ordering on
 * a phone and opening the link on a laptop is normal, not an error.
 *
 * This is also where the occasion layer is offered, and where it has to be
 * most careful about what it claims. See the concept doc §5: it is
 * localStorage, it is this browser, and the page says so in the same
 * sentence as the offer rather than in a footnote.
 */

import { startPage, $, $$, esc, link } from './_page.js';
import * as session from '../services/session.js';
import { basketLine } from '../components/cakes.js';
import { cardPreview } from '../components/cardpreview.js';
import { hasCard } from '../card.js';
import { keep, kept, isRecurring, daysUntil } from '../components/kept.js';
import { icons } from '../components/icons.js';
import { money, dateLong } from '../../../../shared/core/format.js';
import { keyToDate } from '../../../../shared/core/dates.js';

await startPage({ nav: null });

const { merchant, catalogue } = session.state;
for (const el of $$('[data-home-link]')) el.href = link('index.html');

/** The method's own label from config, so the receipt names what was used. */
const payLabel = (id) =>
  (merchant.payment?.methods ?? []).find((m) => m.id === id)?.label ?? 'Card';

const r = session.state.store.read('lastReceipt', null);

if (!r) {
  $('[data-none]').hidden = false;
} else {
  $('[data-receipt]').hidden = false;

  const when = keyToDate(r.readyBy);
  const isPickup = r.method === 'pickup';
  const t = r.totals ?? {};

  $('[data-ref]').textContent = r.reference;
  document.title = `${r.reference} — ${merchant.name}`;

  $('[data-lede]').textContent = `${
    isPickup ? 'Ready to collect' : 'We will bring it'
  } ${dateLong(when)}${isPickup && r.slot ? `, between ${r.slot}` : ''}. The receipt is on its way to ${
    r.customer.email
  }.`;

  $('[data-details]').innerHTML = `
    <div><dt class="label">Ready</dt><dd>${esc(dateLong(when))}</dd></div>
    <div>
      <dt class="label">${isPickup ? 'Collect from' : 'We bring it to'}</dt>
      <dd>${
        isPickup
          ? `${esc(r.locationName)}<br><span class="sm dim">${esc(r.locationAddress)}${
              r.slot ? `<br>${esc(r.slot)}` : ''
            }</span>`
          : esc(r.address ?? '')
      }</dd>
    </div>
    <div><dt class="label">Ordered by</dt><dd>${esc(r.customer.name)}<br><span class="sm dim">${esc(
      r.customer.phone
    )}</span></dd></div>
    <div><dt class="label">Paid with</dt><dd>${esc(payLabel(r.payment?.method))}<br><span class="sm dim">${money(
      t.total ?? 0
    )}</span></dd></div>
    ${
      r.gift?.isGift
        ? `<div style="grid-column:1/-1">
             <dt class="label">A present for</dt>
             <dd>${esc(r.gift.recipient?.name || 'someone')}${
               r.gift.recipient?.phone ? `<br><span class="sm dim">${esc(r.gift.recipient.phone)}</span>` : ''
             }${
               r.gift.hidePrices
                 ? '<br><span class="sm dim">Prices left off everything in the box.</span>'
                 : ''
             }</dd>
           </div>`
        : ''
    }`;

  /* The same component the basket uses, read-only. One renderer for a line
     means the receipt shows what was ordered rather than a second idea of
     it — and the card is shown as the card, not as a quoted string, because
     this is the last chance anyone has to spot a typo in it. */
  const lines = r.lines ?? [];
  $('[data-lines]').innerHTML = lines
    .map(
      (l) => `
      ${basketLine(l, { editable: false })}
      ${
        hasCard(l.meta?.card)
          ? `<div style="margin:var(--s-4) 0 var(--s-6) 5.5rem">
               ${cardPreview({ card: l.meta.card, merchant, compact: true })}
               <p class="sm dimmer" style="margin-top:var(--s-3)">
                 Written by hand before it goes in the box. If something is wrong here,
                 ring ${esc(merchant.locations[0].phone)} and quote ${esc(r.reference)} —
                 we can change the words up to the morning before.
               </p>
             </div>`
          : ''
      }`
    )
    .join('');

  /* ---- What happens next ------------------------------------------------ */
  $('[data-next]').innerHTML = [
    `It goes on the list for ${dateLong(when)}.`,
    lines.some((l) => hasCard(l.meta?.card))
      ? 'The card is written on the morning, by whoever is on the bench.'
      : 'Nothing is written with this one. Ring us if you change your mind.',
    isPickup
      ? `Come to ${merchant.locations[0].address}${r.slot ? ` between ${r.slot}` : ''}.`
      : 'We will ring when the driver sets off.',
    `Something changed? Ring ${merchant.locations[0].phone} and quote ${r.reference}.`,
  ]
    .map((s) => `<li>${esc(s)}</li>`)
    .join('');

  /* ---- Keep the date ----------------------------------------------------
     Offered only for occasions that come round again — a wedding does not —
     and only when the shop has the flag on. The sentence that makes the
     offer is the same sentence that says where it lives. */
  const occasionOf = (line) => {
    const p = catalogue.products.find((x) => x.id === line.productId);
    return (p?.occasions ?? []).find(isRecurring) ?? null;
  };

  const recurring = lines.map(occasionOf).find(Boolean);

  /* Whose date it is, and only when we actually know.
     A present names its recipient, so "Mara's birthday" is a fact. An order
     somebody placed for themselves does not, and "Keep Tom Reilly's
     anniversary" guesses at both the person and the occasion from a product
     tag. The date is the thing we are certain of, so that is what the
     button offers to keep. First names throughout: nobody writes their own
     surname on a cake. */
  const isPresent = Boolean(r.gift?.isGift && r.gift.recipient?.name);
  const first = (name) => String(name ?? '').trim().split(/\s+/)[0] ?? '';
  const who = isPresent ? first(r.gift.recipient.name) : first(r.customer.name);

  if (merchant.capabilities?.keptDates && recurring && who) {
    const label =
      (catalogue.occasions ?? []).find((o) => o.id === recurring)?.label.replace(/^An? /, '') ??
      recurring;

    $('[data-keep]').hidden = false;
    $('[data-keep-note]').textContent = isPresent
      ? `Next year, three weeks before ${who}'s ${label}, we can show you what you sent this time. It is kept in this browser on this device — we cannot email you about it, and we are not going to pretend otherwise.`
      : `We can hold on to ${dateLong(when)} and mention it when it comes round again. It is kept in this browser on this device — we cannot email you about it, and we are not going to pretend otherwise.`;
    $('[data-keep-yes]').textContent = isPresent ? `Keep ${who}'s ${label}` : 'Keep this date';

    const already = kept().some(
      (k) => k.who.toLowerCase() === who.toLowerCase() && k.occasion === recurring
    );
    if (already) markKept(who, label, recurring);

    $('[data-keep-yes]').addEventListener('click', () => {
      keep({ who, occasion: recurring, on: r.readyBy, productId: lines[0]?.productId ?? null });
      markKept(who, label, recurring);
    });
  }

  function markKept(name, label, occasion) {
    const { days } = daysUntil(r.readyBy);
    const done = $('[data-kept-done]');
    done.hidden = false;
    done.innerHTML = `${icons.check}<span>Kept. ${
      isPresent ? `${esc(name)}&rsquo;s ${esc(label)}` : esc(dateLong(when))
    } comes round in ${days} days, and we will mention it when you are next here on this device.</span>`;
    $('[data-keep-yes]').disabled = true;
    void occasion;
  }

  $('[data-print]').addEventListener('click', () => window.print());
}
