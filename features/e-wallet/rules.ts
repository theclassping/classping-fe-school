// Withdrawal rules shown to the user before anything is sent. The backend
// re-checks every rule; these only give faster, field-level feedback.

import type { ErrorMessages } from "@/lib/api/errors";
import { formatRupiah } from "@/lib/format";
import type { WithdrawalForm } from "./types";

/**
 * Payout banks accepted by the backend. Keep in sync with BANK_CODES in
 * classping-backend apps/payment_aggregator/providers/rintisan/constants.py
 * (the API has no endpoint that lists them).
 */
export const BANKS: readonly { code: string; name: string }[] = [
  { code: "BCA", name: "BCA" },
  { code: "BNI", name: "BNI" },
  { code: "BRI", name: "BRI" },
  { code: "MANDIRI", name: "Bank Mandiri" },
  { code: "BSI", name: "Bank Syariah Indonesia" },
  { code: "CIMB", name: "CIMB Niaga" },
  { code: "PERMATA", name: "Bank Permata" },
  { code: "DANAMON", name: "Bank Danamon" },
  { code: "BTPN", name: "BTPN" },
  { code: "BCASYARIAH", name: "BCA Syariah" },
  { code: "BCA_DIGITAL", name: "BCA Digital (blu)" },
  { code: "JAGO", name: "Bank Jago" },
  { code: "SEABANK", name: "SeaBank" },
  { code: "BNC", name: "Bank Neo Commerce" },
  { code: "ALLO", name: "Allo Bank" },
  { code: "MEGA", name: "Bank Mega" },
  { code: "MEGA_SYR", name: "Bank Mega Syariah" },
  { code: "SINARMAS", name: "Bank Sinarmas" },
  { code: "MAYBANK", name: "Maybank Indonesia" },
  { code: "OCBC", name: "OCBC" },
  { code: "UOB", name: "UOB Indonesia" },
  { code: "DBS", name: "DBS Indonesia" },
  { code: "HANA", name: "Bank KEB Hana" },
  { code: "NOBU", name: "Nobu Bank" },
  { code: "MAYAPADA", name: "Bank Mayapada" },
  { code: "MASPION", name: "Bank Maspion" },
  { code: "ARTHA", name: "Bank Artha Graha" },
  { code: "STANCAR", name: "Standard Chartered" },
  { code: "SAHABAT_SAMPOERNA", name: "Bank Sahabat Sampoerna" },
  { code: "BISNIS_INTERNASIONAL", name: "Bank Bisnis Internasional" },
  { code: "INA_PERDANA", name: "Bank Ina Perdana" },
];

/** Same pattern as the backend's account_number field. */
const ACCOUNT_NUMBER_PATTERN = /^\d{5,30}$/;
export const OTP_LENGTH = 6;

/** Digits only; account numbers are submitted without separators. */
export function normalizeAccountNumber(value: string): string {
  return value.replace(/\D/g, "");
}

/** "Rp 1.500.000", "1.500.000" or "1500000" → 1500000; NaN when there are no digits. */
export function parseAmount(value: string): number {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : Number.NaN;
}

export function normalizeOtp(value: string): string {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH);
}

export function isCompleteOtp(value: string): boolean {
  return value.length === OTP_LENGTH;
}

/** Local estimate shown while typing; the preview response is authoritative. */
export function withdrawalBreakdown(amount: number, fee: number) {
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  return { amount: safeAmount, fee, transferAmount: Math.max(0, safeAmount - fee) };
}

export type WithdrawalFormErrors = Partial<Record<"payoutAccountId" | "bankCode" | "accountNumber" | "accountHolderName" | "amount", string>>;

/** Field errors for the withdrawal form; an empty object when it can be submitted. */
export function validateWithdrawalForm(form: WithdrawalForm, limits: { available: number; fee: number }): WithdrawalFormErrors {
  const errors: WithdrawalFormErrors = {};
  if (form.target === "saved") {
    if (form.payoutAccountId === null) errors.payoutAccountId = "Pilih rekening tujuan.";
  } else {
    if (!form.bankCode) errors.bankCode = "Pilih bank tujuan.";
    if (!form.accountNumber) errors.accountNumber = "Nomor rekening wajib diisi.";
    else if (!ACCOUNT_NUMBER_PATTERN.test(form.accountNumber)) errors.accountNumber = "Nomor rekening harus 5–30 digit angka.";
    if (!form.accountHolderName.trim()) errors.accountHolderName = "Nama pemilik rekening wajib diisi.";
  }
  if (!Number.isFinite(form.amount) || form.amount <= 0) errors.amount = "Masukkan jumlah penarikan.";
  else if (!Number.isInteger(form.amount)) errors.amount = "Jumlah penarikan harus dalam rupiah penuh.";
  else if (form.amount <= limits.fee) errors.amount = `Jumlah penarikan harus lebih dari biaya penarikan (${formatRupiah(limits.fee)}).`;
  else if (form.amount > limits.available) errors.amount = `Jumlah melebihi saldo riil yang dapat ditarik (${formatRupiah(limits.available)}).`;
  return errors;
}

/** Indonesian messages for the backend's wallet error codes (apps/wallets/exceptions.py). */
export const WALLET_ERROR_MESSAGES: ErrorMessages = {
  WITHDRAWAL_ROLE_FORBIDDEN: "E-Wallet hanya dapat diakses oleh kepala sekolah atau officer cabang.",
  BRANCH_EMAIL_MISSING: "Cabang belum memiliki alamat email untuk menerima kode OTP. Lengkapi email di Profil Sekolah.",
  PAYOUT_ACCOUNT_NOT_FOUND: "Rekening tujuan tidak ditemukan. Pilih rekening lain.",
  PAYOUT_ACCOUNT_REQUIRED: "Pilih rekening tersimpan atau isi data rekening baru.",
  PAYOUT_BANK_NOT_SUPPORTED: "Bank tujuan tidak didukung.",
  INVALID_AMOUNT: "Jumlah penarikan tidak valid.",
  AMOUNT_BELOW_MINIMUM: "Jumlah penarikan harus lebih dari biaya penarikan.",
  INSUFFICIENT_BALANCE: "Jumlah melebihi saldo riil yang dapat ditarik.",
  FEE_NOT_ACKNOWLEDGED: "Setujui biaya penarikan terlebih dahulu.",
  OTP_INVALID: "Kode OTP salah.",
  OTP_EXPIRED: "Kode OTP sudah kedaluwarsa. Kirim ulang kode baru.",
  OTP_MAX_ATTEMPTS: "Terlalu banyak percobaan OTP yang salah. Kirim ulang kode baru.",
  OTP_NOT_SENT: "Email OTP gagal dikirim. Silakan coba lagi.",
  PAYOUT_ACCOUNT_INVALID: "Bank menolak rekening tujuan. Periksa kembali nomor rekening.",
  WITHDRAWAL_REJECTED: "Penarikan ditolak oleh penyedia pembayaran. Saldo telah dikembalikan.",
  PROVIDER_BALANCE_INSUFFICIENT: "Penarikan sementara tidak tersedia. Saldo telah dikembalikan.",
  PROVIDER_UNAVAILABLE: "Penyedia pembayaran sedang tidak dapat dihubungi. Silakan coba lagi.",
};
