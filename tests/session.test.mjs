import test from 'node:test';
import assert from 'node:assert/strict';

import { createSession } from '../shared/session.js';
import { dateKey } from '../shared/core/dates.js';
import { earliestFor } from '../shared/core/fulfilment.js';

const merchant = {
  id: 'session-test',
  locale: 'en-GB',
  currency: 'GBP',
  cutoffHour: 24,
  maxDaysAhead: 60,
  dailyCapacity: 100000,
  closedWeekdays: [],
  closedDates: [],
  locations: [{ id: 'counter', default: true }],
};

const catalogue = {
  optionGroups: {},
  addons: [],
  products: [
    {
      id: 'celebration-cake',
      price: 32,
      leadDays: 2,
      defaults: {},
      options: [],
    },
  ],
};

function browser() {
  const values = new Map();
  return {
    document: { documentElement: { dataset: {} } },
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  };
}

test('a requested cake date and inscription stay on its cart line', async () => {
  const oldDocument = globalThis.document;
  const oldStorage = globalThis.localStorage;
  const oldCustomEvent = globalThis.CustomEvent;
  const fakeBrowser = browser();

  globalThis.document = fakeBrowser.document;
  globalThis.localStorage = fakeBrowser.localStorage;
  if (!globalThis.CustomEvent) {
    globalThis.CustomEvent = class CustomEvent extends Event {
      constructor(type, init = {}) {
        super(type);
        this.detail = init.detail;
      }
    };
  }

  try {
    const session = createSession({
      getMerchant: async () => merchant,
      getCatalogue: async () => catalogue,
    });
    await session.boot();

    const wanted = earliestFor(merchant, 2);
    const result = session.add({
      productId: 'celebration-cake',
      inscription: 'Maya is eight',
      when: dateKey(wanted),
    });

    assert.equal(result.movedTo, null);
    assert.equal(session.state.cart.lines[0].inscription, 'Maya is eight');
    assert.equal(session.state.cart.lines[0].readyBy, dateKey(wanted));
    assert.equal(dateKey(session.state.when), dateKey(wanted));
  } finally {
    globalThis.document = oldDocument;
    globalThis.localStorage = oldStorage;
    globalThis.CustomEvent = oldCustomEvent;
  }
});
