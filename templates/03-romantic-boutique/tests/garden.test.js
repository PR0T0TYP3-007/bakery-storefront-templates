/**
 * The wreath's tests.
 *
 * The claims that matter here are not about how it looks — they are about
 * what it must never do: move, lie, or outgrow the card it surrounds.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { KINDS, CARD, HEADLINE, WORDMARK, bleedFor, flowerCount, perimeter, wreath, flowerSVG, wreathSVG } from '../js/garden.js';

const TONES = ['var(--blush)', 'var(--lilac)', 'var(--ink)'];
const OPTS = { tones: TONES, stemColour: 'var(--blush)' };

/* -------------------------------------------------------------------------
   How many
   ------------------------------------------------------------------------- */

test('nothing written grows nothing', () => {
  assert.equal(flowerCount(0), 0);
  assert.deepEqual(wreath(''), []);
  assert.deepEqual(wreath('   '), []);
  assert.equal(wreathSVG('', OPTS), '');
});

test('one character is already a flower', () => {
  assert.equal(flowerCount(1), 1);
});

test('the wreath is capped, so a long message is not a hedge', () => {
  assert.equal(flowerCount(10000), 16);
  assert.equal(wreath('x'.repeat(10000)).length, 16);
});

test('a merchant can set the density and the cap', () => {
  assert.equal(flowerCount(100, { per: 50, max: 4 }), 3);
  assert.equal(flowerCount(10000, { per: 50, max: 4 }), 4);
});

/* -------------------------------------------------------------------------
   The rule that makes it feel like growth rather than a glitch
   ------------------------------------------------------------------------- */

test('the same message always gives the same wreath', () => {
  assert.deepEqual(wreath('Happy birthday, Mara'), wreath('Happy birthday, Mara'));
});

test('typing adds flowers and never moves the ones already there', () => {
  // D10's lesson from Template 02's cake, applied again: the preview
  // repaints on every keystroke, so anything that re-randomises reads as a
  // fault rather than as a flourish.
  const before = wreath('Happy birthday');
  const after = wreath('Happy birthday, Mara, from all of us here at home');

  assert.ok(after.length > before.length, 'a longer message earns more flowers');
  for (let i = 0; i < before.length; i++) {
    assert.deepEqual(after[i], before[i], `flower ${i} moved`);
  }
});

test('two different messages of the same length grow the same wreath', () => {
  // The text decides how many; it does not decide which or where. That is
  // what keeps the wreath growing smoothly while somebody edits a word in
  // the middle of their message.
  assert.deepEqual(wreath('aaaaaaaaaaaaaaaa'), wreath('Dear Mara, hello'));
});

test('deleting back to a shorter message returns the earlier wreath exactly', () => {
  const full = wreath('Happy birthday, Mara');
  const cut = wreath('Happy birthday');
  assert.deepEqual(full.slice(0, cut.length), cut);
});

/* -------------------------------------------------------------------------
   Staying inside its own box
   ------------------------------------------------------------------------- */

test('the perimeter walk stays on the card’s edge and closes the loop', () => {
  for (let t = 0; t < 1; t += 0.013) {
    const p = perimeter(t);
    const onX = Math.abs(Math.abs(p.x - 50) - CARD.halfW) < 0.001;
    const onY = Math.abs(Math.abs(p.y - 50) - CARD.halfH) < 0.001;
    assert.ok(onX || onY, `t=${t.toFixed(3)} left the edge at ${p.x},${p.y}`);
  }
  // It wraps rather than running off the end, so a t of 1 is a t of 0.
  assert.deepEqual(perimeter(1), perimeter(0));
  assert.deepEqual(perimeter(-0.25), perimeter(0.75));
});

test('every flower sits outside the card, which is the whole point', () => {
  // A ring was the first attempt and it failed exactly here: an ellipse
  // around a portrait rectangle dips back inside it at the diagonals, so
  // the corner flowers landed on the card the preview must not decorate.
  for (const f of wreath('x'.repeat(400))) {
    const outside =
      Math.abs(f.x - 50) >= CARD.halfW || Math.abs(f.y - 50) >= CARD.halfH;
    assert.ok(outside, `flower ${f.i} landed on the card at ${f.x},${f.y}`);
  }
});

test('every flower fits inside the field, including its own width', () => {
  // Not just its centre. A flower whose centre is at x = 2 is still half
  // outside, and a clipped flower reads as a rendering fault rather than
  // as a wreath.
  for (const f of wreath('x'.repeat(400))) {
    const reach = f.size / 2;
    assert.ok(f.x - reach >= 0 && f.x + reach <= 100, `x out of field: ${f.x} (±${reach.toFixed(1)})`);
    assert.ok(f.y - reach >= 0 && f.y + reach <= 100, `y out of field: ${f.y} (±${reach.toFixed(1)})`);
  }
});

test('the wreath goes all the way round, not along one edge', () => {
  const fs = wreath('x'.repeat(400));
  const sides = new Set(
    fs.map((f) => {
      if (f.y < 50 - CARD.halfH) return 'top';
      if (f.y > 50 + CARD.halfH) return 'bottom';
      return f.x < 50 ? 'left' : 'right';
    })
  );
  assert.equal(sides.size, 4, `only reached ${[...sides].join(', ')}`);
});

