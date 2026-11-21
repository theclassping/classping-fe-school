import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/loadTs.mjs';

const { nextSort, sortBy } = loadTs('lib/sort.ts');

test('clicking a header starts at the first direction, then flips', () => {
  assert.deepEqual(nextSort(null, 'name'), { key: 'name', direction: 'asc' });
  assert.deepEqual(nextSort({ key: 'name', direction: 'asc' }, 'name'), { key: 'name', direction: 'desc' });
  assert.deepEqual(nextSort({ key: 'name', direction: 'desc' }, 'name'), { key: 'name', direction: 'asc' });
  assert.deepEqual(nextSort({ key: 'name', direction: 'asc' }, 'date', 'desc'), { key: 'date', direction: 'desc' });
});

test('sortBy orders strings naturally and numbers numerically, keeping empties last', () => {
  const rows = [{ c: '10A', n: 5 }, { c: '', n: Number.NaN }, { c: '2B', n: 150000 }, { c: 'kelas 1', n: 20 }];
  const value = (row, key) => row[key];
  assert.deepEqual(sortBy(rows, { key: 'c', direction: 'asc' }, value).map((r) => r.c), ['2B', '10A', 'kelas 1', '']);
  assert.deepEqual(sortBy(rows, { key: 'c', direction: 'desc' }, value).map((r) => r.c), ['kelas 1', '10A', '2B', '']);
  assert.deepEqual(sortBy(rows, { key: 'n', direction: 'desc' }, value).map((r) => r.n), [150000, 20, 5, Number.NaN]);
  assert.deepEqual(sortBy(rows, null, value), rows);
  assert.notEqual(sortBy(rows, null, value), rows);
});
