"use client";

import { useState, type FormEvent } from "react";
import { errorMessage } from "@/lib/api/errors";
import { formatRupiah, formatThousands } from "@/lib/format";
import { inquirePayoutAccount } from "../api";
import {
  BANKS,
  canInquireAccount,
  INQUIRY_ERROR_MESSAGES,
  isInquiryUnavailable,
  normalizeAccountNumber,
  parseAmount,
  validateWithdrawalForm,
  withdrawalBreakdown,
  type WithdrawalFormErrors,
} from "../rules";
import type { PayoutAccount, WalletSummary, WithdrawalForm as WithdrawalFormValues } from "../types";
import WithdrawBreakdown from "./WithdrawBreakdown";
import styles from "./EWallet.module.css";

/** What the user has typed; kept by the dialog so "Kembali" from the OTP step keeps it. */
export type WithdrawalDraft = {
  /** null until the user chooses: saved accounts are offered first when they exist. */
  target: WithdrawalFormValues["target"] | null;
  payoutAccountId: number | null;
  bankCode: string;
  accountNumber: string;
  accountHolderName: string;
  /** Where the holder name came from: looked up at the provider, typed because the provider cannot look names up, or not yet known. */
  holderNameSource: "none" | "lookup" | "manual";
  amountText: string;
};

export const EMPTY_DRAFT: WithdrawalDraft = { target: null, payoutAccountId: null, bankCode: "", accountNumber: "", accountHolderName: "", holderNameSource: "none", amountText: "" };

const LOOKUP_FAILED = "Nama pemilik rekening belum dapat dicek. Silakan coba lagi.";

/** The draft with defaults applied (first saved account, "new" when there is none). */
function resolveDraft(draft: WithdrawalDraft, accounts: PayoutAccount[]): WithdrawalFormValues {
  const target = draft.target ?? (accounts.length > 0 ? "saved" : "new");
  return {
    target,
    payoutAccountId: draft.payoutAccountId ?? accounts[0]?.id ?? null,
    bankCode: draft.bankCode,
    accountNumber: draft.accountNumber,
    accountHolderName: draft.accountHolderName,
    amount: parseAmount(draft.amountText),
  };
}

type Props = {
  summary: WalletSummary;
  accounts: PayoutAccount[];
  accountsLoading: boolean;
  draft: WithdrawalDraft;
  onDraftChange: (patch: Partial<WithdrawalDraft>) => void;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (form: WithdrawalFormValues) => void;
};

