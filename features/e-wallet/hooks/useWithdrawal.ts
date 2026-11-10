"use client";

import { useState } from "react";
import { ApiError, errorMessage } from "@/lib/api/errors";
import { createWithdrawal, previewWithdrawal, resendWithdrawalOtp } from "../api";
import { WALLET_ERROR_MESSAGES } from "../rules";
import type { Withdrawal, WithdrawalForm, WithdrawalPreview } from "../types";

/**
 * The withdrawal flow:
 *   form → (POST withdrawals/preview/, OTP emailed) → otp → (POST withdrawals/) → done
 * Resending the OTP replaces the preview (new reference and expiry).
 */
export type WithdrawalStep =
  | { name: "form" }
  | { name: "otp"; preview: WithdrawalPreview }
  | { name: "done"; withdrawal: Withdrawal };

const PROCESS_FAILED = "Penarikan belum dapat diproses. Silakan coba lagi.";
const RESEND_FAILED = "Kode OTP belum dapat dikirim ulang. Silakan coba lagi.";

/** Wallet error message, plus the attempts left after a wrong OTP. */
function withdrawalErrorMessage(error: unknown, fallback: string): string {
  const message = errorMessage(error, fallback, WALLET_ERROR_MESSAGES);
  const remaining = error instanceof ApiError ? error.body.remaining_attempts : undefined;
  return typeof remaining === "number" ? `${message} Sisa percobaan: ${remaining}.` : message;
}

export function useWithdrawal() {
  const [step, setStep] = useState<WithdrawalStep>({ name: "form" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run<T>(action: () => Promise<T>, fallback: string, onSuccess: (value: T) => void) {
    setBusy(true);
    setError("");
    try {
      onSuccess(await action());
    } catch (actionError) {
      setError(withdrawalErrorMessage(actionError, fallback));
    } finally {
      setBusy(false);
    }
  }

  /** Validates on the server and emails the OTP. */
  function requestOtp(form: WithdrawalForm) {
    return run(() => previewWithdrawal(form), PROCESS_FAILED, (preview) => setStep({ name: "otp", preview }));
  }

  function resendOtp(preview: WithdrawalPreview) {
    return run(() => resendWithdrawalOtp(preview.otpReference), RESEND_FAILED, (next) => setStep({ name: "otp", preview: next }));
  }

  function confirm(preview: WithdrawalPreview, otp: string, feeAcknowledged: boolean) {
    return run(() => createWithdrawal(preview.otpReference, otp, feeAcknowledged), PROCESS_FAILED, (withdrawal) => setStep({ name: "done", withdrawal }));
  }

  function backToForm() {
    setError("");
    setStep({ name: "form" });
  }

  return { step, busy, error, requestOtp, resendOtp, confirm, backToForm };
}
