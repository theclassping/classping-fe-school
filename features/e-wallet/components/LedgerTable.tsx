import { Eye } from "lucide-react";
import SortableHeader from "@/app/dashboard/components/SortableHeader";
import { formatDateTime, formatRupiah } from "@/lib/format";
import type { SortState } from "@/lib/sort";
import type { LedgerRow, LedgerSortKey } from "../types";
import LedgerBadge from "./LedgerBadge";
import SignedAmount from "./SignedAmount";
import styles from "./EWallet.module.css";

type Props = {
  rows: LedgerRow[];
  onSelect: (row: LedgerRow) => void;
  /** Sorting happens on the server; only date and amount can be sorted. */
  sort: SortState<LedgerSortKey>;
  onSort: (sort: SortState<LedgerSortKey>) => void;
};

export default function LedgerTable({ rows, onSelect, sort, onSort }: Props) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <SortableHeader label="Tanggal" sortKey="created_at" sort={sort} onSort={onSort} firstDirection="desc" />
            <th>Keterangan</th>
            <SortableHeader label="Jumlah" sortKey="amount" sort={sort} onSort={onSort} firstDirection="desc" className={styles.numeric} />
            <th className={styles.numeric}>Saldo</th>
            <th>Status</th>
            <th><span className={styles.srOnly}>Aksi</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className={styles.nowrap}>{formatDateTime(row.createdAt)}</td>
              <td>
                <div className={styles.ledgerDescription}>
                  <strong>{row.description}</strong>
                  <small>{row.reference}</small>
                </div>
              </td>
              <td className={styles.numeric}>
                <SignedAmount amount={row.amount} />
              </td>
              <td className={styles.numeric}><strong>{formatRupiah(row.balanceAfter)}</strong></td>
              <td><LedgerBadge badge={row.badge} /></td>
              <td className={styles.numeric}>
                <button type="button" className={styles.detailButton} onClick={() => onSelect(row)} aria-label={`Lihat detail ${row.description} ${row.reference}`}>
                  <Eye aria-hidden="true" /> Detail
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
