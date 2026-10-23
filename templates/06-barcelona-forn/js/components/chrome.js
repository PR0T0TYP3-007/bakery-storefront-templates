/**
 * @file The header and footer.
 *
 * A bakery's sign and its hours. Both are painted on marble, because the
 * tile cannot carry small text — see tokens.css.
 */

import * as session from '../services/session.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

/**
 * The weekday, written out.
 *
 * `hours[].day` is an English key because the shared schema is English and
 * every template reads it. Rather than print the key, the English name is
 * treated as an index into the week and `Intl` says it in the merchant's
 * locale — so a shop that switches locale gets its own weekday names and
 * the data never has to move.
 */
const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function weekday(day, locale) {
  const i = WEEK.indexOf(day);
  if (i < 0) return day;
  /* 2024-01-07 was a Sunday, so the index lands on the right day. */
  const d = new Date(Date.UTC(2024, 0, 7 + i));
  const name = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(d);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * The nav.
 *
 * Three places, because there are three places. Template 05 learned that a
 * nav listing every category is the nav telling you about one place several
 * times; the shop page does its own filtering.
 *
 * `id` rather than the label decides the current page, so renaming a link
 * cannot silently drop its active state.
 */
function navItems() {
  return [
    { id: 'shop', href: 'shop.html', label: 'The shop' },
    { id: 'calendar', href: 'calendar.html', label: 'The year' },
    { id: 'visit', href: 'visit.html', label: 'Visit us' },
  ];
}

/** @param {string} [active] id of the current page */
export function renderHeader(active) {
  const mount = document.querySelector('[data-header]');
  if (!mount) return;
  const { merchant } = session.state;

  const desc = document.querySelector('meta[name="description"]');
  if (desc && merchant.tagline) desc.setAttribute('content', merchant.tagline);

  mount.innerHTML = `
    <header class="hdr">
      <div class="wrap hdr__bar">
        <a class="mark" href="index.html">
          <span class="mark__name" lang="ca">${esc(merchant.shortName)}</span>
          <span class="mark__since label">since ${esc(merchant.since)}</span>
        </a>

        <nav class="nav" aria-label="Main">
          ${navItems()
            .map(
              (n) =>
                `<a href="${n.href}"${n.id === active ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`
            )
            .join('')}
        </nav>

        <a class="basket" href="basket.html">
          Basket <span class="basket__n num" data-basket-count>0</span>
        </a>
      </div>
    </header>`;

  paintBasket();
  session.on('cart:change', paintBasket);
}

function paintBasket() {
  const el = document.querySelector('[data-basket-count]');
  if (el) el.textContent = String(session.count());
}

/**
 * Photograph credits, in the footer of every page.
 *
 * Two of this template's images are Creative Commons and carry an
 * attribution obligation. That obligation is to the people *using* the work
 * — a file in the repository does not discharge it, so the credit is on the
 * page. The licences also require saying that the work was modified, which
 * it was: both were resized and re-encoded.
 *
 * Everything else in assets/img/ is Unsplash, public domain or CC0 and needs
 * no credit; it is listed in assets/img/CREDITS.md regardless.
 *
 * Driven from config, so a merchant who replaces the photography with their
 * own deletes `photoCredits` and the line disappears with it.
 */
function photoCredits(merchant) {
  const credits = merchant.photoCredits;
  if (!credits?.items?.length) return '';

  const list = credits.items
    .map(
      (c) =>
        `<a href="${esc(c.source)}" rel="noopener noreferrer">${esc(c.title)}</a>` +
        ` by ${esc(c.author)}` +
        ` (<a href="${esc(c.licenceUrl)}" rel="license noopener noreferrer">${esc(c.licence)}</a>)`
    )
    .join(', ');

  return `<p class="sm dim ftr__credits">Photography: ${list}, via Wikimedia Commons, resized.</p>`;
}

export function renderFooter() {
  const mount = document.querySelector('[data-footer]');
  if (!mount) return;
  const { merchant } = session.state;
  const loc = merchant.locations[0];

  mount.innerHTML = `
    <div class="ftr">
      <div class="wrap ftr__grid">
        <div>
          <p class="t-3" lang="ca">${esc(merchant.name)}</p>
          <p class="sm dim" style="margin-top:var(--s-2)">${esc(merchant.tagline)}</p>
        </div>

        <div>
          <p class="label dim">Where we are</p>
          <p class="sm" style="margin-top:var(--s-2)" lang="ca">${esc(loc.address)}</p>
        </div>

        <div>
          <p class="label dim">Hours</p>
          <ul class="ftr__hours sm" style="margin-top:var(--s-2)">
            ${merchant.hours
              .map(
                (h) => `<li><span>${esc(weekday(h.day, merchant.locale))}</span><span>${
                  h.open ? `${esc(h.open)}–${esc(h.close)}` : 'Closed'
                }</span></li>`
              )
              .join('')}
          </ul>
        </div>
      </div>

      <div class="wrap ftr__fine">
        <p class="sm dim">${esc(merchant.taxNote)}</p>
        ${photoCredits(merchant)}
      </div>
    </div>`;
}
