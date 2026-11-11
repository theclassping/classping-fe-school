import { RefreshCw, Search } from "lucide-react";
import { formatMonth } from "@/lib/format";
import { LEDGER_STATUS_OPTIONS } from "../ledgerFilters";
import type { LedgerFilters, LedgerStatusFilter } from "../types";
import styles from "./EWallet.module.css";

type Props = {
  filters: LedgerFilters;
  /** "YYYY-MM" options for the month filter, newest first. */
  months: string[];
  onChange: (patch: Partial<LedgerFilters>) => void;
  onRefresh: () => void;
  refreshing: boolean;
};

export default function LedgerToolbar({ filters, months, onChange, onRefresh, refreshing }: Props) {
  return (
    <div className={`table-tools ${styles.toolbar}`}>
      <label className="search">
        <Search aria-hidden="true" />
        <input
          type="search"
          placeholder="Cari nama siswa, nomor invoice, atau referensi..."
          value={filters.search}
          onChange={(event) => onChange({ search: event.target.value })}
        />
      </label>
      <select aria-label="Filter bulan" value={filters.month} onChange={(event) => onChange({ month: event.target.value })}>
        <option value="">Semua Bulan</option>
        {months.map((month) => <option key={month} value={month}>{formatMonth(month)}</option>)}
      </select>
      <select aria-label="Filter status dana" value={filters.status} onChange={(event) => onChange({ status: event.target.value as LedgerStatusFilter })}>
        {LEDGER_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <button type="button" className={`filter-button ${styles.refresh}`} onClick={onRefresh} disabled={refreshing}>
        <RefreshCw aria-hidden="true" /> Muat ulang
      </button>
    </div>
  );
}
