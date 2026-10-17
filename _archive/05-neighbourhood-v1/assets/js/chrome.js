/* ==========================================================================
   TEMPLATE 05 — chrome.js
   This shop's header, collection bar, footer and product card.

   The behaviour underneath (dates, lead times, capacity, pricing, cart,
   the calendar component) is the same shared code Template 01 uses.
   ========================================================================== */

const ICONS = {
  bird: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2.5 11.5c0-3.6 2.9-6.5 6.5-6.5 2.2 0 4 1 5 2.5l3.5-1-1.5 3c.3.8.5 1.6.5 2.5 0 1.2-.4 2.3-1 3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="11.5" cy="8.5" r="1" fill="currentColor"/><path d="M2.5 11.5c1.5 2 4 3 6.5 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  bag: '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M3.5 5.5h11l-1 10h-9l-1-10Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M6.5 7.5v-2a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  clock:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6.3" stroke="currentColor" stroke-width="1.6"/><path d="M8 4.5V8l2.5 1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  search:
    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="5.3" stroke="currentColor" stroke-width="1.8"/><path d="m12 12 3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  arrow:
    '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  repeat:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 8a5.5 5.5 0 0 1 9.4-3.9M13.5 8a5.5 5.5 0 0 1-9.4 3.9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 1.5v3h-3M4 14.5v-3h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

const NAV = [
  { href: 'shop.html', label: 'Shop' },
  { href: 'shop.html?cat=bread', label: 'Bread' },
  { href: 'shop.html?cat=pastry', label: 'Pastry' },
  { href: 'shop.html?cat=cakes', label: 'Cakes' },
  { href: 'index.html#visit', label: 'Visit' },
];

/* --------------------------------------------------------------------------
   When can you actually have it
   -------------------------------------------------------------------------- */
function dayWord(d) {
  const t = today();
  if (sameDay(d, t)) return 'Today';
  if (sameDay(d, addDays(t, 1))) return 'Tomorrow';
  return fmtDate(d, { weekday: 'long' });
}

/* fmtDateLong already names the weekday, so prefixing dayWord to it gives
   "Tuesday, Tuesday, October 20". Only Today and Tomorrow add anything. */
function whenPhrase(d) {
  const w = dayWord(d);
  const long = fmtDateLong(d);
  return w === 'Today' || w === 'Tomorrow' ? `${w}, ${long}` : long;
}

/* --------------------------------------------------------------------------
   Header + collection bar
   -------------------------------------------------------------------------- */
function renderHeader(active) {
  const mount = document.querySelector('[data-header]');
  if (!mount) return;

  mount.innerHTML = `
    <header class="hdr">
      <div class="wrap">
        <div class="hdr__bar">
          <a class="wordmark" href="index.html">${ICONS.bird}${MERCHANT.shortName}</a>
          <nav class="hdr__nav" aria-label="Primary">
            ${NAV.map(
              (n) => `<a href="${n.href}"${n.label === active ? ' aria-current="page"' : ''}>${n.label}</a>`
            ).join('')}
          </nav>
          <div class="hdr__right">
            <a class="cartbtn" href="cart.html">
              ${ICONS.bag}
              <span>Basket</span>
              <span class="cart-count" data-cart-count data-empty="true">0</span>
            </a>
            <button class="burger" type="button" aria-expanded="false" aria-controls="mnav" aria-label="Menu">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </div>
      <div class="mnav" id="mnav" data-open="false">
        <div class="mnav__inner">
          <div class="wrap">
            <ul>${NAV.map((n) => `<li><a href="${n.href}">${n.label}</a></li>`).join('')}</ul>
          </div>
        </div>
      </div>
    </header>

    <div class="slotbar">
      <div class="wrap">
        <div class="slotbar__inner">
          <span class="slotbar__label">Collecting</span>
          <button class="slotbar__when" type="button" data-readyby-open>
            ${ICONS.clock}
            <strong data-readyby-text>—</strong>
          </button>
          <p class="countdown" data-countdown hidden>
            <span class="countdown__dot"></span>
            <span>Order within <b data-countdown-time>—</b> <span data-countdown-label></span></span>
          </p>
        </div>
      </div>
    </div>
  `;

  const burger = mount.querySelector('.burger');
  const nav = mount.querySelector('.mnav');
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    nav.dataset.open = String(!open);
  });

  mount.querySelector('[data-readyby-open]').addEventListener('click', () => {
    openDateModal({
      leadDays: 0,
      selected: getReadyBy(),
      title: 'When are you collecting?',
      note: 'Order before 11am and you can pick it up the same day.',
      onSelect: (d) => setReadyBy(d),
    });
  });

  paintReadyBy();
  updateCartCount();
  startCountdown();
}

/* The shared label is date-first; this shop thinks in days of the week. */
document.addEventListener('readyby:change', () => {
  const el = document.querySelector('[data-readyby-text]');
  if (!el) return;
  const d = getReadyBy();
  el.textContent = `${dayWord(d)}, ${fmtDate(d, { day: 'numeric', month: 'short' })}`;
});

/* --------------------------------------------------------------------------
   Footer
   -------------------------------------------------------------------------- */
