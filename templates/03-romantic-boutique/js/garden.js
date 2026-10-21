/**
 * @file The wreath. Pure, DOM-free, tested.
 *
 * The idea is borrowed from Type Garden (type-garden.vercel.app, by Akshat
 * Agarwal), which grows flowers as you type. The implementation is not —
 * this is written from the behaviour, not from their source, and it makes
 * three decisions theirs does not.
 *
 * **It grows around the card, never on it.** The card preview is the one
 * component in this template whose entire job is to show, exactly, what the
 * recipient will receive. Flowers drawn *on* the sheet would make the
 * customer think the shop prints flowers on the card, and the preview would
 * be lying in the one place it cannot afford to. So the sheet is untouched
 * and the margin around it blooms: a wreath, which is what a romantic
 * boutique would put round a card anyway.
 *
 * **It walks the card's perimeter rather than a circle.** A ring looks like
 * the obvious answer and is wrong: an ellipse drawn around a portrait
 * rectangle dips back inside it at the four diagonals, so corner flowers
 * land on the card. Walking the rectangle's own edge is the only placement
 * that is outside it everywhere, which is the whole point.
 *
 * **It is deterministic.** D10 settled this for Template 02's cake: the
 * preview repaints on every keystroke, and with random placement the
 * flowers would re-scatter on each letter typed, which reads as a glitch
 * rather than as a flourish. Flower *n* is always the same flower in the
 * same place, so typing adds to the wreath and never redraws it.
 *
 * Returning plain data rather than DOM keeps it testable under `node --test`
 * with no DOM, no jsdom and no transpiler — the same reason Template 02's
 * cake renderer returns a string.
 */

/** FNV-1a. The project's hash everywhere a stable pseudo-random is needed. */
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** A stable number in [0,1) for a given seed and salt. */
const rand = (seed, salt) => (hash(`${seed}:${salt}`) % 100000) / 100000;

export const KINDS = ['rose', 'aster', 'bell'];

/**
 * How much of the wreath's box the thing being framed occupies, as
 * half-extents in percent.
 *
 * A frame, not "the card": the home page grows one of these round a
 * headline, which is a wide, short box where the card is a tall, narrow
 * one. Hard-coding the card's proportions made the first version useless
 * anywhere else, and a wreath built for a portrait rectangle hangs off a
 * landscape one in a way that looks like a bug.
 */
export const CARD = { halfW: 34, halfH: 35 };
/* 38, not 40: at 40 the right-hand flowers reached x = 95.9 and their own
   width took them past the field edge, where they get clipped. The frame
   has to leave room for the push *and* the flower on top of it. */
export const HEADLINE = { halfW: 38, halfH: 28 };

/* The wordmark. Tighter than the headline's on both axes, because the thing
   being framed is one short line: a loose frame leaves long bare runs of
   vine down the sides with nothing growing on them, which reads as wire
   rather than as a garland. */
export const WORDMARK = { halfW: 40, halfH: 38 };

/**
 * How far a wreath's box must bleed past what it frames, as a CSS inset.
 *
 * Derived rather than written down beside it in the stylesheet, because the
 * two have to agree exactly: if the box is not the size the geometry
 * assumes, every flower lands in the wrong place and nothing in the tests
 * can see it. The style guide prints these and checks the CSS against them.
 *
 * @param {{halfW:number, halfH:number}} frame
 */
export function bleedFor(frame) {
  return {
    x: Number((-((100 / (frame.halfW * 2) - 1) / 2) * 100).toFixed(2)),
    y: Number((-((100 / (frame.halfH * 2) - 1) / 2) * 100).toFixed(2)),
  };
}

export const BLEED = bleedFor(CARD);

/**
 * How many flowers a message has earned.
 *
 * One per eight characters, because one per character turns a sentence into
 * a hedge — the original does that, and at fifteen words the flowers win
 * and the words lose. The cap is where a wreath stops being a wreath.
 *
 * @param {number} length
 * @param {{per?:number, max?:number}} [opts]
 */
export function flowerCount(length, { per = 8, max = 16 } = {}) {
  if (length <= 0) return 0;
  return Math.max(1, Math.min(max, Math.floor(length / per) + 1));
}

/**
 * A point on the frame's perimeter, as a fraction `t` of the way round.
 *
 * Starts at the top-left corner and walks clockwise. Returns the point and
 * the outward normal, so a flower can be pushed clear of the edge rather
 * than sitting on it.
 *
 * @param {number} t  0..1
 * @param {{halfW:number, halfH:number}} [frame]
 * @returns {{x:number, y:number, nx:number, ny:number}}
 */
