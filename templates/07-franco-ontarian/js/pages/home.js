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
import { plate, stack, kin } from '../components/plates.js';
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
  todayHead: { fr: 'Aujourd’hui', en: 'Out today' },
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
     Out today
     --------------------------------------------------------------------- */
  $('[data-today-head]').textContent = t(COPY.todayHead, which);
  $('[data-all]').textContent = t(COPY.all, which);

  $('[data-today-date]').textContent = new Intl.DateTimeFormat(bcp47(which), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  /* The two tarts are already above; showing them again here would make the
     page look like it only sells tarts. */
  const rest = catalogue.products.filter(
    (p) => p.id !== 'tarte-au-sucre' && p.id !== 'butter-tart'
  );
  $('[data-today]').innerHTML = stack(rest, { merchant });

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
