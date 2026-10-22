/**
 * @file The year — what the shop is making, and when.
 *
 * This is the template's signature and the one thing none of the other six
 * do. Catalan baking is organised by the calendar rather than by the
 * product: panellets exist for Tots Sants and not in March, a mona is given
 * by a godparent at Easter, and on the night of Sant Joan every forn in the
 * city is selling the same coca. A shop like this is a schedule.
 *
 * Pure and DOM-free, so it can be tested under `node --test` with no
 * browser, like everything in shared/core/.
 *
 * THE AWKWARD PART, AND WHY IT IS HERE
 *
 * Half of these dates are fixed and half are not. Reis is always 6 January.
 * But Easter moves, and three of the shop's biggest days hang off it:
 * coca de llardons on Dijous Gras, bunyols right through Lent, and the mona
 * on Easter Monday. Hardcoding a date for those would be wrong every year
 * except one, and silently — the shop would simply advertise the wrong week.
 *
 * So Easter is computed. The algorithm below is the anonymous Gregorian
 * computus, which is exact for every year in the Gregorian calendar; the
 * tests check it against a table of known Easter dates rather than against
 * itself.
 */

/**
 * Easter Sunday for a Gregorian year, as a local Date at midnight.
 *
 * The anonymous Gregorian algorithm. The names are the conventional ones
 * from the computus and are deliberately kept, because renaming them to
 * something "clearer" makes the method impossible to check against any
 * published description of it.
 *
 * @param {number} year
 * @returns {Date}
 */
export function easter(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** A new Date `n` days from `d`, at midnight, local. */
export function addDays(d, n) {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + n);
  return out;
}

/** Midnight, local, so two dates can be compared without time getting in. */
export function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole days from `a` to `b`. Negative when `b` is in the past. */
export function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
}

/**
 * Resolve one entry's date in a given year.
 *
 * An entry is either fixed (`"on": "01-06"`) or hung off Easter
 * (`"easter": -52`), which is how the moveable feasts are expressed. Nothing
 * in the config has to know what Easter is.
 *
 * @param {object} entry
 * @param {number} year
 * @returns {Date|null} null when the entry is malformed, rather than a wrong date
 */
export function dateOf(entry, year) {
  if (typeof entry.easter === 'number') return addDays(easter(year), entry.easter);
  if (typeof entry.on === 'string') {
    const m = entry.on.match(/^(\d{2})-(\d{2})$/);
    if (!m) return null;
    return new Date(year, Number(m[1]) - 1, Number(m[2]));
  }
  return null;
}

/**
 * The window an entry is actually on sale, as [from, to] inclusive.
 *
 * `sells` is [daysBefore, daysAfter]. A tortell is in the window for a
 * fortnight before Reis and the day itself; bunyols run the whole of Lent,
 * which is expressed as a long window rather than as forty entries.
 */
export function windowOf(entry, year) {
  const on = dateOf(entry, year);
  if (!on) return null;
  const [before = 0, after = 0] = entry.sells ?? [];
  return { on, from: addDays(on, -Math.abs(before)), to: addDays(on, Math.abs(after)) };
}

/**
 * Every occurrence of every entry that could be relevant to `today`.
 *
 * Deliberately spans three years — last, this and next. An entry in the
 * first days of January is still "coming" when today is late December, and
 * computing only the current year makes it vanish and then reappear. That
 * is the bug this function exists to not have.
 *
 * @param {object[]} entries
 * @param {Date} today
 * @returns {{entry:object, on:Date, from:Date, to:Date, status:string, days:number}[]}
 */
export function occurrences(entries, today = new Date()) {
  const t = startOfDay(today);
  const out = [];

  for (const entry of entries ?? []) {
    for (const year of [t.getFullYear() - 1, t.getFullYear(), t.getFullYear() + 1]) {
      const w = windowOf(entry, year);
      if (!w) continue;

      const status =
        t < w.from ? 'coming' : t > w.to ? 'past' : 'on';

      out.push({
        entry,
        on: w.on,
        from: w.from,
        to: w.to,
        status,
        /* Days until it goes on sale, which is the number a customer wants.
           Zero once it is on sale, negative once it is over. */
        days: daysBetween(t, w.from),
      });
    }
  }

  out.sort((a, b) => a.on - b.on);
  return out;
}

/** What is on the bench right now. */
export function onNow(entries, today = new Date()) {
  return occurrences(entries, today).filter((o) => o.status === 'on');
}

/**
 * What is coming, soonest first.
 *
 * @param {object[]} entries
 * @param {Date} today
 * @param {number} limit
 */
export function coming(entries, today = new Date(), limit = 3) {
  return occurrences(entries, today)
    .filter((o) => o.status === 'coming')
    .sort((a, b) => a.from - b.from)
    .slice(0, limit);
}

/**
 * The next time a named entry comes round, for the question a customer
 * actually asks: "can I have a tortell?" in March.
 *
 * Returns the next occurrence that has not finished, which may be this
 * year's (if it is still to come) or next year's.
 */
export function nextFor(entry, today = new Date()) {
  const t = startOfDay(today);
  const years = [t.getFullYear() - 1, t.getFullYear(), t.getFullYear() + 1, t.getFullYear() + 2];
  for (const year of years) {
    const w = windowOf(entry, year);
    if (!w) continue;
    if (t <= w.to) {
      return { ...w, status: t < w.from ? 'coming' : 'on', days: daysBetween(t, w.from) };
    }
  }
  return null;
}
