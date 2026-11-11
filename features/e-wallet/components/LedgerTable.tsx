import { Eye } from "lucide-react";
import { formatDateTime, formatRupiah } from "@/lib/format";
import type { LedgerRow } from "../types";
import LedgerBadge from "./LedgerBadge";
import SignedAmount from "./SignedAmount";
import styles from "./EWallet.module.css";

type Props = {
  rows: LedgerRow[];
  onSelect: (row: LedgerRow) => void;
};

export default function LedgerTable({ rows, onSelect }: Props) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Keterangan</th>
            <th className={styles.numeric}>Jumlah</th>
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
