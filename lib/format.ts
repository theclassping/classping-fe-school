// Display formatting shared by every feature (Indonesian locale).
// Add a formatter here instead of writing another Intl call in a component.

const LOCALE = "id-ID";

const rupiahFormatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const thousandsFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const monthFormatter = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric" });

const DATE_TIME_OPTIONS = {
  /** 10 Nov 2026 14.05 */
  short: { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" },
  /** Selasa, 10 November 2026 14.05 */
  long: { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" },
  /** 14.05 */
  time: { hour: "2-digit", minute: "2-digit" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateTimeStyle = keyof typeof DATE_TIME_OPTIONS;

const dateTimeFormatters = Object.fromEntries(
  Object.entries(DATE_TIME_OPTIONS).map(([style, options]) => [style, new Intl.DateTimeFormat(LOCALE, options)]),
) as Record<DateTimeStyle, Intl.DateTimeFormat>;

/** Number from a number or a backend decimal string ("1500000.00"); NaN when it is neither. */
export function toAmount(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string" || value.trim() === "") return Number.NaN;
  return Number(value);
}

/** "Rp 1.500.000"; `fallback` when the value is not a number. */
export function formatRupiah(value: number | string | null | undefined, fallback = "—"): string {
  const amount = toAmount(value);
  return Number.isFinite(amount) ? rupiahFormatter.format(amount) : fallback;
}

/** "+Rp 250.000" / "-Rp 2.500" for money moving in or out. */
export function formatSignedRupiah(value: number): string {
  return `${value < 0 ? "-" : "+"}${formatRupiah(Math.abs(value))}`;
}

/** "1.500.000" for amount inputs; empty for zero, negative, or invalid values. */
export function formatThousands(value: number): string {
  return Number.isFinite(value) && value > 0 ? thousandsFormatter.format(value) : "";
}

/** Formats an ISO timestamp; returns `fallback` when empty and the raw value when unparseable. */
export function formatDateTime(value: string | null | undefined, style: DateTimeStyle = "short", fallback = "-"): string {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatters[style].format(date);
}

/** Remaining time as "m:ss" (e.g. an OTP countdown); "0:00" once elapsed. */
export function formatCountdown(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** "2026-10" → "Oktober 2026". */
export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthFormatter.format(new Date(year, monthNumber - 1, 1));
}
