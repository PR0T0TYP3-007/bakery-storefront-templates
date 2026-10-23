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

/**
 * Photograph credits, in the footer of every page.
 *
 * Five of this template's photographs are Creative Commons and carry an
 * attribution obligation. That obligation runs to the people USING the
 * work, so a line in a repository file does not discharge it: the credit
 * goes on the page. The licences also require saying the work was changed,
 * and it was — every one was cropped, resized and re-encoded.
 *
 * The rest is Unsplash or public domain and needs no credit; all of it is
 * listed in assets/img/CREDITS.md regardless.
 *
 * Driven from config, so a merchant who shoots their own photography
 * deletes `photoCredits` and this line goes with it.
 */
function photoCredits(merchant, which) {
  const credits = merchant.photoCredits;
  if (!credits?.items?.length) return '';

  const list = credits.items
    .map(
      (c) =>
        `<a href="${esc(c.source)}" rel="noopener noreferrer">${esc(c.title)}</a>` +
        ` ${which === 'fr' ? 'de' : 'by'} ${esc(c.author)}` +
        ` (<a href="${esc(c.licenceUrl)}" rel="license noopener noreferrer">${esc(
          c.licence
        )}</a>)`
    )
    .join(', ');

  return `<p class="sm dim ftr__credits">${
    which === 'fr'
      ? `Photographies : ${list}, via Wikimedia Commons, recadrées et redimensionnées.`
      : `Photography: ${list}, via Wikimedia Commons, cropped and resized.`
  }</p>`;
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
              <!-- The fleur-de-lys: a centre petal, two side petals that
                   curl down, a band and a footed stem. The first attempt was
                   a single clever path and it drew something closer to a map
                   pin; this is five plain shapes and it reads. -->
              <g fill="var(--enamel)">
                <path d="M15 4.6c-3 4-3.4 8.6 0 12.4 3.4-3.8 3-8.4 0-12.4z"/>
                <path d="M15 17c-3.6-2.6-8.4-1.4-9.6 2.2-.9 2.8 1 5.2 4.2 5.4 2 .1 4-.9 5.4-2.6z"/>
                <path d="M15 17c3.6-2.6 8.4-1.4 9.6 2.2.9 2.8-1 5.2-4.2 5.4-2 .1-4-.9-5.4-2.6z"/>
                <rect x="9" y="24.6" width="12" height="1.9"/>
                <path d="M13.8 26.5h2.4c0 2.8.5 4.6 1.8 6.4h-6c1.3-1.8 1.8-3.6 1.8-6.4z"/>
              </g>

              <!-- The trillium: three petals at 120 degrees, which is the
                   whole of the flower anyone recognises. -->
              <g fill="var(--flag-green)">
                <path d="M45 9c-4 3.2-4 8 0 10.6 4-2.6 4-7.4 0-10.6z"/>
                <path d="M44.2 20.4c-1.2 4.8-5.2 7.4-9.2 6.4.6-4.8 4.4-7.4 9.2-6.4z"/>
                <path d="M45.8 20.4c1.2 4.8 5.2 7.4 9.2 6.4-.6-4.8-4.4-7.4-9.2-6.4z"/>
              </g>
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
          ${photoCredits(merchant, which)}
        </div>
      </div>`;
  };

  draw();
  onLang(draw);
}
