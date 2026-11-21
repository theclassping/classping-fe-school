import { Filter, RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { activePanelFilterCount, hasActiveFilters, LEDGER_STATUS_OPTIONS } from "../ledgerFilters";
import type { LedgerFilters, LedgerStatusFilter } from "../types";
import styles from "./EWallet.module.css";

type Props = {
  filters: LedgerFilters;
  onChange: (patch: Partial<LedgerFilters>) => void;
  onReset: () => void;
  onRefresh: () => void;
  refreshing: boolean;
};

const PANEL_ID = "ledger-filters";

export default function LedgerToolbar({ filters, onChange, onReset, onRefresh, refreshing }: Props) {
  const [open, setOpen] = useState(false);
  const activeCount = activePanelFilterCount(filters);

  return (
    <>
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
        <button
          type="button"
          className={`filter-button ${open ? styles.filterToggleActive : ""}`}
          aria-expanded={open}
          aria-controls={PANEL_ID}
          onClick={() => setOpen((current) => !current)}
        >
          <Filter aria-hidden="true" /> Filter{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        <button type="button" className={`filter-button ${styles.refresh}`} onClick={onRefresh} disabled={refreshing}>
          <RefreshCw aria-hidden="true" /> Muat ulang
        </button>
      </div>

      {open && (
        <div className={styles.filterPanel} id={PANEL_ID}>
          <div className={styles.filterHeading}>
            <strong>Filter buku kas</strong>
            <span>Daftar diperbarui otomatis saat filter berubah.</span>
          </div>
          <div className={styles.filterFields}>
            <label className={styles.filterField}>
              Dari tanggal
              <input
                type="date"
                value={filters.dateFrom}
                max={filters.dateTo || undefined}
                onChange={(event) => onChange({ dateFrom: event.target.value })}
              />
            </label>
            <label className={styles.filterField}>
              Sampai tanggal
              <input
                type="date"
                value={filters.dateTo}
                min={filters.dateFrom || undefined}
                onChange={(event) => onChange({ dateTo: event.target.value })}
              />
            </label>
            <label className={styles.filterField}>
              Status dana
              <select value={filters.status} onChange={(event) => onChange({ status: event.target.value as LedgerStatusFilter })}>
                {LEDGER_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <button type="button" className={styles.filterReset} disabled={!hasActiveFilters(filters)} onClick={onReset}>
              Reset filter
            </button>
          </div>
        </div>
      )}
    </>
  );
}
