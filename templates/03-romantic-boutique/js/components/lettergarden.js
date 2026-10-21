/**
 * @file Mounting a letter garden on real type.
 *
 * The generator in `js/lettergarden.js` is pure and knows nothing about the
 * page. This is the part that does: it measures the letters the browser
 * actually drew, grows a garden from those boxes, and lays two SVGs over
 * the element — one behind the type, one in front of it.
 *
 * Measuring rather than guessing is the point. The original measures glyph
 * advances with `canvas.measureText`; here the letters are already on the
 * page in the right font at the right tracking, so the browser has done the
 * work and `getClientRects` will tell us. That also means the garden is
 * right when the font loads late, when the line wraps, and when the type
 * scales with the viewport — none of which a hard-coded layout survives.
 */

import { plant, layerSVG, lastOrder } from '../lettergarden.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );

/**
 * Split an element's text into measurable spans, once.
 *
 * Every character keeps its place in the text — this wraps them, it does
 * not rewrite them — so the element still reads as its own sentence to a
 * screen reader, to search, and to anybody who copies it.
 */
function letterSpans(host) {
  if (host.dataset.lgSplit === 'true') {
    return [...host.querySelectorAll('[data-lg-ch]')].map((el) => ({
      el,
      startsWord: el.dataset.lgFirst === '',
    }));
  }

  /* Walk the text nodes rather than reading `textContent` and writing it
     back. The hero headline is already marked up — words in their own spans
     so they can write themselves on, and one clause in the script face — and
     flattening it to wrap the letters would throw all of that away. */
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  const texts = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n);

  const out = [];
  let pendingBreak = true;

  for (const node of texts) {
    const frag = document.createDocumentFragment();
    for (const ch of node.nodeValue) {
      /* Whitespace stays whitespace — a plain text node, not a span.
         Wrapping spaces too, with `white-space: pre` to preserve them, was
         the first version, and it stopped the headline wrapping at all: at
         390px the line ran straight off the side of the phone. Characters
         inside spans still break between words because the spaces between
         them are ordinary text. */
      if (!ch.trim()) {
        frag.append(ch);
        pendingBreak = true;
        continue;
      }
      const span = document.createElement('span');
      span.dataset.lgCh = '';
      if (pendingBreak) span.dataset.lgFirst = '';
      span.style.display = 'inline';
      span.textContent = ch;
      frag.append(span);
      out.push({ el: span, startsWord: pendingBreak });
      pendingBreak = false;
    }
    node.replaceWith(frag);
  }

  host.dataset.lgSplit = 'true';
  return out;
}

/**
 * Grow a garden out of the text in `host`.
 *
 * @param {object} opts
 * @param {HTMLElement} opts.host     the element whose letters grow it
 * @param {HTMLElement} opts.behind   layer painted under the type
 * @param {HTMLElement} opts.front    layer painted over it
 * @param {object} opts.colours       stem / flower / line / vein
 * @param {number} [opts.density]
 * @param {number} [opts.bloom]    flower size, independent of stem density
 * @param {string} [opts.seed]
 * @returns {number} the last growth step, for timing whatever follows
 */
export function growOn({ host, behind, front, colours, density = 1, bloom = 1, maxElements, seed }) {
  const spans = letterSpans(host);
  const box = host.getBoundingClientRect();
  if (!box.width) return 0;

  /* The em size the garden is scaled by. Taken from the computed font size
     rather than from the box, because the box includes leading and a garden
     scaled to leading grows twice the size it should. */
  const S = parseFloat(getComputedStyle(host).fontSize) || 16;

  const letters = spans.map(({ el: span, startsWord }) => {
    const r = span.getBoundingClientRect();
    return {
      ch: span.textContent,
      startsWord,
      cx: r.left - box.left + r.width / 2,
      /* The baseline, not the bottom. Everything the generator does is
         measured from where the letters sit, and `bottom` is the descender
         line — a garden anchored there floats below the word. */
      baseline: r.bottom - box.top - (r.height - S * 0.72),
      w: r.width,
    };
  });

  const { behind: back, front: fore } = plant(letters, { S, seed: seed ?? host.textContent, density, bloom, maxElements });

  const frame = `0 0 ${box.width} ${box.height}`;
  const svg = (inner) =>
    `<svg class="lg" viewBox="${esc(frame)}" width="${esc(box.width)}" height="${esc(box.height)}"
       aria-hidden="true" focusable="false" preserveAspectRatio="none">${inner}</svg>`;

  behind.innerHTML = svg(layerSVG(back, 0, colours, S));
  front.innerHTML = svg(layerSVG(fore, 1, colours, S));

  return Math.max(lastOrder(back), lastOrder(fore));
}

/**
 * Grow it, and grow it again when the type moves under it.
 *
 * A garden measured once is wrong the moment the font finishes loading, the
 * window is resized, or the line re-wraps — and all three happen on an
 * ordinary page load. The observer is the cheapest way to be right in all
 * of them; it is debounced because a resize fires a great many times and
 * regrowing on every frame of a drag is wasted work.
 */
export function growAndKeep(opts) {
  let order = growOn(opts);
  let timer = null;

  const again = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      order = growOn(opts);
      opts.onGrow?.(order);
    }, 120);
  };

  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(again).observe(opts.host);
  // Fonts land after first paint, and the letters move when they do.
  document.fonts?.ready?.then(again);

  return order;
}
