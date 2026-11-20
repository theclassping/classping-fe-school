// Subscription types.
//
// "…Response" / "…Request" types mirror the Django API exactly
// (classping-backend libs/plan_subscriptions/serializers.py and
// apps/branch_subscriptions/payments.py); decimals arrive as strings.
// The other types are what the components use, produced by mappers.ts.

// --- Backend responses ------------------------------------------------------

/** Django DecimalField, e.g. "199000.00". */
export type Decimal = string;

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "expired" | "canceled";

/** Feature code → value: a number for limits (null = unlimited), a boolean for on/off features. */
export type FeatureValues = Record<string, number | boolean | null>;

export type FeatureState = "active" | "read_only" | "off";

export type InvoiceKind = "first" | "renewal" | "upgrade" | "addon";
export type InvoiceStatus = "open" | "paid" | "void";
/** "period": the paid period starts when the current access ends; "now": it starts on payment. */
export type InvoiceStart = "period" | "now";

/** The last line is the tax (type "tax") when the invoice has any. */
export type InvoiceLineResponse = {
  type?: string;
  description: string;
  quantity: number;
  unit_price: Decimal;
  amount: Decimal;
};

/** One invoice, as nested in GET subscription/ and returned by subscribe / change-plan. */
export type InvoiceResponse = {
  id: number;
  number: string;
  kind: InvoiceKind;
  start: InvoiceStart;
  plan_code: string | null;
  period_start: string | null;
  period_end: string | null;
  lines: InvoiceLineResponse[];
  subtotal: Decimal;
  tax: Decimal;
  /** Including tax, without the payment channel fee. */
  total: Decimal;
  currency: string;
  status: InvoiceStatus;
  due_at: string | null;
  paid_at: string | null;
};

export type PaymentStatus = "pending" | "paid" | "expired" | "cancelled" | "failed";

/** POST invoices/{id}/checkout/, GET payments/{id}/, and nested in GET invoices/{id}/ */
export type PaymentResponse = {
  id: number;
  payment_no: string;
  invoice_id: number;
  invoice_number: string;
  status: PaymentStatus;
  channel_code: string;
  channel_name: string;
  payment_method: string;
  invoice_total: Decimal;
  transaction_fee: Decimal;
  /** invoice_total + transaction_fee: what the payer transfers. */
  amount: Decimal;
  /** Virtual account number, when the channel has one. */
  payment_code: string;
  payment_link: string;
  billing_url: string;
  expires_at: string;
  paid_at: string | null;
  created_at: string;
};

/** GET invoices/{id}/ */
export type InvoiceDetailResponse = InvoiceResponse & { payments: PaymentResponse[] };

export type ChannelResponse = {
  code: string;
  name: string;
  payment_method: string;
  transaction_fee: Decimal;
  amount: Decimal;
};

/** GET invoices/{id}/channels/ */
export type InvoiceChannelsResponse = { invoice_total: Decimal; channels: ChannelResponse[] };

/** GET subscription/ */
export type SubscriptionResponse = {
  id: number;
  status: SubscriptionStatus;
  plan: { code: string; name: string; price_id: number; amount: Decimal };
  /** A scheduled downgrade. */
  pending_plan: { code: string; name: string; from: string | null } | null;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  access_until: string | null;
  grace_ends_at: string | null;
  cancel_at_period_end: boolean;
  currency: string;
  features: Record<string, { state: FeatureState; value: number | boolean | null; kind: string }>;
  open_invoices: InvoiceResponse[];
  /** Feature code → amount used (students, bytes). */
  usage?: Record<string, number>;
};

export type PlanResponse = {
  id: number;
  code: string;
  name: string;
  description: string;
  /** Null when the plan has no active price and cannot be bought. */
  price_id: number | null;
  amount: Decimal | null;
  interval: string | null;
  features: FeatureValues;
};

/** GET subscription/plans/ */
export type PlansResponse = {
  currency: string;
  tax_rate: Decimal;
  plans: PlanResponse[];
};

/** POST subscription/change-plan/: the prorated invoice of an upgrade, or null for a downgrade at period end. */
export type ChangePlanResponse = { invoice: InvoiceResponse | null };

// --- View models --------------------------------------------------------------

export type Tone = "success" | "warning" | "danger" | "muted";

export type Invoice = {
  id: number;
  number: string;
  kind: InvoiceKind;
  kindLabel: string;
  status: InvoiceStatus;
  statusLabel: string;
  tone: Tone;
  planCode: string | null;
  lines: { description: string; quantity: number; amount: number }[];
  subtotal: number;
  tax: number;
  total: number;
  periodStart: string | null;
  periodEnd: string | null;
  dueAt: string | null;
  paidAt: string | null;
};

/** How much of a limit is used; `limit` null means unlimited. */
export type Meter = { used: number; limit: number | null; percent: number; locked: boolean };

export type Subscription = {
  status: SubscriptionStatus;
  statusLabel: string;
  tone: Tone;
  planCode: string;
  planName: string;
  /** Monthly price of the current plan, excluding tax. */
  planAmount: number;
  pendingPlan: { name: string; from: string | null } | null;
  trialEnd: string | null;
  periodEnd: string | null;
  accessUntil: string | null;
  graceEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  students: Meter;
  storage: Meter;
  onlinePayment: boolean;
  openInvoices: Invoice[];
};

export type Plan = {
  code: string;
  name: string;
  /** Null when the plan cannot be bought right now. */
  priceId: number | null;
  /** Monthly price excluding tax. */
  amount: number;
  maxStudents: number | null;
  storageBytes: number | null;
  onlinePayment: boolean;
};

export type PlanCatalog = { taxRate: number; plans: Plan[] };

export type Channel = { code: string; name: string; method: string; fee: number; amount: number };

export type Payment = {
  id: number;
  paymentNo: string;
  invoiceNumber: string;
  status: PaymentStatus;
  channelCode: string;
  channelName: string;
  invoiceTotal: number;
  fee: number;
  amount: number;
  /** Virtual account number; empty when the channel only has a payment page. */
  paymentCode: string;
  /** Provider payment page; empty when there is none. */
  payUrl: string;
  expiresAt: string;
  paidAt: string | null;
};

/** What the plan button does for the signed-in branch. */
export type PlanAction =
  | { kind: "current" }
  | { kind: "unavailable" }
  /** Trial, overdue or ended: creates the invoice for this plan. `canStartNow` only during a trial, for a bigger plan. */
  | { kind: "subscribe"; canStartNow: boolean }
  | { kind: "upgrade" }
  | { kind: "downgrade" };
