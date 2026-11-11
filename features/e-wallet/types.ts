// E-Wallet types.
//
// "…Response" / "…Request" types mirror the Django API exactly
// (classping-backend apps/wallets/serializers.py); decimals arrive as strings.
// The other types are what the components use, produced by mappers.ts.

// --- Backend responses ------------------------------------------------------

/** Django DecimalField, e.g. "250000.00". Negative for money leaving the wallet. */
export type Decimal = string;

/** GET wallet/ */
export type WalletResponse = {
  branch_id: number;
  available_balance: Decimal;
  pending_balance: Decimal;
  pending_count: number;
  withdrawn_total: Decimal;
  withdrawn_count: number;
  withdrawal_fee: Decimal;
};

export type LedgerEntryType =
  | "payment_credit"
  | "withdrawal"
  | "withdrawal_fee"
  | "withdrawal_reversal"
  | "withdrawal_fee_reversal"
  | "adjustment";

export type SettlementStatus = "pending_settlement" | "settled";

/** GET wallet/ledger/ (one row) */
export type LedgerEntryResponse = {
  id: number;
  created_at: string;
  entry_type: LedgerEntryType;
  amount: Decimal;
  balance_after: Decimal;
  /** Set on payment credits only. */
  settlement_status: SettlementStatus | null;
  settled_at: string | null;
  gateway_payment_id: number | null;
  withdrawal_id: number | null;
  /** Payment number (PAY-…) or withdrawal number (WDR-…), or an adjustment note. */
  note: string;
};

export type GatewayPaymentItemResponse = {
  student_invoice_id: number;
  invoice_no: string;
  fee_type: string;
  amount: Decimal;
};

/** The gateway payment nested in a ledger entry detail (fields the portal uses). */
export type GatewayPaymentResponse = {
  id: number;
  payment_no: string;
  status: string;
  student_name: string;
  channel_name: string;
  invoice_total: Decimal;
  paid_at: string | null;
  needs_refund: boolean;
  items: GatewayPaymentItemResponse[];
};

export type WithdrawalStatus = "processing" | "success" | "failed";

/** POST withdrawals/, and nested in a ledger entry detail */
export type WithdrawalResponse = {
  id: number;
  withdrawal_no: string;
  status: WithdrawalStatus;
  amount: Decimal;
  fee: Decimal;
  transfer_amount: Decimal;
  bank_code: string;
  bank_name: string;
  account_number_masked: string;
  account_holder_name: string;
  failure_reason: string;
  created_at: string;
  completed_at: string | null;
};

/** GET wallet/ledger/{id}/ */
export type LedgerEntryDetailResponse = LedgerEntryResponse & {
  gateway_payment: GatewayPaymentResponse | null;
  withdrawal: WithdrawalResponse | null;
};

/** GET payout-accounts/ (one row) */
export type PayoutAccountResponse = {
  id: number;
  bank_code: string;
  bank_name: string;
  account_number_masked: string;
  account_holder_name: string;
  updated_at: string;
};

/** POST withdrawals/preview/ and withdrawals/otp/resend/ */
export type WithdrawalPreviewResponse = {
  otp_reference: string;
  otp_sent_to: string;
  otp_expires_at: string;
  amount: Decimal;
  fee: Decimal;
  transfer_amount: Decimal;
  payout_account: Pick<PayoutAccountResponse, "bank_code" | "bank_name" | "account_number_masked" | "account_holder_name">;
};

// --- Request bodies ---------------------------------------------------------

/** POST withdrawals/preview/: a saved account id, or a new account's details. */
export type WithdrawalPreviewRequest = {
  amount: string;
  payout_account_id?: number;
  bank_code?: string;
  account_number?: string;
  account_holder_name?: string;
};

/** POST withdrawals/ */
export type WithdrawalCreateRequest = {
  otp_reference: string;
  otp: string;
  fee_acknowledged: boolean;
};

// --- View models --------------------------------------------------------------

export type WalletSummary = {
  /** Settled funds the school can withdraw ("saldo riil"). */
  available: number;
  /** Paid but not yet settled by the payment provider ("saldo mengambang"). */
  pending: number;
  /** available + pending. */
  total: number;
  pendingCount: number;
  withdrawnTotal: number;
  withdrawnCount: number;
  /** Flat fee taken from every withdrawal. */
  withdrawalFee: number;
};

export type BadgeTone = "pending" | "available" | "muted";

export type LedgerRow = {
  id: number;
  createdAt: string;
  entryType: LedgerEntryType;
  /** Signed: positive into the wallet, negative out of it. */
  amount: number;
  balanceAfter: number;
  description: string;
  reference: string;
  badge: { label: string; tone: BadgeTone };
  /** A payment credit still waiting for provider settlement. */
  pending: boolean;
  settledAt: string | null;
};

export type Destination = {
  bankCode: string;
  bankName: string;
  accountNumberMasked: string;
  accountHolderName: string;
};

export type PayoutAccount = Destination & { id: number };

export type Withdrawal = Destination & {
  id: number;
  withdrawalNo: string;
  status: WithdrawalStatus;
  statusLabel: string;
  amount: number;
  fee: number;
  transferAmount: number;
  failureReason: string;
  createdAt: string;
  completedAt: string | null;
};

export type PaymentDetail = {
  id: number;
  paymentNo: string;
  studentName: string;
  channelName: string;
  invoiceTotal: number;
  paidAt: string | null;
  needsRefund: boolean;
  items: { invoiceNo: string; feeType: string; amount: number }[];
};

export type LedgerDetail = LedgerRow & {
  payment: PaymentDetail | null;
  withdrawal: Withdrawal | null;
};

export type WithdrawalPreview = {
  otpReference: string;
  otpSentTo: string;
  otpExpiresAt: string;
  amount: number;
  fee: number;
  transferAmount: number;
  destination: Destination;
};

/** What the withdrawal form collects before the preview request. */
export type WithdrawalForm = {
  /** Withdraw to a saved payout account, or enter a new one. */
  target: "saved" | "new";
  payoutAccountId: number | null;
  bankCode: string;
  accountNumber: string;
  accountHolderName: string;
  amount: number;
};

/** Ledger list filters; empty strings mean "no filter". */
export type LedgerFilters = {
  search: string;
  /** "YYYY-MM" or "". */
  month: string;
  status: LedgerStatusFilter;
};

export type LedgerStatusFilter = "all" | "pending" | "available" | "withdrawal";
