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
