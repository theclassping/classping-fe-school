import { formatSignedRupiah } from "@/lib/format";
import styles from "./EWallet.module.css";

/** "+Rp 250.000" in green or "-Rp 2.500" in red. */
export default function SignedAmount({ amount }: { amount: number }) {
  return <strong className={amount < 0 ? styles.amountDebit : styles.amountCredit}>{formatSignedRupiah(amount)}</strong>;
}
