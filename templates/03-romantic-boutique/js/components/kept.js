/**
 * @file Kept dates.
 *
 * The occasion layer. After an order the shop offers to keep the date; on a
 * later visit it says how long there is left and offers what you sent last
 * time.
 *
 * **What this is not.** The research found vendor marketing for birthday
 * reminders and no independent conversion data at all — one WooCommerce
 * add-on cites a "179% higher unique click rate" with no source and no
 * method. §11 of the brief rejects unsubstantiated claims that a creative
 * feature will increase sales, so this template does not make one. The
 * concept doc §9 records it as a hypothesis with the measurement that would
 * settle it.
 *
 * **And it is honest about where it lives.** This is `localStorage`: this
 * browser, this device, no account, no email. Every surface that shows a kept
 * date says so. A reminder feature that implied it would email somebody would
 * be a demo that only works in a demo, which the brief rejects in those
 * words.
 */

import * as session from '../services/session.js';
import { today, keyToDate, dateKey, startOfDay } from '../../../../shared/core/dates.js';

const KEY = 'keptDates';

/** @returns {Array<{id:string, who:string, occasion:string, on:string, productId:string|null}>} */
export function kept() {
  const list = session.state.store?.read(KEY, []) ?? [];
  return Array.isArray(list) ? list : [];
}

/** @param {{who:string, occasion:string, on:string, productId?:string|null}} entry */
export function keep(entry) {
  const who = String(entry.who ?? '').trim();
  if (!who || !entry.on) return kept();

  const list = kept().filter(
    // One date per person per occasion. Ordering a second birthday cake for
    // the same person should update what we kept, not leave two rows that
    // disagree.
    (k) => !(k.who.toLowerCase() === who.toLowerCase() && k.occasion === entry.occasion)
  );

  list.push({
    id: `${who.toLowerCase().replace(/\W+/g, '-')}-${entry.occasion}`,
    who,
    occasion: entry.occasion,
    on: entry.on,
    productId: entry.productId ?? null,
    keptAt: new Date().toISOString(),
  });

  session.state.store.write(KEY, list);
  return list;
}

export function forget(id) {
  const list = kept().filter((k) => k.id !== id);
  session.state.store.write(KEY, list);
  return list;
}

/**
 * How many days until this date comes round again.
 *
 * A birthday kept in 2026 is still a birthday in 2027, so a date in the past
 * rolls forward a year rather than reading as overdue. A one-off — a wedding
 * — would not, which is why only recurring occasions are offered for keeping
 * on the confirmation page.
 *
 * @param {string} key  YYYY-MM-DD
 * @returns {{days:number, next:Date}}
 */
export function daysUntil(key) {
  const now = startOfDay(today());
  const on = keyToDate(key);
  let next = new Date(now.getFullYear(), on.getMonth(), on.getDate());
  if (next < now) next = new Date(now.getFullYear() + 1, on.getMonth(), on.getDate());
  return { days: Math.round((next - now) / 86400000), next };
}

/**
 * The kept date worth mentioning right now, or null.
 *
 * One at a time. A list of everything stored would be a dashboard; a shop
 * mentions the next thing and leaves it there.
 */
export function dueSoon(merchant = session.state.merchant) {
  const within = merchant?.keptDates?.remindDaysBefore ?? 21;
  const soonest = kept()
    .map((k) => ({ ...k, ...daysUntil(k.on) }))
    .filter((k) => k.days <= within)
    .sort((a, b) => a.days - b.days)[0];
  return soonest ?? null;
}

/** The occasions it makes sense to keep — the ones that come round again. */
export const RECURRING = ['birthday', 'anniversary'];

export const isRecurring = (occasionId) => RECURRING.includes(occasionId);

/** Today's key, for defaulting a form. */
export const todayKey = () => dateKey(today());
