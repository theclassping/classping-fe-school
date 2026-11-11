"use client";

import { useState, type FormEvent } from "react";
import { formatCountdown } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import { isCompleteOtp, normalizeOtp, OTP_LENGTH } from "../rules";
import type { WithdrawalPreview } from "../types";
import WithdrawBreakdown from "./WithdrawBreakdown";
import styles from "./EWallet.module.css";

type Props = {
  preview: WithdrawalPreview;
  busy: boolean;
  onBack: () => void;
  onResend: () => void;
  onConfirm: (otp: string, feeAcknowledged: boolean) => void;
};

/** Server-calculated breakdown, destination, and the OTP emailed to the branch. */
export default function WithdrawOtpStep({ preview, busy, onBack, onResend, onConfirm }: Props) {
  const [otp, setOtp] = useState("");
  const [feeAcknowledged, setFeeAcknowledged] = useState(false);
  const remaining = Date.parse(preview.otpExpiresAt) - useNow();
  const expired = remaining <= 0;
  const ready = !busy && !expired && isCompleteOtp(otp) && feeAcknowledged;
  const { destination } = preview;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ready) onConfirm(otp, feeAcknowledged);
  }

  return (
    <form onSubmit={submit} noValidate>
      <dl className={styles.detailList}>
        <div><dt>Rekening tujuan</dt><dd>{destination.bankName} {destination.accountNumberMasked}<small>a.n. {destination.accountHolderName}</small></dd></div>
      </dl>
      <WithdrawBreakdown amount={preview.amount} fee={preview.fee} transferAmount={preview.transferAmount} />

      <fieldset className={styles.withdrawFields} disabled={busy}>
        <label>
          Kode OTP
          <input
            className={styles.otpInput}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            value={otp}
            onChange={(event) => setOtp(normalizeOtp(event.target.value))}
            placeholder={"•".repeat(OTP_LENGTH)}
            aria-describedby="withdraw-otp-help"
            autoFocus
          />
          <span id="withdraw-otp-help" className={expired ? styles.fieldError : styles.fieldHelp}>
            {expired
              ? "Kode OTP sudah kedaluwarsa. Kirim ulang kode baru."
              : `Kode dikirim ke ${preview.otpSentTo}. Berlaku ${formatCountdown(remaining)} lagi.`}
          </span>
        </label>
        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={feeAcknowledged} onChange={(event) => setFeeAcknowledged(event.target.checked)} />
          Saya setuju biaya penarikan dipotong dari jumlah yang ditarik.
        </label>
      </fieldset>

      <div className="dialog-actions">
        <button className="secondary-button" type="button" onClick={onBack} disabled={busy}>Kembali</button>
        <button className="secondary-button" type="button" onClick={onResend} disabled={busy}>Kirim ulang OTP</button>
        <button className="primary-button" type="submit" disabled={!ready}>{busy ? "Memproses…" : "Konfirmasi penarikan"}</button>
      </div>
    </form>
  );
}
