/**
 * @file Checkout.
 *
 * Deliberately ordinary. The rule this template holds, borrowed from
 * Template 04 because it was right: **experiment with composition and
 * typography, never with interaction.** The card page is unusual; this is a
 * form, and a form should behave like every other form the customer has ever
 * filled in.
 *
 * Guest by default, errors on blur and again on submit, each error saying
 * what to do rather than what is wrong, and a payment that can genuinely
 * fail with the basket and every field intact afterwards.
 *
 * Gifting is here because §7 requires it and D15 settled the argument: a
 * capability may be switched off in config, it may not be absent from the
 * code. Template 02's gifting is a whole branch of the form with a card
 * preview; this one is four fields, because in this template the card was
 * written three screens ago and does not need writing again.
 */

import { startPage, $, $$, esc, link } from './_page.js';
import * as session from '../services/session.js';
import * as api from '../services/api.js';
import { priceOf } from '../components/cakes.js';
import { openDatePicker } from '../components/datepicker.js';
import { toast } from '../components/toast.js';
import { icons } from '../components/icons.js';
import { hasCard, cardSummary } from '../card.js';
import { orderTotals } from '../../../../shared/core/pricing.js';
import { money, dateLong } from '../../../../shared/core/format.js';
import { describeSelections } from '../../../../shared/core/rules.js';
import { dateKey } from '../../../../shared/core/dates.js';

await startPage({ nav: null });

const { merchant, catalogue } = session.state;
const loc = merchant.locations[0];

// An empty basket has nothing to check out, and going back is more useful
// than a form that cannot be submitted.
if (!session.state.cart.lines.length) location.replace(link('cart.html'));

for (const el of $$('[data-cart-link]')) el.href = link('cart.html');

let method = 'pickup';
let payMethod = 'card';
let isGift = false;
let zone = null;
let when = session.orderReadyBy() ?? session.state.when;
let slot = null;
let agreed = false;

const form = $('[data-form]');

/* -------------------------------------------------------------------------
   Collect, or we bring it
   ------------------------------------------------------------------------- */
$('[data-method]').innerHTML = `
  <legend class="sr">How you want it</legend>
  <label class="choice">
    <input type="radio" name="method" value="pickup" checked>
    <span class="choice__face">
      <span class="choice__name">Collect it</span>
      <span class="choice__meta">Free</span>
      <span class="choice__note">${esc(loc.address)}</span>
    </span>
  </label>
  <label class="choice">
    <input type="radio" name="method" value="delivery">
    <span class="choice__face">
      <span class="choice__name">We bring it</span>
      <span class="choice__meta">From ${money(Math.min(...merchant.delivery.zones.map((z) => z.fee)))}</span>
      <span class="choice__note">${esc(merchant.delivery.note)} Free over ${money(merchant.delivery.freeOver)}.</span>
    </span>
  </label>`;

/* The day, the window, and — for delivery — the postcode and address. All
   rendered here rather than written into the HTML, because which of them
   apply depends on the choice above. */
function paintMethodDetail() {
  $('[data-method-detail]').innerHTML = `
    <div class="when">
      <button class="btn btn--sm" type="button" data-pick-day>
        ${method === 'pickup' ? 'Choose the day and window' : 'Choose the day'}
      </button>
      <p class="num" data-day-label></p>
    </div>
    <p class="note" data-slot-label></p>
    ${
      method === 'delivery'
        ? `<div class="fields" style="margin-top:var(--s-4)">
             <label class="field">
               <span class="field__label label" for="co-postcode">Postcode</span>
               <span class="field__hint">We check it against where we actually drive.</span>
               <input class="input" id="co-postcode" type="text" autocomplete="postal-code" data-postcode>
               <span class="err" data-err-postcode></span>
             </label>
             <p class="note" data-zone hidden></p>
             <label class="field">
               <span class="field__label label" for="co-address">The address</span>
               <span class="field__hint">Including the flat or the floor, if there is one.</span>
               <textarea class="textarea" id="co-address" rows="3" autocomplete="street-address" data-address></textarea>
               <span class="err" data-err-address></span>
             </label>
           </div>`
        : ''
    }`;

  $('[data-pick-day]').addEventListener('click', () => {
    openDatePicker({
      // The basket has already settled the notice — every line in it is
      // ready by this date — so from here the diary only has to respect the
      // shop's own closures and capacity.
      leadDays: 0,
      selected: when,
      slot,
      withSlots: method === 'pickup',
      title: method === 'pickup' ? 'When will you collect it?' : 'When shall we bring it?',
      note:
        method === 'pickup'
          ? 'Someone has to be in the shop to hand it over, so pick a window too.'
          : 'We drive in the morning, boxed flat.',
      onSelect: (day, chosenSlot) => {
        when = day;
        slot = chosenSlot ?? null;
        paintWhen();
      },
    });
  });

  const postcode = $('[data-postcode]');
  postcode?.addEventListener('blur', checkPostcode);

  paintWhen();
}

