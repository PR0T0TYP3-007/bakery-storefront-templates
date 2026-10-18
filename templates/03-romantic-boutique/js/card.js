/**
 * @file The card model. Pure, DOM-free, tested.
 *
 * Research for this template (docs/03-romantic-boutique.md §2) found the same
 * thing at every shop that sells a cake with a message on it: the words are
 * the product, and the words are a text input at the end of checkout.
 * Konditor gives you `0/120` and no preview. Cutter & Squidge takes the note
 * on a separate page after you have paid, inside a one-hour window, and asks
 * you to remember to sign it.
 *
 * A character counter cannot see the thing that actually goes wrong. `0/120`
 * says you have room. It does not say that your message lands on four lines,
 * that the card holds three, or that the longest word in it is wider than the
 * card is. The customer finds that out when the recipient does.
 *
 * So this models the physical object: a stock with a real number of lines, a
 * pen with a real width, and what the shop does when it does not fit — which
 * is to write smaller once, and then to say so.
 *
 * It is deliberately *not* in shared/core/. D12 set the rule the hard way: a
 * module moves to shared when a second template needs it, not in
 * anticipation. One template writes cards.
 */

/**
 * The two hands. Writing smaller is the shop's first move when a message is
 * long, and it buys both more characters per line and more lines — which is
 * why this is a pair of whole configurations rather than a scale factor.
 * Overridden per merchant from `merchant.card`.
 */
export const HANDS = {
  normal: { id: 'normal', label: 'our usual hand', perLine: 26, lines: 6 },
  small: { id: 'small', label: 'a smaller hand', perLine: 34, lines: 8 },
};

/**
 * What a nib can put on card stock. Letters of any alphabet with their
 * accents, numbers, spaces and ordinary punctuation.
 *
 * Accents are in deliberately: a Konditor review praises a message written in
 * Spanish, and a shop that writes by hand can obviously write á. Emoji are
 * out just as deliberately — and saying so is better than dropping them
 * silently, which is what a text input does.
 */
