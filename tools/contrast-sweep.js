/**
 * @file A contrast sweep you run in the page, not over the stylesheets.
 *
 * Two things make the obvious version of this wrong, and both have cost this
 * project a real bug:
 *
 *   1. A translucent colour must be composited against everything behind it.
 *      Reading `color` and `background-color` off one element and comparing
 *      them scores a 78%-opaque white against `transparent` and calls it a
 *      pass. So this walks up to the first opaque ancestor and paints the
 *      stack back down.
 *
 *   2. Chrome serialises colours in whatever space they were written in.
 *      `color-mix(in oklab, …)` comes back as `oklab(…)`; `color-mix(in
 *      srgb, …)` comes back as `color(srgb 0.96 0.96 0.95 / 0.86)`, with
 *      channels in 0–1 rather than 0–255. A naive `/[\d.]+/` parse reads
 *      either as three tiny sRGB channels — i.e. black — and invents
 *      failures. This has now bitten twice: once in a footer that was
 *      fine, and once across a hero that was fine.
 *
 * Usage, in the browser console or via the preview tools:
 *
 *   fetch('/tools/contrast-sweep.js').then(r => r.text()).then(eval)
 *   __contrastSweep()
 *
 * It returns the failures only, so an empty array is the pass.
 */

window.__contrastSweep = function contrastSweep(root = document.body) {
  const clamp = (v) => Math.min(255, Math.max(0, v));
  const gamma = (u) => (u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055);

  function oklabToRgb(L, a, b, alpha) {
    const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
    const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
    const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
    return [
      clamp(gamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) * 255),
      clamp(gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) * 255),
      clamp(gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s) * 255),
      alpha,
    ];
  }

  function parse(str) {
    const n = (str.match(/-?[\d.]+(?:e-?\d+)?/g) || []).map(Number);
    if (str === 'transparent' || !n.length) return [0, 0, 0, 0];

    if (str.startsWith('oklab')) {
      return oklabToRgb(n[0], n[1], n[2], n[3] === undefined ? 1 : n[3]);
    }

    /* color(srgb r g b / a) — channels are 0–1 here, not 0–255. */
    if (str.startsWith('color(srgb')) {
      return [n[0] * 255, n[1] * 255, n[2] * 255, n[3] === undefined ? 1 : n[3]];
    }

    /* Anything else in a space this does not know would be read as sRGB and
       scored wrongly, which is worse than refusing. Shout instead. */
    if (str.startsWith('color(') || /^(oklch|lab|lch|hwb)\(/.test(str)) {
      throw new Error(`contrast-sweep cannot parse "${str}" — add the space`);
    }

    return [n[0], n[1], n[2], n[3] === undefined ? 1 : n[3]];
  }

  const over = (fg, bg) => {
    const a = fg[3] === undefined ? 1 : fg[3];
    return [0, 1, 2].map((i) => fg[i] * a + bg[i] * (1 - a));
  };

  /** Every background from the page down to this element, painted in order. */
  function bgOf(el) {
    const stack = [];
    for (let n = el; n; n = n.parentElement) {
      const b = parse(getComputedStyle(n).backgroundColor);
      if (b[3] > 0) stack.unshift(b);
    }
    let c = [255, 255, 255];
    for (const b of stack) c = over(b, c);
    return c;
  }

  const relLum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };

  const ratio = (a, b) => {
    const l1 = relLum(a);
    const l2 = relLum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  const fails = [];

  for (const el of root.querySelectorAll('*')) {
    /* Only elements that own text. An element whose text is all in children
       would otherwise be scored against the wrong background. */
    const owns = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!owns) continue;

    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
    if (!el.getClientRects().length) continue;

    const bg = bgOf(el);
    const fg = over(parse(cs.color), bgOf(el.parentElement || document.body));

    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    /* WCAG large text: 24px, or 18.66px at 700+. */
    const need = size >= 24 || (size >= 18.66 && weight >= 700) ? 3 : 4.5;

    const r = ratio(fg, bg);
    if (r + 0.005 < need) {
      fails.push({
        sel: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().replace(/\s+/g, '.') : ''),
        text: el.textContent.trim().slice(0, 40),
        ratio: +r.toFixed(2),
        need,
        size,
      });
    }
  }

  return fails;
};
