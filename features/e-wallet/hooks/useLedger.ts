"use client";

import { useCallback, useMemo, useState } from "react";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useResource } from "@/lib/useResource";
import { getLedgerPage } from "../api";
import type { SortState } from "@/lib/sort";
import { DEFAULT_LEDGER_SORT, EMPTY_LEDGER_FILTERS } from "../ledgerFilters";
import type { LedgerFilters, LedgerSortKey } from "../types";

const SEARCH_DEBOUNCE_MS = 400;

/** One server-side page of the ledger, with the filters and sort that select it. */
export function useLedger() {
  const [filters, setFilters] = useState<LedgerFilters>(EMPTY_LEDGER_FILTERS);
  const [sort, setSortState] = useState<SortState<LedgerSortKey>>(DEFAULT_LEDGER_SORT);
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS);
  const { dateFrom, dateTo, status } = filters;
  const query = useMemo<LedgerFilters>(() => ({ search, dateFrom, dateTo, status }), [search, dateFrom, dateTo, status]);

  const loader = useCallback((signal: AbortSignal) => getLedgerPage(query, page, sort, signal), [query, page, sort]);
  const resource = useResource(loader);

  /** Changes filters and returns to the first page. */
  const updateFilters = useCallback((patch: Partial<LedgerFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }, []);

  /** Changes the sort and returns to the first page. */
  const setSort = useCallback((next: SortState<LedgerSortKey>) => {
    setSortState(next);
    setPage(1);
  }, []);

  /** Clears search and every filter. */
  const resetFilters = useCallback(() => {
    setFilters(EMPTY_LEDGER_FILTERS);
    setPage(1);
  }, []);

  return { ...resource, filters, query, updateFilters, resetFilters, sort, setSort, page, setPage };
}
