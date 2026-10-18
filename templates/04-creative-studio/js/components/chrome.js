/**
 * @file The masthead, the allergen line and the colophon.
 *
 * Rendered from merchant config, so a studio's name, address, hours and
 * allergen statement appear once in data and are right on every page.
 */

import * as session from '../services/session.js';
import { icons } from './icons.js';

const NAV = [
  ['Commission', 'commission.html'],
  ['Work', 'work.html'],
];

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

/** Carries `?merchant=` across links so the chosen studio survives a click. */
export function link(href) {
  const m = new URLSearchParams(location.search).get('merchant');
  if (!m) return href;
  return href + (href.includes('?') ? '&' : '?') + `merchant=${encodeURIComponent(m)}`;
}

/**
 * The masthead. A wordmark, a nav and a basket — no bar, no shadow, no
 * background. It sits on the grid like everything else and is separated
 * from the page by a single rule that meets 3:1.
 *
 * @param {string|null} current nav label to mark as the current page
 */
export function renderMasthead(current) {
  const host = document.querySelector('[data-masthead]');
  if (!host) return;

  const { merchant } = session.state;

  const items = NAV.map(
    ([label, href]) =>
      `<a class="nav__link" href="${link(href)}"${label === current ? ' aria-current="page"' : ''}>${esc(label)}</a>`
  ).join('');

  host.innerHTML = `
    <div class="page masthead__in">
      <a class="mark" href="${link('index.html')}">
        <span class="mark__name">${esc(merchant.name)}</span>
        <span class="mark__where">${esc(merchant.locations[0].address.split(',').pop().trim())}</span>
      </a>

      <nav class="nav" aria-label="Pages">${items}</nav>

      <a class="basket" href="${link('cart.html')}" data-basket>
        <span class="label">Basket</span>
        <span class="basket__n num" data-basket-n>0</span>
      </a>

      <details class="menu" data-menu>
        <summary class="menu__btn" aria-label="Pages">${icons.menu}</summary>
        <nav class="menu__panel" aria-label="Pages">
          ${items}
          <a class="nav__link" href="${link('cart.html')}">Basket</a>
        </nav>
      </details>
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
  // Syne's zero is close enough to an O that "00" read as letters. The
  // count is plain now, and the word carries the meaning either way.
  el.textContent = String(n);
  el.dataset.empty = String(n === 0);
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

/** The colophon. A studio signs its work. */
export function renderColophon() {
  const host = document.querySelector('[data-footer]');
  if (!host) return;

  const { merchant } = session.state;
  const loc = merchant.locations[0];
  const c = merchant.commission ?? {};

  const hours = merchant.hours
    .map((h) => `<div><dt>${esc(h.day)}</dt><dd>${h.open ? `${esc(h.open)}–${esc(h.close)}` : 'Closed'}</dd></div>`)
    .join('');

  const zones = merchant.delivery.zones
    .map((z) => `<div><dt>${esc(z.label)}</dt><dd class="num">€${z.fee}</dd></div>`)
    .join('');

  host.innerHTML = `
    <div class="page">
      <hr class="rule">
      <div class="g sec--tight">
        <div class="c-4">
          <p class="t-2">${esc(merchant.name)}</p>
          <p class="sm dim" style="margin-top:var(--s-3)">${esc(merchant.tagline)}</p>
          <p class="sm" style="margin-top:var(--s-3)">
            <a href="mailto:${esc(merchant.email)}">${esc(merchant.email)}</a><br>
            <a href="tel:${esc(loc.phone.replace(/\s/g, ''))}">${esc(loc.phone)}</a>
          </p>
        </div>

        <div class="c-3">
          <p class="label">Where</p>
          <p class="sm" style="margin-top:var(--s-3)">${esc(loc.name)}<br>${esc(loc.address)}</p>
          <p class="label" style="margin-top:var(--s-4)">Open</p>
          <dl class="deflist sm" style="margin-top:var(--s-2)">${hours}</dl>
        </div>

        <div class="c-3">
          <p class="label">Delivery</p>
          <dl class="deflist sm" style="margin-top:var(--s-3)">${zones}</dl>
          <p class="sm dim" style="margin-top:var(--s-3)">
            Free over €${merchant.delivery.freeOver}. ${esc(merchant.delivery.note)}
          </p>
        </div>

        <div class="c-2">
          <p class="label">The terms</p>
          <ul class="sm plain" style="margin-top:var(--s-3)">
            <li>Commissions from €${c.minimum}</li>
            <li>${Math.round((c.depositPct ?? 0) * 100)}% deposit to book</li>
            <li>Quotes firm ${c.quoteValidDays} days</li>
            <li>${c.perWeek} commissions a week</li>
          </ul>
        </div>
      </div>

      <hr class="rule">
      <p class="colophon xs dim">
        <span>${esc(merchant.name)} — ${esc(merchant.tagline)}</span>
        <span>${esc(merchant.taxNote)}</span>
        <span>A design template. No money moves and nothing leaves this browser.</span>
      </p>
    </div>`;
}
