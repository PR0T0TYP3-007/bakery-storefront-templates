/**
 * Unit tests for shared/core/ — the pure, DOM-free commerce layer.
 * Run with: npm test   (node --test tests/)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  startOfDay, today, addDays, dateKey, keyToDate, sameDay, daysBetween,
  msUntilHour, cutoffPassed,
} from '../../../shared/core/dates.js';

import {
  leadDaysFor, optionAvailable, reconcileSelections, validateInscription,
  allergensFor, soldOnDay, describeSelections, INSCRIPTION_MAX,
} from '../../../shared/core/rules.js';

import { priceLine, orderTotals } from '../../../shared/core/pricing.js';
import { dayState, earliestFor, isClosed, capacityFor, findZone, shelf, slotsFor } from '../../../shared/core/fulfilment.js';
import { emptyCart, addLine, updateLine, setQty, removeLine, count, readyBy, staleLines, signature } from '../../../shared/core/cart.js';

/* ---------------------------------------------------------------------------
   Fixtures
   --------------------------------------------------------------------------- */
const groups = {
  servings: {
    id: 'servings',
    label: 'Size',
    options: [
      { id: 's', label: '6 inch', price: 0 },
      { id: 'm', label: '8 inch', price: 16 },
      { id: 'l', label: '10 inch', price: 34, leadDays: 1 },
    ],
  },
  sponge: {
    id: 'sponge',
    label: 'Sponge',
    options: [
      { id: 'vanilla', label: 'Vanilla', price: 0 },
      { id: 'carrot', label: 'Carrot & walnut', price: 3, allergens: ['nuts'] },
    ],
  },
  finish: {
    id: 'finish',
    label: 'Finish',
    options: [
      { id: 'butter', label: 'Buttercream', price: 0 },
      { id: 'fruit', label: 'Fresh fruit', price: 9, leadDays: 1 },
      { id: 'fondant', label: 'Fondant figures', price: 28, leadDays: 4, requiresServings: ['m', 'l'] },
    ],
  },
};

const cake = {
  id: 'cake', kind: 'cake', name: 'Birthday Cake', price: 34, leadDays: 2,
  batchSize: null, allergens: ['gluten', 'dairy'],
  options: ['servings', 'sponge', 'finish'],
  defaults: { servings: 'm', sponge: 'vanilla', finish: 'butter' },
};

const loaf = {
  id: 'loaf', kind: 'everyday', name: 'Sourdough', price: 4.8, leadDays: 0,
  batchSize: 40, allergens: ['gluten'], options: [], defaults: {},
};

const addons = [
  { id: 'candles', label: 'Candles', price: 2 },
  { id: 'card', label: 'Card', price: 3 },
];

const catalogue = { optionGroups: groups, addons, products: [cake, loaf] };

const merchant = {
  id: 'test', cutoffHour: 11, maxDaysAhead: 60, dailyCapacity: 40,
  closedWeekdays: [1], closedDates: ['2026-12-25'], taxRate: 0,
  capabilities: { delivery: true, pickup: true },
  delivery: {
    freeOver: 40,
    zones: [
      { id: 'a', label: 'Near', prefixes: ['SW17', 'SW12'], fee: 3.5 },
      { id: 'b', label: 'Further', prefixes: ['SW18'], fee: 5 },
    ],
  },
  locations: [{ id: 'main', slots: ['09:00–11:00', '11:00–13:00'] }],
};

/* ---------------------------------------------------------------------------
   Dates
   --------------------------------------------------------------------------- */
test('dateKey uses local calendar parts, not UTC', () => {
  // 1 January at 00:30 local. toISOString() would roll this back to 31 Dec
  // for anyone west of Greenwich; dateKey must not.
  const d = new Date(2027, 0, 1, 0, 30, 0);
  assert.equal(dateKey(d), '2027-01-01');
});

