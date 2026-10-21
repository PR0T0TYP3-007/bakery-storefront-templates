/**
 * @file A garden that grows out of the letters. Pure, DOM-free, tested.
 *
 * Rebuilt from Type Garden (type-garden.vercel.app, by Akshat Agarwal),
 * whose source the client supplied. The structure of the generator is
 * theirs — stems that wander out of each glyph, weave in front of and behind
 * it, and end in a rose, a fan, a leaf or a curl. Three things are ours,
 * and each is a consequence of where this has to live.
 *
 * **It draws to SVG, not canvas.** The original runs a requestAnimationFrame
 * loop for its boil and its lean-toward-the-cursor. A storefront that keeps
 * a canvas repainting behind every page header is paying for that on every
 * page, on every device, forever — and this template has no build step and
 * no runtime, so a canvas renderer would also be the only thing here that
 * cannot be tested without a browser. SVG costs nothing after paint, and
 * the growth animates in CSS.
 *
 * **It is laid out from measured glyphs.** The original measures with
 * `canvas.measureText`. Here the caller measures the real rendered letters
 * and passes their boxes in, so the garden is anchored to the type the
 * browser actually drew — the right font, the right tracking, the right
 * line breaks.
 *
 * **It is deterministic.** Same text and seed, same garden. The original
 * reseeds from `Math.random()` as you type, which is right for a toy you
 * are playing with and wrong for a shop's own name: a wordmark that grew a
 * different plant on every page load would be a different wordmark on every
 * page load.
 *
 * The previous attempt in `garden.js` is a different thing and stays: it
 * puts a wreath *around* the card, where nothing may be drawn on the card
 * itself. This grows *out of* display type, where that is the whole point.
 */

/* -------------------------------------------------------------------------
   Deterministic noise
   ------------------------------------------------------------------------- */

/** A small, fast PRNG. Same seed, same sequence, every time, everywhere. */
export function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a, for turning a string into a seed. */
export function seedFrom(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/* -------------------------------------------------------------------------
   Curves
   ------------------------------------------------------------------------- */

/**
 * A wandering stem.
 *
 * Walks `n` steps from `base` in direction `dir`, bending steadily by `bend`
 * and wobbling by a sine of `waves` periods. The wobble is eased in over the
 * first third so the stem leaves the letter cleanly instead of kinking at
 * its root.
 */
export function vine(base, dir, len, amp, waves, ph, bend, n = 34) {
  const pts = [[base[0], base[1]]];
  const step = len / n;
  let x = base[0];
  let y = base[1];
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const a = dir + bend * u + amp * Math.sin(u * Math.PI * waves + ph) * Math.min(1, u * 3);
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    pts.push([x, y]);
  }
  return pts;
}

/** A tendril: carries the end of a stem round into a tightening spiral. */
export function curl(pts, sign, rad) {
  const n = pts.length;
  const e = pts[n - 1];
  const a = Math.atan2(e[1] - pts[n - 2][1], e[0] - pts[n - 2][0]);
  const c = [e[0] - Math.sin(a) * sign * rad, e[1] + Math.cos(a) * sign * rad];
  const a0 = Math.atan2(e[1] - c[1], e[0] - c[0]);
  const out = pts.slice();
  for (let i = 1; i <= 14; i++) {
    const u = i / 14;
    const t = a0 + sign * u * Math.PI * 1.6;
    const rr = rad * (1 - 0.5 * u);
    out.push([c[0] + Math.cos(t) * rr, c[1] + Math.sin(t) * rr]);
  }
  return out;
}

/** The point and heading a fraction `u` along a polyline. */
export function at(pts, u) {
  const n = pts.length;
  const i = Math.min(n - 2, Math.max(1, Math.round(u * (n - 1))));
  return [pts[i], Math.atan2(pts[i + 1][1] - pts[i - 1][1], pts[i + 1][0] - pts[i - 1][0])];
}

/**
 * Cut a stem into runs that alternate in front of and behind the type.
 *
 * This is the whole trick, and it is what makes the plant look like it grew
 * through the word rather than over it. A stem is not one shape at one
 * depth: it passes behind a stroke, comes out the other side, crosses in
 * front of the next one.
 */
