/**
 * @file The chosen language, and the DOM side of it.
 *
 * `js/lang.js` is pure and decides *what* a language means. This decides
 * which one is current, remembers it, and puts it on the document. Keeping
 * the two apart is why the first one could be tested without a browser.
 */

import {
  LANGS,
  DEFAULT_LANG,
  isLang,
  other,
  pick,
  bcp47,
  switchLabel,
} from '../lang.js';

const KEY = 'tremblay:lang';

/**
 * Everything that might know the reader's language, best first.
 *
 * `navigator.language` is deliberately NOT consulted, and that is a real
 * decision rather than an oversight. This is a Franco-Ontarian bakery and
 * the concept doc is explicit that French leads; honouring the browser
 * would have opened in English for most visitors and quietly undone the
 * premise. The first build did exactly that — `navigator.language` was
 * `en-US`, so the page served English while `DEFAULT_LANG` said `fr`.
 *
 * The trade-off is accepted knowingly: the switch is in the header on every
 * page, it says "English" in English, and the choice is remembered. So only
 * an explicit choice — a `?lang=` link or a previous visit — moves it.
 */
function candidates() {
  const fromUrl = new URLSearchParams(location.search).get('lang');

  let stored = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    /* Private window, blocked storage. Not knowing is fine; guessing wrong
       and throwing is not. */
  }

  return [fromUrl, stored];
}

let current = pick(...candidates());

export const lang = () => current;
export const otherLang = () => other(current);

/**
 * Put the language on the document.
 *
 * `<html lang>` is the one that matters: it decides the voice a screen
 * reader uses for everything that does not override it, and `fr-CA` rather
 * than `fr` so the voice is Canadian. Individual bilingual elements set
 * their own `lang` in the markup — on this template that is every product
 * heading, which is why it gets its own class in base.css.
 */
function paint() {
  document.documentElement.lang = bcp47(current);
  document.documentElement.dataset.lang = current;
}

paint();

/**
 * Re-assert the language on the document.
 *
 * `shared/session.js` sets `document.documentElement.lang = merchant.locale`
 * when it boots — reasonable for the other six templates, where a merchant
 * has exactly one language. Here it lands AFTER this module's first paint
 * and stamps `fr-CA` over whatever the reader chose, so the page served
 * English with `<html lang="fr-CA">` on it: every screen reader would have
 * read the English copy in a French voice.
 *
 * Rather than change the shared layer for one template's sake, the chrome
 * calls this once after boot. It is idempotent.
 */
export const syncDocument = paint;

/** @param {string} next @returns {boolean} whether anything changed */
export function setLang(next) {
  if (!isLang(next) || next === current) return false;

  current = next;
  try {
    localStorage.setItem(KEY, current);
  } catch {
    /* Remembering is a convenience. Failing to remember is not an error. */
  }
  paint();
  listeners.forEach((fn) => fn(current));
  return true;
}

const listeners = new Set();

/** @param {(lang:string)=>void} fn @returns {()=>void} unsubscribe */
export function onLang(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Pick the right side of a bilingual value.
 *
 * Merchant and catalogue data is full of `{ fr, en }` pairs — tax notes,
 * allergen lists, category labels, the lot. This is the one place that
 * unwraps them, and it falls back to the other language rather than
 * rendering nothing, because a missing translation should degrade to the
 * wrong language rather than to a blank.
 */
export function t(value, which = current) {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return value;
  if (which in value) return value[which];
  const fallback = LANGS.find((l) => l in value);
  return fallback ? value[fallback] : null;
}

export { LANGS, DEFAULT_LANG, bcp47, switchLabel };
