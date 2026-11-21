// Ledger filters and sort → query parameters of GET wallet/ledger/. Filtering,
// search, sorting and paging all happen on the server.

import type { Query } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import type { SortState } from "@/lib/sort";
import type { LedgerFilters, LedgerSortKey, LedgerStatusFilter } from "./types";

export const LEDGER_PAGE_SIZE = 10;

export const EMPTY_LEDGER_FILTERS: LedgerFilters = { search: "", dateFrom: "", dateTo: "", status: "all" };

export const LEDGER_STATUS_OPTIONS: readonly { value: LedgerStatusFilter; label: string }[] = [
  { value: "all", label: "Semua Status" },
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

/** Both dates are inclusive "YYYY-MM-DD", as the backend expects; empty ones are left out. */
export function ledgerQuery(filters: LedgerFilters): Query {
  return {
    search: filters.search.trim(),
    ...(filters.dateFrom ? { date_from: filters.dateFrom } : {}),
    ...(filters.dateTo ? { date_to: filters.dateTo } : {}),
    ...STATUS_QUERY[filters.status],
  };
}

/** Filters in the filter panel (search and the toolbar are not counted). */
export function activePanelFilterCount(filters: LedgerFilters): number {
  return Number(Boolean(filters.dateFrom || filters.dateTo)) + Number(filters.status !== "all");
}

export function hasActiveFilters(filters: LedgerFilters): boolean {
  return Boolean(filters.search.trim()) || activePanelFilterCount(filters) > 0;
}

const formatDay = (day: string) => formatDateTime(`${day}T00:00:00`, "date");

/** "1 November 2026 – 21 November 2026", "Sejak …", "Sampai …", or "Semua periode". */
export function periodLabel(filters: Pick<LedgerFilters, "dateFrom" | "dateTo">): string {
  const { dateFrom, dateTo } = filters;
  if (dateFrom && dateTo) return dateFrom === dateTo ? formatDay(dateFrom) : `${formatDay(dateFrom)} – ${formatDay(dateTo)}`;
  if (dateFrom) return `Sejak ${formatDay(dateFrom)}`;
  if (dateTo) return `Sampai ${formatDay(dateTo)}`;
  return "Semua periode";
}

/** The backend's own order: newest first. */
export const DEFAULT_LEDGER_SORT: NonNullable<SortState<LedgerSortKey>> = { key: "created_at", direction: "desc" };

/** { created_at, desc } → { ordering: "-created_at" }; null uses the default order. */
export function ledgerOrdering(sort: SortState<LedgerSortKey>): Query {
  const { key, direction } = sort ?? DEFAULT_LEDGER_SORT;
  return { ordering: `${direction === "desc" ? "-" : ""}${key}` };
}
