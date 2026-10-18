/**
 * @file Home.
 *
 * Everything on it comes from the merchant config and the catalogue, so a
 * studio that changes its minimum or its deposit changes this page by
 * editing one number in JSON.
 */

import { startPage, $, esc, link } from './_page.js';
import * as session from '../services/session.js';
import { pieceTile, tileSkeletons } from '../components/pieces.js';
import { money } from '../../../../shared/core/format.js';

$('[data-editions]').innerHTML = tileSkeletons(3);

await startPage({ nav: null });

const { merchant, catalogue } = session.state;
const c = merchant.commission;

for (const el of document.querySelectorAll('[data-commission-link]')) el.href = link('commission.html');
for (const el of document.querySelectorAll('[data-work-link], [data-work-link-2]')) el.href = link('work.html');

/* -------------------------------------------------------------------------
   The claim
   ------------------------------------------------------------------------- */
$('[data-kicker]').textContent = merchant.voice.kicker;
$('[data-headline]').textContent = merchant.voice.headline;
$('[data-lede]').textContent = merchant.voice.lede;

$('[data-gap]').innerHTML = `
  We looked at how this is normally done. You fill in a form, pick a budget
  <em>band</em>, and wait for someone to email you. Here the brief prices itself
  as you write it: ${money(c.minimum)} minimum, ${Math.round(c.depositPct * 100)}% to book,
  and the figure holds for ${c.quoteValidDays} days.`;

/* -------------------------------------------------------------------------
   Work — deliberately uneven, because the pieces are not the same thing
   ------------------------------------------------------------------------- */
const editions = catalogue.products.filter((p) => p.kind === 'edition' && p.image);

// Column spans and crops chosen per position rather than repeated, which is
// what makes it a composition instead of a grid of identical cards.
const SHAPE = [
  { span: 'c-7', media: 'piece__media--wide' },
  { span: 'c-4 start-9', media: 'piece__media--tall' },
  { span: 'c-5 start-3 lift', media: '' },
];

$('[data-work]').innerHTML = editions
  .slice(0, 3)
  .map((p, i) => `<div class="${SHAPE[i].span}">${pieceTile(p, { n: i + 1, media: SHAPE[i].media })}</div>`)
  .join('');

/* -------------------------------------------------------------------------
   The vocabulary
   ------------------------------------------------------------------------- */
$('[data-techniques]').innerHTML = catalogue.addons
  .map(
    (a) => `
    <li class="c-4">
      <p class="piece__head" style="border-bottom:1px solid var(--hair);padding-bottom:var(--s-2)">
        <span class="t-3">${esc(a.label)}</span>
        <span class="num dim sm">${money(a.price)} · +${a.leadDays}d</span>
      </p>
      <p class="sm dim" style="margin-top:var(--s-2)">${esc(a.note)}</p>
    </li>`
  )
  .join('');

/* -------------------------------------------------------------------------
   Editions
   ------------------------------------------------------------------------- */
$('[data-editions]').innerHTML = catalogue.products
  .filter((p) => p.kind === 'edition')
  .slice(0, 4)
  .map((p) => `<div class="c-3">${pieceTile(p, { when: session.state.when })}</div>`)
  .join('');

/* -------------------------------------------------------------------------
   The studio note
   ------------------------------------------------------------------------- */
$('[data-studio-head]').textContent = `${c.perWeek} commissions a week. That is the whole studio.`;
$('[data-studio-body]').innerHTML = `
  ${esc(c.note)} It is also why the diary is the honest part of this site:
  most days are already taken, and the calendar says so before you have typed
  anything. ${esc(merchant.taxNote)}`;
