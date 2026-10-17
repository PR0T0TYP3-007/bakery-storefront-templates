/* ==========================================================================
   TEMPLATE 05 — cart.js
   ========================================================================== */

(function () {
  boot();

  const $ = (s) => document.querySelector(s);
  const orderEl = $('[data-order]');
  const emptyEl = $('[data-empty]');
  const linesEl = $('[data-lines]');
  const suggestBlock = $('[data-suggest-block]');

  function paint() {
    const cart = getCart();
    const has = cart.lines.length > 0;

    orderEl.hidden = !has;
    emptyEl.hidden = has;
    $('[data-line-count]').textContent = has
      ? `${cartCount(cart)} ${cartCount(cart) === 1 ? 'item' : 'items'}`
      : '';

    if (!has) return;

    linesEl.innerHTML = cart.lines.map(renderLine).join('');

    const totals = cartTotals(cart);
    $('[data-subtotal]').textContent = moneyExact(totals.subtotal);
    $('[data-total]').textContent = moneyExact(totals.subtotal);

    const when = cartReadyBy(cart);
    const mixed = new Set(cart.lines.map((l) => l.readyBy)).size > 1;
    $('[data-when-note]').innerHTML = mixed
      ? `<strong>Ready ${whenPhrase(when)}.</strong>
         Some of this needs more notice than the rest, so it all comes together on the later day.`
      : `<strong>Ready ${whenPhrase(when)}.</strong>
         You'll pick a collection time at checkout.`;

    paintSuggestions(cart);
  }

  function renderLine(line) {
    const product = getProduct(line.productId);
    if (!product) return '';

    const pricing = priceLine(product, line.selections, line.addons, line.qty);
    const date = keyToDate(line.readyBy);
    const spec = describeLine(line);
    const addons = (line.addons || [])
      .map((id) => (ADDONS.find((a) => a.id === id) || {}).label)
      .filter(Boolean);

    return `
      <article class="line">
        <img class="line__media" src="${img(product.image, 240)}" alt="" loading="lazy" width="76" height="76">
        <div>
          <div class="line__head">
            <h2 class="line__name"><a href="product.html?id=${product.id}">${product.name}</a></h2>
            <p class="line__price">${moneyExact(pricing.total)}</p>
          </div>
          ${spec ? `<p class="line__spec">${spec}</p>` : ''}
          ${
            line.inscription
              ? `<p class="line__spec" style="color:var(--brand);font-weight:600">“${escapeHtml(line.inscription)}”</p>`
              : ''
          }
          ${addons.length ? `<p class="line__spec">With ${addons.join(', ')}</p>` : ''}
          <p class="line__spec"><strong>Collect ${dayWord(date).toLowerCase()}, ${fmtDate(date, {
            day: 'numeric',
            month: 'long',
          })}</strong></p>

          <div class="line__foot">
            <div class="qty qty--sm">
              <button type="button" data-dec="${line.id}" aria-label="Decrease quantity"${
                line.qty <= 1 ? ' disabled' : ''
              }>−</button>
              <output aria-live="polite">${line.qty}</output>
              <button type="button" data-inc="${line.id}" aria-label="Increase quantity">+</button>
            </div>
            <div style="display:flex;gap:1rem;align-items:center">
              <a class="line__remove" href="product.html?id=${product.id}">Edit</a>
              <button class="line__remove" type="button" data-remove="${line.id}">Remove</button>
            </div>
          </div>
        </div>
      </article>`;
  }

  function paintSuggestions(cart) {
    const taken = new Set(cart.lines.flatMap((l) => l.addons || []));
    const open = ADDONS.filter((a) => !taken.has(a.id));

    if (!open.length) {
      suggestBlock.hidden = true;
      return;
    }

    suggestBlock.hidden = false;
    $('[data-suggest]').innerHTML = open
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

  document.addEventListener('click', (e) => {
    const inc = e.target.closest('[data-inc]');
    const dec = e.target.closest('[data-dec]');
    const rm = e.target.closest('[data-remove]');
    const addon = e.target.closest('[data-add-addon]');

    if (inc || dec) {
      const el = inc || dec;
      const id = el.dataset.inc || el.dataset.dec;
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

    if (addon) {
      const cart = getCart();
      const first = cart.lines[0];
      if (!first) return;
      if (!first.addons.includes(addon.dataset.addAddon)) {
        first.addons.push(addon.dataset.addAddon);
        saveCart(cart);
      }
      paint();
      const a = ADDONS.find((x) => x.id === addon.dataset.addAddon);
      if (a) toast({ title: `${a.label} added` });
    }
  });

  paint();
})();
