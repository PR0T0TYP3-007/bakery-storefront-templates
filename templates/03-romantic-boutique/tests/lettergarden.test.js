/**
 * The letter garden's tests.
 *
 * Rebuilt from Type Garden, so most of what matters here is whether the
 * properties that make it work are actually true: that stems weave through
 * the type rather than over it, that the same word always grows the same
 * plant, that a long headline cannot grow an unbounded one, and that the
 * drawing never leaks a raw colour.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  rng,
  seedFrom,
  vine,
  curl,
  at,
  weave,
  layerAt,
  wordParams,
  growLetter,
  plant,
  pathData,
  slice,
  polyLength,
  leafPath,
  rosePaths,
  layerSVG,
  lastOrder,
  ROSE_PETALS,
} from '../js/lettergarden.js';

const COLOURS = {
  stem: 'var(--leaf)',
  flower: 'var(--blush)',
  line: 'var(--ground)',
  vein: 'var(--ground)',
};

/** A measured line, as the DOM component would hand it over. */
const line = (text, S = 40) =>
  [...text].map((ch, i) => ({ ch, cx: i * S * 0.6 + S * 0.3, baseline: S, w: S * 0.6 }));

/* -------------------------------------------------------------------------
   Noise
   ------------------------------------------------------------------------- */

test('the same seed gives the same sequence', () => {
  const a = Array.from({ length: 8 }, rng(42));
  const b = Array.from({ length: 8 }, rng(42));
  assert.deepEqual(a, b);
});

test('different seeds give different sequences', () => {
  assert.notDeepEqual(Array.from({ length: 8 }, rng(1)), Array.from({ length: 8 }, rng(2)));
});

