/**
 * @file The cake. Builds an inline SVG from a configuration object.
 *
 * Why this exists
 * ---------------
 * Market research for this direction found no bakery storefront in the
 * category with a live visual preview of a custom cake. The real "build your
 * own cake" pages are plain form selectors: the customer makes six decisions
 * and sees nothing until collection day. That is the gap this template is
 * built around, so the drawing is the product, not an illustration of it.
 *
 * Constraints it works under
 * --------------------------
 * - Pure SVG. No canvas, no WebGL, no library, no build step.
 * - Every stroke is `var(--ink)` at `var(--line)`, so the cake obeys the same
 *   separation rule as every other component rather than being a foreign
 *   object dropped onto the page.
 * - Deterministic. Sprinkle and drip placement comes from a hash of the
 *   configuration, so the same cake is the same drawing on every render and
 *   on every reload. Random placement would make the preview shimmer on each
 *   keystroke of the inscription.
 * - Ids are suffixed with a counter, because thumbnails put several cakes in
 *   one document and duplicate clip-path ids silently cross-wire them.
 *
 * It renders from the option *data*, not from a hard-coded list: a merchant
 * adding a buttercream colour to products.json gets it in the drawing.
 */

/* --------------------------------------------------------------------------
   Determinism
   -------------------------------------------------------------------------- */

