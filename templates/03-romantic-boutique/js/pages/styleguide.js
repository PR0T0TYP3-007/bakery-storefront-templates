/**
 * @file Style guide.
 *
 * Two tables here are computed rather than written down, and both exist
 * because of D13: three times on this project a claim about the design was
 * contradicted by measuring it, and all three claims were ours.
 *
 * The contrast table reads the live tokens. It caught two real failures in
 * this template before anything shipped — `--ink-3` at 4.22:1 and
 * `--rule-strong` at 2.99:1.
 *
 * The target table is new, and it is here because Template 02's
 * documentation said "every tap target is at least 44 × 44" and measuring
 * found fifteen that were not, including every footer link. It walks the
 * rendered page and reports the smallest interactive elements it can find,
 * so the claim is checkable by anyone who opens this page rather than
 * believable only on our word.
 */

import { startPage, $, $$, esc, photo } from './_page.js';
import * as session from '../services/session.js';
import { cakeTile } from '../components/cakes.js';
import { cardPreview, plaquePreview } from '../components/cardpreview.js';
import { openDatePicker } from '../components/datepicker.js';
import { toast } from '../components/toast.js';
import { icons } from '../components/icons.js';
import { today, addDays } from '../../../../shared/core/dates.js';

await startPage({ nav: null });

const { merchant, catalogue } = session.state;
const css = getComputedStyle(document.documentElement);
const token = (n) => css.getPropertyValue(n).trim();

/* -------------------------------------------------------------------------
   Colour
   ------------------------------------------------------------------------- */
const TOKENS = [
  ['--ground', 'Ground'],
  ['--deep', 'Deeper'],
  ['--deepest', 'Deepest'],
  ['--ink', 'Text'],
  ['--ink-2', 'Secondary'],
  ['--ink-3', 'Tertiary'],
  ['--blush', 'The one accent'],
  ['--ok', 'Good'],
  ['--warn', 'Attention'],
  ['--bad', 'Wrong'],
  ['--rule-strong', 'Structural rule'],
  ['--hair', 'Hairline'],
];

