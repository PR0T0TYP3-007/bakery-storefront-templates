/* ==========================================================================
   TEMPLATE 05 — checkout.js
   Collection slots are this template's own fulfilment control: a corner
   bakery's constraint is not "which day" but "which twenty minutes", and
   each window holds a finite number of bags.
   ========================================================================== */

(function () {
  boot();

  const $ = (s) => document.querySelector(s);
  const checkoutEl = $('[data-checkout]');
  const confirmEl = $('[data-confirmation]');
  const form = document.getElementById('checkout-form');

  const cart = getCart();
  if (!cart.lines.length) {
    $('[data-empty]').hidden = false;
    return;
  }
  checkoutEl.hidden = false;

  const when = cartReadyBy(cart);

  const state = {
    method: MERCHANT.capabilities.pickup ? 'pickup' : 'delivery',
    zone: MERCHANT.delivery.zones[0].label,
    slot: null,
  };

  /* ----------------------------------------------------------------------
     Slot capacity — deterministic from the day and the window.
     ---------------------------------------------------------------------- */
  function slotCapacity(dateObj, window) {
    const key = `${dateKey(dateObj)}|${window}`;
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const v = (h >>> 0) / 4294967296;
    return Math.round(v * 9); // 0–9 bags left
  }

  /* ----------------------------------------------------------------------
     Methods — only what this merchant actually offers
     ---------------------------------------------------------------------- */
  const available = [];
  if (MERCHANT.capabilities.pickup) {
    available.push({
      id: 'pickup',
      label: 'Collect',
      detail: `From ${MERCHANT.pickup.location}. Pick a two-hour window.`,
      price: 'Free',
    });
  }
  if (MERCHANT.capabilities.delivery) {
    available.push({
      id: 'delivery',
      label: 'Local delivery',
      detail: MERCHANT.delivery.note,
      price: `From ${money(MERCHANT.delivery.fee)} · free over ${money(MERCHANT.delivery.freeOver)}`,
    });
  }

  $('[data-methods]').innerHTML = available
    .map(
      (m) => `
      <label class="method">
        <input type="radio" name="method" value="${m.id}" ${m.id === state.method ? 'checked' : ''}>
        <span class="method__label">${m.label}</span>
        <span class="method__detail">${m.detail}</span>
        <span class="method__price">${m.price}</span>
      </label>`
    )
    .join('');

  $('[data-methods]').addEventListener('change', (e) => {
    const input = e.target.closest('input[name="method"]');
    if (!input) return;
    state.method = input.value;
    paint();
  });

  /* Zones */
  const zoneSelect = $('[data-zone]');
  zoneSelect.innerHTML = MERCHANT.delivery.zones
    .map((z) => `<option value="${z.label}">${z.label} — ${money(z.fee)}</option>`)
    .join('');
  zoneSelect.addEventListener('change', () => {
    state.zone = zoneSelect.value;
    paint();
  });

  /* ----------------------------------------------------------------------
     Slots
     ---------------------------------------------------------------------- */
  const slotsEl = $('[data-slots]');

  function paintSlots() {
    $('[data-slot-day]').textContent = `${dayWord(when)}, ${fmtDate(when, {
      day: 'numeric',
      month: 'long',
    })}`;

    slotsEl.innerHTML = MERCHANT.pickup.windows
      .map((w) => {
        const left = slotCapacity(when, w);
        const full = left === 0;
        return `
          <label class="slot">
            <input type="radio" name="slot" value="${w}" ${full ? 'disabled' : ''}
              ${state.slot === w ? 'checked' : ''}>
            <span class="slot__time">${w}</span>
            <span class="slot__left">${full ? 'Full' : `${left} left`}</span>
          </label>`;
      })
      .join('');
  }

  slotsEl.addEventListener('change', (e) => {
    const input = e.target.closest('input[name="slot"]');
    if (!input) return;
    state.slot = input.value;
    $('[data-slot-error]').style.display = 'none';
  });

  paintSlots();

  /* ----------------------------------------------------------------------
     Gifting — hidden entirely when the merchant does not offer it
     ---------------------------------------------------------------------- */
  if (MERCHANT.capabilities.gifting) {
    const section = $('[data-gifting]');
    section.hidden = false;
    const toggle = $('[data-gift-toggle]');
    toggle.addEventListener('change', () => {
      $('[data-gift-fields]').hidden = !toggle.checked;
    });
  }

  /* ----------------------------------------------------------------------
     Paint
     ---------------------------------------------------------------------- */
  function paint() {
    $('[data-pickup]').hidden = state.method !== 'pickup';
    $('[data-delivery]').hidden = state.method !== 'delivery';

    const totals = cartTotals(cart, { method: state.method, zone: state.zone });

    $('[data-subtotal]').textContent = moneyExact(totals.subtotal);
    $('[data-ship-label]').textContent = state.method === 'delivery' ? 'Delivery' : 'Collection';
    $('[data-ship]').textContent = totals.shipping === 0 ? 'Free' : moneyExact(totals.shipping);
    $('[data-total]').textContent = moneyExact(totals.total);
    $('[data-submit-total]').textContent = moneyExact(totals.total);

    // Oregon has no sales tax, so the row is removed rather than showing $0.00
    // and leaving the customer to wonder whether something is broken.
    const taxRow = $('[data-tax-row]');
    if (totals.tax > 0) {
      taxRow.hidden = false;
      $('[data-tax]').textContent = moneyExact(totals.tax);
      $('[data-tax-note]').textContent = '';
    } else {
      taxRow.hidden = true;
      $('[data-tax-note]').textContent = 'No sales tax in Oregon.';
    }

    const freeNote = $('[data-free-note]');
    if (state.method === 'delivery' && totals.freeDeliveryGap > 0) {
      freeNote.hidden = false;
      freeNote.innerHTML = `Delivery is free over ${money(MERCHANT.delivery.freeOver)} — you're
        ${moneyExact(totals.freeDeliveryGap)} short.`;
    } else {
      freeNote.hidden = true;
    }

    $('[data-ready-note]').innerHTML = `<strong>${whenPhrase(when)}.</strong> ${
      state.method === 'delivery'
        ? 'Delivered by bike between 8am and noon.'
        : `Collect from ${MERCHANT.pickup.location}.`
    }`;

    $('[data-day-note]').innerHTML = `<strong>Everything is ready ${whenPhrase(
      when
    )}.</strong> That's set by whatever in your basket needs the
      most notice — change it in <a class="linkish" href="cart.html">your basket</a>.`;

    $('[data-pickup-note]').textContent = `Collect from ${MERCHANT.pickup.location}. Ring the bell if the door is shut.`;
    $('[data-delivery-note]').textContent = MERCHANT.delivery.note;

    paintMini();
  }

  function paintMini() {
    $('[data-mini]').innerHTML = cart.lines
      .map((line) => {
        const product = getProduct(line.productId);
        if (!product) return '';
        const pricing = priceLine(product, line.selections, line.addons, line.qty);
        const spec = describeLine(line);
        return `
          <div style="display:flex;gap:.75rem;padding-block:.5rem;border-bottom:1px solid var(--line)">
            <img src="${img(product.image, 240)}" alt="" width="40" height="40"
                 style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex:none">
            <div style="flex:1;min-width:0">
              <p style="font-weight:600;font-size:.9375rem">${product.name}
                <span class="summary__muted">×${line.qty}</span></p>
              ${spec ? `<p class="small">${spec}</p>` : ''}
            </div>
            <p class="num" style="font-weight:600;font-size:.9375rem">${moneyExact(pricing.total)}</p>
          </div>`;
      })
      .join('');
  }

  /* ----------------------------------------------------------------------
     Validation
     ---------------------------------------------------------------------- */
  function validate() {
    let firstBad = null;

    const required = Array.from(form.querySelectorAll('[required]')).filter(
      (el) => !el.closest('[hidden]')
    );

    for (const el of required) {
      const field = el.closest('.field');
      let bad = !el.value.trim();
      if (!bad && el.type === 'email') bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
      if (!bad && el.type === 'tel') bad = el.value.replace(/\D/g, '').length < 7;
      field.classList.toggle('field--error', bad);
      if (bad && !firstBad) firstBad = el;
    }

    // A collection order without a time is not an order the shop can fill.
    if (state.method === 'pickup' && !state.slot) {
      $('[data-slot-error]').style.display = 'block';
      if (!firstBad) firstBad = slotsEl.querySelector('input:not([disabled])');
    }

    if (firstBad) {
      firstBad.focus();
      firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return false;
    }
    return true;
  }

  form.addEventListener('input', (e) => {
    const field = e.target.closest('.field--error');
    if (field && e.target.value.trim()) field.classList.remove('field--error');
  });

  /* ----------------------------------------------------------------------
     Place order
     ---------------------------------------------------------------------- */
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) {
      toast({ title: 'Something is missing', detail: 'Have a look at the highlighted bits.' });
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const totals = cartTotals(cart, { method: state.method, zone: state.zone });
    const orderNo = `BB-${String(Date.now()).slice(-5)}`;

    checkoutEl.hidden = true;
    confirmEl.hidden = false;
    window.scrollTo({ top: 0 });

    $('[data-order-no]').textContent = orderNo;
    $('[data-order-date]').textContent = fmtDate(new Date(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    $('[data-confirm-lede]').textContent =
      state.method === 'delivery'
        ? `We'll bring it over on ${whenPhrase(when)} between 8am and noon. Receipt is on its way to ${data.email}.`
        : `It'll be bagged up and waiting ${whenPhrase(when)}, between ${state.slot}. Receipt is on its way to ${data.email}.`;

    $('[data-confirm-details]').innerHTML = `
      <div><dt>Ready</dt><dd>${whenPhrase(when)}</dd></div>
      <div><dt>${state.method === 'delivery' ? 'Delivering to' : 'Collection'}</dt>
        <dd>${
          state.method === 'delivery'
            ? `${escapeHtml(data.address || '')}, ${escapeHtml(data.postcode || '')}`
            : `${MERCHANT.pickup.location}<br>${escapeHtml(state.slot || '')}`
        }</dd></div>
      <div><dt>Name</dt><dd>${escapeHtml(data.name || '')}</dd></div>
      <div><dt>Mobile</dt><dd>${escapeHtml(data.phone || '')}</dd></div>
      ${
        data.notes
          ? `<div style="grid-column:1/-1"><dt>Your notes</dt><dd>${escapeHtml(data.notes)}</dd></div>`
          : ''
      }
    `;

    $('[data-confirm-lines]').innerHTML = cart.lines
      .map((line) => {
        const product = getProduct(line.productId);
        if (!product) return '';
        const pricing = priceLine(product, line.selections, line.addons, line.qty);
        const spec = describeLine(line);
        return `
          <div class="summary__row">
            <span>${product.name} ×${line.qty}${
              spec || line.inscription
                ? `<br><span class="small">${spec}${
                    line.inscription ? ` · “${escapeHtml(line.inscription)}”` : ''
                  }</span>`
                : ''
            }</span>
            <span>${moneyExact(pricing.total)}</span>
          </div>`;
      })
      .join('');

    $('[data-confirm-total]').textContent = moneyExact(totals.total);

    clearCart();
  });

  paint();
})();
