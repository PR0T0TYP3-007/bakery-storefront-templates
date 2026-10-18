/**
 * @file The only module in the template that touches data.
 *
 * Every function is async and returns plain JSON, so a backend team can
 * replace the body of each one with a real `fetch()` without any UI module
 * changing. Request and response shapes are documented on each function and
 * in docs/api-contract.md.
 *
 * Today these read local JSON and compute availability client-side from
 * shared/core/fulfilment.js. In production, availability, studio capacity and
 * order placement must move server-side — a client cannot be trusted with how
 * many commissions one bench can take in a week, and a quote the customer can
 * edit is not a quote.
 */

import * as fulfilment from '../../../../shared/core/fulfilment.js';
import { keyToDate, dateKey } from '../../../../shared/core/dates.js';

const BASE = new URL('../../data/', import.meta.url);

/** Simulated latency so loading states are real rather than theoretical. */
const LATENCY = 120;
const wait = (ms = LATENCY) => new Promise((r) => setTimeout(r, ms));

const cache = new Map();
async function loadJSON(file) {
  if (cache.has(file)) return cache.get(file);
  const res = await fetch(new URL(file, BASE));
  if (!res.ok) throw new ApiError(`Could not load ${file}`, res.status);
  const json = await res.json();
  cache.set(file, json);
  return json;
}

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * One studio. The seam is the same shape in every template — everything
 * below reads `currentMerchantId()` — so a second one is a pair of JSON
 * files and an entry in this array, not a code change.
 */
export const MERCHANTS = ['fold'];
export const DEFAULT_MERCHANT = 'fold';

/** Which merchant this page is for. `?merchant=…` switches it. */
export function currentMerchantId() {
  const q = new URLSearchParams(location.search).get('merchant');
  return MERCHANTS.includes(q) ? q : DEFAULT_MERCHANT;
}

/**
 * GET /merchant/:id
 * @returns {Promise<object>} merchant config — see data/merchant.*.json
 */
export async function getMerchant(id = currentMerchantId()) {
  await wait();
  return loadJSON(`merchant.${id}.json`);
}

/**
 * GET /merchant/:id/catalogue
 * @returns {Promise<{categories:object[], occasions:object[], optionGroups:object,
 *                    addons:object[], products:object[]}>}
 */
export async function getCatalogue(id = currentMerchantId()) {
  await wait();
  return loadJSON(`products.${id}.json`);
}

/**
 * GET /merchant/:id/products
 * @param {{category?:string, occasion?:string, q?:string}} [filter]
 * @returns {Promise<object[]>}
 */
export async function getProducts(filter = {}) {
  const cat = await getCatalogue();
  let items = cat.products;

  if (filter.category) items = items.filter((p) => p.category === filter.category);
  if (filter.occasion) items = items.filter((p) => p.occasions?.includes(filter.occasion));
  if (filter.q) items = search(items, filter.q);

  return items;
}

/**
 * GET /merchant/:id/products/:productId
 * @returns {Promise<object|null>}
 */
export async function getProduct(productId) {
  const cat = await getCatalogue();
  return cat.products.find((p) => p.id === productId) ?? null;
}

/**
 * Client-side search with light typo tolerance.
 * Exact and prefix matches rank above fuzzy ones, so "sesam" finds the first
 * edition and "sesmae" still does.
 */
export function search(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  const scored = items
    .map((p) => {
      const hay = [p.name, p.subtitle, p.category, ...(p.occasions ?? [])]
        .join(' ')
        .toLowerCase();
      let score = 0;
      if (hay.includes(q)) score = 100 - hay.indexOf(q);
      else if (q.split(/\s+/).every((w) => hay.includes(w))) score = 60;
      else if (fuzzy(p.name.toLowerCase(), q)) score = 30;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((x) => x.p);
}

/** Tolerates one transposition or a single wrong/missing character. */
function fuzzy(hay, needle) {
  if (needle.length < 4) return false;
  for (let i = 0; i <= hay.length - needle.length + 1; i++) {
    let bad = 0;
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) bad++;
      if (bad > 1) break;
    }
    if (bad <= 1) return true;
  }
  return false;
}

/**
 * GET /merchant/:id/availability?date=YYYY-MM-DD&location=:locId
 *
 * Response:
 * ```json
 * { "date": "2026-11-14", "state": "available",
 *   "capacity": { "cap": 3, "taken": 1, "left": 2 },
 *   "slots": [ { "time": "10:00–12:00", "left": 1, "full": false } ] }
 * ```
 * @returns {Promise<object>}
 */
export async function getAvailability(dateInput, locationId) {
  await wait(80);
  const merchant = await getMerchant();
  const date = typeof dateInput === 'string' ? keyToDate(dateInput) : dateInput;
  const location =
    merchant.locations.find((l) => l.id === locationId) ??
    merchant.locations.find((l) => l.default) ??
    merchant.locations[0];

  return {
    date: dateKey(date),
    state: fulfilment.dayState(merchant, date, 0),
    capacity: fulfilment.capacityFor(merchant, date),
    slots: fulfilment.slotsFor(merchant, location, date),
    location: location.id,
  };
}

/**
 * POST /merchant/:id/delivery-check  { "postcode": "10999" }
 *
 * Response: `{ "ok": true, "zone": { "id": "mitte", "label": "...", "fee": 25 } }`
 * or `{ "ok": false, "reason": "..." }`
 * @returns {Promise<object>}
 */
export async function checkDeliveryZone(postcode) {
  await wait(220);
  const merchant = await getMerchant();
  return fulfilment.findZone(merchant, postcode);
}

/**
 * POST /orders
 *
 * Request:
 * ```json
 * { "merchantId": "fold",
 *   "fulfilment": { "method": "pickup", "locationId": "studio",
 *                   "date": "2026-11-14", "slot": "10:00–12:00" },
 *   "customer": { "name": "", "email": "", "phone": "" },
 *   "lines": [ { "productId": "", "selections": {}, "addons": [],
 *                "inscription": "", "qty": 1 } ],
 *   "payment": { "token": "tok_simulated" } }
 * ```
 *
 * Response 201: `{ "reference": "FOLD-4821", "placedAt": "...", "dueNow": 287.1, "total": 957 }`
 * Response 402: `{ "error": "card_declined", "message": "..." }`
 *
 * Simulated here. Two cards always fail, so the recovery paths can be
 * demonstrated and tested rather than described:
 *   4000 0000 0000 0002 — declined by the bank
 *   4000 0000 0000 0119 — processor unreachable
 * @returns {Promise<{reference:string, placedAt:string, total:number}>}
 */
export async function placeOrder(order) {
  await wait(1400); // a real processing pause, so the pending state is honest

  const card = String(order?.payment?.card ?? '').replace(/\s+/g, '');
  if (card === '4000000000000002') {
    throw new ApiError('Your bank declined the payment. No money has been taken.', 402);
  }
  if (card === '4000000000000119') {
    throw new ApiError('We could not reach the payment provider. Please try again.', 503);
  }

  const merchant = await getMerchant();
  // Initials for a multi-word name, the first four letters for a one-word
  // one. Taking initials unconditionally turned "FOLD" into "F", which is
  // not a reference anyone can quote down a phone line.
  const words = merchant.name.split(/\s+/).filter(Boolean);
  const prefix = (words.length > 1 ? words.map((w) => w[0]).join('') : words[0] ?? '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 4);

  return {
    reference: `${prefix}-${String(Date.now()).slice(-4)}`,
    placedAt: new Date().toISOString(),
    total: order.total,
  };
}
