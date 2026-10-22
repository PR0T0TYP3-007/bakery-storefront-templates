/**
 * Tests for js/year.js — the festival calendar.
 *
 * The point of testing this is that it is wrong in a way nobody would see:
 * a shop advertising bunyols in the wrong week looks like a shop, not like a
 * bug. So Easter is checked against a published table rather than against
 * the algorithm that produced it, and the moveable feasts are checked
 * against the real Catalan calendar for a year somebody can look up.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  easter, addDays, daysBetween, dateOf, windowOf,
  occurrences, onNow, coming, nextFor,
} from '../js/year.js';

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* Published Easter Sunday dates. If the computus is wrong these are the
   only thing that will say so — comparing the function to itself proves
   nothing. */
const KNOWN_EASTER = {
  2020: '2020-04-12',
  2021: '2021-04-04',
  2022: '2022-04-17',
  2023: '2023-04-09',
  2024: '2024-03-31',
  2025: '2025-04-20',
  2026: '2026-04-05',
  2027: '2027-03-28',
  2030: '2030-04-21',
  2038: '2038-04-25', // the latest Easter can fall
  1818: '1818-03-22', // the earliest it has fallen in the Gregorian era
};

test('easter matches published dates, including the extremes', () => {
  for (const [year, expected] of Object.entries(KNOWN_EASTER)) {
    assert.equal(iso(easter(Number(year))), expected, `Easter ${year}`);
  }
});

test('easter always falls on a Sunday', () => {
  for (let y = 1900; y <= 2100; y++) {
    assert.equal(easter(y).getDay(), 0, `${y} is not a Sunday`);
  }
});

test('easter always falls between 22 March and 25 April', () => {
  for (let y = 1900; y <= 2100; y++) {
    const e = easter(y);
    const tooEarly = e < new Date(y, 2, 22);
    const tooLate = e > new Date(y, 3, 25);
    assert.ok(!tooEarly && !tooLate, `${y}: ${iso(e)} is outside the possible range`);
  }
});

/* --------------------------------------------------------------------------
   The Catalan calendar, resolved
   -------------------------------------------------------------------------- */

const REIS = { id: 'reis', on: '01-06', sells: [14, 1] };
const MONA = { id: 'mona', easter: 1, sells: [7, 1] };          // Easter Monday
const LLARDONS = { id: 'llardons', easter: -52, sells: [5, 2] }; // Dijous Gras
const BUNYOLS = { id: 'bunyols', easter: -46, sells: [0, 46] };  // Ash Weds -> Easter
const SANT_JOAN = { id: 'coca', on: '06-23', sells: [7, 1] };
const PANELLETS = { id: 'panellets', on: '11-01', sells: [10, 1] };

test('moveable feasts resolve to the right days in 2026', () => {
  // Easter 2026 is 5 April, so:
  assert.equal(iso(dateOf(MONA, 2026)), '2026-04-06');     // Easter Monday
  assert.equal(iso(dateOf(LLARDONS, 2026)), '2026-02-12'); // Dijous Gras
  assert.equal(iso(dateOf(BUNYOLS, 2026)), '2026-02-18');  // Ash Wednesday
});

test('Dijous Gras is a Thursday and Ash Wednesday a Wednesday, every year', () => {
  for (let y = 2000; y <= 2060; y++) {
    assert.equal(dateOf(LLARDONS, y).getDay(), 4, `Dijous Gras ${y}`);
    assert.equal(dateOf(BUNYOLS, y).getDay(), 3, `Ash Wednesday ${y}`);
  }
});

test('fixed dates do not move', () => {
  assert.equal(iso(dateOf(REIS, 2026)), '2026-01-06');
  assert.equal(iso(dateOf(SANT_JOAN, 2027)), '2027-06-23');
  assert.equal(iso(dateOf(PANELLETS, 2030)), '2030-11-01');
});

test('a malformed entry returns null rather than a wrong date', () => {
  assert.equal(dateOf({ id: 'bad' }, 2026), null);
  assert.equal(dateOf({ id: 'bad', on: 'January 6th' }, 2026), null);
  assert.equal(windowOf({ id: 'bad' }, 2026), null);
});

/* --------------------------------------------------------------------------
   Windows and status
   -------------------------------------------------------------------------- */

const ALL = [REIS, MONA, LLARDONS, BUNYOLS, SANT_JOAN, PANELLETS];

test('a tortell is on sale for the fortnight before Reis, and not after', () => {
  assert.deepEqual(onNow(ALL, new Date(2026, 0, 2)).map((o) => o.entry.id), ['reis']);
  assert.deepEqual(onNow(ALL, new Date(2026, 0, 6)).map((o) => o.entry.id), ['reis']);
  assert.deepEqual(onNow(ALL, new Date(2026, 0, 9)).map((o) => o.entry.id), []);
});

test('bunyols run the whole of Lent', () => {
  // Lent 2026: Ash Wednesday 18 Feb to Easter 5 April.
  const mid = new Date(2026, 2, 10);
  assert.ok(onNow(ALL, mid).some((o) => o.entry.id === 'bunyols'));
  assert.ok(!onNow(ALL, new Date(2026, 1, 1)).some((o) => o.entry.id === 'bunyols'));
});

test('asking for a tortell in March gets the date it comes back', () => {
  const march = new Date(2026, 2, 15);
  const next = nextFor(REIS, march);
  assert.equal(next.status, 'coming');
  assert.equal(iso(next.on), '2027-01-06', 'should roll to next year, not report this one');
  assert.ok(next.days > 0);
});

test('an entry still on sale reports itself as on, not as next year', () => {
  const next = nextFor(SANT_JOAN, new Date(2026, 5, 23));
  assert.equal(next.status, 'on');
  assert.equal(iso(next.on), '2026-06-23');
});

test('a January feast is visible across the year boundary', () => {
  /* The bug this guards: computing only the current year makes Reis vanish
     on 20 December and reappear on 1 January.

     Note the dates. A tortell sells for the fortnight before 6 January, so
     next year's window opens on 23 December — which means that by the 28th
     it is already *on the bench*, not merely coming. The first version of
     this test asserted "coming" on the 28th and failed, and the code was
     right: on 28 December you can walk in and buy one. */
  const midDec = new Date(2026, 11, 15);
  assert.ok(
    coming(ALL, midDec, 3).some((o) => o.entry.id === 'reis'),
    'mid-December: next January\'s tortell should be coming'
  );

  const lateDec = new Date(2026, 11, 28);
  const on = onNow(ALL, lateDec).map((o) => o.entry.id);
  assert.ok(on.includes('reis'), `late December: tortell should be on sale, got ${JSON.stringify(on)}`);
});

test('coming is sorted soonest first and respects the limit', () => {
  const list = coming(ALL, new Date(2026, 0, 20), 2);
  assert.equal(list.length, 2);
  assert.ok(list[0].from <= list[1].from);
});

test('days counts to the start of the window, and is zero once on sale', () => {
  assert.equal(daysBetween(new Date(2026, 0, 1), new Date(2026, 0, 6)), 5);
  const on = onNow(ALL, new Date(2026, 0, 6))[0];
  assert.ok(on.days <= 0);
});

test('addDays does not drift across a DST boundary', () => {
  /* Spain moves its clocks on the last Sunday in March. Adding days with
     setDate rather than with milliseconds is what keeps this honest. */
  const before = new Date(2026, 2, 28);
  assert.equal(iso(addDays(before, 2)), '2026-03-30');
});
