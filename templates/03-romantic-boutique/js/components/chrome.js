/**
 * @file The masthead, the allergen line and the colophon.
 *
 * Rendered from merchant config, so a shop's name, address, hours, delivery
 * zones and allergen statement appear once in data and are right on every
 * page. Template 05 once advertised another bakery's bread because a heading
 * was written into the HTML instead.
 */

import * as session from '../services/session.js';
import { icons } from './icons.js';
import { money } from '../../../../shared/core/format.js';

const NAV = [
  ['Cakes', 'cakes.html'],
  ['The card', 'card.html'],
];

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

/** Carries `?merchant=` across links so the chosen shop survives a click. */
export function link(href) {
  const m = new URLSearchParams(location.search).get('merchant');
  if (!m) return href;
  return href + (href.includes('?') ? '&' : '?') + `merchant=${encodeURIComponent(m)}`;
}

/**
 * The masthead: the wordmark centred, the nav beneath it, the basket on the
 * right. No bar, no background, no shadow and no rule under it — this
 * template separates by shape and air, and a sticky bar with a drop shadow
 * would be the first thing to break that.
 *
 * @param {string|null} current nav label to mark as the current page
 */
export function renderMasthead(current) {
  const host = document.querySelector('[data-masthead]');
  if (!host) return;

  const { merchant } = session.state;
  const town = merchant.locations[0].address.split(',').pop().trim().split(' ')[0];

  const items = NAV.map(
    ([label, href]) =>
      `<a class="nav__link" href="${link(href)}"${label === current ? ' aria-current="page"' : ''}>${esc(label)}</a>`
  ).join('');

  host.innerHTML = `
    <div class="page masthead__in">
      <nav class="nav nav--left" aria-label="Pages">${items}</nav>

      <a class="wordmark" href="${link('index.html')}" data-wordmark>
        <span class="wordmark__plot">
          <span class="lg-layer lg-layer--back" data-mark-back aria-hidden="true"></span>
          <span class="wordmark__name" data-mark-name>${esc(merchant.name)}</span>
          <span class="lg-layer lg-layer--front" data-mark-front aria-hidden="true"></span>
        </span>
        <span class="wordmark__where">${esc(town)}</span>
      </a>

      <div class="masthead__end">
        <a class="basket" href="${link('cart.html')}" data-basket>
          ${icons.basket}
          <span class="basket__n num" data-basket-n>0</span>
        </a>

        <details class="menu" data-menu>
          <summary class="menu__btn" aria-label="Pages">${icons.menu}</summary>
          <nav class="menu__panel" aria-label="Pages">
            ${items}
            <a class="nav__link" href="${link('cart.html')}">Basket</a>
          </nav>
        </details>
      </div>
    </div>`;

  const menu = host.querySelector('[data-menu]');
  if (menu) {
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target)) menu.open = false;
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary').focus();
      }
    });
  }

  paintBasket();
  session.on('cart:change', paintBasket);
}

function paintBasket() {
  const el = document.querySelector('[data-basket-n]');
  if (!el) return;
  const n = session.count();
  el.textContent = String(n);
  // Not `data-empty`. A bare, common attribute name on a header element is
  // matched by any page querying `[data-empty]`, and the header comes first
  // in document order — which is how Template 04's basket page once emptied
  // itself by finding the chip in the masthead.
  el.dataset.zero = String(n === 0);
  document
    .querySelector('[data-basket]')
    ?.setAttribute('aria-label', n === 0 ? 'Basket, empty' : `Basket, ${n} ${n === 1 ? 'item' : 'items'}`);
}

/**
 * The allergen line. Legally the most important sentence on the site, so it
 * is a permanent part of every page rather than a tooltip on a product.
 */
export function renderAllergens() {
  const host = document.querySelector('[data-allergens]');
  if (!host) return;
  host.innerHTML = `
    <div class="page allergen__in">
      ${icons.alert}
      <p class="sm">${esc(session.state.merchant.allergenStatement)}</p>
    </div>`;
}

/** The colophon. */
export function renderColophon() {
  const host = document.querySelector('[data-footer]');
  if (!host) return;

  const { merchant } = session.state;
  const loc = merchant.locations[0];

  const hours = merchant.hours
    .map(
      (h) =>
        `<div><dt>${esc(h.day)}</dt><dd>${h.open ? `${esc(h.open)}–${esc(h.close)}` : 'Closed'}</dd></div>`
    )
    .join('');

  const zones = merchant.delivery.zones
    .map((z) => `<div><dt>${esc(z.label)}</dt><dd class="num">${money(z.fee)}</dd></div>`)
    .join('');

  host.innerHTML = `
    <div class="page stack stack--loose">
      <div class="cols cols--wide">
        <div>
          <p class="t-2">${esc(merchant.name)}</p>
          <p class="sm dim" style="margin-top:var(--s-3)">${esc(merchant.tagline)}</p>
          <p class="sm" style="margin-top:var(--s-3)">
            <a href="mailto:${esc(merchant.email)}">${esc(merchant.email)}</a><br>
            <a href="tel:${esc(loc.phone.replace(/\s/g, ''))}">${esc(loc.phone)}</a>
          </p>
        </div>

        <div>
          <p class="label">Where, and when</p>
          <p class="sm" style="margin-top:var(--s-3)">${esc(loc.address)}</p>
          <dl class="deflist sm" style="margin-top:var(--s-3)">${hours}</dl>
        </div>

        <div>
          <p class="label">We bring it</p>
          <dl class="deflist sm" style="margin-top:var(--s-3)">${zones}</dl>
          <p class="sm dim" style="margin-top:var(--s-3)">
            Free over ${money(merchant.delivery.freeOver)}. ${esc(merchant.delivery.note)}
          </p>
        </div>

        <div>
          <p class="label">The card</p>
          <p class="sm" style="margin-top:var(--s-3)">${esc(merchant.card.stock)}.</p>
          <p class="sm dim" style="margin-top:var(--s-3)">${esc(merchant.card.note)}</p>
        </div>
      </div>

      <p class="colophon xs dim">
        <span>${esc(merchant.name)} — ${esc(merchant.tagline)}</span>
        <span>${esc(merchant.taxNote)}</span>
        <span>A design template. No money moves and nothing leaves this browser.</span>
      </p>
    </div>`;
}
