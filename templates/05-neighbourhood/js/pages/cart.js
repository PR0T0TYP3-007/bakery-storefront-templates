/**
 * @file The ticket, full size.
 *
 * Every line restates the whole configuration. The basket is the last calm
 * moment before checkout and the cheapest place to catch a mistake — or a
 * price that has moved since the item went in.
 */

import { startPage, $, esc } from './_page.js';
import * as session from '../services/session.js';
import { imgSrc, qsFirst } from '../components/board.js';
import { renderTicket, bindTicket } from '../components/ticket.js';
import { toast } from '../components/toast.js';
import { icons } from '../components/icons.js';
import { money, moneyExact, whenPhrase } from '../core/format.js';
import { describeSelections } from '../core/rules.js';
import { keyToDate } from '../core/dates.js';
import { shelf } from '../core/fulfilment.js';

await startPage({ nav: null, mobileTicket: false });

const q = qsFirst();
$('[data-home-link]').href = `index.html${q}`;
document.querySelectorAll('[data-shop-link]').forEach((a) => (a.href = `shop.html${q}`));

const linesEl = $('[data-lines]');
const ticketEl = $('[data-ticket]');
bindTicket(ticketEl);

function paint() {
  const { cart, catalogue, merchant } = session.state;
  const has = cart.lines.length > 0;

  $('[data-full]').hidden = !has;
  $('[data-empty]').hidden = has;
  if (!has) return;

  linesEl.innerHTML = cart.lines.map(renderLine).join('');
  renderTicket(ticketEl, { showActions: false });
  paintStale();
  paintSuggestions();
}

function renderLine(line) {
  const { merchant, catalogue } = session.state;
  const p = session.product(line.productId);
  if (!p) return '';

  const price = session.priceOf(p, line.selections, line.addons, line.qty);
  const when = keyToDate(line.readyBy);
  const spec = describeSelections(p, line.selections, session.groups());
  const addonNames = (line.addons ?? [])
    .map((id) => catalogue.addons.find((a) => a.id === id)?.label)
    .filter(Boolean);
  const src = imgSrc(p.image, 240);
  const s = shelf(merchant, p, when);

  return `
    <article class="row" style="grid-template-areas:'thumb title price' 'thumb meta add';align-items:start">
      <span class="row__thumb">
        ${
          src
            ? `<img src="${src}" alt="" loading="lazy" width="64" height="64">`
            : `<span class="monogram" aria-hidden="true">${esc(p.name.trim()[0])}</span>`
        }
      </span>

      <div class="row__title">
        <h2 class="row__name">
          <a href="product.html?id=${p.id}${q ? `&merchant=${session.state.merchant.id}` : ''}">${esc(p.name)}</a>
        </h2>
        <p class="row__sub" style="-webkit-line-clamp:4">
          ${spec ? `${esc(spec)}<br>` : ''}
          ${line.inscription ? `<strong style="color:var(--green)">“${esc(line.inscription)}”</strong><br>` : ''}
          ${addonNames.length ? `With ${esc(addonNames.join(', '))}<br>` : ''}
          <strong>Collect ${esc(whenPhrase(when))}</strong>
        </p>
      </div>

      <p class="row__meta">
        <span class="status" data-state="${s.state}">${esc(s.short)}</span>
      </p>

      <p class="row__price money">${moneyExact(price.total)}</p>

      <span class="row__add cluster--3 cluster">
        <span class="qty qty--sm">
          <button type="button" data-tq="-" data-line="${line.id}" aria-label="One fewer ${esc(p.name)}"${line.qty <= 1 ? ' disabled' : ''}>−</button>
          <output aria-live="polite">${line.qty}</output>
          <button type="button" data-tq="+" data-line="${line.id}" aria-label="One more ${esc(p.name)}">+</button>
        </span>
        <button class="ticket__remove" type="button" data-trm="${line.id}">Remove</button>
      </span>
    </article>`;
}

/**
 * Prices or availability that have moved since the item was added.
 * Catching it here is far cheaper than catching it at payment.
 */
function paintStale() {
  const stale = session.stale();
  const el = $('[data-stale]');

  if (!stale.length) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = `
    <div class="note note--warn" style="margin-bottom:var(--s-4)">
      ${icons.alert}
      <span>
        <strong>${stale.length === 1 ? 'A price has' : 'Some prices have'} changed since you added
        ${stale.length === 1 ? 'this' : 'these'}.</strong>
        ${stale
          .map((s) => {
            const p = session.product(s.line.productId);
            return `${esc(p?.name ?? '')} is now ${money(s.now)}, was ${money(s.was)}.`;
          })
          .join(' ')}
        The ticket shows today's prices.
      </span>
    </div>`;
}

/** Complementary, shown once, never pre-ticked, capped at three. */
function paintSuggestions() {
  const { cart, catalogue } = session.state;
  const taken = new Set(cart.lines.flatMap((l) => l.addons ?? []));
  const open = catalogue.addons.filter((a) => !taken.has(a.id)).slice(0, 3);

  if (!open.length || !cart.lines.length) {
    $('[data-suggest-block]').hidden = true;
    return;
  }

  $('[data-suggest-block]').hidden = false;
  $('[data-suggest]').innerHTML = open
    .map(
      (a) => `
      <div class="opt" style="cursor:default">
        <span class="opt__body">
          <span class="opt__name">${esc(a.label)}</span>
          <span class="opt__note">${esc(a.note)}</span>
        </span>
        <span class="opt__price money">${money(a.price)}</span>
        <button class="btn btn--sm btn--quiet" type="button" data-addon="${a.id}">Add</button>
      </div>`
    )
    .join('');
}

/* -------------------------------------------------------------------------
   Events
   ------------------------------------------------------------------------- */
linesEl.addEventListener('click', (e) => {
  const qbtn = e.target.closest('[data-tq]');
  const rm = e.target.closest('[data-trm]');

  if (qbtn) {
    const line = session.state.cart.lines.find((l) => l.id === qbtn.dataset.line);
    if (line) session.setQty(line.id, line.qty + (qbtn.dataset.tq === '+' ? 1 : -1));
    return;
  }
  if (rm) {
    const line = session.state.cart.lines.find((l) => l.id === rm.dataset.trm);
    const p = line && session.product(line.productId);
    session.remove(rm.dataset.trm);
    if (p) toast({ title: `${p.name} removed` });
  }
});

$('[data-suggest]').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-addon]');
  if (!btn) return;
  const first = session.state.cart.lines[0];
  if (!first) return;

  // Attach to the first line, keeping the basket a list of real items rather
  // than a mix of products and loose extras.
  session.remove(first.id);
  session.add({
    productId: first.productId,
    selections: first.selections,
    addons: [...first.addons, btn.dataset.addon],
    inscription: first.inscription,
    qty: first.qty,
  });

  const a = session.state.catalogue.addons.find((x) => x.id === btn.dataset.addon);
  if (a) toast({ title: `${a.label} added` });
});

session.on('cart:change', paint);
paint();
