# E-Wallet

Branch balance, ledger, and withdrawals for `/dashboard/e-wallet`, backed by
`apps/wallets` in classping-backend. Only the branch **principal** or
**officer** (STAFF with that staff type) may use it; anyone else gets
`403 WITHDRAWAL_ROLE_FORBIDDEN`, which the page shows as a notice.

## Files

| File | Responsibility |
|---|---|
| `types.ts` | Backend response/request types (exact API shape) and view models |
| `api.ts` | One function per endpoint; the only file that knows URLs |
| `mappers.ts` | Responses → view models (numbers, labels, badges); form → request |
| `rules.ts` | Withdrawal validation, bank list, error-code → message map |
| `ledgerFilters.ts` | Ledger filters → query parameters, month options |
| `hooks/useLedger.ts` | One server-side ledger page plus its filters |
| `hooks/useWithdrawal.ts` | Withdrawal steps: form → OTP → done |
| `components/EWalletScreen.tsx` | Page layout; `app/dashboard/e-wallet/page.tsx` renders it |
| `components/*` | Display only: no `fetch`, no calculations |

## Endpoints

| Call | Endpoint |
|---|---|
| `getWalletSummary` | `GET wallet/` |
| `getLedgerPage` | `GET wallet/ledger/?page&page_size&search&date_from&date_to&entry_type&settlement_status` |
| `getLedgerEntry` | `GET wallet/ledger/{id}/` |
| `getPayoutAccounts` | `GET payout-accounts/` |
| `previewWithdrawal` | `POST withdrawals/preview/` (emails the OTP; 3 minutes, 3 attempts) |
| `resendWithdrawalOtp` | `POST withdrawals/otp/resend/` |
| `createWithdrawal` | `POST withdrawals/` |

## Keep in sync with the backend

- `BANKS` in `rules.ts` mirrors `BANK_CODES` in
  `apps/payment_aggregator/providers/rintisan/constants.py`.
- `WALLET_ERROR_MESSAGES` in `rules.ts` covers `apps/wallets/exceptions.py`.
- The withdrawal fee always comes from `GET wallet/` (`withdrawal_fee`);
  never hardcode it.

## Tests

`tests/e-wallet-data.test.mjs` covers mappers, rules, filters, and the API
functions against backend-shaped payloads.
