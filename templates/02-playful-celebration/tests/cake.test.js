/**
 * @file Tests for the cake renderer.
 *
 * Run with `node --test` from this folder. No framework, no transpiler: the
 * module is plain ESM with no DOM dependency, which is exactly why it is
 * testable at all — `cakeSVG` returns a string.
 *
 * What is worth testing here is not "does it draw a cake", which a human has
 * to judge, but the four properties the page depends on:
 *   - determinism, because the preview must not shimmer on every keystroke
 *   - unique ids, because thumbnails put several cakes in one document
 *   - escaping, because the inscription is user input drawn into markup
 *   - the data mapping, because option ids and drawing modes are two
 *     different vocabularies and the join between them is easy to get wrong
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cakeSVG, specFrom, describe as describeCake, tierIcon } from '../js/components/cake.js';

const SPEC = {
  tiers: 2,
  sponge: '#6b4328',
  filling: '#d6295c',
  icing: '#ffb3cd',
  finish: 'drip',
  topper: 'candles',
  inscription: 'Happy Birthday',
};

const GROUPS = {
  tiers: { id: 'tiers', options: [{ id: '1' }, { id: '2' }, { id: '3' }] },
  sponge: {
    id: 'sponge',
    options: [
      { id: 'vanilla', label: 'Vanilla', swatch: '#f7e2a8' },
      { id: 'funfetti', label: 'Funfetti', swatch: '#fbeed0', speckled: true },
    ],
  },
  filling: { id: 'filling', options: [{ id: 'jam', label: 'Jam', swatch: '#d6295c' }] },
  icing: { id: 'icing', options: [{ id: 'cocoa', label: 'Chocolate', swatch: '#7a4a2b' }] },
  finish: {
    id: 'finish',
    options: [
      { id: 'smooth', label: 'Smooth', draw: 'smooth' },
      { id: 'naked', label: 'Naked', draw: 'naked' },
    ],
  },
  topper: {
    id: 'topper',
    options: [
      { id: 'none', label: 'Nothing', draw: 'none' },
      { id: 'figure', label: 'Fondant figure', draw: 'figure' },
    ],
  },
};

const PRODUCT = { options: ['tiers', 'sponge', 'filling', 'icing', 'finish', 'topper'], defaults: {} };

/* ---------------------------------------------------------------------------
   Determinism
   --------------------------------------------------------------------------- */

test('the same configuration draws the same sprinkles every time', () => {
  const spec = { ...SPEC, finish: 'sprinkles' };
  // Ids differ per call by design, so they are normalised out before comparing.
  const strip = (s) => s.replace(/-\d+/g, '-N');
  assert.equal(strip(cakeSVG(spec)), strip(cakeSVG(spec)));
});

test('a different configuration draws different sprinkles', () => {
  const strip = (s) => s.replace(/-\d+/g, '-N');
  const a = strip(cakeSVG({ ...SPEC, finish: 'sprinkles', icing: '#ffb3cd' }));
  const b = strip(cakeSVG({ ...SPEC, finish: 'sprinkles', icing: '#bdf0dc' }));
  assert.notEqual(a, b);
});

test('typing an inscription does not re-pour the drip', () => {
  // The drip is seeded from the configuration and not from the text, so the
  // lobes must be byte-identical as the message changes.
  const lobes = (s) => s.match(/ Q[\d.]+ [\d.]+ [\d.]+ [\d.]+/g)?.join('|');
  assert.equal(
    lobes(cakeSVG({ ...SPEC, inscription: 'H' })),
    lobes(cakeSVG({ ...SPEC, inscription: 'Happy Birthday Nour' }))
  );
});

/* ---------------------------------------------------------------------------
   Structure
   --------------------------------------------------------------------------- */