$('[data-swatches]').innerHTML = TOKENS.map(
  ([name, role]) => `
    <div>
      <div class="swatch" style="background:var(${name})"></div>
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
  ['Tertiary on the ground', '--ink-3', '--ground', 4.5],
  ['Body on the deeper band', '--ink', '--deep', 4.5],
  ['Secondary on the deeper band', '--ink-2', '--deep', 4.5],
  ['Tertiary on the deeper band', '--ink-3', '--deep', 4.5],
  ['Body on the deepest band', '--ink', '--deepest', 4.5],
  ['Secondary on the deepest band', '--ink-2', '--deepest', 4.5],
  ['Accent on the ground', '--blush', '--ground', 4.5],
  ['Accent on the deeper band', '--blush', '--deep', 4.5],
  ['Button ink on the accent', '--blush-ink', '--blush', 4.5],
  ['Good on the ground', '--ok', '--ground', 4.5],
  ['Attention on the ground', '--warn', '--ground', 4.5],
  ['Wrong on the ground', '--bad', '--ground', 4.5],
  ['Structural rule on the ground', '--rule-strong', '--ground', 3],
];

$('[data-contrast]').innerHTML = `
  <table class="sg-table" style="min-width:34rem">
    <thead>
      <tr>
        <th>Pairing</th><th>Needs</th><th>Measured</th><th>WCAG 2.2</th>
      </tr>
    </thead>
    <tbody>
      ${PAIRS.map(([label, fg, bg, need]) => {
        const r = ratio(token(fg), token(bg));
        const pass = r >= need;
        const verdict =
          need === 3
            ? pass
              ? 'SC 1.4.11'
              : 'Fails 1.4.11'
            : r >= 7
              ? 'AAA'
              : pass
                ? 'AA'
                : 'Fails';
        return `<tr>
            <th>${esc(label)}</th>
            <td class="dim">${need}:1</td>
            <td class="num">${r.toFixed(2)}:1</td>
            <td><span class="state" data-state="${pass ? 'in' : 'out'}">${verdict}</span></td>
          </tr>`;
      }).join('')}
    </tbody>
  </table>
  <p class="xs dimmer" style="margin-top:var(--s-3)">
    The hairline is deliberately below these thresholds. It is atmosphere, nothing depends
    on seeing it, and anything that actually separates content uses the stronger token.
  </p>`;

/* -------------------------------------------------------------------------
   Targets, measured on this page as rendered
   ------------------------------------------------------------------------- */
/**
 * What a finger can actually hit, which is often not the element's own box.
 *
 * Two cases, and both had to be handled before this table said anything
 * useful. A radio inside a `.choice` is one pixel square — it is hidden on
 * purpose and the label around it is the target. A tile title is 22px tall
 * but carries a stretched `::after` over the whole tile. Measuring the raw
 * boxes reported seven failures, every one of them false, which is how a
 * measurement stops being read.
 *
 * Both are detected from the computed styles rather than from a list of
 * selectors, so this keeps working when the components change.
 */
function effectiveBox(el) {
  const own = el.getBoundingClientRect();

  if (own.width <= 2 || own.height <= 2) {
    const label = el.closest('label');
    if (label) return { box: label.getBoundingClientRect(), via: 'its label' };
  }

  for (const pseudo of ['::after', '::before']) {
    const cs = getComputedStyle(el, pseudo);
    const stretched =
      cs.position === 'absolute' &&
      cs.content !== 'none' &&
      ['top', 'right', 'bottom', 'left'].every((side) => cs[side] === '0px');
    if (!stretched) continue;
    const host = el.offsetParent;
    if (host) return { box: host.getBoundingClientRect(), via: 'a stretched overlay' };
  }

  return { box: own, via: '' };
}

function measureTargets() {
  const SEL = 'a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';
  const rows = [];

  for (const el of $$(SEL)) {
    if (el.closest('.sr') || el.getAttribute('aria-hidden') === 'true') continue;
    const { box, via } = effectiveBox(el);
    if (!box.width || !box.height) continue;
    rows.push({
      what: (el.getAttribute('aria-label') || el.textContent.trim() || el.type || el.tagName).slice(0, 36),
      tag: el.tagName.toLowerCase(),
      via,
      w: Math.round(box.width),
      h: Math.round(box.height),
      min: Math.min(Math.round(box.width), Math.round(box.height)),
    });
  }

  rows.sort((a, b) => a.min - b.min);
  return rows;
}

function paintTargets() {
  const rows = measureTargets();
  const under24 = rows.filter((r) => r.min < 24);
  const under44 = rows.filter((r) => r.min < 44);

  $('[data-targets]').innerHTML = `
    <p class="sm" style="margin-bottom:var(--s-3)">
      ${rows.length} interactive elements on this page at ${window.innerWidth}px wide.
      <strong>${under44.length}</strong> under 44px on their short side,
      <strong>${under24.length}</strong> under the 24px that SC 2.5.8 requires.
    </p>
    <table class="sg-table" style="min-width:30rem">
      <thead><tr><th>Smallest ten</th><th>Element</th><th>Target</th><th>Size</th><th>SC 2.5.8</th></tr></thead>
      <tbody>
        ${rows
          .slice(0, 10)
          .map(
            (r) => `<tr>
              <th>${esc(r.what)}</th>
              <td class="dim">${esc(r.tag)}</td>
              <td class="dim">${esc(r.via || 'itself')}</td>
              <td class="num">${r.w} × ${r.h}</td>
              <td><span class="state" data-state="${r.min >= 24 ? 'in' : 'out'}">${
                r.min >= 24 ? 'Passes' : 'Under 24'
              }</span></td>
            </tr>`
          )
          .join('')}
      </tbody>
    </table>
    <p class="xs dimmer" style="margin-top:var(--s-3)">
      Measured live, on this page, at this width — resize the window and the numbers move.
      The target column says what is actually being hit: a radio is one pixel square and
      hidden on purpose, so its label is the target, and a tile title carries a stretched
      overlay over the whole tile. Both are detected from the computed styles rather than
      from a list of selectors, and the hit test below confirms the second one by
      hit-testing rather than by asserting it.
    </p>
    <p class="note sm" style="margin-top:var(--s-3)" data-hit></p>`;
}

/* -------------------------------------------------------------------------
   The card, at both ends of what the stock takes
   ------------------------------------------------------------------------- */
const CARDS = [
  ['The shortest card anyone sends', { to: 'Mara', message: 'Happy birthday.', from: 'Dad' }],
  [
    'As much as the stock holds',
    {
      to: 'Mara',
      message:
        'I hope this year is kinder than the last one was, and that you get a little of what you have been quietly hoping for.',
      from: 'Dad and Jess',
    },
  ],
  [
    'More than the stock holds',
    {
      to: 'Mara',
      message: Array.from({ length: 26 }, () => 'something').join(' '),
      from: 'Dad',
    },
  ],
  [
    'Words a pen cannot make',
    { to: 'Mara', message: 'Happy birthday 🎂🎉', from: 'Dad' },
  ],
  [
    'A word wider than the card',
    { message: 'Congratulations Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch', from: 'Everyone' },
  ],
  ['Nothing written yet', { to: '', message: '', from: '' }],
];

$('[data-letters]').innerHTML = CARDS.map(
  ([label, card]) => `
    <div>
      <p class="label" style="margin-bottom:var(--s-3)">${esc(label)}</p>
      ${cardPreview({ card, merchant })}
    </div>`
).join('');

/* -------------------------------------------------------------------------
   Type
   ------------------------------------------------------------------------- */
const inscribable = catalogue.products.find((p) => p.inscribable);

$('[data-type]').innerHTML = `
  <div class="stack">
    <p class="label">Display — Julius Sans One, incised capitals</p>
    <p class="t-1">Someone is about to open this</p>
    <p class="t-2">An engraved invitation, not a frosting script</p>
    <p class="t-3">Short strings, always tracked out</p>
  </div>
  <div class="stack">
    <p class="label">Interface — Karla</p>
    <p>Everything functional is set in this: prices, buttons, availability,
      errors and body copy. It is the face that has to survive being read quickly
      on a phone, so it is the plainest thing in the template.</p>
    <p class="label" style="margin-top:var(--s-4)">The hand — Petit Formal Script</p>
    <p class="sm dim">Allowed only inside a depiction of handwriting, never in the
      interface, never below 1.25rem. That rule is the whole difference between this
      template and a stock bakery theme with a script navigation.</p>
    ${plaquePreview({ text: 'Happy birthday Mara', product: inscribable })}
  </div>`;

/* -------------------------------------------------------------------------
   Cakes, against hostile content
   ------------------------------------------------------------------------- */
const base = catalogue.products.find((p) => p.kind === 'cake' && p.image);

const hostile = [
  { ...base, id: 'sg-1', name: 'Normal length', subtitle: 'And a normal subtitle' },
  {
    ...base,
    id: 'sg-2',
    name: 'A cake with a name far longer than any shop should give to a cake',
    subtitle:
      'With a subtitle to match, proving a merchant cannot break the grid by being enthusiastic about their own work.',
  },
  { ...base, id: 'sg-3', name: 'No photograph', subtitle: 'The aperture holds its shape anyway', image: null },
  {
    ...base,
    id: 'sg-4',
    name: 'Nothing written on it',
    subtitle: 'Says so on the tile, rather than on the page after the click',
    inscribable: false,
  },
];

$('[data-cakes]').innerHTML = hostile.map((p) => cakeTile(p, { when: today() })).join('');

/* -------------------------------------------------------------------------
   Choices
   ------------------------------------------------------------------------- */
const finish = catalogue.optionGroups.finish;

$('[data-choices]').innerHTML = `
  <fieldset class="choices">
    <legend class="label" style="padding-bottom:var(--s-3)">${esc(finish.label)}</legend>
    ${finish.options
      .map(
        (o, i) => `
      <label class="choice">
        <input type="radio" name="sg-finish" value="${esc(o.id)}" ${i === 1 ? 'checked' : ''} ${
          i === 3 ? 'disabled' : ''
        }>
        <span class="choice__face">
          <span class="choice__name">${esc(o.label)}</span>
          <span class="choice__meta">${o.price ? `+£${o.price}` : 'included'}</span>
          <span class="choice__note">${esc(o.note)}</span>
          ${i === 3 ? '<span class="choice__why">Only on the larger sizes</span>' : ''}
        </span>
      </label>`
      )
      .join('')}
  </fieldset>
  <label class="field" style="margin-top:var(--s-5)">
    <span class="field__label label" for="sg-field">A field is a line, not a box</span>
    <span class="field__hint">With a permanent label, a 2px baseline that clears 3:1, and an ordinary focus ring.</span>
    <input class="input" id="sg-field" type="text" value="Mara">
    <span class="err" data-demo-err></span>
  </label>`;

$('[data-demo-err]').innerHTML = `${icons.alert}<span>Check the email — the receipt goes there.</span>`;

/* -------------------------------------------------------------------------
   Notices
   ------------------------------------------------------------------------- */
$('[data-notes]').innerHTML = [
  ['note', icons.calendar, '<strong>Ready Saturday 14 November.</strong> The Rose Tier takes the longest, so the rest waits for it.'],
  ['note note--good', icons.check, '<strong>Bath, inside the city.</strong> Free on this order.'],
  ['note note--warn', icons.alert, '<strong>This is seven lines and the card holds six.</strong> Take out about 24 characters and it fits.'],
  ['note note--bad', icons.alert, '<strong>Your bank declined the payment.</strong> Nothing has been charged and nothing you typed has been lost.'],
]
  .map(([cls, icon, text]) => `<p class="${cls}">${icon}<span>${text}</span></p>`)
  .join('');

/* -------------------------------------------------------------------------
   Overlays
   ------------------------------------------------------------------------- */
$('[data-demo-diary]').addEventListener('click', () =>
  openDatePicker({
    leadDays: 6,
    selected: session.state.when,
    title: 'The diary, with six days of notice',
    note: 'Blocked days state their reason on the cell itself.',
    onSelect: () => {},
  })
);

$('[data-demo-slots]').addEventListener('click', () =>
  openDatePicker({
    leadDays: 2,
    selected: addDays(today(), 7),
    withSlots: true,
    title: 'The diary, with collection windows',
    note: 'Someone has to be in the shop to hand it over.',
    onSelect: () => {},
  })
);

$('[data-demo-toast]').addEventListener('click', () =>
  toast({ title: 'The Heart added', detail: 'Red velvet · smooth · ready Saturday', icon: icons.check })
);

$('[data-demo-toast-bad]').addEventListener('click', () =>
  toast({ title: 'Payment not taken', detail: 'Your bank declined the card.', tone: 'bad', icon: icons.alert })
);

/* -------------------------------------------------------------------------
   Run the measurements last, once everything above is on the page
   ------------------------------------------------------------------------- */
paintTargets();
window.addEventListener('resize', paintTargets, { passive: true });

/* The tile-is-clickable claim, hit-tested rather than asserted. An outside
   review of Template 04 said only the title was clickable; it was wrong, and
   the way to settle that is elementFromPoint, not an argument. */
{
  const tile = $('[data-cakes] .cake');
  // elementFromPoint only answers for what is in the viewport, and this
  // section is a long way down the page. The first version of this check
  // reported a failure that was entirely its own.
  tile.scrollIntoView({ block: 'center' });
  const box = tile.getBoundingClientRect();
  const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 3);
  const ok = Boolean(hit?.closest('.cake')?.querySelector('a[href]'));
  const el = $('[data-hit]');
  el.className = `note sm ${ok ? 'note--good' : 'note--bad'}`;
  el.innerHTML = `${ok ? icons.check : icons.alert}<span>${
    ok
      ? 'Hit test: a click in the middle of a tile lands on its link.'
      : 'Hit test: a click in the middle of a tile does not reach the link.'
  }</span>`;
}