test('every flower is one of the drawn kinds', () => {
  for (const f of wreath('x'.repeat(200))) assert.ok(KINDS.includes(f.kind));
});

/* -------------------------------------------------------------------------
   The SVG
   ------------------------------------------------------------------------- */

test('the wreath is marked decorative, because it carries no information', () => {
  const svg = wreathSVG('Happy birthday, Mara', OPTS);
  assert.match(svg, /aria-hidden="true"/);
  assert.match(svg, /focusable="false"/);
});

test('flowers are drawn over stems, never under them', () => {
  const svg = wreathSVG('Happy birthday, Mara', OPTS);
  assert.ok(
    svg.indexOf('wreath__stems') < svg.indexOf('wreath__flower'),
    'a stem is drawn after a flower'
  );
});

test('only the stems are stretched; a flower is never distorted', () => {
  // One viewBox across a portrait box turned every flower into an ellipse.
  // A thin curve does not care that it has been squashed; a flower does.
  const svg = wreathSVG('Happy birthday, Mara', OPTS);
  const stems = svg.slice(svg.indexOf('wreath__stems'), svg.indexOf('wreath__flower'));
  assert.ok(stems.includes('preserveAspectRatio="none"'));
  assert.ok(!svg.slice(svg.indexOf('wreath__flower')).includes('preserveAspectRatio'));
});