export function perimeter(t, frame = CARD) {
  const { halfW: a, halfH: b } = frame;
  const sides = [2 * a, 2 * b, 2 * a, 2 * b];
  const total = sides.reduce((s, n) => s + n, 0);

  let d = ((((t % 1) + 1) % 1)) * total;

  if (d < sides[0]) return { x: 50 - a + d, y: 50 - b, nx: 0, ny: -1 };
  d -= sides[0];
  if (d < sides[1]) return { x: 50 + a, y: 50 - b + d, nx: 1, ny: 0 };
  d -= sides[1];
  if (d < sides[2]) return { x: 50 + a - d, y: 50 + b, nx: 0, ny: 1 };
  d -= sides[2];
  return { x: 50 - a, y: 50 + b - d, nx: -1, ny: 0 };
}

/**
 * The wreath for a message.
 *
 * Positions are percentages of the wreath's box, so the caller decides how
 * big the thing is and this never needs to know.
 *
 * @param {string} text
 * @param {{per?:number, max?:number, frame?:object, size?:number}} [opts]
 * @returns {Array<{i:number, kind:string, x:number, y:number, size:number,
 *                  turn:number, tone:number, stem:number}>}
 */
export function wreath(text, opts = {}) {
  const { frame = CARD, size = 1 } = opts;
  const body = String(text ?? '').trim();
  const n = flowerCount(body.length, opts);
  if (!n) return [];

  const out = [];
  for (let i = 0; i < n; i++) {
    /* The golden ratio, so flower n always lands at the same place however
       many others are on the wreath. That is what makes typing *add* a
       flower rather than rearrange all of them. */
    const t = (i * 0.6180339887) % 1;
    const at = perimeter(t, frame);

    /* Pushed outward off the edge, by a distance seeded from the flower's
       index alone — deliberately not from the text — so the wreath grows
       rather than reshuffling while the message is edited. The text only
       ever decides how many. */
    const push = 2 + rand('o', i) * 4;

    out.push({
      i,
      t,
      kind: KINDS[hash(`k${i}`) % KINDS.length],
      x: Number((at.x + at.nx * push).toFixed(2)),
      y: Number((at.y + at.ny * push).toFixed(2)),
      size: Number(((8.5 + rand('s', i) * 5.5) * size).toFixed(2)),
      turn: Math.round(rand('t', i) * 360),
      tone: hash(`c${i}`) % 3,
      stem: Math.round(rand('l', i) * 100),
    });
  }
  return out;
}

/**
 * One flower, as a self-contained square SVG positioned in percentages.
 *
 * Square and self-contained on purpose: the wreath's box is portrait, and a
 * single stretched viewBox across it turned every flower into an ellipse.
 * Each flower gets its own square, so it is round wherever it lands.
 *
 * Three shapes, drawn rather than imported: a rose of nested discs, an aster
 * of thin radiating petals, a bell of three hanging teardrops. Deliberately
 * simple — at the size a wreath flower renders, detail is wasted and bytes
 * are not.
 *
 * @param {object} f  a flower from `wreath()`
 * @param {string[]} tones  CSS colour values, indexed by `f.tone`
 */
export function flowerSVG(f, tones) {
  const fill = tones[f.tone % tones.length];

  const shapes = {
    rose: `<path d="${lobed(7, 4.7, 3.4)}" opacity="0.92"/>${spiral(0.6, 3.3, 2.4)}<circle r="0.9" opacity="0.5"/>`,
    aster:
      `<path d="${lobed(12, 5, 1.9)}" opacity="0.85"/>` +
      '<circle r="1.5" opacity="0.55"/><circle r="0.7"/>',
    bell:
      '<path d="M0 -4.4 q3.1 3 0 7.4 q-3.1 -4.4 0 -7.4Z" opacity="0.9"/>' +
      '<path d="M-3.4 -2.2 q2.5 2.6 0 5.8 q-2.5 -3.2 0 -5.8Z" opacity="0.62"/>' +
      '<path d="M3.4 -2.2 q2.5 2.6 0 5.8 q-2.5 -3.2 0 -5.8Z" opacity="0.62"/>' +
      '<circle cy="-4.2" r="0.6" opacity="0.7"/>',
  };

  /* `--i` is the flower's place in the order it was earned. The card page
     ignores it — each flower appears as it is typed — but the home page
     uses it to bring them up one after another, in step with the headline
     writing itself out. */
  return `<svg class="wreath__flower" viewBox="-6 -6 12 12" aria-hidden="true" focusable="false"
      style="left:${f.x}%;top:${f.y}%;width:${f.size}%;--i:${f.i}">
      <g transform="rotate(${f.turn})" fill="${fill}">${shapes[f.kind] ?? shapes.rose}</g>
    </svg>`;
}

