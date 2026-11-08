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
import { addDaysISO, daysBetweenISO } from '../src/calendar.ts';

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