test('dateKey survives a DST boundary', () => {
  // Last Sunday in March — the UK spring-forward. Adding a day across it must
  // still land on the next calendar day, not 23 hours later.
  const beforeDst = new Date(2027, 2, 27, 12, 0, 0);
  const after = addDays(beforeDst, 1);
  assert.equal(dateKey(after), '2027-03-28');
  assert.equal(daysBetween(beforeDst, after), 1);
});

test('dateKey and keyToDate round-trip', () => {
  const d = new Date(2026, 9, 17);
  assert.equal(dateKey(keyToDate(dateKey(d))), '2026-10-17');
  assert.equal(keyToDate('nonsense'), null);
  assert.equal(keyToDate(undefined), null);
});

test('startOfDay strips the time, sameDay ignores it', () => {
  const a = new Date(2026, 9, 17, 23, 59);
  const b = new Date(2026, 9, 17, 0, 1);
  assert.equal(startOfDay(a).getHours(), 0);
  assert.ok(sameDay(a, b));
  assert.ok(!sameDay(a, addDays(b, 1)));
});

test('msUntilHour rolls to tomorrow once the cutoff has passed', () => {
  const beforeCut = new Date(2026, 9, 17, 9, 0, 0);
  const afterCut = new Date(2026, 9, 17, 15, 0, 0);

  assert.equal(msUntilHour(11, beforeCut), 2 * 3600000);
  // 11am tomorrow is 20 hours after 3pm today.
  assert.equal(msUntilHour(11, afterCut), 20 * 3600000);
  assert.ok(msUntilHour(11, afterCut) > 0, 'never returns a negative deadline');

  assert.equal(cutoffPassed(11, beforeCut), false);
  assert.equal(cutoffPassed(11, afterCut), true);
});

/* ---------------------------------------------------------------------------
   Rules
   --------------------------------------------------------------------------- */
test('lead time is a property of the configuration, not the shop', () => {
  assert.equal(leadDaysFor(cake, cake.defaults, groups), 2);

  // Fondant adds four days on top of the cake's own two.
  assert.equal(
    leadDaysFor(cake, { ...cake.defaults, finish: 'fondant' }, groups),
    6
  );
  // A bigger size adds its own day, and the two stack.
  assert.equal(
    leadDaysFor(cake, { servings: 'l', sponge: 'vanilla', finish: 'fruit' }, groups),
    4
  );
  assert.equal(leadDaysFor(loaf, {}, groups), 0);
});

test('an option limited to certain sizes reports why it is unavailable', () => {
  const fondant = groups.finish.options.find((o) => o.id === 'fondant');

  assert.equal(optionAvailable(fondant, { servings: 'm' }, groups).ok, true);

  const blocked = optionAvailable(fondant, { servings: 's' }, groups);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, 'Only on 8 inch or 10 inch', 'two options join with "or"');

  // Three or more read as a list, not "A or B or C".
  const three = { ...fondant, requiresServings: ['s', 'm', 'l'] };
  assert.equal(optionAvailable(three, { servings: 'x' }, groups).reason,
    'Only on 6 inch, 8 inch or 10 inch');
});

test('reconcileSelections falls an impossible option back and names it', () => {
  const { selections, changed } = reconcileSelections(
    cake,
    { servings: 's', sponge: 'vanilla', finish: 'fondant' },
    groups
  );
  assert.equal(selections.finish, 'butter', 'reverts to the product default');
  assert.deepEqual(changed, ['Finish']);
});

test('reconcileSelections does not fall back onto an option that is also impossible', () => {
  // Template 03's Ombre defaults to sugar roses, which need one of the two
  // larger sizes. Shrinking the cake used to fall the finish back to the
  // product default and leave it on the option the kitchen had just refused.
  const fancy = { ...cake, defaults: { ...cake.defaults, finish: 'fondant' } };
  const { selections, changed } = reconcileSelections(
    fancy,
    { servings: 's', sponge: 'vanilla', finish: 'fondant' },
    groups
  );

  assert.notEqual(selections.finish, 'fondant', 'the default was impossible too');
  const landed = groups.finish.options.find((o) => o.id === selections.finish);
  assert.equal(optionAvailable(landed, selections, groups).ok, true, 'it lands somewhere possible');
  assert.deepEqual(changed, ['Finish']);
});

