import { CheckCircle2, XCircle } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import type { Withdrawal } from "../types";
import styles from "./EWallet.module.css";

/** Outcome of a submitted withdrawal (usually still processing at the bank). */
export default function WithdrawResult({ withdrawal, onClose }: { withdrawal: Withdrawal; onClose: () => void }) {
  const failed = withdrawal.status === "failed";
  return (
    <div className={styles.withdrawSuccess} role="status">
      {failed ? <XCircle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
      <h2 id="withdraw-title">{failed ? "Penarikan gagal" : "Penarikan diajukan"}</h2>
      {failed ? (
        <p>{withdrawal.failureReason || "Penarikan ditolak."} Saldo telah dikembalikan ke e-wallet.</p>
      ) : (
        <p>
          {formatRupiah(withdrawal.transferAmount)} akan dikirim ke {withdrawal.bankName} {withdrawal.accountNumberMasked} a.n. {withdrawal.accountHolderName}.
          Biaya penarikan {formatRupiah(withdrawal.fee)} sudah dipotong. Status: {withdrawal.statusLabel}.
        </p>
      )}
      <p className={styles.withdrawReference}>Referensi {withdrawal.withdrawalNo}</p>
      <div className="dialog-actions">
        <button className="primary-button" type="button" onClick={onClose}>Selesai</button>
      </div>
    </div>
  );
}
