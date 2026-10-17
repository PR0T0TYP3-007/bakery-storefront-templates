/**
 * @file Header, collection bar and footer.
 *
 * Injected rather than duplicated across pages; in production these become
 * template partials. SEO-critical content stays in the page's own HTML.
 */

import { icons, wheatMark } from './icons.js';
import { duration, dayWord, date as fmtDate } from '../core/format.js';
import { msUntilHour, today, sameDay } from '../core/dates.js';
import { earliestFor } from '../core/fulfilment.js';
import * as session from '../services/session.js';
import { openDatePicker } from './datepicker.js';
import { qsFirst } from './board.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

function navItems() {
  const { catalogue, merchant } = session.state;
  const q = qsFirst();
  const items = [{ href: `shop.html${q}`, label: 'Shop' }];
  for (const c of catalogue.categories) {
    items.push({ href: `shop.html?cat=${c.id}${q ? `&merchant=${merchant.id}` : ''}`, label: c.label });
  }
  items.push({ href: `visit.html${q}`, label: 'Visit' });
  return items;
}

/** @param {string} [active] label of the current page */
export function renderHeader(active) {
  const mount = document.querySelector('[data-header]');
  if (!mount) return;
  const { merchant } = session.state;
  const q = qsFirst();

  // The document title is written for the default merchant; a page serving a
  // different one has to say so, in the tab and to a screen reader.
  document.title = document.title.replace(/^[^—|]+/, `${merchant.name} `);
  const desc = document.querySelector('meta[name="description"]');
  if (desc && merchant.tagline) desc.setAttribute('content', merchant.tagline);

  mount.innerHTML = `
    <header class="hdr">
      <div class="wrap">
        <div class="hdr__bar">
          <a class="mark" href="index.html${q}">
            <span class="mark__wheat" aria-hidden="true">${wheatMark}</span>
            ${esc(merchant.shortName)}
          </a>

          <nav class="nav" aria-label="Shop">
            ${navItems()
              .map(
                (n) =>
                  `<a href="${n.href}"${n.label === active ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`
              )
              .join('')}
          </nav>

          <div class="hdr__right">
            <a class="basket" href="cart.html${q}">
              ${icons.basket}
              <span>Basket</span>
              <span class="badge" data-count data-empty="true">0</span>
            </a>
            <button class="burger" type="button" aria-expanded="false" aria-controls="mnav" aria-label="Menu">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </div>

      <nav class="mnav wrap" id="mnav" aria-label="Shop" hidden>
        ${navItems().map((n) => `<a href="${n.href}">${esc(n.label)}</a>`).join('')}
      </nav>
    </header>

    <div class="collect">
      <div class="wrap">
        <div class="collect__inner">
          <span class="label">Collecting</span>
          <button class="collect__btn" type="button" data-when>
            ${icons.clock}<span data-when-text>—</span>
          </button>
          <p class="cutoff push" data-cutoff>
            Order within <b data-cutoff-time>—</b> <span data-cutoff-for></span>
          </p>
        </div>
      </div>
    </div>
  `;

  const burger = mount.querySelector('.burger');
  const mnav = mount.querySelector('#mnav');
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    mnav.hidden = open;
  });

  mount.querySelector('[data-when]').addEventListener('click', () => {
    openDatePicker({
      leadDays: 0,
      selected: session.state.when,
      note: `Order before ${merchant.cutoffHour}am and you can collect the same day.`,
      onSelect: (d) => session.setWhen(d),
    });
  });

  paintWhen();
  paintCount();
  startCutoff();

  session.on('when:change', paintWhen);
  session.on('cart:change', paintCount);
}

function paintWhen() {
  const el = document.querySelector('[data-when-text]');
  if (!el) return;
  const d = session.state.when;
  el.textContent = `${dayWord(d)}, ${fmtDate(d, { day: 'numeric', month: 'short' })}`;
}

function paintCount() {
  const n = session.count();
  document.querySelectorAll('[data-count]').forEach((el) => {
    el.textContent = String(n);
    el.dataset.empty = String(n === 0);
  });
}

/**
 * A static "order by 11am" makes the customer do the arithmetic. A countdown
 * does it for them. Past the cutoff it rolls to tomorrow's rather than
 * disappearing, because the deadline is still real — it has only moved.
 */
function startCutoff() {
  const wrap = document.querySelector('[data-cutoff]');
  if (!wrap) return;
  const time = wrap.querySelector('[data-cutoff-time]');
  const forEl = wrap.querySelector('[data-cutoff-for]');
  const { merchant } = session.state;

  const tick = () => {
    const ms = msUntilHour(merchant.cutoffHour);
    time.textContent = duration(ms);
    wrap.dataset.urgent = String(ms < 2 * 3600000);
    const soonest = earliestFor(merchant, 0);
    forEl.textContent = sameDay(soonest, today())
      ? 'for collection today'
      : `for ${dayWord(soonest).toLowerCase()}`;
  };

  tick();
  setInterval(tick, 1000);
}

export function renderFooter() {
  const mount = document.querySelector('[data-footer]');
  if (!mount) return;
  const { merchant, catalogue } = session.state;
  const q = qsFirst();
  const loc = merchant.locations[0];
  const todayName = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(new Date());

  mount.innerHTML = `
    <footer class="foot">
      <div class="wrap">
        <div class="foot__grid">
          <div>
            <h2 class="label">${esc(merchant.name)}</h2>
            <p class="prose sm">${esc(merchant.tagline)} Open since ${esc(merchant.since)}.</p>
          </div>

          <div>
            <h2 class="label">Shop</h2>
            <ul>
              ${catalogue.categories
                .map(
                  (c) =>
                    `<li><a href="shop.html?cat=${c.id}${q ? `&merchant=${merchant.id}` : ''}">${esc(c.label)}</a></li>`
                )
                .join('')}
              <li><a href="cart.html${q}">Your basket</a></li>
            </ul>
          </div>

          <div>
            <h2 class="label">Hours</h2>
            <ul>
              ${merchant.hours
                .map(
                  (h) => `<li class="hours" data-today="${h.day === todayName}">
                    <span>${esc(h.day)}</span>
                    <span>${h.open ? `${esc(h.open)}–${esc(h.close)}` : 'Closed'}</span>
                  </li>`
                )
                .join('')}
            </ul>
          </div>

          <div>
            <h2 class="label">Find us</h2>
            <ul class="sm">
              ${merchant.locations
                .map((l) => `<li><strong>${esc(l.name)}</strong><br>${esc(l.address)}</li>`)
                .join('')}
              <li><a href="tel:${esc(loc.phone.replace(/[^0-9+]/g, ''))}">${esc(loc.phone)}</a></li>
              <li><a href="mailto:${esc(merchant.email)}">${esc(merchant.email)}</a></li>
            </ul>
          </div>
        </div>

        <div class="foot__end">
          <p>© ${new Date().getFullYear()} ${esc(merchant.name)} — Template 05, The Modern Neighbourhood Bakery</p>
          <p><a href="../../index.html">All templates</a> · Demonstration shop, no orders are processed</p>
        </div>
      </div>
    </footer>
  `;
}
