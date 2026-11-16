import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/loadTs.mjs';

const filter = loadTs('features/activities/dateFilter.ts');

test('a school week runs Monday to Friday around any day', () => {
  assert.deepEqual(filter.schoolWeekOf('2026-10-29'), { start: '2026-10-26', end: '2026-10-30' });
  assert.deepEqual(filter.schoolWeekOf('2026-11-01'), { start: '2026-10-26', end: '2026-10-30' });
});

test('the 30-day range starts on any day and crosses month and year ends', () => {
  assert.deepEqual(filter.thirtyDaysFrom('2026-11-15'), { start: '2026-11-15', end: '2026-12-14' });
  assert.deepEqual(filter.thirtyDaysFrom('2026-12-20'), { start: '2026-12-20', end: '2027-01-18' });
  assert.equal(filter.lastThirtyDaysStart('2026-11-16'), '2026-10-18');
  assert.equal(filter.thirtyDaysFrom(filter.lastThirtyDaysStart('2026-11-16')).end, '2026-11-16');
});

test('matchesDateFilter keeps the activities of the day, week or 30 days', () => {
  const days = ['', '2026-11-13', '2026-11-15', '2026-11-16', '2026-11-20', '2026-12-14', '2026-12-15'];
  const kept = (mode, date) => days.filter((day) => filter.matchesDateFilter(day, { mode, date }));
  assert.deepEqual(kept('all', '2026-11-16'), days);
  assert.deepEqual(kept('day', '2026-11-16'), ['2026-11-16']);
  assert.deepEqual(kept('week', '2026-11-18'), ['2026-11-16', '2026-11-20']);
  assert.deepEqual(kept('range', '2026-11-15'), ['2026-11-15', '2026-11-16', '2026-11-20', '2026-12-14']);
});

test('arrows step by a day, a week or 30 days and labels are Indonesian', () => {
  assert.deepEqual(['day', 'week', 'range'].map(filter.stepDays), [1, 7, 30]);
  assert.equal(filter.formatSelection('day', '2026-10-29'), 'Kamis, 29 Oktober 2026');
  assert.equal(filter.formatSelection('week', '2026-10-29'), 'Sen, 26 Okt – Jum, 30 Okt 2026');
  assert.equal(filter.formatSelection('range', '2026-11-15'), '15 Nov 2026 – 14 Des 2026');
});

test('the calendar grid covers the month in Monday-to-Sunday rows', () => {
  const weeks = filter.calendarWeeks('2026-10-15');
  assert.equal(weeks.length, 5);
  assert.equal(weeks[0][0], '2026-09-28');
  assert.equal(weeks.at(-1)[6], '2026-11-01');
});
