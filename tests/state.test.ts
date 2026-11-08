/**
 * Regression tests for the state migrations in src/state.ts.
 *
 * normalizeState() is private on purpose, so these drive it through the public
 * loadState() with a minimal localStorage. What they protect is user data: a
 * wrong migration here does not throw, it quietly drops events or legends.
 *
 * Run with: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BRUSH_COLORS, loadState } from '../src/state.ts';

const STORAGE_KEY = 'editor-calendario-v1';

/** Minimal localStorage so loadState() can run outside a browser. */
const store: Record<string, string> = {};
(globalThis as unknown as { localStorage: unknown }).localStorage = {
  getItem: (key: string): string | null => (Object.hasOwn(store, key) ? store[key] : null),
  setItem: (key: string, value: string): void => {
    store[key] = String(value);
  },
  removeItem: (key: string): void => {
    delete store[key];
  },
  clear: (): void => {
    for (const key of Object.keys(store)) delete store[key];
  },
};

function loadRaw(raw: string | null) {
  for (const key of Object.keys(store)) delete store[key];
  if (raw !== null) store[STORAGE_KEY] = raw;
  return loadState();
}

function loadJson(value: unknown) {
  return loadRaw(JSON.stringify(value));
}

/** "YYYY-MM" of the month the app is booting in. */
function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

test('a legacy notes string lands in the month the app boots in', () => {
  const state = loadJson({ notes: 'Repasar apuntes' });
  assert.equal(state.notesByMonth[currentMonthKey()], 'Repasar apuntes');
  assert.equal(Object.keys(state.notesByMonth).length, 1);
});

test('legacy notes never overwrite notes stored for that month', () => {
  const key = currentMonthKey();
  const state = loadJson({ notes: 'viejo', notesByMonth: { [key]: 'nuevo' } });
  assert.equal(state.notesByMonth[key], 'nuevo');
});

test('an empty legacy notes string is not migrated', () => {
  const state = loadJson({ notes: '' });
  assert.equal(Object.keys(state.notesByMonth).length, 0);
});

test('per-month legends merge into the single fixed list', () => {
  // The global list is the oldest format, so it comes first; then each month's
  // own legend, in the order the months were stored.
  const state = loadJson({
    categories: [{ id: 'g', name: 'Global', color: '#000000' }],
    categoriesByMonth: {
      '2026-01': [{ id: 'a', name: 'Enero', color: '#111111' }],
      '2026-02': [
        { id: 'b', name: 'Febrero', color: '#222222' },
        { id: 'g', name: 'Global otra vez', color: '#000000' },
      ],
    },
  });
  assert.deepEqual(state.categories.map((cat) => cat.id), ['g', 'a', 'b']);
});

test('a lone legend id is listed once even when months repeat it', () => {
  const state = loadJson({
    categoriesByMonth: {
      '2026-01': [{ id: 'same', name: 'Uno', color: '#111111' }],
      '2026-02': [{ id: 'same', name: 'Dos', color: '#222222' }],
    },
  });
  assert.equal(state.categories.length, 1);
  assert.equal(state.categories[0].name, 'Uno');
});

test('discarded and migrated keys are gone from a loaded state', () => {
  const state = loadJson({
    notes: 'algo',
    showHolidays: true,
    categoriesByMonth: { '2026-01': [] },
  }) as Record<string, unknown>;
  assert.ok(!('notes' in state));
  assert.ok(!('categoriesByMonth' in state));
  assert.ok(!('showHolidays' in state));
});

test('only the oscuro theme survives as dark', () => {
  assert.equal(loadJson({ theme: 'oscuro' }).theme, 'oscuro');
  assert.equal(loadJson({ theme: 'claro' }).theme, 'claro');
  assert.equal(loadJson({ theme: 'dark' }).theme, 'claro');
  assert.equal(loadJson({}).theme, 'claro');
});

test('an empty brush color survives while a non-string does not', () => {
  // '' means "no colour selected": the brush must stay empty, not reset.
  assert.equal(loadJson({ brushColor: '' }).brushColor, '');
  assert.equal(loadJson({ brushColor: 42 }).brushColor, BRUSH_COLORS[0]);
  assert.equal(loadJson({}).brushColor, BRUSH_COLORS[0]);
});

test('a non-array events field becomes an empty list', () => {
  assert.deepEqual(loadJson({ events: null }).events, []);
  assert.deepEqual(loadJson({ events: { a: 1 } }).events, []);
  assert.equal(loadJson({ events: [{ id: 'e1', date: '2026-03-02', title: 'Hola', color: '#000' }] }).events.length, 1);
});

test('a stored month and year survive normalization', () => {
  const state = loadJson({ year: 2024, monthIndex: 2 });
  assert.equal(state.year, 2024);
  assert.equal(state.monthIndex, 2);
});

test('unreadable or absent storage falls back to the default state', () => {
  for (const state of [loadRaw('{esto no es json'), loadRaw('null'), loadRaw(null)]) {
    assert.deepEqual(state.events, []);
    assert.deepEqual(state.categories, []);
    assert.deepEqual(state.notesByMonth, {});
    assert.equal(state.theme, 'claro');
    assert.equal(state.season, 'otono');
  }
});
