/**
 * Tests for the two-names layer, and for the shipped bilingual config.
 *
 * The failure mode this template has that the others do not: a product
 * written in one language and not the other renders a blank heading, and
 * nothing throws. It looks like a styling bug and it is a data bug. These
 * read the real JSON for that reason.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  LANGS,
  DEFAULT_LANG,
  isLang,
  other,
  pick,
  faceOf,
  bothFaces,
  differs,
  kinOf,
  switchLabel,
  bcp47,
} from '../js/lang.js';

const read = (rel) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));

const merchant = read('../data/merchant.boulangerie-tremblay.json');
const catalogue = read('../data/products.boulangerie-tremblay.json');

/* -------------------------------------------------------------------------
   The pure layer
   ------------------------------------------------------------------------- */
test('the two languages are fr and en, and French leads', () => {
  assert.deepEqual(LANGS, ['fr', 'en']);
  assert.equal(DEFAULT_LANG, 'fr');
  assert.ok(isLang('fr') && isLang('en'));
  assert.ok(!isLang('de') && !isLang('') && !isLang(undefined));
});

test('other() is the switch', () => {
  assert.equal(other('fr'), 'en');
  assert.equal(other('en'), 'fr');
});

test('pick() narrows anything to a language we have', () => {
  assert.equal(pick('en'), 'en');
  assert.equal(pick('fr-CA'), 'fr');
  assert.equal(pick('EN-GB'), 'en');

  /* The point of this function: a junk value must not be able to blank the
     site. Everything unrecognised falls through to the default. */
  assert.equal(pick('de'), 'fr');
  assert.equal(pick(null, undefined, ''), 'fr');
  assert.equal(pick('{}'), 'fr');

  /* First usable candidate wins, so a stored choice beats a browser guess. */
  assert.equal(pick(null, 'en', 'fr'), 'en');
});

test('faceOf() returns null rather than a half-built face', () => {
  const p = { fr: { name: 'Beigne' }, en: { name: 'Doughnut' } };
  assert.equal(faceOf(p, 'fr').name, 'Beigne');
  assert.equal(faceOf(p, 'fr').lang, 'fr');

  assert.equal(faceOf(p, 'de'), null);
  assert.equal(faceOf(null, 'fr'), null);
  assert.equal(faceOf({ fr: {} }, 'fr'), null, 'a face with no name is not a face');
  assert.equal(faceOf({ en: { name: 'x' } }, 'fr'), null);
});

test('bothFaces() puts the current language first', () => {
  const p = { fr: { name: 'Tarte au sucre' }, en: { name: 'Butter tart' } };
  assert.deepEqual(bothFaces(p, 'fr').map((f) => f.name), ['Tarte au sucre', 'Butter tart']);
  assert.deepEqual(bothFaces(p, 'en').map((f) => f.name), ['Butter tart', 'Tarte au sucre']);
  assert.deepEqual(bothFaces({ fr: { name: 'x' } }, 'fr').map((f) => f.name), ['x']);
  assert.deepEqual(bothFaces(null, 'fr'), []);
});

test('differs() never invents a difference', () => {
  assert.ok(differs({ kin: { fr: 'a', en: 'b' } }));
  assert.ok(!differs({ kin: null }));
  assert.ok(!differs({ kin: { fr: 'a' } }), 'half a kin note is not a difference');
  assert.ok(!differs({}));
  assert.equal(kinOf({ kin: null }, 'fr'), null);
});

test('the language switch is a word in both languages, never a flag', () => {
  for (const lang of LANGS) {
    const s = switchLabel(lang);
    assert.equal(s.to, other(lang));
    assert.ok(s.text.length > 0);

    /* The accessible name has to be legible to a speaker of EITHER language,
       because somebody who cannot read the current one is exactly who needs
       the control. So it says the thing twice. */
    assert.ok(s.label.includes('—'), 'the label should carry both languages');
    assert.ok(s.label.length > s.text.length);
  }
});

test('the language tags are Canadian', () => {
  assert.equal(bcp47('fr'), 'fr-CA');
  assert.equal(bcp47('en'), 'en-CA');
});

/* -------------------------------------------------------------------------
   The shipped config
   ------------------------------------------------------------------------- */
test('every product has a complete face in both languages', () => {
  for (const p of catalogue.products) {
    for (const lang of LANGS) {
      const face = faceOf(p, lang);
      assert.ok(face, `"${p.id}" has no usable ${lang} face`);
      assert.ok(face.name.trim(), `"${p.id}" has an empty ${lang} name`);
      assert.ok(
        face.subtitle && face.subtitle.trim(),
        `"${p.id}" has no ${lang} subtitle`
      );
      assert.ok(
        face.description && face.description.trim().length > 20,
        `"${p.id}" has no real ${lang} description`
      );
    }
  }
});

