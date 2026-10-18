/**
 * @file Tests for the commission model.
 *
 * Run with `npm test` from this folder. The module is pure and DOM-free, so
 * it needs no framework, no jsdom and no transpiler.
 *
 * The thing worth testing is not "does it add up" but the four claims the
 * template makes to the customer on the page:
 *   - the price is firm and arithmetically checkable from the lines shown
 *   - a more ambitious brief multiplies, it does not add a fixed sum
 *   - lead time is honest about techniques happening one after another
 *   - the deposit is a share of the whole order, not of one line
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  priceCommission,
  priceAnyWith,
  orderTotalsWith,
  techniqueAvailable,
  techniqueAllowance,
  isCommission,
} from '../js/commission.js';
import { priceLine } from '../../../shared/core/pricing.js';

const merchant = {
  id: 'fold',
  taxRate: 0.07,
  taxMode: 'inclusive',
  commission: { minimum: 280, depositPct: 0.3, quoteValidDays: 14, perWeek: 4, setupFee: 180 },
  delivery: { freeOver: 900, zones: [{ id: 'a', fee: 25 }] },
};

const catalogue = {
  optionGroups: {
    scale: {
      id: 'scale',
      options: [
        { id: 's', label: '10 to 15', price: 280, serves: '10–15' },
        { id: 'm', label: '25 to 35', price: 420, serves: '25–35' },
        { id: 'l', label: '60 to 80', price: 720, serves: '60–80' },
      ],
    },
    ambition: {
      id: 'ambition',
      options: [
        { id: 'clean', label: 'Clean', price: 0, factor: 1.0, leadDays: 10, allows: 2 },
        { id: 'composed', label: 'Composed', price: 0, factor: 1.35, leadDays: 14, allows: 4 },
        { id: 'editorial', label: 'Editorial', price: 0, factor: 2.6, leadDays: 28, allows: 9 },
      ],
    },
    palette: { id: 'palette', options: [{ id: 'tonal', label: 'Tonal', price: 0 }] },
    boxsize: { id: 'boxsize', options: [{ id: '1', label: 'One', price: 0 }] },
  },
  addons: [
    { id: 'gold', label: 'Gold leaf', price: 150, leadDays: 1 },
    { id: 'flowers', label: 'Sugar flowers', price: 240, leadDays: 5 },
    { id: 'armature', label: 'Structural armature', price: 390, leadDays: 7 },
    { id: 'piped', label: 'Hand-piped detail', price: 90, leadDays: 2 },
  ],
  products: [
    {
      id: 'commission', kind: 'commission', name: 'A commission', price: 0, leadDays: 10,
      options: ['scale', 'ambition', 'palette'], defaults: { scale: 'm', ambition: 'composed', palette: 'tonal' },
    },
    {
      id: 'ed-sesame', kind: 'edition', name: 'Edition No.1', price: 85, leadDays: 4,
      options: ['boxsize'], defaults: { boxsize: '1' },
    },
  ],
};

const brief = (over = {}) => ({ scale: 'm', ambition: 'composed', palette: 'tonal', ...over });

/* ---------------------------------------------------------------------------
   The number is checkable
   --------------------------------------------------------------------------- */

test('the lines shown add up to the price quoted', () => {
  const p = priceCommission(merchant, catalogue, brief(), ['gold', 'flowers']);
  const summed = p.lines.reduce((n, l) => n + l.amount, 0);
  assert.equal(Math.round(summed * 100), Math.round(p.subtotal * 100),
    'a customer adding up the spec sheet must land on the quoted figure');
});

test('the lines still add up with set-up on site', () => {
  const p = priceCommission(merchant, catalogue, brief({ setup: true }), ['gold'], { setup: true });
  const summed = p.lines.reduce((n, l) => n + l.amount, 0);
  assert.equal(Math.round(summed * 100), Math.round(p.subtotal * 100));
  assert.equal(p.setup, 180);
});

test('scale 420 taken to Composed is 567, plus techniques at face value', () => {
  const p = priceCommission(merchant, catalogue, brief(), ['gold', 'flowers']);
  assert.equal(p.base, 420);
  assert.equal(p.factored, 567);          // 420 × 1.35
  assert.equal(p.techniqueTotal, 390);    // 150 + 240
  assert.equal(p.subtotal, 957);
});

/* ---------------------------------------------------------------------------
   Ambition multiplies
   --------------------------------------------------------------------------- */

test('ambition multiplies the scale rather than adding a fixed sum', () => {
  const small = priceCommission(merchant, catalogue, brief({ scale: 's' }), []);
  const large = priceCommission(merchant, catalogue, brief({ scale: 'l' }), []);

  const smallStep = priceCommission(merchant, catalogue, brief({ scale: 's', ambition: 'editorial' }), []).subtotal - small.subtotal;
  const largeStep = priceCommission(merchant, catalogue, brief({ scale: 'l', ambition: 'editorial' }), []).subtotal - large.subtotal;

  assert.ok(largeStep > smallStep * 2,
    'taking a big piece further must cost more than taking a small one further');
});