function paintWhen() {
  $('[data-day-label]').textContent = dateLong(when);
  const slotEl = $('[data-slot-label]');
  if (method !== 'pickup') {
    slotEl.className = 'note';
    slotEl.innerHTML = `${icons.clock}<span>We bring it in the morning.</span>`;
  } else if (slot) {
    slotEl.className = 'note note--good';
    slotEl.innerHTML = `${icons.check}<span>Collecting between <strong>${esc(slot)}</strong>.</span>`;
  } else {
    // Required, and in a grey sentence it did not look like it.
    slotEl.className = 'note note--warn';
    slotEl.innerHTML = `${icons.alert}<span>Pick a collection window as well as a day.</span>`;
  }
  paintSummary();
}

form.addEventListener('change', (e) => {
  if (e.target.name !== 'method') return;
  method = e.target.value;
  if (method === 'delivery') slot = null;
  zone = null;
  paintMethodDetail();
  paintSummary();
});

/* Checked on blur. Per keystroke means five failed lookups on the way to a
   valid postcode, each one telling the customer they are wrong. */
async function checkPostcode() {
  const value = $('[data-postcode]').value.trim();
  const el = $('[data-zone]');
  if (!value) {
    zone = null;
    el.hidden = true;
    return;
  }

  el.hidden = false;
  el.className = 'note';
  el.innerHTML = `${icons.clock}<span>Checking…</span>`;

  const result = await api.checkDeliveryZone(value);
  if (result.ok) {
    zone = result.zone;
    const t = totals();
    el.className = 'note note--good';
    el.innerHTML = `${icons.check}<span><strong>${esc(zone.label)}.</strong>
      ${t.fulfilment === 0 ? 'Free on this order.' : `${money(zone.fee)} to bring it over.`}</span>`;
    setError('postcode', '');
  } else {
    zone = null;
    el.className = 'note note--warn';
    el.innerHTML = `${icons.alert}<span><strong>We do not drive out that far.</strong>
      ${esc(result.reason ?? '')} You can still collect from the shop.</span>`;
  }
  paintSummary();
}

/* -------------------------------------------------------------------------
   Gifting — §7, behind the capability flag per D15
   ------------------------------------------------------------------------- */
const giftCfg = merchant.gifting ?? {};

if (merchant.capabilities?.gifting) {
  $('[data-gift-note]').textContent = giftCfg.note ?? '';

  $('[data-is-gift]').addEventListener('change', (e) => {
    isGift = e.target.checked;
    // `hidden`, not a class, so the fields genuinely leave the tab order
    // when the branch is closed.
    $('[data-gift]').hidden = !isGift;
    paintGiftCards();
    paintSummary();
  });
} else {
  $('[data-gift-section]').hidden = true;
}

/**
 * What is already written, restated where the present is being addressed.
 *
 * This is the one place in checkout where the card appears, and it is a
 * reminder rather than an editor: somebody at this point is confirming, not
 * composing. The link back is there because they may disagree.
 */
function paintGiftCards() {
  const withCards = session.state.cart.lines.filter((l) => hasCard(l.meta?.card));
  const el = $('[data-gift-cards]');

  if (!withCards.length) {
    el.className = 'note note--warn';
    el.innerHTML = `${icons.card}<span>Nothing in this order has a card with it.
      <a href="${link('cart.html')}">Write one</a> — it is the part they keep, and it costs nothing.</span>`;
    return;
  }

  el.className = 'note';
  el.innerHTML = `${icons.card}<span><strong>${withCards.length} ${
    withCards.length === 1 ? 'card goes' : 'cards go'
  } in the box.</strong><br>${withCards
    .map((l) => esc(cardSummary(l.meta.card)))
    .join('<br>')}<br><a href="${link('cart.html')}">Change ${
    withCards.length === 1 ? 'it' : 'them'
  }</a></span>`;
}

/* -------------------------------------------------------------------------
   Paying — "relevant local payment methods"

   A wallet is only offered where the device would actually have one, rather
   than a button that cannot work.
   ------------------------------------------------------------------------- */
const supportsWallet = () => Boolean(window.ApplePaySession) || /Android/i.test(navigator.userAgent);

const methods = (merchant.payment?.methods ?? [{ id: 'card', label: 'Card' }]).filter(
  (m) => !m.deviceOnly || supportsWallet()
);

