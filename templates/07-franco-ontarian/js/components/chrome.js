/**
 * @file The header, the language switch, and the footer.
 */

import * as session from '../services/session.js';
import {
  lang,
  setLang,
  onLang,
  t,
  switchLabel,
  bcp47,
  syncDocument,
} from '../services/locale.js';
import { other } from '../lang.js';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** The nav, in whichever language is forward. */
const NAV = {
  shop: { fr: 'La boutique', en: 'The shop' },
  glossary: { fr: 'Les deux noms', en: 'Both names' },
  visit: { fr: 'Nous trouver', en: 'Find us' },
};

const HREF = { shop: 'shop.html', glossary: 'glossary.html', visit: 'visit.html' };

function weekday(day, which = lang()) {
  const i = WEEK.indexOf(day);
  if (i < 0) return day;
  const d = new Date(Date.UTC(2024, 0, 7 + i));
  const name = new Intl.DateTimeFormat(bcp47(which), {
    weekday: 'long',
    timeZone: 'UTC',
  }).format(d);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * The language switch.
 *
 * A word, never a flag. Flags are countries and Franco-Ontarians are not
 * French; a tricolore here would be wrong about the people the template is
 * for. It is a real button with an accessible name in BOTH languages,
 * because the person who most needs this control is the one who cannot read
 * the language currently showing.
 */
function langSwitch() {
  const s = switchLabel(lang());
  return `
    <button class="lang" type="button" data-lang-switch
            lang="${esc(bcp47(s.to))}" aria-label="${esc(s.label)}">
      ${esc(s.text)}
    </button>`;
}

/** @param {string} [active] id of the current page */
export function renderHeader(active) {
  const mount = document.querySelector('[data-header]');
  if (!mount) return;
  const { merchant } = session.state;

  const draw = () => {
    const which = lang();

    /* session.boot() has run by now and has stamped merchant.locale onto
       <html lang>. Put the reader's choice back. See locale.js. */
    syncDocument();

    mount.innerHTML = `
      <header class="hdr">
        <div class="wrap hdr__bar">
          <a class="mark" href="index.html">
            <span class="mark__name sign" lang="fr-CA">${esc(merchant.name)}</span>
            <span class="mark__since label">${
              which === 'fr' ? 'depuis' : 'since'
            } ${esc(merchant.since)}</span>
          </a>

          <nav class="nav" aria-label="${which === 'fr' ? 'Principal' : 'Main'}">
            ${Object.entries(NAV)
              .map(
                ([id, label]) =>
                  `<a href="${HREF[id]}"${
                    id === active ? ' aria-current="page"' : ''
                  }>${esc(t(label, which))}</a>`
              )
              .join('')}
          </nav>

          ${langSwitch()}

          <a class="basket" href="basket.html">
            ${which === 'fr' ? 'Panier' : 'Basket'}
            <span class="basket__n num" data-basket-count>0</span>
          </a>
        </div>
      </header>`;

    paintBasket();
  };

  draw();
  onLang(draw);
  session.on('cart:change', paintBasket);

  /* Delegated, because `draw` replaces the button on every switch. */
  mount.addEventListener('click', (e) => {
    if (e.target.closest('[data-lang-switch]')) setLang(other(lang()));
  });
}

function paintBasket() {
  const el = document.querySelector('[data-basket-count]');
  if (el) el.textContent = String(session.count());
}

export function renderFooter() {
  const mount = document.querySelector('[data-footer]');
  if (!mount) return;
  const { merchant } = session.state;
  const loc = merchant.locations[0];

  const draw = () => {
    const which = lang();

    mount.innerHTML = `
      <div class="ftr on-dark">
        <div class="wrap ftr__grid">
          <div>
            <p class="t-3 sign" lang="fr-CA">${esc(merchant.name)}</p>
            <p class="sm dim" style="margin-top:var(--s-2)">
              ${
                which === 'fr'
                  ? 'Boulangerie de famille à Hearst, en Ontario.'
                  : 'A family bakery in Hearst, Ontario.'
              }
            </p>

            <!-- The Franco-Ontarian flag. Green for summer, white for
                 winter, a fleur-de-lys for the francophonie and a trillium
                 for Ontario; designed in Sudbury in 1975 and an official
                 emblem of Ontario since 2020.

                 It is DRAWN, never a text background: the green measures
                 3.03 at its best anywhere in this palette. See tokens.css
                 rule two. -->
            <svg class="flag" viewBox="0 0 60 40" role="img"
                 aria-label="${
                   which === 'fr'
                     ? 'Le drapeau franco-ontarien'
                     : 'The Franco-Ontarian flag'
                 }" style="margin-top:var(--s-4)">
              <rect width="30" height="40" fill="var(--flag-green)"/>
              <rect x="30" width="30" height="40" fill="var(--enamel)"/>
              <path d="M15 8 q-3 5 0 9 q-4-2-5 1 q3 2 5 1 v5 h2 v-5 q2 1 5-1 q-1-3-5-1 q3-4 0-9z"
                    fill="var(--enamel)"/>
              <path d="M45 30 l-5-8 h3.5 l1.5 2.5 1.5-2.5 H50z M45 26 l-4-7 h8z"
                    fill="var(--flag-green)"/>
              <rect width="60" height="40" fill="none"
                    stroke="var(--rim)" stroke-width="2"/>
            </svg>
          </div>

          <div>
            <p class="label dim">${which === 'fr' ? 'Nous trouver' : 'Where we are'}</p>
            <p class="sm" style="margin-top:var(--s-2)">${esc(loc.address)}</p>
            <p class="sm" style="margin-top:var(--s-2)">
              <a href="tel:${esc(String(merchant.phone).replace(/[^\d+]/g, ''))}">${esc(
                merchant.phone
              )}</a>
            </p>
          </div>

          <div>
            <p class="label dim">${which === 'fr' ? 'Heures' : 'Hours'}</p>
            <ul class="ftr__hours sm" style="margin-top:var(--s-2)">
              ${merchant.hours
                .map(
                  (h) => `<li><span>${esc(weekday(h.day, which))}</span><span>${
                    h.open
                      ? `${esc(h.open)}–${esc(h.close)}`
                      : which === 'fr'
                        ? 'Fermé'
                        : 'Closed'
                  }</span></li>`
                )
                .join('')}
            </ul>
          </div>
        </div>

        <div class="wrap ftr__fine">
          <p class="sm dim">${esc(t(merchant.taxNote, which))}</p>
        </div>
      </div>`;
  };

  draw();
  onLang(draw);
}
