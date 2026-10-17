/**
 * @file Checkout. Guest by default, totals transparent from the first paint,
 * errors summarised at the top and marked on the field, and a payment step
 * that can genuinely fail so the recovery path is real.
 */

import { startPage, $, $$, esc } from './_page.js';
import * as session from '../services/session.js';
import * as api from '../services/api.js';
import { renderTicket } from '../components/ticket.js';
import { toast } from '../components/toast.js';
import { icons } from '../components/icons.js';
import { money, moneyExact, whenPhrase } from '../core/format.js';
import { orderTotals } from '../core/pricing.js';
import { slotsFor } from '../core/fulfilment.js';
import { dateKey } from '../core/dates.js';

await startPage({ nav: null, mobileTicket: false });

const { merchant, catalogue } = session.state;
const q = new URLSearchParams(location.search).get('merchant');
const qs = q ? `?merchant=${q}` : '';
$$('[data-shop-link]').forEach((a) => (a.href = `shop.html${qs}`));

if (!session.state.cart.lines.length) {
  $('[data-empty]').hidden = false;
} else {
  run();
}

function run() {
  $('[data-checkout]').hidden = false;
  const form = $('#order');

  const state = {
    method: merchant.capabilities.pickup ? 'pickup' : 'delivery',
    locationId: session.state.locationId,
    zone: null,
    slot: null,
    gift: false,
  };

  const when = session.orderReadyBy();

  $('[data-allergen-statement]').innerHTML = `${icons.info} <span>${esc(merchant.allergenStatement)}</span>`;

  /* --- 1. method ------------------------------------------------------- */
  const methods = [];
  if (merchant.capabilities.pickup) {
    methods.push({
      id: 'pickup',
      name: 'Collect from the shop',
      note: merchant.locations.length > 1 ? 'Choose which shop and a time' : 'Choose a time window',
      price: 'Free',
    });
  }
  if (merchant.capabilities.delivery && merchant.delivery) {
    methods.push({
      id: 'delivery',
      name: 'Local delivery',
      note: merchant.delivery.note,
      price: `From ${money(merchant.delivery.zones[0].fee)} · free over ${money(merchant.delivery.freeOver)}`,
    });
  }

  $('[data-methods]').insertAdjacentHTML(
    'beforeend',
    methods
      .map(
        (m) => `
      <label class="opt">
        <input type="radio" name="method" value="${m.id}" ${m.id === state.method ? 'checked' : ''}>
        <span class="opt__mark" aria-hidden="true"></span>
        <span class="opt__body">
          <span class="opt__name">${esc(m.name)}</span>
          <span class="opt__note">${esc(m.note)}</span>
        </span>
        <span class="opt__price">${esc(m.price)}</span>
      </label>`
      )
      .join('')
  );

  $('[data-methods]').addEventListener('change', (e) => {
    const r = e.target.closest('input[name="method"]');
    if (!r) return;
    state.method = r.value;
    state.slot = null;
    paint();
  });

  /* --- locations (only when there is a choice) -------------------------- */
  if (merchant.locations.length > 1) {
    $('[data-locations]').hidden = false;
    $('[data-loc]').innerHTML = merchant.locations
      .map((l) => `<option value="${l.id}">${esc(l.name)} — ${esc(l.address)}</option>`)
      .join('');
    $('[data-loc]').value = state.locationId;
    $('[data-loc]').addEventListener('change', (e) => {
      state.locationId = e.target.value;
      state.slot = null;
      session.setLocation(e.target.value);
      paint();
    });
  }

  /* --- delivery zone check --------------------------------------------- */
  $('[data-check-zone]')?.addEventListener('click', checkZone);
  $('#postcode')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      checkZone();
    }
  });

  async function checkZone() {
    const value = $('#postcode').value;
    const out = $('[data-zone-result]');
    out.innerHTML = `<p class="sm">Checking…</p>`;

    const res = await api.checkDeliveryZone(value);
    const field = $('[data-postcode-field]');

    if (res.ok) {
      state.zone = res.zone;
      field.dataset.invalid = 'false';
      $('[data-address-field]').hidden = false;
      out.innerHTML = `<p class="note">${icons.check}
        <span>We deliver to <strong>${esc(res.zone.label)}</strong> — ${money(res.zone.fee)},
        free over ${money(merchant.delivery.freeOver)}.</span></p>`;
    } else {
      state.zone = null;
      $('[data-address-field]').hidden = true;
      out.innerHTML = `<p class="note note--bad">${icons.alert}
        <span>${esc(res.reason)}</span></p>`;
    }
    paint();
  }

  /* --- slots ------------------------------------------------------------ */
  function paintSlots() {
    const loc = merchant.locations.find((l) => l.id === state.locationId) ?? merchant.locations[0];
    const slots = slotsFor(merchant, loc, when);

    $('[data-slot-day]').textContent = whenPhrase(when);
    $('[data-slots]').innerHTML =
      `<legend class="vh">Collection time</legend>` +
      slots
        .map(
          (s) => `
        <label class="slot">
          <input type="radio" name="slot" value="${esc(s.time)}" ${s.full ? 'disabled' : ''}
            ${state.slot === s.time ? 'checked' : ''}>
          <span class="slot__time">${esc(s.time)}</span>
          <span class="slot__left">${s.full ? 'Full' : `${s.left} left`}</span>
        </label>`
        )
        .join('');
  }

  $('[data-slots]').addEventListener('change', (e) => {
    const r = e.target.closest('input[name="slot"]');
    if (!r) return;
    state.slot = r.value;
    $('[data-slot-error]').textContent = '';
    $('[data-slot-error]').style.display = 'none';
  });

  /* --- gifting ---------------------------------------------------------- */
  if (merchant.capabilities.gifting) {
    $('[data-gift-block]').hidden = false;
    const toggle = $('[data-gift-toggle]');
    toggle.addEventListener('change', () => {
      state.gift = toggle.checked;
      $('[data-gift-fields]').hidden = !toggle.checked;
    });
    $('#giftmsg').addEventListener('input', (e) => {
      $('[data-gift-count]').textContent = String(e.target.value.length);
    });
  }

  /* --- totals ----------------------------------------------------------- */
  function totals() {
    return orderTotals(session.state.cart.lines, merchant, catalogue, {
      method: state.method,
      zone: state.zone,
    });
  }

  function paint() {
    const isPickup = state.method === 'pickup';
    $('[data-delivery]').hidden = isPickup;
    $('[data-slots-block]').hidden = !isPickup;
    if (isPickup) paintSlots();

    const t = totals();
    $('[data-submit-total]').textContent = moneyExact(t.total);

    $('[data-day-note]').innerHTML = `${icons.clock} <span><strong>Everything is ready
      ${esc(whenPhrase(when))}.</strong> That's set by whatever on the ticket needs the most
      notice — change it in <a class="link" href="cart.html${qs}">your ticket</a>.</span>`;

    renderTicket($('[data-ticket]'), { showActions: false, showTotal: false });

    // Fulfilment and tax restated beside the ticket, so the total is never a
    // surprise at the moment of paying.
    const rows = [
      [isPickup ? 'Collection' : 'Delivery', t.fulfilment === 0 ? 'Free' : moneyExact(t.fulfilment)],
    ];
    if (t.tax > 0) rows.push(['Tax', moneyExact(t.tax)]);

    $('[data-fulfilment-sum]').innerHTML = `
      <div class="ticket">
        <div class="ticket__body">
          ${rows
            .map(([k, v]) => `<div class="ticket__sum"><span>${esc(k)}</span><span class="money">${esc(v)}</span></div>`)
            .join('')}
          ${t.tax === 0 && merchant.taxNote ? `<p class="sm" style="margin-top:var(--s-2)">${esc(merchant.taxNote)}</p>` : ''}
          <div class="ticket__total">
            <span>Total</span><strong class="money">${moneyExact(t.total)}</strong>
          </div>
          ${
            state.method === 'delivery' && t.freeDeliveryGap > 0
              ? `<p class="ticket__when">${moneyExact(t.freeDeliveryGap)} more for free delivery.</p>`
              : ''
          }
        </div>
      </div>`;
  }

  /* --- validation ------------------------------------------------------- */
  const RULES = {
    name: (v) => (v.trim() ? null : 'Tell us a name for the bag.'),
    phone: (v) =>
      v.replace(/\D/g, '').length >= 7 ? null : 'We need a number we can reach you on.',
    email: (v) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'Check the email address.',
    card: (v) =>
      v.replace(/\s/g, '').length >= 15 ? null : 'Enter the long number on the card.',
    expiry: (v) => (/^\d{2}\s*\/?\s*\d{2}$/.test(v.trim()) ? null : 'Use MM / YY.'),
    cvc: (v) => (/^\d{3,4}$/.test(v.trim()) ? null : 'Three or four digits.'),
  };

  function validate() {
    const problems = [];

    for (const [name, rule] of Object.entries(RULES)) {
      const input = form.elements[name];
      const field = input?.closest('[data-field]');
      if (!input || !field) continue;
      const msg = rule(input.value);
      field.dataset.invalid = String(Boolean(msg));
      const err = field.querySelector('[data-error]');
      if (err) err.innerHTML = msg ? `${icons.alert}<span>${esc(msg)}</span>` : '';
      if (msg) problems.push({ id: input.id, label: field.querySelector('label span').textContent, msg });
    }

    if (state.method === 'pickup' && !state.slot) {
      const el = $('[data-slot-error]');
      el.style.display = 'flex';
      el.innerHTML = `${icons.alert}<span>Choose a collection time.</span>`;
      problems.push({ id: 'postcode', label: 'Collection time', msg: 'Choose a collection time.' });
    }

    if (state.method === 'delivery') {
      if (!state.zone) {
        problems.push({ id: 'postcode', label: 'Postcode', msg: 'Check your postcode first.' });
        $('[data-postcode-field]').dataset.invalid = 'true';
        $('[data-postcode-error]').innerHTML = `${icons.alert}<span>Check your postcode first.</span>`;
      }
      const addr = form.elements.address;
      if (state.zone && !addr.value.trim()) {
        problems.push({ id: 'address', label: 'Address', msg: 'We need somewhere to bring it.' });
        $('[data-address-field]').dataset.invalid = 'true';
        $('[data-address-error]').innerHTML = `${icons.alert}<span>We need somewhere to bring it.</span>`;
      }
    }

    const summary = $('[data-summary]');
    if (problems.length) {
      summary.hidden = false;
      summary.innerHTML = `
        <div class="note note--bad" style="margin-bottom:var(--s-4)">
          ${icons.alert}
          <div>
            <p><strong>${problems.length} thing${problems.length === 1 ? '' : 's'} to fix before we can take this:</strong></p>
            <ul style="margin-top:var(--s-2);list-style:disc;padding-left:1.1rem">
              ${problems.map((p) => `<li><a class="link" href="#${p.id}">${esc(p.label)}</a> — ${esc(p.msg)}</li>`).join('')}
            </ul>
          </div>
        </div>`;
      summary.focus();
      summary.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else {
      summary.hidden = true;
      summary.innerHTML = '';
    }

    return problems.length === 0;
  }

  // Clear a field's error as soon as it is corrected.
  form.addEventListener('input', (e) => {
    const field = e.target.closest('[data-field][data-invalid="true"]');
    if (!field) return;
    const rule = RULES[e.target.name];
    if (rule && !rule(e.target.value)) {
      field.dataset.invalid = 'false';
      field.querySelector('[data-error]').innerHTML = '';
    }
  });

  /* --- submit ----------------------------------------------------------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    $('[data-payment-error]').innerHTML = '';

    if (!validate()) {
      toast({ title: 'Some details are missing', detail: 'They are listed at the top.', tone: 'bad' });
      return;
    }

    const btn = $('[data-place]');
    btn.disabled = true;
    btn.dataset.pending = 'true';
    btn.innerHTML = `<span class="spinner" aria-hidden="true"></span> Taking your order…`;

    const data = Object.fromEntries(new FormData(form).entries());
    const t = totals();
    const loc = merchant.locations.find((l) => l.id === state.locationId) ?? merchant.locations[0];

    try {
      const receipt = await api.placeOrder({
        merchantId: merchant.id,
        fulfilment: {
          method: state.method,
          locationId: loc.id,
          date: dateKey(when),
          slot: state.slot,
          zone: state.zone?.id ?? null,
          address: data.address ?? null,
          postcode: data.postcode ?? null,
        },
        customer: { name: data.name, email: data.email, phone: data.phone },
        gift: state.gift
          ? {
              isGift: true,
              message: data.giftMessage ?? '',
              recipientName: data.recipientName ?? '',
              hidePrices: Boolean(data.hidePrices),
            }
          : { isGift: false },
        notes: data.notes ?? '',
        lines: session.state.cart.lines,
        total: t.total,
        payment: { card: data.card },
      });

      // Keep a copy for the confirmation page and for "order it again".
      session.state.store.write('lastReceipt', {
        ...receipt,
        totals: t,
        method: state.method,
        slot: state.slot,
        locationName: loc.name,
        locationAddress: loc.address,
        address: data.address ?? null,
        readyBy: dateKey(when),
        customer: { name: data.name, email: data.email, phone: data.phone },
        notes: data.notes ?? '',
        gift: state.gift ? { message: data.giftMessage ?? '' } : null,
        lines: session.state.cart.lines,
      });
      session.state.store.write('lastOrder', { lines: session.state.cart.lines });

      session.clear();
      location.href = `confirmation.html${qs}`;
    } catch (err) {
      btn.disabled = false;
      btn.dataset.pending = 'false';
      btn.innerHTML = `Try again — <span data-submit-total>${moneyExact(t.total)}</span>`;

      // The basket is untouched. Say that explicitly — it is the thing the
      // customer is most worried about at this moment.
      $('[data-payment-error]').innerHTML = `
        <div class="note note--bad" style="margin-bottom:var(--s-4)">
          ${icons.alert}
          <div>
            <p><strong>${esc(err.message)}</strong></p>
            <p style="margin-top:var(--s-2)">Your ticket is exactly as you left it and nothing has
            been charged. Try a different card, or call us on
            <a class="link" href="tel:${esc(loc.phone.replace(/[^0-9+]/g, ''))}">${esc(loc.phone)}</a>.</p>
          </div>
        </div>`;
      $('[data-payment-error]').scrollIntoView({ block: 'center', behavior: 'smooth' });
      toast({ title: 'Payment not taken', detail: err.message, tone: 'bad' });
    }
  });

  paint();
}