function renderFooter() {
  const mount = document.querySelector('[data-footer]');
  if (!mount) return;

  mount.innerHTML = `
    <footer class="footer">
      <div class="wrap">
        <div class="footer__grid">
          <div>
            <h4>${MERCHANT.name}</h4>
            <p class="prose" style="font-size:.9375rem">${MERCHANT.tagline} on SE Division since
            ${MERCHANT.since}. Bread out at seven, pastries while they last, cakes with two days notice.</p>
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              ${CATEGORIES.map((c) => `<li><a href="shop.html?cat=${c.id}">${c.label}</a></li>`).join('')}
              <li><a href="cart.html">Your basket</a></li>
            </ul>
          </div>
          <div>
            <h4>Hours</h4>
            <ul>
              ${MERCHANT.hours
                .map((h) => `<li class="footer__hours"><span>${h.days}</span><span>${h.time}</span></li>`)
                .join('')}
            </ul>
          </div>
          <div>
            <h4>Find us</h4>
            <ul>
              <li>${MERCHANT.address}</li>
              <li><a href="tel:${MERCHANT.phone.replace(/[^0-9+]/g, '')}">${MERCHANT.phone}</a></li>
              <li><a href="mailto:${MERCHANT.email}">${MERCHANT.email}</a></li>
            </ul>
          </div>
        </div>
        <div class="footer__bottom">
          <p>© ${new Date().getFullYear()} ${MERCHANT.name} — Template 05, The Modern Neighbourhood Bakery</p>
          <p><a href="../../index.html">All templates</a> · Demonstration shop, no orders are processed</p>
        </div>
      </div>
    </footer>
  `;
}

/* --------------------------------------------------------------------------
   Product card
   Everyday stock adds in one tap. Cakes go to the configuration sheet,
   because they genuinely need decisions made.
   -------------------------------------------------------------------------- */
function renderCard(product, opts = {}) {
  const when = opts.when || getReadyBy();
  const s = shelf(product, when);
  const lead = leadDaysFor(product, product.defaults);
  const earliest = earliestFor(lead);
  const isCake = product.kind === 'cake';
  const soldOut = s.state === 'out';

  const statusText = isCake
    ? `${lead} ${lead === 1 ? 'day' : 'days'} notice · from ${dayWord(earliest)}`
    : s.label;

  const action = isCake
    ? `<a class="btn btn--sm pcard__add" href="product.html?id=${product.id}">Choose</a>`
    : soldOut
      ? `<button class="btn btn--sm pcard__add" type="button" disabled>Sold out</button>`
      : `<button class="btn btn--sm pcard__add" type="button" data-add-now="${product.id}">Add</button>`;

  return `
    <article class="pcard" data-sold="${soldOut}" data-reveal style="--reveal-delay:${opts.delay || 0}ms">
      <div class="pcard__media">
        ${product.popular ? '<span class="pcard__flag">Popular</span>' : ''}
        <img src="${img(product.image, 800)}" alt="${product.name} — ${product.subtitle}" loading="lazy" width="800" height="600">
      </div>
      <div class="pcard__body">
        <h3 class="pcard__name"><a class="pcard__link" href="product.html?id=${product.id}">${product.name}</a></h3>
        <p class="pcard__sub">${product.subtitle}</p>
        <p class="pcard__status"><span class="stock" data-state="${isCake ? 'made' : s.state}">${statusText}</span></p>
        <div class="pcard__foot">
          <p class="pcard__price">${money(product.price)}${
            product.options.length ? ' <small>from</small>' : ''
          }</p>
          ${action}
        </div>
      </div>
    </article>
  `;
}

/* --------------------------------------------------------------------------
   One-tap add
   The express path for a shop people use weekly. Uses the current collection
   date where the product allows it, and the earliest possible one where it
   does not — never silently fails.
   -------------------------------------------------------------------------- */
function addNow(productId, qty = 1) {
  const product = getProduct(productId);
  if (!product) return;

  const lead = leadDaysFor(product, product.defaults);
  const when = getReadyBy();
  const date = dayState(when, lead) === 'available' ? when : earliestFor(lead);

  addToCart({
    productId: product.id,
    selections: { ...product.defaults },
    addons: [],
    inscription: '',
    readyBy: dateKey(date),
    qty,
  });

  const spec = describeLine({ productId: product.id, selections: product.defaults });
  toast({
    title: `${qty > 1 ? qty + ' × ' : ''}${product.name} added`,
    detail: `${spec ? spec + ' · ' : ''}Collect ${dayWord(date).toLowerCase()}`,
    thumb: img(product.image, 160),
    href: 'cart.html',
    hrefLabel: 'Basket',
  });
}

function bindAddNow(scope) {
  (scope || document).addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-now]');
    if (!btn) return;
    e.preventDefault();
    addNow(btn.dataset.addNow);
  });
}

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
function boot(active) {
  renderHeader(active);
  renderFooter();
  bindAddNow();
  initReveal();
  document.dispatchEvent(new CustomEvent('readyby:change', { detail: { date: getReadyBy() } }));
}