/**
 * A lobed outline — the shape a bloom actually has.
 *
 * The first version drew flowers as two or three concentric discs, which at
 * any size above a few pixels reads as a target rather than a flower. Petals
 * are what the eye is looking for, so the outline alternates between an
 * outer and an inner radius and curves between them.
 *
 * @param {number} lobes @param {number} outer @param {number} inner
 */
function lobed(lobes, outer, inner) {
  const pts = [];
  for (let i = 0; i < lobes * 2; i++) {
    const a = (i / (lobes * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? inner : outer;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  const at = (i) => pts[(i + pts.length) % pts.length];
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const f = (n) => Number(n.toFixed(2));

  // Quadratic through the alternating points, with each point as a control
  // and the midpoints as anchors — a cheap smooth closed curve.
  let d = `M${f(mid(at(0), at(1))[0])} ${f(mid(at(0), at(1))[1])}`;
  for (let i = 1; i <= pts.length; i++) {
    const c = at(i);
    const m = mid(at(i), at(i + 1));
    d += ` Q${f(c[0])} ${f(c[1])} ${f(m[0])} ${f(m[1])}`;
  }
  return `${d}Z`;
}

/**
 * The spiral inside a rose, drawn in the ground colour so it reads as a
 * line cut into the bloom rather than as another colour laid on it. This is
 * the detail that makes the reference's peonies look drawn by hand.
 */
function spiral(from, to, turns) {
  const steps = 26;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * turns * Math.PI * 2;
    const r = from + (to - from) * t;
    const x = (r * Math.cos(a)).toFixed(2);
    const y = (r * Math.sin(a)).toFixed(2);
    d += i ? ` L${x} ${y}` : `M${x} ${y}`;
  }
  return `<path d="${d}" fill="none" stroke="var(--ground)" stroke-width="0.55"
    stroke-linecap="round" opacity="0.45"/>`;
}

/**
 * A leaf, pointed, with a midrib.
 *
 * Leaves are what turn a line with dots on it into a vine. The reference is
 * mostly leaves by area, and leaving them out was the main reason our first
 * garland read as beads on a wire.
 */
export function leafSVG(l, colour) {
  return `<svg class="wreath__leaf" viewBox="-6 -6 12 12" aria-hidden="true" focusable="false"
      style="left:${l.x}%;top:${l.y}%;width:${l.size}%;--i:${l.i}">
      <g transform="rotate(${l.turn})">
        <path d="M0 -4.6 Q2.6 -0.6 0 4.6 Q-2.6 -0.6 0 -4.6Z" fill="${colour}" opacity="0.8"/>
        <path d="M0 -3.6 L0 3.6" stroke="var(--ground)" stroke-width="0.35"
          opacity="0.35" fill="none"/>
      </g>
    </svg>`;
}

/**
 * Leaves along the vine, and a curl at the end of some segments.
 *
 * Positions are sampled from the same quadratic the vine is drawn with, so a
 * leaf always sits *on* the line rather than near it.
 *
 * @param {Array} round  flowers in perimeter order
 * @returns {{leaves:Array, curls:string}}
 */
function foliage(round, stemColour) {
  const leaves = [];
  let curls = '';
  if (round.length < 2) return { leaves, curls };

  const f2 = (n) => Number(n.toFixed(2));

  round.forEach((f, n) => {
    const next = round[(n + 1) % round.length];
    const { cx, cy } = bow(f, next);

    // Two leaves per segment, off-centre so they do not look pinned.
    for (const t of [0.3, 0.66]) {
      const u = 1 - t;
      const x = u * u * f.x + 2 * u * t * cx + t * t * next.x;
      const y = u * u * f.y + 2 * u * t * cy + t * t * next.y;
      // The tangent, so the leaf sits along the vine rather than across it.
      const dx = 2 * u * (cx - f.x) + 2 * t * (next.x - cx);
      const dy = 2 * u * (cy - f.y) + 2 * t * (next.y - cy);
      const along = (Math.atan2(dy, dx) * 180) / Math.PI;
      const side = (f.stem + (t > 0.5 ? 1 : 0)) % 2 ? 48 : -48;

      leaves.push({
        i: f.i,
        x: f2(x),
        y: f2(y),
        turn: Math.round(along + 90 + side),
        size: f2(f.size * 0.52),
      });
    }

    // A curl on roughly every third segment. Sparse on purpose: a tendril on
    // every one turns the garland into barbed wire.
    if (f.stem % 3 === 0) {
      const u = 0.5;
      const x = u * u * f.x + 2 * u * u * cx + u * u * next.x;
      const y = u * u * f.y + 2 * u * u * cy + u * u * next.y;
      curls += curl(f2(x), f2(y), f.stem % 2 ? 1 : -1, stemColour);
    }
  });

  return { leaves, curls };
}

/** The control point of a vine segment, bowed away from what it frames. */
function bow(f, next) {
  const mx = (f.x + next.x) / 2;
  const my = (f.y + next.y) / 2;
  const out = 1 + (f.stem % 5) / 2;
  return { cx: mx + (mx - 50) * (out / 10), cy: my + (my - 50) * (out / 10) };
}

/** A tendril: a quarter-turn spiral hanging off the vine. */
function curl(x, y, dir, colour) {
  const steps = 14;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 1.6 * dir;
    const r = 2.6 * (1 - t * 0.78);
    const px = (x + Math.cos(a) * r * 0.6).toFixed(2);
    const py = (y + Math.sin(a) * r * 0.6 + t * 1.6).toFixed(2);
    d += i ? ` L${px} ${py}` : `M${px} ${py}`;
  }
  return `<path class="curl" d="${d}" fill="none" stroke="${colour}" stroke-width="0.4"
    stroke-linecap="round" opacity="0.5"/>`;
}

/**
 * The whole wreath: a stem layer, then the flowers.
 *
 * The stems are one stretched SVG and the flowers are not. A thin curve does
 * not care that it has been squashed by a few percent; a flower does.
 *
 * Everything is `aria-hidden` and `focusable="false"` — decoration with no
 * information in it, and the card's own figcaption already states the
 * message in the interface face.
 *
 * @param {string} text
 * @param {{tones:string[], stemColour:string, leafColour?:string,
 *          per?:number, max?:number, frame?:object, size?:number}} opts
 */
export function wreathSVG(text, { tones, stemColour, leafColour = stemColour, ...opts } = {}) {
  const flowers = wreath(text, opts);
  if (!flowers.length) return '';

  /* The box's own bleed, written onto the element.

     It used to live in the stylesheet as a pair of hard-coded percentages
     for the card, which meant a wreath round anything else silently used
     the wrong box — and meant there was a contract between two files that
     nothing could enforce. Emitting it here deletes the contract instead of
     checking it: the geometry is the only thing that decides. */
  const bleed = bleedFor(opts.frame ?? CARD);

  /* A vine around the card, not stems out of its middle.
     The first version drew a stem from the centre to each flower, which was
     invisible: those lines run *under* the card, so all anyone saw was a
     stub in the gap. Joining neighbours along the perimeter instead gives
     the thing that actually makes a wreath a wreath — a line running round
     the outside, with the flowers sitting on it.

     Sorted by position on the perimeter, not by index: flowers are placed
     by golden ratio so that typing adds rather than rearranges, which means
     consecutive indices are nowhere near each other. */
  const round = [...flowers].sort((a, b) => a.t - b.t);

  const stems =
    round.length < 2
      ? ''
      : round
          .map((f, n) => {
            const next = round[(n + 1) % round.length];
            /* Bowed outward, away from what is being framed, so the vine
               never cuts the corner across it. */
            const { cx, cy } = bow(f, next);
            return `<path class="vine" d="M${f.x} ${f.y} Q${cx.toFixed(2)} ${cy.toFixed(2)} ${next.x} ${next.y}"
        fill="none" stroke="${stemColour}" stroke-width="0.5" opacity="0.6"/>`;
          })
          .join('');

  const { leaves, curls } = foliage(round, stemColour);

  /* One element that *is* the coordinate box, so every percentage inside it
     — the stems' viewBox and each flower's left/top/width — means the same
     thing. The first version positioned flowers against the card's own box
     and the stems against a bled one, and the two quietly disagreed. */
  return `<div class="wreath" aria-hidden="true"
      style="inset:${bleed.y}% ${bleed.x}%">
      <svg class="wreath__stems" viewBox="0 0 100 100" preserveAspectRatio="none"
        aria-hidden="true" focusable="false">${stems}${curls}</svg>
      ${leaves.map((l) => leafSVG(l, leafColour)).join('')}
      ${flowers.map((f) => flowerSVG(f, tones)).join('')}
    </div>`;
}