export default function WithdrawForm({ summary, accounts, accountsLoading, draft, onDraftChange, busy, onCancel, onSubmit }: Props) {
  const [errors, setErrors] = useState<WithdrawalFormErrors>({});
  const [lookupBusy, setLookupBusy] = useState(false);
  const form = resolveDraft(draft, accounts);
  const limits = { available: summary.available, fee: summary.withdrawalFee };
  const estimate = withdrawalBreakdown(form.amount, summary.withdrawalFee);

  function change(patch: Partial<WithdrawalDraft>, field: keyof WithdrawalFormErrors) {
    onDraftChange(patch);
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  /** A new bank or number invalidates a looked-up name; a typed one stays. */
  function changeAccount(patch: Pick<WithdrawalDraft, "bankCode"> | Pick<WithdrawalDraft, "accountNumber">, field: keyof WithdrawalFormErrors) {
    const manual = draft.holderNameSource === "manual";
    change(manual ? patch : { ...patch, accountHolderName: "", holderNameSource: "none" }, field);
    setErrors((current) => ({ ...current, accountNumber: undefined }));
  }

  const canLookup = canInquireAccount(draft.bankCode, draft.accountNumber);

  /** Asks the provider for the holder name; returns it, or "" when the user has to fix or type something. */
  async function lookupHolder(): Promise<string> {
    if (!canLookup || lookupBusy) return "";
    setLookupBusy(true);
    try {
      const inquiry = await inquirePayoutAccount(draft.bankCode, draft.accountNumber);
      change({ accountHolderName: inquiry.accountHolderName, holderNameSource: "lookup" }, "accountHolderName");
      return inquiry.accountHolderName;
    } catch (lookupError) {
      if (isInquiryUnavailable(lookupError)) {
        change({ accountHolderName: "", holderNameSource: "manual" }, "accountHolderName");
      } else {
        setErrors((current) => ({ ...current, accountNumber: errorMessage(lookupError, LOOKUP_FAILED, INQUIRY_ERROR_MESSAGES) }));
      }
      return "";
    } finally {
      setLookupBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let submitted = form;
    if (form.target === "new" && draft.holderNameSource === "none" && canLookup) {
      // "Lanjut" before "Cek rekening": look the name up first, then continue with it.
      const name = await lookupHolder();
      if (!name) return;
      submitted = { ...form, accountHolderName: name };
    }
    const validation = validateWithdrawalForm(submitted, limits);
    setErrors(validation);
    if (Object.keys(validation).length === 0) onSubmit(submitted);
  }

  return (
    <form onSubmit={submit} noValidate>
      <fieldset className={styles.withdrawFields} disabled={busy}>
        <div className={styles.targetToggle} role="radiogroup" aria-label="Rekening tujuan">
          <label>
            <input type="radio" name="target" checked={form.target === "saved"} disabled={accounts.length === 0} onChange={() => change({ target: "saved" }, "payoutAccountId")} />
            Rekening tersimpan
          </label>
          <label>
            <input type="radio" name="target" checked={form.target === "new"} onChange={() => change({ target: "new" }, "payoutAccountId")} />
            Rekening baru
          </label>
        </div>

        {form.target === "saved" ? (
          <label>
            Rekening tujuan
            <select value={form.payoutAccountId ?? ""} onChange={(event) => change({ payoutAccountId: Number(event.target.value) || null }, "payoutAccountId")} aria-invalid={Boolean(errors.payoutAccountId)}>
              {accountsLoading && accounts.length === 0 && <option value="">Memuat rekening…</option>}
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.bankName} {account.accountNumberMasked} · a.n. {account.accountHolderName}</option>
              ))}
            </select>
            {errors.payoutAccountId && <span className={styles.fieldError} role="alert">{errors.payoutAccountId}</span>}
          </label>
        ) : (
          <>
            <div className="form-grid">
              <label>
                Bank tujuan
                <select value={draft.bankCode} onChange={(event) => changeAccount({ bankCode: event.target.value }, "bankCode")} aria-invalid={Boolean(errors.bankCode)}>
                  <option value="">Pilih bank</option>
                  {BANKS.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
                </select>
                {errors.bankCode && <span className={styles.fieldError} role="alert">{errors.bankCode}</span>}
              </label>
              <label>
                Nomor rekening
                <input
                  inputMode="numeric"
                  value={draft.accountNumber}
                  onChange={(event) => changeAccount({ accountNumber: normalizeAccountNumber(event.target.value) }, "accountNumber")}
                  onBlur={() => { if (draft.holderNameSource === "none") void lookupHolder(); }}
                  placeholder="Contoh: 5271234567"
                  aria-invalid={Boolean(errors.accountNumber)}
                />
                {errors.accountNumber && <span className={styles.fieldError} role="alert">{errors.accountNumber}</span>}
              </label>
            </div>
            {draft.holderNameSource === "manual" ? (
              <label>
                Nama pemilik rekening
                <input value={draft.accountHolderName} onChange={(event) => change({ accountHolderName: event.target.value }, "accountHolderName")} placeholder="Nama sesuai buku rekening" aria-invalid={Boolean(errors.accountHolderName)} />
                {errors.accountHolderName ? (
                  <span className={styles.fieldError} role="alert">{errors.accountHolderName}</span>
                ) : (
                  <span className={styles.fieldHelp}>Nama tidak dapat dicek otomatis. Isi persis seperti di buku rekening.</span>
                )}
              </label>
            ) : draft.holderNameSource === "lookup" ? (
              <div className={styles.holderCard} role="status">
                <span>Nama pemilik rekening</span>
                <strong>{draft.accountHolderName}</strong>
                <small>Pastikan nama pemilik rekening sudah sesuai sebelum melanjutkan.</small>
              </div>
            ) : (
              <div className={styles.lookupRow}>
                <button type="button" className="secondary-button" onClick={() => void lookupHolder()} disabled={!canLookup || lookupBusy}>
                  {lookupBusy ? "Mengecek…" : "Cek rekening"}
                </button>
                <span className={styles.fieldHelp}>
                  {errors.accountHolderName ?? "Nama pemilik rekening diambil otomatis dari bank."}
                </span>
              </div>
            )}
            <p className={styles.fieldHelp}>Rekening baru otomatis tersimpan setelah penarikan berhasil diajukan.</p>
          </>
        )}

        <label>
          Jumlah penarikan
          <div className={styles.amountField}>
            <span className={styles.amountWrap}>
              <span aria-hidden="true">Rp</span>
              <input inputMode="numeric" value={draft.amountText} onChange={(event) => change({ amountText: formatThousands(parseAmount(event.target.value)) }, "amount")} placeholder="0" aria-describedby="withdraw-amount-help" aria-invalid={Boolean(errors.amount)} />
            </span>
            <button type="button" className="secondary-button" onClick={() => change({ amountText: formatThousands(summary.available) }, "amount")}>Maks</button>
          </div>
          {errors.amount ? (
            <span className={styles.fieldError} role="alert">{errors.amount}</span>
          ) : (
            <span id="withdraw-amount-help" className={styles.fieldHelp}>Maksimal {formatRupiah(summary.available)}.</span>
          )}
        </label>
      </fieldset>

      <WithdrawBreakdown {...estimate} />
      <p className={styles.fieldHelp}>Biaya {formatRupiah(summary.withdrawalFee)} per penarikan dipotong dari jumlah yang ditarik. Kode OTP akan dikirim ke email cabang.</p>

      <div className="dialog-actions">
        <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Batal</button>
        <button className="primary-button" type="submit" disabled={busy || lookupBusy}>{busy ? "Mengirim OTP…" : "Lanjut"}</button>
      </div>
    </form>
  );
}