test('reconcileSelections leaves a valid configuration alone', () => {
  const input = { servings: 'm', sponge: 'vanilla', finish: 'fondant' };
  const { selections, changed } = reconcileSelections(cake, input, groups);
  assert.deepEqual(selections, input);
  assert.deepEqual(changed, []);
});

test('inscription validation', () => {
  assert.equal(validateInscription('').ok, true, 'blank is fine');
  assert.equal(validateInscription('Happy Birthday Sam!').ok, true);
  assert.equal(validateInscription("Mum's 60th — at last").ok, true);

  const long = validateInscription('x'.repeat(INSCRIPTION_MAX + 1));
  assert.equal(long.ok, false);

  // Emoji cannot be piped in buttercream; saying so beats a phone call.
  const emoji = validateInscription('Happy Birthday 🎂');
  assert.equal(emoji.ok, false);
  assert.match(emoji.reason, /letters, numbers/);
});

test('allergens include those introduced by a chosen option', () => {
  assert.deepEqual(allergensFor(cake, cake.defaults, groups), ['gluten', 'dairy']);
  assert.deepEqual(
    allergensFor(cake, { ...cake.defaults, sponge: 'carrot' }, groups),
    ['gluten', 'dairy', 'nuts']
  );
});

test('soldOnDay respects a product that only exists some days', () => {
  const friSunOnly = { ...loaf, availableWeekdays: [5, 6, 0] };
  const friday = new Date(2026, 9, 16); // a Friday
  const tuesday = new Date(2026, 9, 20);
  assert.equal(soldOnDay(friSunOnly, friday), true);
  assert.equal(soldOnDay(friSunOnly, tuesday), false);
  assert.equal(soldOnDay(loaf, tuesday), true, 'no restriction means always');
});

test('describeSelections lists every chosen option in order', () => {
  assert.equal(
    describeSelections(cake, cake.defaults, groups),
    '8 inch · Vanilla · Buttercream'
  );
  assert.equal(describeSelections(loaf, {}, groups), '');
});

/* ---------------------------------------------------------------------------
   Pricing
   --------------------------------------------------------------------------- */
test('priceLine sums base, options and add-ons', () => {
  const p = priceLine(cake, { servings: 'l', sponge: 'carrot', finish: 'fruit' }, ['candles'], 2, catalogue);
  // 34 base + 34 size + 3 sponge + 9 finish = 80 unit; +2 add-on; ×2
  assert.equal(p.unit, 80);
  assert.equal(p.addons, 2);
  assert.equal(p.total, 164);
});

test('priceLine does not accumulate floating point error', () => {
  const pennyLoaf = { ...loaf, price: 0.1 };
  const cat = { optionGroups: groups, addons: [{ id: 'x', label: 'X', price: 0.2 }], products: [pennyLoaf] };
  const p = priceLine(pennyLoaf, {}, ['x'], 3, cat);
  assert.equal(p.total, 0.9, '0.1 + 0.2 handled in minor units');
});

test('priceLine breakdown accounts for every penny of the unit price', () => {
  const p = priceLine(cake, cake.defaults, ['card'], 1, catalogue);
  const sum = p.breakdown.reduce((n, b) => n + b.amount, 0);
  assert.equal(sum, p.unit + p.addons);
});

test('quantity is coerced to at least one', () => {
  assert.equal(priceLine(loaf, {}, [], 0, catalogue).total, 4.8);
  assert.equal(priceLine(loaf, {}, [], -5, catalogue).total, 4.8);
});

