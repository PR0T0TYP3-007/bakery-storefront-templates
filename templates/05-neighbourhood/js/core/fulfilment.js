/**
 * @file Fulfilment: what can be ready when, how much of it there is, and
 * where it can go. Pure and DOM-free.
 *
 * The mocked numbers (capacity, shelf stock, slot space) are deterministic
 * hashes of the date so nothing reshuffles on reload. A real shop replaces
 * these three functions with its production sheet and booking system.
 */

import { startOfDay, today, addDays, dateKey, daysBetween, cutoffPassed } from './dates.js';
import { soldOnDay } from './rules.js';

/** FNV-1a. A naive polynomial hash clusters badly across adjacent dates. */
function hash01(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

export const DAY_REASON = {
  past: 'In the past',
  lead: 'Not enough notice for this',
  closed: 'The bakery is closed',
  holiday: 'Closed — holiday',
  full: 'Fully booked',
  available: 'Available',
};

/** @returns {boolean} */
export function isClosed(merchant, d) {
  const day = startOfDay(d);
  if (merchant.closedWeekdays?.includes(day.getDay())) return true;
  if (merchant.closedDates?.includes(dateKey(day))) return true;
  return false;
}

/** Orders the kitchen has already taken for a day, against its daily cap. */
export function capacityFor(merchant, d) {
  const cap = merchant.dailyCapacity ?? 40;
  const day = startOfDay(d);
  const v = hash01(`cap:${merchant.id}:${dateKey(day)}`);
  const dow = day.getDay();
  // Weekends are the pinch point for a bakery taking celebration orders.
  const pressure = dow === 6 || dow === 0 ? 0.92 : 0.55;
  const taken = Math.round(cap * v * pressure);
  return { cap, taken, left: Math.max(0, cap - taken) };
}

/**
 * The single source of truth for what a calendar cell means.
 * @returns {'past'|'lead'|'closed'|'holiday'|'full'|'available'}
 */
export function dayState(merchant, d, leadDays = 0) {
  const day = startOfDay(d);
  const t = today();
  const min = addDays(t, leadDays + (cutoffPassed(merchant.cutoffHour) ? 1 : 0));
  const max = addDays(t, merchant.maxDaysAhead ?? 60);

  if (day < t) return 'past';
  if (day > max) return 'past';
  if (day < min) return 'lead';
  if (merchant.closedDates?.includes(dateKey(day))) return 'holiday';
  if (isClosed(merchant, day)) return 'closed';
  if (capacityFor(merchant, day).left <= 0) return 'full';
  return 'available';
}

/** The soonest day this configuration can actually be ready. */
export function earliestFor(merchant, leadDays = 0) {
  const start = addDays(today(), leadDays + (cutoffPassed(merchant.cutoffHour) ? 1 : 0));
  let d = start;
  const horizon = merchant.maxDaysAhead ?? 60;

  for (let i = 0; i <= horizon; i++) {
    if (dayState(merchant, d, leadDays) === 'available') return d;
    d = addDays(d, 1);
  }
  // Nothing open inside the booking window — fall back to the next day the
  // shop is simply open rather than handing back a date months away.
  d = start;
  for (let i = 0; i <= 14; i++) {
    if (!isClosed(merchant, d)) return d;
    d = addDays(d, 1);
  }
  return start;
}

/**
 * What the shop can *honestly* say about a product on a given day.
 *
 * Today it knows the shelf. For any day still to come there is no shelf yet,
 * so the only truthful statement is the size of that morning's batch and
 * whether it is already mostly spoken for. Claiming "15 left next Tuesday"
 * is invented precision, and the board stops being worth reading the moment
 * a customer catches it out.
 *
 * @returns {{mode:'live'|'batch'|'made'|'off', state:string, n?:number, label:string, short:string}}
 */
export function shelf(merchant, product, d) {
  const day = startOfDay(d);

  if (!soldOnDay(product, day)) {
    return { mode: 'off', state: 'out', label: 'Not baked this day', short: 'Not today' };
  }

  if (product.batchSize == null) {
    const lead = product.leadDays ?? 0;
    return {
      mode: 'made',
      state: 'made',
      label: `Made to order · ${lead} ${lead === 1 ? 'day' : 'days'} notice`,
      short: `${lead} ${lead === 1 ? 'day' : 'days'} notice`,
    };
  }

  const ahead = daysBetween(today(), day);
  const v = hash01(`shelf:${merchant.id}:${product.id}:${dateKey(day)}`);
  const lowAt = Math.max(2, Math.round(product.batchSize * 0.16));

  if (ahead <= 0) {
    const n = Math.max(0, Math.round(product.batchSize * (v * 0.55 - 0.03)));
    const state = n === 0 ? 'out' : n <= lowAt ? 'low' : 'in';
    return {
      mode: 'live',
      n,
      state,
      label: state === 'out' ? 'Sold out today' : `${n} left today`,
      short: state === 'out' ? 'Sold out' : `${n} left`,
    };
  }

  if (v < 0.12) {
    return { mode: 'batch', state: 'low', label: 'Mostly pre-ordered', short: 'Limited' };
  }

  return {
    mode: 'batch',
    state: 'in',
    label: `${product.batchSize} baked that morning`,
    short: `${product.batchSize} a day`,
  };
}

/** Collection windows for a location on a day, with remaining space. */
export function slotsFor(merchant, location, d) {
  const day = startOfDay(d);
  return (location?.slots ?? []).map((time) => {
    const v = hash01(`slot:${merchant.id}:${location.id}:${dateKey(day)}:${time}`);
    const left = Math.round(v * 8);
    return { time, left, full: left === 0 };
  });
}

/**
 * Delivery zone lookup by postcode/ZIP prefix.
 * @returns {{ok:true, zone:object}|{ok:false, reason:string}}
 */
export function findZone(merchant, postcode) {
  if (!merchant.capabilities?.delivery || !merchant.delivery) {
    return { ok: false, reason: 'This bakery is collection only.' };
  }
  const value = String(postcode ?? '').toUpperCase().replace(/\s+/g, '');
  if (!value) return { ok: false, reason: 'Enter a postcode to check.' };

  for (const zone of merchant.delivery.zones) {
    if (zone.prefixes.some((p) => value.startsWith(p.toUpperCase().replace(/\s+/g, '')))) {
      return { ok: true, zone };
    }
  }
  return {
    ok: false,
    reason: `We don't deliver to ${postcode} yet — but you can collect from the shop.`,
  };
}
