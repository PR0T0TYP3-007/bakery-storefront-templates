/**
 * The card model's tests.
 *
 * They cover the claims the page makes to the customer: that the preview
 * breaks where the pen breaks, that a card which does not fit says how much
 * to cut, that writing smaller is tried before refusing, that a word too wide
 * for the stock is named, and that a character the shop cannot write is
 * reported rather than dropped.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  HANDS,
  handsFor,
  normalise,
  unwritable,
  wrap,
  layoutCard,
  cardSummary,
  hasCard,
  layoutInscription,
} from '../js/card.js';

/** A merchant with the default hands. */
const SHOP = { card: {} };

/* -------------------------------------------------------------------------
   normalise
   ------------------------------------------------------------------------- */

test('collapses runs of spaces a pen would not reproduce', () => {
  assert.equal(normalise('Happy    birthday'), 'Happy birthday');
});

test('keeps a deliberate line break but not a run of them', () => {
  assert.equal(normalise('Happy birthday\n\n\n\n— Dad'), 'Happy birthday\n\n— Dad');
});

test('trims each line, so trailing space never becomes a wrap', () => {
  assert.equal(normalise('  one  \n  two  '), 'one\ntwo');
});

/* -------------------------------------------------------------------------
   What a pen can write
   ------------------------------------------------------------------------- */

test('accents are writable — a hand that pipes Spanish can write á', () => {
  assert.deepEqual(unwritable('Feliz cumpleaños, cariño'), []);
});

test('emoji are reported, not silently dropped', () => {
  assert.deepEqual(unwritable('Happy birthday 🎂'), ['🎂']);
});

test('an emoji is reported once and whole, not as two broken halves', () => {
  const bad = unwritable('🎂🎂 cake');
  assert.equal(bad.length, 1);
  assert.equal(bad[0], '🎂');
});

test('ordinary punctuation and currency are writable', () => {
  assert.deepEqual(unwritable(`Love & kisses — "all of it", 100% (£5)`), []);
});

/* -------------------------------------------------------------------------
   Wrapping
   ------------------------------------------------------------------------- */

test('wraps greedily at word boundaries, the way a hand does', () => {
  const { lines } = wrap('one two three four five six', 9);
  assert.deepEqual(lines, ['one two', 'three', 'four five', 'six']);
});

test('no produced line is wider than the measure', () => {
  const { lines } = wrap(
    'Many happy returns and all of the love in the world from everyone here',
    26
  );
  for (const l of lines) assert.ok(l.length <= 26, `"${l}" is ${l.length}`);
});

test('a word wider than the measure is named rather than broken', () => {
  const { tooLong } = wrap('Congratulations Antidisestablishmentarianism', 20);
  assert.deepEqual(tooLong, ['Antidisestablishmentarianism']);
});

test('a deliberate break starts a new line even when there is room', () => {
  const { lines } = wrap('Hi\nthere', 40);
  assert.deepEqual(lines, ['Hi', 'there']);
});

/* -------------------------------------------------------------------------
   Laying out a card
   ------------------------------------------------------------------------- */

test('no card and an empty card are different states', () => {
  assert.equal(layoutCard(null, SHOP).state, 'none');
  assert.equal(layoutCard({ to: '', message: '', from: '' }, SHOP).state, 'empty');
});

test('a short card fits in the usual hand and is not shrunk', () => {
  const out = layoutCard({ to: 'Mara', message: 'Happy birthday.', from: 'Dad' }, SHOP);
  assert.equal(out.state, 'set');
  assert.equal(out.fits, true);
  assert.equal(out.shrunk, false);
  assert.equal(out.hand.id, 'normal');
  assert.equal(out.problems.length, 0);
});

test('the greeting and the signature take lines of their own', () => {
  const out = layoutCard({ to: 'Mara', message: 'Hello.', from: 'Dad' }, SHOP);
  assert.deepEqual(out.lines, ['Dear Mara,', 'Hello.', '— Dad']);
  assert.equal(out.signature, '— Dad');
});

test('a long card is written smaller before it is refused', () => {
  const message = 'I hope this year is kinder than the last one was, and that you get everything you have been quietly hoping for.';
  const out = layoutCard({ to: 'Mara', message, from: 'Dad' }, SHOP);
  assert.equal(out.shrunk, true);
  assert.equal(out.hand.id, 'small');
  assert.equal(out.fits, true);
  assert.ok(out.notes.some((n) => n.code === 'shrunk'));
});

