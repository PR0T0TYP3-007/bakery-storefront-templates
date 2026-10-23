/**
 * @file Products, drawn on plates.
 *
 * The one rule that makes this template itself: a product heading carries
 * BOTH names, at the same size, with a rule between them. Neither is a
 * subtitle. Everything else here is ordinary.
 */

import { bothFaces, kinOf, differs } from '../lang.js';
import { lang, t, bcp47 } from '../services/locale.js';
import { esc } from './chrome.js';

const money = (n, merchant, which = lang()) =>
  new Intl.NumberFormat(bcp47(which), {
    style: 'currency',
    currency: merchant.currency,
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);

/**
 * The two names.
 *
 * `lang` is set per name, not once on the wrapper. On this template every
 * heading is bilingual, so a single `lang` on an ancestor would have a
 * screen reader read "tarte au sucre" in an English voice on every card in
 * the shop. This is the accessibility point the concept doc says matters
 * more here than anywhere else in the set.
 */
export function names(product, { tag = 'h3', cls = 't-3' } = {}) {
  const faces = bothFaces(product, lang());
  if (!faces.length) return '';

  const [here, there] = faces;

  const one = (face, extra = '') =>
    `<span class="names__${face.lang === 'fr' ? 'fr' : 'en'}${extra}" lang="${esc(
      bcp47(face.lang)
    )}">${esc(face.name)}</span>`;

  /* When both names are the same word — tourtière, butter tart — showing it
     twice with a rule between is just noise. One name, and the kin note
     explains why it did not change. */
  const same = there && here.name === there.name;

  return `
    <${tag} class="names ${cls}">
      ${one(here)}
      ${there && !same ? `<span class="names__rule" aria-hidden="true"></span>${one(there, ' names__other')}` : ''}
    </${tag}>`;
}

/**
 * The photograph on a plate.
 *
 * Enamelware has no bevel and no shadow, so the picture is not inset or
 * rounded: it runs edge to edge and the rim below it is the division, the
 * same 2px line that separates everything else here.
 *
 * The alt text is bilingual like the names, because a photograph described
 * only in French is exactly the half-built bilingualism this template is
 * arguing against.
 */
export function shot(product, { eager = false, size = 'md' } = {}) {
  const img = product.image;
  if (!img) return '';

  const which = lang();

  return `
    <img class="shot" src="assets/img/${esc(img.src)}-${esc(size)}.jpg"
         alt="${esc(t(img.alt, which))}"
         ${eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"'}>`;
}

/**
 * One product, on a plate.
 *
 * `--bare` on the ground, filled on a band: the caller says which, because
 * only --ink reads on wheat and a filled plate is the only way to get a
 * second ink. See tokens.css rule one.
 */
export function plate(product, { merchant, bare = false } = {}) {
  const which = lang();
  const faces = bothFaces(product, which);
  if (!faces.length) return '';
  const [here] = faces;

  return `
    <article class="plate ${bare ? 'plate--bare' : ''} card${
      product.image ? ' card--shot' : ''
    }">
      ${shot(product)}
      <div class="card__body">
        ${names(product)}
        ${
          here.subtitle
            ? `<p class="card__sub sm" lang="${esc(bcp47(which))}">${esc(here.subtitle)}</p>`
            : ''
        }
      </div>

      <p class="card__price money">
        ${product.options?.length ? `<span class="card__from sm">${which === 'fr' ? 'à partir de ' : 'from '}</span>` : ''}${esc(
          money(product.price, merchant, which)
        )}
      </p>

      <a class="card__link" href="product.html?id=${encodeURIComponent(product.id)}">
        <span class="vh">${esc(here.name)}</span>
      </a>
    </article>`;
}

/**
 * The kin note — how the two names differ, or why they do not.
 *
 * Only rendered where the data carries one. A product with a single name in
 * both languages has nothing to explain, and inventing a difference would be
 * worse than having none.
 */
export function kin(product) {
  if (!differs(product)) return '';
  const which = lang();
  const note = kinOf(product, which);
  if (!note) return '';

  return `
    <aside class="kin plate plate--2" lang="${esc(bcp47(which))}">
      <p class="label dim">${which === 'fr' ? 'Les deux noms' : 'Both names'}</p>
      <p class="kin__text" style="margin-top:var(--s-2)">${esc(note)}</p>
    </aside>`;
}

/** A stack of plates. */
export function stack(products, { merchant, bare = false } = {}) {
  return `<div class="stack-plates">${products
    .map((p) => plate(p, { merchant, bare }))
    .join('')}</div>`;
}

export { money };
