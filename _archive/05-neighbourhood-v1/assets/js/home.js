/* ==========================================================================
   TEMPLATE 05 — home.js
   ========================================================================== */

(function () {
  boot('Shop');

  const $ = (s) => document.querySelector(s);

  $('[data-since]').textContent = `Open since ${MERCHANT.since}`;

  /* ----------------------------------------------------------------------
     Today's board
     The shop's actual shelf for the chosen collection day, with counts.
     This is the template's central idea: operational truth, up front.
     ---------------------------------------------------------------------- */
  const board = $('[data-board]');
  const boardDay = $('[data-board-day]');

  function paintBoard() {
    const when = getReadyBy();
    boardDay.textContent = `${dayWord(when)}, ${fmtDate(when, { day: 'numeric', month: 'long' })}`;

    // The heading has to match what the numbers underneath actually mean:
    // a real shelf today, a planned batch on any day still to come.
    const isToday = sameDay(when, today());
    const kicker = $('[data-board-kicker]');
    const foot = $('[data-board-foot]');
    if (kicker) kicker.textContent = isToday ? 'On the shelf now' : 'Baking that morning';
    if (foot) {
      foot.textContent = isToday
        ? 'Counts fall through the day as things sell.'
        : 'We have not baked this yet — these are the batch sizes we plan for.';
    }

    const everyday = PRODUCTS.filter((p) => p.kind === 'everyday').slice(0, 6);

    board.innerHTML = everyday
      .map((p) => {
        const s = shelf(p, when);

        return `
          <div class="boardrow">
            <img class="boardrow__img" src="${img(p.image, 240)}" alt="" loading="lazy" width="56" height="56">
            <div>
              <p class="boardrow__name"><a href="product.html?id=${p.id}">${p.name}</a></p>
              <div class="boardrow__meta">
                <span class="boardrow__price">${money(p.price)}</span>
                <span class="stock" data-state="${s.state}">${s.short}</span>
              </div>
            </div>
            <div class="boardrow__right">
              ${
                s.state === 'out'
                  ? '<button class="btn btn--sm btn--ghost" type="button" disabled>Sold out</button>'
                  : `<button class="btn btn--sm" type="button" data-add-now="${p.id}">Add</button>`
              }
            </div>
          </div>`;
      })
      .join('');
  }

  paintBoard();
  document.addEventListener('readyby:change', paintBoard);

  /* ----------------------------------------------------------------------
     Your usual
     ---------------------------------------------------------------------- */
  const usual = $('[data-usual]');
  const usualLines = LAST_ORDER.lines.filter((l) => getProduct(l.productId));

  if (usualLines.length) {
    usual.hidden = false;

    $('[data-usual-items]').innerHTML = usualLines
      .map((l) => `<img src="${img(getProduct(l.productId).image, 240)}" alt="" width="44" height="44">`)
      .join('');

    $('[data-usual-title]').textContent = `Same as ${LAST_ORDER.when}?`;
    $('[data-usual-detail]').textContent = usualLines
      .map((l) => `${l.qty > 1 ? l.qty + ' × ' : ''}${getProduct(l.productId).name}`)
      .join(', ');

    $('[data-usual-add]').addEventListener('click', () => {
      let added = 0;
      for (const l of usualLines) {
        const product = getProduct(l.productId);
        const lead = leadDaysFor(product, l.selections);
        const when = getReadyBy();
        const date = dayState(when, lead) === 'available' ? when : earliestFor(lead);
        addToCart({
          productId: product.id,
          selections: { ...product.defaults, ...l.selections },
          addons: [],
          inscription: '',
          readyBy: dateKey(date),
          qty: l.qty,
        });
        added += l.qty;
      }
      toast({
        title: `${added} items added`,
        detail: `Collect ${dayWord(getReadyBy()).toLowerCase()}`,
        href: 'cart.html',
        hrefLabel: 'Basket',
      });
    });
  }

  /* ----------------------------------------------------------------------
     Categories
     ---------------------------------------------------------------------- */
  $('[data-cats]').innerHTML = CATEGORIES.map(
    (c) => `
    <a class="cat" href="shop.html?cat=${c.id}">
      <span class="cat__label">${c.label}</span>
      <span class="cat__note">${c.note}</span>
    </a>`
  ).join('');

  /* ----------------------------------------------------------------------
     Popular + cakes
     ---------------------------------------------------------------------- */
  const popular = $('[data-popular]');
  const cakes = $('[data-cakes]');

  function paintGrids() {
    const when = getReadyBy();
    popular.innerHTML = PRODUCTS.filter((p) => p.popular)
      .map((p, i) => renderCard(p, { when, delay: i * 50 }))
      .join('');
    cakes.innerHTML = PRODUCTS.filter((p) => p.kind === 'cake')
      .map((p, i) => renderCard(p, { when, delay: i * 50 }))
      .join('');
    initReveal();
  }

  paintGrids();
  document.addEventListener('readyby:change', paintGrids);

  /* ----------------------------------------------------------------------
     Hours
     ---------------------------------------------------------------------- */
  $('[data-hours]').innerHTML = MERCHANT.hours
    .map(
      (h) =>
        `<li class="footer__hours" style="padding-block:.3rem"><span>${h.days}</span><strong>${h.time}</strong></li>`
    )
    .join('');
})();
