/**
 * @file Home.
 *
 * Everything on this page is painted twice — once per language — and
 * repainted when the switch is pressed. `draw()` is therefore the whole
 * page, and it is idempotent: it reads the current language and rebuilds
 * from config, never patching what is already there.
 *
 * That is more work than translating strings in place, and it is the only
 * honest way to do it here. The two languages are not translations of each
 * other, so switching can change the *content*, not just the words.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter, esc } from '../components/chrome.js';
import { plate, kin, money } from '../components/plates.js';
import { lang, onLang, t, bcp47 } from '../services/locale.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader('home');
renderFooter();

const { merchant, catalogue } = session.state;

/* The pair the whole template is about. Looked up by id rather than by
   position, so reordering the catalogue cannot quietly change the argument
   this section is making. */
const SUGAR = catalogue.products.find((p) => p.id === 'tarte-au-sucre');
const BUTTER = catalogue.products.find((p) => p.id === 'butter-tart');

const COPY = {
  twoHead: { fr: 'Deux noms, deux tartes', en: 'Two names, two tarts' },
  listHead: { fr: 'Des deux bords', en: 'Both sides' },
  listSub: {
    fr: 'Ce qu’on fait, en français et en anglais',
    en: 'What we make, in French and in English',
  },
  all: { fr: 'Tout ce qu’on fait', en: 'Everything we make' },
  shopLabel: { fr: 'La boulangerie', en: 'The bakery' },
  skip: { fr: 'Aller aux tartes', en: 'Skip to the tarts' },
};

function draw() {
  const which = lang();
  const { voice } = merchant;

  document.title = `${merchant.name} — Hearst, Ontario`;

  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', t(voice.lede, which));

  /* The skip link is the first thing a keyboard reaches, so it switches too.
     An English reader tabbing into "Aller aux tartes" is exactly the person
     the language switch exists for. */
  $('[data-skip]').textContent = t(COPY.skip, which);

  /* The hero photograph is described in whichever language is showing. An
     empty alt would be defensible — it is decorative-ish — but the room IS
     the claim's setting, and a blank alt tells a screen reader nothing
     about the shop it is standing in. */
  const heroShot = $('[data-hero-shot]');
  if (heroShot) {
    heroShot.alt =
      which === 'fr'
        ? 'Le comptoir de la boulangerie en plein jour, les pains et les tartes sortis'
        : 'The bakery counter in daylight, the breads and tarts set out';
  }

  $('[data-kicker]').textContent = t(voice.kicker, which);
  $('[data-headline]').textContent = t(voice.headline, which);
  $('[data-lede]').textContent = t(voice.lede, which);

  /* ---------------------------------------------------------------------
     The two tarts
     --------------------------------------------------------------------- */
  $('[data-two-head]').textContent = t(COPY.twoHead, which);

  $('[data-two]').innerHTML = `
    <div class="two">
      ${[SUGAR, BUTTER]
        .filter(Boolean)
        .map((p) => `<div class="two__side">${plate(p, { merchant })}</div>`)
        .join('')}
    </div>
    ${SUGAR ? kin(SUGAR) : ''}`;

  /* ---------------------------------------------------------------------
     The list, in two columns

     The French name, a rule, the English name, the price. No photographs
     and no date: this section is a sign, and the sign is the concept.
     --------------------------------------------------------------------- */
  $('[data-list-head]').textContent = t(COPY.listHead, which);
  $('[data-list-sub]').textContent = t(COPY.listSub, which);
  $('[data-all]').textContent = t(COPY.all, which);

  $('[data-ledger]').innerHTML = catalogue.products
    .map((p) => {
      const href = `product.html?id=${encodeURIComponent(p.id)}`;
      const price = esc(money(p.price, merchant, which));

      /* One word for both — tourtière, butter tart. It goes across the
         middle rather than being printed twice with a rule between, which
         would be the page arguing with itself. */
      if (p.fr.name === p.en.name) {
        return `
          <a class="ledg__row ledg__row--one" href="${href}">
            <span class="ledg__both sign">${esc(p.fr.name)}</span>
            <span class="ledg__price money">${price}</span>
          </a>`;
      }

      return `
        <a class="ledg__row" href="${href}">
          <span class="ledg__fr sign" lang="fr-CA">${esc(p.fr.name)}</span>
          <span class="ledg__rule" aria-hidden="true"></span>
          <span class="ledg__en sign" lang="en-CA">${esc(p.en.name)}</span>
          <span class="ledg__price money">${price}</span>
        </a>`;
    })
    .join('');

  /* ---------------------------------------------------------------------
     The bakery
     --------------------------------------------------------------------- */
  $('[data-shop-label]').textContent = t(COPY.shopLabel, which);
  $('[data-shop-head]').textContent = t(voice.shop.head, which);
  $('[data-shop-body]').innerHTML = [
    ...t(voice.shop.body, which),
    t(merchant.allergenStatement, which),
  ]
    .map((para) => `<p>${esc(para)}</p>`)
    .join('');
}

draw();
onLang(draw);