test('every ambition level is dearer than the one below it', () => {
  const prices = ['clean', 'composed', 'editorial'].map(
    (ambition) => priceCommission(merchant, catalogue, brief({ ambition }), []).subtotal
  );
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  assert.equal(new Set(prices).size, prices.length, 'no two levels cost the same');
});

/* ---------------------------------------------------------------------------
   Lead time is honest
   --------------------------------------------------------------------------- */

test('technique days add up rather than overlapping', () => {
  // One person builds the whole piece, so drying flowers and building an
  // armature happen one after the other.
  const p = priceCommission(merchant, catalogue, brief({ ambition: 'editorial' }), ['flowers', 'armature']);
  assert.equal(p.leadDays, 28 + 5 + 7);
});

test('a bare brief still carries its ambition notice', () => {
  assert.equal(priceCommission(merchant, catalogue, brief({ ambition: 'clean' }), []).leadDays, 10);
});

/* ---------------------------------------------------------------------------
   The minimum is stated, not hidden
   --------------------------------------------------------------------------- */

test('a brief under the minimum says so and by how much', () => {
  const p = priceCommission(merchant, catalogue, brief({ scale: 's', ambition: 'clean' }), []);
  assert.equal(p.subtotal, 280);
  assert.equal(p.belowMinimum, false, '280 is exactly the minimum, which is not below it');

  const cfg = { ...merchant, commission: { ...merchant.commission, minimum: 500 } };
  const under = priceCommission(cfg, catalogue, brief({ scale: 's', ambition: 'clean' }), []);
  assert.equal(under.belowMinimum, true);
  assert.equal(under.shortfall, 220);
});

/* ---------------------------------------------------------------------------
   Technique allowance
   --------------------------------------------------------------------------- */

test('ambition caps how many techniques a brief can carry', () => {
  assert.equal(techniqueAllowance(catalogue, brief({ ambition: 'clean' })), 2);
  assert.equal(techniqueAllowance(catalogue, brief({ ambition: 'editorial' })), 9);
});

test('a blocked technique explains itself and names the way out', () => {
  const sel = brief({ ambition: 'clean' });
  const chosen = ['gold', 'flowers'];

  assert.equal(techniqueAvailable(catalogue, sel, chosen, 'gold').ok, true, 'already chosen stays selectable');

  const blocked = techniqueAvailable(catalogue, sel, chosen, 'armature');
  assert.equal(blocked.ok, false);
  assert.match(blocked.reason, /Clean briefs take 2/);
  assert.match(blocked.reason, /Composed/, 'names the level that would allow it');
});

test('room remains below the allowance', () => {
  assert.equal(techniqueAvailable(catalogue, brief({ ambition: 'clean' }), ['gold'], 'piped').ok, true);
});

/* ---------------------------------------------------------------------------
   Living alongside ordinary products
   --------------------------------------------------------------------------- */

test('priceAnyWith dispatches on kind', () => {
  const commission = catalogue.products.find(isCommission);
  const edition = catalogue.products.find((p) => p.kind === 'edition');

  const a = priceAnyWith(priceLine, commission, brief(), ['gold'], 1, catalogue, merchant);
  assert.equal(a.total, 567 + 150);
  assert.ok(a.commission, 'a commission line carries its working');

  const b = priceAnyWith(priceLine, edition, { boxsize: '1' }, [], 2, catalogue, merchant);
  assert.equal(b.total, 170, 'an edition is priced by the shared additive model');
  assert.equal(b.commission, undefined);
});

test('quantity multiplies a commission too', () => {
  const commission = catalogue.products.find(isCommission);
  const one = priceAnyWith(priceLine, commission, brief(), [], 1, catalogue, merchant).total;
  const two = priceAnyWith(priceLine, commission, brief(), [], 2, catalogue, merchant).total;
  assert.equal(two, one * 2);
});

/* ---------------------------------------------------------------------------
   The deposit is a share of the order
   --------------------------------------------------------------------------- */

test('a basket holding a commission takes a deposit, not the full amount', () => {
  const lines = [
    { productId: 'commission', selections: brief(), addons: ['gold'], qty: 1 },
    { productId: 'ed-sesame', selections: { boxsize: '1' }, addons: [], qty: 1 },
  ];
  const t = orderTotalsWith(priceLine, lines, merchant, catalogue, { method: 'pickup' });

  assert.equal(t.subtotal, 567 + 150 + 85);
  assert.equal(t.hasCommission, true);
  assert.equal(Math.round((t.dueNow + t.dueLater) * 100), Math.round(t.total * 100),
    'the deposit and the balance must account for the whole total');
  assert.ok(t.dueNow < t.total, 'a commission order is not paid in full up front');
  assert.equal(t.dueNow, Math.round(t.total * 0.3 * 100) / 100);
});

