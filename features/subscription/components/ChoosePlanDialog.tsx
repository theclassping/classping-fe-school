"use client";

import { Package, X } from "lucide-react";
import { useState } from "react";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { useModalDialog } from "@/lib/useModalDialog";
import { changePlan, subscribe } from "../api";
import { formatBytes, subscriptionErrorMessage } from "../rules";
import type { Invoice, InvoiceStart, Plan, PlanAction, Subscription } from "../types";
import styles from "./Subscription.module.css";

type Props = {
  subscription: Subscription;
  plan: Plan;
  action: Exclude<PlanAction, { kind: "current" } | { kind: "unavailable" }>;
  taxRate: number;
  onClose: () => void;
  /** An invoice was created for the plan: the page opens the pay dialog for it. */
  onInvoice: (invoice: Invoice) => void;
  /** A downgrade was scheduled; nothing to pay now. */
  onScheduled: () => void;
};

const TITLES = { subscribe: "Pilih Paket", upgrade: "Upgrade Paket", downgrade: "Turunkan Paket" } as const;

/** Confirms a plan choice before the backend creates its invoice. Mount only while open. */
export default function ChoosePlanDialog({ subscription, plan, action, taxRate, onClose, onInvoice, onScheduled }: Props) {
  const dialogRef = useModalDialog(true);
  const [start, setStart] = useState<InvoiceStart>("period");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const tax = Math.round(plan.amount * taxRate);
  const overStudents = plan.maxStudents !== null && subscription.students.used > plan.maxStudents;
  const date = (value: string | null) => formatDateTime(value, "date");

  async function confirm() {
    if (plan.priceId === null) return;
    setBusy(true);
    setError("");
    try {
      if (action.kind === "subscribe") {
        onInvoice(await subscribe(plan.priceId, action.canStartNow ? start : "period"));
      } else {
        const invoice = await changePlan(plan.priceId);
        if (invoice) onInvoice(invoice);
        else onScheduled();
      }
    } catch (confirmError) {
      setError(subscriptionErrorMessage(confirmError, "Paket belum dapat dipilih. Silakan coba lagi."));
      setBusy(false);
    }
  }

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="plan-title" onClose={onClose} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
      <div className="dialog-heading">
        <div>
          <span className="dialog-icon"><Package aria-hidden="true" /></span>
          <div>
            <h2 id="plan-title">{TITLES[action.kind]}</h2>
            <p>
              Paket {plan.name} · {plan.maxStudents === null ? "siswa tanpa batas" : `hingga ${plan.maxStudents} siswa`}
              {plan.storageBytes !== null && ` · ${formatBytes(plan.storageBytes)}`}
            </p>
          </div>
        </div>
        <button className="close-button" type="button" aria-label="Tutup" onClick={onClose} disabled={busy}><X aria-hidden="true" /></button>
      </div>

      <div className={styles.dialogBody}>
        {error && <p className={styles.error} role="alert">{error}</p>}

        {action.kind === "subscribe" && action.canStartNow && (
          <fieldset className={styles.channels} disabled={busy}>
            <legend>Kapan paket ini mulai?</legend>
            <label className={styles.channel}>
              <input type="radio" name="start" checked={start === "period"} onChange={() => setStart("period")} />
              <span>Setelah masa gratis berakhir</span>
              <small>Mulai {date(subscription.trialEnd)}</small>
            </label>
            <label className={styles.channel}>
              <input type="radio" name="start" checked={start === "now"} onChange={() => setStart("now")} />
              <span>Mulai sekarang</span>
              <small>Batas paket {plan.name} langsung berlaku</small>
            </label>
          </fieldset>
        )}

        {action.kind === "subscribe" && action.canStartNow && start === "now" && (
          <p className={styles.caution}>Sisa masa gratis tidak berlaku lagi setelah tagihan ini dibayar. Pilih ini hanya jika sekolah butuh kapasitas lebih besar sekarang.</p>
        )}
        {action.kind === "subscribe" && subscription.status === "trialing" && (!action.canStartNow || start === "period") && (
          <p className={styles.help}>Masa gratis tetap berjalan sampai {date(subscription.trialEnd)}. Tagihan ini untuk bulan pertama setelahnya.</p>
        )}
        {action.kind === "upgrade" && (
          <p className={styles.help}>Anda hanya membayar selisih harga untuk sisa periode berjalan. Batas paket {plan.name} berlaku setelah tagihan dibayar. Jumlahnya tampil di langkah berikutnya.</p>
        )}
        {action.kind === "downgrade" && (
          <p className={styles.help}>Paket {plan.name} berlaku mulai {date(subscription.periodEnd ?? subscription.accessUntil)}. Tidak ada tagihan sekarang; perpanjangan berikutnya memakai harga paket ini.</p>
        )}
        {overStudents && (
          <p className={styles.caution}>Sekolah punya {subscription.students.used} siswa aktif, lebih banyak dari batas paket ini. Data siswa tetap aman, tetapi siswa baru belum bisa ditambahkan sampai jumlahnya di bawah batas.</p>
        )}

        <dl className={styles.summary}>
          <div><dt>Paket {plan.name} per bulan</dt><dd>{formatRupiah(plan.amount)}</dd></div>
          <div><dt>PPN {Math.round(taxRate * 100)}%</dt><dd>{formatRupiah(tax)}</dd></div>
          <div className={styles.summaryTotal}><dt>{action.kind === "subscribe" ? "Tagihan per bulan" : "Perpanjangan berikutnya"}</dt><dd>{formatRupiah(plan.amount + tax)}</dd></div>
        </dl>
        <p className={styles.help}>Biaya transaksi ditambahkan sesuai metode pembayaran yang dipilih.</p>

        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Batal</button>
          <button className="primary-button" type="button" onClick={() => void confirm()} disabled={busy}>
            {busy ? "Memproses..." : action.kind === "downgrade" ? "Jadwalkan" : "Lanjut ke pembayaran"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