test('orderTotals charges delivery below the threshold and not above it', () => {
  const small = [{ productId: 'loaf', selections: {}, addons: [], qty: 1 }];
  const big = [{ productId: 'cake', selections: cake.defaults, addons: [], qty: 1 }];

  const pickup = orderTotals(small, merchant, catalogue, { method: 'pickup' });
  assert.equal(pickup.fulfilment, 0);
  assert.equal(pickup.total, 4.8);

  const delivered = orderTotals(small, merchant, catalogue, {
    method: 'delivery', zone: merchant.delivery.zones[0],
  });
  assert.equal(delivered.fulfilment, 3.5);
  assert.equal(delivered.total, 8.3);
  assert.equal(delivered.freeDeliveryGap, 35.2);

  // 34 + 16 = 50, over the £40 threshold.
  const free = orderTotals(big, merchant, catalogue, {
    method: 'delivery', zone: merchant.delivery.zones[0],
  });
  assert.equal(free.fulfilment, 0);
  assert.equal(free.freeDeliveryGap, 0);
});

test('orderTotals applies a tax rate when the merchant has one', () => {
  const taxed = { ...merchant, taxRate: 0.1 };
  const lines = [{ productId: 'loaf', selections: {}, addons: [], qty: 10 }];
  const t = orderTotals(lines, taxed, catalogue, { method: 'pickup' });
  assert.equal(t.subtotal, 48);
  assert.equal(t.tax, 4.8);
  assert.equal(t.total, 52.8);
});

test('orderTotals ignores lines whose product has gone from the catalogue', () => {
  const lines = [
    { productId: 'loaf', selections: {}, addons: [], qty: 1 },
    { productId: 'deleted', selections: {}, addons: [], qty: 3 },
  ];
  assert.equal(orderTotals(lines, merchant, catalogue, { method: 'pickup' }).subtotal, 4.8);
});

/* ---------------------------------------------------------------------------
   Fulfilment
   --------------------------------------------------------------------------- */
test('isClosed covers both weekly closures and one-off dates', () => {
  const monday = new Date(2026, 9, 19);
  const christmas = keyToDate('2026-12-25');
  const tuesday = new Date(2026, 9, 20);
  assert.equal(isClosed(merchant, monday), true);
  assert.equal(isClosed(merchant, christmas), true);
  assert.equal(isClosed(merchant, tuesday), false);
});

test('dayState classifies past, too-soon and out-of-range days', () => {
  assert.equal(dayState(merchant, addDays(today(), -1), 0), 'past');
  assert.equal(dayState(merchant, addDays(today(), 90), 0), 'past', 'beyond the booking window');
  // With ten days of notice required, tomorrow cannot be available.
  assert.equal(dayState(merchant, addDays(today(), 1), 10), 'lead');
});

test('earliestFor always returns a genuinely bookable day', () => {
  for (const lead of [0, 1, 2, 6, 11]) {
    const d = earliestFor(merchant, lead);
    assert.equal(dayState(merchant, d, lead), 'available', `lead ${lead} returned an unavailable day`);
    assert.ok(!isClosed(merchant, d), `lead ${lead} returned a closed day`);
  }
});

test('earliestFor respects the cutoff', () => {
  const d = earliestFor(merchant, 0);
  assert.ok(d >= today(), 'never offers a day in the past');
});

test('capacity is deterministic and bounded', () => {
  const d = addDays(today(), 5);
  const a = capacityFor(merchant, d);
  const b = capacityFor(merchant, d);
  assert.deepEqual(a, b, 'same day gives the same answer across calls');
  assert.ok(a.left >= 0 && a.left <= a.cap);
  assert.equal(a.cap, 40);
});

