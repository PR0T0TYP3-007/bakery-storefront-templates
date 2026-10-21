/**
 * @file Home.
 *
 * Every word on this page comes from merchant config. Template 05 once put
 * one shop's name in front of another shop's hardcoded tagline and
 * advertised the wrong bakery's bread, and the browser check passed because
 * the JS overwrote it — the lie was only in the raw HTML. So: nothing here
 * is written into index.html that a second merchant would need changed.
 */

import { startPage, $, $$, esc, photo, link } from './_page.js';
import * as session from '../services/session.js';
import { cakeTile, tileSkeletons, priceFloor } from '../components/cakes.js';
import { cardPreview } from '../components/cardpreview.js';
import { growAndKeep } from '../components/lettergarden.js';
import { dueSoon, daysUntil } from '../components/kept.js';
import { money } from '../../../../shared/core/format.js';

/* Written out, because "9 of them" reads like stock control and this shop
   does not talk that way. Falls back to the numeral past what anyone would
   spell, which is also the point at which a shop stops counting out loud. */
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
const count = (n) => WORDS[n] ?? String(n);

await startPage({ nav: null });

const { merchant, catalogue } = session.state;
const cakes = catalogue.products.filter((p) => p.kind === 'cake');

for (const el of $$('[data-cakes-link]')) el.href = link('cakes.html');
for (const el of $$('[data-card-link]')) el.href = link('card.html');

/* ---- The statement band -------------------------------------------------
   The largest thing the shop makes, full width, with one line over it. The
   wording and the link both come from the product, so a merchant without a
   wedding cake gets the band filled by whatever their most expensive cake
   is rather than a broken link. */
const biggest = cakes.reduce((a, b) => (b.price > a.price ? b : a), cakes[0]);
$('[data-wedding-link]').href = link(`cake.html?id=${encodeURIComponent(biggest.id)}`);
$('[data-statement]').innerHTML =
  `${esc(biggest.name)} takes <span class="script">a fortnight.</span>`;

/* ---- The claim ----------------------------------------------------------
   The headline is split in two in config — a lead in the display face and a
   clause in the hand. The words are the merchant's own and the split is
   presentational, so a shop that gives only `headline` still gets a
   headline rather than an empty page. */
$('[data-kicker]').textContent = merchant.voice.kicker;
$('[data-lede]').textContent = merchant.voice.lede;

const { headline, headlineLead, headlineScript } = merchant.voice;

/**
 * The headline, word by word, so it can write itself out.
 *
 * Words rather than letters: a letter-by-letter reveal of a six-word line
 * takes long enough that the reader waits for it, and a headline that makes
 * you wait is a headline that has forgotten what it is for. Words land in
 * about a second and a half.
 *
 * Every word is in the DOM from the start and only its opacity is animated,
 * so the sentence is whole for a screen reader, for search, and for anyone
 * who arrives with motion turned off — nothing here is built by script that
 * the page then depends on.
 */
let wordIndex = 0;
const inWords = (text) =>
  String(text)
    .split(' ')
    .map((w) => `<span class="word" style="--i:${wordIndex++}">${esc(w)}</span>`)
    .join(' ');

$('[data-headline]').innerHTML =
  headlineLead && headlineScript
    ? `${inWords(headlineLead)} <span class="script">${inWords(headlineScript)}</span>`
    : inWords(headline);

/* The shop's name down the edge of the hero, the way a studio signs a
   drawing. Decorative, and hidden below 62rem where there is no margin to
   put it in. */
$('[data-edgemark]').textContent = `${merchant.name} — ${merchant.since}`;

/* ---- The headline grows -------------------------------------------------
   The same garden as the wordmark, larger and thicker.

   This replaced a wreath drawn *around* the headline. One page cannot
   sensibly have two different ideas of what a flower does, and of the two
   this is the one that is actually the reference: stems out of the letters,
   weaving in front of and behind them.

   The words still write themselves on — the letters are wrapped inside the
   word spans rather than instead of them — so the line arrives and the
   plant comes up through it. */
const headOrder = growAndKeep({
  host: $('[data-headline]'),
  behind: $('[data-head-back]'),
  front: $('[data-head-front]'),
  seed: merchant.voice.headline,
  density: 0.5,
  bloom: 0.8,
  maxElements: 70,
  colours: {
    stem: 'var(--leaf)',
    flower: 'var(--blush)',
    line: 'var(--ground)',
    vein: 'var(--ground)',
  },
});
void headOrder;

