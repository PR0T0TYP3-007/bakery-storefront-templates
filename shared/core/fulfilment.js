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
 * Default availability wording and thresholds.
 *
 * Thresholds are fractions of the morning's batch, so a shop that bakes ten
 * loaves and one that bakes sixty get the same *meaning* rather than the same
 * number. `lastFewMin` is the floor that stops a fraction being useless on a
 * small batch: 8% of ten is 0.8, which would mean "Last few" could never fire
 * for a product the shop only makes ten of.
 *
 * A merchant overrides the thresholds in its own config; the wording lives
 * here because it is the same sentence in every shop that has a shelf.
 */
export const AVAILABILITY = {
  lastFewAt: 0.08,
  // `Math.ceil` already guarantees the band is reachable on a small batch, so
  // this floor exists only for a shop that wants two to count as "last few".
  // Setting it to 2 on a batch of ten means half of all days say Last few,
  // which is the same fake scarcity by a different route.
  lastFewMin: 1,
  goingFastAt: 0.22,
};

/**
 * What the shop can *honestly* say about a product on a given day.
 *
 * Today it knows the shelf, so it can band the live count: plenty, going
 * fast, last few, gone. For any day still to come there is no shelf yet, so
 * the only truthful statement is what the shop *does* — it bakes these that
 * morning. Claiming "15 left next Tuesday" is invented precision, and the
 * board stops being worth reading the moment a customer catches it out.
 *
 * Two things this deliberately no longer says:
 *
 *   "40 a day" — a production count is a fact about the bakery, not an answer
 *   to the question the customer is asking, which is whether they can have
 *   one. It also made every future day read as a scarcity notice.
 *
 *   "Mostly pre-ordered" on a hashed one-in-eight of future days — that was a
 *   claim about a specific Tuesday invented from a hash, which is exactly the
 *   false precision the rest of this function exists to avoid. Where a product
 *   genuinely does go early, that is a property of the product and it is said
 *   once, in the long label, as advice rather than as a warning.
 *
 * @returns {{mode:'live'|'batch'|'made'|'off', state:string, n?:number,
 *            band?:string, label:string, short:string}}
 */
export function shelf(merchant, product, d) {
  const day = startOfDay(d);

  if (!soldOnDay(product, day)) {
    return { mode: 'off', state: 'out', label: 'Not baked that day', short: 'Not that day' };
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

  const cfg = { ...AVAILABILITY, ...(merchant.availability ?? {}) };
  const ahead = daysBetween(today(), day);

  /* ---- Today: there is a shelf, so band what is on it ------------------- */
  if (ahead <= 0) {
    const v = hash01(`shelf:${merchant.id}:${product.id}:${dateKey(day)}`);
    // How much of the morning's batch is still on the shelf. The range runs
    // to ~80% rather than ~52%: the old one simulated a permanent late
    // afternoon, which put most of the board in an urgent band every day.
    // A board that cries wolf on seven rows out of nine is the fake scarcity
    // this project has already had to fix once.
    const n = Math.max(0, Math.round(product.batchSize * (v * 0.85 - 0.05)));

    if (n === 0) {
      return { mode: 'live', n: 0, band: 'gone', state: 'out', label: 'Sold out today', short: 'Sold out' };
    }

    const lastFew = Math.max(cfg.lastFewMin, Math.ceil(product.batchSize * cfg.lastFewAt));
    const goingFast = Math.ceil(product.batchSize * cfg.goingFastAt);

    if (n <= lastFew) {
      // The only band that quotes the number, because at this point the
      // number is the actionable part.
      return {
        mode: 'live', n, band: 'last', state: 'low',
        label: `Only ${n} left today`,
        short: 'Last few',
      };
    }

    if (n <= goingFast) {
      return { mode: 'live', n, band: 'going', state: 'low', label: 'Going fast today', short: 'Going fast' };
    }

    return { mode: 'live', n, band: 'plenty', state: 'in', label: 'Plenty left today', short: 'Plenty left' };
  }

  /* ---- Any day still to come: say what the shop does -------------------- */
  // `popular` is a property of the product rather than of next Tuesday, so it
  // can be said honestly. It goes in the long label only — on the board it
  // would put an urgency notice on half the rows, which is the framing this
  // function was rewritten to remove.
  // Its own state, not 'in'. On a future day every ordinary item says the
  // same thing, and nine identical green badges read as a status column with
  // nothing to say. Muted, it reads as the normal case, which is what it is —
  // and the exceptions ("Not that day", a cake's notice period) stand out
  // against it instead of competing with it.
  return {
    mode: 'batch',
    state: 'baked',
    band: 'baked',
    label: product.popular
      ? "Baked fresh that morning. These go early, so it's worth ordering ahead."
      : 'Baked fresh that morning',
    short: 'Baked fresh',
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
