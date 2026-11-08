/**
 * Regression tests for src/calendar.ts.
 *
 * These pin existing behavior (characterization tests): they document rules the
 * app already relies on, so a future refactor that breaks one fails here instead
 * of showing a shifted calendar or a truncated event series.
 *
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysISO,
  daysBetweenISO,
  getMonthGrid,
  occurrenceIndex,
  occurrenceStartFor,
  recurrenceLimit,
  toTimeInputValue,
} from '../src/calendar.ts';

const flatGrid = (year: number, monthIndex: number) => getMonthGrid(year, monthIndex).flat();

test('addDaysISO crosses the year boundary', () => {
  assert.equal(addDaysISO('2026-12-31', 1), '2027-01-01');
  assert.equal(addDaysISO('2027-01-01', -1), '2026-12-31');
});

test('addDaysISO lands on the leap day', () => {
  assert.equal(addDaysISO('2028-02-28', 1), '2028-02-29');
  assert.equal(addDaysISO('2028-02-29', 1), '2028-03-01');
});

test('daysBetweenISO counts the real length of a month', () => {
  assert.equal(daysBetweenISO('2026-03-01', '2026-04-01'), 31);
  // The range is end-exclusive in spirit: same day is zero days apart.
  assert.equal(daysBetweenISO('2026-03-01', '2026-03-01'), 0);
});

test('daysBetweenISO absorbs the 23-hour day of a DST change', () => {
  // 2026-03-29 is the spring-forward day in Europe/Madrid: the span from the
  // 28th to the 30th is 47 hours, which must read as two whole days.
  assert.equal(daysBetweenISO('2026-03-28', '2026-03-30'), 2);
});

test('getMonthGrid pads a month that starts on a Sunday', () => {
  // February 2026 starts on a Sunday, so the first Monday-first row begins on
  // 26 January and the grid needs five weeks.
  const weeks = getMonthGrid(2026, 1);
  assert.equal(weeks.length, 5);
  assert.equal(weeks[0][0].iso, '2026-01-26');
  assert.equal(weeks[0][0].inMonth, false);
  assert.equal(weeks[4][6].iso, '2026-03-01');
});

test('getMonthGrid renders six weeks when the month needs six rows', () => {
  // November 2026 starts on a Sunday and has 30 days: 6 offset + 30 -> 42 cells.
  const weeks = getMonthGrid(2026, 10);
  assert.equal(weeks.length, 6);
  assert.equal(weeks.flat().length, 42);
});

test('getMonthGrid keeps the leap day inside its own month', () => {
  const leap = flatGrid(2028, 1).filter((cell) => cell.iso === '2028-02-29');
  assert.equal(leap.length, 1);
  assert.equal(leap[0].inMonth, true);
});

test('getMonthGrid yields four rows when the month is exactly one Monday week', () => {
  // February 2021 starts on a Monday and has 28 days, so a Monday-first layout
  // needs no neighbouring-month padding: the grid is exactly four full weeks.
  const weeks = getMonthGrid(2021, 1);
  assert.equal(weeks.length, 4);
  assert.equal(weeks[0][0].iso, '2021-02-01');
  assert.equal(weeks[3][6].iso, '2021-02-28');
  assert.ok(weeks.flat().every((cell) => cell.inMonth));
});

test('toTimeInputValue maps legacy free text onto time input values', () => {
  assert.equal(toTimeInputValue('9:00'), '09:00');
  assert.equal(toTimeInputValue('21:30'), '21:30');
  assert.equal(toTimeInputValue('9.00 am'), '09:00');
  assert.equal(toTimeInputValue('9 pm'), '21:00');
});

test('toTimeInputValue resolves the 12-hour meridiem boundaries', () => {
  assert.equal(toTimeInputValue('12:00 am'), '00:00');
  assert.equal(toTimeInputValue('12:00 pm'), '12:00');
  assert.equal(toTimeInputValue('12 am'), '00:00');
});

test('toTimeInputValue rejects anything it cannot map', () => {
  assert.equal(toTimeInputValue(''), '');
  assert.equal(toTimeInputValue(undefined), '');
  assert.equal(toTimeInputValue('25:00'), '');
  assert.equal(toTimeInputValue('9:75'), '');
  assert.equal(toTimeInputValue('13:00 pm'), '');
  assert.equal(toTimeInputValue('mañana'), '');
});

test('recurrenceLimit treats a missing or unusable count as unlimited', () => {
  assert.equal(recurrenceLimit({ date: '2026-03-02' }), 0);
  assert.equal(recurrenceLimit({ date: '2026-03-02', recurrence: 'semanal' }), 0);
  assert.equal(recurrenceLimit({ date: '2026-03-02', recurrence: 'semanal', recurrenceCount: 0 }), 0);
  assert.equal(recurrenceLimit({ date: '2026-03-02', recurrence: 'mensual', recurrenceCount: -3 }), 0);
});

test('recurrenceLimit caps a series at 999 occurrences', () => {
  assert.equal(recurrenceLimit({ date: '2026-03-02', recurrence: 'semanal', recurrenceCount: 5 }), 5);
  assert.equal(recurrenceLimit({ date: '2026-03-02', recurrence: 'semanal', recurrenceCount: 5000 }), 999);
  assert.equal(recurrenceLimit({ date: '2026-03-02', recurrence: 'semanal', recurrenceCount: 2.7 }), 2);
});

test('a weekly series never reaches a day before its anchor', () => {
  // Starts on Wednesday 2026-03-04 and includes Mondays, but the Monday of its
  // own first week sits behind the anchor and must not become an occurrence.
  const span = {
    date: '2026-03-04',
    recurrence: 'semanal' as const,
    recurrenceDays: [0, 2, 4],
  };
  assert.equal(occurrenceStartFor(span, '2026-03-02'), null);
  assert.equal(occurrenceStartFor(span, '2026-03-04'), '2026-03-04');
});

test('a monthly series on the 31st skips months that have no 31st', () => {
  const span = { date: '2026-01-31', recurrence: 'mensual' as const };
  assert.equal(occurrenceStartFor(span, '2026-02-28'), null);
  assert.equal(occurrenceStartFor(span, '2026-03-31'), '2026-03-31');
  // February is skipped rather than consuming a slot in the series.
  assert.equal(occurrenceIndex(span, '2026-03-31'), 2);
  assert.equal(occurrenceIndex(span, '2026-05-31'), 3);
});

test('a repeat count on a monthly 31st series counts only real months', () => {
  const span = { date: '2026-01-31', recurrence: 'mensual' as const, recurrenceCount: 2 };
  assert.equal(occurrenceStartFor(span, '2026-03-31'), '2026-03-31'); // occurrence 2, at the cap
  assert.equal(occurrenceStartFor(span, '2026-05-31'), null); // occurrence 3, past the cap
});

test('the anchor week of a weekly series counts only its remaining days', () => {
  // Starts Wednesday 2026-03-04 with Monday, Wednesday and Friday picked. That
  // first week holds two occurrences (Wed, Fri), not three, because its Monday
  // is behind the anchor.
  const span = {
    date: '2026-03-04',
    recurrence: 'semanal' as const,
    recurrenceDays: [0, 2, 4],
  };
  assert.equal(occurrenceIndex(span, '2026-03-04'), 1); // Wednesday, the anchor
  assert.equal(occurrenceIndex(span, '2026-03-06'), 2); // Friday, same week
  assert.equal(occurrenceIndex(span, '2026-03-09'), 3); // Monday, next week
  assert.equal(occurrenceIndex(span, '2026-03-13'), 5); // Friday, next week
});

test('an every-N-weeks series counts only its active weeks', () => {
  // Wednesday 2026-03-04, every second week: 04, 18, 01-04 and so on.
  const span = {
    date: '2026-03-04',
    recurrence: 'semanal' as const,
    recurrenceDays: [2],
    recurrenceInterval: 2,
  };
  assert.equal(occurrenceStartFor(span, '2026-03-11'), null); // the skipped week
  assert.equal(occurrenceStartFor(span, '2026-03-18'), '2026-03-18');
  assert.equal(occurrenceIndex(span, '2026-03-18'), 2);
  assert.equal(occurrenceIndex(span, '2026-04-01'), 3);
});

test('a recurring multi-day event is found through any of its days', () => {
  // Monday 2026-03-02 running for three days, repeated every Monday.
  const span = {
    date: '2026-03-02',
    endDate: '2026-03-04',
    recurrence: 'semanal' as const,
  };
  assert.equal(occurrenceStartFor(span, '2026-03-02'), '2026-03-02');
  assert.equal(occurrenceStartFor(span, '2026-03-03'), '2026-03-02');
  assert.equal(occurrenceStartFor(span, '2026-03-04'), '2026-03-02');
  assert.equal(occurrenceStartFor(span, '2026-03-10'), '2026-03-09');
  assert.equal(occurrenceStartFor(span, '2026-03-12'), null); // past the run
});

test('truncating a series keeps exactly the occurrences before the deleted one', () => {
  // Deleting an occurrence sets recurrenceCount to occurrenceIndex - 1, so this
  // pins that the two functions agree about where an occurrence sits.
  const base = {
    date: '2026-03-04',
    recurrence: 'semanal' as const,
    recurrenceDays: [0, 2, 4],
  };
  const deleted = '2026-03-09';
  const index = occurrenceIndex(base, deleted);
  assert.equal(index, 3);

  const truncated = { ...base, recurrenceCount: index - 1 };
  assert.equal(occurrenceStartFor(truncated, '2026-03-06'), '2026-03-06'); // occurrence 2 stays
  assert.equal(occurrenceStartFor(truncated, deleted), null); // the deleted one is gone
  assert.equal(occurrenceStartFor(truncated, '2026-03-11'), null); // and everything after it
});
