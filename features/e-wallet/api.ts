// E-Wallet endpoints (classping-backend apps/wallets/urls.py). The only file
// in the feature that knows URLs; every function returns view models.
// All endpoints are limited to the branch principal / officer: anyone else
// gets 403 WITHDRAWAL_ROLE_FORBIDDEN.

import { apiGet, apiGetPage, apiPost, type Page } from "@/lib/api/client";
import { LEDGER_PAGE_SIZE, ledgerQuery } from "./ledgerFilters";
import { toLedgerDetail, toLedgerRow, toPayoutAccount, toPreviewRequest, toWalletSummary, toWithdrawal, toWithdrawalPreview } from "./mappers";
import type {
  LedgerDetail,
  LedgerEntryDetailResponse,
  LedgerEntryResponse,
  LedgerFilters,
  LedgerRow,
  PayoutAccount,
  PayoutAccountResponse,
  WalletResponse,
  WalletSummary,
  Withdrawal,
  WithdrawalCreateRequest,
  WithdrawalForm,
  WithdrawalPreview,
  WithdrawalPreviewResponse,
  WithdrawalResponse,
} from "./types";

const PATHS = {
  wallet: "wallet",
  ledger: "wallet/ledger",
  payoutAccounts: "payout-accounts",
  withdrawals: "withdrawals",
  withdrawalPreview: "withdrawals/preview",
  otpResend: "withdrawals/otp/resend",
} as const;

export async function getWalletSummary(signal?: AbortSignal): Promise<WalletSummary> {
  return toWalletSummary(await apiGet<WalletResponse>(PATHS.wallet, undefined, signal));
}

export async function getLedgerPage(filters: LedgerFilters, page: number, signal?: AbortSignal): Promise<Page<LedgerRow>> {
  const result = await apiGetPage<LedgerEntryResponse>(PATHS.ledger, page, LEDGER_PAGE_SIZE, ledgerQuery(filters), signal);
  return { ...result, items: result.items.map(toLedgerRow) };
}

export async function getLedgerEntry(id: number, signal?: AbortSignal): Promise<LedgerDetail> {
  return toLedgerDetail(await apiGet<LedgerEntryDetailResponse>(`${PATHS.ledger}/${id}`, undefined, signal));
}

/** Bank accounts this branch has withdrawn to before, most recently used first. */
export async function getPayoutAccounts(signal?: AbortSignal): Promise<PayoutAccount[]> {
  return (await apiGet<PayoutAccountResponse[]>(PATHS.payoutAccounts, undefined, signal)).map(toPayoutAccount);
}

/** Validates the withdrawal on the server and emails an OTP to the branch. */
export async function previewWithdrawal(form: WithdrawalForm): Promise<WithdrawalPreview> {
  return toWithdrawalPreview(await apiPost<WithdrawalPreviewResponse>(PATHS.withdrawalPreview, toPreviewRequest(form)));
}

/** Sends a new OTP for the same withdrawal; the previous reference stops working. */
export async function resendWithdrawalOtp(otpReference: string): Promise<WithdrawalPreview> {
  return toWithdrawalPreview(await apiPost<WithdrawalPreviewResponse>(PATHS.otpResend, { otp_reference: otpReference }));
}

export async function createWithdrawal(otpReference: string, otp: string, feeAcknowledged: boolean): Promise<Withdrawal> {
  const body: WithdrawalCreateRequest = { otp_reference: otpReference, otp, fee_acknowledged: feeAcknowledged };
  return toWithdrawal(await apiPost<WithdrawalResponse>(PATHS.withdrawals, body));
}
