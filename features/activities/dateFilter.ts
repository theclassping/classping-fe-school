/** A calendar day as "YYYY-MM-DD", the format of an activity's `date`. */
export type DayKey = string;

/** "all" shows everything; the others are anchored on a day picked in the calendar. */
export type ActivityDateMode = "all" | "day" | "week" | "range";
export type DatedMode = Exclude<ActivityDateMode, "all">;
export type ActivityDateFilter = { mode: ActivityDateMode; date: DayKey };
export type DayRange = { start: DayKey; end: DayKey };

/** Length of the "30 hari" window, counting its first day. */
export const RANGE_DAYS = 30;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toUtc(key: DayKey) {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function fromUtc(ms: number): DayKey {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Today in the school's timezone. */
export function todayKey(timeZone = "Asia/Jakarta"): DayKey {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function shiftDay(key: DayKey, days: number): DayKey {
  return fromUtc(toUtc(key) + days * 86_400_000);
}

/** The first day of the month `months` away from the given day's month. */
export function shiftMonth(key: DayKey, months: number): DayKey {
  const [year, month] = key.split("-").map(Number);
  return fromUtc(Date.UTC(year, month - 1 + months, 1));
}

/** The school week (Monday to Friday) that contains the given day. */
export function schoolWeekOf(key: DayKey): DayRange {
  const weekday = new Date(toUtc(key)).getUTCDay(); // 0 = Sunday
  const start = shiftDay(key, -((weekday + 6) % 7));
  return { start, end: shiftDay(start, 4) };
}

/** The 30 days that start on the given day, which can be any day of a month. */
export function thirtyDaysFrom(key: DayKey): DayRange {
  return { start: key, end: shiftDay(key, RANGE_DAYS - 1) };
}

/** The start of the 30 days that end today, the window the 30-day view opens on. */
export function lastThirtyDaysStart(today: DayKey = todayKey()): DayKey {
  return shiftDay(today, 1 - RANGE_DAYS);
}

/** The days a selection covers: the day itself, its school week, or the 30 days from it. */
export function dayRangeOf(mode: DatedMode, date: DayKey): DayRange {
  if (mode === "week") return schoolWeekOf(date);
  if (mode === "range") return thirtyDaysFrom(date);
  return { start: date, end: date };
}

/** Whether an activity dated `day` belongs to the selection. Undated activities only show under "all". */
export function matchesDateFilter(day: string, filter: ActivityDateFilter) {
  if (filter.mode === "all") return true;
  const { start, end } = dayRangeOf(filter.mode, filter.date);
  const key = day.slice(0, 10);
  return key >= start && key <= end;
}

/** How far the previous/next arrows move the selection, in days. */
export function stepDays(mode: DatedMode) {
  return mode === "week" ? 7 : mode === "range" ? RANGE_DAYS : 1;
}

const dayFormatter = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const weekFormatter = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const rangeFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const monthFormatter = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });

export function formatDayKey(key: DayKey) {
  return dayFormatter.format(new Date(toUtc(key)));
}

export function formatMonth(key: DayKey) {
  return monthFormatter.format(new Date(toUtc(key)));
}

/**
 * The label of a selection: "Kamis, 29 Oktober 2026", "Sen, 26 Okt – Jum, 30 Okt 2026"
 * or "15 Nov 2026 – 14 Des 2026".
 */
export function formatSelection(mode: DatedMode, date: DayKey) {
  const { start, end } = dayRangeOf(mode, date);
  if (mode === "day") return formatDayKey(date);
  if (mode === "week") return `${weekFormatter.format(new Date(toUtc(start)))} – ${weekFormatter.format(new Date(toUtc(end)))} ${end.slice(0, 4)}`;
  return `${rangeFormatter.format(new Date(toUtc(start)))} – ${rangeFormatter.format(new Date(toUtc(end)))}`;
}

export function isWeekend(key: DayKey) {
  const weekday = new Date(toUtc(key)).getUTCDay();
  return weekday === 0 || weekday === 6;
}

/**
 * The calendar grid for the month containing `key`: full Monday-to-Sunday
 * rows from the week of the 1st through the week of the last day.
 */
export function calendarWeeks(key: DayKey): DayKey[][] {
  const first = shiftMonth(key, 0);
  const last = shiftDay(shiftMonth(key, 1), -1);
  const weeks: DayKey[][] = [];
  for (let cursor = schoolWeekOf(first).start; cursor <= last; cursor = shiftDay(cursor, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, index) => shiftDay(cursor, index)));
  }
  return weeks;
}
