/**
 * @file Checkout.
 *
 * Collection only — `capabilities.delivery` is false for this merchant and
 * a delivery control that cannot be chosen is worse than none.
 *
 * The payment is simulated in `services/api.js`, which is the swappable
 * seam: `4000 0000 0000 0002` always declines and `4000 0000 0000 0119`
 * always fails to reach the provider, so both recovery paths can be shown
 * rather than described.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter } from '../components/chrome.js';
import { esc, seasonBlocker } from '../components/calendar.js';
import * as api from '../services/api.js';
import { orderTotals } from '../../../../shared/core/pricing.js';
import { slotsFor, dayState } from '../../../../shared/core/fulfilment.js';
import { dateKey, today as startOfToday } from '../../../../shared/core/dates.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader();
renderFooter();

const { merchant, catalogue } = session.state;

const money = (n) =>
  new Intl.NumberFormat(merchant.locale, {
    style: 'currency',
    currency: merchant.currency,
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);

const longDate = (d) =>
  new Intl.DateTimeFormat(merchant.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);

/* -------------------------------------------------------------------------
   Guard: a basket that cannot be paid for

   Somebody can land here on a stale tab, or with a collection day that has
   since gone past. Sending them to the basket with the reason beats a form
   that fails on submit.
   ------------------------------------------------------------------------- */
const { lines } = session.state.cart;

$('[data-order]').hidden = lines.length === 0;
$('[data-empty]').hidden = lines.length > 0;

if (lines.length) {
  const when = session.state.when ?? startOfToday();
  const lead = Math.max(
    0,
    ...lines.map((l) => {
      const p = session.product(l.productId);
      return p ? session.leadFor(p, l.selections) : 0;
    })
  );

  /* The same two questions the basket asks. Somebody can reach this page on
     a stale tab whose day has since gone past, or by editing the URL. */
  const blocked =
    dayState(merchant, when, lead) !== 'available' ||
    seasonBlocker(lines, { merchant, products: catalogue.products, when });

  if (blocked) {
    location.replace('basket.html');
  } else {
    render(when);
  }
}

/* -------------------------------------------------------------------------
   Render
   ------------------------------------------------------------------------- */
function render(when) {
  $('[data-when-day]').textContent = longDate(when);
  $('[data-where]').textContent = session.location().address;

  /* Slots. A full one is shown and disabled rather than hidden: "that time
     has gone" is information, and a list that silently shrinks makes people
     think they misread it. */
  const slots = slotsFor(merchant, session.location(), when);
  $('[data-slots]').innerHTML = slots
    .map(
      (s, i) => `
        <label class="slot">
          <input type="radio" name="slot" value="${esc(s.time)}"
                 ${s.full ? 'disabled' : ''} ${i === 0 && !s.full ? 'checked' : ''}>
          <span class="slot__time">${esc(s.time)}</span>
          <span class="slot__left sm">${s.full ? 'Full' : `${s.left} left`}</span>
        </label>`
    )
    .join('');

  $('[data-sum]').innerHTML = lines
    .map((l) => {
      const p = session.product(l.productId);
      if (!p) return '';
      const price = session.priceOf(p, l.selections, l.addons, l.qty);
      return `
        <li class="sum__row">
          <span class="sum__n num">${esc(String(l.qty))}×</span>
          <span class="sum__name" lang="ca">${esc(p.name)}</span>
          <span class="sum__price money">${esc(money(price.total))}</span>
        </li>`;
    })
    .join('');

  const t = orderTotals(lines, merchant, catalogue, { method: 'pickup' });
  $('[data-totals]').innerHTML = `
    <div class="totals__row totals__row--sum">
      <dt>To pay</dt>
      <dd class="money">${esc(money(t.total))}</dd>
    </div>`;

  $('[data-tax]').textContent = t.taxIncluded
    ? `${money(t.total)} includes ${money(t.tax)} VAT. ${merchant.taxNote}`
    : merchant.taxNote;

  $('[data-card-hint]').textContent =
    'Nothing is charged — this is a demonstration. 4242 4242 4242 4242 goes through; 4000 0000 0000 0002 is declined.';
}

/* -------------------------------------------------------------------------
   Validation

   Said in words, next to the field, and the field keeps focus order. No
   colour-only signalling and no alert().
   ------------------------------------------------------------------------- */
const RULES = {
  name: (v) => (v.trim().length >= 2 ? null : 'We need a name to call out.'),
  phone: (v) =>
    v.replace(/[^\d]/g, '').length >= 6 ? null : 'A number we can actually reach you on.',
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : "That email does not look right."),
  card: (v) => (v.replace(/\s+/g, '').length >= 15 ? null : 'A full card number, please.'),
};

function complain(field, message) {
  const el = $(`[data-bad-for="${field}"]`);
  const input = document.getElementById(field);
  if (!el || !input) return;

  el.textContent = message ?? '';
  el.hidden = !message;
  input.closest('.field')?.classList.toggle('field--bad', Boolean(message));
  input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function validate(form) {
  let first = null;

  for (const [field, rule] of Object.entries(RULES)) {
    const message = rule(form[field].value);
    complain(field, message);
    if (message && !first) first = form[field];
  }

  const slot = form.querySelector('input[name="slot"]:checked');
  const slotBad = $('[data-slot-bad]');
  slotBad.textContent = slot ? '' : 'Pick a time.';
  slotBad.hidden = Boolean(slot);
  if (!slot && !first) first = form.querySelector('input[name="slot"]:not(:disabled)');

  return { ok: !first, first, slot };
}

/* -------------------------------------------------------------------------
   Submit
   ------------------------------------------------------------------------- */
const form = $('[data-pay]');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const { ok, first, slot } = validate(form);
  if (!ok) {
    first?.focus();
    return;
  }

  const button = $('[data-submit]');
  const label = button.textContent;
  button.disabled = true;
  button.textContent = 'Sending…';
  $('[data-declined]').innerHTML = '';

  const when = session.state.when ?? startOfToday();
  const t = orderTotals(lines, merchant, catalogue, { method: 'pickup' });

  try {
    const receipt = await api.placeOrder({
      merchantId: merchant.id,
      fulfilment: {
        method: 'pickup',
        locationId: session.location().id,
        date: dateKey(when),
        slot: slot.value,
      },
      customer: {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
      },
      note: form.note.value.trim(),
      lines: lines.map((l) => ({
        productId: l.productId,
        selections: l.selections,
        addons: l.addons,
        qty: l.qty,
      })),
      payment: { card: form.card.value },
      total: t.total,
    });

    /* The basket is cleared only once the order actually exists. Clearing it
       before the call means a declined card leaves somebody with nothing. */
    session.clear();

    const q = new URLSearchParams({
      ref: receipt.reference,
      when: dateKey(when),
      slot: slot.value,
    });
    location.href = `confirmation.html?${q}`;
  } catch (err) {
    $('[data-declined]').innerHTML = `
      <div class="declined" role="alert">
        <p class="declined__head">That did not go through.</p>
        <p>${esc(err.message)}</p>
        <p>Your basket is where you left it.</p>
      </div>`;
    $('[data-declined]').scrollIntoView({ block: 'nearest' });
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
});

/* Clear a complaint as soon as the field is fixed, rather than waiting for
   another submit to tell them they got it right. */
form?.addEventListener('input', (e) => {
  const field = e.target.name;
  if (RULES[field]) complain(field, RULES[field](e.target.value));
});
