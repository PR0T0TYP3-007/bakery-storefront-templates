/**
 * Tests over the shipped config.
 *
 * The year is the template's whole idea, and it is wired by id. A year entry
 * pointing at a product that does not exist produces an empty shelf on the
 * right day of the year and nothing else — no error, no warning, and nobody
 * notices until Sant Joan. These read the real JSON rather than a fixture,
 * for the same reason Template 04's past-work tests do.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { dateOf, windowOf, occurrences, onNow } from '../js/year.js';

const read = (rel) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));

const merchant = read('../data/merchant.forn-de-la-placa.json');
const catalogue = read('../data/products.forn-de-la-placa.json');

const ids = new Set(catalogue.products.map((p) => p.id));

test('the config has a year and a catalogue', () => {
  assert.ok(merchant.year?.length > 5, 'year is missing or too short to be real');
  assert.ok(catalogue.products.length > 10);
});

test('every year entry points at a product that exists', () => {
  for (const e of merchant.year) {
    assert.ok(ids.has(e.productId), `year entry "${e.id}" points at missing product "${e.productId}"`);
  }
});

test('every year entry resolves to a real date', () => {
  for (const e of merchant.year) {
    const d = dateOf(e, 2026);
    assert.ok(d instanceof Date && !Number.isNaN(d.valueOf()),
      `year entry "${e.id}" does not resolve to a date`);
  }
});

test('every year entry has a sales window that opens before it closes', () => {
  for (const e of merchant.year) {
    const w = windowOf(e, 2026);
    assert.ok(w, `no window for "${e.id}"`);
    assert.ok(w.from <= w.on && w.on <= w.to,
      `"${e.id}" window is inside out: ${w.from} / ${w.on} / ${w.to}`);
  }
});

test('every calendar product is claimed by the year, and vice versa', () => {
  const claimed = new Set(merchant.year.map((e) => e.productId));
  for (const p of catalogue.products.filter((p) => p.kind === 'calendar')) {
    assert.ok(claimed.has(p.id),
      `"${p.id}" is a calendar product but no year entry sells it — it would never appear`);
  }
});

test('there is something on the bench on any day of the year', () => {
  /* Everyday products carry the shop when the calendar is quiet, but the
     calendar itself should not have long dead stretches either. This checks
     the softer claim: no month passes with nothing seasonal at all. */
  const monthsWithSomething = new Set();
  for (let m = 0; m < 12; m++) {
    for (const day of [1, 10, 20, 28]) {
      if (onNow(merchant.year, new Date(2026, m, day)).length) monthsWithSomething.add(m);
    }
  }
  const empty = [...Array(12).keys()].filter((m) => !monthsWithSomething.has(m));
  assert.ok(empty.length <= 4,
    `${empty.length} months have nothing seasonal at all: ${empty.join(', ')}`);
});

test('no two year entries collide on the same day', () => {
  /* Two feasts in one window is fine and real. Two entries resolving to the
     exact same date is almost always a copy-paste error in config. */
  const seen = new Map();
  for (const e of merchant.year) {
    const key = dateOf(e, 2026).toDateString();
    assert.ok(!seen.has(key),
      `"${e.id}" and "${seen.get(key)}" both fall on ${key}`);
    seen.set(key, e.id);
  }
});

test('allergens named on a product are declared by the merchant', () => {
  const declared = new Set(merchant.allergens);
  for (const p of catalogue.products) {
    for (const a of p.allergens ?? []) {
      assert.ok(declared.has(a),
        `"${p.id}" declares allergen "${a}" which the merchant does not list`);
    }
  }
});

test('the merchant is Catalan-locale and prices include tax', () => {
  assert.equal(merchant.locale, 'ca-ES');
  assert.equal(merchant.taxMode, 'inclusive',
    'Spanish consumer prices must be shown inclusive of IVA');
});

test('occurrences spans the year boundary in both directions', () => {
  const all = occurrences(merchant.year, new Date(2026, 11, 31));
  const years = new Set(all.map((o) => o.on.getFullYear()));
  assert.ok(years.has(2027), 'next year never appears');
  assert.ok(years.has(2026), 'this year disappears');
});

/**
 * Option prices are deltas, not sizes.
 *
 * `shared/core/pricing.js` adds the chosen option's price to the product's
 * own, and Template 05's data is written that way. This template's sizes
 * were first written as absolute prices, so a tortell cost its own price
 * plus the whole price of its size again — 22 € became 44 €, and the page
 * showed "NaN €" only because of a separate bug that happened to mask it.
 *
 * The convention has no schema to enforce it, so it has this.
 */
test('every option group is a ladder of deltas from zero', () => {
  for (const [id, group] of Object.entries(catalogue.optionGroups ?? {})) {
    const prices = group.options.map((o) => o.price ?? 0);

    assert.ok(prices.includes(0),
      `option group "${id}" has no zero option, so no size is the product's own price`);

    assert.ok(prices.every((n) => n >= 0),
      `option group "${id}" has a negative delta, which means the base price is not the cheapest`);

    assert.deepEqual([...prices].sort((a, b) => a - b), prices,
      `option group "${id}" is not ordered cheapest first`);
  }
});

test('no product is priced below its cheapest configuration', () => {
  for (const p of catalogue.products) {
    for (const groupId of p.options ?? []) {
      const group = catalogue.optionGroups[groupId];
      assert.ok(group, `"${p.id}" uses option group "${groupId}", which does not exist`);

      const cheapest = Math.min(...group.options.map((o) => o.price ?? 0));
      assert.ok(p.price + cheapest > 0,
        `"${p.id}" at its cheapest size costs ${p.price + cheapest}`);

      /* The shop tile prints "des de <price>", so the product price has to
         BE the cheapest configuration or that label is a lie. */
      assert.equal(cheapest, 0,
        `"${p.id}" has no size at its own price, so "des de" would understate it`);
    }
  }
});

test('every default names an option that exists', () => {
  for (const p of catalogue.products) {
    for (const [groupId, want] of Object.entries(p.defaults ?? {})) {
      const group = catalogue.optionGroups[groupId];
      assert.ok(group, `"${p.id}" defaults a group "${groupId}" that does not exist`);
      assert.ok(group.options.some((o) => o.id === want),
        `"${p.id}" defaults "${groupId}" to "${want}", which is not one of its options`);
    }
  }
});
