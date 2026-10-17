/**
 * @file Checkout.
 *
 * Decisions here come from the gifting and checkout research rather than
 * from taste, and each one is marked where it applies:
 *
 *  - Gift ordering is a branch of the form, not a checkbox at the end.
 *    Benchmarking found 46% of sites offer no gift flow at all and that
 *    participants abandoned orders when they could not mark one.
 *  - The recipient is a different person from the buyer, so their fields
 *    are their own group with their own labels.
 *  - Validation is on blur and on submit, never on every keystroke: telling
 *    somebody their email is wrong while they are still typing it is the
 *    most reliably irritating thing a form can do.
 *  - A declined card keeps every field. The order is rebuilt from state, so
 *    there is nothing to lose on a retry.
 */

import { startPage, $, $$, esc, link } from './_page.js';
import * as session from '../services/session.js';
import * as api from '../services/api.js';
import { openDatePicker } from '../components/datepicker.js';
import { icons } from '../components/icons.js';
import { toast } from '../components/toast.js';
import { money, whenPhrase, whenPhraseMid } from '../../../../shared/core/format.js';
import { describeSelections } from '../../../../shared/core/rules.js';
import { orderTotals } from '../../../../shared/core/pricing.js';
import { dateKey } from '../../../../shared/core/dates.js';
import { slotsFor } from '../../../../shared/core/fulfilment.js';

await startPage({ nav: null });

const { merchant, catalogue } = session.state;

// An empty basket has nothing to check out. Going back is more useful than a
// form that cannot be submitted.
if (!session.state.cart.lines.length) {
  location.replace(link('cart.html'));
}

$('[data-cart-link]').href = link('cart.html');
$('[data-chev]').innerHTML = icons.chevron;

/* -------------------------------------------------------------------------
   State
   ------------------------------------------------------------------------- */
let method = merchant.capabilities.pickup ? 'pickup' : 'delivery';
let zone = null;
let when = session.orderReadyBy() ?? session.state.when;
let slot = null;
let isGift = false;

const form = $('[data-form]');

/* -------------------------------------------------------------------------
   Collect or deliver
   ------------------------------------------------------------------------- */
const loc = merchant.locations[0];

$('[data-methods]').innerHTML = `
  <label class="method">
    <input type="radio" name="method" value="pickup" checked>
    <span class="method__face">
      <span class="method__name">Collect</span>
      <span class="method__meta">${esc(loc.name)}, ${esc(loc.address.split(',')[1]?.trim() ?? '')}</span>
      <span class="method__meta method__fee">Free</span>
    </span>
  </label>
  <label class="method">
    <input type="radio" name="method" value="delivery">
    <span class="method__face">
      <span class="method__name">We drive it</span>
      <span class="method__meta">${esc(merchant.delivery.note)}</span>
      <span class="method__meta method__fee">From ${money(Math.min(...merchant.delivery.zones.map((z) => z.fee)))}, free over ${money(merchant.delivery.freeOver)}</span>
    </span>
  </label>`;

$('[data-location]').innerHTML = `${icons.shop}<span><strong>${esc(loc.name)}</strong><br>
  ${esc(loc.address)}<br>${esc(loc.phone)}</span>`;

form.addEventListener('change', (e) => {
  if (e.target.name !== 'method') return;
  method = e.target.value;
  $('[data-pickup]').hidden = method !== 'pickup';
  $('[data-delivery]').hidden = method !== 'delivery';
  // The slot belongs to collection only — a delivery is a morning, not a
  // two-hour window the customer picks.
  if (method === 'delivery') slot = null;
  paintWhen();
  paintSummary();
});

/* -------------------------------------------------------------------------
   Postcode → zone. Checked on blur, because checking per keystroke means
   five failed lookups on the way to a valid postcode.
   ------------------------------------------------------------------------- */
const postcode = $('#postcode');

postcode.addEventListener('blur', async () => {
  const value = postcode.value.trim();
  const zoneEl = $('[data-zone]');
  if (!value) {
    zone = null;
    zoneEl.hidden = true;
    return;
  }

  zoneEl.hidden = false;
  zoneEl.className = 'note';
  zoneEl.innerHTML = `${icons.clock}<span>Checking…</span>`;

  const result = await api.checkDeliveryZone(value);

  if (result.ok) {
    zone = result.zone;
    zoneEl.className = 'note note--good';
    zoneEl.innerHTML = `${icons.check}<span><strong>${esc(zone.label)}.</strong>
      Delivery is ${money(zone.fee)}${
        orderTotals(session.state.cart.lines, merchant, catalogue, { method: 'delivery', zone }).fulfilment === 0
          ? ' — and free on this order'
          : ''
      }.</span>`;
    setError('postcode', '');
  } else {
    zone = null;
    zoneEl.className = 'note note--warn';
    zoneEl.innerHTML = `${icons.alert}<span><strong>We do not drive out that far.</strong>
      ${esc(result.reason ?? '')} You can still collect from ${esc(loc.name)}.</span>`;
  }
  paintSummary();
});

