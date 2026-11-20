// Backend responses → view models (numbers, Indonesian labels, tones).
// Pure functions: no fetch, no React.

import { toAmount } from "@/lib/format";
import type {
  Channel,
  ChannelResponse,
  Invoice,
  InvoiceKind,
  InvoiceResponse,
  InvoiceStatus,
  Meter,
  Payment,
  PaymentResponse,
  Plan,
  PlanCatalog,
  PlanResponse,
  PlansResponse,
  Subscription,
  SubscriptionResponse,
  SubscriptionStatus,
  Tone,
} from "./types";

/** Feature codes of the Classping catalog (classping-backend apps/branch_subscriptions/catalog.py). */
export const FEATURES = {
  students: "max_students",
  storage: "storage_bytes",
  onlinePayment: "payment_gateway",
} as const;

const STATUS: Record<SubscriptionStatus, { label: string; tone: Tone }> = {
  trialing: { label: "Masa gratis", tone: "success" },
  active: { label: "Aktif", tone: "success" },
  past_due: { label: "Menunggu pembayaran", tone: "warning" },
  expired: { label: "Berakhir", tone: "danger" },
  canceled: { label: "Dibatalkan", tone: "danger" },
};

const INVOICE_STATUS: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  open: { label: "Belum dibayar", tone: "warning" },
  paid: { label: "Lunas", tone: "success" },
  void: { label: "Dibatalkan", tone: "muted" },
};

const INVOICE_KIND: Record<InvoiceKind, string> = {
  first: "Langganan pertama",
  renewal: "Perpanjangan",
  upgrade: "Upgrade paket",
  addon: "Tambahan",
};

/** Backend decimal → number; 0 when missing so totals never show NaN. */
function amountOf(value: string | null | undefined): number {
  const amount = toAmount(value);
  return Number.isFinite(amount) ? amount : 0;
}

/** A limit value: a non-negative number, or null for unlimited. */
function limitOf(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function toInvoice(invoice: InvoiceResponse): Invoice {
  const status = INVOICE_STATUS[invoice.status] ?? INVOICE_STATUS.void;
  return {
    id: invoice.id,
    number: invoice.number,
    kind: invoice.kind,
    kindLabel: INVOICE_KIND[invoice.kind] ?? invoice.kind,
    status: invoice.status,
    statusLabel: status.label,
    tone: status.tone,
    planCode: invoice.plan_code,
    lines: (invoice.lines ?? []).map((line) => ({ description: line.description, quantity: line.quantity, amount: amountOf(line.amount) })),
    subtotal: amountOf(invoice.subtotal),
    tax: amountOf(invoice.tax),
    total: amountOf(invoice.total),
    periodStart: invoice.period_start,
    periodEnd: invoice.period_end,
    dueAt: invoice.due_at,
    paidAt: invoice.paid_at,
  };
}

function toMeter(subscription: SubscriptionResponse, code: string): Meter {
  const feature = subscription.features?.[code];
  const used = Math.max(0, Number(subscription.usage?.[code] ?? 0) || 0);
  const limit = feature && feature.state !== "off" ? limitOf(feature.value) : 0;
  const percent = limit === null ? 0 : limit <= 0 ? 100 : Math.min(100, (used / limit) * 100);
  return { used, limit, percent, locked: feature?.state !== "active" };
}

export function toSubscription(subscription: SubscriptionResponse): Subscription {
  const status = STATUS[subscription.status] ?? STATUS.expired;
  const onlinePayment = subscription.features?.[FEATURES.onlinePayment];
  return {
    status: subscription.status,
    statusLabel: status.label,
    tone: status.tone,
    planCode: subscription.plan.code,
    planName: subscription.plan.name,
    planAmount: amountOf(subscription.plan.amount),
    pendingPlan: subscription.pending_plan ? { name: subscription.pending_plan.name, from: subscription.pending_plan.from } : null,
    trialEnd: subscription.trial_end,
    periodEnd: subscription.current_period_end,
    accessUntil: subscription.access_until,
    graceEndsAt: subscription.grace_ends_at,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    students: toMeter(subscription, FEATURES.students),
    storage: toMeter(subscription, FEATURES.storage),
    onlinePayment: onlinePayment?.state === "active" && onlinePayment.value === true,
    openInvoices: (subscription.open_invoices ?? []).map(toInvoice),
  };
}

export function toPlan(plan: PlanResponse): Plan {
  return {
    code: plan.code,
    name: plan.name,
    priceId: plan.price_id,
    amount: amountOf(plan.amount),
    maxStudents: limitOf(plan.features?.[FEATURES.students]),
    storageBytes: limitOf(plan.features?.[FEATURES.storage]),
    onlinePayment: plan.features?.[FEATURES.onlinePayment] === true,
  };
}

/** Plans in price order, cheapest first. */
export function toPlanCatalog(response: PlansResponse): PlanCatalog {
  const taxRate = toAmount(response.tax_rate);
  return {
    taxRate: Number.isFinite(taxRate) ? taxRate : 0,
    plans: (response.plans ?? []).map(toPlan).sort((a, b) => a.amount - b.amount),
  };
}

export function toChannel(channel: ChannelResponse): Channel {
  return { code: channel.code, name: channel.name, method: channel.payment_method, fee: amountOf(channel.transaction_fee), amount: amountOf(channel.amount) };
}

export function toPayment(payment: PaymentResponse): Payment {
  return {
    id: payment.id,
    paymentNo: payment.payment_no,
    invoiceNumber: payment.invoice_number,
    status: payment.status,
    channelCode: payment.channel_code,
    channelName: payment.channel_name || payment.channel_code,
    invoiceTotal: amountOf(payment.invoice_total),
    fee: amountOf(payment.transaction_fee),
    amount: amountOf(payment.amount),
    paymentCode: payment.payment_code ?? "",
    payUrl: payment.billing_url || payment.payment_link || "",
    expiresAt: payment.expires_at,
    paidAt: payment.paid_at,
  };
}
