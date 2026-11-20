# Subscription

The branch's ClassPing plan for `/dashboard/subscription`: status, usage
against the plan limits, plan choice, invoices, and online payment. Backed by
`libs/plan_subscriptions` and `apps/branch_subscriptions` in
classping-backend. Any active staff of the branch may use it; an account
without a branch (platform admin) gets `404 SUBSCRIPTION_NOT_FOUND`, which the
page shows as a notice.

## Files

| File | Responsibility |
|---|---|
| `types.ts` | Backend response types (exact API shape) and view models |
| `api.ts` | One function per endpoint; the only file that knows URLs |
| `mappers.ts` | Responses → view models (numbers, labels, tones) |
| `rules.ts` | Which action a plan offers, status notices, error-code → message map |
| `hooks/usePayment.ts` | Paying one invoice: choose channel → checkout → poll until paid |
| `components/SubscriptionScreen.tsx` | Page layout; `app/dashboard/subscription/page.tsx` renders it |
| `components/ChoosePlanDialog.tsx` | Confirms a plan before its invoice is created |
| `components/PayDialog.tsx` | Channel choice, VA number / payment page, payment status |

## Endpoints

| Call | Endpoint |
|---|---|
| `getSubscription` | `GET subscription/` |
| `getPlans` | `GET subscription/plans/` |
| `getInvoices` | `GET subscription/invoices/` |
| `subscribe` | `POST subscription/subscribe/` `{price_id, start}` (trial, overdue, ended) |
| `changePlan` | `POST subscription/change-plan/` `{price_id}` (active) |
| `getInvoicePayments` | `GET subscription/invoices/{id}/` |
| `getInvoiceChannels` | `GET subscription/invoices/{id}/channels/` |
| `startCheckout` | `POST subscription/invoices/{id}/checkout/` `{channel_code}` + `Idempotency-Key` |
| `getPayment` | `GET subscription/payments/{id}/` |
| `cancelPayment` | `POST subscription/payments/{id}/cancel/` |

`Idempotency-Key` reaches Django because `app/api/proxy/[...path]/route.ts`
forwards it.

## Keep in sync with the backend

- `FEATURES` in `mappers.ts` mirrors the feature codes in
  `apps/branch_subscriptions/catalog.py`.
- `SUBSCRIPTION_ERROR_MESSAGES` in `rules.ts` covers
  `libs/plan_subscriptions/exceptions.py`.
- Plans, prices, limits and the tax rate always come from
  `GET subscription/plans/`; never hardcode them.

## Not built yet

Buying or removing the storage add-on (`subscription/addons/`) and cancelling
the subscription (`subscription/cancel/`).

## Tests

`tests/subscription-data.test.mjs` covers mappers, rules, and the API
functions against backend-shaped payloads.
