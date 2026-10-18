/**
 * @file Work — the index. Commissions pitched, editions listed.
 */

import { startPage, $, esc, link } from './_page.js';
import * as session from '../services/session.js';
import { pieceTile, tileSkeletons } from '../components/pieces.js';
import { money } from '../../../../shared/core/format.js';

$('[data-shelf]').innerHTML = `<div class="c-12">${tileSkeletons(4)}</div>`;

await startPage({ nav: 'Work' });

const { merchant, catalogue } = session.state;
const c = merchant.commission;

$('[data-commission-link]').href = link('commission.html');

$('[data-commission-pitch]').textContent =
  `From ${money(c.minimum)}. Priced while you write it.`;

$('[data-commission-body]').innerHTML = `
  Pick the scale, say how far we take it, choose from our techniques, and the
  figure moves with you. ${Math.round(c.depositPct * 100)}% books the slot and the price holds for
  ${c.quoteValidDays} days. No form, no band, no email in a week.`;

/* The four levels, as a ladder. Shown against the smallest scale so each one
   carries a real figure — "× 1.90" is a number only the studio can read. */
const smallest = Math.min(...catalogue.optionGroups.scale.options.map((o) => o.price));

$('[data-levels]').innerHTML = catalogue.optionGroups.ambition.options
  .map(
    (o) => `
    <li style="border-top:1px solid var(--hair);padding-top:var(--s-3)">
      <p class="piece__head">
        <span class="t-3">${esc(o.label)}</span>
        <span class="num dim sm">from ${money(Math.round(smallest * o.factor))} · ${o.leadDays} days</span>
      </p>
      <p class="sm dim" style="margin-top:var(--s-1)">${esc(o.note)}</p>
    </li>`
  )
  .join('');

/* -------------------------------------------------------------------------
   Editions
   ------------------------------------------------------------------------- */
const editions = catalogue.products.filter((p) => p.kind === 'edition');
const repeated = editions.filter((p) => p.id !== 'offcuts');
const WORDS = ['no', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

$('[data-work-lede]').textContent =
  `${WORDS[repeated.length] ?? repeated.length} cakes we make again and again, ` +
  `from ${money(Math.min(...repeated.map((p) => p.price)))} — and the commissions, ` +
  `which are different every time.`;
$('[data-found]').textContent = `${editions.length} pieces`;

$('[data-shelf]').innerHTML = editions
  .map((p, i) => `<div class="c-3">${pieceTile(p, { when: session.state.when, n: i + 1 })}</div>`)
  .join('');

session.on('when:change', () => {
  $('[data-shelf]').innerHTML = editions
    .map((p, i) => `<div class="c-3">${pieceTile(p, { when: session.state.when, n: i + 1 })}</div>`)
    .join('');
});
