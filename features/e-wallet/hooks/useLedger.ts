"use client";

import { useCallback, useMemo, useState } from "react";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useResource } from "@/lib/useResource";
import { getLedgerPage } from "../api";
import { EMPTY_LEDGER_FILTERS } from "../ledgerFilters";
import type { LedgerFilters } from "../types";

const SEARCH_DEBOUNCE_MS = 400;

/** One server-side page of the ledger, with the filters that select it. */
export function useLedger() {
  const [filters, setFilters] = useState<LedgerFilters>(EMPTY_LEDGER_FILTERS);
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS);
  const { month, status } = filters;
  const query = useMemo<LedgerFilters>(() => ({ search, month, status }), [search, month, status]);

  const loader = useCallback((signal: AbortSignal) => getLedgerPage(query, page, signal), [query, page]);
  const resource = useResource(loader);

  /** Changes filters and returns to the first page. */
  const updateFilters = useCallback((patch: Partial<LedgerFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  }, []);

  return { ...resource, filters, query, updateFilters, page, setPage };
}
