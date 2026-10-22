/**
 * @file Home.
 *
 * Everything on it comes from the merchant config and the catalogue — the
 * headline, the promises, the cut-off, the counts on the occasion tiles. A
 * shop that changes its cut-off hour changes this page by editing one
 * number in JSON.
 */

import { startPage, $, esc, link } from './_page.js';
import * as session from '../services/session.js';
import { productCard, occasionTile, cardSkeleton } from '../components/cards.js';
import { cakeSVG, specFrom } from '../components/cake.js';
import { icons } from '../components/icons.js';
import { duration, whenPhraseMid } from '../../../../shared/core/format.js';
import { msUntilHour, cutoffPassed } from '../../../../shared/core/dates.js';
import { earliestFor } from '../../../../shared/core/fulfilment.js';

$('[data-popular]').innerHTML = cardSkeleton(3);

await startPage({ nav: null });

const { merchant, catalogue } = session.state;

/* -------------------------------------------------------------------------
   Links carry the merchant query
   ------------------------------------------------------------------------- */
for (const el of document.querySelectorAll('[data-build-link], [data-build-link-2]')) {
  el.href = link('build.html');
}
for (const el of document.querySelectorAll('[data-shop-link], [data-shop-link-2]')) {
  el.href = link('shop.html');
}

/* -------------------------------------------------------------------------
   The claim
   ------------------------------------------------------------------------- */
$('[data-kicker]').textContent = merchant.voice.kicker;
$('[data-headline]').textContent = merchant.voice.headline;
$('[data-lede]').textContent = merchant.voice.lede;

/**
 * The cut-off, as a countdown. It is a live number rather than "order by
 * 2pm", because a customer at 1:40pm and a customer at 2:10pm need
 * different sentences and only one of them is about 2pm.
 */
function paintCutoff() {
  const el = $('[data-cutoff]');
  const passed = cutoffPassed(merchant.cutoffHour);
  const left = msUntilHour(merchant.cutoffHour);
  const earliest = earliestFor(merchant, 4);

  el.innerHTML = passed
    ? `Today&rsquo;s orders are closed. The soonest we can bake is ${esc(whenPhraseMid(earliest))}.`
    : `<strong>${esc(duration(left))}</strong> left to get on today&rsquo;s list &mdash; after that the queue moves on a day.`;
}
paintCutoff();
// Once a minute is enough for a figure quoted in minutes, and it keeps the
// page from waking the CPU every second for the whole visit.
setInterval(paintCutoff, 60_000);

/* -------------------------------------------------------------------------
   The hero cake
   ------------------------------------------------------------------------- */
const custom = catalogue.products.find((p) => p.kind === 'custom');
$('[data-hero-cake]').innerHTML = cakeSVG(
  specFrom(
    custom,
    { tiers: '3', sponge: 'funfetti', filling: 'jam', icing: 'strawberry', finish: 'drip', topper: 'candles' },
    session.groups(),
    'Happy Birthday'
  ),
  { title: 'A three-tier funfetti cake with a chocolate drip and five candles' }
);

/* -------------------------------------------------------------------------
   The promises. Each one has a number in it.
   ------------------------------------------------------------------------- */
const loc = merchant.locations[0];
$('[data-promises]').innerHTML = [
  [icons.cake, `${merchant.dailyCapacity} cakes a day`, "Pick a day and we'll tell you straight away if it's gone."],
  [icons.van, `Free over £${merchant.delivery.freeOver}`, `${merchant.delivery.zones.length} delivery areas, mornings only, driven flat.`],
  [icons.clock, `4 days' notice`, `Collect from ${loc.name}, or we bring it to you.`],
]
  .map(
    ([icon, title, body]) =>
      `<div class="promise">${icon}<p><strong>${esc(title)}</strong><span>${esc(body)}</span></p></div>`
  )
  .join('');

/* -------------------------------------------------------------------------
   How it works
   ------------------------------------------------------------------------- */
$('[data-how]').innerHTML = [
  ['Draw it', 'Six choices — tiers, sponge, filling, colour, finish, topper. The cake redraws as you pick.'],
  ['Say when', 'The calendar only offers days we can actually bake it, with your choices in mind.'],
  ['We bake that one', 'Your drawing and your message go to the bench. No surprises on the day.'],
]
  .map(
    ([title, body], i) => `
    <li class="panel panel--tight" style="background:rgba(255,255,255,0.12);border-color:#fff;box-shadow:5px 5px 0 var(--ink);color:#fff">
      <p class="t-3" style="display:flex;align-items:center;gap:var(--s-3)">
        <span aria-hidden="true" style="flex:none;width:34px;height:34px;display:grid;place-items:center;background:var(--sun);color:var(--ink);border:var(--stroke-2);border-radius:var(--r-pill);font-size:1rem">${i + 1}</span>
        ${esc(title)}
      </p>
      <p class="sm" style="margin-top:var(--s-3)">${esc(body)}</p>
    </li>`
  )
  .join('');

/* -------------------------------------------------------------------------
   Occasions, with real counts
   ------------------------------------------------------------------------- */
$('[data-occasions]').innerHTML = catalogue.occasions
  .map((o) =>
    occasionTile(o, catalogue.products.filter((p) => p.occasions?.includes(o.id)).length)
  )
  .join('');

/* -------------------------------------------------------------------------
   The cakes
   ------------------------------------------------------------------------- */
const when = session.state.when;

const popular = catalogue.products.filter((p) => p.kind === 'cake' && p.popular).slice(0, 3);
$('[data-popular]').innerHTML = popular
  .map((p, i) => productCard(p, { when, tall: true, flag: i === 0 ? 'Most ordered' : undefined }))
  .join('');

$('[data-boxes]').innerHTML = catalogue.products
  .filter((p) => p.kind === 'box')
  .map((p) => productCard(p, { when }))
  .join('');
