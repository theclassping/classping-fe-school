"use client";

import { ArrowUpFromLine, CheckCircle2, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./EWallet.module.css";
import {
  BANKS,
  MIN_WITHDRAWAL,
  normalizeAccountNumber,
  parseAmount,
  rupiah,
  validateWithdrawal,
  WITHDRAWAL_FEE,
  withdrawalPreview,
  type LedgerEntry,
  type PayoutAccount,
  type WithdrawalRequest,
} from "./walletData";

type Props = {
  open: boolean;
  /** Real (withdrawable) balance; the requested amount may not exceed it. */
  available: number;
  account: PayoutAccount;
  onClose: () => void;
  onSubmit: (request: WithdrawalRequest) => Promise<LedgerEntry>;
};

type Errors = Partial<Record<keyof WithdrawalRequest | "form", string>>;

const formatThousands = (value: number) => (Number.isFinite(value) && value > 0 ? new Intl.NumberFormat("id-ID").format(value) : "");

export default function WithdrawDialog({ open, available, account, onClose, onSubmit }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [accountHolderName, setAccountHolderName] = useState(account.accountHolderName);
  const [bankName, setBankName] = useState(account.bankName);
  const [accountNumber, setAccountNumber] = useState(account.accountNumber);
  const [amountText, setAmountText] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<LedgerEntry | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const amount = parseAmount(amountText);
  const preview = withdrawalPreview(Number.isFinite(amount) ? amount : 0);
  const request: WithdrawalRequest = { accountHolderName, bankName, accountNumber, amount };

  function reset() {
    setAccountHolderName(account.accountHolderName);
    setBankName(account.bankName);
    setAccountNumber(account.accountNumber);
    setAmountText("");
    setErrors({});
    setResult(null);
    setSubmitting(false);
  }

  function close() {
    reset();
    onClose();
  }

  function updateAmount(value: string) {
    const parsed = parseAmount(value);
    setAmountText(Number.isFinite(parsed) ? formatThousands(parsed) : "");
    setErrors((current) => ({ ...current, amount: undefined, form: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = validateWithdrawal(request, available);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    setSubmitting(true);
    try {
      setResult(await onSubmit({ ...request, accountNumber: normalizeAccountNumber(accountNumber), accountHolderName: accountHolderName.trim() }));
    } catch (submitError) {
      setErrors({ form: submitError instanceof Error ? submitError.message : "Penarikan dana tidak dapat diproses." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <dialog ref={dialogRef} className={styles.withdrawDialog} aria-labelledby="withdraw-title" onClose={close} onCancel={(event) => { event.preventDefault(); if (!submitting) close(); }}>
      {result ? (
        <div className={styles.withdrawSuccess} role="status">
          <CheckCircle2 aria-hidden="true" />
          <h2 id="withdraw-title">Penarikan diproses</h2>
          <p>{rupiah(withdrawalPreview(result.amount).transferAmount)} akan dikirim ke {bankName} {accountNumber.slice(-4).padStart(accountNumber.length, "•")} a.n. {accountHolderName}. Biaya penarikan {rupiah(WITHDRAWAL_FEE)} sudah dipotong dari saldo.</p>
          <p className={styles.withdrawReference}>Referensi {result.reference}</p>
          <div className="dialog-actions">
            <button className="primary-button" type="button" onClick={close}>Selesai</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="dialog-heading">
            <div>
              <span className="dialog-icon"><ArrowUpFromLine aria-hidden="true" /></span>
              <div>
                <h2 id="withdraw-title">Tarik Dana</h2>
                <p>Saldo riil yang dapat ditarik: <strong>{rupiah(available)}</strong></p>
              </div>
            </div>
            <button className="close-button" type="button" aria-label="Tutup" onClick={close} disabled={submitting}><X aria-hidden="true" /></button>
          </div>

          <fieldset className={styles.withdrawFields} disabled={submitting}>
            <label>
              Nama pemilik rekening
              <input name="accountHolderName" value={accountHolderName} onChange={(event) => { setAccountHolderName(event.target.value); setErrors((current) => ({ ...current, accountHolderName: undefined })); }} placeholder="Nama sesuai buku rekening" aria-invalid={Boolean(errors.accountHolderName)} />
              {errors.accountHolderName && <span className={styles.fieldError} role="alert">{errors.accountHolderName}</span>}
            </label>
            <div className="form-grid">
              <label>
                Bank tujuan
                <select name="bankName" value={bankName} onChange={(event) => { setBankName(event.target.value); setErrors((current) => ({ ...current, bankName: undefined })); }} aria-invalid={Boolean(errors.bankName)}>
                  <option value="">Pilih bank</option>
                  {BANKS.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
                </select>
                {errors.bankName && <span className={styles.fieldError} role="alert">{errors.bankName}</span>}
              </label>
              <label>
                Nomor rekening
                <input name="accountNumber" inputMode="numeric" value={accountNumber} onChange={(event) => { setAccountNumber(normalizeAccountNumber(event.target.value)); setErrors((current) => ({ ...current, accountNumber: undefined })); }} placeholder="Contoh: 5271234567" aria-invalid={Boolean(errors.accountNumber)} />
                {errors.accountNumber && <span className={styles.fieldError} role="alert">{errors.accountNumber}</span>}
              </label>
            </div>
            <label>
              Jumlah penarikan
              <div className={styles.amountField}>
                <span aria-hidden="true">Rp</span>
                <input name="amount" inputMode="numeric" value={amountText} onChange={(event) => updateAmount(event.target.value)} placeholder="0" aria-describedby="withdraw-amount-help" aria-invalid={Boolean(errors.amount)} />
                <button type="button" className="secondary-button" onClick={() => updateAmount(String(available))} disabled={available < MIN_WITHDRAWAL}>Maks</button>
              </div>
              {errors.amount ? (
                <span className={styles.fieldError} role="alert">{errors.amount}</span>
              ) : (
                <span id="withdraw-amount-help" className={styles.fieldHelp}>Minimal {rupiah(MIN_WITHDRAWAL)}, maksimal {rupiah(available)}.</span>
              )}
            </label>
          </fieldset>

          <dl className={styles.withdrawSummary}>
            <div><dt>Jumlah penarikan</dt><dd>{rupiah(preview.amount)}</dd></div>
            <div><dt>Biaya penarikan</dt><dd>- {rupiah(preview.fee)}</dd></div>
            <div className={styles.withdrawTotal}><dt>Diterima di rekening</dt><dd>{rupiah(preview.transferAmount)}</dd></div>
          </dl>
          <p className={styles.fieldHelp}>Biaya {rupiah(WITHDRAWAL_FEE)} per penarikan dipotong dari jumlah yang ditarik. Dana biasanya masuk dalam 1 hari kerja.</p>

          {errors.form && <p className={styles.fieldError} role="alert">{errors.form}</p>}
          <div className="dialog-actions">
            <button className="secondary-button" type="button" onClick={close} disabled={submitting}>Batal</button>
            <button className="primary-button" type="submit" disabled={submitting || available < MIN_WITHDRAWAL}>{submitting ? "Memproses…" : "Tarik dana"}</button>
          </div>
        </form>
      )}
    </dialog>
  );
}
