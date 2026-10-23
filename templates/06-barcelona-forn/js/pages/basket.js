/**
 * @file The basket.
 *
 * Three jobs: show what is in it, let the collection day be changed, and
 * say the total honestly.
 *
 * The collection day is not a footnote here. This forn's whole argument is
 * that the calendar decides, so the day sits beside the total rather than
 * being asked for at checkout — and when a day cannot work, the page says
 * which of the five reasons it is rather than just refusing.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter } from '../components/chrome.js';
import { entryFor, isoDate, seasonBlocker, esc } from '../components/calendar.js';
import { nextFor } from '../year.js';
import { orderTotals } from '../../../../shared/core/pricing.js';
import { dayState } from '../../../../shared/core/fulfilment.js';
import { dateKey, keyToDate, addDays, today as startOfToday } from '../../../../shared/core/dates.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader();
renderFooter();

const { merchant, catalogue } = session.state;
const now = new Date();

const money = (n) =>
  new Intl.NumberFormat(merchant.locale, {
    style: 'currency',
    currency: merchant.currency,
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);

const longDate = (d) =>
  new Intl.DateTimeFormat(merchant.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);

/* -------------------------------------------------------------------------
   Why a day will not work

   `dayState` returns a word. A word is not an answer — "lead" tells the
   customer nothing. Each one becomes the sentence a person at the counter
   would actually say.
   ------------------------------------------------------------------------- */
function whyNot(state, when) {
  switch (state) {
    case 'available':
      return null;
    case 'past':
      return `We only take orders up to ${merchant.maxDaysAhead} days ahead, and not for days gone by.`;
    case 'lead':
      return 'That is too soon for something in this basket. Try a day or two later.';
    case 'closed':
      return `We are closed on ${new Intl.DateTimeFormat(merchant.locale, { weekday: 'long' }).format(when)}s.`;
    case 'holiday':
      return 'We are shut that week — the whole shop goes to the beach.';
    case 'full':
      return 'That day is full. We only make so much.';
    default:
      return 'We cannot do that day.';
  }
}

/* -------------------------------------------------------------------------
   A line
   ------------------------------------------------------------------------- */
function lineHTML(line) {
  const p = session.product(line.productId);
  if (!p) return '';

  const groups = session.groups();
  const chosen = Object.entries(line.selections ?? {})
    .map(([gid, oid]) => groups[gid]?.options.find((o) => o.id === oid)?.label)
    .filter(Boolean);

  const extras = (line.addons ?? [])
    .map((id) => catalogue.addons.find((a) => a.id === id)?.label)
    .filter(Boolean);

  const price = session.priceOf(p, line.selections, line.addons, line.qty);

  /* A calendar item in the basket says when it is actually made. The
     collection day above may be perfectly valid and still be the wrong
     month for a tortell. */
  const entry = entryFor(merchant, p.id);
  const next = entry ? nextFor(entry, now) : null;

  return `
    <article class="line" data-line="${esc(line.id)}">
      <div class="line__say">
        <h2 class="line__name t-3" lang="ca">
          <a href="product.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a>
        </h2>
        ${
          chosen.length || extras.length
            ? `<p class="line__conf sm">${esc([...chosen, ...extras].join(' · '))}</p>`
            : ''
        }

        <!-- What is written on the cake, exactly as the customer typed it.
             Quoted, never corrected: it is a name more often than not, and
             this shop does not know how anyone spells theirs. -->
        ${
          line.inscription
            ? `<p class="line__said sm">Written on it: <q class="line__quote">${esc(
                line.inscription
              )}</q></p>`
            : ''
        }

        ${
          line.readyBy
            ? `<p class="line__when sm">For <time datetime="${esc(line.readyBy)}">${esc(
                longDate(keyToDate(line.readyBy))
              )}</time></p>`
            : ''
        }
        ${
          next && next.status === 'coming'
            ? `<p class="line__season sm">
                 <span class="state__dot" aria-hidden="true"></span>
                 Made for <span lang="ca">${esc(entry.day)}</span> —
                 <time datetime="${esc(isoDate(next.from))}">from ${esc(longDate(next.from))}</time>
               </p>`
            : ''
        }
      </div>

      <div class="line__qty">
        <label class="vh" for="q-${esc(line.id)}">Quantity of ${esc(p.name)}</label>
        <input class="qty__in num" id="q-${esc(line.id)}" type="number"
               inputmode="numeric" min="1" max="20" step="1"
               value="${esc(String(line.qty))}" data-qty>
      </div>

      <p class="line__price money">${esc(money(price.total))}</p>

      <button class="line__drop" type="button" data-drop>
        Remove<span class="vh"> ${esc(p.name)}</span>
      </button>
    </article>`;
}

