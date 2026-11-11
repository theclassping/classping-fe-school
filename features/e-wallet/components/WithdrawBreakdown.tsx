import { formatRupiah } from "@/lib/format";
import styles from "./EWallet.module.css";

/** Amount − fee = what the bank account receives. */
export default function WithdrawBreakdown({ amount, fee, transferAmount }: { amount: number; fee: number; transferAmount: number }) {
  return (
    <dl className={styles.withdrawSummary}>
      <div><dt>Jumlah penarikan</dt><dd>{formatRupiah(amount)}</dd></div>
      <div><dt>Biaya penarikan</dt><dd>- {formatRupiah(fee)}</dd></div>
      <div className={styles.withdrawTotal}><dt>Diterima di rekening</dt><dd>{formatRupiah(transferAmount)}</dd></div>
    </dl>
  );
}
