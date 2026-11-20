// Subscription endpoints (classping-backend libs/plan_subscriptions/urls.py,
// mounted at /api/subscription/). The only file in the feature that knows
// URLs; every function returns view models.
// Any active staff of the branch may call them; an account without a branch
// gets 404 SUBSCRIPTION_NOT_FOUND.

import { apiGet, apiRequest } from "@/lib/api/client";
import { toChannel, toInvoice, toPayment, toPlanCatalog, toSubscription } from "./mappers";
import type {
  ChangePlanResponse,
  Channel,
  Invoice,
  InvoiceChannelsResponse,
  InvoiceDetailResponse,
  InvoiceResponse,
  InvoiceStart,
  Payment,
  PaymentResponse,
  PlanCatalog,
  PlansResponse,
  Subscription,
  SubscriptionResponse,
} from "./types";

const PATHS = {
  subscription: "subscription",
  plans: "subscription/plans",
  subscribe: "subscription/subscribe",
  changePlan: "subscription/change-plan",
  invoices: "subscription/invoices",
  payments: "subscription/payments",
} as const;

export async function getSubscription(signal?: AbortSignal): Promise<Subscription> {
  return toSubscription(await apiGet<SubscriptionResponse>(PATHS.subscription, undefined, signal));
}

export async function getPlans(signal?: AbortSignal): Promise<PlanCatalog> {
  return toPlanCatalog(await apiGet<PlansResponse>(PATHS.plans, undefined, signal));
}

/** Every invoice of the branch, newest first. */
export async function getInvoices(signal?: AbortSignal): Promise<Invoice[]> {
  return (await apiGet<InvoiceResponse[]>(PATHS.invoices, undefined, signal)).map(toInvoice);
}

/** Trial, overdue or ended subscriptions: creates the invoice for a plan, replacing an open one. */
export async function subscribe(priceId: number, start: InvoiceStart): Promise<Invoice> {
  return toInvoice(await apiRequest<InvoiceResponse>(PATHS.subscribe, { method: "POST", body: { price_id: priceId, start } }));
}

/** Active subscriptions: an upgrade returns its prorated invoice; a downgrade is scheduled and returns null. */
export async function changePlan(priceId: number): Promise<Invoice | null> {
  const { invoice } = await apiRequest<ChangePlanResponse>(PATHS.changePlan, { method: "POST", body: { price_id: priceId } });
  return invoice ? toInvoice(invoice) : null;
}

/** Checkouts already started for an invoice, newest first. */
export async function getInvoicePayments(invoiceId: number, signal?: AbortSignal): Promise<Payment[]> {
  const detail = await apiGet<InvoiceDetailResponse>(`${PATHS.invoices}/${invoiceId}`, undefined, signal);
  return (detail.payments ?? []).map(toPayment).sort((a, b) => b.id - a.id);
}

/** Payment channels with the fee each adds on top of the invoice total. */
export async function getInvoiceChannels(invoiceId: number, signal?: AbortSignal): Promise<Channel[]> {
  const response = await apiGet<InvoiceChannelsResponse>(`${PATHS.invoices}/${invoiceId}/channels`, undefined, signal);
  return (response.channels ?? []).map(toChannel);
}

/**
 * Starts paying an invoice on a channel; a new checkout replaces a pending one.
 * `idempotencyKey` makes a retried request return the same checkout.
 */
export async function startCheckout(invoiceId: number, channelCode: string, idempotencyKey: string): Promise<Payment> {
  return toPayment(await apiRequest<PaymentResponse>(`${PATHS.invoices}/${invoiceId}/checkout`, {
    method: "POST",
    body: { channel_code: channelCode },
    headers: { "Idempotency-Key": idempotencyKey },
  }));
}

/** Latest status of a checkout; the backend asks the provider when it is still pending. */
export async function getPayment(paymentId: number, signal?: AbortSignal): Promise<Payment> {
  return toPayment(await apiGet<PaymentResponse>(`${PATHS.payments}/${paymentId}`, undefined, signal));
}

export async function cancelPayment(paymentId: number): Promise<Payment> {
  return toPayment(await apiRequest<PaymentResponse>(`${PATHS.payments}/${paymentId}/cancel`, { method: "POST", body: {} }));
}
