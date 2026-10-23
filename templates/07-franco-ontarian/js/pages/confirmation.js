/**
 * @file The confirmation.
 *
 * Everything it says comes from the query string the checkout handed over,
 * because by this point the basket has been cleared and there is nothing
 * else left to read. That also means the page survives a refresh and a
 * bookmark, which a page reading session state would not.
 *
 * The checkout puts `lang` in that query string too, so the confirmation
 * opens in the language the order was placed in — not in whatever the
 * browser happens to remember.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter, esc } from '../components/chrome.js';
import { lang, onLang, t, bcp47 } from '../services/locale.js';
import { keyToDate } from '../../../../shared/core/dates.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader();
renderFooter();

const { merchant } = session.state;
const q = new URLSearchParams(location.search);

const ref = q.get('ref');
const whenKey = q.get('when');
const slot = q.get('slot');

const COPY = {
  skip: { fr: 'Aller à la commande', en: 'Skip to your order' },
  label: { fr: 'Commande passée', en: 'Order placed' },
  head: { fr: 'C’est noté.', en: 'It is in the book.' },
  refHead: { fr: 'Quoi dire au comptoir', en: 'What to say at the counter' },
  refNote: {
    fr: 'Ou donnez juste votre nom. On l’aura écrit sur la boîte.',
    en: 'Or just give your name. We will have written it on the box.',
  },
  body: {
    fr: [
      'On n’envoie pas de courriel de confirmation dans cette démonstration, alors notez le numéro si vous en voulez un. Rien n’a été facturé.',
      'Si quelque chose change, appelez-nous au 705 555 0161 avant le matin du ramassage et on va s’arranger.',
    ],
    en: [
      'We do not send a confirmation email in this demonstration, so take a note of the reference if you want one. Nothing has been charged.',
      'If something changes, call us at 705 555 0161 before the morning of collection and we will sort it out.',
    ],
  },
  back: { fr: 'Retour à la boutique', en: 'Back to the shop' },
  nothingHead: { fr: 'Il n’y a rien à montrer ici.', en: 'Nothing to show here.' },
  nothingSay: {
    fr: 'Cette page montre une commande juste après qu’elle soit passée. Si vous en avez une et que vous voulez la vérifier, appelez le 705 555 0161.',
    en: 'This page shows an order just after it is placed. If you have one with us and want to check it, call 705 555 0161.',
  },
};

function draw() {
  const which = lang();

  document.title = `${t(COPY.label, which)} — ${merchant.name}`;
  $('[data-skip]').textContent = t(COPY.skip, which);
  $('[data-label]').textContent = t(COPY.label, which);

  /* Somebody who lands here without a reference did not come through the
     checkout — a shared link, a back button after clearing. Saying so beats
     an empty page that looks broken. */
  if (!ref) {
    $('[data-head]').textContent = t(COPY.nothingHead, which);
    $('[data-say]').textContent = t(COPY.nothingSay, which);
    $('[data-ref-head]')?.remove();
    $('[data-ref]')?.remove();
    $('[data-ref-note]')?.remove();
    $('[data-body]').innerHTML = '';
    return;
  }

  const when = whenKey ? keyToDate(whenKey) : null;
  const day = when
    ? new Intl.DateTimeFormat(bcp47(which), {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(when)
    : null;

  $('[data-head]').textContent = t(COPY.head, which);

  $('[data-say]').textContent = day
    ? which === 'fr'
      ? `Venez le ${day}${slot ? `, entre ${slot}` : ''}. Ça va vous attendre.`
      : `Come in on ${day}${slot ? `, between ${slot}` : ''}. It will be waiting.`
    : which === 'fr'
      ? 'Ça va vous attendre.'
      : 'It will be waiting for you.';

  $('[data-ref-head]').textContent = t(COPY.refHead, which);
  $('[data-ref]').textContent = ref;
  $('[data-ref-note]').textContent = t(COPY.refNote, which);

  $('[data-body]').innerHTML = `
    ${t(COPY.body, which)
      .map((para) => `<p>${esc(para)}</p>`)
      .join('')}
    <p style="margin-top:var(--s-5)">
      <a class="btn" href="shop.html">${esc(t(COPY.back, which))}</a>
    </p>`;
}

draw();
onLang(draw);