test('capacity varies across days rather than clustering', () => {
  const states = {};
  for (let i = 0; i < 60; i++) {
    const s = dayState(merchant, addDays(today(), i), 0);
    states[s] = (states[s] ?? 0) + 1;
  }
  assert.ok(states.available > 20, `expected plenty of open days, got ${JSON.stringify(states)}`);
  assert.ok((states.closed ?? 0) > 0, 'Mondays should be closed');
});

test('shelf tells the truth per day: a band today, a capability later', () => {
  const now = shelf(merchant, loaf, today());
  assert.equal(now.mode, 'live');
  assert.equal(typeof now.n, 'number');
  assert.ok(['plenty', 'going', 'last', 'gone'].includes(now.band), `unexpected band ${now.band}`);

  const later = shelf(merchant, loaf, addDays(today(), 6));
  assert.equal(later.mode, 'batch');
  assert.equal(later.n, undefined, 'never invents a count for a future day');
  assert.equal(later.short, 'Baked fresh');

  const made = shelf(merchant, cake, addDays(today(), 6));
  assert.equal(made.mode, 'made');
  assert.match(made.label, /2 days notice/);
});

test('a future day never quotes a number, not even the batch size', () => {
  // The old board said "40 a day" — a fact about the bakery rather than an
  // answer to "can I have one", and it made every future day read as scarcity.
  for (let i = 1; i <= 30; i++) {
    const s = shelf(merchant, loaf, addDays(today(), i));
    if (s.mode !== 'batch') continue;
    assert.ok(!/\d/.test(s.short), `short quoted a number: ${s.short}`);
    assert.ok(!s.short.includes('a day'), `short brought back the production count: ${s.short}`);
    assert.ok(!s.label.includes(String(loaf.batchSize)), `label leaked the batch size: ${s.label}`);
  }
});

test('today bands run in the right order and are all reachable', () => {
  // Walk a year of today-shaped days by hashing different product ids, which
  // is how the mock varies the live count.
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    const s = shelf(merchant, { ...loaf, id: `loaf-${i}` }, today());
    seen.add(s.band);
    // Thresholds are a whole number of items, not a raw fraction: a shelf
    // holds loaves, and "8.8 left" is not a thing anyone can hand over.
    const lastFew = Math.max(2, Math.ceil(loaf.batchSize * 0.08));
    const goingFast = Math.ceil(loaf.batchSize * 0.22);
    if (s.band === 'gone') assert.equal(s.n, 0);
    if (s.band === 'last') assert.ok(s.n > 0 && s.n <= lastFew);
    if (s.band === 'going') assert.ok(s.n > lastFew && s.n <= goingFast);
    if (s.band === 'plenty') assert.ok(s.n > goingFast);
  }
  for (const band of ['gone', 'last', 'going', 'plenty']) {
    assert.ok(seen.has(band), `band ${band} was never reachable`);
  }
});

test('the board does not cry wolf: most of it is plenty, at any batch size', () => {
  // This project has already shipped fake scarcity once, when an absolute
  // threshold made half a small shelf say "Only 3 left". The second route to
  // the same bug is a live-count formula that simulates a permanent late
  // afternoon, which once put seven of nine rows in an urgent band. Guard the
  // outcome rather than either mechanism.
  for (const batchSize of [10, 24, 40, 60]) {
    const tally = {};
    for (let i = 0; i < 3000; i++) {
      const s = shelf(merchant, { ...loaf, id: `p-${i}`, batchSize }, today());
      tally[s.band] = (tally[s.band] ?? 0) + 1;
    }
    const share = (k) => (tally[k] ?? 0) / 3000;
    assert.ok(share('plenty') > 0.45, `batch ${batchSize}: only ${(share('plenty') * 100).toFixed(0)}% plenty`);
    assert.ok(share('last') < 0.25, `batch ${batchSize}: ${(share('last') * 100).toFixed(0)}% last few is scarcity theatre`);
    assert.ok(share('gone') < 0.2, `batch ${batchSize}: ${(share('gone') * 100).toFixed(0)}% sold out`);
  }
});