/* -------------------------------------------------------------------------
   When
   ------------------------------------------------------------------------- */
function paintWhen() {
  $('[data-day-label]').textContent = whenPhrase(when);
  $('[data-slot-label]').textContent =
    method === 'pickup'
      ? slot
        ? `between ${slot}`
        : 'Pick a collection window'
      : 'Delivered between 8am and midday';
  paintSummary();
}

$('[data-pick-day]').addEventListener('click', () => {
  openDatePicker({
    // The basket has already settled the lead time — every line in it is
    // ready by this date — so the picker only has to respect the shop's
    // own closures and capacity from here on.
    leadDays: 0,
    selected: when,
    slot,
    withSlots: method === 'pickup',
    title: method === 'pickup' ? 'When will you collect?' : 'When should we deliver?',
    note:
      method === 'pickup'
        ? 'Collection windows are two hours wide and have their own limits.'
        : 'We deliver in the morning, between 8am and midday.',
    onSelect: (day, chosenSlot) => {
      when = day;
      slot = chosenSlot ?? null;
      setError('when', '');
      paintWhen();
    },
  });
});

/* -------------------------------------------------------------------------
   Gifting
   ------------------------------------------------------------------------- */
$('[data-is-gift]').addEventListener('change', (e) => {
  isGift = e.target.checked;
  // `hidden` rather than a class, so the fields inside genuinely leave the
  // tab order when the branch is closed.
  $('[data-gift]').hidden = !isGift;
  paintSummary();
});

const message = $('#message');
message.addEventListener('input', () => {
  $('[data-msg-count]').textContent = `${message.value.length} / 200`;
  paintGiftCard();
});
$('#name').addEventListener('input', paintGiftCard);

function paintGiftCard() {
  const card = $('[data-giftcard]');
  const from = $('#name').value.trim();
  card.textContent = message.value;
  if (from) {
    const sig = document.createElement('span');
    sig.className = 'giftcard__from';
    sig.textContent = `— ${from}`;
    card.append(sig);
  }
}

/* -------------------------------------------------------------------------
   Summary
   ------------------------------------------------------------------------- */
const summaryBody = $('[data-summary-body]');
$('[data-summary-toggle]').addEventListener('click', (e) => {
  const open = e.currentTarget.getAttribute('aria-expanded') === 'true';
  e.currentTarget.setAttribute('aria-expanded', String(!open));
  summaryBody.hidden = open;
});
// Open by default on a desktop, where it costs nothing; closed on a phone,
// where it would push the first field below the fold.
if (window.matchMedia('(min-width: 60rem)').matches) {
  summaryBody.hidden = false;
  $('[data-summary-toggle]').setAttribute('aria-expanded', 'true');
}

function totals() {
  return orderTotals(session.state.cart.lines, merchant, catalogue, { method, zone });
}

function paintSummary() {
  const { cart } = session.state;

  $('[data-summary-lines]').innerHTML = cart.lines
    .map((l) => {
      const p = session.product(l.productId);
      if (!p) return '';
      const price = session.priceOf(p, l.selections, l.addons, l.qty);
      const spec = describeSelections(p, l.selections, session.groups());
      return `
        <div class="summary__line">
          <div>
            <p class="summary__name">${l.qty > 1 ? `${l.qty} × ` : ''}${esc(p.name)}</p>
            ${spec ? `<p class="summary__spec">${esc(spec)}</p>` : ''}
            ${l.inscription ? `<p class="summary__spec">&ldquo;${esc(l.inscription)}&rdquo;</p>` : ''}
          </div>
          <p class="money">${money(price.total)}</p>
        </div>`;
    })
    .join('');

  const t = totals();
  const deliveryRow =
    method === 'delivery'
      ? t.fulfilment === 0
        ? '<span class="money">Free</span>'
        : `<span class="money">${money(t.fulfilment)}</span>`
      : '<span class="money">Free</span>';

  $('[data-summary-totals]').innerHTML = `
    <div class="sum"><span>Cakes</span><span class="money">${money(t.subtotal)}</span></div>
    <div class="sum"><span>${method === 'delivery' ? 'Delivery' : 'Collection'}</span>${deliveryRow}</div>
    ${t.tax ? `<div class="sum"><span>VAT</span><span class="money">${money(t.tax)}</span></div>` : ''}
    <div class="sum sum--total"><span>Total</span><span class="money">${money(t.total)}</span></div>`;

  $('[data-peek]').textContent = money(t.total);

  $('[data-summary-when]').innerHTML = `${icons.calendar}<span>
    ${method === 'pickup' ? 'Collect' : 'Delivered'} <strong>${esc(whenPhraseMid(when))}</strong>${
      method === 'pickup' && slot ? `, between ${esc(slot)}` : ''
    }.</span>`;
}

