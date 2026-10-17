/**
 * @file Entry for the pages that are mostly written in HTML — visit, FAQ, 404.
 * They render their own content; this only brings in the chrome and fills the
 * handful of merchant-specific facts.
 */

import { startPage, $, $$, esc } from './_page.js';
import * as session from '../services/session.js';
import { qsFirst } from '../components/board.js';

await startPage({ nav: document.body.dataset.nav || null });

const { merchant } = session.state;
const q = qsFirst();

$$('[data-home-link]').forEach((a) => (a.href = `index.html${q}`));
$$('[data-shop-link]').forEach((a) => (a.href = `shop.html${q}`));

const fill = (sel, value) => $$(sel).forEach((el) => (el.textContent = value));

fill('[data-m-name]', merchant.name);
fill('[data-m-tagline]', merchant.tagline);
fill('[data-m-cutoff]', `${merchant.cutoffHour}${merchant.cutoffHour < 12 ? 'am' : 'pm'}`);
fill('[data-m-allergens]', merchant.allergenStatement);

/* Locations — a merchant may have one shop or several. */
const locs = $('[data-locations]');
if (locs) {
  locs.innerHTML = merchant.locations
    .map(
      (l) => `
      <div class="pdp__block" style="border-top:1px solid var(--rule)">
        <h3 class="t-3">${esc(l.name)}</h3>
        <p class="prose" style="margin-top:var(--s-2)">${esc(l.address)}</p>
        <p class="sm" style="margin-top:var(--s-2)">
          <a class="link" href="tel:${esc(l.phone.replace(/[^0-9+]/g, ''))}">${esc(l.phone)}</a>
        </p>
        <p class="sm" style="margin-top:var(--s-3)">
          Collection windows: ${esc(l.slots.join(' · '))}
        </p>
      </div>`
    )
    .join('');
}

/* Hours table, with today picked out. */
const hours = $('[data-hours]');
if (hours) {
  const todayName = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(new Date());
  hours.innerHTML = merchant.hours
    .map(
      (h) => `<li class="hours" data-today="${h.day === todayName}" style="padding-block:var(--s-2);border-bottom:1px solid var(--rule)">
        <span>${esc(h.day)}</span>
        <span>${h.open ? `${esc(h.open)} – ${esc(h.close)}` : 'Closed'}</span>
      </li>`
    )
    .join('');
}

/* Delivery section disappears entirely for a collection-only merchant. */
const delivery = $('[data-delivery-block]');
if (delivery) {
  if (!merchant.capabilities.delivery || !merchant.delivery) {
    delivery.hidden = true;
  } else {
    const zones = merchant.delivery.zones
      .map((z) => `<li><strong>${esc(z.label)}</strong> (${esc(z.prefixes.join(', '))})</li>`)
      .join('');
    $('[data-delivery-detail]').innerHTML = `
      <p class="prose">${esc(merchant.delivery.note)}</p>
      <ul class="prose" style="margin-top:var(--s-3);list-style:disc;padding-left:1.1rem">${zones}</ul>`;
  }
}

const collectOnly = $('[data-collect-only]');
if (collectOnly) collectOnly.hidden = Boolean(merchant.capabilities.delivery);