test('the laid-out card never exceeds the lines the stock holds', () => {
  const out = layoutCard(
    { to: 'Mara', message: 'one two three four five six seven eight', from: 'Dad' },
    SHOP
  );
  if (out.fits) assert.ok(out.lines.length <= out.hand.lines);
});

test('a card that will not fit says how many characters to cut', () => {
  const message = Array.from({ length: 40 }, () => 'something').join(' ');
  const out = layoutCard({ to: 'Mara', message, from: 'Dad' }, SHOP);
  assert.equal(out.fits, false);
  assert.ok(out.cut > 0, 'should name a number of characters');
  assert.ok(out.problems.some((p) => p.code === 'too-long'));
});

test('the number of characters to cut is enough to make it fit', () => {
  const message = Array.from({ length: 30 }, () => 'together').join(' ');
  const card = { to: 'Mara', message, from: 'Dad' };
  const out = layoutCard(card, SHOP);
  assert.equal(out.fits, false);

  // Taking exactly what it asked for off the end has to work, or the number
  // is the same unhelpful guess a character counter already gives.
  const body = normalise(message);
  const trimmed = { ...card, message: body.slice(0, Math.max(0, body.length - out.cut)) };
  assert.equal(layoutCard(trimmed, SHOP).fits, true);
});

test('a word too wide for the card is a problem even when the card is short', () => {
  const out = layoutCard({ message: 'Congratulations Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch' }, SHOP);
  assert.equal(out.fits, false);
  assert.ok(out.problems.some((p) => p.code === 'too-wide'));
});

test('an unsigned card is noted, never blocked', () => {
  const out = layoutCard({ to: 'Mara', message: 'Happy birthday.' }, SHOP);
  assert.equal(out.fits, true);
  assert.equal(out.problems.length, 0);
  assert.ok(out.notes.some((n) => n.code === 'unsigned'));
});

test('an unwritable character is a problem and names itself', () => {
  const out = layoutCard({ message: 'Happy birthday 🎂' }, SHOP);
  assert.ok(out.problems.some((p) => p.code === 'unwritable' && p.text.includes('🎂')));
});

test('a merchant can set its own stock and its own hands', () => {
  const tiny = { card: { normal: { perLine: 10, lines: 2 }, small: { perLine: 12, lines: 3 } } };
  const hands = handsFor(tiny);
  assert.equal(hands.normal.perLine, 10);
  // The label is inherited, so a merchant overriding the measure does not
  // have to restate the shop's own wording for it.
  assert.equal(hands.normal.label, HANDS.normal.label);

  const out = layoutCard({ message: 'one two three four five six seven' }, tiny);
  assert.equal(out.fits, false);
});

test('laying out the same card twice gives the same card', () => {
  const card = { to: 'Mara', message: 'Many happy returns, and love from all of us here.', from: 'Dad' };
  assert.deepEqual(layoutCard(card, SHOP), layoutCard(card, SHOP));
});

/* -------------------------------------------------------------------------
   Summaries
   ------------------------------------------------------------------------- */

test('hasCard is about what was written, not about the object existing', () => {
  assert.equal(hasCard(null), false);
  assert.equal(hasCard({ to: '', message: '   ', from: '' }), false);
  assert.equal(hasCard({ message: 'x' }), true);
});

test('a basket summary names the recipient and quotes the opening', () => {
  const s = cardSummary({ to: 'Mara', message: 'Happy birthday, from all of us.' });
  assert.ok(s.includes('To Mara'));
  assert.ok(s.includes('Happy birthday'));
});

test('a long summary is cut with an ellipsis rather than wrapping a basket row', () => {
  const s = cardSummary({ message: 'x'.repeat(200) });
  assert.ok(s.length < 60, s);
  assert.ok(s.includes('…'));
});

/* -------------------------------------------------------------------------
   The piped inscription — a different object from the card
   ------------------------------------------------------------------------- */

test('the plaque has its own measure, taken from the product', () => {
  const out = layoutInscription('Happy birthday Mara', { plaque: { perLine: 10, lines: 2 } });
  assert.deepEqual(out.lines, ['Happy', 'birthday', 'Mara']);
  assert.equal(out.fits, false);
});

test('a product with no plaque falls back rather than crashing', () => {
  const out = layoutInscription('Happy birthday', {});
  assert.equal(out.fits, true);
  assert.ok(out.plaque.perLine > 0);
});
