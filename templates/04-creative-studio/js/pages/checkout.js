/**
 * @file Checkout.
 *
 * Structurally the same as the other templates' — guest by default, errors
 * on blur and on submit, a payment that can genuinely fail — with one thing
 * that is this template's own: a commission order takes a deposit. What is
 * charged now and what is owed later are both named, in the summary and on
 * the button, because "pay €957" when €287.10 is leaving the account is a
 * lie the customer finds out about on their statement.
 *
 * There is deliberately no gifting branch here. Template 02 owns that, this
 * merchant's config has `gifting: false`, and bolting it on would be
 * duplicating another template's best idea for the sake of a longer form.
 */

import { startPage, $, esc, link } from './_page.js';
import * as session from '../services/session.js';
import * as api from '../services/api.js';
import { orderTotalsWith } from '../commission.js';
import { priceLine } from '../../../../shared/core/pricing.js';
import { priceOf } from '../components/pieces.js';
import { openDatePicker } from '../components/datepicker.js';
import { toast } from '../components/toast.js';
import { icons } from '../components/icons.js';
import { money, dateLong } from '../../../../shared/core/format.js';
import { describeSelections } from '../../../../shared/core/rules.js';
import { dateKey } from '../../../../shared/core/dates.js';

await startPage({ nav: null });

const { merchant, catalogue } = session.state;

// An empty basket has nothing to check out, and going back is more useful
// than a form that cannot be submitted.
if (!session.state.cart.lines.length) location.replace(link('cart.html'));

$('[data-cart-link]').href = link('cart.html');
$('[data-terms-note]').textContent = merchant.allergenStatement;

let method = 'pickup';
let zone = null;
let when = session.orderReadyBy() ?? session.state.when;
let slot = null;

const form = $('[data-form]');
const loc = merchant.locations[0];

/* -------------------------------------------------------------------------
   Collect or deliver
   ------------------------------------------------------------------------- */
$('[data-methods]').innerHTML = `
  <legend class="sr">How you want it</legend>
  <label class="choice">
    <input type="radio" name="method" value="pickup" checked>
    <span class="choice__face">
      <span class="choice__name">Collect</span>
      <span class="choice__meta">Free</span>
      <span class="choice__note">${esc(loc.name)}, ${esc(loc.address)}</span>
    </span>
  </label>
  <label class="choice">
    <input type="radio" name="method" value="delivery">
    <span class="choice__face">
      <span class="choice__name">We drive it</span>
      <span class="choice__meta">From ${money(Math.min(...merchant.delivery.zones.map((z) => z.fee)))}</span>
      <span class="choice__note">${esc(merchant.delivery.note)} Free over ${money(merchant.delivery.freeOver)}.</span>
    </span>
  </label>`;

$('[data-location]').innerHTML = `${icons.info}<span><strong>${esc(loc.name)}</strong><br>
  ${esc(loc.address)}<br>${esc(loc.phone)}</span>`;

form.addEventListener('change', (e) => {
  if (e.target.name !== 'method') return;
  method = e.target.value;
  $('[data-pickup]').hidden = method !== 'pickup';
  $('[data-delivery]').hidden = method !== 'delivery';
  if (method === 'delivery') slot = null;
  paintWhen();
  paintSummary();
});

/* -------------------------------------------------------------------------
   Postcode. Checked on blur — per keystroke means five failed lookups on
   the way to a valid postcode.
   ------------------------------------------------------------------------- */
$('#postcode').addEventListener('blur', async () => {
  const value = $('#postcode').value.trim();
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
    const t = orderTotalsWith(priceLine, session.state.cart.lines, merchant, catalogue, { method: 'delivery', zone });
    el.className = 'note note--good';
    el.innerHTML = `${icons.check}<span><strong>${esc(zone.label)}.</strong>
      ${t.fulfilment === 0 ? 'Free on this order.' : `${money(zone.fee)} to drive it over.`}</span>`;
    setError('postcode', '');
  } else {
    zone = null;
    el.className = 'note note--warn';
    el.innerHTML = `${icons.alert}<span><strong>We do not drive out that far.</strong>
      ${esc(result.reason ?? '')} You can still collect from the studio.</span>`;
  }
  paintSummary();
});

/* -------------------------------------------------------------------------
   When
   ------------------------------------------------------------------------- */
function paintWhen() {
  $('[data-day-label]').textContent = dateLong(when);
  $('[data-slot-label]').textContent =
    method === 'pickup' ? (slot ? `between ${slot}` : 'Pick a collection window') : 'We bring it in the morning';
  paintSummary();
}

$('[data-pick-day]').addEventListener('click', () => {
  openDatePicker({
    // The basket has already settled the bench time — every line in it is
    // ready by this date — so from here the diary only has to respect the
    // studio's own closures and capacity.
    leadDays: 0,
    selected: when,
    slot,
    withSlots: method === 'pickup',
    title: method === 'pickup' ? 'When will you collect?' : 'When shall we bring it?',
    note:
      method === 'pickup'
        ? 'Two-hour windows. Someone has to be at the bench to hand it over.'
        : 'Mornings, driven flat and level.',
    onSelect: (day, chosenSlot) => {
      when = day;
      slot = chosenSlot ?? null;
      setError('when', '');
      paintWhen();
    },
  });
});

/* -------------------------------------------------------------------------
   Summary
   ------------------------------------------------------------------------- */
