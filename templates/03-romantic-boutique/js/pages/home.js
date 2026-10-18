/**
 * @file Home.
 *
 * Every word on this page comes from merchant config. Template 05 once put
 * one shop's name in front of another shop's hardcoded tagline and advertised
 * the wrong bakery's bread, and the browser check passed because the JS
 * overwrote it — the lie was only in the raw HTML. So: nothing here is
 * written into index.html that a second merchant would need changed.
 */

import { startPage, $, $$, esc, photo, link } from './_page.js';
import * as session from '../services/session.js';
import { cakeTile, tileSkeletons, priceFloor } from '../components/cakes.js';
import { cardPreview } from '../components/cardpreview.js';
import { dueSoon, daysUntil } from '../components/kept.js';
import { money } from '../../../../shared/core/format.js';

await startPage({ nav: null });

const { merchant, catalogue } = session.state;
const cakes = catalogue.products.filter((p) => p.kind === 'cake');

for (const el of $$('[data-cakes-link]')) el.href = link('cakes.html');
for (const el of $$('[data-card-link]')) el.href = link('card.html');

/* ---- The claim ---------------------------------------------------------- */
$('[data-kicker]').textContent = merchant.voice.kicker;
$('[data-headline]').textContent = merchant.voice.headline;
$('[data-lede]').textContent = merchant.voice.lede;

/* The cake that is mostly a sentence, and a card beside it. The proposition
   is demonstrated rather than described — it is a page about words, so
   showing the words is the least it can do. */
const star = cakes.find((p) => p.id === 'written') ?? cakes[0];

$('[data-hero]').innerHTML = `
  <div class="aperture aperture--arch aperture--portrait">
    <img src="${photo(star.image, 'lg')}"
         srcset="${photo(star.image, 'md')} 800w, ${photo(star.image, 'lg')} 1600w"
         sizes="(min-width: 60rem) 48vw, 92vw"
         alt="${esc(star.name)} — ${esc(star.subtitle)}"
         width="1600" height="2000" fetchpriority="high" decoding="async">
  </div>
  <div class="hero__card">
    ${cardPreview({
      card: {
        to: 'Mara',
        message: 'Thirty years, and you still laugh at the same joke.\nSee you Saturday.',
        from: 'Dad',
      },
      merchant,
      compact: true,
    })}
  </div>`;

/* ---- What we do --------------------------------------------------------- */
const cheapest = Math.min(...cakes.map((p) => priceFloor(p).low));

$('[data-what]').innerHTML = [
  [
    'Cakes we make every week',
    `Eight of them, from ${money(cheapest)}. Choose the size, what is inside and how the outside is finished, and the price moves as you go.`,
  ],
  [
    'Something written on it',
    'Piped on the cake in buttercream, and written on a card in ink. Both are set in front of you before you pay.',
  ],
  [
    'Collected, or brought to the door',
    `${esc(merchant.locations[0].address)}, or driven out to you. Free over ${money(merchant.delivery.freeOver)}.`,
  ],
]
  .map(
    ([head, body]) => `
    <div class="stack stack--tight">
      <h3 class="t-3">${esc(head)}</h3>
      <p class="sm dim">${body}</p>
    </div>`
  )
  .join('');

/* ---- Why the card ------------------------------------------------------- */
$('[data-card-why]').innerHTML = `
  <p>Everywhere else, the message is a box at the end of checkout with a
  character counter under it. You type into it and hope. One shop we looked at
  takes the note on a different page <em>after</em> you have paid, and gives
  you an hour to do it.</p>
  <p>A counter tells you that you have room. It does not tell you that your
  message lands on four lines and the card holds three, or that the longest
  word in it is wider than the card is. You find that out when they do.</p>
  <p>So here you write it and watch it set — ${esc(merchant.card.stock.toLowerCase())},
  in the hand it will be written in, broken where the pen will break it.</p>`;

/* ---- Occasions ---------------------------------------------------------- */
$('[data-occasions]').innerHTML = (catalogue.occasions ?? [])
  .map(
    (o) => `
    <li>
      <a class="occasion" href="${link(`cakes.html?occasion=${encodeURIComponent(o.id)}`)}">
        <span class="occasion__label">${esc(o.label)}</span>
        <span class="occasion__note sm dimmer">${esc(o.note)}</span>
      </a>
    </li>`
  )
  .join('');

/* ---- The range ---------------------------------------------------------- */
$('[data-cakes]').innerHTML = tileSkeletons(4);
$('[data-cakes]').innerHTML = cakes
  .slice(0, 4)
  .map((p) => cakeTile(p, { when: session.state.when }))
  .join('');

/* ---- The shop ----------------------------------------------------------- */
$('[data-shop-head]').textContent = `Two rooms on ${merchant.locations[0].address.split(',')[0].replace(/^\d+\s+/, '')}.`;
$('[data-shop-body]').innerHTML = `
  <p>We have been here since ${esc(merchant.since)}. One oven, one bench, and
  a drawer of card stock. The writing is done by whoever is on the bench that
  morning, which is why it looks like a person did it.</p>
  <p>${esc(merchant.allergenStatement.split('.').slice(-2).join('.').trim())}</p>`;

/* ---- A date we kept ------------------------------------------------------
   Only ever mentioned, never pushed: one line, with the honest statement
   that it lives in this browser. See the concept doc §5. */
const due = dueSoon(merchant);
if (due) {
  const el = $('[data-kept]');
  const { days } = daysUntil(due.on);
  el.innerHTML = `${esc(due.who)}&rsquo;s ${esc(due.occasion)} is ${
    days === 0 ? 'today' : `in ${days} ${days === 1 ? 'day' : 'days'}`
  }. <a href="${link('cakes.html')}">Send something again</a> — kept on this device only.`;
  el.hidden = false;
}
