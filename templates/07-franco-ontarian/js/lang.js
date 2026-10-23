/**
 * @file The two names.
 *
 * This template's signature, and the equivalent of Template 06's `year.js`:
 * pure, DOM-free, and testable without a browser.
 *
 * The idea it encodes is a fact about the food rather than a design flourish.
 * The butter tart descends from the tarte au sucre — women in New France
 * adapted French sugar pie to what they had, which was maple, and the
 * English-Canadian version sweetened with brown sugar became the butter
 * tart. So the two names are RELATIVES, NOT TRANSLATIONS.
 *
 * Everything here follows from that:
 *
 *   - A product has a `fr` face and an `en` face, and neither is a
 *     translation of the other. They may differ in name, in description and
 *     in what is actually in the thing.
 *   - Switching language therefore does not "translate the page". It changes
 *     which face is forward. `faceOf()` is the whole of that.
 *   - Where the two faces are genuinely different things, `kin` says how.
 *     Where a product has only one name — a tourtière is a tourtière in both
 *     languages — there is no kin and saying so would be inventing a
 *     difference.
 *
 * Nothing in this file knows what a page looks like.
 */

/** The two languages, in the order the switch shows them. */
export const LANGS = ['fr', 'en'];

/** The language the site opens in.
 *
 * French. It is a Franco-Ontarian bakery, and opening in English would
 * undercut the entire premise — the switch is visible immediately so nobody
 * is stuck. Flagged as an open question in the concept doc; this is the
 * answer until the client says otherwise.
 */
export const DEFAULT_LANG = 'fr';

/** @param {string} lang @returns {boolean} */
export const isLang = (lang) => LANGS.includes(lang);

/** The one that is not this one. With two languages this is the switch. */
export const other = (lang) => (lang === 'fr' ? 'en' : 'fr');

/**
 * Narrow anything to a language we actually have.
 *
 * Takes a stored preference, a URL parameter or `navigator.language` and
 * returns something safe. `fr-CA`, `fr` and `FR` all mean French; anything
 * else means the default rather than an error, because a bad value in
 * localStorage should not be able to blank the site.
 */
export function pick(...candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const tag = String(candidate).toLowerCase().split('-')[0];
    if (isLang(tag)) return tag;
  }
  return DEFAULT_LANG;
}

/**
 * The face of a product in one language.
 *
 * Returns `null` rather than a half-built object when the face is missing,
 * so a product that has not been written in both languages fails loudly in a
 * test instead of rendering an empty heading in production.
 *
 * @param {object} product
 * @param {string} lang
 * @returns {{name:string, subtitle?:string, description?:string, lang:string}|null}
 */
export function faceOf(product, lang) {
  if (!product || !isLang(lang)) return null;
  const face = product[lang];
  if (!face || !face.name) return null;
  return { ...face, lang };
}

/**
 * Both faces, in display order, with the current language first.
 *
 * Product headings carry BOTH names at the same size with a rule between
 * them — neither is a subtitle. That typographic decision is the concept,
 * so the data layer hands both over rather than making the page ask twice.
 */
export function bothFaces(product, lang) {
  const here = faceOf(product, lang);
  const there = faceOf(product, other(lang));
  if (!here) return [];
  return there ? [here, there] : [here];
}

/**
 * Do the two faces name genuinely different things?
 *
 * A tourtière is a tourtière in both languages: same word, same pie, no
 * difference to explain. A tarte au sucre and a butter tart are relatives
 * with different fillings. Only the second gets a `kin` note, and only when
 * the data actually carries one — this never invents a difference.
 */
export function differs(product) {
  return Boolean(product?.kin?.fr && product?.kin?.en);
}

/** The kin note in one language, or null. */
export function kinOf(product, lang) {
  if (!differs(product) || !isLang(lang)) return null;
  return product.kin[lang];
}

/**
 * The accessible name for the language switch, IN BOTH LANGUAGES.
 *
 * Deliberately not a flag. Flags are countries, not languages, and
 * Franco-Ontarians are not French — putting a tricolore on this control
 * would be wrong about the people it is for. It is a word, and the word is
 * legible to a speaker of either language before they switch.
 */
export function switchLabel(lang) {
  const to = other(lang);
  return to === 'fr'
    ? { text: 'Français', label: 'Afficher en français — switch to French', to }
    : { text: 'English', label: 'Switch to English — afficher en anglais', to };
}

/**
 * The BCP 47 tag for an element holding this language.
 *
 * `fr-CA`, not `fr`. The French of Hearst is Canadian French, and a screen
 * reader that picks a Parisian voice for a northern Ontario bakery is making
 * the same mistake the flag would.
 */
export const bcp47 = (lang) => (lang === 'fr' ? 'fr-CA' : 'en-CA');