test('the two faces are not machine translations of each other', () => {
  /* The concept is that these are relatives, not translations. If a French
     and an English description are the same string, somebody has pasted
     rather than written. */
  for (const p of catalogue.products) {
    assert.notEqual(
      p.fr.description,
      p.en.description,
      `"${p.id}" has the same description in both languages`
    );
  }
});

test('kin notes come in pairs or not at all', () => {
  for (const p of catalogue.products) {
    if (p.kin === null) continue;
    assert.ok(p.kin.fr && p.kin.en, `"${p.id}" has half a kin note`);
    assert.notEqual(p.kin.fr, p.kin.en, `"${p.id}" has the same kin note twice`);
  }
});

test('at least one product shares a name across the two languages', () => {
  /* The tourtière and the butter tart are the point of the exception: not
     everything renames. If this ever fails, the catalogue has drifted into
     "every item is a clever pun", which is the novelty trap. */
  const same = catalogue.products.filter((p) => p.fr.name === p.en.name);
  assert.ok(same.length >= 1, 'no product keeps its name in both languages');
});

test('every category, option and addon is written in both languages', () => {
  const bilingual = (v, what) => {
    assert.ok(v && typeof v === 'object', `${what} is not bilingual`);
    for (const lang of LANGS) {
      assert.ok(lang in v, `${what} has no ${lang}`);
    }
  };

  for (const c of catalogue.categories) bilingual(c.label, `category ${c.id}`);
  for (const [id, g] of Object.entries(catalogue.optionGroups)) {
    bilingual(g.label, `option group ${id}`);
    for (const o of g.options) bilingual(o.label, `option ${id}.${o.id}`);
  }
  for (const a of catalogue.addons) bilingual(a.label, `addon ${a.id}`);
});

test('the merchant speaks both languages everywhere it speaks at all', () => {
  bilingualDeep(merchant.taxNote, 'taxNote');
  bilingualDeep(merchant.allergens, 'allergens');
  bilingualDeep(merchant.allergenStatement, 'allergenStatement');
  bilingualDeep(merchant.voice.headline, 'voice.headline');
  bilingualDeep(merchant.voice.lede, 'voice.lede');
  bilingualDeep(merchant.voice.kicker, 'voice.kicker');
  bilingualDeep(merchant.voice.shop.head, 'voice.shop.head');
  bilingualDeep(merchant.voice.shop.body, 'voice.shop.body');

  for (const e of merchant.year) {
    bilingualDeep(e.day, `year ${e.id} day`);
    if (e.note) bilingualDeep(e.note, `year ${e.id} note`);
  }

  function bilingualDeep(v, what) {
    assert.ok(v && typeof v === 'object', `${what} is not bilingual`);
    for (const lang of LANGS) {
      assert.ok(v[lang] !== undefined && v[lang] !== null, `${what} has no ${lang}`);
    }
  }
});

test('every year entry points at a product that exists', () => {
  const ids = new Set(catalogue.products.map((p) => p.id));
  for (const e of merchant.year) {
    assert.ok(ids.has(e.productId), `year "${e.id}" points at missing "${e.productId}"`);
  }
});

test('closed weekdays are numbers and agree with the printed hours', () => {
  /* The same bug Template 06 shipped: fulfilment.js compares Date#getDay(),
     a number, and a list of day NAMES silently never matches. */
  const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const d of merchant.closedWeekdays) {
    assert.equal(typeof d, 'number', `closedWeekdays holds ${JSON.stringify(d)}`);
  }

  const byNumber = [...merchant.closedWeekdays].sort();
  const byHours = merchant.hours
    .filter((h) => !h.open)
    .map((h) => WEEK.indexOf(h.day))
    .sort();

  assert.deepEqual(byNumber, byHours);
});

test('the savoury line carries no sweet-only machinery', () => {
  /* Open question 4 from the concept doc: the set has only sold sweet things
     so far. A tourtière has no inscription and no occasion, and the shared
     commerce layer must not need special-casing for that. */
  const savoury = catalogue.products.filter((p) => p.category === 'sale');
  assert.ok(savoury.length >= 1, 'no savoury product to check');

  for (const p of savoury) {
    assert.ok(!('inscription' in p), `"${p.id}" carries an inscription field`);
    assert.ok(!('occasions' in p), `"${p.id}" carries occasions`);
    assert.ok(Array.isArray(p.options), `"${p.id}" has no options array`);
  }
});
