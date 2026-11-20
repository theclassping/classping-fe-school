// Branch storage and subscription add-on endpoints used by the storage dialog.
// Contract: classping-backend branch feature/subscription-plan
//   GET  branches/{id}/storage-usage/             usage, capacity, per category / class
//   POST branches/{id}/storage-reset/             {category, class_id?, dry_run}
//   GET  subscription/plans/                      add-on catalogue (max_quantity)
//   GET  subscription/addons/quote/               price now + fee per payment channel
//   POST subscription/addons/                     buy + start payment (Idempotency-Key)
//   GET  subscription/payments/{id}/              payment status (synced with the provider)
//   POST subscription/payments/{id}/cancel/

import { apiGet, apiPost, apiRequest } from "@/lib/api/client";

export type StorageCategoryUsage = { category: string; used_bytes: number; files: number };
export type StorageClassUsage = { class_id: number; class_name: string; used_bytes: number; files: number };

export type StorageUsage = {
  branch_id: number;
  used_bytes: number;
  capacity_bytes: number | null;
  base_capacity_bytes: number | null;
  addon_bytes: number;
  storage_state: "active" | "read_only" | "off" | string;
  percent: number | null;
  status: "ok" | "warning" | "over" | string;
  files?: number;
  by_category?: StorageCategoryUsage[];
  by_class?: StorageClassUsage[];
};

export type ResetSummary = { category: string; class_id: number | null; dry_run: boolean; files: number; bytes: number };

export type AddonFeature = { feature: string; value: number | null; mode: string };
export type Addon = {
  id: number;
  code: string;
  name: string;
  description?: string;
  billing: "recurring" | "one_time" | string;
  price: string;
  max_quantity: number | null;
  features: AddonFeature[];
};

export type PaymentChannel = { code: string; name: string; payment_method: string; transaction_fee: string; amount: string };

export type AddonQuote = {
  addon_code: string;
  quantity: number;
  unit_price: string;
  period_end: string | null;
  subtotal: string;
  tax: string;
  total: string;
  channels: PaymentChannel[];
};

export type SubscriptionPayment = {
  id: number;
  payment_no: string;
  invoice_id: number;
  invoice_number: string;
  status: "pending" | "paid" | "expired" | "cancelled" | "failed";
  channel_code: string;
  channel_name: string;
  payment_method: string;
  invoice_total: string;
  transaction_fee: string;
  amount: string;
  payment_code: string;
  payment_link: string;
  billing_url: string;
  expires_at: string;
  paid_at: string | null;
};

export type AddonPurchase = {
  addon: { id: number; addon_code: string; addon_name: string; quantity: number; status: string };
  invoice: { id: number; number: string; total: string; status: string } | null;
  payment: SubscriptionPayment | null;
};

/** Categories the backend lets a branch reset; payment proofs are never among them. */
export const RESETTABLE_CATEGORIES = ["activities", "assessments", "students", "guardians", "general"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  activities: "Foto aktivitas",
  activity: "Foto aktivitas",
  assessments: "Foto penilaian",
  students: "Foto siswa",
  guardians: "Foto wali",
  general: "Lainnya",
  payments: "Bukti pembayaran",
  payment: "Bukti pembayaran",
  other: "Lainnya",
};

export function categoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category;
}

export function isResettable(category: string) {
  return (RESETTABLE_CATEGORIES as readonly string[]).includes(category);
}

export function storageBytesOf(addon: Pick<Addon, "features">) {
  return addon.features.find(feature => feature.feature === "storage_bytes" && feature.mode === "increment")?.value ?? null;
}

export function loadStorageUsage(branchId: number, signal?: AbortSignal) {
  return apiGet<StorageUsage>(`branches/${branchId}/storage-usage`, undefined, signal);
}

export function resetStorage(branchId: number, category: string, classId: number | null, dryRun: boolean) {
  return apiPost<ResetSummary>(`branches/${branchId}/storage-reset`, { category, class_id: classId, dry_run: dryRun });
}

export async function loadStorageAddons(signal?: AbortSignal) {
  const catalog = await apiGet<{ addons: Addon[] }>("subscription/plans", undefined, signal);
  return catalog.addons.filter(addon => storageBytesOf(addon) !== null);
}

export function quoteAddon(addonCode: string, quantity: number, signal?: AbortSignal) {
  return apiGet<AddonQuote>("subscription/addons/quote", { addon_code: addonCode, quantity }, signal);
}

/** One purchase per key: sending the same key again returns the first purchase instead of buying twice. */
export function buyAddon(addonCode: string, quantity: number, channelCode: string, idempotencyKey: string) {
  return apiRequest<AddonPurchase>("subscription/addons", {
    method: "POST",
    body: { addon_code: addonCode, quantity, channel_code: channelCode },
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

export type SubscriptionInvoice = { id: number; number: string; kind: string; total: string; status: string; due_at: string | null; period_end: string | null };
export type AddonPurchaseRow = { id: number; addon_code: string; addon_name: string; quantity: number; unit_price: string; status: string };
export type SubscriptionSummary = { status: string; addons: AddonPurchaseRow[]; open_invoices: SubscriptionInvoice[] };

/** An add-on bought but not paid yet, with the open invoice to pay it (buying again would create a second invoice). */
export type UnpaidAddon = { purchase: AddonPurchaseRow; invoice: SubscriptionInvoice };

export async function loadUnpaidStorageAddon(storageCodes: string[], signal?: AbortSignal): Promise<UnpaidAddon | null> {
  const summary = await apiGet<SubscriptionSummary>("subscription", undefined, signal);
  const purchase = summary.addons.find(row => row.status === "pending_payment" && storageCodes.includes(row.addon_code));
  // Newest open add-on invoice: each pending purchase has exactly one.
  const invoice = [...summary.open_invoices].filter(row => row.kind === "addon").sort((a, b) => b.id - a.id)[0];
  return purchase && invoice ? { purchase, invoice } : null;
}

export function loadInvoiceChannels(invoiceId: number, signal?: AbortSignal) {
  return apiGet<{ invoice_total: string; channels: PaymentChannel[] }>(`subscription/invoices/${invoiceId}/channels`, undefined, signal);
}

export function checkoutInvoice(invoiceId: number, channelCode: string, idempotencyKey: string) {
  return apiRequest<SubscriptionPayment>(`subscription/invoices/${invoiceId}/checkout`, {
    method: "POST",
    body: { channel_code: channelCode },
    headers: { "Idempotency-Key": idempotencyKey },
  });
}

/** Voids a pending add-on purchase and its open invoice. */
export function removeAddon(purchaseId: number) {
  return apiRequest<AddonPurchaseRow>(`subscription/addons/${purchaseId}`, { method: "DELETE" });
}

export function loadPayment(paymentId: number, signal?: AbortSignal) {
  return apiGet<SubscriptionPayment>(`subscription/payments/${paymentId}`, undefined, signal);
}

export function cancelPayment(paymentId: number) {
  return apiPost<SubscriptionPayment>(`subscription/payments/${paymentId}/cancel`, {});
}

export function formatRupiah(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);
  return `Rp${(Number.isFinite(amount) ? amount : 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
}
