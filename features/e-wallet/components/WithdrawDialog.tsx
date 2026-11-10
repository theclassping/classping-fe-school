"use client";

import { ArrowUpFromLine, X } from "lucide-react";
import { useState } from "react";
import { formatRupiah } from "@/lib/format";
import { useModalDialog } from "@/lib/useModalDialog";
import { useResource } from "@/lib/useResource";
import { getPayoutAccounts } from "../api";
import { useWithdrawal } from "../hooks/useWithdrawal";
import { walletErrorMessage } from "../rules";
import type { WalletSummary } from "../types";
import WithdrawForm, { EMPTY_DRAFT, type WithdrawalDraft } from "./WithdrawForm";
import WithdrawOtpStep from "./WithdrawOtpStep";
import WithdrawResult from "./WithdrawResult";
import styles from "./EWallet.module.css";

type Props = {
  summary: WalletSummary;
  /** Called when the dialog closes; the page reloads balances since money may have moved. */
  onClose: () => void;
};

/** Mount only while open: closing unmounts it, which resets every step. */
export default function WithdrawDialog({ summary, onClose }: Props) {
  const dialogRef = useModalDialog(true);
  const accounts = useResource(getPayoutAccounts);
  const withdrawal = useWithdrawal();
  const [draft, setDraft] = useState<WithdrawalDraft>(EMPTY_DRAFT);
  const { step, busy } = withdrawal;

  return (
    <dialog ref={dialogRef} className={styles.withdrawDialog} aria-labelledby="withdraw-title" onClose={onClose} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
      {step.name === "done" ? (
        <WithdrawResult withdrawal={step.withdrawal} onClose={onClose} />
      ) : (
        <>
          <div className="dialog-heading">
            <div>
              <span className="dialog-icon"><ArrowUpFromLine aria-hidden="true" /></span>
              <div>
                <h2 id="withdraw-title">{step.name === "otp" ? "Konfirmasi Penarikan" : "Tarik Dana"}</h2>
                <p>Saldo riil yang dapat ditarik: <strong>{formatRupiah(summary.available)}</strong></p>
              </div>
            </div>
            <button className="close-button" type="button" aria-label="Tutup" onClick={onClose} disabled={busy}><X aria-hidden="true" /></button>
          </div>

          {accounts.error !== undefined && step.name === "form" && (
            <p className={styles.fieldError} role="alert">{walletErrorMessage(accounts.error, "Rekening tersimpan belum dapat dimuat; Anda tetap dapat mengisi rekening baru.")}</p>
          )}
          {withdrawal.error && <p className={styles.fieldError} role="alert">{withdrawal.error}</p>}

          {step.name === "otp" ? (
            <WithdrawOtpStep
              key={step.preview.otpReference}
              preview={step.preview}
              busy={busy}
              onBack={withdrawal.backToForm}
              onResend={() => void withdrawal.resendOtp(step.preview)}
              onConfirm={(otp, feeAcknowledged) => void withdrawal.confirm(step.preview, otp, feeAcknowledged)}
            />
          ) : (
            <WithdrawForm
              summary={summary}
              accounts={accounts.data ?? []}
              accountsLoading={accounts.loading}
              draft={draft}
              onDraftChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
              busy={busy}
              onCancel={onClose}
              onSubmit={(form) => void withdrawal.requestOtp(form)}
            />
          )}
        </>
      )}
    </dialog>
  );
}
