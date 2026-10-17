/* ==========================================================================
   TEMPLATE 01 — chrome.js
   This template's own header, footer, product card and boot sequence.

   Everything here is presentation. The behaviour it calls into
   (createDatePicker, openDateModal, toast, initReveal, the cart) lives in
   shared/js and is identical across templates.
   ========================================================================== */

const ICONS = {
  calendar: UI_ICONS.calendar,
  bag: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 4.5h10l-.9 10H3.9L3 4.5Z" stroke="currentColor" stroke-width="1.2"/><path d="M5.75 6.25v-2a2.25 2.25 0 0 1 4.5 0v2" stroke="currentColor" stroke-width="1.2"/></svg>',
  arrow:
    '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M1 6h10M6.5 1.5 11 6l-4.5 4.5" stroke="currentColor" stroke-width="1.3"/></svg>',
};

const NAV = [
  { href: 'collection.html', label: 'The Catalogue' },
  { href: 'collection.html#occasions', label: 'Occasions' },
  { href: 'index.html#atelier', label: 'The Atelier' },
  { href: 'index.html#journal', label: 'Journal' },
];

/* --------------------------------------------------------------------------
   Header
   -------------------------------------------------------------------------- */
function renderHeader(active) {
  const mount = document.querySelector('[data-header]');
  if (!mount) return;

  mount.innerHTML = `
    <header class="header">
      <div class="wrap">
        <div class="header__bar">
          <nav class="header__nav" aria-label="Primary">
            ${NAV.map(
              (n) =>
                `<a href="${n.href}"${n.label === active ? ' aria-current="page"' : ''}>${n.label}</a>`
            ).join('')}
          </nav>
          <button class="burger" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Menu">
            <span></span><span></span><span></span>
          </button>
          <a class="wordmark" href="index.html">${MERCHANT.shortName}</a>
          <div class="header__right">
            <a class="icon-btn" href="cart.html" aria-label="Cart">
              ${ICONS.bag}
              <span class="visually-hidden">Cart</span>
              <span class="cart-count" data-cart-count data-empty="true">0</span>
            </a>
          </div>
        </div>
      </div>
      <div class="mobile-nav" id="mobile-nav" data-open="false">
        <div class="mobile-nav__inner">
          <div class="wrap">
            <ul>
              ${NAV.map((n) => `<li><a href="${n.href}">${n.label}</a></li>`).join('')}
              <li><a href="cart.html">Cart</a></li>
            </ul>
          </div>
        </div>
      </div>
    </header>

    <div class="readyby">
      <div class="wrap">
        <div class="readyby__inner">
          <div class="readyby__label">
            <span class="meta">Ready by</span>
            <button class="readyby__btn" type="button" data-readyby-open>
              ${ICONS.calendar}
              <strong data-readyby-text>—</strong>
            </button>
          </div>
          <p class="countdown" data-countdown hidden>
            <span class="countdown__dot"></span>
            <span>Order within <b data-countdown-time>—</b> <span data-countdown-label></span></span>
          </p>
        </div>
      </div>
    </div>
  `;

  const burger = mount.querySelector('.burger');
  const nav = mount.querySelector('.mobile-nav');
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    nav.dataset.open = String(!open);
  });

  mount.querySelector('[data-readyby-open]').addEventListener('click', () => {
    openDateModal({
      leadDays: 0,
      selected: getReadyBy(),
      title: 'When do you need it?',
      note: 'Setting a date first means the catalogue only shows you what can actually be made in time.',
      onSelect: (d) => setReadyBy(d),
    });
  });

  paintReadyBy();
  updateCartCount();
  startCountdown();
}

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
            <p class="prose" style="font-size:.9375rem">${MERCHANT.tagline} in ${MERCHANT.city}.
            Every cake is made to order, catalogued, and finished by hand the morning it leaves us.</p>
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              <li><a href="collection.html">The Catalogue</a></li>
              <li><a href="collection.html#occasions">By Occasion</a></li>
              <li><a href="product.html?id=noir">Bestsellers</a></li>
              <li><a href="cart.html">Your Order</a></li>
            </ul>
          </div>
          <div>
            <h4>Atelier</h4>
            <ul>
              <li><a href="index.html#atelier">Our Story</a></li>
              <li><a href="index.html#journal">Journal</a></li>
              <li><a href="index.html#visit">Visit</a></li>
              <li><a href="index.html#faq">Ordering &amp; Lead Times</a></li>
            </ul>
          </div>
          <div>
            <h4>Visit</h4>
            <ul>
              <li>${MERCHANT.address}</li>
              <li>Tue–Sun, 8am–6pm</li>
              <li><a href="tel:${MERCHANT.phone.replace(/[^0-9+]/g, '')}">${MERCHANT.phone}</a></li>
              <li><a href="mailto:${MERCHANT.email}">${MERCHANT.email}</a></li>
            </ul>
          </div>
        </div>
        <div class="footer__mark" aria-hidden="true">${MERCHANT.shortName}</div>
        <div class="footer__bottom">
          <p class="meta">© ${new Date().getFullYear()} ${MERCHANT.name} — Template 01, The Editorial Atelier</p>
          <p class="meta"><a href="../../index.html">All templates</a> · Demonstration storefront</p>
        </div>
      </div>
    </footer>
  `;
}

/* --------------------------------------------------------------------------
   Product card
   Two affordances: Quick add for the express buyer who already knows, and the
   card itself for the exploratory buyer who wants the full configuration.
   -------------------------------------------------------------------------- */
function renderCard(product, opts = {}) {
  const readyBy = opts.readyBy || getReadyBy();
  const lead = leadDaysFor(product, product.defaults);
  const earliest = earliestFor(lead);
  const available = readyBy >= earliest && dayState(readyBy, lead) === 'available';

  let availState = 'ok';
  let availText = `Ready ${fmtDate(earliest, { day: 'numeric', month: 'short' })}`;
  if (!available) {
    availState = 'no';
    availText = `Needs ${lead} ${lead === 1 ? 'day' : 'days'} — first ${fmtDate(earliest, { day: 'numeric', month: 'short' })}`;
  } else if (lead >= 5) {
    availState = 'soon';
  }

  return `
    <article class="card" data-available="${available}" data-reveal style="--reveal-delay:${opts.delay || 0}ms">
      <div class="card__media">
        <span class="card__plate">Pl. ${product.plate}</span>
        <img src="${img(product.image, 760)}" alt="${product.name} — ${product.subtitle}" loading="lazy" width="760" height="950">
        <div class="card__quick">
          <button class="btn btn--sm" type="button" data-quick-add="${product.id}">Quick add</button>
        </div>
      </div>
      <div class="card__body">
        <div class="card__head">
          <h3 class="card__name"><a class="card__link" href="product.html?id=${product.id}">${product.name}</a></h3>
          <p class="card__price">${money(product.price)}</p>
        </div>
        <p class="card__sub">${product.subtitle}</p>
        <div class="card__foot">
          <span class="avail" data-state="${availState}">${availText}</span>
          <span class="meta">${ICONS.arrow}</span>
        </div>
      </div>
    </article>
  `;
}

function bindQuickAdd(scope) {
  (scope || document).addEventListener('click', (e) => {
    const btn = e.target.closest('[data-quick-add]');
    if (!btn) return;
    e.preventDefault();

    const product = getProduct(btn.dataset.quickAdd);
    if (!product) return;

    const lead = leadDaysFor(product, product.defaults);
    const readyBy = getReadyBy();
    const date = readyBy >= earliestFor(lead) ? readyBy : earliestFor(lead);

    addToCart({
      productId: product.id,
      selections: { ...product.defaults },
      addons: [],
      inscription: '',
      readyBy: dateKey(date),
      qty: 1,
    });

    toast({
      title: `${product.name} added`,
      detail: `${describeLine({ productId: product.id, selections: product.defaults })} · ${fmtDate(date)}`,
      thumb: img(product.image, 160),
      href: 'cart.html',
      hrefLabel: 'Review',
    });
  });
}

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
function boot(active) {
  renderHeader(active);
  renderFooter();
  bindQuickAdd();
  initReveal();
}