/** FNV-1a. Chosen over a polynomial hash because the naive one clustered. */
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** A tiny seeded generator, so a given cake always scatters the same way. */
function seeded(seed) {
  let s = hash(seed) || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/* --------------------------------------------------------------------------
   Colour
   -------------------------------------------------------------------------- */

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

function rgb(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

function hex([r, g, b]) {
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}

/** Mixes toward black or white. Used for the top surface and the shading. */
function shift(colour, amount) {
  const target = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  return hex(rgb(colour).map((c) => c + (target - c) * t));
}

/** Relative luminance, for choosing the inscription colour. */
function luminance(colour) {
  const [r, g, b] = rgb(colour).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Picks ink or white for text on a given icing, whichever passes contrast.
 * The inscription is real information — a name, a number — so it has to be
 * legible on chocolate icing and on sunshine yellow alike.
 */
function readableOn(colour) {
  return luminance(colour) > 0.42 ? '#2a1233' : '#ffffff';
}

/* --------------------------------------------------------------------------
   Geometry
   -------------------------------------------------------------------------- */

const VIEW = { w: 360, h: 440 };
const PLATE_Y = 398;

/**
 * Tier boxes, bottom first. A one-tier cake is drawn taller rather than
 * simply shorter, so a single-tier order still looks like a celebration
 * cake and not like a leftover.
 * @param {1|2|3} tiers
 */
function geometry(tiers) {
  const widths = { 1: [238], 2: [240, 170], 3: [246, 180, 118] }[tiers] ?? [240, 170];
  const heights = { 1: [124], 2: [94, 78], 3: [86, 72, 60] }[tiers] ?? [94, 78];

  let y = PLATE_Y;
  return widths.map((w, i) => {
    const h = heights[i];
    y -= h;
    return { w, h, y, x: (VIEW.w - w) / 2, cx: VIEW.w / 2 };
  });
}

/* --------------------------------------------------------------------------
   Parts
   -------------------------------------------------------------------------- */

const STROKE = 'stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
const THIN = 'stroke="var(--ink)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';

/** Sponge bands with filling between them, drawn inside a clip. */
function inside(tier, sponge, filling, uid, i, speckled) {
  const bands = tier.h > 110 ? 5 : tier.h > 84 ? 4 : 3;
  const seam = 5;
  const bandH = (tier.h - seam * (bands - 1)) / bands;

  let out = `<rect x="${tier.x}" y="${tier.y}" width="${tier.w}" height="${tier.h}" fill="${sponge}"/>`;

  for (let b = 1; b < bands; b++) {
    const y = tier.y + b * bandH + (b - 1) * seam;
    out += `<rect x="${tier.x}" y="${y.toFixed(1)}" width="${tier.w}" height="${seam}" fill="${filling}"/>`;
  }

  // Funfetti is the one sponge whose character is visible rather than tasted,
  // so it gets speckles. They are seeded, not random.
  if (speckled) {
    const rnd = seeded(`speck${i}${tier.w}`);
    const colours = ['#e6197a', '#6b2fd4', '#0fb880', '#ff6b35', '#ffd84d'];
    for (let n = 0; n < 26; n++) {
      const x = tier.x + 6 + rnd() * (tier.w - 12);
      const y = tier.y + 6 + rnd() * (tier.h - 12);
      out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="5" height="2.4" rx="1.2" fill="${colours[n % colours.length]}" transform="rotate(${(rnd() * 180 - 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
  }

  return `<g clip-path="url(#clip-${uid}-${i})">${out}</g>`;
}

/** The notch — a slice already taken, so the inside is visible at a glance. */
function notchPath(tier) {
  const x1 = tier.cx + tier.w * 0.17;
  const x2 = x1 + tier.w * 0.19;
  const yT = tier.y - 2;
  const yB = PLATE_Y + 2;
  // The inner face leans, which is what makes it read as a cut wedge rather
  // than a rectangular bite.
  return `M${x1} ${yT} L${x2} ${yT} L${x2 - 9} ${yB} L${x1 + 5} ${yB} Z`;
}

/** The icing shell for one tier, in the requested finish. */
function shell(tier, icing, draw, uid, i, seed) {
  const top = shift(icing, 0.3);
  const deep = shift(icing, -0.22);
  const r = 8;
  const body = `<rect x="${tier.x}" y="${tier.y}" width="${tier.w}" height="${tier.h}" rx="${r}" fill="${icing}"/>`;
  const topSlab = `<rect x="${tier.x}" y="${tier.y}" width="${tier.w}" height="13" rx="6" fill="${top}"/>`;

  if (draw === 'naked') {
    // Scraped back: the sponge shows through, with a wash of icing over it
    // and a proper slab only on the top surface where it is piled.
    return `
      <rect x="${tier.x}" y="${tier.y}" width="${tier.w}" height="${tier.h}" rx="${r}" fill="${icing}" opacity="0.26"/>
      ${topSlab}
      <rect x="${tier.x}" y="${tier.y}" width="${tier.w}" height="${tier.h}" rx="${r}" fill="none" ${STROKE}/>`;
  }

  let extra = '';

  if (draw === 'swirl') {
    // Two rows of spoon swirls. Overlapping arcs rather than full circles, so
    // the silhouette of the tier stays square-edged.
    const rowY = [tier.y + tier.h * 0.42, tier.y + tier.h * 0.76];
    const step = 26;
    for (const y of rowY) {
      for (let x = tier.x + 13; x < tier.x + tier.w - 8; x += step) {
        extra += `<path d="M${x} ${y.toFixed(1)} a13 11 0 0 0 26 0" fill="none" stroke="${deep}" stroke-width="3.5" stroke-linecap="round"/>`;
      }
    }
  }

  if (draw === 'drip') {
    // Ganache poured over the top. Lobe depths are seeded so the drip does
    // not re-pour itself every time the inscription changes.
    const rnd = seeded(`drip${seed}${i}`);
    const lobes = Math.max(4, Math.round(tier.w / 34));
    const w = tier.w / lobes;
    let d = `M${tier.x} ${tier.y + 10}`;
    for (let n = 0; n < lobes; n++) {
      const x0 = tier.x + n * w;
      const depth = 16 + rnd() * 30;
      d += ` L${(x0 + w * 0.16).toFixed(1)} ${(tier.y + 10).toFixed(1)}`;
      d += ` Q${(x0 + w * 0.5).toFixed(1)} ${(tier.y + 10 + depth).toFixed(1)} ${(x0 + w * 0.84).toFixed(1)} ${(tier.y + 10).toFixed(1)}`;
    }
    d += ` L${tier.x + tier.w} ${tier.y + 10} L${tier.x + tier.w} ${tier.y} L${tier.x} ${tier.y} Z`;
    extra += `<path d="${d}" fill="${shift(icing, -0.45)}" clip-path="url(#clip-${uid}-${i})"/>`;
  }

  if (draw === 'sprinkles') {
    const rnd = seeded(`spr${seed}${i}`);
    const colours = ['#e6197a', '#6b2fd4', '#0fb880', '#ff6b35', '#ffd84d', '#ffffff'];
    for (let n = 0; n < Math.round(tier.w * tier.h / 190); n++) {
      const x = tier.x + 8 + rnd() * (tier.w - 16);
      const y = tier.y + 16 + rnd() * (tier.h - 24);
      extra += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="7" height="3" rx="1.5" fill="${colours[n % colours.length]}" transform="rotate(${(rnd() * 180 - 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
  }

  return `${body}${topSlab}${extra}
    <rect x="${tier.x}" y="${tier.y}" width="${tier.w}" height="${tier.h}" rx="${r}" fill="none" ${STROKE}/>`;
}

/** Whatever goes on top, drawn on the top tier. */
function topper(tier, draw, icing) {
  const y = tier.y;
  const cx = tier.cx;

  if (draw === 'candles') {
    const n = 5;
    const spread = Math.min(tier.w - 44, 128);
    const step = spread / (n - 1);
    let out = '';
    for (let i = 0; i < n; i++) {
      const x = cx - spread / 2 + i * step;
      // Alternating candle colours, in template palette rather than data, as
      // candles are packaging and not a customer choice.
      const c = ['#e6197a', '#6b2fd4', '#0fb880', '#ff6b35', '#ffd84d'][i % 5];
      out += `
        <rect x="${(x - 3).toFixed(1)}" y="${y - 32}" width="6" height="34" rx="3" fill="${c}" ${THIN}/>
        <path d="M${x.toFixed(1)} ${y - 32} v-5" ${THIN}/>
        <ellipse class="flame" cx="${x.toFixed(1)}" cy="${y - 41}" rx="4.4" ry="7" fill="#ffd84d" stroke="#ff6b35" stroke-width="2"/>`;
    }
    return out;
  }

  if (draw === 'sparklers') {
    let out = '';
    for (const x of [cx - 40, cx + 40]) {
      out += `<rect x="${x - 2}" y="${y - 64}" width="4" height="66" rx="2" fill="#5c4368" ${THIN}/>`;
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        const r1 = 9, r2 = 20;
        out += `<path d="M${(x + Math.cos(ang) * r1).toFixed(1)} ${(y - 64 + Math.sin(ang) * r1).toFixed(1)} L${(x + Math.cos(ang) * r2).toFixed(1)} ${(y - 64 + Math.sin(ang) * r2).toFixed(1)}" stroke="#ffd84d" stroke-width="3" stroke-linecap="round"/>`;
      }
      out += `<circle class="flame" cx="${x}" cy="${y - 64}" r="6" fill="#fff6e6" stroke="#ff6b35" stroke-width="2"/>`;
    }
    return out;
  }

  if (draw === 'fruit') {
    const rnd = seeded('fruit');
    let out = '';
    const berries = [
      ['#e6197a', 11], ['#6b2fd4', 9], ['#a8252f', 12], ['#ff6b35', 8],
      ['#6b2fd4', 11], ['#e6197a', 9], ['#a8252f', 8],
    ];
    berries.forEach(([c, r], i) => {
      const x = cx - 52 + i * 17 + rnd() * 6;
      const yy = y - r + 2 - rnd() * 12;
      out += `<circle cx="${x.toFixed(1)}" cy="${yy.toFixed(1)}" r="${r}" fill="${c}" ${THIN}/>`;
    });
    // Two mint leaves, so the pile has something green in it.
    out += `<path d="M${cx + 14} ${y - 20} q14 -14 26 -4 q-14 14 -26 4 Z" fill="#0fb880" ${THIN}/>`;
    out += `<path d="M${cx - 34} ${y - 22} q-13 -13 -25 -3 q13 13 25 3 Z" fill="#0fb880" ${THIN}/>`;
    return out;
  }

  if (draw === 'figure') {
    const fy = y - 6;
    return `
      <rect x="${cx - 17}" y="${fy - 44}" width="34" height="44" rx="15" fill="#ffb3cd" ${THIN}/>
      <circle cx="${cx}" cy="${fy - 58}" r="17" fill="#fff6e6" ${THIN}/>
      <circle cx="${cx - 6}" cy="${fy - 60}" r="2.4" fill="var(--ink)"/>
      <circle cx="${cx + 6}" cy="${fy - 60}" r="2.4" fill="var(--ink)"/>
      <path d="M${cx - 6} ${fy - 52} q6 5 12 0" fill="none" ${THIN}/>
      <path d="M${cx - 17} ${fy - 34} l-14 -12" ${THIN}/>
      <path d="M${cx + 17} ${fy - 34} l14 -12" ${THIN}/>
      <path d="M${cx - 15} ${fy - 72} q15 -12 30 0" fill="none" stroke="${shift(icing, -0.3)}" stroke-width="4" stroke-linecap="round"/>`;
  }

  return '';
}

/* --------------------------------------------------------------------------
   The whole cake
   -------------------------------------------------------------------------- */

let counter = 0;

/**
 * @typedef {object} CakeSpec
 * @property {1|2|3} tiers
 * @property {string} sponge       hex
 * @property {boolean} [speckled]
 * @property {string} filling      hex
 * @property {string} icing        hex
 * @property {string} finish       smooth | swirl | drip | sprinkles | naked
 * @property {string} topper       none | candles | sparklers | fruit | figure
 * @property {string} [inscription]
 */

/**
 * @param {CakeSpec} spec
 * @param {{compact?:boolean, title?:string, className?:string}} [opts] compact drops the plate,
 *   the notch and the inscription, for thumbnails at 96px where none of them
 *   would be legible anyway.
 * @returns {string} SVG markup
 */
export function cakeSVG(spec, opts = {}) {
  const uid = ++counter;
  const { compact = false } = opts;

  const tiers = clamp(Number(spec.tiers) || 1, 1, 3);
  const sponge = spec.sponge || '#f7e2a8';
  const filling = spec.filling || '#fff6e6';
  const icing = spec.icing || '#fff6e6';
  const finish = spec.finish || 'smooth';
  const draw = spec.topper || 'none';
  const said = (spec.inscription || '').trim();
  const seed = `${tiers}${sponge}${filling}${icing}${finish}`;

  const boxes = geometry(tiers);
  const top = boxes[boxes.length - 1];
  const bottom = boxes[0];

  const clips = boxes
    .map(
      (t, i) =>
        `<clipPath id="clip-${uid}-${i}"><rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="8"/></clipPath>`
    )
    .join('');

  // The notch is masked out of the icing only, never out of the sponge, so
  // what shows through the cut is the inside of the cake.
  const cut = !compact && finish !== 'naked';
  const mask = cut
    ? `<mask id="cut-${uid}">
         <rect x="0" y="0" width="${VIEW.w}" height="${VIEW.h}" fill="#fff"/>
         <path d="${notchPath(bottom)}" fill="#000"/>
       </mask>`
    : '';

  const plate = compact
    ? ''
    : `<ellipse cx="${VIEW.w / 2}" cy="${PLATE_Y + 6}" rx="146" ry="15" fill="#ffffff" ${STROKE}/>
       <path d="M${VIEW.w / 2 - 146} ${PLATE_Y + 6} h292" ${THIN} opacity="0.35"/>`;

  const body = boxes
    .map((t, i) => {
      const masked = cut && i === 0 ? ` mask="url(#cut-${uid})"` : '';
      return `<g data-anim data-tier="${i}">
          ${inside(t, sponge, filling, uid, i, spec.speckled)}
          <g${masked}>${shell(t, icing, finish, uid, i, seed)}</g>
        </g>`;
    })
    .join('');

  // The cut face gets its own outline, otherwise the notch looks like a hole
  // punched in the drawing rather than a slice taken out of a cake.
  const cutFace = cut
    ? `<path d="${notchPath(bottom)}" fill="none" ${STROKE}/>`
    : '';

  // The inscription sits on the front of the bottom tier, to the left of the
  // notch, sized to the space it actually has.
  let text = '';
  if (said && !compact) {
    const avail = cut ? bottom.w * 0.6 : bottom.w - 36;
    const size = clamp(avail / (said.length * 0.56), 9, 22);
    const fg = readableOn(finish === 'naked' ? sponge : icing);
    const tx = cut ? bottom.x + 18 + avail / 2 : bottom.cx;
    text = `<text x="${tx.toFixed(1)}" y="${(bottom.y + bottom.h * 0.6).toFixed(1)}"
        text-anchor="middle" fill="${fg}"
        font-family="Fredoka, sans-serif" font-weight="600" font-size="${size.toFixed(1)}"
        >${escapeXML(said)}</text>`;
  }

  return `<svg viewBox="0 0 ${VIEW.w} ${VIEW.h}" xmlns="http://www.w3.org/2000/svg"
      class="${escapeXML(opts.className ?? '')}"
      role="img" aria-label="${escapeXML(opts.title || describe(spec))}" focusable="false">
      <defs>${clips}${mask}</defs>
      ${plate}
      ${body}
      ${cutFace}
      ${text}
      ${topper(top, draw, icing)}
    </svg>`;
}

/**
 * A plain-language description of the drawing, used as its accessible label.
 * A decorative alt text would be wrong here: the picture carries the whole
 * configuration, so somebody using a screen reader has to get it in words.
 */
export function describe(spec) {
  const words = [
    `${{ 1: 'One', 2: 'Two', 3: 'Three' }[spec.tiers] ?? 'One'}-tier cake`,
    spec.spongeName && `${spec.spongeName.toLowerCase()} sponge`,
    spec.fillingName && `${spec.fillingName.toLowerCase()} filling`,
    spec.icingName && `${spec.icingName.toLowerCase()} icing`,
    spec.finishName && `${spec.finishName.toLowerCase()} finish`,
    spec.topperName && spec.topper !== 'none' && `${spec.topperName.toLowerCase()} on top`,
  ].filter(Boolean);
  const said = (spec.inscription || '').trim();
  return words.join(', ') + (said ? `, iced with “${said}”` : '');
}

/** A three-up silhouette for the tier chooser, so the choice is visual. */
export function tierIcon(n) {
  const boxes = geometry(n);
  const parts = boxes
    .map(
      (t) =>
        `<rect x="${(t.x / 3.4 + 12).toFixed(1)}" y="${(t.y / 3.4 + 12).toFixed(1)}" width="${(t.w / 3.4).toFixed(1)}" height="${(t.h / 3.4).toFixed(1)}" rx="3" fill="var(--surface)" stroke="var(--ink)" stroke-width="2.4"/>`
    )
    .join('');
  return `<svg width="54" height="56" viewBox="12 20 82 110" aria-hidden="true" focusable="false">${parts}</svg>`;
}

function escapeXML(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/**
 * Turns a product's selections into a drawing spec by looking the chosen
 * option up in the catalogue. This is the only place the two vocabularies
 * meet, which is why the renderer above never mentions an option id.
 *
 * @param {object} product
 * @param {Record<string,string>} selections
 * @param {Record<string,object>} groups  catalogue.optionGroups
 * @param {string} [inscription]
 * @returns {CakeSpec}
 */
export function specFrom(product, selections = {}, groups = {}, inscription = '') {
  const pick = (groupId) => {
    const group = groups[groupId];
    if (!group) return null;
    return group.options.find((o) => o.id === selections[groupId]) ?? group.options[0];
  };

  const sponge = pick('sponge');
  const filling = pick('filling');
  const icing = pick('icing');
  const finish = pick('finish');
  const topperOpt = pick('topper');
  const tiersOpt = pick('tiers');

  return {
    tiers: Number(tiersOpt?.id) || 1,
    sponge: sponge?.swatch ?? '#f7e2a8',
    spongeName: sponge?.label,
    speckled: Boolean(sponge?.speckled),
    filling: filling?.swatch ?? '#fff6e6',
    fillingName: filling?.label,
    icing: icing?.swatch ?? '#fff6e6',
    icingName: icing?.label,
    finish: finish?.draw ?? 'smooth',
    finishName: finish?.label,
    topper: topperOpt?.draw ?? 'none',
    topperName: topperOpt?.label,
    inscription,
  };
}
