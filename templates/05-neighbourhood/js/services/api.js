/**
 * @file The only module in the template that touches data.
 *
 * Every function is async and returns plain JSON, so a backend team can
 * replace the body of each one with a real `fetch()` without any UI module
 * changing. Request and response shapes are documented on each function and
 * in docs/api-contract.md.
 *
 * Today these read local JSON and compute availability client-side from
 * js/core/fulfilment.js. In production, availability, capacity and order
 * placement must move server-side — the client cannot be trusted with them.
 */

import * as fulfilment from '../core/fulfilment.js';
import { keyToDate, dateKey } from '../core/dates.js';

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

export const MERCHANTS = ['hazel-and-rye', 'corner-crumb'];
export const DEFAULT_MERCHANT = 'hazel-and-rye';

/** Which merchant this page is for. `?merchant=corner-crumb` switches it. */
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
 * Exact and prefix matches rank above fuzzy ones, so "sourdo" finds the loaf
 * and "sourdoh" still does.
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
 * { "date": "2026-10-20", "state": "available",
 *   "capacity": { "cap": 40, "taken": 12, "left": 28 },
 *   "slots": [ { "time": "09:30–11:30", "left": 4, "full": false } ] }
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
 * POST /merchant/:id/delivery-check  { "postcode": "SW17 7EQ" }
 *
 * Response: `{ "ok": true, "zone": { "id": "sw17", "label": "...", "fee": 3.5 } }`
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
 * { "merchantId": "hazel-and-rye",
 *   "fulfilment": { "method": "pickup", "locationId": "bellevue",
 *                   "date": "2026-10-20", "slot": "09:30–11:30" },
 *   "customer": { "name": "", "email": "", "phone": "" },
 *   "gift": { "isGift": false, "message": "", "hidePrices": true },
 *   "lines": [ { "productId": "", "selections": {}, "addons": [],
 *                "inscription": "", "qty": 1 } ],
 *   "payment": { "token": "tok_simulated" } }
 * ```
 *
 * Response 201: `{ "reference": "HR-4821", "placedAt": "...", "total": 42.5 }`
 * Response 402: `{ "error": "card_declined", "message": "..." }`
 *
 * Simulated here. Card `4000 0000 0000 0002` always declines, so the
 * recovery path can be demonstrated and tested.
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
  const prefix = merchant.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 2);

  return {
    reference: `${prefix}-${String(Date.now()).slice(-4)}`,
    placedAt: new Date().toISOString(),
    total: order.total,
  };
}