test('a basket of editions alone is paid in full', () => {
  const lines = [{ productId: 'ed-sesame', selections: { boxsize: '1' }, addons: [], qty: 2 }];
  const t = orderTotalsWith(priceLine, lines, merchant, catalogue, { method: 'pickup' });
  assert.equal(t.hasCommission, false);
  assert.equal(t.dueNow, t.total);
  assert.equal(t.dueLater, 0);
});

test('tax is contained in the total, not added to it', () => {
  // Berlin. The shelf price includes VAT, which is the law for consumer
  // prices in the EU — showing EUR 85 and charging EUR 90.95 is not merely
  // confusing, it is non-compliant. Earlier this template did exactly that.
  const lines = [{ productId: 'ed-sesame', selections: { boxsize: '1' }, addons: [], qty: 1 }];
  const t = orderTotalsWith(priceLine, lines, merchant, catalogue, { method: 'delivery', zone: { fee: 25 } });

  assert.equal(t.fulfilment, 25);
  assert.equal(t.total, 110, 'the total is exactly what the customer saw, plus delivery');
  assert.equal(t.taxIncluded, true);
  assert.equal(t.tax, Math.round((110 - 110 / 1.07) * 100) / 100, 'the VAT inside the 110');
  assert.ok(t.tax < t.total);
  assert.equal(t.freeDeliveryGap, 900 - 85);
});

test('an exclusive-tax merchant still has it added on top', () => {
  // US sales tax is quoted separately and appears at checkout, so the other
  // direction has to keep working. `exclusive` is the default.
  const us = { ...merchant, taxMode: 'exclusive' };
  const lines = [{ productId: 'ed-sesame', selections: { boxsize: '1' }, addons: [], qty: 1 }];
  const t = orderTotalsWith(priceLine, lines, us, catalogue, { method: 'pickup' });

  assert.equal(t.taxIncluded, false);
  assert.equal(t.tax, Math.round(85 * 0.07 * 100) / 100);
  assert.equal(t.total, Math.round((85 + 85 * 0.07) * 100) / 100);
});

test('a zero-rated merchant gets no tax either way', () => {
  for (const mode of ['inclusive', 'exclusive']) {
    const zero = { ...merchant, taxRate: 0, taxMode: mode };
    const lines = [{ productId: 'ed-sesame', selections: { boxsize: '1' }, addons: [], qty: 1 }];
    const t = orderTotalsWith(priceLine, lines, zero, catalogue, { method: 'pickup' });
    assert.equal(t.tax, 0);
    assert.equal(t.total, 85, `${mode} with a zero rate must not move the price`);
  }
});

test('the deposit is a share of the gross, not of a pre-tax figure', () => {
  const lines = [{ productId: 'commission', selections: brief(), addons: ['gold'], qty: 1 }];
  const t = orderTotalsWith(priceLine, lines, merchant, catalogue, { method: 'pickup' });
  assert.equal(t.total, 717, '567 + 150, VAT already inside it');
  assert.equal(t.dueNow, Math.round(717 * 0.3 * 100) / 100);
  assert.equal(Math.round((t.dueNow + t.dueLater) * 100), Math.round(t.total * 100));
});

test('delivery is free once the order passes the threshold', () => {
  const lines = [{ productId: 'commission', selections: brief({ scale: 'l', ambition: 'editorial' }), addons: [], qty: 1 }];
  const t = orderTotalsWith(priceLine, lines, merchant, catalogue, { method: 'delivery', zone: { fee: 25 } });
  assert.ok(t.subtotal > 900);
  assert.equal(t.fulfilment, 0);
  assert.equal(t.freeDeliveryGap, 0);
});

/* ---------------------------------------------------------------------------
   Nothing silently drops
   --------------------------------------------------------------------------- */

test('an unknown technique id is ignored rather than crashing the quote', () => {
  const p = priceCommission(merchant, catalogue, brief(), ['gold', 'no-such-technique']);
  assert.equal(p.techniques.length, 1);
  assert.equal(p.subtotal, 567 + 150);
});

test('an unknown selection falls back to the first option', () => {
  const p = priceCommission(merchant, catalogue, { scale: 'xxl', ambition: 'nope', palette: 'tonal' }, []);
  assert.equal(p.base, 280, 'falls back to the first scale');
  assert.equal(p.factor, 1.0, 'falls back to the first ambition');
});

test('money never drifts into floating-point dust', () => {
  for (const ambition of ['clean', 'composed', 'editorial']) {
    for (const scale of ['s', 'm', 'l']) {
      const p = priceCommission(merchant, catalogue, brief({ scale, ambition }), ['gold', 'piped']);
      for (const v of [p.subtotal, p.deposit, p.balance, p.factored]) {
        assert.equal(Math.round(v * 100), Number((v * 100).toFixed(0)), `${v} is not a clean amount`);
        assert.ok(Number.isFinite(v));
      }
      assert.equal(Math.round((p.deposit + p.balance) * 100), Math.round(p.subtotal * 100));
    }
  }
});
