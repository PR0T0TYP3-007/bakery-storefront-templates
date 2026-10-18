/**
 * @file Style guide.
 *
 * Renders the components against fixtures chosen to break them, and computes
 * the contrast table from the live tokens rather than writing it down. A
 * guide that states yesterday's contrast ratio is worse than no guide.
 */

import { startPage, $, esc } from './_page.js';
import * as session from '../services/session.js';
import { pieceTile } from '../components/pieces.js';
import { specSheet } from '../components/specsheet.js';
import { priceCommission } from '../commission.js';
import { openDatePicker } from '../components/datepicker.js';
import { toast } from '../components/toast.js';
import { icons } from '../components/icons.js';
import { money } from '../../../../shared/core/format.js';
import { today, addDays } from '../../../../shared/core/dates.js';
import { earliestFor } from '../../../../shared/core/fulfilment.js';

await startPage({ nav: null });

const { merchant, catalogue } = session.state;
const css = getComputedStyle(document.documentElement);
const token = (n) => css.getPropertyValue(n).trim();

/* -------------------------------------------------------------------------
   Colour
   ------------------------------------------------------------------------- */
const TOKENS = [
  ['--ground', 'Ground'],
  ['--raised', 'Raised'],
  ['--raised-2', 'Raised, further'],
  ['--ink', 'Text'],
  ['--ink-2', 'Secondary'],
  ['--acid', 'The one accent'],
  ['--ok', 'Good'],
  ['--warn', 'Attention'],
  ['--bad', 'Wrong'],
  ['--rule-strong', 'Structural rule'],
];

$('[data-swatches]').innerHTML = TOKENS.map(
  ([name, role]) => `
    <div class="c-2">
      <div style="height:64px;background:var(${name});border:1px solid var(--hair)"></div>
      <p class="sm" style="margin-top:var(--s-2);font-weight:600">${esc(role)}</p>
      <p class="xs dimmer"><code>${esc(name)}</code><br><code>${esc(token(name))}</code></p>
    </div>`
).join('');

/* -------------------------------------------------------------------------
   Contrast, measured
   ------------------------------------------------------------------------- */