const totals = () =>
  orderTotalsWith(priceLine, session.state.cart.lines, merchant, catalogue, { method, zone });

function paintSummary() {
  const { cart } = session.state;

  $('[data-summary-lines]').innerHTML = cart.lines
    .map((l) => {
      const p = session.product(l.productId);
      if (!p) return '';
      const price = priceOf(p, l.selections, l.addons, l.qty);
      const spec = p.kind === 'commission'
        ? `${price.commission.leadDays} days on the bench`
        : describeSelections(p, l.selections, session.groups());
      return `
        <div class="sum" style="align-items:flex-start">
          <span>
            <strong>${l.qty > 1 ? `${l.qty} × ` : ''}${esc(p.name)}</strong>
            ${spec ? `<br><span class="xs dim">${esc(spec)}</span>` : ''}
          </span>
          <span class="num">${money(price.total)}</span>
        </div>`;
    })
    .join('');

  const t = totals();
  $('[data-summary-totals]').innerHTML = `
    <div class="sum"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
    <div class="sum"><span>${method === 'delivery' ? 'Delivery' : 'Collection'}</span>
      <span>${t.fulfilment === 0 ? 'Free' : money(t.fulfilment)}</span></div>
    <div class="sum"><span>VAT at ${Math.round((merchant.taxRate ?? 0) * 100)}%</span><span>${money(t.tax)}</span></div>
    <div class="sum sum--total"><span>Total</span><span>${money(t.total)}</span></div>
    ${
      t.hasCommission
        ? `<div class="sum sum--due" style="margin-top:var(--s-3)"><span>Taken now</span><span>${money(t.dueNow)}</span></div>
           <div class="sum"><span>On collection</span><span>${money(t.dueLater)}</span></div>`
        : ''
    }`;

  $('[data-summary-when]').innerHTML = `${icons.calendar}<span>
    ${method === 'pickup' ? 'Collect' : 'Delivered'} <strong>${esc(dateLong(when))}</strong>${
      method === 'pickup' && slot ? `, between ${esc(slot)}` : ''
    }.</span>`;

  $('[data-pay-label]').textContent = t.hasCommission
    ? `Pay the deposit — ${money(t.dueNow)}`
    : `Pay ${money(t.total)}`;
}

/* -------------------------------------------------------------------------
   Validation
   ------------------------------------------------------------------------- */
function setError(field, msg) {
  const el = $(`[data-err-${field}]`);
  if (el) el.innerHTML = msg ? `${icons.alert}<span>${esc(msg)}</span>` : '';
  const input = $(`#${field}`);
  if (input) msg ? input.setAttribute('aria-invalid', 'true') : input.removeAttribute('aria-invalid');
}

/** Each rule says what to do, not what is wrong. */
const RULES = {
  name: (v) => (v.trim().length >= 2 ? '' : 'We need a name for the job sheet.'),
  email: (v) => (/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(v.trim()) ? '' : 'Check the email — the spec sheet goes there.'),
  phone: (v) => (v.replace(/\D/g, '').length >= 9 ? '' : 'A number we can reach you on.'),
  card: (v) => {
    const d = v.replace(/\D/g, '');
    return d.length >= 15 && d.length <= 19 ? '' : 'A card number is 15 or 16 digits.';
  },
  exp: (v) => (/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(v.trim()) ? '' : 'Month and year, like 04/29.'),
  cvc: (v) => (/^\d{3,4}$/.test(v.trim()) ? '' : 'The three digits on the back.'),
};

for (const field of Object.keys(RULES)) {
  const input = $(`#${field}`);
  input?.addEventListener('blur', () => setError(field, RULES[field](input.value)));
  // Once a field is marked wrong, correcting it clears the mark at once
  // rather than waiting for another blur.
  input?.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true' && !RULES[field](input.value)) setError(field, '');
  });
}

function validate() {
  const problems = [];

  for (const [field, rule] of Object.entries(RULES)) {
    const msg = rule($(`#${field}`).value);
    setError(field, msg);
    if (msg) problems.push(field);
  }

  if (method === 'delivery') {
    if (!zone) {
      setError('postcode', 'We need a postcode we drive to, or switch to collection.');
      problems.push('postcode');
    }
    if ($('#address').value.trim().length < 8) {
      setError('address', 'The full address, and which floor.');
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
  const wasLabel = payLabel.textContent;
  payLabel.textContent = 'Taking the payment…';

  const t = totals();
  const order = {
    merchantId: merchant.id,
    fulfilment: { method, locationId: loc.id, date: dateKey(when), slot, zoneId: zone?.id ?? null },
    customer: { name: $('#name').value.trim(), email: $('#email').value.trim(), phone: $('#phone').value.trim() },
    address: method === 'delivery' ? $('#address').value.trim() : null,
    lines: session.state.cart.lines,
    totals: t,
    total: t.total,
    payment: { card: $('#card').value },
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
    payLabel.textContent = wasLabel;

    failure.hidden = false;
    failure.innerHTML = `${icons.alert}<span><strong>${esc(err.message)}</strong><br>
      Nothing has been charged and nothing you typed has been lost. Try the same card again
      or use another one — the basket and the date are exactly as you left them.</span>`;
    // Moved to, not just shown: on a long form the message would otherwise
    // appear off-screen above the button that was pressed.
    failure.focus();
    failure.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
});

paintWhen();
paintSummary();
