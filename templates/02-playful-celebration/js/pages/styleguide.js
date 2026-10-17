/**
 * @file Style guide.
 *
 * Renders the components against fixtures chosen to break them — a name too
 * long for its card, a product with no photograph, a sold-out day, an error
 * on a field — so the states that only occur on the wrong day are visible
 * together rather than found by a customer.
 *
 * The contrast table is computed from the live tokens rather than written
 * down, so changing a colour changes the number here. A guide that states
 * yesterday's contrast ratio is worse than no guide.
 */

import { startPage, $, esc } from './_page.js';
import * as session from '../services/session.js';
import { productCard } from '../components/cards.js';
import { cakeSVG, specFrom } from '../components/cake.js';
import { openDatePicker } from '../components/datepicker.js';
import { toast } from '../components/toast.js';
import { icons } from '../components/icons.js';
import { today, addDays } from '../../../../shared/core/dates.js';

await startPage({ nav: null });

const css = getComputedStyle(document.documentElement);
const token = (name) => css.getPropertyValue(name).trim();

/* -------------------------------------------------------------------------
   Colour
   ------------------------------------------------------------------------- */
const TOKENS = [
  ['--sun', 'Ground'],
  ['--sun-2', 'Ground, deeper'],
  ['--sun-3', 'Panel, soft'],
  ['--surface', 'Card'],
  ['--ink', 'Text, every outline'],
  ['--ink-2', 'Secondary text'],
  ['--grape', 'Primary action'],
  ['--berry', 'Accent, the one flag'],
  ['--mint', 'Good news'],
  ['--tangerine', 'Needs attention'],
];

$('[data-swatches]').innerHTML = TOKENS.map(
  ([name, role]) => `
    <div class="panel panel--tight panel--flat">
      <div style="height:54px;border:var(--stroke-2);border-radius:var(--r-sm);background:var(${name})"></div>
      <p class="sm" style="margin-top:var(--s-3);font-weight:800">${esc(role)}</p>
      <p class="xs quiet"><code>${esc(name)}</code><br><code>${esc(token(name))}</code></p>
    </div>`
).join('');

/* -------------------------------------------------------------------------
   Contrast, measured
   ------------------------------------------------------------------------- */
function luminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const PAIRS = [
  ['Body text on the ground', '--ink', '--sun'],
  ['Secondary text on the ground', '--ink-2', '--sun'],
  ['Body text on a card', '--ink', '--surface'],
  ['Secondary text on a card', '--ink-2', '--surface'],
  ['Primary button label', '--surface', '--grape'],
  ['Grape link on the ground', '--grape', '--sun'],
  ['Footer text on ink', '--sun-3', '--ink'],
];

$('[data-contrast]').innerHTML = `
  <table style="width:100%;border-collapse:collapse;font-size:var(--sm)">
    <thead>
      <tr style="text-align:left;border-bottom:var(--stroke-2)">
        <th style="padding:var(--s-2)">Pairing</th>
        <th style="padding:var(--s-2)">Ratio</th>
        <th style="padding:var(--s-2)">WCAG 2.2</th>
      </tr>
    </thead>
    <tbody>
      ${PAIRS.map(([label, fg, bg]) => {
        const r = ratio(token(fg), token(bg));
        const verdict = r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA large only' : 'Fails';
        return `<tr style="border-bottom:1px solid var(--ink-3)">
            <td style="padding:var(--s-2)">${esc(label)}</td>
            <td style="padding:var(--s-2)" class="money">${r.toFixed(2)}:1</td>
            <td style="padding:var(--s-2)">
              <span class="fact ${r >= 4.5 ? 'fact--mint' : 'fact--out'}">${verdict}</span>
            </td>
          </tr>`;
      }).join('')}
    </tbody>
  </table>`;

/* -------------------------------------------------------------------------
   The cake, in every finish
   ------------------------------------------------------------------------- */
const custom = session.state.catalogue.products.find((p) => p.kind === 'custom');
const groups = session.groups();

const FIXTURES = [
  ['Smooth, one tier', { tiers: '1', sponge: 'vanilla', filling: 'vanillabc', icing: 'cream', finish: 'smooth', topper: 'none' }, ''],
  ['Swirled, two tiers', { tiers: '2', sponge: 'lemon', filling: 'curd', icing: 'mint', finish: 'swirl', topper: 'fruit' }, 'Well done'],
  ['Drip, three tiers', { tiers: '3', sponge: 'chocolate', filling: 'ganache', icing: 'cocoa', finish: 'drip', topper: 'sparklers' }, 'Congratulations'],
  ['Sprinkle coat', { tiers: '2', sponge: 'funfetti', filling: 'jam', icing: 'strawberry', finish: 'sprinkles', topper: 'candles' }, 'Happy Birthday'],
  ['Naked, sponge showing', { tiers: '2', sponge: 'velvet', filling: 'caramel', icing: 'cream', finish: 'naked', topper: 'fruit' }, ''],
  ['Longest message that fits', { tiers: '1', sponge: 'vanilla', filling: 'jam', icing: 'lilac', finish: 'smooth', topper: 'figure' }, 'Happy Retirement Mr Okonkwo'],
];