test('draws one group per tier', () => {
  for (const n of [1, 2, 3]) {
    const svg = cakeSVG({ ...SPEC, tiers: n });
    assert.equal((svg.match(/data-tier="/g) ?? []).length, n, `${n} tiers`);
  }
});

test('tier count is clamped rather than trusted', () => {
  assert.equal((cakeSVG({ ...SPEC, tiers: 9 }).match(/data-tier="/g) ?? []).length, 3);
  assert.equal((cakeSVG({ ...SPEC, tiers: 0 }).match(/data-tier="/g) ?? []).length, 1);
  assert.equal((cakeSVG({ ...SPEC, tiers: 'two' }).match(/data-tier="/g) ?? []).length, 1);
});

test('ids are unique across cakes in one document', () => {
  const both = cakeSVG(SPEC) + cakeSVG(SPEC);
  const ids = both.match(/id="[^"]+"/g) ?? [];
  assert.equal(new Set(ids).size, ids.length, 'a duplicate id would cross-wire two clip paths');
});

test('the compact form drops the plate, the notch and the inscription', () => {
  const svg = cakeSVG(SPEC, { compact: true });
  // Specifically the plate, not "no ellipse at all" — candle flames are
  // ellipses too, and the first version of this test caught those instead.
  assert.ok(!svg.includes('rx="146"'), 'no plate');
  assert.ok(!svg.includes('mask="url'), 'no cut wedge');
  assert.ok(!svg.includes('<text'), 'no inscription at thumbnail size');
});

test('a naked finish shows the sponge instead of a cut wedge', () => {
  const svg = cakeSVG({ ...SPEC, finish: 'naked' });
  assert.ok(!svg.includes('mask="url'), 'nothing to cut through');
  assert.ok(svg.includes('opacity="0.26"'), 'the icing is a wash, not a shell');
});

/* ---------------------------------------------------------------------------
   The inscription is user input
   --------------------------------------------------------------------------- */

test('the inscription is escaped into the drawing', () => {
  const svg = cakeSVG({ ...SPEC, inscription: '<script>alert(1)</script> & "co"' });
  assert.ok(!svg.includes('<script>'), 'no raw tag reaches the markup');
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(svg.includes('&amp;'));
});

test('a long inscription is set smaller rather than overflowing', () => {
  const size = (s) => Number(s.match(/font-size="([\d.]+)"/)?.[1]);
  assert.ok(size(cakeSVG({ ...SPEC, inscription: 'Hi' })) >
            size(cakeSVG({ ...SPEC, inscription: 'Happy Retirement Mr Okonkwo' })));
});

test('the inscription font size stays within readable bounds', () => {
  const size = (s) => Number(s.match(/font-size="([\d.]+)"/)?.[1]);
  assert.ok(size(cakeSVG({ ...SPEC, inscription: 'A' })) <= 22);
  assert.ok(size(cakeSVG({ ...SPEC, inscription: 'x'.repeat(60) })) >= 9);
});

test('the inscription colour flips for contrast against the icing', () => {
  const dark = cakeSVG({ ...SPEC, icing: '#2a1233', inscription: 'Hello' });
  const light = cakeSVG({ ...SPEC, icing: '#fff6e6', inscription: 'Hello' });
  assert.ok(dark.includes('fill="#ffffff"'), 'white on a dark icing');
  assert.ok(light.includes('fill="#2a1233"'), 'ink on a pale icing');
});

/* ---------------------------------------------------------------------------
   Accessibility
   --------------------------------------------------------------------------- */

test('the drawing carries its configuration as an accessible label', () => {
  const svg = cakeSVG(
    specFrom(PRODUCT, { tiers: '2', sponge: 'funfetti', filling: 'jam', icing: 'cocoa', finish: 'smooth', topper: 'figure' },
      GROUPS, 'Well done')
  );
  const label = svg.match(/aria-label="([^"]*)"/)[1];
  assert.match(label, /Two-tier cake/);
  assert.match(label, /funfetti sponge/);
  assert.match(label, /chocolate icing/);
  assert.match(label, /fondant figure on top/);
  assert.match(label, /Well done/);
  assert.match(svg, /role="img"/);
});

test('a topper of nothing is not announced', () => {
  const label = describeCake({ tiers: 1, topper: 'none', topperName: 'Nothing' });
  assert.ok(!label.includes('nothing on top'));
});

/* ---------------------------------------------------------------------------
   The data mapping
   --------------------------------------------------------------------------- */

test('specFrom reads colours and draw modes out of the catalogue', () => {
  const spec = specFrom(PRODUCT,
    { tiers: '3', sponge: 'funfetti', filling: 'jam', icing: 'cocoa', finish: 'naked', topper: 'figure' },
    GROUPS, 'Hi');
  assert.equal(spec.tiers, 3);
  assert.equal(spec.sponge, '#fbeed0');
  assert.equal(spec.speckled, true);
  assert.equal(spec.icing, '#7a4a2b');
  assert.equal(spec.finish, 'naked');
  assert.equal(spec.topper, 'figure');
  assert.equal(spec.inscription, 'Hi');
});

test('specFrom falls back to the first option rather than drawing nothing', () => {
  const spec = specFrom(PRODUCT, { sponge: 'no-such-sponge' }, GROUPS, '');
  assert.equal(spec.sponge, '#f7e2a8', 'falls back to vanilla, the first option');
  assert.equal(spec.finish, 'smooth');
});

test('specFrom survives a product with none of the drawable groups', () => {
  const spec = specFrom({ options: [], defaults: {} }, {}, {}, '');
  assert.equal(spec.tiers, 1);
  assert.ok(cakeSVG(spec).startsWith('<svg'));
});

/* ---------------------------------------------------------------------------
   The tier chooser icon
   --------------------------------------------------------------------------- */

test('the tier icon draws one shape per tier', () => {
  for (const n of [1, 2, 3]) {
    assert.equal((tierIcon(n).match(/<rect/g) ?? []).length, n);
  }
});

test('the tier icon is hidden from assistive technology', () => {
  // It sits next to a text label that already says "Two tiers", so announcing
  // it again would be noise.
  assert.match(tierIcon(2), /aria-hidden="true"/);
});
