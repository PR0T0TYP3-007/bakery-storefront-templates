/**
 * @file Calendar arithmetic. Pure, DOM-free, timezone-naive by design —
 * all dates represent a *local calendar day* at the bakery, never an instant.
 */

/** @param {Date|string|number} d @returns {Date} midnight local */
export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** @returns {Date} today at midnight local */
export function today() {
  return startOfDay(new Date());
}

/** @param {Date} d @param {number} n @returns {Date} */
export function addDays(d, n) {
  const x = startOfDay(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Stable YYYY-MM-DD key built from local parts.
 * `toISOString()` is deliberately avoided: it converts to UTC and silently
 * shifts the day for anyone west of Greenwich.
 * @param {Date} d @returns {string}
 */
export function dateKey(d) {
  const x = startOfDay(d);
  return [
    x.getFullYear(),
    String(x.getMonth() + 1).padStart(2, '0'),
    String(x.getDate()).padStart(2, '0'),
  ].join('-');
}

/** @param {string} key @returns {Date|null} */
export function keyToDate(key) {
  if (typeof key !== 'string') return null;
  const [y, m, d] = key.split('-').map(Number);
  if (!y || !m || !d) return null;
  return startOfDay(new Date(y, m - 1, d));
}

/** @returns {boolean} */
export function sameDay(a, b) {
  return Boolean(a && b) && dateKey(a) === dateKey(b);
}

/** Whole days from a to b. @returns {number} */
export function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
}

/**
 * Minutes until the next occurrence of `hour` local. Past today's, it rolls
 * to tomorrow's rather than going negative — the deadline is still real, it
 * has only moved.
 * @param {number} hour @param {Date} [now]
 * @returns {number} milliseconds
 */
export function msUntilHour(hour, now = new Date()) {
  const cut = new Date(now);
  cut.setHours(hour, 0, 0, 0);
  if (cut <= now) cut.setDate(cut.getDate() + 1);
  return cut - now;
}

/** @returns {boolean} true once the day's cutoff has passed */
export function cutoffPassed(hour, now = new Date()) {
  return now.getHours() >= hour;
}
