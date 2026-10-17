/* ==========================================================================
   CRUMB ATELIER — cart.js
   The order review. Everything that was configured is restated in full,
   including the date, because the cart is the last calm moment before
   checkout and the cheapest place to catch a mistake.
   ========================================================================== */

(function () {
  boot();

  const orderEl = document.querySelector('[data-order]');
  const emptyEl = document.querySelector('[data-empty]');
  const linesEl = document.querySelector('[data-lines]');
  const countEl = document.querySelector('[data-line-count]');
  const suggestSection = document.querySelector('[data-suggest-section]');
  const suggestEl = document.querySelector('[data-suggest]');

  function paint() {
    const cart = getCart();
    const hasLines = cart.lines.length > 0;

    orderEl.hidden = !hasLines;
    emptyEl.hidden = hasLines;
    countEl.textContent = hasLines
      ? `${cartCount(cart)} ${cartCount(cart) === 1 ? 'item' : 'items'}`
      : '';

    if (!hasLines) return;

    linesEl.innerHTML = cart.lines.map(renderLine).join('');

    const totals = cartTotals(cart);
    document.querySelector('[data-subtotal]').textContent = moneyExact(totals.subtotal);
    document.querySelector('[data-total]').textContent = moneyExact(totals.subtotal);

    const ready = cartReadyBy(cart);
    const summary = document.querySelector('[data-readyby-summary]');
    const multi = new Set(cart.lines.map((l) => l.readyBy)).size > 1;
    summary.innerHTML = multi
      ? `<b>Ready ${fmtDateLong(ready)}.</b> Your cakes have different lead times, so the whole order is
         collected or delivered on the latest of them.`
      : `<b>Ready ${fmtDateLong(ready)}.</b> Collection and delivery windows are chosen at checkout.`;

    paintSuggestions(cart);
  }

  /* ----------------------------------------------------------------------
     A line restates the full configuration, not just a product name.
     ---------------------------------------------------------------------- */
  function renderLine(line) {
    const product = getProduct(line.productId);
    if (!product) return '';

    const pricing = priceLine(product, line.selections, line.addons, line.qty);
    const date = keyToDate(line.readyBy);
    const addonLabels = (line.addons || [])
      .map((id) => (ADDONS.find((a) => a.id === id) || {}).label)
      .filter(Boolean);

    return `
      <article class="line" data-line="${line.id}">
        <a class="line__media" href="product.html?id=${product.id}">
          <img src="${img(product.image, 320)}" alt="${product.name}" loading="lazy" width="320" height="400">
        </a>
        <div>
          <div class="line__head">
            <h2 class="line__name">
              <a href="product.html?id=${product.id}">${product.name}</a>
            </h2>
            <p class="line__price">${moneyExact(pricing.total)}</p>
          </div>

          <p class="line__spec">${describeLine(line)}</p>

          ${
            line.inscription
              ? `<p class="line__spec" style="color:var(--accent)">Piped: “${escapeHtml(line.inscription)}”</p>`
              : ''
          }

          ${
            addonLabels.length
              ? `<p class="line__spec">With ${addonLabels.join(', ')}</p>`
              : ''
          }

          <p class="line__spec" style="margin-top:.6rem">
            <span class="meta meta-ink">Ready ${date ? fmtDateLong(date) : '—'}</span>
          </p>

          <div class="line__foot">
            <div class="qty">
              <button type="button" data-dec="${line.id}" aria-label="Decrease quantity"${
      line.qty <= 1 ? ' disabled' : ''
    }>−</button>
              <output aria-live="polite">${line.qty}</output>
              <button type="button" data-inc="${line.id}" aria-label="Increase quantity"${
      line.qty >= 20 ? ' disabled' : ''
    }>+</button>
            </div>
            <div style="display:flex;gap:1.25rem;align-items:center">
              <a class="line__remove" href="product.html?id=${product.id}">Edit</a>
              <button class="line__remove" type="button" data-remove="${line.id}">Remove</button>
            </div>
          </div>
        </div>
      </article>`;
  }

  /* ----------------------------------------------------------------------
     Suggestions — only the add-ons not already in the order, and only once.
     ---------------------------------------------------------------------- */
  function paintSuggestions(cart) {
    const taken = new Set(cart.lines.flatMap((l) => l.addons || []));
    const open = ADDONS.filter((a) => !taken.has(a.id)).slice(0, 3);

    if (!open.length || !cart.lines.length) {
      suggestSection.hidden = true;
      return;
    }

    suggestSection.hidden = false;
    suggestEl.innerHTML = open
      .map(
        (a) => `
        <div class="addon" style="cursor:default">
          <span class="addon__main">
            <span class="addon__label">${a.label}</span>
            <span class="addon__detail">${a.detail}</span>
          </span>
          <span class="addon__price">${money(a.price)}</span>
          <button class="btn btn--sm btn--ghost" type="button" data-add-addon="${a.id}">Add</button>
        </div>`
      )
      .join('');
  }

  /* ----------------------------------------------------------------------
     Events
     ---------------------------------------------------------------------- */
  document.addEventListener('click', (e) => {
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    const rm = e.target.closest('[data-remove]');
    const addAddon = e.target.closest('[data-add-addon]');

    if (inc || dec) {
      const id = (inc || dec).dataset.inc || (inc || dec).dataset.dec;
      const line = getCart().lines.find((l) => l.id === id);
      if (line) updateLineQty(id, line.qty + (inc ? 1 : -1));
      paint();
      return;
    }

    if (rm) {
      const line = getCart().lines.find((l) => l.id === rm.dataset.remove);
      const product = line && getProduct(line.productId);
      removeLine(rm.dataset.remove);
      paint();
      if (product) toast({ title: `${product.name} removed` });
      return;
    }

    if (addAddon) {
      // Attach the extra to the first cake in the order.
      const cart = getCart();
      const first = cart.lines[0];
      if (!first) return;
      if (!first.addons.includes(addAddon.dataset.addAddon)) {
        first.addons.push(addAddon.dataset.addAddon);
        saveCart(cart);
      }
      paint();
      const a = ADDONS.find((x) => x.id === addAddon.dataset.addAddon);
      if (a) toast({ title: `${a.label} added` });
    }
  });


  paint();
})();