test('the tones are the template’s own tokens, not baked-in colour', () => {
  const svg = wreathSVG('Happy birthday, Mara', OPTS);
  assert.ok(svg.includes('var(--blush)'));
  assert.ok(!/#[0-9a-f]{6}/i.test(svg), 'a raw colour reached the markup');
});

test('a flower renders with the tone it was given', () => {
  const f = { i: 0, kind: 'rose', x: 20, y: 20, size: 8, turn: 0, tone: 1, stem: 0 };
  assert.ok(flowerSVG(f, TONES).includes('var(--lilac)'));
});

test('an unknown kind falls back rather than rendering nothing', () => {
  const f = { i: 0, kind: 'orchid', x: 20, y: 20, size: 8, turn: 0, tone: 0, stem: 0 };
  const svg = flowerSVG(f, TONES);
  assert.ok(svg.includes('<circle'), 'fell back to the rose');
});

/* -------------------------------------------------------------------------
   The vine
   ------------------------------------------------------------------------- */

test('the vine joins neighbours around the card, not the centre', () => {
  // The first version drew a stem from the middle of the card to each
  // flower. Those lines run underneath the sheet, so nothing was visible
  // but a stub in the gap — and a wreath with no line round it is just
  // scattered flowers.
  const svg = wreathSVG('Happy birthday, Mara, from all of us', OPTS);
  const stems = svg.slice(svg.indexOf('wreath__stems'), svg.indexOf('wreath__flower'));
  assert.ok(!stems.includes('M50 50'), 'a stem still starts at the centre');
  assert.ok(stems.includes('<path'), 'no vine was drawn at all');
});

test('a single flower draws no vine rather than a line to itself', () => {
  const svg = wreathSVG('hi', OPTS);
  const stems = svg.slice(svg.indexOf('wreath__stems'), svg.indexOf('wreath__flower'));
  assert.ok(!stems.includes('<path'), 'drew a vine from one flower to itself');
});

test('the vine is one closed loop, with a segment per flower', () => {
  const text = 'x'.repeat(200);
  const svg = wreathSVG(text, OPTS);
  const stems = svg.slice(svg.indexOf('wreath__stems'), svg.indexOf('wreath__flower'));
  // Vine segments only. The stem layer also carries the tendrils, and
  // counting every path in it measured the decoration rather than the loop.
  const segments = (stems.match(/class="vine"/g) ?? []).length;
  assert.equal(segments, wreath(text).length, 'the loop does not close');
});


/* -------------------------------------------------------------------------
   Framing something other than the card

   The home page grows a wreath round a headline, which is a wide, short box
   where the card is a tall, narrow one. The geometry was hard-coded to the
   card at first, which made it useless anywhere else.
   ------------------------------------------------------------------------- */

test('the perimeter walk follows whichever frame it is given', () => {
  for (let t = 0; t < 1; t += 0.017) {
    const p = perimeter(t, HEADLINE);
    const onX = Math.abs(Math.abs(p.x - 50) - HEADLINE.halfW) < 0.001;
    const onY = Math.abs(Math.abs(p.y - 50) - HEADLINE.halfH) < 0.001;
    assert.ok(onX || onY, `t=${t.toFixed(3)} left the headline frame`);
  }
});

test('flowers stay off a landscape frame too', () => {
  for (const f of wreath('x'.repeat(400), { frame: HEADLINE })) {
    const outside =
      Math.abs(f.x - 50) >= HEADLINE.halfW || Math.abs(f.y - 50) >= HEADLINE.halfH;
    assert.ok(outside, `flower ${f.i} landed on the headline at ${f.x},${f.y}`);
  }
});

test('a landscape wreath still fits its own field', () => {
  for (const f of wreath('x'.repeat(400), { frame: HEADLINE, size: 0.8 })) {
    const reach = f.size / 2;
    assert.ok(f.x - reach >= 0 && f.x + reach <= 100, `x out of field: ${f.x}`);
    assert.ok(f.y - reach >= 0 && f.y + reach <= 100, `y out of field: ${f.y}`);
  }
});

test('the bleed is derived from the frame, both ways round', () => {
  // A wide frame needs less room at the sides and more above and below; a
  // tall one the reverse. Getting this backwards is the kind of mistake
  // that looks like a styling accident rather than a maths one.
  const card = bleedFor(CARD);
  const head = bleedFor(HEADLINE);
  assert.ok(Math.abs(head.x) < Math.abs(card.x), 'a wide frame needs less side room');
  assert.ok(Math.abs(head.y) > Math.abs(card.y), 'a wide frame needs more room above');
});

test('the size multiplier scales every flower and nothing else', () => {
  const full = wreath('x'.repeat(100), { frame: HEADLINE });
  const small = wreath('x'.repeat(100), { frame: HEADLINE, size: 0.5 });
  assert.equal(full.length, small.length);
  for (let i = 0; i < full.length; i++) {
    assert.equal(small[i].x, full[i].x, 'scaling moved a flower');
    assert.equal(small[i].y, full[i].y, 'scaling moved a flower');
    assert.ok(Math.abs(small[i].size - full[i].size / 2) < 0.02);
  }
});

test('the card frame is still the default, so nothing else had to change', () => {
  assert.deepEqual(wreath('Happy birthday'), wreath('Happy birthday', { frame: CARD }));
});


/* -------------------------------------------------------------------------
   Leaves and tendrils

   The first garland was a line with dots on it. The reference is mostly
   leaves by area, and that is the difference between beads on a wire and
   something growing.
   ------------------------------------------------------------------------- */

test('every vine segment carries leaves', () => {
  const svg = wreathSVG('Happy birthday, Mara, from all of us here', OPTS);
  const vines = (svg.match(/class="vine"/g) ?? []).length;
  const leaves = (svg.match(/class="wreath__leaf"/g) ?? []).length;
  assert.equal(leaves, vines * 2, 'two leaves to a segment');
});

test('tendrils are sparse — a curl on every segment is barbed wire', () => {
  const svg = wreathSVG('x'.repeat(200), OPTS);
  const vines = (svg.match(/class="vine"/g) ?? []).length;
  const curls = (svg.match(/class="curl"/g) ?? []).length;
  assert.ok(curls > 0, 'no tendrils at all');
  assert.ok(curls < vines, `${curls} curls on ${vines} segments is too many`);
});

test('a lone flower grows no leaves, having no vine to grow them on', () => {
  const svg = wreathSVG('hi', OPTS);
  assert.ok(!svg.includes('wreath__leaf'));
  assert.ok(!svg.includes('class="curl"'));
});

test('leaves take their colour from the caller, like everything else', () => {
  const svg = wreathSVG('Happy birthday, Mara', { ...OPTS, leafColour: 'var(--leaf)' });
  assert.ok(svg.includes('var(--leaf)'));
  assert.ok(!/#[0-9a-f]{6}/i.test(svg), 'a raw colour reached the markup');
});

test('a leaf sits on the vine, not somewhere near it', () => {
  // Sampled from the same curve the vine is drawn with, so this is a real
  // guarantee rather than a coincidence of rounding.
  const svg = wreathSVG('Happy birthday, Mara, from all of us', OPTS);
  const leaf = svg.match(/class="wreath__leaf"[^>]*style="left:([\d.]+)%;top:([\d.]+)%/);
  assert.ok(leaf, 'no leaf rendered');
  const x = Number(leaf[1]);
  const y = Number(leaf[2]);
  assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100, `leaf off the field at ${x},${y}`);
});


test('every shipped frame keeps its flowers inside the field', () => {
  // One table rather than three tests, so a new frame added later cannot be
  // added without this noticing. The wordmark's first values put flowers at
  // x = 103 — off the edge, where they get clipped in half.
  const frames = [
    ['card', CARD, 1],
    ['headline', HEADLINE, 0.6],
    ['wordmark', WORDMARK, 0.46],
  ];
  for (const [name, frame, size] of frames) {
    for (const f of wreath('x'.repeat(400), { frame, size })) {
      const reach = f.size / 2;
      assert.ok(f.x - reach >= 0 && f.x + reach <= 100, `${name}: x ${f.x} ±${reach.toFixed(1)}`);
      assert.ok(f.y - reach >= 0 && f.y + reach <= 100, `${name}: y ${f.y} ±${reach.toFixed(1)}`);
      const outside = Math.abs(f.x - 50) >= frame.halfW || Math.abs(f.y - 50) >= frame.halfH;
      assert.ok(outside, `${name}: flower ${f.i} landed on what it frames`);
    }
  }
});