$('[data-pay-methods]').innerHTML =
  '<legend class="sr">How you want to pay</legend>' +
  methods
    .map(
      (m, i) => `
    <label class="choice">
      <input type="radio" name="paymethod" value="${esc(m.id)}" ${i === 0 ? 'checked' : ''}>
      <span class="choice__face">
        <span class="choice__name">${esc(m.label)}</span>
        <span class="choice__meta">${m.id === 'card' ? '' : 'Simulated'}</span>
        <span class="choice__note">${esc(m.note ?? '')}</span>
      </span>
    </label>`
    )
    .join('');

form.addEventListener('change', (e) => {
  if (e.target.name !== 'paymethod') return;
  payMethod = e.target.value;
  const isCard = payMethod === 'card';
  $('[data-card-fields]').hidden = !isCard;
  paintPayNote();
});

/** The allergen confirmation lives here, next to the money, where it is read. */
function paintPayNote() {
  const alt = methods.find((m) => m.id === payMethod);
  $('[data-pay-note]').innerHTML = `
    ${
      payMethod !== 'card'
        ? `<span class="note">${icons.info}<span><strong>${esc(alt.label)} is simulated here.</strong>
             In production this hands off and comes back with a token; the button below completes it.</span></span>`
        : ''
    }
    <label class="choice" style="margin-top:var(--s-3)">
      <input type="checkbox" data-agree ${agreed ? 'checked' : ''}>
      <span class="choice__face">
        <span class="choice__name">I have read the allergen notice</span>
        <span class="choice__note">${esc(merchant.allergenStatement)}</span>
      </span>
    </label>
    <span class="err" data-err-agree></span>`;

  $('[data-agree]').addEventListener('change', (e) => {
    agreed = e.target.checked;
    if (agreed) setError('agree', '');
  });
}

/* -------------------------------------------------------------------------
   Summary
   ------------------------------------------------------------------------- */
const totals = () =>
  orderTotals(session.state.cart.lines, merchant, catalogue, { method, zone });

function paintSummary() {
  $('[data-lines]').innerHTML = session.state.cart.lines
    .map((l) => {
      const p = session.product(l.productId);
      if (!p) return '';
      const price = priceOf(p, l.selections, l.addons, l.qty);
      const spec = describeSelections(p, l.selections, session.groups());
      const card = l.meta?.card;
      return `
        <div class="totals" style="margin-bottom:var(--s-4)">
          <div style="align-items:flex-start">
            <dt>
              <strong>${l.qty > 1 ? `${l.qty} × ` : ''}${esc(p.name)}</strong>
              ${spec ? `<br><span class="xs dim">${esc(spec)}</span>` : ''}
              ${hasCard(card) ? `<br><span class="xs" style="color:var(--blush)">${esc(cardSummary(card))}</span>` : ''}
            </dt>
            <dd class="num">${money(price.total)}</dd>
          </div>
        </div>`;
    })
    .join('');

  const t = totals();
  $('[data-totals]').innerHTML = `
    <div><dt>Subtotal</dt><dd class="num">${money(t.subtotal)}</dd></div>
    <div><dt>${method === 'delivery' ? 'Bringing it' : 'Collection'}</dt>
      <dd class="num">${t.fulfilment === 0 ? 'Free' : money(t.fulfilment)}</dd></div>
    <div class="totals__big"><dt>Total</dt><dd class="num">${money(t.total)}</dd></div>`;

  $('[data-tax]').textContent = t.tax
    ? `Includes ${money(t.tax)} VAT at ${Math.round((merchant.taxRate ?? 0) * 100)}%.`
    : merchant.taxNote;

  $('[data-pay]').textContent = `Pay ${money(t.total)}`;
}

/* -------------------------------------------------------------------------
   Validation. Each rule says what to do, not what is wrong.
   ------------------------------------------------------------------------- */
function setError(field, msg) {
  const el = $(`[data-err-${field}]`);
  if (el) el.innerHTML = msg ? `${icons.alert}<span>${esc(msg)}</span>` : '';
  const input = $(`[data-${field}]`);
  if (input && input.tagName !== 'SPAN') {
    if (msg) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
}

const RULES = {
  name: (v) => (v.trim().length >= 2 ? '' : 'We need a name for the order.'),
  email: (v) =>
    /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v.trim()) ? '' : 'Check the email — the receipt goes there.',
  phone: (v) => (v.replace(/\D/g, '').length >= 9 ? '' : 'A number we can reach you on.'),
  card: (v) => {
    const d = v.replace(/\D/g, '');
    return d.length >= 15 && d.length <= 19 ? '' : 'A card number is 15 or 16 digits.';
  },
  exp: (v) => (/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(v.trim()) ? '' : 'Month and year, like 04/29.'),
  cvc: (v) => (/^\d{3,4}$/.test(v.trim()) ? '' : 'The three digits on the back.'),
};