const WRITABLE = /[\p{L}\p{N}\p{M}\s'’‘"“”&,.!?()\-–—:;/+*#£€$%@]/u;

/** @param {object} merchant @returns {{normal:object, small:object}} */
export function handsFor(merchant) {
  const c = merchant?.card ?? {};
  return {
    normal: { ...HANDS.normal, ...(c.normal ?? {}) },
    small: { ...HANDS.small, ...(c.small ?? {}) },
  };
}

/**
 * Tidy what someone typed without changing what they said.
 *
 * Runs of spaces collapse and trailing space goes, because a pen does not
 * reproduce them. Deliberate line breaks are kept — "Happy birthday" on one
 * line and "— Dad" on the next is a decision, not an accident — but a run of
 * blank lines collapses to one, since a card has no room for a gap of four.
 * @param {string} text
 */
export function normalise(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim();
}

/**
 * The distinct characters in this message the shop cannot write, in the order
 * they appear. Empty when there are none.
 * @param {string} text @returns {string[]}
 */
export function unwritable(text) {
  const bad = [];
  // Iterating the string iterates by code point, so an emoji made of a
  // surrogate pair is reported once and whole rather than as two broken
  // halves the customer cannot find in their own message.
  for (const ch of normalise(text)) {
    if (WRITABLE.test(ch)) continue;
    if (!bad.includes(ch)) bad.push(ch);
  }
  return bad;
}

/**
 * Break a message into the lines a pen would make at this measure.
 *
 * Greedy at word boundaries, because that is what a person writing does —
 * they fill the line and start the next word below. A browser can hyphenate
 * mid-word; a pen will not, so a single word wider than the measure is a
 * problem that has to be named rather than silently broken.
 *
 * @param {string} text
 * @param {number} perLine
 * @returns {{lines:string[], tooLong:string[]}}
 */
export function wrap(text, perLine) {
  const lines = [];
  const tooLong = [];

  for (const para of normalise(text).split('\n')) {
    if (!para) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of para.split(' ')) {
      if (word.length > perLine && !tooLong.includes(word)) tooLong.push(word);

      if (!current) {
        current = word;
      } else if (current.length + 1 + word.length <= perLine) {
        current += ` ${word}`;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }

  return { lines, tooLong };
}

/**
 * How many characters have to come off the *message* before the card fits.
 *
 * Binary search over the message length rather than an estimate, because
 * "cut about forty characters" is the same unhelpful guess the character
 * counter already offers. Word wrapping is not linear in length — removing
 * one character can remove a whole line — so the only honest way to answer
 * is to try.
 *
 * It searches the message alone, holding the greeting and the signature
 * fixed. A first version searched the whole laid-out card, which gave a
 * number that was correct about the object and useless to the person: they
 * cannot take four characters off "Dear Mara,", and trimming the end of the
 * card would have eaten their own name off the bottom.
 *
 * @param {{greeting:string, message:string, signature:string}} parts
 * @param {{perLine:number, lines:number}} hand
 * @returns {number} characters to remove from the message, 0 when it fits
 */
function cutNeeded(parts, hand) {
  const assemble = (message) =>
    [parts.greeting, message, parts.signature].filter(Boolean).join('\n');

  const fitsWith = (message) => wrap(assemble(message), hand.perLine).lines.length <= hand.lines;

  const body = parts.message;
  if (fitsWith(body)) return 0;

  // Largest number of characters we can keep. Shorter always fits sooner, so
  // the predicate is monotonic and a bisection is sound.
  let lo = 0;
  let hi = body.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (fitsWith(body.slice(0, mid))) lo = mid;
    else hi = mid - 1;
  }
  return Math.max(1, body.length - lo);
}

/**
 * @typedef {object} CardLayout
 * @property {'none'|'empty'|'set'} state   none: no card. empty: a card with
 *   no words on it, which is a different and recoverable thing.
 * @property {string[]} lines     the message as the pen will break it
 * @property {string} signature   the "— from" line, laid out separately
 * @property {object} hand        the hand it will be written in
 * @property {boolean} shrunk     true when the usual hand did not fit
 * @property {boolean} fits
 * @property {number} cut         characters to remove when it does not fit
 * @property {Array<{code:string, text:string, detail?:string}>} problems
 * @property {Array<{code:string, text:string}>} notes
 */

/**
 * Lay a card out, and say honestly what will happen to it.
 *
 * @param {{to?:string, message?:string, from?:string}|null} card
 * @param {object} merchant
 * @returns {CardLayout}
 */
export function layoutCard(card, merchant) {
  const hands = handsFor(merchant);
  const blank = {
    lines: [],
    signature: '',
    hand: hands.normal,
    shrunk: false,
    fits: true,
    cut: 0,
    problems: [],
    notes: [],
  };

  if (!card) return { ...blank, state: 'none' };

  const to = normalise(card.to);
  const message = normalise(card.message);
  const from = normalise(card.from);

  if (!to && !message && !from) return { ...blank, state: 'empty' };

  const problems = [];
  const notes = [];

  const cannot = unwritable([to, message, from].join('\n'));
  if (cannot.length) {
    problems.push({
      code: 'unwritable',
      text: `We cannot write ${cannot.map((c) => `"${c}"`).join(', ')} by hand.`,
      detail: 'Accents are fine — emoji and symbols are not. Take them out and the rest is unchanged.',
    });
  }

  // The greeting and the signature occupy lines of their own on the card, so
  // they come out of the same budget as the message.
  const greeting = to ? `Dear ${to},` : '';
  const signature = from ? `— ${from}` : '';
  const used = [greeting, message, signature].filter(Boolean).join('\n');

  let hand = hands.normal;
  let laid = wrap(used, hand.perLine);
  let shrunk = false;

  if (laid.lines.length > hand.lines) {
    hand = hands.small;
    laid = wrap(used, hand.perLine);
    shrunk = true;
  }

  const fits = laid.lines.length <= hand.lines && laid.tooLong.length === 0;

  if (laid.tooLong.length) {
    problems.push({
      code: 'too-wide',
      text: `"${laid.tooLong[0]}" is wider than the card.`,
      detail: 'A pen cannot break a word in half the way a screen can.',
    });
  }

  const cut =
    laid.lines.length > hand.lines ? cutNeeded({ greeting, message, signature }, hand) : 0;
  if (cut) {
    problems.push({
      code: 'too-long',
      text: `This is ${laid.lines.length} lines and the card holds ${hand.lines}.`,
      detail: `Take out about ${cut} character${cut === 1 ? '' : 's'} and it fits.`,
    });
  }

  if (shrunk && !cut) {
    notes.push({ code: 'shrunk', text: `Long for one card, so we will write it in ${hand.label}.` });
  }

  // Cutter & Squidge instruct customers to "remember to include in your note
  // who the gift is from", which is a shop telling you about its own bug.
  // Saying it once, where the signature goes, costs nothing and is not a
  // blocker — an unsigned card is a real choice, and sometimes the point.
  if (message && !from) {
    notes.push({ code: 'unsigned', text: 'Nothing signed. We will write it exactly as it is.' });
  }

  if (!message && (to || from)) {
    notes.push({ code: 'no-message', text: 'A name and nothing else. That is allowed.' });
  }

  return {
    state: 'set',
    lines: laid.lines,
    signature,
    hand,
    shrunk,
    fits,
    cut,
    problems,
    notes,
  };
}

/**
 * One line for a basket row or a receipt. Not the card — a reminder of it.
 * @param {object|null} card
 */
export function cardSummary(card) {
  if (!card) return '';
  const to = normalise(card.to);
  const message = normalise(card.message);
  if (!to && !message) return '';
  const first = message.split('\n')[0] ?? '';
  const short = first.length > 48 ? `${first.slice(0, 47).trimEnd()}…` : first;
  return [to ? `To ${to}` : '', short ? `“${short}”` : ''].filter(Boolean).join(' · ');
}

/**
 * Whether anything was actually written. `meta.card` existing is not the same
 * as a card being written, and a line with an empty card should not claim one.
 */
export function hasCard(card) {
  if (!card) return false;
  return Boolean(normalise(card.to) || normalise(card.message) || normalise(card.from));
}

/**
 * The piped inscription, laid out the way it will sit on the cake.
 *
 * Separate from the card and governed by the product, because a plaque is a
 * different object from a card: fewer lines, a wider pen, and the shop pipes
 * it in buttercream rather than writing it in ink.
 *
 * @param {string} text @param {object} product
 */
export function layoutInscription(text, product) {
  const plaque = product?.plaque ?? { perLine: 18, lines: 2 };
  const laid = wrap(text, plaque.perLine);
  return {
    lines: laid.lines.filter(Boolean),
    fits: laid.lines.filter(Boolean).length <= plaque.lines && laid.tooLong.length === 0,
    tooLong: laid.tooLong,
    plaque,
  };
}