test('only the last-few band quotes the remaining count', () => {
  for (let i = 0; i < 400; i++) {
    const s = shelf(merchant, { ...loaf, id: `loaf-${i}` }, today());
    if (s.band === 'last') assert.match(s.label, new RegExp(`Only ${s.n} left today`));
    else assert.ok(!/\d/.test(s.label), `${s.band} quoted a number: ${s.label}`);
  }
});

test('thresholds come from merchant config', () => {
  const generous = { ...merchant, availability: { lastFewAt: 0.5, lastFewMin: 2, goingFastAt: 0.9 } };
  let moved = 0;
  for (let i = 0; i < 200; i++) {
    const p = { ...loaf, id: `loaf-${i}` };
    const a = shelf(merchant, p, today()).band;
    const b = shelf(generous, p, today()).band;
    if (a !== b) moved++;
    // A more generous "last few" can only ever widen the urgent bands.
    if (a === 'plenty') assert.ok(['plenty', 'going', 'last'].includes(b));
  }
  assert.ok(moved > 0, 'merchant thresholds had no effect');
});

test('lastFewMin keeps the band usable on a small batch', () => {
  // 8% of a batch of ten is 0.8, so a pure fraction would mean "Last few"
  // could never fire for a product the shop only makes ten of.
  const small = { ...loaf, batchSize: 10 };
  let sawLast = false;
  for (let i = 0; i < 300; i++) {
    const s = shelf(merchant, { ...small, id: `s-${i}` }, today());
    if (s.band === 'last') { sawLast = true; assert.ok(s.n <= 2); }
  }
  assert.ok(sawLast, 'a batch of ten never reached the last-few band');
});

test('a popular product gets advice in the long label only', () => {
  const day = addDays(today(), 5);
  const plain = shelf(merchant, loaf, day);
  const popular = shelf(merchant, { ...loaf, popular: true }, day);

  assert.equal(plain.short, popular.short, 'the board stays identical');
  assert.ok(!plain.label.includes('worth ordering ahead'));
  assert.match(popular.label, /worth ordering ahead/);
});

test('shelf reports a product not baked that day', () => {
  const friSunOnly = { ...loaf, availableWeekdays: [5, 6, 0] };
  // Find a day this product is not sold on.
  let d = today();
  for (let i = 0; i < 7 && soldOnDay(friSunOnly, d); i++) d = addDays(d, 1);
  if (!soldOnDay(friSunOnly, d)) {
    assert.equal(shelf(merchant, friSunOnly, d).state, 'out');
  }
});

test('findZone matches by prefix and explains a miss', () => {
  assert.equal(findZone(merchant, 'SW17 7EQ').zone.id, 'a');
  assert.equal(findZone(merchant, 'sw18 1aa').zone.id, 'b', 'case and spaces ignored');

  const miss = findZone(merchant, 'EC1A 1BB');
  assert.equal(miss.ok, false);
  assert.match(miss.reason, /collect/i, 'offers collection instead of a dead end');

  assert.equal(findZone(merchant, '').ok, false);

  const pickupOnly = { ...merchant, capabilities: { pickup: true, delivery: false }, delivery: null };
  assert.equal(findZone(pickupOnly, 'SW17').ok, false);
});

test('slots are deterministic and flag the full ones', () => {
  const d = addDays(today(), 2);
  const a = slotsFor(merchant, merchant.locations[0], d);
  assert.deepEqual(a, slotsFor(merchant, merchant.locations[0], d));
  assert.equal(a.length, 2);
  for (const s of a) {
    assert.equal(s.full, s.left === 0);
    assert.ok(s.left >= 0);
  }
});

/* ---------------------------------------------------------------------------
   Cart
   --------------------------------------------------------------------------- */
const line = (over = {}) => ({
  productId: 'cake', selections: cake.defaults, addons: [], inscription: '',
  readyBy: dateKey(addDays(today(), 2)), qty: 1, ...over,
});