test('the sequence stays inside zero and one', () => {
  const r = rng(9);
  for (let i = 0; i < 500; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});

test('a string seeds deterministically', () => {
  assert.equal(seedFrom('Postscript'), seedFrom('Postscript'));
  assert.notEqual(seedFrom('Postscript'), seedFrom('postscript'));
});

/* -------------------------------------------------------------------------
   Curves
   ------------------------------------------------------------------------- */

test('a stem starts where it was planted and has the steps asked for', () => {
  const p = vine([1, 2], -Math.PI / 2, 1, 0.3, 2, 0, 0, 20);
  assert.deepEqual(p[0], [1, 2]);
  assert.equal(p.length, 21);
});

test('a stem pointed up ends up', () => {
  const p = vine([0, 0], -Math.PI / 2, 1, 0, 1, 0, 0, 20);
  assert.ok(p[p.length - 1][1] < -0.9, 'did not travel upward');
});

test('a curl adds a spiral to the end and leaves the stem alone', () => {
  const p = vine([0, 0], 0, 1, 0, 1, 0, 0, 10);
  const c = curl(p, 1, 0.1);
  assert.equal(c.length, p.length + 14);
  assert.deepEqual(c.slice(0, p.length), p);
});

test('a point along a stem comes with the direction it is heading', () => {
  const p = vine([0, 0], 0, 1, 0, 1, 0, 0, 20);
  const [, a] = at(p, 0.5);
  assert.ok(Math.abs(a) < 0.001, `heading was ${a}`);
});

/* -------------------------------------------------------------------------
   The weave — the whole trick
   ------------------------------------------------------------------------- */

test('a stem is cut into runs that cover it end to end', () => {
  for (let s = 1; s < 40; s++) {
    const segs = weave(rng(s), 0);
    assert.equal(segs[0].u0, 0, 'does not start at the root');
    assert.equal(segs[segs.length - 1].u1, 1, 'does not reach the tip');
    for (let i = 1; i < segs.length; i++) {
      assert.ok(segs[i].u0 >= segs[i - 1].u1, 'runs overlap');
    }
  }
});

test('consecutive runs alternate between behind and in front', () => {
  // This is what makes a stem look like it grew *through* the word rather
  // than over it. If the layers ever stopped alternating the plant would
  // flatten onto one side of the type and the effect would be gone.
  for (let s = 1; s < 40; s++) {
    const segs = weave(rng(s), 0);
    for (let i = 1; i < segs.length; i++) {
      assert.notEqual(segs[i].layer, segs[i - 1].layer, `seed ${s} repeated a layer`);
    }
  }
});

test('a stem can start on either side', () => {
  assert.equal(weave(rng(5), 0)[0].layer, 0);
  assert.equal(weave(rng(5), 1)[0].layer, 1);
});

test('the layer at any point on the stem is one of the two', () => {
  const segs = weave(rng(11), 0);
  for (let u = 0; u <= 1; u += 0.05) assert.ok([0, 1].includes(layerAt(segs, u)));
});

/* -------------------------------------------------------------------------
   Growing
   ------------------------------------------------------------------------- */

test('a letter grows at least one stem and something on the end of it', () => {
  const els = growLetter({ ch: 'P', em: 0.6, prevEm: null, index: 0 }, rng(3), wordParams(rng(3)));
  assert.ok(els.some((e) => e.t === 'stem'), 'no stem');
  assert.ok(els.some((e) => e.t === 'rose' || e.t === 'leaf'), 'nothing grew on it');
});

test('the first letter of a word always gets a rose', () => {
  // The original does this and it is why a word reads as a plant rather
  // than as scattered growth: the head of the word is always flowered.
  for (let s = 1; s < 25; s++) {
    const els = growLetter({ ch: 'A', em: 0.6, prevEm: null, index: 0 }, rng(s), wordParams(rng(s)));
    assert.ok(els.some((e) => e.t === 'rose'), `seed ${s} grew no rose on the first letter`);
  }
});

test('only a letter with one before it can bridge back to it', () => {
  // A bridge is drawn to the left towards the previous glyph; on the first
  // letter of a word there is nothing there, and one would hang in space.
  for (let s = 1; s < 25; s++) {
    const els = growLetter({ ch: 'A', em: 0.6, prevEm: null, index: 0 }, rng(s), wordParams(rng(s)));
    for (const e of els) {
      if (e.t !== 'stem') continue;
      const far = e.pts.some((p) => p[0] < -1.2);
      assert.ok(!far, `seed ${s} reached toward a letter that is not there`);
    }
  }
});

test('density changes how much grows, not where the letter is', () => {
  const thin = growLetter({ ch: 'A', em: 0.6, prevEm: 0.6, index: 1 }, rng(8), wordParams(rng(8), 0.3));
  const thick = growLetter({ ch: 'A', em: 0.6, prevEm: 0.6, index: 1 }, rng(8), wordParams(rng(8), 1.6));
  assert.ok(thick.length >= thin.length, 'more density grew less');
});

test('bloom scales the flowers and leaves the stems alone', () => {
  const small = growLetter({ ch: 'A', em: 0.6, prevEm: null, index: 0 }, rng(4), wordParams(rng(4), 1, 0.5));
  const big = growLetter({ ch: 'A', em: 0.6, prevEm: null, index: 0 }, rng(4), wordParams(rng(4), 1, 1.5));
  const r1 = small.find((e) => e.t === 'rose');
  const r2 = big.find((e) => e.t === 'rose');
  assert.ok(r1 && r2);
  assert.ok(r2.R > r1.R * 2, 'bloom did not scale the flower');
  const s1 = small.find((e) => e.t === 'stem');
  const s2 = big.find((e) => e.t === 'stem');
  assert.deepEqual(s1.pts, s2.pts, 'bloom moved a stem');
});

/* -------------------------------------------------------------------------
   Planting a measured line
   ------------------------------------------------------------------------- */

test('the same word always grows the same plant', () => {
  // A shop's own name may not be a different drawing on every page load.
  const a = plant(line('Postscript'), { S: 40, seed: 'Postscript' });
  const b = plant(line('Postscript'), { S: 40, seed: 'Postscript' });
  assert.deepEqual(a, b);
});

test('a different word grows a different plant', () => {
  const a = plant(line('Postscript'), { S: 40, seed: 'Postscript' });
  const b = plant(line('Dear Mara'), { S: 40, seed: 'Dear Mara' });
  assert.notDeepEqual(a.front, b.front);
});

test('spaces grow nothing, and start the next word over', () => {
  const two = plant(line('ab cd'), { S: 40, seed: 1 });
  const all = [...two.behind, ...two.front];
  // Two words means two first-letters, and a first letter always roses.
  const firsts = new Set(all.filter((e) => e.t === 'rose').map((e) => e.letter));
  assert.ok(firsts.has(0), 'the first word did not flower');
  assert.ok(firsts.has(3), 'the second word did not flower');
});

test('every stem appears in both layers, because its runs are split', () => {
  const { behind, front } = plant(line('Post'), { S: 40, seed: 2 });
  const b = behind.filter((e) => e.t === 'stem').length;
  const f = front.filter((e) => e.t === 'stem').length;
  assert.equal(b, f, 'a stem went to only one layer');
  assert.ok(b > 0);
});

test('a flower is in exactly one layer', () => {
  const { behind, front } = plant(line('Post'), { S: 40, seed: 2 });
  const ids = (a) => a.filter((e) => e.t === 'rose').map((e) => e.id);
  const overlap = ids(behind).filter((id) => ids(front).includes(id));
  assert.deepEqual(overlap, []);
});

test('the garden is anchored to the letters it was measured from', () => {
  const S = 40;
  const letters = line('Post', S);
  const { behind, front } = plant(letters, { S, seed: 3 });
  const roses = [...behind, ...front].filter((e) => e.t === 'rose');
  assert.ok(roses.length);
  for (const r of roses) {
    const l = letters[r.letter];
    // Within a couple of em of its own letter, never off in the margin.
    assert.ok(Math.abs(r.x - l.cx) < S * 2.5, `rose ${r.id} drifted to ${r.x}`);
    assert.ok(Math.abs(r.y - l.baseline) < S * 2.5, `rose ${r.id} drifted to ${r.y}`);
  }
});

test('a long headline cannot grow an unbounded garden', () => {
  // Linear in the text, so a merchant with a long line would otherwise get
  // a thousand SVG nodes in their hero without ever being told.
  const long = plant(line('x'.repeat(300)), { S: 40, seed: 1, maxElements: 60 });
  const total = long.behind.length + long.front.length;
  assert.ok(total < 200, `grew ${total} elements past a budget of 60`);
});

test('the budget thins the end of a line rather than refusing to draw it', () => {
  const out = plant(line('x'.repeat(80)), { S: 40, seed: 1, maxElements: 30 });
  const all = [...out.behind, ...out.front];
  assert.ok(all.length > 0, 'drew nothing at all');
  const last = Math.max(...all.map((e) => e.letter));
  assert.ok(last < 60, 'the budget was never reached');
});

/* -------------------------------------------------------------------------
   Drawing
   ------------------------------------------------------------------------- */

test('a path is smoothed through the points, not joined with corners', () => {
  const d = pathData([[0, 0], [10, 0], [10, 10]], false);
  assert.ok(d.startsWith('M'), d);
  assert.ok(d.includes('Q'), 'no curve in the path');
});

test('a closed path closes', () => {
  assert.ok(pathData([[0, 0], [5, 0], [5, 5]], true).endsWith('Z'));
});

test('a path of fewer than two points draws nothing', () => {
  assert.equal(pathData([[0, 0]], false), '');
  assert.equal(pathData([], true), '');
});

test('slicing a stem keeps the ends where they were asked for', () => {
  const pts = [[0, 0], [10, 0], [20, 0], [30, 0]];
  const s = slice(pts, 0, 1);
  assert.deepEqual(s[0], [0, 0]);
  assert.deepEqual(s[s.length - 1], [30, 0]);
});

test('a stem has a length, so it can draw itself on', () => {
  assert.equal(polyLength([[0, 0], [3, 4]]), 5);
  assert.equal(polyLength([[0, 0]]), 0);
});

test('a leaf has an outline and a vein', () => {
  const { outline, vein } = leafPath({ x: 0, y: 0, a: 0, L: 20, bend: 0.5 });
  assert.ok(outline.endsWith('Z'), 'the outline is not closed');
  assert.ok(vein.includes('Q'), 'the vein is not drawn');
});

test('a rose is six petals and a spiral', () => {
  const { petals, spiral } = rosePaths({ x: 0, y: 0, R: 20, rot: 0, ph1: 1, ph2: 2, turns: 2 });
  assert.equal(petals.length, ROSE_PETALS.length);
  for (const d of petals) assert.ok(d.endsWith('Z'));
  assert.ok(spiral.includes('Q'), 'no spiral — the thing that makes it a rose');
});

test('the petal wobble is what stops six ellipses reading as six ellipses', () => {
  const flat = rosePaths({ x: 0, y: 0, R: 20, rot: 0, ph1: 0, ph2: 0, turns: 2 });
  const wobbly = rosePaths({ x: 0, y: 0, R: 20, rot: 0, ph1: 2.2, ph2: 4.1, turns: 2 });
  assert.notEqual(flat.petals[0], wobbly.petals[0]);
});

test('the markup takes its colours from the caller and bakes in none', () => {
  const { behind, front } = plant(line('Post'), { S: 40, seed: 5 });
  const svg = layerSVG(behind, 0, COLOURS, 40) + layerSVG(front, 1, COLOURS, 40);
  assert.ok(svg.includes('var(--leaf)'));
  assert.ok(svg.includes('var(--blush)'));
  assert.ok(!/#[0-9a-f]{3,6}\b/i.test(svg), 'a raw colour reached the markup');
});

test('a layer draws only its own side of the type', () => {
  const { behind } = plant(line('Post'), { S: 40, seed: 5 });
  // Roses sorted into the front layer must not appear in the back one's markup.
  const svg = layerSVG(behind, 0, COLOURS, 40);
  const drawn = (svg.match(/class="lg-rose"/g) ?? []).length;
  const expected = behind.filter((e) => e.t === 'rose' && e.layer === 0).length;
  assert.equal(drawn, expected);
});

test('every stem run carries its own length for the draw-on', () => {
  const { behind } = plant(line('Post'), { S: 40, seed: 5 });
  const svg = layerSVG(behind, 0, COLOURS, 40);
  const stems = (svg.match(/class="lg-stem"/g) ?? []).length;
  const lens = (svg.match(/--len:/g) ?? []).length;
  assert.equal(stems, lens, 'a stem would snap instead of drawing on');
});

test('the growth order is reported, so what follows can be timed to it', () => {
  const { front } = plant(line('Postscript'), { S: 40, seed: 7 });
  assert.ok(lastOrder(front) > 0);
  assert.equal(lastOrder([]), 0);
});

test('a word break can arrive as a flag instead of a space entry', () => {
  // The DOM component stopped wrapping whitespace in spans — doing so broke
  // line wrapping on a phone — so it marks the first letter of each word.
  // Both shapes have to start a new word here, or the second word of a
  // headline grows as a continuation of the first.
  const S = 40;
  const spaced = plant(line('ab cd', S), { S, seed: 1 });
  const flagged = plant(
    [...'abcd'].map((ch, i) => ({
      ch,
      cx: i * S * 0.6 + S * 0.3,
      baseline: S,
      w: S * 0.6,
      startsWord: i === 0 || i === 2,
    })),
    { S, seed: 1 }
  );
  const firsts = (g) =>
    new Set([...g.behind, ...g.front].filter((e) => e.t === 'rose').map((e) => e.letter));
  // Two words, so two flowered heads either way.
  assert.equal(firsts(spaced).size >= 2, true);
  assert.equal(firsts(flagged).size >= 2, true);
});
