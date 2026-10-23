/**
 * @file 404.
 *
 * Says the one true thing — we do not make that one — and then shows what
 * is actually out today, because a dead end that hands somebody a tart is
 * better than one that only apologises.
 *
 * It reuses `stack()`, so the 404 can never go out of date with the shop.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter } from '../components/chrome.js';
import { stack } from '../components/plates.js';
import { lang, onLang, t, bcp47 } from '../services/locale.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader();
renderFooter();

const { merchant, catalogue } = session.state;

const COPY = {
  skip: { fr: 'Aller au contenu', en: 'Skip to content' },
  head: { fr: 'Ça, on n’en fait pas.', en: 'We do not make that one.' },
  say: {
    fr: 'Le lien est peut-être vieux, ou c’est quelque chose qu’on a arrêté de faire. Tout ce qu’on fait encore est encore là.',
    en: 'The link may be old, or it may be something we stopped making. Everything we do still make is still here.',
  },
  shop: { fr: 'La boutique', en: 'The shop' },
  glossary: { fr: 'Les deux noms', en: 'Both names' },
  today: { fr: 'Aujourd’hui', en: 'Out today' },
  home: { fr: 'Retour à l’accueil', en: 'Back to the front' },
};

function draw() {
  const which = lang();

  document.title = `${which === 'fr' ? 'Pas trouvé' : 'Not found'} — ${merchant.name}`;

  const set = (sel, value) => {
    const el = $(sel);
    if (el) el.textContent = value;
  };

  set('[data-skip]', t(COPY.skip, which));
  set('[data-head]', t(COPY.head, which));
  set('[data-say]', t(COPY.say, which));
  set('[data-to-shop]', t(COPY.shop, which));
  set('[data-to-glossary]', t(COPY.glossary, which));
  set('[data-today-head]', t(COPY.today, which));
  set('[data-home-link]', t(COPY.home, which));

  set(
    '[data-today-date]',
    new Intl.DateTimeFormat(bcp47(which), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date())
  );

  $('[data-today]').innerHTML = stack(catalogue.products.slice(0, 6), { merchant });
}

draw();
onLang(draw);
