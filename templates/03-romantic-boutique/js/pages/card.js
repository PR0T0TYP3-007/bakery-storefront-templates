/**
 * @file Write the card. The template's signature screen.
 *
 * Two ways in, and both matter:
 *
 *   ?line=<id>   writing the card for something already in the basket. The
 *                cake is shown beside it, and the piped inscription becomes
 *                a fourth question, because the recipient sees the card and
 *                the cake at the same moment.
 *
 *   no line      writing a card against nothing, from the home page. Free to
 *                try, which is the point: the preview is the argument for
 *                ordering here, and putting it behind a purchase would be
 *                hiding the one thing the competition does not have.
 *
 * Everything is saved to the line as it is typed. A card composed and then
 * lost to a back button would be the cruellest possible bug on this
 * particular page.
 */

import { startPage, $, $$, esc, photo, link } from './_page.js';
import * as session from '../services/session.js';
import { cardPreview, plaquePreview } from '../components/cardpreview.js';
import { layoutCard, hasCard, normalise } from '../card.js';
import { icons } from '../components/icons.js';
import { toast } from '../components/toast.js';
import { validateInscription } from '../../../../shared/core/rules.js';

await startPage({ nav: 'The card' });

const { merchant } = session.state;

for (const el of $$('[data-home-link]')) el.href = link('index.html');

$('[data-edgemark]').textContent = `${merchant.name} — ${merchant.card.stock}`;

const lineId = new URLSearchParams(location.search).get('line');
const line = lineId ? session.state.cart.lines.find((l) => l.id === lineId) ?? null : null;
const product = line ? session.product(line.productId) : null;

/* State, seeded from whatever is already on the line. */
let card = { to: '', message: '', from: '', ...(line?.meta?.card ?? {}) };
let inscription = line?.inscription ?? '';

const hands = merchant.card;

/* ---- The framing -------------------------------------------------------- */
$('[data-lede]').textContent = product
  ? `It goes in the box with ${product.name}. Write it here and watch it set — ${merchant.card.stock.toLowerCase()}, in the hand it will be written in.`
  : 'Nothing is in your basket yet, and that is fine — write one anyway and see how it comes out. Nothing here is saved to anything until you choose a cake.';

$('[data-stock]').textContent = `${merchant.card.stock}. About ${hands.normal.perLine} characters across and ${hands.normal.lines} lines, or ${hands.small.lines} if we write smaller.`;

$('[data-hint]').textContent =
  'Line breaks are kept. Accents are fine — emoji are not, and we will say so rather than quietly dropping them.';

$('[data-honest]').textContent = merchant.card.note;

/* ---- The cake step, only when there is a cake --------------------------- */
if (product?.inscribable) {
  $('[data-cake-step]').hidden = false;
  $('[data-plaque-note]').textContent = `${product.plaque.note}. About ${product.plaque.perLine} characters a line, ${product.plaque.lines} ${product.plaque.lines === 1 ? 'line' : 'lines'} at most — much less room than the card has.`;
  $('[data-insc]').value = inscription;
}

/* ---- Wiring ------------------------------------------------------------- */
$('[data-to]').value = card.to;
$('[data-message]').value = card.message;
$('[data-from]').value = card.from;

$('[data-form]').addEventListener('input', (e) => {
  const t = e.target;
  if (t.hasAttribute('data-to')) card.to = t.value;
  else if (t.hasAttribute('data-message')) card.message = t.value;
  else if (t.hasAttribute('data-from')) card.from = t.value;
  else if (t.hasAttribute('data-insc')) inscription = t.value;
  else return;

  save();
  paint();
});

/**
 * Written to the line on every keystroke.
 *
 * An empty card is stored as no card at all. `meta.card` existing and a card
 * having been written are different things, and a basket row that claimed "a
 * card" for three spaces someone typed and deleted would be lying in the one
 * place this template cannot afford to.
 */