/* -------------------------------------------------------------------------
   Validation
   ------------------------------------------------------------------------- */
function setError(field, msg) {
  const el = $(`[data-err-${field}]`);
  if (el) el.innerHTML = msg ? `${icons.alert}<span>${esc(msg)}</span>` : '';
  const input = $(`#${field}`);
  if (input) {
    msg ? input.setAttribute('aria-invalid', 'true') : input.removeAttribute('aria-invalid');
  }
}

/** Each rule says what to do, not what is wrong. */
const RULES = {
  name: (v) => (v.trim().length >= 2 ? '' : 'We need a name for the box.'),
  phone: (v) =>
    v.replace(/\D/g, '').length >= 10 ? '' : 'A mobile number, so we can reach you on the day.',
  email: (v) => (/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v.trim()) ? '' : 'Check the email address — the receipt goes there.'),
  card: (v) => {
    const digits = v.replace(/\D/g, '');
    return digits.length >= 15 && digits.length <= 19 ? '' : 'A card number is 15 or 16 digits.';
  },
  exp: (v) => (/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(v.trim()) ? '' : 'Month and year, like 04/29.'),
  cvc: (v) => (/^\d{3,4}$/.test(v.trim()) ? '' : 'The three digits on the back.'),
};

for (const field of Object.keys(RULES)) {
  const input = $(`#${field}`);
  input?.addEventListener('blur', () => setError(field, RULES[field](input.value)));
  // Once a field has been marked wrong, correcting it should clear the mark
  // immediately rather than waiting for another blur.
  input?.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true' && !RULES[field](input.value)) {
      setError(field, '');
    }
  });
}

function validate() {
  const problems = [];

  for (const [field, rule] of Object.entries(RULES)) {
    const input = $(`#${field}`);
    const msg = rule(input.value);
    setError(field, msg);
    if (msg) problems.push(field);
  }

  if (method === 'delivery') {
    if (!zone) {
      setError('postcode', 'We need a postcode we deliver to, or switch to collection.');
      problems.push('postcode');
    }
    if ($('#address').value.trim().length < 8) {
      setError('address', 'The full address, including the town.');
      problems.push('address');
    }
  }

  if (method === 'pickup' && !slot) {
    setError('when', 'Pick a collection window as well as a day.');
    problems.push('when');
  }

  if (!$('[data-terms]').checked) {
    setError('terms', 'Please confirm you have read the allergen notice.');
    problems.push('terms');
  }

  return problems;
}

/* -------------------------------------------------------------------------
   Placing it
   ------------------------------------------------------------------------- */
const payBtn = $('[data-pay]');
const payLabel = $('[data-pay-label]');
const failure = $('[data-failure]');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const problems = validate();
  if (problems.length) {
    const first = $(`#${problems[0]}`) ?? $('[data-pick-day]');
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
  payLabel.textContent = 'Taking the payment…';

  const t = totals();

  const order = {
    merchantId: merchant.id,
    fulfilment: { method, locationId: loc.id, date: dateKey(when), slot, zoneId: zone?.id ?? null },
    customer: {
      name: $('#name').value.trim(),
      email: $('#email').value.trim(),
      phone: $('#phone').value.trim(),
    },
    gift: isGift
      ? {
          isGift: true,
          message: message.value.trim(),
          from: $('#name').value.trim(),
          hidePrices: $('[data-hide-prices]').checked,
          recipient: { name: $('#to').value.trim(), phone: $('#tophone').value.trim() },
        }
      : { isGift: false },
    address: method === 'delivery' ? $('#address').value.trim() : null,
    lines: session.state.cart.lines,
    totals: t,
    total: t.total,
    payment: { card: $('#card').value },
  };

  try {
    const receipt = await api.placeOrder(order);

    // Written before the basket is cleared, so a failure between the two
    // leaves the basket intact rather than losing both.
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
    payLabel.textContent = 'Try that again';

    failure.hidden = false;
    failure.innerHTML = `${icons.alert}<span>
      <strong>${esc(err.message)}</strong><br>
      Nothing has been charged and nothing you typed has been lost. Try the same card again,
      or use another one — your basket and your date are exactly as you left them.</span>`;
    // Moved to, not just shown: on a long form the message would otherwise
    // appear off-screen above the button that was pressed.
    failure.focus();
    failure.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
});

paintWhen();
paintSummary();
paintGiftCard();
