/**
 * @file Locale-aware formatting. Everything regional goes through here, so a
 * merchant in Sydney and one in Tooting get correct money and dates without
 * any component knowing where it is.
 */

import { today, addDays, sameDay } from './dates.js';

/**
 * @typedef {{locale:string, currency:string}} FormatConfig
 */

/** @type {FormatConfig} */
let cfg = { locale: 'en-GB', currency: 'GBP' };

/** @param {FormatConfig} next */
export function configureFormat(next) {
  cfg = { ...cfg, ...next };
  cache.clear();
}

const cache = new Map();
function nf(key, opts) {
  if (!cache.has(key)) cache.set(key, new Intl.NumberFormat(cfg.locale, opts));
  return cache.get(key);
}

/** Money with decimals dropped on whole amounts — £4 rather than £4.00. */
export function money(n) {
  const whole = Number.isInteger(n);
  return nf(`m${whole}`, {
    style: 'currency',
    currency: cfg.currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Money always with decimals — for totals, where alignment matters. */
export function moneyExact(n) {
  return nf('me', { style: 'currency', currency: cfg.currency }).format(n);
}

/** @param {Date} d @param {Intl.DateTimeFormatOptions} [opts] */
export function date(d, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat(cfg.locale, opts).format(d);
}

/** @param {Date} d — "Tuesday, 20 October" */
export function dateLong(d) {
  return new Intl.DateTimeFormat(cfg.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
}

/** "Today" | "Tomorrow" | "Tuesday" */
export function dayWord(d) {
  const t = today();
  if (sameDay(d, t)) return 'Today';
  if (sameDay(d, addDays(t, 1))) return 'Tomorrow';
  return new Intl.DateTimeFormat(cfg.locale, { weekday: 'long' }).format(d);
}

/**
 * A full phrase without repeating the weekday. `dateLong` already names the
 * day, so only Today and Tomorrow add anything in front of it.
 * @param {Date} d
 */
export function whenPhrase(d) {
  const w = dayWord(d);
  return w === 'Today' || w === 'Tomorrow' ? `${w}, ${dateLong(d)}` : dateLong(d);
}

/** Countdown as "2h 14m" or "9m 03s". @param {number} ms */
export function duration(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s).padStart(2, '0')}s`;
}

/** Joins with the locale's own list conjunction. */
export function list(items, type = 'conjunction') {
  if (typeof Intl.ListFormat !== 'function') return items.join(', ');
  return new Intl.ListFormat(cfg.locale, { style: 'long', type }).format(items);
}
