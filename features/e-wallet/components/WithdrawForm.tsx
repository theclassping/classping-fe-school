"use client";

import { useState, type FormEvent } from "react";
import { formatRupiah, formatThousands } from "@/lib/format";
import {
  BANKS,
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
  amountText: string;
};

export const EMPTY_DRAFT: WithdrawalDraft = { target: null, payoutAccountId: null, bankCode: "", accountNumber: "", accountHolderName: "", amountText: "" };

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
  const form = resolveDraft(draft, accounts);
  const limits = { available: summary.available, fee: summary.withdrawalFee };
  const estimate = withdrawalBreakdown(form.amount, summary.withdrawalFee);

  function change(patch: Partial<WithdrawalDraft>, field: keyof WithdrawalFormErrors) {
    onDraftChange(patch);
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateWithdrawalForm(form, limits);
    setErrors(validation);
    if (Object.keys(validation).length === 0) onSubmit(form);
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
            <label>
              Nama pemilik rekening
              <input value={draft.accountHolderName} onChange={(event) => change({ accountHolderName: event.target.value }, "accountHolderName")} placeholder="Nama sesuai buku rekening" aria-invalid={Boolean(errors.accountHolderName)} />
              {errors.accountHolderName && <span className={styles.fieldError} role="alert">{errors.accountHolderName}</span>}
            </label>
            <div className="form-grid">
              <label>
                Bank tujuan
                <select value={draft.bankCode} onChange={(event) => change({ bankCode: event.target.value }, "bankCode")} aria-invalid={Boolean(errors.bankCode)}>
                  <option value="">Pilih bank</option>
                  {BANKS.map((bank) => <option key={bank.code} value={bank.code}>{bank.name}</option>)}
                </select>
                {errors.bankCode && <span className={styles.fieldError} role="alert">{errors.bankCode}</span>}
              </label>
              <label>
                Nomor rekening
                <input inputMode="numeric" value={draft.accountNumber} onChange={(event) => change({ accountNumber: normalizeAccountNumber(event.target.value) }, "accountNumber")} placeholder="Contoh: 5271234567" aria-invalid={Boolean(errors.accountNumber)} />
                {errors.accountNumber && <span className={styles.fieldError} role="alert">{errors.accountNumber}</span>}
              </label>
            </div>
            <p className={styles.fieldHelp}>Rekening baru otomatis tersimpan setelah penarikan berhasil diajukan.</p>
          </>
        )}

        <label>
          Jumlah penarikan
          <div className={styles.amountField}>
            <span aria-hidden="true">Rp</span>
            <input inputMode="numeric" value={draft.amountText} onChange={(event) => change({ amountText: formatThousands(parseAmount(event.target.value)) }, "amount")} placeholder="0" aria-describedby="withdraw-amount-help" aria-invalid={Boolean(errors.amount)} />
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
        <button className="primary-button" type="submit" disabled={busy}>{busy ? "Mengirim OTP…" : "Lanjut"}</button>
      </div>
    </form>
  );
}