function save() {
  if (!line) return;
  session.updateLine(line.id, {
    meta: hasCard(card)
      ? { card: { to: normalise(card.to), message: normalise(card.message), from: normalise(card.from) } }
      : null,
    inscription: normalise(inscription),
  });
}

/* ---- Paint -------------------------------------------------------------- */
function paint() {
  const laid = layoutCard(hasCard(card) ? card : null, merchant);

  $('[data-card-preview]').innerHTML = cardPreview({
    card: hasCard(card) ? card : null,
    merchant,
    grow: true,
  });

  // Lines, not characters. A counter that says you have room is exactly what
  // the market already offers, and it is what lets a message reach the
  // recipient on four lines of a three-line card.
  const count = $('[data-count]');
  if (laid.state === 'set') {
    count.textContent = `${laid.lines.filter(Boolean).length} of ${laid.hand.lines} lines${
      laid.shrunk ? ', written smaller' : ''
    }`;
    count.dataset.over = String(!laid.fits);
  } else {
    count.textContent = `Up to ${hands.normal.lines} lines in our usual hand`;
    count.dataset.over = 'false';
  }

  /* The cake beside it. */
  const host = $('[data-cake-preview]');
  if (product) {
    host.innerHTML = `
      <div class="aperture aperture--arch aperture--portrait">
        ${
          product.image
            ? `<img src="${photo(product.image, 'md')}" alt="${esc(product.name)}" loading="lazy" decoding="async" width="800" height="1000">`
            : `<span class="aperture--empty">${esc(product.name.slice(0, 1))}</span>`
        }
      </div>
      <div style="margin-top:var(--s-4)">
        ${product.inscribable ? plaquePreview({ text: inscription, product }) : `<p class="sm dimmer">${esc(product.name)} goes out plain.</p>`}
      </div>`;
  } else {
    host.innerHTML = `
      <div class="aperture aperture--arch aperture--portrait aperture--empty" aria-hidden="true">?</div>
      <p class="sm dimmer" style="margin-top:var(--s-4)">No cake chosen yet. The card is the same either way.</p>`;
  }

  /* The inscription uses the shared rule for what a piping bag can do, which
     is a different question from whether it fits on this cake. Both are
     answered, separately. */
  if (product?.inscribable) {
    const check = validateInscription(inscription);
    $('[data-insc-err]').innerHTML =
      check.ok || !inscription ? '' : `${icons.alert}<span>${esc(check.reason)}</span>`;
  }

  paintActions(laid);
}

function paintActions(laid) {
  const host = $('[data-actions]');

  if (!line) {
    host.innerHTML = `
      <a class="btn btn--blush" href="${link('cakes.html')}">Now choose the cake</a>
      <span class="sm dimmer">What you have written will not follow you — write it again once you have one.</span>`;
    return;
  }

  const blocked = laid.state === 'set' && !laid.fits;

  host.innerHTML = `
    <a class="btn btn--blush" href="${link('cart.html')}" ${blocked ? 'aria-disabled="true"' : ''} data-done>Done</a>
    <a class="btn btn--bare" href="${link('cakes.html')}">Add something else</a>
    ${
      blocked
        ? `<span class="sm" style="color:var(--bad)">We would rather you fixed it than we guessed.</span>`
        : `<span class="sm dimmer">Saved as you type.</span>`
    }`;

  // A card that does not fit is not refused outright — the customer may be
  // about to shorten it — but leaving the page with it is confirmed, because
  // the alternative is a cake arriving with a card the shop had to improvise.
  host.querySelector('[data-done]')?.addEventListener('click', (e) => {
    if (!blocked) return;
    e.preventDefault();
    toast({
      title: 'That message does not fit',
      detail: laid.problems[0]?.detail ?? 'Shorten it a little and the card sets itself.',
      tone: 'bad',
      icon: icons.alert,
    });
    $('[data-message]').focus();
  });
}

paint();
