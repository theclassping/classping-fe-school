// Backend responses → view models (numbers, Indonesian labels, badge tones),
// and the form → request body. Pure functions: no fetch, no React.

import { toAmount } from "@/lib/format";
import type {
  BadgeTone,
  Destination,
  GatewayPaymentResponse,
  LedgerDetail,
  LedgerEntryDetailResponse,
  LedgerEntryResponse,
  LedgerEntryType,
  LedgerRow,
  PaymentDetail,
  PayoutAccount,
  PayoutAccountResponse,
  WalletResponse,
  WalletSummary,
  Withdrawal,
  WithdrawalForm,
  WithdrawalPreview,
  WithdrawalPreviewRequest,
  WithdrawalPreviewResponse,
  WithdrawalResponse,
  WithdrawalStatus,
} from "./types";

/** Backend decimal → number; 0 when missing so totals never show NaN. */
function amountOf(value: string | null | undefined): number {
  const amount = toAmount(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function toWalletSummary(wallet: WalletResponse): WalletSummary {
  const available = amountOf(wallet.available_balance);
  const pending = amountOf(wallet.pending_balance);
  return {
    available,
    pending,
    total: available + pending,
    pendingCount: wallet.pending_count,
    withdrawnTotal: amountOf(wallet.withdrawn_total),
    withdrawnCount: wallet.withdrawn_count,
    withdrawalFee: amountOf(wallet.withdrawal_fee),
  };
}

type EntryPresentation = { description: string; badge: { label: string; tone: BadgeTone } };

const muted = (label: string) => ({ label, tone: "muted" as const });

const ENTRY_PRESENTATION: Record<Exclude<LedgerEntryType, "payment_credit">, EntryPresentation> = {
  withdrawal: { description: "Penarikan dana", badge: muted("Penarikan") },
  withdrawal_fee: { description: "Biaya penarikan", badge: muted("Penarikan") },
  withdrawal_reversal: { description: "Pengembalian penarikan", badge: muted("Dikembalikan") },
  withdrawal_fee_reversal: { description: "Pengembalian biaya penarikan", badge: muted("Dikembalikan") },
  adjustment: { description: "Penyesuaian saldo", badge: muted("Penyesuaian") },
};

const UNKNOWN_ENTRY: EntryPresentation = { description: "Transaksi", badge: muted("Lainnya") };

function presentEntry(entry: LedgerEntryResponse, pending: boolean): EntryPresentation {
  if (entry.entry_type === "payment_credit") {
    return {
      description: "Pembayaran siswa",
      badge: pending ? { label: "Mengambang", tone: "pending" } : { label: "Tersedia", tone: "available" },
    };
  }
  return ENTRY_PRESENTATION[entry.entry_type] ?? UNKNOWN_ENTRY;
}

export function toLedgerRow(entry: LedgerEntryResponse): LedgerRow {
  const pending = entry.settlement_status === "pending_settlement";
  return {
    id: entry.id,
    createdAt: entry.created_at,
    entryType: entry.entry_type,
    amount: amountOf(entry.amount),
    balanceAfter: amountOf(entry.balance_after),
    reference: entry.note || "-",
    pending,
    settledAt: entry.settled_at,
    ...presentEntry(entry, pending),
  };
}

function toDestination(account: Pick<PayoutAccountResponse, "bank_code" | "bank_name" | "account_number_masked" | "account_holder_name">): Destination {
  return {
    bankCode: account.bank_code,
    bankName: account.bank_name || account.bank_code,
    accountNumberMasked: account.account_number_masked,
    accountHolderName: account.account_holder_name,
  };
}

export function toPayoutAccount(account: PayoutAccountResponse): PayoutAccount {
  return { id: account.id, ...toDestination(account) };
}

const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  processing: "Sedang diproses",
  success: "Berhasil",
  failed: "Gagal (dana dikembalikan)",
};

export function toWithdrawal(withdrawal: WithdrawalResponse): Withdrawal {
  return {
    id: withdrawal.id,
    withdrawalNo: withdrawal.withdrawal_no,
    status: withdrawal.status,
    statusLabel: WITHDRAWAL_STATUS_LABELS[withdrawal.status] ?? withdrawal.status,
    amount: amountOf(withdrawal.amount),
    fee: amountOf(withdrawal.fee),
    transferAmount: amountOf(withdrawal.transfer_amount),
    failureReason: withdrawal.failure_reason,
    createdAt: withdrawal.created_at,
    completedAt: withdrawal.completed_at,
    ...toDestination(withdrawal),
  };
}

function toPaymentDetail(payment: GatewayPaymentResponse): PaymentDetail {
  return {
    id: payment.id,
    paymentNo: payment.payment_no,
    studentName: payment.student_name || "-",
    channelName: payment.channel_name || "-",
    invoiceTotal: amountOf(payment.invoice_total),
    paidAt: payment.paid_at,
    needsRefund: payment.needs_refund,
    items: (payment.items ?? []).map((item) => ({ invoiceNo: item.invoice_no, feeType: item.fee_type, amount: amountOf(item.amount) })),
  };
}

export function toLedgerDetail(entry: LedgerEntryDetailResponse): LedgerDetail {
  return {
    ...toLedgerRow(entry),
    payment: entry.gateway_payment ? toPaymentDetail(entry.gateway_payment) : null,
    withdrawal: entry.withdrawal ? toWithdrawal(entry.withdrawal) : null,
  };
}

export function toWithdrawalPreview(preview: WithdrawalPreviewResponse): WithdrawalPreview {
  return {
    otpReference: preview.otp_reference,
    otpSentTo: preview.otp_sent_to,
    otpExpiresAt: preview.otp_expires_at,
    amount: amountOf(preview.amount),
    fee: amountOf(preview.fee),
    transferAmount: amountOf(preview.transfer_amount),
    destination: toDestination(preview.payout_account),
  };
}

/** Request body for POST withdrawals/preview/ (call after validateWithdrawalForm passes). */
export function toPreviewRequest(form: WithdrawalForm): WithdrawalPreviewRequest {
  const amount = String(form.amount);
  if (form.target === "saved" && form.payoutAccountId !== null) {
    return { amount, payout_account_id: form.payoutAccountId };
  }
  return {
    amount,
    bank_code: form.bankCode,
    account_number: form.accountNumber,
    account_holder_name: form.accountHolderName.trim(),
  };
}