for (const field of Object.keys(RULES)) {
  const input = $(`[data-${field}]`);
  input?.addEventListener('blur', () => setError(field, RULES[field](input.value)));
  // Once a field is marked wrong, correcting it clears the mark at once
  // rather than waiting for another blur.
  input?.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true' && !RULES[field](input.value)) setError(field, '');
  });
}

function validate() {
  const problems = [];
  const CARD_FIELDS = ['card', 'exp', 'cvc'];

  for (const [field, rule] of Object.entries(RULES)) {
    if (CARD_FIELDS.includes(field) && payMethod !== 'card') {
      setError(field, '');
      continue;
    }
    const msg = rule($(`[data-${field}]`).value);
    setError(field, msg);
    if (msg) problems.push(field);
  }

  if (method === 'delivery') {
    if (!zone) {
      setError('postcode', 'We need a postcode we drive to, or switch to collecting it.');
      problems.push('postcode');
    }
    if ($('[data-address]').value.trim().length < 8) {
      setError('address', 'The full address, and which floor.');
      problems.push('address');
    }
  }

  if (method === 'pickup' && !slot) {
    problems.push('slot');
  }

  // A present going to someone else needs their name, and a driver needs a
  // number to ring when nobody answers the door.
  if (isGift) {
    if ($('[data-g-name]').value.trim().length < 2) problems.push('g-name');
    if (method === 'delivery' && $('[data-g-phone]').value.replace(/\D/g, '').length < 9)
      problems.push('g-phone');
  }

  if (!agreed) {
    setError('agree', 'Please confirm you have read the allergen notice.');
    problems.push('agree');
  }

  return problems;
}

/* -------------------------------------------------------------------------
   Placing it
   ------------------------------------------------------------------------- */
const payBtn = $('[data-pay]');
const failure = $('[data-failure]');
failure.tabIndex = -1;

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const problems = validate();
  if (problems.length) {
    const first = $(`[data-${problems[0]}]`) ?? $('[data-pick-day]');
    first?.focus();
    first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    toast({
      title: `${problems.length} ${problems.length === 1 ? 'thing needs' : 'things need'} a look`,
      detail: 'They are marked in the form.',
      tone: 'bad',
      icon: icons.alert,
    });
    return;
  }

  failure.hidden = true;
  payBtn.disabled = true;
  payBtn.setAttribute('aria-busy', 'true');
  const wasLabel = payBtn.textContent;
  payBtn.textContent = 'Taking the payment…';

  const t = totals();
  const order = {
    merchantId: merchant.id,
    fulfilment: {
      method,
      locationId: loc.id,
      date: dateKey(when),
      slot,
      zoneId: zone?.id ?? null,
    },
    customer: {
      name: $('[data-name]').value.trim(),
      email: $('[data-email]').value.trim(),
      phone: $('[data-phone]').value.trim(),
    },
    gift: isGift
      ? {
          isGift: true,
          recipient: {
            name: $('[data-g-name]').value.trim(),
            phone: $('[data-g-phone]').value.trim(),
          },
          hidePrices: true,
          packaging: Boolean(giftCfg.packagingAddon),
        }
      : { isGift: false },
    address: method === 'delivery' ? $('[data-address]').value.trim() : null,
    // Lines carry their cards on `meta`, verbatim. This is the one part of
    // the payload a person will read and copy out by hand.
    lines: session.state.cart.lines,
    totals: t,
    total: t.total,
    payment: { method: payMethod, card: payMethod === 'card' ? $('[data-card]').value : null },
  };

  try {
    const receipt = await api.placeOrder(order);

    // Written before the basket is cleared, so a failure between the two
    // loses neither.
    session.state.store.write('lastReceipt', {
      ...order,
      ...receipt,
      locationName: loc.name,
      locationAddress: loc.address,
      readyBy: dateKey(when),
      slot,
      method,
    });
    session.clear();
    location.href = link('confirmation.html');
  } catch (err) {
    payBtn.disabled = false;
    payBtn.removeAttribute('aria-busy');
    payBtn.textContent = wasLabel;

    failure.hidden = false;
    failure.innerHTML = `${icons.alert}<span><strong>${esc(err.message)}</strong><br>
      Nothing has been charged and nothing you typed has been lost — the basket, the day and
      every card are exactly as you left them. Try the same card again, or another one.</span>`;
    // Moved to, not just shown: on a long form the message would otherwise
    // appear off-screen above the button that was pressed.
    failure.focus();
    failure.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
});

paintMethodDetail();
paintPayNote();
paintGiftCards();
paintSummary();
