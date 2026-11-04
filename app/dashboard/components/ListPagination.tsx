"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./TableActions.module.css";

export function useListPagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    reset: () => setPage(1),
    controls: { total: items.length, page: currentPage, pageSize, onPageChange: setPage },
  };
}

export default function ListPagination({ total, page, pageSize = 10, onPageChange, noun }: {
  total: number;
  page: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  noun: string;
}) {
  if (!total) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className={styles.paginationFooter}>
      <span className={styles.paginationSummary} role="status">
        Menampilkan <strong>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}</strong> dari <strong>{total}</strong> {noun}
      </span>
      <nav className={styles.paginationControls} aria-label={`Halaman ${noun}`}>
        <button className={styles.paginationButton} type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft aria-hidden="true" /> Sebelumnya
        </button>
        <span className={styles.pageIndicator} aria-live="polite">Halaman <strong>{page}</strong> dari {totalPages}</span>
        <button className={styles.paginationButton} type="button" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
          Berikutnya <ChevronRight aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}