/* -------------------------------------------------------------------------
   Totals
   ------------------------------------------------------------------------- */
function totalsHTML() {
  const t = orderTotals(session.state.cart.lines, merchant, catalogue, { method: 'pickup' });

  /* Spanish consumer prices are inclusive, so the tax is shown as contained
     in the total and never added to it. Putting it in the list as its own
     row would read as a charge. */
  return {
    html: `
      <div class="totals__row">
        <dt>Subtotal</dt>
        <dd class="money">${esc(money(t.subtotal))}</dd>
      </div>
      <div class="totals__row totals__row--sum">
        <dt>To pay</dt>
        <dd class="money">${esc(money(t.total))}</dd>
      </div>`,
    tax: t.taxIncluded ? `Includes ${money(t.tax)} VAT.` : '',
  };
}

/* -------------------------------------------------------------------------
   Paint
   ------------------------------------------------------------------------- */
function paint() {
  const { lines } = session.state.cart;

  $('[data-order]').hidden = lines.length === 0;
  $('[data-empty]').hidden = lines.length > 0;
  if (!lines.length) return;

  $('[data-lines]').innerHTML = lines.map(lineHTML).join('');

  const t = totalsHTML();
  $('[data-totals]').innerHTML = t.html;
  $('[data-tax]').textContent = t.tax;

  paintWhen();
}

function paintWhen() {
  const when = session.state.when ?? startOfToday();
  const input = $('[data-when]');

  input.value = dateKey(when);
  input.min = dateKey(startOfToday());
  input.max = dateKey(addDays(startOfToday(), merchant.maxDaysAhead ?? 60));

  $('[data-when-day]').textContent = longDate(when);

  /* The worst lead time in the basket decides, not the average. */
  const lead = Math.max(
    0,
    ...session.state.cart.lines.map((l) => {
      const p = session.product(l.productId);
      return p ? session.leadFor(p, l.selections) : 0;
    })
  );

  /* Two reasons a day can fail, and they are different questions. The shop
     may be shut, or the thing may simply not be made that week. The second
     one is this template's own, so it is checked separately and said in its
     own words. */
  const why =
    whyNot(dayState(merchant, when, lead), when) ??
    seasonBlocker(session.state.cart.lines, {
      merchant,
      products: catalogue.products,
      when,
    });
  const note = $('[data-when-note]');
  note.textContent = why ?? 'We will have it ready.';
  note.classList.toggle('is-bad', Boolean(why));

  $('[data-go]').setAttribute('aria-disabled', why ? 'true' : 'false');

  /* The address alone. The location's name here is "Carrer de Blai" and so
     is the first half of its address, so joining them read "Carrer de Blai,
     Carrer de Blai 44". A one-shop merchant has nothing to disambiguate. */
  $('[data-where]').textContent = session.location().address;
}

/* -------------------------------------------------------------------------
   Events. Delegated, because the lines are repainted on every change.
   ------------------------------------------------------------------------- */
$('[data-lines]').addEventListener('input', (e) => {
  const input = e.target.closest('[data-qty]');
  if (!input) return;
  const id = input.closest('[data-line]').dataset.line;
  const qty = Math.max(1, Math.min(20, Number(input.value) || 1));
  session.setQty(id, qty);
});

$('[data-lines]').addEventListener('click', (e) => {
  const drop = e.target.closest('[data-drop]');
  if (!drop) return;
  session.remove(drop.closest('[data-line]').dataset.line);
});

$('[data-when]').addEventListener('change', (e) => {
  if (!e.target.value) return;
  session.setWhen(keyToDate(e.target.value));
});

/* A checkout link that cannot work should not navigate. `aria-disabled` says
   so to assistive tech; this makes it true for everyone else. */
$('[data-go]').addEventListener('click', (e) => {
  if (e.currentTarget.getAttribute('aria-disabled') === 'true') {
    e.preventDefault();
    $('[data-when]').focus();
  }
});

session.on('cart:change', paint);
session.on('when:change', paint);

paint();