export function weave(r, startLayer) {
  const cuts = [];
  const n = 1 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) cuts.push(0.15 + r() * 0.7);
  cuts.sort((a, b) => a - b);

  const segs = [];
  let u0 = 0;
  let layer = startLayer;
  for (const c of cuts) {
    if (c <= u0) continue;
    segs.push({ u0, u1: c, layer });
    // Sometimes leave a gap, so the stem truly disappears behind a stroke
    // rather than only changing which side of it we see.
    u0 = r() < 0.3 ? Math.min(0.98, c + 0.02 + r() * 0.03) : c;
    layer = 1 - layer;
  }
  segs.push({ u0, u1: 1, layer });
  return segs;
}

export const layerAt = (segs, u) => {
  for (const s of segs) if (u >= s.u0 && u <= s.u1) return s.layer;
  return segs[segs.length - 1].layer;
};

/* -------------------------------------------------------------------------
   Growing
   ------------------------------------------------------------------------- */

/** Per-word character: how rosy, how leafy, which way it leans. */
export function wordParams(r, density = 1, bloom = 1) {
  return {
    roseP: 0.3 + r() * 0.3,
    leafy: (0.6 + r() * 0.8) * density,
    density,
    lean: (r() - 0.5) * 0.6,
    /* `bloom` scales the flowers without touching the stems. A wordmark is
       18px of hairline capital: at the density and flower size that suit a
       headline, the roses close the counters of the O and the C and the
       name stops being readable — which is the one thing a wordmark may
       not do. */
    big: (0.85 + r() * 0.45) * bloom,
    curvy: 0.8 + r() * 0.6,
    bridgeP: Math.min(0.95, (0.45 + r() * 0.35) * density),
    w: 0.5,
  };
}

/**
 * One stem, everything on it, and sometimes a branch off it.
 *
 * `o.base`/`o.dir`/`o.len` are in em units with the letter's baseline centre
 * at the origin, exactly as the original works — so a garden is the same
 * shape at any type size.
 */
function grow(r, out, nextId, p, o) {
  const tip = o.tip || (r() < p.roseP ? 'rose' : r() < 0.45 ? 'fan' : r() < 0.6 ? 'leaf' : 'curl');

  let pts =
    o.pts ||
    vine(o.base, o.dir, o.len, (0.35 + r() * 0.45) * p.curvy, 1 + r() * 1.6, r() * 6.28, (r() - 0.5) * 1.2);
  if (tip === 'curl') pts = curl(pts, r() < 0.5 ? -1 : 1, 0.05 + r() * 0.05);

  const segs = weave(r, o.layer0 != null ? o.layer0 : r() < 0.5 ? 0 : 1);
  const order = o.order ?? 0;

  const thorns = [];
  const nt = Math.floor(r() * 2.5);
  for (let i = 0; i < nt; i++) thorns.push({ u: 0.15 + r() * 0.65, s: r() < 0.5 ? -1 : 1 });

  out.push({ t: 'stem', id: nextId(), pts, segs, thorns, w: o.depth ? 0.82 : 1, order });

  // Leaves along it, alternating sides.
  const nl = Math.floor(r() * 2.8 * p.leafy);
  let side = r() < 0.5 ? -1 : 1;
  for (let i = 0; i < nl; i++) {
    const u = 0.25 + r() * 0.6;
    const [q, a] = at(pts, u);
    side = -side;
    out.push({
      t: 'leaf',
      id: nextId(),
      x: q[0],
      y: q[1],
      a: a + side * (0.55 + r() * 0.5),
      L: (0.14 + r() * 0.2) * (o.depth ? 0.8 : 1),
      bend: (r() - 0.5) * 1.2,
      layer: layerAt(segs, u),
      order: order + 1,
    });
  }

  const [tp, ta] = at(pts, 1);
  const tipLayer = layerAt(segs, 1);

  if (tip === 'rose') {
    const R = (0.13 + r() * 0.15) * p.big * (o.depth ? 0.75 : 1);
    /* Legibility: a rose that lands on the letter's body mostly goes
       behind it. The original does this and it is the difference between a
       decorated word and an unreadable one. */
    const overBody = tp[1] > -0.78 && tp[1] < 0.05 && Math.abs(tp[0]) < p.w * 0.5;
    const layer = overBody ? (r() < 0.22 ? 1 : 0) : r() < 0.6 ? 1 : tipLayer;
    out.push({
      t: 'rose', id: nextId(), x: tp[0], y: tp[1], R,
      rot: (r() - 0.5) * 1.0, ph1: r() * 6.28, ph2: r() * 6.28,
      turns: 1.8 + r(), layer, order: order + 2,
    });
    if (r() < 0.2) {
      const oa = ta + (r() < 0.5 ? 1 : -1) * 1.3;
      out.push({
        t: 'rose', id: nextId(),
        x: tp[0] + Math.cos(oa) * R * 1.4, y: tp[1] + Math.sin(oa) * R * 1.4,
        R: R * (0.6 + r() * 0.3), rot: (r() - 0.5) * 1.2,
        ph1: r() * 6.28, ph2: r() * 6.28, turns: 1.8 + r(), layer, order: order + 3,
      });
    }
  } else if (tip === 'fan') {
    const spread = 0.6 + r() * 0.3;
    for (let j = 0; j < 2; j++) {
      out.push({
        t: 'leaf', id: nextId(), x: tp[0], y: tp[1],
        a: ta + (j - 0.5) * spread, L: 0.2 + r() * 0.2,
        bend: (j - 0.5) * 0.8, layer: tipLayer, order: order + 2,
      });
    }
  } else if (tip === 'leaf') {
    out.push({
      t: 'leaf', id: nextId(), x: tp[0], y: tp[1],
      a: ta + (r() - 0.5) * 0.3, L: 0.16 + r() * 0.16,
      bend: r() - 0.5, layer: tipLayer, order: order + 2,
    });
  }

  // One branch, one level deep. Deeper than that is a bush.
  if (!o.depth && r() < 0.3) {
    const u = 0.35 + r() * 0.35;
    const [q, a] = at(pts, u);
    grow(r, out, nextId, p, {
      base: q,
      dir: a + (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.4),
      len: (o.len || 0.8) * (0.35 + r() * 0.2),
      depth: 1,
      layer0: layerAt(segs, u),
      order: order + 1,
    });
  }
}