/* ---- And the wordmark ---------------------------------------------------
   The real thing, this time.

   The first attempt put the same wreath round the shop's name that the card
   page puts round a card, and it was wrong in a way that took seeing it to
   understand: a loop drawn *around* a word is a border, and borders are
   what letterheads have. The reference grows stems *out of the letters* and
   weaves them in front of and behind the strokes, so the plant and the name
   are one object. That is the whole idea, and a frame cannot imitate it.

   Home page only. The masthead is on all nine pages and a flourish that
   repeats on every one of them stops being a flourish by the third — here
   it is the first thing anybody sees, and then it is gone. */
growAndKeep({
  host: $('[data-mark-name]'),
  behind: $('[data-mark-back]'),
  front: $('[data-mark-front]'),
  seed: merchant.name,
  /* Thin, and the flowers small. The name has to stay a name. */
  density: 0.55,
  bloom: 0.62,
  maxElements: 34,
  colours: {
    stem: 'var(--leaf)',
    flower: 'var(--blush)',
    line: 'var(--ground)',
    vein: 'var(--ground)',
  },
});

/* The cake that is mostly a sentence, the card that goes in the box with it,
   and a second plate dropped below. The proposition is demonstrated rather
   than described — it is a page about words, so showing the words is the
   least it can do.

   None of these three is lazy, and the two small ones used to be. They are
   inside the first screen, and `loading="lazy"` on an image that is already
   in the viewport does not save a request — it just defers one the page is
   waiting on. Over localhost that is invisible. Over a real connection the
   apertures sat empty for a second or two, and an empty aperture is not a
   blank space: it is a solid plum oval, so the hero rendered as a headline
   with two purple discs beside it and looked broken rather than loading.
   This is the kind of defect a fast local server hides completely. */
const star = cakes.find((p) => p.id === 'written') ?? cakes[0];
const second = cakes.find((p) => p.id === 'heart') ?? cakes[1];

$('[data-hero]').innerHTML = `
  <div class="hero__main aperture aperture--arch aperture--portrait">
    <img src="${photo(star.image, 'lg')}"
         srcset="${photo(star.image, 'md')} 800w, ${photo(star.image, 'lg')} 1600w"
         sizes="(min-width: 60rem) 44vw, 92vw"
         alt="${esc(star.name)} — ${esc(star.subtitle)}"
         width="1600" height="2000" fetchpriority="high" decoding="async">
  </div>

  <div class="hero__small aperture aperture--oval aperture--square">
    <img src="${photo(second.image, 'md')}"
         srcset="${photo(second.image, 'sm')} 240w, ${photo(second.image, 'md')} 800w"
         sizes="(min-width: 60rem) 14vw, 32vw"
         alt="${esc(second.name)} — ${esc(second.subtitle)}"
         width="800" height="800" decoding="async">
  </div>

  <div class="hero__sprig aperture aperture--oval aperture--square">
    <img src="../../shared/img/photo-1617201947772-5581fac22966-md.jpg"
         srcset="../../shared/img/photo-1617201947772-5581fac22966-sm.jpg 240w, ../../shared/img/photo-1617201947772-5581fac22966-md.jpg 800w"
         sizes="(min-width: 60rem) 10vw, 24vw"
         alt="A single violet, photographed against violet cloth"
         width="800" height="800" decoding="async">
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
    `${count(cakes.length)} of them, from ${money(cheapest)}. Choose the size, what is inside and how the outside is finished, and the price moves as you go.`,
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
$('[data-card-head]').innerHTML = `The card is the part <span class="script">people keep.</span>`;

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

/* ---- The range ----------------------------------------------------------
   Four, and the shapes alternate — two arches and two ovals — so the row
   reads as a composition rather than as four identical cells. */
$('[data-cakes]').classList.add('cols--stagger');
$('[data-cakes]').innerHTML = tileSkeletons(4);
$('[data-cakes]').innerHTML = cakes
  .slice(0, 4)
  .map((p, i) =>
    /* The frame alternates, the ratio does not. Alternating both put the
       names at four different heights, which reads as a broken grid rather
       than as a composition — the rhythm has to look chosen. The stagger
       below is what makes it look chosen. */
    cakeTile(p, { when: session.state.when, frame: i % 2 ? 'oval' : 'arch' })
  )
  .join('');

/* ---- The shop ----------------------------------------------------------- */
const street = merchant.locations[0].address.split(',')[0].replace(/^\d+\s+/, '');
$('[data-shop-head]').innerHTML = `Two rooms on <span class="script">${esc(street)}.</span>`;
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
