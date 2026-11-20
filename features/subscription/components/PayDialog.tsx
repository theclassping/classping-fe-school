"use client";

import { CheckCircle2, Copy, CreditCard, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { formatCountdown, formatDateTime, formatRupiah } from "@/lib/format";
import { useModalDialog } from "@/lib/useModalDialog";
import { useNow } from "@/lib/useNow";
import { usePayment } from "../hooks/usePayment";
import type { Channel, Invoice, Payment } from "../types";
import styles from "./Subscription.module.css";

type Props = {
  invoice: Invoice;
  /** Called when the dialog closes; the page reloads since the invoice may have been paid. */
  onClose: () => void;
};

/** Mount only while open: closing unmounts it, which resets every step. */
export default function PayDialog({ invoice, onClose }: Props) {
  const dialogRef = useModalDialog(true);
  const payment = usePayment(invoice.id);
  const { step, busy } = payment;

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="pay-title" onClose={onClose} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
      {step.name === "paid" ? (
        <div className={styles.result} role="status">
          <CheckCircle2 aria-hidden="true" />
          <h2 id="pay-title">Pembayaran diterima</h2>
          <p>{formatRupiah(step.payment.amount)} untuk tagihan {step.payment.invoiceNumber} sudah kami terima. Terima kasih.</p>
          <p className={styles.reference}>Referensi {step.payment.paymentNo}</p>
          <div className="dialog-actions">
            <button className="primary-button" type="button" onClick={onClose}>Selesai</button>
          </div>
        </div>
      ) : (
        <>
          <div className="dialog-heading">
            <div>
              <span className="dialog-icon"><CreditCard aria-hidden="true" /></span>
              <div>
                <h2 id="pay-title">Bayar Tagihan</h2>
                <p>{invoice.number} · {invoice.kindLabel}</p>
              </div>
            </div>
            <button className="close-button" type="button" aria-label="Tutup" onClick={onClose} disabled={busy}><X aria-hidden="true" /></button>
          </div>

          <div className={styles.dialogBody}>
            {payment.error && <p className={styles.error} role="alert">{payment.error}</p>}

            {step.name === "loading" && <p className="empty-state" role="status">Memuat metode pembayaran...</p>}
            {step.name === "unavailable" && (
              <div className="dialog-actions">
                <button className="secondary-button" type="button" onClick={onClose}>Tutup</button>
                <button className="primary-button" type="button" onClick={payment.reload}>Coba lagi</button>
              </div>
            )}
            {step.name === "choose" && (
              <ChannelStep invoice={invoice} channels={payment.channels} busy={busy} onCancel={onClose} onPay={(code) => void payment.pay(code)} />
            )}
            {step.name === "pay" && (
              <InstructionStep
                payment={step.payment}
                busy={busy}
                onCheck={() => void payment.check(step.payment)}
                onChangeChannel={() => void payment.changeChannel(step.payment)}
              />
            )}
          </div>
        </>
      )}
    </dialog>
  );
}

function ChannelStep({ invoice, channels, busy, onCancel, onPay }: { invoice: Invoice; channels: Channel[]; busy: boolean; onCancel: () => void; onPay: (code: string) => void }) {
  const [selected, setSelected] = useState("");
  const channel = channels.find((item) => item.code === selected);

  if (channels.length === 0) {
    return (
      <>
        <p className="empty-state">Belum ada metode pembayaran online untuk tagihan ini. Hubungi tim ClassPing untuk membayar lewat transfer bank.</p>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>Tutup</button>
        </div>
      </>
    );
  }

  return (
    <form className={styles.channelForm} onSubmit={(event) => { event.preventDefault(); if (channel) onPay(channel.code); }}>
      <fieldset className={styles.channels} disabled={busy}>
        <legend>Pilih metode pembayaran</legend>
        {channels.map((item) => (
          <label key={item.code} className={styles.channel}>
            <input type="radio" name="channel" value={item.code} checked={selected === item.code} onChange={() => setSelected(item.code)} />
            <span>{item.name}</span>
            <small>Biaya {formatRupiah(item.fee)}</small>
          </label>
        ))}
      </fieldset>

      <dl className={styles.summary}>
        {invoice.lines.map((line, index) => (
          <div key={index}><dt>{line.description}</dt><dd>{formatRupiah(line.amount)}</dd></div>
        ))}
        <div><dt>Biaya transaksi</dt><dd>{channel ? formatRupiah(channel.fee) : "Pilih metode"}</dd></div>
        <div className={styles.summaryTotal}><dt>Total dibayar</dt><dd>{formatRupiah(channel ? channel.amount : invoice.total)}</dd></div>
      </dl>

      <div className="dialog-actions">
        <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Batal</button>
        <button className="primary-button" type="submit" disabled={!channel || busy}>{busy ? "Memproses..." : "Lanjut bayar"}</button>
      </div>
    </form>
  );
}

function InstructionStep({ payment, busy, onCheck, onChangeChannel }: { payment: Payment; busy: boolean; onCheck: () => void; onChangeChannel: () => void }) {
  const now = useNow();
  const [copied, setCopied] = useState(false);
  const remaining = new Date(payment.expiresAt).getTime() - now;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(payment.paymentCode);
      setCopied(true);
    } catch {
      // Clipboard access can be refused; the number stays visible to copy by hand.
      setCopied(false);
    }
  }

  return (
    <>
      <div className={styles.amountBox}>
        <span>Jumlah yang harus dibayar</span>
        <strong>{formatRupiah(payment.amount)}</strong>
        <small>Termasuk biaya transaksi {formatRupiah(payment.fee)}</small>
      </div>

      <dl className={styles.summary}>
        <div><dt>Metode</dt><dd>{payment.channelName}</dd></div>
        {payment.paymentCode && (
          <div className={styles.codeRow}>
            <dt>Nomor Virtual Account</dt>
            <dd>
              <strong>{payment.paymentCode}</strong>
              <button type="button" className={styles.copyButton} onClick={() => void copyCode()}>
                <Copy aria-hidden="true" /> {copied ? "Tersalin" : "Salin"}
              </button>
            </dd>
          </div>
        )}
        <div>
          <dt>Batas waktu</dt>
          <dd>{remaining > 0 ? <>{formatCountdown(remaining)} <small>({formatDateTime(payment.expiresAt)})</small></> : "Waktu habis"}</dd>
        </div>
      </dl>

      {payment.payUrl && (
        <a className={`primary-button ${styles.payLink}`} href={payment.payUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink aria-hidden="true" /> Buka halaman pembayaran
        </a>
      )}
      <p className={styles.help} role="status">Halaman ini memeriksa pembayaran secara otomatis. Anda juga dapat menutupnya dan kembali lagi nanti.</p>

      <div className="dialog-actions">
        <button className="secondary-button" type="button" onClick={onChangeChannel} disabled={busy}>Ganti metode</button>
        <button className="primary-button" type="button" onClick={onCheck} disabled={busy}>{busy ? "Memeriksa..." : "Saya sudah bayar"}</button>
      </div>
    </>
  );
}