/** A cubic through four points, for the bridge between two letters. */
function bez(a, b, c, d, n = 34) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
      u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
    ]);
  }
  return out;
}

/**
 * Everything growing out of one letter, in that letter's own em space.
 *
 * @param {{ch:string, em:number, prevEm:number|null, index:number}} letter
 * @param {() => number} r
 * @param {object} p  word params
 */
export function growLetter(letter, r, p) {
  const out = [];
  let k = 0;
  const nextId = () => letter.index * 100 + k++;
  const w = letter.em;
  p.w = w;
  const inX = () => (r() - 0.5) * w * 0.7;

  // One or two stems up out of the letter.
  const nUp = 1 + (r() < 0.45 * p.density ? 1 : 0);
  for (let i = 0; i < nUp; i++) {
    grow(r, out, nextId, p, {
      base: [inX(), -r() * 0.3],
      dir: -Math.PI / 2 + p.lean * 0.5 + (r() - 0.5) * 0.7,
      len: 0.6 + r() * 0.5,
      order: i,
      tip: letter.index === 0 && i === 0 ? 'rose' : null,
    });
  }

  // Sometimes one down.
  if (r() < 0.4 * p.density) {
    grow(r, out, nextId, p, {
      base: [inX(), -0.1 - r() * 0.35],
      dir: Math.PI / 2 + (r() - 0.5) * 0.8,
      len: 0.35 + r() * 0.35,
      order: 2,
    });
  }

  /* A bridge back to the letter before: the thing that makes a word read as
     one plant rather than as a row of separate ones. */
  if (letter.prevEm != null && r() < p.bridgeP) {
    const px = -(letter.prevEm + w) / 2;
    const a = [inX(), -0.05 - r() * 0.55];
    const b = [px + (r() - 0.5) * 0.25, -0.05 - r() * 0.55];
    const bulge = (r() < 0.55 ? -1 : 1) * (0.4 + r() * 0.4);
    const dx = b[0] - a[0];
    let pts = bez(a, [a[0] + dx * 0.15, a[1] + bulge], [b[0] - dx * 0.15, b[1] + bulge * 0.9], b);
    if (r() < 0.45) pts = pts.slice(0, Math.floor(pts.length * (0.7 + r() * 0.2)));
    grow(r, out, nextId, p, {
      pts,
      len: Math.abs(dx) + Math.abs(bulge),
      order: 1,
      tip: r() < 0.5 ? 'curl' : r() < 0.5 ? 'leaf' : 'rose',
    });
  }

  // The first letter of a word gets a curl off to its left.
  if (letter.index === 0) {
    grow(r, out, nextId, p, {
      base: [-w * 0.3, -0.15 - r() * 0.4],
      dir: Math.PI + (r() - 0.5) * 1.2,
      len: 0.45 + r() * 0.3,
      order: 1,
      tip: 'curl',
    });
  }

  return out;
}