function lum(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const PAIRS = [
  ['Body on the ground', '--ink', '--ground', 4.5],
  ['Secondary on the ground', '--ink-2', '--ground', 4.5],
  ['Body on a raised panel', '--ink', '--raised', 4.5],
  ['Secondary on a raised panel', '--ink-2', '--raised', 4.5],
  ['Accent on the ground', '--acid', '--ground', 4.5],
  ['Ground on the accent (buttons)', '--ground', '--acid', 4.5],
  ['Structural rule on the ground', '--rule-strong', '--ground', 3],
];

$('[data-contrast]').innerHTML = `
  <table class="sheet__lines" style="min-width:34rem">
    <thead>
      <tr style="border-bottom:1px solid var(--rule-strong)">
        <th style="text-align:left;color:var(--ink)">Pairing</th>
        <th style="text-align:left;color:var(--ink)">Needs</th>
        <th style="text-align:left;color:var(--ink)">Measured</th>
        <th style="text-align:left;color:var(--ink)">WCAG 2.2</th>
      </tr>
    </thead>
    <tbody>
      ${PAIRS.map(([label, fg, bg, need]) => {
        const r = ratio(token(fg), token(bg));
        const pass = r >= need;
        const verdict = need === 3 ? (pass ? 'SC 1.4.11' : 'Fails 1.4.11') : r >= 7 ? 'AAA' : pass ? 'AA' : 'Fails';
        return `<tr style="border-bottom:1px solid var(--hair)">
            <th style="text-align:left">${esc(label)}</th>
            <td style="text-align:left" class="dim">${need}:1</td>
            <td style="text-align:left" class="num">${r.toFixed(2)}:1</td>
            <td style="text-align:left"><span class="state" data-state="${pass ? 'in' : 'out'}">${verdict}</span></td>
          </tr>`;
      }).join('')}
    </tbody>
  </table>
  <p class="xs dimmer" style="margin-top:var(--s-3)">
    The decorative column grid behind the page is deliberately below these thresholds.
    It is atmosphere, it is aria-hidden, and nothing depends on seeing it — which is why
    structural rules use a separate, stronger token.
  </p>`;

/* -------------------------------------------------------------------------
   Choice rows
   ------------------------------------------------------------------------- */
$('[data-choices-demo]').innerHTML = `
  <fieldset class="choices">
    <legend class="label" style="padding-bottom:var(--s-2)">How far we take it</legend>
    ${catalogue.optionGroups.ambition.options
      .map(
        (o, i) => `
      <label class="choice">
        <input type="radio" name="sg-amb" value="${esc(o.id)}" ${i === 1 ? 'checked' : ''} ${i === 3 ? 'disabled' : ''}>
        <span class="choice__face">
          <span class="choice__name">${esc(o.label)}</span>
          <span class="choice__meta">× ${o.factor.toFixed(2)} · ${o.leadDays} days</span>
          <span class="choice__note">${esc(o.note)}</span>
          ${i === 3 ? '<span class="choice__why">Our diary is full until March.</span>' : ''}
        </span>
      </label>`
      )
      .join('')}
  </fieldset>`;

$('[data-demo-err]').innerHTML = `${icons.alert}<span>Check the email — the spec sheet goes there.</span>`;

/* -------------------------------------------------------------------------
   The sheet, at both ends of what the studio accepts
   ------------------------------------------------------------------------- */
const FIXTURES = [
  ['The smallest brief we take', { scale: 's', ambition: 'clean', palette: 'natural' }, [], ''],
  [
    'The most we can do',
    { scale: 'xl', ambition: 'editorial', palette: 'contrast', setup: true },
    catalogue.addons.map((a) => a.id),
    'For a launch in a white gallery. Nothing pink, and it has to survive two hours under lights.',
  ],
];

$('[data-sheets]').innerHTML = FIXTURES.map(([label, sel, tech, note]) => {
  const p = priceCommission(merchant, catalogue, sel, tech, { setup: Boolean(sel.setup) });
  return `
    <figure class="c-6" style="margin:0">
      <figcaption class="label" style="margin-bottom:var(--s-3)">${esc(label)} — ${money(p.subtotal)}, ${p.leadDays} days</figcaption>
      ${specSheet({
        merchant,
        priced: p,
        selections: sel,
        techniqueIds: tech,
        groups: catalogue.optionGroups,
        earliest: earliestFor(merchant, p.leadDays),
        notes: note,
      })}
    </figure>`;
}).join('');

/* -------------------------------------------------------------------------
   Pieces, against hostile content
   ------------------------------------------------------------------------- */
const base = catalogue.products.find((p) => p.kind === 'edition' && p.image);

const pieces = [
  { ...base, id: 'sg-1', name: 'Normal length', subtitle: 'And a normal subtitle' },
  {
    ...base,
    id: 'sg-2',
    name: 'An edition with a name far longer than any studio should give a cake',
    subtitle:
      'With a subtitle to match, proving a merchant cannot break the grid by being enthusiastic about their own work.',
  },
  { ...base, id: 'sg-3', name: 'No photograph', subtitle: 'The frame holds its ratio anyway', image: null },
  { ...base, id: 'sg-4', name: 'Not made that day', subtitle: 'Desaturated, never hidden', availableWeekdays: [(today().getDay() + 2) % 7] },
];

$('[data-pieces]').innerHTML = pieces
  .map((p, i) => `<div class="c-3">${pieceTile(p, { when: today(), n: i + 1 })}</div>`)
  .join('');

/* -------------------------------------------------------------------------
   Notices
   ------------------------------------------------------------------------- */
$('[data-notes]').innerHTML = [
  ['note', icons.calendar, '<strong>Ready Wednesday 18 November.</strong> The commission takes the longest, so the rest waits for it.'],
  ['note note--good', icons.check, '<strong>Kreuzberg, Mitte, Neukölln.</strong> Free on this order.'],
  ['note note--warn', icons.alert, '<strong>Commissions start at €280.</strong> This brief is €45 under. Take it further, make it bigger, or look at the editions.'],
  ['note note--bad', icons.alert, '<strong>Your bank declined the payment.</strong> Nothing has been charged and nothing you typed has been lost.'],
]
  .map(([cls, icon, text]) => `<p class="${cls}">${icon}<span>${text}</span></p>`)
  .join('');

/* -------------------------------------------------------------------------
   Overlays
   ------------------------------------------------------------------------- */
$('[data-demo-diary]').addEventListener('click', () =>
  openDatePicker({
    leadDays: 21,
    selected: session.state.when,
    title: 'The diary, with three weeks of bench time',
    note: 'Blocked days state their reason on the cell itself.',
    onSelect: () => {},
  })
);

$('[data-demo-slots]').addEventListener('click', () =>
  openDatePicker({
    leadDays: 10,
    selected: addDays(today(), 14),
    withSlots: true,
    title: 'The diary, with collection windows',
    note: 'Someone has to be at the bench to hand it over.',
    onSelect: () => {},
  })
);

$('[data-demo-toast]').addEventListener('click', () =>
  toast({ title: 'Brief added', detail: '€689.51 to book, €1,608.85 on collection.', icon: icons.check })
);

$('[data-demo-toast-bad]').addEventListener('click', () =>
  toast({ title: 'Payment not taken', detail: 'Your bank declined the card.', tone: 'bad', icon: icons.alert })
);
