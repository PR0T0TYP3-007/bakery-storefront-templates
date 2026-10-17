/* ==========================================================================
   CRUMB ATELIER — checkout.js
   Guest checkout. Totals are transparent from the first render, errors are
   stated in words next to the field that caused them, and the ready-by date
   is restated rather than assumed.
   ========================================================================== */

(function () {
  boot();

  const checkoutEl = document.querySelector('[data-checkout]');
  const confirmEl = document.querySelector('[data-confirmation]');
  const emptyEl = document.querySelector('[data-empty]');
  const form = document.getElementById('checkout-form');

  const cart = getCart();
  if (!cart.lines.length) {
    emptyEl.hidden = false;
    return;
  }
  checkoutEl.hidden = false;

  const state = {
    method: MERCHANT.capabilities.pickup ? 'pickup' : 'delivery',
    zone: MERCHANT.delivery.zones[0].label,
    gift: false,
  };

  /* ----------------------------------------------------------------------
     Fulfilment methods — only the ones this merchant actually offers.
     ---------------------------------------------------------------------- */
  const methodsEl = document.querySelector('[data-methods]');
  const available = [];

  if (MERCHANT.capabilities.pickup) {
    available.push({
      id: 'pickup',
      label: 'Collect',
      detail: `From ${MERCHANT.pickup.location}. Choose a two-hour window.`,
      price: 'Free',
    });
  }
  if (MERCHANT.capabilities.delivery) {
    available.push({
      id: 'delivery',
      label: 'Delivery',
      detail: MERCHANT.delivery.note,
      price: `From ${money(MERCHANT.delivery.fee)} · free over ${money(MERCHANT.delivery.freeOver)}`,
    });
  }

  methodsEl.innerHTML = available
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

  // Pickup windows
  const pickupSelect = document.querySelector('[data-pickup-window]');
  pickupSelect.innerHTML = MERCHANT.pickup.windows
    .map((w) => `<option value="${w}">${w}</option>`)
    .join('');

  // Delivery zones
  const zoneSelect = document.querySelector('[data-zone]');
  zoneSelect.innerHTML = MERCHANT.delivery.zones
    .map((z) => `<option value="${z.label}">${z.label} — ${money(z.fee)}</option>`)
    .join('');

  methodsEl.addEventListener('change', (e) => {
    const input = e.target.closest('input[name="method"]');
    if (!input) return;
    state.method = input.value;
    paint();
  });

  zoneSelect.addEventListener('change', () => {
    state.zone = zoneSelect.value;
    paint();
  });

  /* ----------------------------------------------------------------------
     Gifting
     ---------------------------------------------------------------------- */
  const giftSection = document.querySelector('[data-gifting]');
  if (MERCHANT.capabilities.gifting) {
    giftSection.hidden = false;
    const toggle = document.querySelector('[data-gift-toggle]');
    const fields = document.querySelector('[data-gift-fields]');
    const message = document.querySelector('[data-gift-message]');
    const count = document.querySelector('[data-gift-count]');

    toggle.addEventListener('change', () => {
      state.gift = toggle.checked;
      fields.hidden = !toggle.checked;
    });

    message.addEventListener('input', () => {
      count.textContent = String(message.value.length);
    });
  }

  /* ----------------------------------------------------------------------
     Paint
     ---------------------------------------------------------------------- */
  function paint() {
    document.querySelector('[data-pickup]').hidden = state.method !== 'pickup';
    document.querySelector('[data-delivery]').hidden = state.method !== 'delivery';

    const totals = cartTotals(cart, { method: state.method, zone: state.zone });

    document.querySelector('[data-subtotal]').textContent = moneyExact(totals.subtotal);
    document.querySelector('[data-shipping-label]').textContent =
      state.method === 'delivery' ? 'Delivery' : 'Collection';
    document.querySelector('[data-shipping]').textContent =
      totals.shipping === 0 ? 'Free' : moneyExact(totals.shipping);
    document.querySelector('[data-tax]').textContent = moneyExact(totals.tax);
    document.querySelector('[data-total]').textContent = moneyExact(totals.total);
    document.querySelector('[data-submit-total]').textContent = moneyExact(totals.total);

    // Free-delivery nudge, stated as a fact rather than a countdown to a cart
    // value the customer never asked about.
    const freeNote = document.querySelector('[data-free-note]');
    if (state.method === 'delivery' && totals.freeDeliveryGap > 0) {
      freeNote.hidden = false;
      freeNote.innerHTML = `Delivery is free over ${money(MERCHANT.delivery.freeOver)} — you are ${moneyExact(
        totals.freeDeliveryGap
      )} away.`;
    } else {
      freeNote.hidden = true;
    }

    const ready = cartReadyBy(cart);
    document.querySelector('[data-ready-note]').innerHTML = `<b>Ready ${fmtDateLong(ready)}.</b> ${
      state.method === 'delivery'
        ? 'Delivered between 9am and 2pm.'
        : 'Collect from ' + MERCHANT.pickup.location + '.'
    }`;

    document.querySelector('[data-date-note]').innerHTML = `<b>Your order is ready on ${fmtDateLong(
      ready
    )}.</b> This is set by the cake with the longest lead time. To change it, edit that cake in
      <a href="cart.html" style="border-bottom:1px solid currentColor">your order</a>.`;

    document.querySelector('[data-pickup-note]').textContent = `Collect from ${MERCHANT.pickup.location} on ${fmtDateLong(
      ready
    )}.`;
    document.querySelector('[data-delivery-note]').textContent = MERCHANT.delivery.note;

    paintMiniLines();
  }

  function paintMiniLines() {
    const host = document.querySelector('[data-mini-lines]');
    host.innerHTML = cart.lines
      .map((line) => {
        const product = getProduct(line.productId);
        if (!product) return '';
        const pricing = priceLine(product, line.selections, line.addons, line.qty);
        return `
          <div style="display:flex;gap:.9rem;padding-block:.6rem;border-bottom:1px solid var(--rule)">
            <img src="${img(product.image, 120)}" alt="" width="40" height="50"
                 style="width:40px;height:50px;object-fit:cover;flex:none">
            <div style="flex:1;min-width:0">
              <p style="font-size:.875rem">${product.name} <span class="summary__muted">×${line.qty}</span></p>
              <p class="small" style="margin-top:.1rem">${describeLine(line)}</p>
            </div>
            <p class="num" style="font-size:.8125rem">${moneyExact(pricing.total)}</p>
          </div>`;
      })
      .join('');
  }

  /* ----------------------------------------------------------------------
     Validation
     Errors are shown next to the field, the first bad field is focused, and
     nothing is cleared. Re-entering a form after a failed submit is one of
     the most common reasons an order is abandoned.
     ---------------------------------------------------------------------- */
  function validate() {
    let firstBad = null;

    const required = Array.from(form.querySelectorAll('[required]')).filter(
      (el) => !el.closest('[hidden]')
    );

    for (const el of required) {
      const field = el.closest('.field');
      let bad = !el.value.trim();

      if (!bad && el.type === 'email') {
        bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
      }
      if (!bad && el.type === 'tel') {
        bad = el.value.replace(/\D/g, '').length < 7;
      }

      field.classList.toggle('field--error', bad);
      if (bad && !firstBad) firstBad = el;
    }

    if (firstBad) {
      firstBad.focus();
      firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    return !firstBad;
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
      toast({ title: 'Something is missing', detail: 'Check the highlighted fields above.' });
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const totals = cartTotals(cart, { method: state.method, zone: state.zone });
    const ready = cartReadyBy(cart);
    const orderNo = `CA-${String(Date.now()).slice(-6)}`;

    checkoutEl.hidden = true;
    confirmEl.hidden = false;
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

    document.querySelector('[data-order-no]').textContent = orderNo;
    document.querySelector('[data-order-date]').textContent = fmtDate(new Date(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    document.querySelector('[data-confirm-lede]').textContent =
      state.method === 'delivery'
        ? `Your order will be delivered on ${fmtDateLong(ready)} between 9am and 2pm. We have sent a confirmation to ${data.email}.`
        : `Your order will be ready to collect on ${fmtDateLong(ready)}, ${data.pickupWindow}. We have sent a confirmation to ${data.email}.`;

    document.querySelector('[data-confirm-details]').innerHTML = `
      <div><dt>Ready by</dt><dd>${fmtDateLong(ready)}</dd></div>
      <div><dt>${state.method === 'delivery' ? 'Delivering to' : 'Collection'}</dt>
        <dd>${
          state.method === 'delivery'
            ? `${escapeHtml(data.address || '')}, ${escapeHtml(data.postcode || '')}`
            : `${MERCHANT.pickup.location}<br>${escapeHtml(data.pickupWindow || '')}`
        }</dd></div>
      <div><dt>Name</dt><dd>${escapeHtml(data.name || '')}</dd></div>
      <div><dt>Contact</dt><dd>${escapeHtml(data.phone || '')}</dd></div>
      ${
        state.gift && data.giftMessage
          ? `<div style="grid-column:1/-1"><dt>Card message</dt><dd>“${escapeHtml(data.giftMessage)}”</dd></div>`
          : ''
      }
      ${
        data.notes
          ? `<div style="grid-column:1/-1"><dt>Your notes</dt><dd>${escapeHtml(data.notes)}</dd></div>`
          : ''
      }
    `;

    document.querySelector('[data-confirm-lines]').innerHTML = cart.lines
      .map((line) => {
        const product = getProduct(line.productId);
        if (!product) return '';
        const pricing = priceLine(product, line.selections, line.addons, line.qty);
        return `
          <div class="summary__row">
            <span>${product.name} ×${line.qty}<br><span class="small">${describeLine(line)}${
          line.inscription ? ` · “${escapeHtml(line.inscription)}”` : ''
        }</span></span>
            <span>${moneyExact(pricing.total)}</span>
          </div>`;
      })
      .join('');

    document.querySelector('[data-confirm-total]').textContent = moneyExact(totals.total);

    clearCart();
  });


  paint();
})();