/**
 * Plant a garden across a measured line of type.
 *
 * Letters arrive already measured by the caller, in pixels: `cx` is the
 * glyph's centre, `baseline` its baseline, `w` its advance. Everything the
 * generator does is in em units, scaled by `S` and offset to the letter —
 * so one garden is the same shape whatever size the type is set at.
 *
 * @param {Array<{ch:string, cx:number, baseline:number, w:number}>} letters
 * `maxElements` is a budget, not a style choice. Every letter grows three
 * or four stems, each cut into several runs, each run its own path — so a
 * garden's size is linear in the text and a merchant who writes a long
 * headline gets a thousand SVG nodes in their hero without being warned.
 * Letters are planted in order until the budget is gone, which thins the
 * end of a long line rather than refusing to draw it.
 *
 * @param {{S:number, seed?:number|string, density?:number, bloom?:number,
 *          maxElements?:number}} opts
 * @returns {{behind:object[], front:object[]}} elements in absolute pixels
 */
export function plant(letters, { S, seed = 1, density = 1, bloom = 1, maxElements = 120 } = {}) {
  const base = typeof seed === 'string' ? seedFrom(seed) : seed | 0;
  const behind = [];
  const front = [];

  let wordSeed = base;
  let indexInWord = 0;
  let prevEm = null;

  let budget = maxElements;

  letters.forEach((l, i) => {
    if (budget <= 0) return;

    /* A space can arrive either as its own entry or as a flag on the letter
       that follows it. The DOM component no longer wraps whitespace in a
       span — doing so stopped the headline wrapping — so it marks the first
       letter of each word instead, and both shapes are accepted here. */
    if (l.ch === ' ' || !l.ch.trim()) {
      indexInWord = 0;
      prevEm = null;
      wordSeed = (base + i * 7919) >>> 0;
      return;
    }
    if (l.startsWord && indexInWord !== 0) {
      indexInWord = 0;
      prevEm = null;
      wordSeed = (base + i * 7919) >>> 0;
    }

    const r = rng((wordSeed ^ Math.imul(indexInWord + 1, 2654435761)) >>> 0);
    const p = wordParams(rng((wordSeed * 7 + 13) >>> 0), density, bloom);

    const els = growLetter(
      { ch: l.ch, em: l.w / S, prevEm, index: indexInWord },
      r,
      p
    );

    // em -> px, anchored to this letter.
    for (const e of els) {
      const placed = { ...e, letter: i };
      if (e.t === 'stem') {
        placed.pts = e.pts.map(([x, y]) => [l.cx + x * S, l.baseline + y * S]);
      } else {
        placed.x = l.cx + e.x * S;
        placed.y = l.baseline + e.y * S;
        if (e.t === 'leaf') placed.L = e.L * S;
        if (e.t === 'rose') placed.R = e.R * S;
      }
      if (e.t === 'stem') {
        // A stem belongs to both layers; its runs say which is which.
        behind.push(placed);
        front.push(placed);
      } else {
        (e.layer ? front : behind).push(placed);
      }
    }

    budget -= els.length;
    indexInWord += 1;
    prevEm = l.w / S;
  });

  return { behind, front };
}

/* -------------------------------------------------------------------------
   Drawing

   The original's `path()` smooths a polyline by running quadratics through
   the midpoints between points, which keeps stems and petals from showing
   their vertices. Same method here, emitting SVG path data.
   ------------------------------------------------------------------------- */

