import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/loadTs.mjs';

const { downloadPartsFor } = loadTs('features/album/core/model.ts');
const { academicYearLabel, academicYearOf, academicYearsOf, monthPhotoCountsFor, semesterLabel, semesterPeriod } = loadTs('features/album/semester.ts');

test("academic years start in July", () => {
  assert.deepEqual(academicYearOf("2026-07-01"), 2026);
  assert.deepEqual(academicYearOf("2026-06-30"), 2025);
  assert.deepEqual(academicYearsOf(["2026-09-01", "2027-02-10", "2025-11-03", "bad"], "2026-11-16"), [2026, 2025]);
  assert.deepEqual(academicYearsOf([], "2026-03-01"), [2025]);
  assert.deepEqual(academicYearLabel(2026), "2026/2027");
});
test("semesters map to ranges and labels", () => {
  assert.deepEqual(semesterPeriod(2026, 1), { kind: "range", from: "2026-07-01", to: "2026-12-31" });
  assert.deepEqual(semesterPeriod(2026, 2), { kind: "range", from: "2027-01-01", to: "2027-06-30" });
  assert.deepEqual(semesterLabel(2026, 1), "Semester 1 · Juli–Desember 2026");
  assert.deepEqual(semesterLabel(2026, 2), "Semester 2 · Januari–Juni 2027");
});

const items = [
  { day: "2026-07-03", photos: 50 }, { day: "2026-09-09", photos: 60 }, { day: "2026-11-01", photos: 30 },
  { day: "2027-03-01", photos: 90 }, { day: undefined, photos: 5 },
];
test("counts every month of the semester, zero where nothing happened", () => {
  const months = monthPhotoCountsFor(items, semesterPeriod(2026, 1));
  assert.deepEqual(months.map((month) => month.photos), [50, 0, 60, 0, 30, 0]);
  assert.deepEqual(months[0], { year: 2026, month: 7, photos: 50 });
  assert.deepEqual(monthPhotoCountsFor(items, semesterPeriod(2026, 2)).map((month) => month.photos), [0, 0, 90, 0, 0, 0]);
});
test("feeds the part splitter when a semester is over the cap", () => {
  const period = semesterPeriod(2026, 1);
  const parts = downloadPartsFor({ period, monthPhotoCounts: monthPhotoCountsFor(items, period) }, 120);
  assert.deepEqual(parts.map((part) => [part.label, part.photos]), [["Bagian 1 · Juli–Oktober 2026", 110], ["Bagian 2 · November–Desember 2026", 30]]);
});
