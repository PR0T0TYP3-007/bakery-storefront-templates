/**
 * @file The basket.
 *
 * Two things differ from Template 06's, and both are real rather than
 * cosmetic.
 *
 * TAX IS EXCLUSIVE HERE. Ontario quotes before tax and adds 13% HST at the
 * till, which is the opposite of Barcelona where the shelf price already
 * contains the IVA and showing it added would be non-compliant. So this
 * basket shows tax as its own line being ADDED, and 06's shows it as an
 * amount CONTAINED in the total. Same `orderTotals()`, opposite
 * presentation, and getting it backwards would misstate the price in a
 * jurisdiction that cares.
 *
 * AND EVERYTHING IS PAINTED TWICE. The language switch rebuilds the page,
 * so `draw()` reads the current language and rebuilds from state.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter, esc } from '../components/chrome.js';
import { names, money } from '../components/plates.js';
import { lang, onLang, t, bcp47 } from '../services/locale.js';
import { orderTotals } from '../../../../shared/core/pricing.js';
import { dayState } from '../../../../shared/core/fulfilment.js';
import { dateKey, keyToDate, addDays, today as startOfToday } from '../../../../shared/core/dates.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader();
renderFooter();

const { merchant, catalogue } = session.state;

const COPY = {
  skip: { fr: 'Aller au panier', en: 'Skip to the basket' },
  head: { fr: 'Votre panier', en: 'Your basket' },
  collecting: { fr: 'À ramasser', en: 'Collecting' },
  whenInput: { fr: 'Jour de ramassage', en: 'Collection day' },
  total: { fr: 'Total', en: 'Total' },
  go: { fr: 'Passer à la caisse', en: 'Checkout' },
  empty: { fr: 'Il n’y a rien dedans.', en: 'Nothing in it yet.' },
  emptyLink: { fr: 'Voir la boutique', en: 'See the shop' },
  remove: { fr: 'Enlever', en: 'Remove' },
  qty: { fr: 'Quantité de', en: 'Quantity of' },
  subtotal: { fr: 'Sous-total', en: 'Subtotal' },
  tax: { fr: 'TVH (13 %)', en: 'HST (13%)' },
  toPay: { fr: 'À payer', en: 'To pay' },
  ready: { fr: 'Ça va être prêt.', en: 'We will have it ready.' },
};

/**
 * Why a day will not work.
 *
 * `dayState` returns a word, and a word is not an answer — "lead" tells a
 * customer nothing. Each state becomes the sentence somebody behind the
 * counter would actually say, in whichever language they are reading.
 */
function whyNot(state, when, which) {
  const weekday = new Intl.DateTimeFormat(bcp47(which), { weekday: 'long' }).format(when);

  const say = {
    past: {
      fr: `On prend les commandes jusqu’à ${merchant.maxDaysAhead} jours d’avance, et pas pour des jours passés.`,
      en: `We take orders up to ${merchant.maxDaysAhead} days ahead, and not for days gone by.`,
    },
    lead: {
      fr: 'C’est trop tôt pour quelque chose dans le panier. Essayez un jour ou deux plus tard.',
      en: 'That is too soon for something in this basket. Try a day or two later.',
    },
    closed: {
      fr: `On est fermé le ${weekday}.`,
      en: `We are closed on ${weekday}s.`,
    },
    holiday: {
      fr: 'On est fermé cette journée-là.',
      en: 'We are closed that day.',
    },
    full: {
      fr: 'Cette journée-là est pleine. On en fait juste tant.',
      en: 'That day is full. We only make so much.',
    },
  };

  return state === 'available' ? null : t(say[state] ?? say.full, which);
}

/* -------------------------------------------------------------------------
   A line
   ------------------------------------------------------------------------- */
function lineHTML(line, which) {
  const p = session.product(line.productId);
  if (!p) return '';

  const groups = session.groups();
  const chosen = Object.entries(line.selections ?? {})
    .map(([gid, oid]) =>
      t(groups[gid]?.options.find((o) => o.id === oid)?.label, which)
    )
    .filter(Boolean);

  const extras = (line.addons ?? [])
    .map((id) => t(catalogue.addons.find((a) => a.id === id)?.label, which))
    .filter(Boolean);

  const price = session.priceOf(p, line.selections, line.addons, line.qty);
  const face = which === 'fr' ? p.fr : p.en;

  return `
    <article class="line plate" data-line="${esc(line.id)}">
      <div class="line__say">
        ${names(p, { tag: 'h2', cls: 't-3' })}
        ${
          chosen.length || extras.length
            ? `<p class="line__conf sm">${esc([...chosen, ...extras].join(' · '))}</p>`
            : ''
        }
      </div>

      <div class="line__qty">
        <label class="vh" for="q-${esc(line.id)}">${esc(t(COPY.qty, which))} ${esc(
          face.name
        )}</label>
        <input class="qty__in num" id="q-${esc(line.id)}" type="number"
               inputmode="numeric" min="1" max="20" step="1"
               value="${esc(String(line.qty))}" data-qty>
      </div>

      <p class="line__price money">${esc(money(price.total, merchant, which))}</p>

      <button class="line__drop" type="button" data-drop>
        ${esc(t(COPY.remove, which))}<span class="vh"> ${esc(face.name)}</span>
      </button>
    </article>`;
}