const n2 = (v) => Math.round(v * 100) / 100;

/** A smooth path through points; closed for shapes, open for stems. */
export function pathData(pts, closed) {
  const n = pts.length;
  if (n < 2) return '';
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d;
  if (closed) {
    const s = mid(pts[n - 1], pts[0]);
    d = `M${n2(s[0])} ${n2(s[1])}`;
    for (let i = 0; i < n; i++) {
      const q = mid(pts[i], pts[(i + 1) % n]);
      d += `Q${n2(pts[i][0])} ${n2(pts[i][1])} ${n2(q[0])} ${n2(q[1])}`;
    }
    return `${d}Z`;
  }
  d = `M${n2(pts[0][0])} ${n2(pts[0][1])}`;
  for (let i = 1; i < n - 1; i++) {
    const q = mid(pts[i], pts[i + 1]);
    d += `Q${n2(pts[i][0])} ${n2(pts[i][1])} ${n2(q[0])} ${n2(q[1])}`;
  }
  d += `L${n2(pts[n - 1][0])} ${n2(pts[n - 1][1])}`;
  return d;
}

/**
 * How long a polyline is, in pixels.
 *
 * The stems draw themselves on with `stroke-dasharray`, which needs a real
 * length: one guessed constant makes short stems snap and long ones crawl.
 * Summing the segments is close enough — the smoothed curve is a little
 * shorter than its control polyline, so the dash finishes a hair early,
 * which is invisible and errs the right way.
 */
export function polyLength(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return d;
}

/** The slice of a polyline between two fractions, for a weave run. */
export function slice(pts, a, b) {
  const n = pts.length - 1;
  const ia = a * n;
  const ib = b * n;
  const lerp = (t) => {
    const i = Math.min(n - 1, Math.floor(t));
    const f = t - i;
    return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f];
  };
  const out = [lerp(ia)];
  for (let i = Math.floor(ia) + 1; i < ib; i++) out.push(pts[i]);
  out.push(lerp(ib));
  return out;
}

/**
 * A leaf: an axis with a bend, widest a third of the way along, with a vein.
 */
export function leafPath(e) {
  const ca = Math.cos(e.a);
  const sa = Math.sin(e.a);
  const px = -sa;
  const py = ca;
  const axis = (u) => {
    const b = Math.sin(Math.PI * u) * e.bend * 0.15 * e.L;
    return [e.x + ca * u * e.L + px * b, e.y + sa * u * e.L + py * b];
  };
  const hw = (u) => e.L * 0.18 * Math.sin(Math.PI * Math.pow(u, 0.8));

  const N = 12;
  const s1 = [];
  const s2 = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const c = axis(u);
    const w = hw(u);
    s1.push([c[0] + px * w, c[1] + py * w]);
    s2.push([c[0] - px * w, c[1] - py * w]);
  }
  const tip = axis(1);
  const base = axis(0);
  const outline = [base, ...s1.slice(1, N), tip, ...s2.slice(1, N).reverse()];

  const vein = [];
  for (let i = 0; i <= 8; i++) vein.push(axis(0.08 + 0.72 * (i / 8)));

  return { outline: pathData(outline, true), vein: pathData(vein, false) };
}

/**
 * A rose: six petals laid back to front, then a spiral over them.
 *
 * The petal wobble (`ph1`, `ph2`) is what stops six ellipses reading as six
 * ellipses. The spiral is the line that makes it a rose rather than a
 * pompom — in the original it is drawn in the flower's own line colour, and
 * it is the single most recognisable thing about the whole drawing.
 */
export const ROSE_PETALS = [
  [0, -0.36, 0.56, 0.54, 0],
  [-0.5, -0.06, 0.6, 0.6, -0.35],
  [0.52, -0.06, 0.6, 0.6, 0.35],
  [-0.42, 0.3, 0.62, 0.48, 0.2],
  [0.47, 0.3, 0.62, 0.48, -0.2],
  [0.05, 0.42, 0.56, 0.38, 0],
];

