/**
 * @file The header, the allergen band and the footer.
 *
 * Rendered from the merchant config rather than written into each HTML file,
 * so a shop's name, address, hours and allergen statement appear once in
 * data and are correct on all eight pages.
 */

import * as session from '../services/session.js';
import { icons } from './icons.js';

const NAV = [
  ['Build one', 'build.html'],
  ['Our cakes', 'shop.html'],
  ['Occasions', 'shop.html?view=occasions'],
];

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

/** Carries `?merchant=` across links so the chosen shop survives navigation. */
export function qs() {
  const m = new URLSearchParams(location.search).get('merchant');
  return m ? `?merchant=${encodeURIComponent(m)}` : '';
}

/** Appends the merchant query to a link that may already have one. */
function link(href) {
  const m = new URLSearchParams(location.search).get('merchant');
  if (!m) return href;
  return href + (href.includes('?') ? '&' : '?') + `merchant=${encodeURIComponent(m)}`;
}

/**
 * @param {string|null} current  the nav label to mark as the current page
 */
export function renderHeader(current) {
  const host = document.querySelector('[data-chrome]');
  if (!host) return;

  const { merchant } = session.state;

  const items = NAV.map(
    ([label, href]) =>
      `<a href="${link(href)}"${label === current ? ' aria-current="page"' : ''}>${esc(label)}</a>`
  ).join('');

  host.innerHTML = `
    <div class="shell chrome__in">
      <a class="mark" href="${link('index.html')}">
        ${esc(merchant.name)}
        <span class="mark__sub">${esc(merchant.locations[0].address.split(',').slice(-2, -1)[0]?.trim() ?? '')}</span>
      </a>

      <nav class="nav" aria-label="Pages">${items}</nav>

      <a class="basket spread" href="${link('cart.html')}" data-basket>
        ${icons.basket}
        <span class="basket__word">Basket</span>
        <span class="basket__n" data-count data-zero="true">0</span>
      </a>

      <details class="menu" data-menu>
        <summary class="menu__btn" aria-label="Pages">${icons.menu}</summary>
        <nav class="menu__panel" aria-label="Pages">
          ${items}
          <a href="${link('cart.html')}">Basket</a>
        </nav>
      </details>
    </div>`;

  // Clicking anywhere else closes the mobile menu. Escape does too, because
  // a <details> on its own does not handle either.
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

  paintCount();
  session.on('cart:change', paintCount);
}

function paintCount() {
  const el = document.querySelector('[data-count]');
  if (!el) return;
  const n = session.count();
  el.textContent = String(n);
  el.dataset.zero = String(n === 0);
  const basket = document.querySelector('[data-basket]');
  if (basket) {
    basket.setAttribute(
      'aria-label',
      n === 0 ? 'Basket, empty' : `Basket, ${n} ${n === 1 ? 'item' : 'items'}`
    );
  }
}

/**
 * The allergen band. Required reading, so it is a permanent part of every
 * page rather than a line in the footer or a tooltip on a product.
 */
export function renderAllergens() {
  const host = document.querySelector('[data-allergens]');
  if (!host) return;
  host.innerHTML = `
    <div class="shell allergen__in">
      ${icons.alert}
      <p>${esc(session.state.merchant.allergenStatement)}</p>
    </div>`;
}

export function renderFooter() {
  const host = document.querySelector('[data-footer]');
  if (!host) return;

  const { merchant } = session.state;
  const loc = merchant.locations[0];

  const hours = merchant.hours
    .map(
      (h) =>
        `<li>${esc(h.day)} · ${h.open ? `${esc(h.open)}–${esc(h.close)}` : '<strong>Closed</strong>'}</li>`
    )
    .join('');

  const zones = merchant.delivery.zones
    .map((z) => `<li>${esc(z.label)} · £${z.fee.toFixed(2)}</li>`)
    .join('');

  host.innerHTML = `
    <div class="shell">
      <div class="footer__grid">
        <div>
          <h2>${esc(merchant.shortName)}</h2>
          <p class="sm">${esc(merchant.tagline)}.</p>
          <p class="sm"><a href="mailto:${esc(merchant.email)}">${esc(merchant.email)}</a><br>
             <a href="tel:${esc(loc.phone.replace(/\s/g, ''))}">${esc(loc.phone)}</a></p>
        </div>
        <div>
          <h2>Where</h2>
          <p class="sm">${esc(loc.name)}<br>${esc(loc.address)}</p>
        </div>
        <div>
          <h2>Open</h2>
          <ul>${hours}</ul>
        </div>
        <div>
          <h2>We deliver to</h2>
          <ul>${zones}</ul>
          <p class="sm">Free over £${merchant.delivery.freeOver}. ${esc(merchant.delivery.note)}</p>
        </div>
        <div>
          <h2>Pages</h2>
          <ul>
            <li><a href="${link('build.html')}">Build a cake</a></li>
            <li><a href="${link('shop.html')}">Our cakes</a></li>
            <li><a href="${link('cart.html')}">Basket</a></li>
            <li><a href="${link('styleguide.html')}">Style guide</a></li>
          </ul>
        </div>
      </div>
      <div class="footer__legal">
        <span>${esc(merchant.name)} · Baking since ${esc(merchant.since)}</span>
        <span>${esc(merchant.taxNote)}</span>
        <span>A design template. Nothing here takes a real payment.</span>
      </div>
    </div>`;
}