test('identical lines merge, different ones do not', () => {
  let cart = addLine(emptyCart(), line());
  cart = addLine(cart, line());
  assert.equal(cart.lines.length, 1);
  assert.equal(cart.lines[0].qty, 2);

  cart = addLine(cart, line({ inscription: 'Happy Birthday' }));
  assert.equal(cart.lines.length, 2, 'a different inscription is a different line');
  assert.equal(count(cart), 3);
});

test('signature distinguishes add-on order-insensitively', () => {
  const a = signature(line({ addons: ['candles', 'card'] }));
  const b = signature(line({ addons: ['card', 'candles'] }));
  assert.equal(a, b);
});

test('cart operations never mutate the cart passed in', () => {
  const original = addLine(emptyCart(), line());
  const snapshot = JSON.stringify(original);
  setQty(original, original.lines[0].id, 5);
  removeLine(original, original.lines[0].id);
  assert.equal(JSON.stringify(original), snapshot);
});

test('updateLine keeps the id and the position of the line it changes', () => {
  let cart = addLine(emptyCart(), line());
  cart = addLine(cart, line({ inscription: 'Happy Birthday' }));
  const id = cart.lines[0].id;

  // Template 03 writes the card onto a line that is already in the basket.
  // Re-adding would mint a new id, which breaks the ?line= link the customer
  // is on, and move the row to the bottom of a basket they are looking at.
  cart = updateLine(cart, id, { meta: { card: { to: 'Mara' } } });
  assert.equal(cart.lines[0].id, id);
  assert.equal(cart.lines.length, 2);
  assert.deepEqual(cart.lines[0].meta, { card: { to: 'Mara' } });
});

test('updateLine merges two lines a patch has made identical', () => {
  let cart = addLine(emptyCart(), line());
  cart = addLine(cart, line({ meta: { card: { to: 'Mara' } } }));
  assert.equal(cart.lines.length, 2);

  // Clearing the card off one of two otherwise-identical cakes should leave
  // two of that cake, not a basket showing the same row twice.
  cart = updateLine(cart, cart.lines[1].id, { meta: null });
  assert.equal(cart.lines.length, 1);
  assert.equal(cart.lines[0].qty, 2);
});

test('updateLine does not mutate the cart passed in', () => {
  const original = addLine(emptyCart(), line());
  const snapshot = JSON.stringify(original);
  updateLine(original, original.lines[0].id, { inscription: 'Changed' });
  assert.equal(JSON.stringify(original), snapshot);
});

test('setQty to zero removes the line, and quantity is capped', () => {
  let cart = addLine(emptyCart(), line());
  const id = cart.lines[0].id;
  assert.equal(setQty(cart, id, 0).lines.length, 0);
  assert.equal(setQty(cart, id, 999).lines[0].qty, 24);
});

test('readyBy is the latest day on the ticket', () => {
  let cart = addLine(emptyCart(), line({ readyBy: dateKey(addDays(today(), 2)) }));
  cart = addLine(cart, line({ productId: 'loaf', readyBy: dateKey(addDays(today(), 7)) }));
  assert.equal(readyBy(cart), dateKey(addDays(today(), 7)));
  assert.equal(readyBy(emptyCart()), null);
});

test('staleLines reports a price that has moved since the item went in', () => {
  const cart = addLine(emptyCart(), line({ addedPrice: 50 }));
  const unchanged = staleLines(cart, () => 50);
  assert.equal(unchanged.length, 0);

  const moved = staleLines(cart, () => 54);
  assert.equal(moved.length, 1);
  assert.equal(moved[0].was, 50);
  assert.equal(moved[0].now, 54);
});

test('staleLines ignores lines added before prices were recorded', () => {
  const cart = addLine(emptyCart(), line({ addedPrice: undefined }));
  assert.equal(staleLines(cart, () => 99).length, 0);
});
