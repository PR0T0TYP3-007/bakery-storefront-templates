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
import { photo } from './_page.js';
import { priceCommission } from '../commission.js';
import { money } from '../../../../shared/core/format.js';

$('[data-editions]').innerHTML = tileSkeletons(3);

await startPage({ nav: null });

const { merchant, catalogue } = session.state;
const c = merchant.commission;

for (const el of document.querySelectorAll('[data-commission-link], [data-commission-link-3]')) {
  el.href = link('commission.html');
}
for (const el of document.querySelectorAll('[data-work-link], [data-work-link-2], [data-work-link-3]')) {
  el.href = link('work.html');
}

/** The least notice any brief can carry — the gentlest ambition level. */
const minimumNotice = () =>
  Math.min(...catalogue.optionGroups.ambition.options.map((o) => o.leadDays));

const editions = catalogue.products.filter((p) => p.kind === 'edition');
const cheapest = Math.min(...editions.map((p) => p.price));

$('[data-commission-blurb]').textContent =
  `A one-off, built for you. You choose the size, how far we take it and which of our ` +
  `techniques go on it, and the price appears as you choose — from ${money(c.minimum)}, ` +
  `with ${minimumNotice()} days' notice at the very least. ${Math.round(c.depositPct * 100)}% books the week.`;

$('[data-edition-blurb]').textContent =
  `${editions.length} cakes we make over and over, at a fixed price, from ${money(cheapest)}. ` +
  `Pick a size, add candles or a card, and collect it in a few days. No brief, no deposit.`;

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
const commission = catalogue.products.find((p) => p.kind === 'commission');
const past = merchant.voice.work ?? [];

/**
 * Price a past commission from the brief it was built on.
 *
 * Deliberately not a stored number. The claim this whole template makes is
 * that a brief produces a figure, so the figures under the work have to come
 * out of the same calculator the visitor is about to use. Otherwise the
 * proof of the claim is a hardcoded string, and the day somebody edits the
 * scale prices the evidence quietly starts lying.
 */
const pricedBrief = (w) =>
  priceCommission(merchant, catalogue, w.brief, w.techniques ?? []);

/** The named options a brief chose, in the studio's own words. */
function briefWords(w) {
  const label = (groupId) =>
    catalogue.optionGroups[groupId]?.options.find((o) => o.id === w.brief[groupId])?.label;
  const techniques = (w.techniques ?? [])
    .map((id) => catalogue.addons.find((a) => a.id === id)?.label)
    .filter(Boolean);
  return [label('scale'), label('ambition'), ...techniques].filter(Boolean);
}

/**
 * One past commission.
 *
 * The same visual grammar as `pieceTile` -- photograph, number, name and
 * figure, no card and no outline -- with the brief in place of the subtitle,
 * because in this section the brief is the subtitle.
 */
function workTile(w, i, media = '') {
  const p = pricedBrief(w);
  return `
    <article class="piece">
      <div class="piece__media ${media}">
        <p class="piece__n">${String(i + 1).padStart(2, '0')}</p>
        <img src="${photo(w.image, 'md')}"
             srcset="${photo(w.image, 'sm')} 240w, ${photo(w.image, 'md')} 800w, ${photo(w.image, 'lg')} 1600w"
             sizes="(min-width: 60rem) 32vw, 90vw"
             alt="${esc(w.alt)}" loading="lazy" decoding="async" width="800" height="1000">
      </div>
      <div class="piece__head">
        <h3 class="piece__name">${esc(w.title)}</h3>
        <p class="piece__price num">${esc(money(p.subtotal))}</p>
      </div>
      <p class="piece__sub">${esc(w.note)}</p>
      <p class="piece__brief sm">${esc(briefWords(w).join(' · '))} · ${esc(p.leadDays)} days</p>
    </article>`;
}