export function rosePaths(e) {
  const cr = Math.cos(e.rot);
  const sr = Math.sin(e.rot);
  const T = (x, y) => [e.x + (x * cr - y * sr) * e.R, e.y + (x * sr + y * cr) * e.R];

  const petals = ROSE_PETALS.map((q, i) => {
    const ca = Math.cos(q[4]);
    const sa = Math.sin(q[4]);
    const pts = [];
    for (let k = 0; k < 26; k++) {
      const th = (k / 26) * Math.PI * 2;
      const rr = 1 + 0.08 * Math.sin(3 * th + e.ph1 + i) + 0.04 * Math.sin(5 * th + e.ph2);
      const lx = Math.cos(th) * q[2] * rr;
      const ly = Math.sin(th) * q[3] * rr;
      pts.push(T(q[0] + lx * ca - ly * sa, q[1] + lx * sa + ly * ca));
    }
    return pathData(pts, true);
  });

  const sp = [];
  for (let i = 0; i <= 64; i++) {
    const u = i / 64;
    const th = e.ph1 + u * e.turns * Math.PI * 2;
    const rr = 0.08 + 0.57 * u;
    sp.push(T(Math.cos(th) * rr * 1.05, Math.sin(th) * rr * 0.72 - 0.12));
  }

  return { petals, spiral: pathData(sp, false) };
}

/**
 * One layer of the garden as SVG markup.
 *
 * `aria-hidden` throughout: it is decoration with nothing in it, and the
 * word it grows from is ordinary text that a screen reader reads normally.
 *
 * @param {object[]} els
 * @param {number} layer  0 behind the type, 1 in front of it
 * @param {{stem:string, flower:string, line:string, vein:string}} c
 * @param {number} S
 */
export function layerSVG(els, layer, c, S) {
  const out = [];

  for (const e of els) {
    if (e.t === 'stem') {
      for (const sg of e.segs) {
        if (sg.layer !== layer) continue;
        const run = slice(e.pts, sg.u0, sg.u1);
        if (run.length < 2) continue;
        out.push(
          `<path class="lg-stem" style="--o:${e.order};--len:${n2(polyLength(run))}"
            d="${pathData(run, false)}" fill="none"
            stroke="${c.stem}" stroke-width="${n2(S * 0.022 * (e.w || 1))}"
            stroke-linecap="round" stroke-linejoin="round"/>`
        );
      }
      for (const th of e.thorns) {
        if (layerAt(e.segs, th.u) !== layer) continue;
        const [p, a] = at(e.pts, th.u);
        const d = a + th.s * 2.3;
        const L = S * 0.045;
        out.push(
          `<path class="lg-stem" style="--o:${e.order};--len:${n2(L)}"
            d="M${n2(p[0])} ${n2(p[1])} L${n2(p[0] + Math.cos(d) * L)} ${n2(p[1] + Math.sin(d) * L)}"
            fill="none" stroke="${c.stem}" stroke-width="${n2(S * 0.022)}" stroke-linecap="round"/>`
        );
      }
      continue;
    }

    if (e.layer !== layer) continue;

    if (e.t === 'leaf') {
      const { outline, vein } = leafPath(e);
      out.push(
        `<g class="lg-leaf" style="--o:${e.order};--ox:${n2(e.x)}px;--oy:${n2(e.y)}px">
           <path d="${outline}" fill="${c.stem}"/>
           ${e.L > 6 ? `<path d="${vein}" fill="none" stroke="${c.vein}" stroke-width="${n2(Math.max(0.6, e.L * 0.03))}" opacity="0.5"/>` : ''}
         </g>`
      );
    } else if (e.t === 'rose') {
      const { petals, spiral } = rosePaths(e);
      out.push(
        `<g class="lg-rose" style="--o:${e.order};--ox:${n2(e.x)}px;--oy:${n2(e.y)}px">
           ${petals.map((d) => `<path d="${d}" fill="${c.flower}"/>`).join('')}
           <path d="${spiral}" fill="none" stroke="${c.line}"
             stroke-width="${n2(Math.max(0.7, e.R * 0.045))}" stroke-linecap="round"/>
         </g>`
      );
    }
  }

  return out.join('');
}

/** How many growth steps a garden has, so the caller can time what follows. */
export const lastOrder = (els) => els.reduce((m, e) => Math.max(m, e.order ?? 0), 0);
