"use client";

import { ArrowDownToLine, ArrowUpFromLine, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "./EWallet.module.css";
import { isFloating, methodLabel, rupiah, type LedgerEntry } from "./walletData";

type Row = LedgerEntry & { balanceAfter: number };

type Props = {
  entry: Row | null;
  now: Date;
  onClose: () => void;
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

const WITHDRAWAL_STATUS = { processing: "Sedang diproses", success: "Berhasil", failed: "Gagal (dana dikembalikan)" } as const;

/** Full details of one ledger entry; the table itself only shows the essentials. */
export default function LedgerDetailDialog({ entry, now, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (entry && !dialog.open) dialog.showModal();
    if (!entry && dialog.open) dialog.close();
  }, [entry]);

  const credit = entry?.type === "credit";
  const floating = entry ? isFloating(entry, now) : false;

  return (
    <dialog ref={dialogRef} className={styles.detailDialog} aria-labelledby="ledger-detail-title" onClose={onClose} onCancel={(event) => { event.preventDefault(); onClose(); }}>
      {entry && (
        <div className={styles.detailBody}>
          <div className="dialog-heading">
            <div>
              <span className={`dialog-icon ${credit ? styles.detailIconCredit : styles.detailIconDebit}`}>{credit ? <ArrowDownToLine aria-hidden="true" /> : <ArrowUpFromLine aria-hidden="true" />}</span>
              <div>
                <h2 id="ledger-detail-title">{credit ? "Pembayaran masuk" : "Penarikan dana"}</h2>
                <p>{entry.reference}</p>
              </div>
            </div>
            <button className="close-button" type="button" aria-label="Tutup" onClick={onClose}><X aria-hidden="true" /></button>
          </div>

          <div className={styles.detailAmount}>
            <strong className={credit ? styles.amountCredit : styles.amountDebit}>{credit ? "+" : "-"}{rupiah(entry.amount)}</strong>
            {credit ? (
              floating ? <span className="status-pending">Mengambang</span> : <span className="status-pill">Tersedia</span>
            ) : (
              <span className="status-badge muted">{entry.withdrawal ? WITHDRAWAL_STATUS[entry.withdrawal.status] : "Penarikan"}</span>
            )}
          </div>

          <dl className={styles.detailList}>
            <div><dt>Keterangan</dt><dd>{entry.description}</dd></div>
            <div><dt>Tanggal</dt><dd>{formatDateTime(entry.settledAt)}</dd></div>
            {credit && (
              <>
                <div><dt>{floating ? "Tersedia mulai" : "Tersedia sejak"}</dt><dd>{formatDateTime(entry.availableAt)}</dd></div>
                <div><dt>Siswa</dt><dd>{entry.studentName}</dd></div>
                <div><dt>Nomor invoice</dt><dd>{entry.invoiceNo}</dd></div>
                <div><dt>Metode pembayaran</dt><dd>{methodLabel(entry.paymentMethod)}</dd></div>
              </>
            )}
            {!credit && entry.withdrawal && (
              <>
                <div><dt>Rekening tujuan</dt><dd>{entry.withdrawal.bankName} {entry.withdrawal.accountNumber}<br /><small>a.n. {entry.withdrawal.accountHolderName}</small></dd></div>
                <div><dt>Biaya penarikan</dt><dd>{rupiah(entry.withdrawal.fee)}</dd></div>
                <div><dt>Diterima di rekening</dt><dd>{rupiah(entry.withdrawal.transferAmount)}</dd></div>
              </>
            )}
            <div><dt>Saldo setelah transaksi</dt><dd>{rupiah(entry.balanceAfter)}</dd></div>
          </dl>

          {credit && floating && <p className={styles.fieldHelp}>Dana masih di pihak ketiga dan masuk ke saldo riil setelah 1 hari kerja sejak pembayaran diterima.</p>}

          <div className="dialog-actions">
            {entry.paymentId && <Link className="secondary-button" href={`/dashboard/payments/view?payment=${encodeURIComponent(String(entry.paymentId))}`}>Lihat pembayaran</Link>}
            <button className="primary-button" type="button" onClick={onClose}>Tutup</button>
          </div>
        </div>
      )}
    </dialog>
  );
}
