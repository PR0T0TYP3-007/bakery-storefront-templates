/**
 * @file The style guide.
 *
 * Everything with a number in it is read out of the live CSS or the live
 * catalogue. A ratio typed into a style guide is a claim about the
 * stylesheet; a ratio computed in the page is a reading of it, and it goes
 * red on its own when somebody moves a token.
 */

import * as session from '../services/session.js';
import { renderHeader, renderFooter } from '../components/chrome.js';
import { shopTile, esc } from '../components/calendar.js';
import { toast } from '../components/toast.js';
import { windowOf } from '../year.js';

const $ = (s) => document.querySelector(s);

await session.boot();

renderHeader();
renderFooter();

const { merchant, catalogue } = session.state;
const css = getComputedStyle(document.documentElement);
const token = (name) => css.getPropertyValue(name).trim();

/* -------------------------------------------------------------------------
   Contrast, the WCAG 2.x way

   Hex only. Every colour in tokens.css is a literal hex, and refusing
   anything else is better than quietly mis-reading an `oklab()` — which is
   exactly how the project's contrast sweep invented four failures once and
   two more later.
   ------------------------------------------------------------------------- */
function rgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`Not a hex colour: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

function luminance(c) {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}

function ratio(a, b) {
  const l1 = luminance(rgb(a));
  const l2 = luminance(rgb(b));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/* -------------------------------------------------------------------------
   The separation method, demonstrated
   ------------------------------------------------------------------------- */
$('[data-demo-tiles]').innerHTML = `
  <div class="tiles">
    ${['marble', 'marble-2', 'marble-2', 'marble']
      .map(
        (s, i) => `
          <div class="demo__cell panel panel--${s}">
            <p class="label dim">Cell ${i + 1}</p>
            <p class="sm" style="margin-top:var(--s-2)">--${s}</p>
          </div>`
      )
      .join('')}
  </div>`;

/* -------------------------------------------------------------------------
   Swatches
   ------------------------------------------------------------------------- */
const PALETTE = [
  ['--tile', 'The ground'],
  ['--tile-2', 'Ground, banded'],
  ['--tile-3', 'Ground, deep — panels, primary button'],
  ['--marble', 'The surface that carries text'],
  ['--marble-2', 'Surface, second'],
  ['--marble-3', 'The grout'],
  ['--ink', 'Text on marble'],
  ['--ink-2', 'Secondary'],
  ['--ink-3', 'Tertiary'],
  ['--terracotta', 'Fill only — never text, either way'],
  ['--terracotta-deep', 'The warm band, with marble on it'],
  ['--ochre', 'Paint only — the floor pattern'],
  ['--ready', 'On the counter now'],
  ['--soon', 'Coming'],
  ['--gone', 'Errors, declines'],
];

$('[data-swatches]').innerHTML = PALETTE.map(
  ([name, role]) => `
    <figure class="sw">
      <div class="sw__chip" style="background:var(${name})"></div>
      <figcaption>
        <p class="sm"><strong>${esc(role)}</strong></p>
        <code class="sm">${esc(name)}</code>
        <code class="sm dim">${esc(token(name))}</code>
      </figcaption>
    </figure>`
).join('');

/* -------------------------------------------------------------------------
   The contrast grid
   ------------------------------------------------------------------------- */
const SURFACES = [
  ['--marble', 'Marble'],
  ['--marble-2', 'Marble 2'],
  ['--marble-3', 'Grout'],
  ['--tile', 'Tile'],
  ['--tile-2', 'Tile 2'],
  ['--tile-3', 'Tile 3'],
  ['--terracotta', 'Terracotta'],
  ['--terracotta-deep', 'Terracotta deep'],
];

const INKS = [
  ['--ink', 'Ink'],
  ['--ink-2', 'Ink 2'],
  ['--ink-3', 'Ink 3'],
  ['--marble', 'Marble'],
  ['--ready', 'Ready'],
  ['--soon', 'Soon'],
  ['--gone', 'Gone'],
];

$('[data-contrast]').innerHTML = `
  <thead>
    <tr>
      <th scope="col">Ink \\ on</th>
      ${SURFACES.map(([, label]) => `<th scope="col">${esc(label)}</th>`).join('')}
    </tr>
  </thead>
  <tbody>
    ${INKS.map(
      ([ink, inkLabel]) => `
        <tr>
          <th scope="row">${esc(inkLabel)}</th>
          ${SURFACES.map(([surface]) => {
            const r = ratio(token(ink), token(surface));
            /* 4.5 is AA for body text, 3 is AA for large text. Anything
               under 3 is not usable for words at any size. */
            const grade = r >= 4.5 ? 'pass' : r >= 3 ? 'large' : 'fail';
            return `<td class="cell cell--${grade}">
                      <span class="num">${r.toFixed(2)}</span>
                      <span class="vh">${
                        grade === 'pass'
                          ? 'passes at any size'
                          : grade === 'large'
                            ? 'large text only'
                            : 'fails'
                      }</span>
                      <span class="cell__g" aria-hidden="true">${
                        grade === 'pass' ? 'AA' : grade === 'large' ? 'lg' : 'no'
                      }</span>
                    </td>`;
          }).join('')}
        </tr>`
    ).join('')}
  </tbody>`;

/* -------------------------------------------------------------------------
   The two rules, with their numbers

   Stated as rules and then measured underneath, so the rule and the reading
   can never disagree on this page.
   ------------------------------------------------------------------------- */
const RULES = [
  {
    head: 'Ink on marble, marble on tile.',
    why: 'Never ink on the tile.',
    pairs: [
      ['--ink', '--tile', 'ink on tile'],
      ['--marble', '--tile', 'marble on tile'],
      ['--ink', '--marble', 'ink on marble'],
    ],
  },
  {
    head: 'Terracotta carries no small text, in either direction.',
    why: 'It is a fill. The deep one is the warm surface that can hold words.',
    pairs: [
      ['--marble', '--terracotta', 'marble on terracotta'],
      ['--ink', '--terracotta', 'ink on terracotta'],
      ['--marble', '--terracotta-deep', 'marble on terracotta deep'],
    ],
  },
];

$('[data-rules]').innerHTML = RULES.map(
  (rule) => `
    <section class="rule">
      <h4 class="t-3">${esc(rule.head)}</h4>
      <p class="sm" style="margin-top:var(--s-2)">${esc(rule.why)}</p>
      <ul class="rule__list">
        ${rule.pairs
          .map(([ink, surface, label]) => {
            const r = ratio(token(ink), token(surface));
            const ok = r >= 4.5;
            /* The swatch shows the pairing at its real ratio, which for the
               banned ones means text that is genuinely hard to read — that
               is the demonstration. `data-contrast-demo` tells the sweep
               this one is on purpose; see tools/contrast-sweep.js. */
            return `<li class="rule__row">
                      <span class="rule__swatch" data-contrast-demo
                            style="background:var(${surface});color:var(${ink})">Aa</span>
                      <span>${esc(label)}</span>
                      <span class="rule__n num${ok ? '' : ' is-bad'}">${r.toFixed(2)}${
                        ok ? '' : ' — banned'
                      }</span>
                    </li>`;
          })
          .join('')}
      </ul>
    </section>`
).join('');

/* -------------------------------------------------------------------------
   Type
   ------------------------------------------------------------------------- */
const SCALE = [
  ['t-hero', 'The calendar decides', '--t-hero'],
  ['t-1', 'On the counter', '--t-1'],
  ['t-2', 'What’s coming', '--t-2'],
  ['t-3', 'Tortell de Reis', '--t-3'],
  ['lede', 'Some things are only made when their day comes round.', '—'],
  ['', 'Body copy. Source Sans 3, the one face here that is read rather than painted.', '--t-body'],
  ['sm', 'Small print, hours, captions.', '--t-sm'],
  ['label', 'A painted sign', '--t-label'],
  ['money', '€22', '—'],
];

$('[data-scale]').innerHTML = SCALE.map(
  ([cls, sample, name]) => `
    <div class="step">
      <p class="step__name sm dim"><code>${esc(cls ? `.${cls}` : 'body')}</code> ${esc(name)}</p>
      <p class="${esc(cls)}">${esc(sample)}</p>
    </div>`
).join('');

/* -------------------------------------------------------------------------
   Live components
   ------------------------------------------------------------------------- */
const withPhoto = catalogue.products.find((p) => p.image);
const without = catalogue.products.find((p) => !p.image && p.kind === 'everyday');
const seasonal = catalogue.products.find(
  (p) => p.kind === 'calendar' && !p.image
);

$('[data-tiles]').innerHTML = [withPhoto, without, seasonal]
  .filter(Boolean)
  .map((p) => shopTile(p, { merchant, today: new Date() }))
  .join('');

/* A basket line, built by hand rather than from the cart: the guide must
   render whether or not anything has been added. */
$('[data-line]').innerHTML = `
  <article class="line">
    <div class="line__say">
      <h4 class="line__name t-3" lang="ca">${esc(withPhoto?.name ?? 'Croissant de mantega')}</h4>
      <p class="line__conf sm">8 to 10 · Bakery box</p>
      <p class="line__season sm">
        <span class="state__dot" aria-hidden="true"></span>
        Made for <span lang="ca">Reis</span> — from 23 December
      </p>
    </div>
    <div class="line__qty">
      <label class="vh" for="g-qty">Quantity</label>
      <input class="qty__in num" id="g-qty" type="number" value="2" min="1" max="20">
    </div>
    <p class="line__price money">€44</p>
    <button class="line__drop" type="button">Remove</button>
  </article>`;

/* -------------------------------------------------------------------------
   The year, resolved
   ------------------------------------------------------------------------- */
const thisYear = new Date().getFullYear();
const dayMonth = (d) =>
  new Intl.DateTimeFormat(merchant.locale, { day: 'numeric', month: 'long' }).format(d);

$('[data-year-demo]').innerHTML = (merchant.year ?? [])
  .filter((e) => typeof e.easter === 'number')
  .map((entry) => {
    const years = [thisYear, thisYear + 1, thisYear + 2]
      .map((y) => windowOf(entry, y))
      .filter(Boolean);
    return `
      <div class="card__row">
        <dt class="card__name">
          <span lang="ca">${esc(entry.day)}</span>
          <span class="card__sub sm">Easter ${entry.easter > 0 ? '+' : ''}${esc(String(entry.easter))} days</span>
        </dt>
        <dd class="card__price sm num">${years.map((w) => esc(dayMonth(w.on))).join(' · ')}</dd>
      </div>`;
  })
  .join('');

/* -------------------------------------------------------------------------
   Toast
   ------------------------------------------------------------------------- */
$('[data-toast]').addEventListener('click', () => {
  toast({
    title: 'Tortell de Reis, in the basket.',
    detail: "We couldn't make it in time, so it's down for 6 January.",
  });
});