/* -------------------------------------------------------------------------
   Totals — tax ADDED, not contained
   ------------------------------------------------------------------------- */
function totalsHTML(which) {
  const t0 = orderTotals(session.state.cart.lines, merchant, catalogue, { method: 'pickup' });

  /* If this merchant were ever switched to inclusive tax, showing a "+ tax"
     row would overstate the price. The branch is cheap and the mistake is
     not. */
  const taxRow = t0.taxIncluded
    ? ''
    : `<div class="totals__row">
         <dt>${esc(t(COPY.tax, which))}</dt>
         <dd class="money">${esc(money(t0.tax, merchant, which))}</dd>
       </div>`;

  return `
    <div class="totals__row">
      <dt>${esc(t(COPY.subtotal, which))}</dt>
      <dd class="money">${esc(money(t0.subtotal, merchant, which))}</dd>
    </div>
    ${taxRow}
    <div class="totals__row totals__row--sum">
      <dt>${esc(t(COPY.toPay, which))}</dt>
      <dd class="money">${esc(money(t0.total, merchant, which))}</dd>
    </div>`;
}

/* -------------------------------------------------------------------------
   Paint
   ------------------------------------------------------------------------- */
function draw() {
  const which = lang();
  const { lines } = session.state.cart;

  document.title = `${t(COPY.head, which)} — ${merchant.name}`;
  $('[data-skip]').textContent = t(COPY.skip, which);
  $('[data-head]').textContent = t(COPY.head, which);
  $('[data-empty-text]').textContent = t(COPY.empty, which);
  $('[data-empty-link]').textContent = t(COPY.emptyLink, which);

  $('[data-order]').hidden = lines.length === 0;
  $('[data-empty]').hidden = lines.length > 0;
  if (!lines.length) return;

  $('[data-when-label]').textContent = t(COPY.collecting, which);
  $('[data-when-input-label]').textContent = t(COPY.whenInput, which);
  $('[data-total-label]').textContent = t(COPY.total, which);
  $('[data-go]').textContent = t(COPY.go, which);

  $('[data-lines]').innerHTML = lines.map((l) => lineHTML(l, which)).join('');
  $('[data-totals]').innerHTML = totalsHTML(which);

  paintWhen(which);
}

function paintWhen(which) {
  const when = session.state.when ?? startOfToday();
  const input = $('[data-when]');

  input.value = dateKey(when);
  input.min = dateKey(startOfToday());
  input.max = dateKey(addDays(startOfToday(), merchant.maxDaysAhead ?? 60));

  $('[data-when-day]').textContent = new Intl.DateTimeFormat(bcp47(which), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(when);

  /* The worst lead time in the basket decides, not the average. */
  const lead = Math.max(
    0,
    ...session.state.cart.lines.map((l) => {
      const p = session.product(l.productId);
      return p ? session.leadFor(p, l.selections) : 0;
    })
  );

  const why = whyNot(dayState(merchant, when, lead), when, which);
  const note = $('[data-when-note]');
  note.textContent = why ?? t(COPY.ready, which);
  note.classList.toggle('is-bad', Boolean(why));

  $('[data-go]').setAttribute('aria-disabled', why ? 'true' : 'false');
  $('[data-where]').textContent = session.location().address;
}

/* -------------------------------------------------------------------------
   Events. Delegated, because the lines are repainted on every change.
   ------------------------------------------------------------------------- */
$('[data-lines]').addEventListener('input', (e) => {
  const input = e.target.closest('[data-qty]');
  if (!input) return;
  const id = input.closest('[data-line]').dataset.line;
  session.setQty(id, Math.max(1, Math.min(20, Number(input.value) || 1)));
});

$('[data-lines]').addEventListener('click', (e) => {
  const drop = e.target.closest('[data-drop]');
  if (drop) session.remove(drop.closest('[data-line]').dataset.line);
});

$('[data-when]').addEventListener('change', (e) => {
  if (e.target.value) session.setWhen(keyToDate(e.target.value));
});

/* A checkout link that cannot work should not navigate. `aria-disabled`
   says so to assistive tech; this makes it true for everyone else. */
$('[data-go]').addEventListener('click', (e) => {
  if (e.currentTarget.getAttribute('aria-disabled') === 'true') {
    e.preventDefault();
    $('[data-when]').focus();
  }
});

session.on('cart:change', draw);
session.on('when:change', draw);

draw();
onLang(draw);
