"use client";

import { ArrowDownToLine, ArrowUpFromLine, X } from "lucide-react";
import { useCallback } from "react";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { useModalDialog } from "@/lib/useModalDialog";
import { useResource } from "@/lib/useResource";
import { getLedgerEntry } from "../api";
import { PENDING_FUNDS_NOTE, walletErrorMessage } from "../rules";
import type { LedgerDetail, LedgerRow } from "../types";
import LedgerBadge from "./LedgerBadge";
import SignedAmount from "./SignedAmount";
import styles from "./EWallet.module.css";

type Props = {
  /** The row the user opened; its details are fetched while the row itself shows at once. */
  row: LedgerRow | null;
  onClose: () => void;
};

/** Full details of one ledger entry: the student payment or the withdrawal behind it. */
export default function LedgerDetailDialog({ row, onClose }: Props) {
  const dialogRef = useModalDialog(row !== null);
  const rowId = row?.id ?? null;
  const loader = useCallback(
    (signal: AbortSignal) => (rowId === null ? Promise.resolve(null) : getLedgerEntry(rowId, signal)),
    [rowId],
  );
  const detail = useResource<LedgerDetail | null>(loader);
  const loaded = detail.data?.id === rowId ? detail.data : null;

  return (
    <dialog ref={dialogRef} className={styles.detailDialog} aria-labelledby="ledger-detail-title" onClose={onClose} onCancel={(event) => { event.preventDefault(); onClose(); }}>
      {row && (
        <div className={styles.detailBody}>
          <div className="dialog-heading">
            <div>
              <span className={`dialog-icon ${row.amount < 0 ? styles.detailIconDebit : styles.detailIconCredit}`}>
                {row.amount < 0 ? <ArrowUpFromLine aria-hidden="true" /> : <ArrowDownToLine aria-hidden="true" />}
              </span>
              <div>
                <h2 id="ledger-detail-title">{row.description}</h2>
                <p>{row.reference}</p>
              </div>
            </div>
            <button className="close-button" type="button" aria-label="Tutup" onClick={onClose}><X aria-hidden="true" /></button>
          </div>

          <div className={styles.detailAmount}>
            <SignedAmount amount={row.amount} />
            <LedgerBadge badge={row.badge} />
          </div>

          <dl className={styles.detailList}>
            <div><dt>Tanggal</dt><dd>{formatDateTime(row.createdAt, "long")}</dd></div>
            {row.settledAt && <div><dt>Tersedia sejak</dt><dd>{formatDateTime(row.settledAt, "long")}</dd></div>}
            {loaded && <SourceDetails detail={loaded} />}
            <div><dt>Saldo setelah transaksi</dt><dd>{formatRupiah(row.balanceAfter)}</dd></div>
          </dl>

          {!loaded && (detail.error ? (
            <p className={styles.fieldError} role="alert">
              {walletErrorMessage(detail.error, "Detail transaksi belum dapat dimuat.")}{" "}
              <button type="button" className="text-button" onClick={detail.reload}>Coba lagi</button>
            </p>
          ) : (
            <p className={styles.fieldHelp}>Memuat detail transaksi…</p>
          ))}

          {row.pending && <p className={styles.fieldHelp}>{PENDING_FUNDS_NOTE}</p>}

          <div className="dialog-actions">
            <button className="primary-button" type="button" onClick={onClose}>Tutup</button>
          </div>
        </div>
      )}
    </dialog>
  );
}

/** The payment or withdrawal rows of the detail list. */
function SourceDetails({ detail }: { detail: LedgerDetail }) {
  const { payment, withdrawal } = detail;
  return (
    <>
      {payment && (
        <>
          <div><dt>Siswa</dt><dd>{payment.studentName}</dd></div>
          <div><dt>Nomor pembayaran</dt><dd>{payment.paymentNo}</dd></div>
          <div><dt>Metode pembayaran</dt><dd>{payment.channelName}</dd></div>
          {payment.paidAt && <div><dt>Dibayar</dt><dd>{formatDateTime(payment.paidAt, "long")}</dd></div>}
          {payment.items.map((item) => (
            <div key={item.invoiceNo}><dt>{item.feeType || "Tagihan"}</dt><dd>{formatRupiah(item.amount)}<small>{item.invoiceNo}</small></dd></div>
          ))}
          {payment.needsRefund && <div><dt>Catatan</dt><dd>Tagihan sudah dibayar dengan cara lain; sekolah perlu mengembalikan dana ke pembayar.</dd></div>}
        </>
      )}
      {withdrawal && (
        <>
          <div><dt>Nomor penarikan</dt><dd>{withdrawal.withdrawalNo}</dd></div>
          <div><dt>Status penarikan</dt><dd>{withdrawal.statusLabel}</dd></div>
          <div><dt>Rekening tujuan</dt><dd>{withdrawal.bankName} {withdrawal.accountNumberMasked}<small>a.n. {withdrawal.accountHolderName}</small></dd></div>
          <div><dt>Jumlah penarikan</dt><dd>{formatRupiah(withdrawal.amount)}</dd></div>
          <div><dt>Biaya penarikan</dt><dd>{formatRupiah(withdrawal.fee)}</dd></div>
          <div><dt>Diterima di rekening</dt><dd>{formatRupiah(withdrawal.transferAmount)}</dd></div>
          {withdrawal.failureReason && <div><dt>Alasan gagal</dt><dd>{withdrawal.failureReason}</dd></div>}
        </>
      )}
    </>
  );
}
