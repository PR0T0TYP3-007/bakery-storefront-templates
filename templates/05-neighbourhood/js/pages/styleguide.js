/**
 * @file Style guide. Renders the data-driven components against deliberately
 * awkward fixtures, so the states that only appear on the right day — or with
 * the wrong content — are all visible in one place.
 */

import { startPage, $, esc } from './_page.js';
import * as session from '../services/session.js';
import { renderRow, renderTile, boardHead, skeletonRows } from '../components/board.js';
import { openDatePicker } from '../components/datepicker.js';
import { toast } from '../components/toast.js';
import { icons } from '../components/icons.js';
import { today, addDays } from '../../../../shared/core/dates.js';
import { shelf } from '../../../../shared/core/fulfilment.js';

await startPage({ nav: null, mobileTicket: false });

/* -------------------------------------------------------------------------
   Colour
   ------------------------------------------------------------------------- */
const TOKENS = [
  ['--paper', 'Ground'],
  ['--paper-2', 'Ground, raised'],
  ['--surface', 'Card'],
  ['--ink', 'Text, rules'],
  ['--ink-2', 'Secondary'],
  ['--ink-3', 'Tertiary'],
  ['--green', 'Available, primary'],
  ['--honey', 'Low stock'],
  ['--clay', 'Sold out, errors'],
];

const css = getComputedStyle(document.documentElement);
$('[data-swatches]').innerHTML = TOKENS.map(([token, role]) => {
  const value = css.getPropertyValue(token).trim();
  return `<div class="sw">
      <div class="sw__chip" style="background:var(${token})"></div>
      <p class="sm" style="margin-top:var(--s-2);color:var(--ink)"><strong>${esc(role)}</strong></p>
      <code>${esc(token)}</code><br><code>${esc(value)}</code>
    </div>`;
}).join('');

/* -------------------------------------------------------------------------
   Board, against hostile fixtures
   ------------------------------------------------------------------------- */
const real = session.state.catalogue.products;
const base = real.find((p) => p.kind === 'everyday') ?? real[0];

/**
 * Today's availability band comes from a hash of the product id and the date,
 * so a fixture cannot simply declare which band it wants. Searching for an id
 * that lands in the requested band keeps the demonstration on the real code
 * path — these rows are rendered by the same `shelf()` the shop uses, not by
 * a hand-written label that could drift away from it.
 */
function inBand(band, product) {
  for (let i = 0; i < 8000; i++) {
    const id = `sg-${band}-${i}`;
    if (shelf(session.state.merchant, { ...product, id }, today()).band === band) {
      return { ...product, id };
    }
  }
  return { ...product, id: `sg-${band}` };
}

const fixtures = [
  { ...inBand('plenty', base), name: 'Plenty left', subtitle: 'Most of the morning’s batch is still on the shelf' },
  { ...inBand('going', base), name: 'Going fast', subtitle: 'Under a fifth left — the threshold is in merchant config' },
  { ...inBand('last', base), name: 'Last few', subtitle: 'The only band that quotes the number, because now it matters' },
  { ...inBand('gone', base), name: 'Sold out today', subtitle: 'Dimmed, but never hidden' },
  {
    ...base,
    id: 'sg-long',
    name: 'Rosemary, Maldon Salt and Very Good Olive Oil Focaccia, sold by the slab',
    subtitle:
      'A deliberately overlong description, to prove a merchant cannot break the row rhythm by writing too much about their bread.',
  },
  { ...base, id: 'sg-nophoto', name: 'No photograph', subtitle: 'Falls back to a drawn monogram', image: null },
  // Any weekday but today's, or the fixture would simply be available and
  // fall through to a hashed band instead of demonstrating the state.
  {
    ...base,
    id: 'sg-notbaked',
    name: 'Not baked that day',
    subtitle: 'A product the shop only makes on other days',
    availableWeekdays: [(today().getDay() + 2) % 7],
  },
];

$('[data-board]').innerHTML =
  boardHead(today()) + fixtures.map((p) => renderRow(p, { when: today() })).join('');

/* A future day says what the shop does rather than how many it makes. */
$('[data-board]').innerHTML += `
  <p class="sm" style="margin-top:var(--s-4)">And the same board for a day still to come,
  where there is no shelf yet to count:</p>` +
  boardHead(addDays(today(), 5)) +
  [{ ...base, id: 'sg-future', name: 'Baked fresh', subtitle: 'The honest statement for any future day' },
   { ...base, id: 'sg-future-pop', name: 'Baked fresh, and popular', subtitle: 'Advice appears in the long label on the product page, not here', popular: true }]
    .map((p) => renderRow(p, { when: addDays(today(), 5) }))
    .join('');

const cakes = real.filter((p) => p.kind === 'cake').slice(0, 2);
$('[data-tiles]').innerHTML = cakes.length
  ? cakes.map((p) => renderTile(p, { when: addDays(today(), 3) })).join('')
  : '<p class="sm">This merchant does not make cakes to order.</p>';

$('[data-skeleton]').innerHTML = boardHead() + skeletonRows(3);

/* -------------------------------------------------------------------------
   Notices
   ------------------------------------------------------------------------- */
$('[data-notes]').innerHTML = [
  ['note', icons.clock, '<strong>Ready Saturday, 17 October.</strong> Collection windows are chosen at checkout.'],
  ['note note--warn', icons.alert, '<strong>2 items have sold out for today.</strong> Pick a later day and they come back.'],
  ['note note--bad', icons.alert, '<strong>Your bank declined the payment.</strong> Your ticket is exactly as you left it and nothing has been charged.'],
  ['note note--flat', icons.info, 'Everything is made in one small kitchen that handles gluten, dairy, egg, nuts, soya and sesame.'],
]
  .map(([cls, icon, text]) => `<p class="${cls}">${icon}<span>${text}</span></p>`)
  .join('');

$('[data-demo-error]').innerHTML = `${icons.alert}<span>Check the email address.</span>`;

/* -------------------------------------------------------------------------
   Overlays
   ------------------------------------------------------------------------- */
$('[data-demo-picker]').addEventListener('click', () =>
  openDatePicker({
    leadDays: 2,
    selected: session.state.when,
    title: 'Date picker, with two days of notice',
    note: 'Blocked days state their reason on the cell itself.',
    onSelect: () => {},
  })
);

$('[data-demo-toast]').addEventListener('click', () =>
  toast({ title: 'Country Sourdough added', detail: 'Collect today.' })
);

$('[data-demo-toast-bad]').addEventListener('click', () =>
  toast({ title: 'Payment not taken', detail: 'Your bank declined the card.', tone: 'bad' })
);
