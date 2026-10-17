/* ==========================================================================
   CRUMB ATELIER — product.js
   The configuration journey.

   Three rules govern this page:
     1. The price is always visible and always current.
     2. The earliest possible date is a consequence of the options chosen,
        and it moves the moment they change.
     3. Nothing is hidden behind an animation the customer has to wait out.
   ========================================================================== */

(function () {
  boot();

  const params = new URLSearchParams(location.search);
  const product = getProduct(params.get('id'));

  const pdp = document.querySelector('[data-pdp]');
  const missing = document.querySelector('[data-missing]');

  if (!product) {
    missing.hidden = false;
    return;
  }

  pdp.hidden = false;
  document.title = `${product.name} — Crumb Atelier`;

  /* ----------------------------------------------------------------------
     State
     ---------------------------------------------------------------------- */
  const state = {
    selections: { ...product.defaults },
    addons: [],
    inscription: '',
    qty: 1,
    readyBy: null,
  };

  let calendar = null;

  /* ----------------------------------------------------------------------
     Static content
     ---------------------------------------------------------------------- */
  const $ = (sel) => document.querySelector(sel);

  $('[data-crumb]').textContent = product.name;
  $('[data-plate]').textContent = `Pl. ${product.plate}`;
  $('[data-name]').textContent = product.name;
  $('[data-subtitle]').textContent = product.subtitle;
  $('[data-story]').innerHTML = `<p>${product.story}</p>`;
  $('[data-caption-maker]').textContent = `Made by ${product.maker}`;
  $('[data-caption-year]').textContent = `In the book since ${product.year}`;

  const image = $('[data-image]');
  image.src = img(product.image, 1100, 78);
  image.alt = `${product.name} — ${product.subtitle}`;

  $('[data-occasions]').textContent = product.occasions
    .map((id) => (OCCASIONS.find((o) => o.id === id) || {}).label)
    .filter(Boolean)
    .join(' · ');

  $('[data-notes]').innerHTML = product.notes.map((n) => `<span class="pill">${n}</span>`).join('');

  /* ----------------------------------------------------------------------
     Option groups
     ---------------------------------------------------------------------- */
  const optionsMount = $('[data-options]');

  optionsMount.innerHTML = (product.options || [])
    .map((groupId) => {
      const group = OPTION_GROUPS[groupId];
      if (!group) return '';
      return `
        <div class="optgroup" data-group="${group.id}">
          <div class="optgroup__head">
            <h2 class="meta meta-ink">${group.label}</h2>
            <span class="optgroup__chosen" data-chosen="${group.id}"></span>
          </div>
          <div class="opts${group.id === 'size' ? '' : ''}">
            ${group.options
              .map(
                (o) => `
              <label class="opt">
                <input type="radio" name="${group.id}" value="${o.id}"
                  ${state.selections[group.id] === o.id ? 'checked' : ''}>
                <span class="opt__main">
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

  optionsMount.addEventListener('change', (e) => {
    const input = e.target.closest('input[type="radio"]');
    if (!input) return;
    state.selections[input.name] = input.value;
    repaint({ bump: true });
  });

  /* ----------------------------------------------------------------------
     Inscription
     ---------------------------------------------------------------------- */
  const inscSection = $('[data-inscription-section]');
  if (product.inscribable && MERCHANT.capabilities.inscriptions) {
    inscSection.hidden = false;
    const input = $('[data-insc]');
    const preview = $('[data-insc-preview]');
    const countEl = $('[data-insc-count]');

    input.addEventListener('input', () => {
      state.inscription = input.value;
      countEl.textContent = String(input.value.length);
      const empty = input.value.trim() === '';
      preview.dataset.empty = String(empty);
      preview.querySelector('p').textContent = empty
        ? 'This is exactly how it will be piped.'
        : input.value;
    });
  }

  /* ----------------------------------------------------------------------
     Add-ons
     ---------------------------------------------------------------------- */
  const addonsMount = $('[data-addons]');
  addonsMount.innerHTML = ADDONS.map(
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

  addonsMount.addEventListener('change', (e) => {
    const box = e.target.closest('input[type="checkbox"]');
    if (!box) return;
    state.addons = box.checked
      ? [...state.addons, box.value]
      : state.addons.filter((id) => id !== box.value);
    repaint({ bump: true });
  });

  /* ----------------------------------------------------------------------
     Date
     ---------------------------------------------------------------------- */
  const calWrap = $('[data-cal-wrap]');
  const calToggle = $('[data-toggle-cal]');

  calToggle.addEventListener('click', () => {
    const open = calWrap.hidden;
    calWrap.hidden = !open;
    calToggle.setAttribute('aria-expanded', String(open));
    calToggle.textContent = open ? 'Hide calendar' : 'Change date';
  });

  function initCalendar() {
    const lead = leadDaysFor(product, state.selections);
    state.readyBy = pickInitialDate(lead);
    calendar = createDatePicker($('[data-cal]'), {
      leadDays: lead,
      selected: state.readyBy,
      onSelect: (d) => {
        state.readyBy = d;
        repaint();
      },
    });
  }

  // Respect the date already chosen in the header where the cake allows it.
  function pickInitialDate(lead) {
    const header = getReadyBy();
    return dayState(header, lead) === 'available' ? header : earliestFor(lead);
  }

  /* ----------------------------------------------------------------------
     Quantity
     ---------------------------------------------------------------------- */
  $('[data-qty-up]').addEventListener('click', () => {
    state.qty = Math.min(state.qty + 1, 20);
    repaint();
  });

  $('[data-qty-down]').addEventListener('click', () => {
    state.qty = Math.max(state.qty - 1, 1);
    repaint();
  });

  /* ----------------------------------------------------------------------
     Add to order
     ---------------------------------------------------------------------- */
  $('[data-add]').addEventListener('click', () => {
    addToCart({
      productId: product.id,
      selections: { ...state.selections },
      addons: [...state.addons],
      inscription: state.inscription.trim(),
      readyBy: dateKey(state.readyBy),
      qty: state.qty,
    });

    toast({
      title: `${product.name} added to your order`,
      detail: `${describeLine({ productId: product.id, selections: state.selections })} · ready ${fmtDate(
        state.readyBy
      )}`,
      thumb: img(product.image, 160),
      href: 'cart.html',
      hrefLabel: 'Review',
    });
  });

  /* ----------------------------------------------------------------------
     Repaint
     ---------------------------------------------------------------------- */
  let lastUnit = null;

  function repaint({ bump = false } = {}) {
    const lead = leadDaysFor(product, state.selections);

    // A lead-time change can make the chosen date impossible. Move it, and
    // say so, rather than failing silently at checkout.
    if (!state.readyBy || dayState(state.readyBy, lead) !== 'available') {
      state.readyBy = earliestFor(lead);
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
      ? `per cake · +${money(pricing.addonTotal)} in extras`
      : 'per cake, as configured';

    // Chosen-option labels in each group header
    for (const groupId of product.options || []) {
      const group = OPTION_GROUPS[groupId];
      const chosen = group && group.options.find((o) => o.id === state.selections[groupId]);
      const el = document.querySelector(`[data-chosen="${groupId}"]`);
      if (el) el.textContent = chosen ? chosen.label : '';
    }

    $('[data-ready-date]').textContent = fmtDateLong(state.readyBy);
    $('[data-lead-pill]').textContent = lead === 0 ? 'Same day' : `${lead} ${lead === 1 ? 'day' : 'days'} notice`;

    $('[data-qty]').textContent = String(state.qty);
    $('[data-qty-down]').disabled = state.qty <= 1;
    $('[data-qty-up]').disabled = state.qty >= 20;

    $('[data-total]').textContent = money(pricing.total);

    const method = MERCHANT.capabilities.delivery ? 'Pickup or local delivery' : 'Pickup only';
    $('[data-buy-note]').textContent = `${method} · chosen at checkout · no payment is taken in this demonstration.`;
  }

  /* ----------------------------------------------------------------------
     Related
     ---------------------------------------------------------------------- */
  const relatedMount = document.querySelector('[data-related]');
  const related = PRODUCTS.filter(
    (p) => p.id !== product.id && p.occasions.some((o) => product.occasions.includes(o))
  ).slice(0, 4);

  if (related.length) {
    document.querySelector('[data-related-section]').hidden = false;
    relatedMount.innerHTML = related
      .map((p, i) => renderCard(p, { readyBy: getReadyBy(), delay: i * 60 }))
      .join('');
    initReveal();
  }

  /* ----------------------------------------------------------------------
     Go
     ---------------------------------------------------------------------- */
  initCalendar();
  repaint();
})();