$('[data-cakes]').innerHTML = FIXTURES.map(
  ([label, sel, said]) => `
    <figure class="panel panel--tight" style="margin:0;background:var(--sun-3)">
      ${cakeSVG(specFrom(custom, sel, groups, said), { className: 'stage__svg' })}
      <figcaption class="sm" style="font-weight:800;margin-top:var(--s-2)">${esc(label)}</figcaption>
    </figure>`
).join('');

/* -------------------------------------------------------------------------
   Cards, against hostile content
   ------------------------------------------------------------------------- */
const real = session.state.catalogue.products;
const base = real.find((p) => p.kind === 'cake');

const cardFixtures = [
  { ...base, id: 'sg-1', name: 'Normal length name', subtitle: 'And a normal subtitle' },
  {
    ...base,
    id: 'sg-2',
    name: 'A deliberately overlong cake name that no merchant should write but one eventually will',
    subtitle:
      'With a subtitle to match, proving that a merchant cannot break the grid rhythm by being enthusiastic about their own cake.',
  },
  { ...base, id: 'sg-3', name: 'No photograph', subtitle: 'Falls back to a drawing of its defaults', image: null },
  { ...base, id: 'sg-4', name: 'Sold out today', subtitle: 'Dimmed and desaturated, never hidden', batchSize: 1 },
];

$('[data-cards]').innerHTML = cardFixtures
  .map((p, i) => productCard(p, { when: today(), tall: true, flag: i === 0 ? 'Most ordered' : undefined }))
  .join('');

/* -------------------------------------------------------------------------
   Swatches
   ------------------------------------------------------------------------- */
$('[data-swatch-demo]').innerHTML = `
  <fieldset class="swatches">
    <legend>The colour</legend>
    ${groups.icing.options
      .slice(0, 4)
      .map(
        (o, i) => `
      <label class="sw">
        <input type="radio" name="sg-icing" value="${esc(o.id)}" ${i === 1 ? 'checked' : ''} ${i === 3 ? 'disabled' : ''}>
        <span class="sw__face">
          <span class="sw__dot" style="--dot:${esc(o.swatch)}"></span>
          <span class="sw__name">${esc(o.label)}</span>
          <span class="sw__meta">${o.price ? `+£${o.price}` : 'included'}</span>
          ${i === 3 ? '<span class="sw__meta">Not this week</span>' : ''}
        </span>
      </label>`
      )
      .join('')}
  </fieldset>`;

$('[data-demo-err]').innerHTML = `${icons.alert}<span>Check the email address — the receipt goes there.</span>`;

/* -------------------------------------------------------------------------
   Notices
   ------------------------------------------------------------------------- */
$('[data-notes]').innerHTML = [
  ['note', icons.calendar, '<strong>Everything is ready Saturday 24 October.</strong> The Rainbow takes the longest, so the rest waits for it.'],
  ['note note--good', icons.check, '<strong>Margate &amp; Cliftonville.</strong> Delivery is £4.50 — and free on this order.'],
  ['note note--warn', icons.alert, '<strong>Two prices have changed since they were added.</strong> The figures below are today&rsquo;s. Nothing has been charged.'],
  ['note note--bad', icons.alert, '<strong>Your bank declined the payment.</strong> Nothing has been charged and nothing you typed has been lost.'],
  ['note note--flat', icons.info, 'We make 14 cakes a day, so the day is held when you check out — not now.'],
]
  .map(([cls, icon, text]) => `<p class="${cls}">${icon}<span>${text}</span></p>`)
  .join('');

/* -------------------------------------------------------------------------
   Overlays
   ------------------------------------------------------------------------- */
$('[data-demo-picker]').addEventListener('click', () =>
  openDatePicker({
    leadDays: 4,
    selected: session.state.when,
    title: 'Date picker, with four days of notice',
    note: 'Blocked days state their reason on the cell itself.',
    onSelect: () => {},
  })
);

$('[data-demo-slots]').addEventListener('click', () =>
  openDatePicker({
    leadDays: 4,
    selected: addDays(today(), 6),
    withSlots: true,
    title: 'Date picker, with collection windows',
    note: 'Windows have their own limits, so a free day can still have a full morning.',
    onSelect: () => {},
  })
);

$('[data-demo-toast]').addEventListener('click', () =>
  toast({ title: 'Build your own added', detail: 'Ready Saturday 24 October.', icon: icons.check })
);

$('[data-demo-toast-bad]').addEventListener('click', () =>
  toast({ title: 'Payment not taken', detail: 'Your bank declined the card.', tone: 'bad', icon: icons.alert })
);