// Column spans and crops chosen per position rather than repeated, which is
// what makes it a composition instead of a grid of identical cards.
const SHAPE = [
  { span: 'c-7', media: 'piece__media--wide' },
  { span: 'c-4 start-9', media: 'piece__media--tall' },
  { span: 'c-5 start-3 lift', media: '' },
];

/* The second row leaves the right-hand half empty — a consequence of the
   tall piece sitting in row one and the lifted piece starting at column 3.
   Rather than close the gap and lose the asymmetry, it carries the one thing
   a reader of this section wants next: that these numbers came out of a
   calculator they can go and use. The void becomes a column, which is what
   the grid was for. */
const aside = `
  <div class="c-3 start-9 editions__aside">
    <p class="label label--acid">Every one of them</p>
    <p class="t-3" style="margin-top:var(--s-3)">priced the same way</p>
    <p class="sm dim" style="margin-top:var(--s-3)">
      Each figure above is what that brief comes to in the calculator, not a quote we
      remembered. From ${esc(money(c.minimum))}, ${Math.round(c.depositPct * 100)}% to book, and
      the number holds for ${esc(c.quoteValidDays)} days.
    </p>
    <p style="margin-top:var(--s-4)">
      <a class="btn btn--sm" href="commission.html" data-commission-link-4>Price your own</a>
    </p>
  </div>`;

$('[data-work]').innerHTML = past.length
  ? past
      .slice(0, 3)
      .map((w, i) => `<div class="${SHAPE[i].span}">${workTile(w, i, SHAPE[i].media)}</div>`)
      .join('') + aside
  : /* A studio that has not filled in its past work still has a shelf. */
    editions
      .filter((p) => p.image)
      .slice(0, 3)
      .map((p, i) => `<div class="${SHAPE[i].span}">${pieceTile(p, { n: i + 1, media: SHAPE[i].media })}</div>`)
      .join('');

for (const el of document.querySelectorAll('[data-commission-link-2], [data-commission-link-4]')) {
  el.href = link('commission.html');
}

/* -------------------------------------------------------------------------
   The hero piece

   The first past commission, large, running off the right edge of the
   document. Its figure is computed the same way as the rest, so the first
   number anybody sees on this site is already the calculator's number.
   ------------------------------------------------------------------------- */
const heroWork = past[0];
if (heroWork) {
  const hp = pricedBrief(heroWork);
  const el = $('[data-hero-piece]');
  el.innerHTML = `
    <img src="${photo(heroWork.image, 'lg')}"
         srcset="${photo(heroWork.image, 'md')} 800w, ${photo(heroWork.image, 'lg')} 1600w"
         sizes="(min-width: 60rem) 40vw, 92vw"
         alt="${esc(heroWork.alt)}" width="1600" height="1100"
         fetchpriority="high" decoding="async">
    <figcaption class="hero__cap">
      <span class="label label--acid">${esc(heroWork.title)}</span>
      <span class="sm dim hero__cap-brief">${esc(briefWords(heroWork).join(' · '))}</span>
      <span class="num hero__fig">${esc(money(hp.subtotal))}</span>
    </figcaption>`;
  el.hidden = false;
}

/* -------------------------------------------------------------------------
   The bench
   ------------------------------------------------------------------------- */
const bench = merchant.voice.bench;
if (bench?.image) {
  const el = $('[data-bench]');
  el.innerHTML = `
    <img src="${photo(bench.image, 'md')}"
         srcset="${photo(bench.image, 'md')} 800w, ${photo(bench.image, 'lg')} 1600w"
         sizes="(min-width: 60rem) 46vw, 92vw"
         alt="${esc(bench.alt)}" loading="lazy" decoding="async"
         width="1600" height="1000">
    ${bench.caption ? `<figcaption class="bench__cap sm dim">${esc(bench.caption)}</figcaption>` : ''}`;
  el.hidden = false;
}

void commission;

/* -------------------------------------------------------------------------
   The vocabulary
   ------------------------------------------------------------------------- */
$('[data-techniques]').innerHTML = catalogue.addons
  .filter((a) => a.kind === 'technique')
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
