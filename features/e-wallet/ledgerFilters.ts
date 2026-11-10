// Ledger filters → query parameters of GET wallet/ledger/. Filtering, search
// and paging all happen on the server.

import type { Query } from "@/lib/api/client";
import type { LedgerFilters, LedgerStatusFilter } from "./types";

export const LEDGER_PAGE_SIZE = 10;
/** How many months the month filter offers, counting back from today. */
export const MONTH_OPTION_COUNT = 12;

export const EMPTY_LEDGER_FILTERS: LedgerFilters = { search: "", month: "", status: "all" };

export const LEDGER_STATUS_OPTIONS: readonly { value: LedgerStatusFilter; label: string }[] = [
  { value: "all", label: "Semua Entri" },
  { value: "pending", label: "Mengambang" },
  { value: "available", label: "Tersedia" },
  { value: "withdrawal", label: "Penarikan" },
];

const STATUS_QUERY: Record<LedgerStatusFilter, Query> = {
  all: {},
  pending: { settlement_status: "pending_settlement" },
  available: { settlement_status: "settled" },
  withdrawal: { entry_type: "withdrawal,withdrawal_fee,withdrawal_reversal,withdrawal_fee_reversal" },
};

const pad = (value: number) => String(value).padStart(2, "0");

/** "2026-02" → { date_from: "2026-02-01", date_to: "2026-02-28" } (inclusive, as the backend expects). */
export function monthRange(month: string): { date_from: string; date_to: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return { date_from: `${month}-01`, date_to: `${month}-${pad(lastDay)}` };
}

/** "YYYY-MM" keys for the current month and the `count - 1` before it, newest first. */
export function recentMonths(now: Date, count = MONTH_OPTION_COUNT): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  });
}

export function ledgerQuery(filters: LedgerFilters): Query {
  return {
    search: filters.search.trim(),
    ...(filters.month ? monthRange(filters.month) : {}),
    ...STATUS_QUERY[filters.status],
  };
}

export function hasActiveFilters(filters: LedgerFilters): boolean {
  return Boolean(filters.search.trim() || filters.month || filters.status !== "all");
}
