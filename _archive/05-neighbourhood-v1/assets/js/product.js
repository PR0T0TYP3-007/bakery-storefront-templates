/* ==========================================================================
   TEMPLATE 05 — product.js
   One sheet, two speeds.

   A loaf has no options and should be one tap. A cake needs a size, a sponge,
   a finish and a message. The same page serves both by rendering only what
   the product actually declares, rather than showing empty controls.
   ========================================================================== */

(function () {
  boot('Shop');

  const $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const product = getProduct(params.get('id'));

  if (!product) {
    $('[data-missing]').hidden = false;
    return;
  }

  $('[data-pdp]').hidden = false;
  document.title = `${product.name} — ${MERCHANT.name}`;

  const state = {
    selections: { ...product.defaults },
    addons: [],
    inscription: '',
    qty: 1,
    when: null,
  };

  let calendar = null;

  /* --- static ------------------------------------------------------------ */
  $('[data-crumb]').textContent = product.name;
  $('[data-name]').textContent = product.name;
  $('[data-subtitle]').textContent = product.subtitle;
  $('[data-story]').innerHTML = `<p>${product.story}</p>`;
  $('[data-category]').textContent = (
    CATEGORIES.find((c) => c.id === product.category) || { label: '' }
  ).label;
  $('[data-notes]').innerHTML = (product.notes || [])
    .map((n) => `<span class="pill">${n}</span>`)
    .join('');

  const image = $('[data-image]');
  image.src = img(product.image, 1100);
  image.alt = `${product.name} — ${product.subtitle}`;

  /* --- options (only if the product has any) ----------------------------- */
  const optionsBlock = $('[data-options-block]');
  if ((product.options || []).length) {
    optionsBlock.hidden = false;
    $('[data-options]').innerHTML = product.options
      .map((groupId) => {
        const group = OPTION_GROUPS[groupId];
        if (!group) return '';
        return `
          <div class="optgroup" data-group="${group.id}">
            <div class="optgroup__head">
              <h2>${group.label}</h2>
              <span class="small" data-chosen="${group.id}"></span>
            </div>
            <div class="opts">
              ${group.options
                .map(
                  (o) => `
                <label class="opt">
                  <input type="radio" name="${group.id}" value="${o.id}"
                    ${state.selections[group.id] === o.id ? 'checked' : ''}>
                  <span>
                    <span class="opt__label">${o.label}</span>
                    ${o.detail ? `<span class="opt__detail">${o.detail}</span>` : ''}
                  </span>
                  <span class="opt__price">${o.price ? `+${money(o.price)}` : 'Included'}</span>
                </label>`
                )
                .join('')}
            </div>
            ${group.help ? `<p class="field__hint">${group.help}</p>` : ''}
          </div>`;
      })
      .join('');

    $('[data-options]').addEventListener('change', (e) => {
      const input = e.target.closest('input[type="radio"]');
      if (!input) return;
      state.selections[input.name] = input.value;
      repaint({ bump: true });
    });
  }

  /* --- inscription ------------------------------------------------------- */
  if (product.inscribable && MERCHANT.capabilities.inscriptions) {
    $('[data-inscription-block]').hidden = false;
    const input = $('[data-insc]');
    const preview = $('[data-insc-preview]');
    const count = $('[data-insc-count]');

    input.addEventListener('input', () => {
      state.inscription = input.value;
      count.textContent = String(input.value.length);
      const empty = input.value.trim() === '';
      preview.dataset.empty = String(empty);
      preview.querySelector('p').textContent = empty
        ? "We'll pipe exactly what you type here."
        : input.value;
    });
  }

  /* --- add-ons ----------------------------------------------------------- */
  $('[data-addons]').innerHTML = ADDONS.map(
    (a) => `
    <label class="addon">
      <input type="checkbox" value="${a.id}">
      <span class="addon__main">
        <span class="addon__label">${a.label}</span>
        <span class="addon__detail">${a.detail}</span>
      </span>
      <span class="addon__price">+${money(a.price)}</span>
    </label>`
  ).join('');

  $('[data-addons]').addEventListener('change', (e) => {
    const box = e.target.closest('input[type="checkbox"]');
    if (!box) return;
    state.addons = box.checked
      ? [...state.addons, box.value]
      : state.addons.filter((id) => id !== box.value);
    repaint({ bump: true });
  });

  /* --- collection day ---------------------------------------------------- */
  const calWrap = $('[data-cal-wrap]');
  const calToggle = $('[data-toggle-cal]');

  calToggle.addEventListener('click', () => {
    const open = calWrap.hidden;
    calWrap.hidden = !open;
    calToggle.setAttribute('aria-expanded', String(open));
    calToggle.textContent = open ? 'Hide calendar' : 'Change day';
  });

  function initCalendar() {
    const lead = leadDaysFor(product, state.selections);
    const header = getReadyBy();
    state.when = dayState(header, lead) === 'available' ? header : earliestFor(lead);
    calendar = createDatePicker($('[data-cal]'), {
      leadDays: lead,
      selected: state.when,
      onSelect: (d) => {
        state.when = d;
        repaint();
      },
    });
  }

  /* --- quantity ---------------------------------------------------------- */
  $('[data-qty-up]').addEventListener('click', () => {
    state.qty = Math.min(state.qty + 1, 24);
    repaint();
  });
  $('[data-qty-down]').addEventListener('click', () => {
    state.qty = Math.max(state.qty - 1, 1);
    repaint();
  });

  /* --- add --------------------------------------------------------------- */
  $('[data-add]').addEventListener('click', () => {
    addToCart({
      productId: product.id,
      selections: { ...state.selections },
      addons: [...state.addons],
      inscription: state.inscription.trim(),
      readyBy: dateKey(state.when),
      qty: state.qty,
    });

    toast({
      title: `${state.qty > 1 ? state.qty + ' × ' : ''}${product.name} added`,
      detail: `Collect ${dayWord(state.when).toLowerCase()}`,
      thumb: img(product.image, 160),
      href: 'cart.html',
      hrefLabel: 'Basket',
    });
  });

  /* --- repaint ----------------------------------------------------------- */
  let lastUnit = null;

  function repaint({ bump = false } = {}) {
    const lead = leadDaysFor(product, state.selections);

    if (!state.when || dayState(state.when, lead) !== 'available') {
      state.when = earliestFor(lead);
    }
    if (calendar) calendar.setLeadDays(lead);

    const pricing = priceLine(product, state.selections, state.addons, state.qty);

    const priceEl = $('[data-price]');
    priceEl.textContent = money(pricing.unit);
    if (bump && lastUnit !== null && lastUnit !== pricing.unit) {
      priceEl.classList.remove('is-bumped');
      void priceEl.offsetWidth;
      priceEl.classList.add('is-bumped');
    }
    lastUnit = pricing.unit;

    $('[data-price-note]').textContent = pricing.addonTotal
      ? `each · +${money(pricing.addonTotal)} of extras`
      : 'each';

    for (const groupId of product.options || []) {
      const group = OPTION_GROUPS[groupId];
      const chosen = group && group.options.find((o) => o.id === state.selections[groupId]);
      const el = document.querySelector(`[data-chosen="${groupId}"]`);
      if (el) el.textContent = chosen ? chosen.label : '';
    }

    // What the shop can truthfully say about this product on this day — a
    // live count for today, batch size for a day that has not happened yet.
    const s = shelf(product, state.when);
    const sstate = s.state;
    const stockEl = $('[data-stock]');
    stockEl.dataset.state = sstate;
    stockEl.textContent =
      sstate === 'made'
        ? `Made to order · ${lead} ${lead === 1 ? 'day' : 'days'} notice`
        : s.mode === 'live'
          ? s.label
          : `${s.label} · ${dayWord(state.when).toLowerCase()}`;

    $('[data-ready-note]').innerHTML = `<strong>${whenPhrase(state.when)}.</strong> ${
      lead === 0
        ? 'Available the same day if you order before 11am.'
        : `This one needs ${lead} ${lead === 1 ? 'day' : 'days'} notice.`
    }`;

    $('[data-qty]').textContent = String(state.qty);
    $('[data-qty-down]').disabled = state.qty <= 1;
    $('[data-qty-up]').disabled = state.qty >= 24;

    // The button is rewritten each pass, so nothing else may hold a reference
    // into it — a sold-out day removes the total span entirely.
    const soldOut = sstate === 'out';
    const addBtn = $('[data-add]');
    addBtn.disabled = soldOut;
    addBtn.textContent = soldOut
      ? 'Sold out for this day'
      : `Add to basket — ${money(pricing.total)}`;

    $('[data-buy-note]').textContent = MERCHANT.capabilities.delivery
      ? 'Collection or local delivery, chosen at checkout. No payment is taken in this demonstration.'
      : 'Collection only. No payment is taken in this demonstration.';
  }

  /* --- related ----------------------------------------------------------- */
  const related = PRODUCTS.filter(
    (p) => p.id !== product.id && (p.category === product.category || p.popular)
  ).slice(0, 4);

  if (related.length) {
    $('[data-related-block]').hidden = false;
    $('[data-related]').innerHTML = related
      .map((p, i) => renderCard(p, { when: getReadyBy(), delay: i * 40 }))
      .join('');
    initReveal();
  }

  initCalendar();
  repaint();
})();
