// What a branch can do with its subscription, and the text that explains it.
// The backend re-checks every rule (libs/plan_subscriptions/services.py);
// these only decide which buttons and notices to show.

import { errorMessage, type ErrorMessages } from "@/lib/api/errors";
import type { Payment, Plan, PlanAction, Subscription, Tone } from "./types";

export const SUBSCRIPTION_ERROR_MESSAGES: ErrorMessages = {
  SUBSCRIPTION_NOT_FOUND: "Akun ini tidak terhubung dengan cabang sekolah yang berlangganan.",
  INVOICE_NOT_PAYABLE: "Tagihan ini sudah dibayar atau dibatalkan. Muat ulang halaman untuk melihat status terbaru.",
  PLAN_CHANGE_NOT_ALLOWED: "Paket ini belum dapat dipilih untuk status langganan saat ini.",
  INVALID_REQUEST: "Permintaan belum dapat diproses. Periksa kembali pilihan Anda. Jika membayar online, pastikan nomor telepon di profil staf atau cabang sudah benar.",
  PROVIDER_UNAVAILABLE: "Penyedia pembayaran sedang tidak dapat dihubungi. Silakan coba lagi.",
  BILLING_NOT_SUPPORTED: "Pembayaran online belum tersedia. Hubungi tim ClassPing.",
};

export function subscriptionErrorMessage(error: unknown, fallback: string): string {
  return errorMessage(error, fallback, SUBSCRIPTION_ERROR_MESSAGES);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from `now` until an ISO timestamp, rounded up; 0 once passed or when missing. */
export function daysUntil(value: string | null | undefined, now: number): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : Math.max(0, Math.ceil((time - now) / DAY_MS));
}

/** "50 GB", "512 MB"; binary units, as the backend stores limits in bytes. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount = bytes;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount.toLocaleString("id-ID", { maximumFractionDigits: amount >= 100 || unit < 3 ? 0 : 1 })} ${units[unit]}`;
}

/**
 * The button a plan card shows.
 *   trialing            → subscribe; a plan other than the trial plan may also start now
 *   past_due / ended    → subscribe (the backend decides when the period starts)
 *   active              → the current plan, an upgrade (prorated invoice) or a downgrade (at period end)
 */
export function planAction(subscription: Subscription, plan: Plan): PlanAction {
  if (plan.priceId === null) return { kind: "unavailable" };
  if (subscription.status === "active") {
    if (plan.code === subscription.planCode) return { kind: "current" };
    return { kind: plan.amount > subscription.planAmount ? "upgrade" : "downgrade" };
  }
  return { kind: "subscribe", canStartNow: subscription.status === "trialing" && plan.code !== subscription.planCode };
}

/** The cheapest plan that fits the branch's active students; null when none does. */
export function recommendedPlan(plans: readonly Plan[], activeStudents: number): Plan | null {
  return plans.find((plan) => plan.priceId !== null && (plan.maxStudents === null || plan.maxStudents >= activeStudents)) ?? null;
}

export type Notice = { tone: Tone; title: string; body: string };

/** The banner under the page heading; null when nothing needs attention. */
export function statusNotice(subscription: Subscription, now: number, formatDate: (value: string | null) => string): Notice | null {
  const hasOpenInvoice = subscription.openInvoices.length > 0;
  switch (subscription.status) {
    case "trialing": {
      const days = daysUntil(subscription.trialEnd, now);
      if (hasOpenInvoice) {
        return { tone: "warning", title: "Tagihan langganan menunggu pembayaran", body: `Masa gratis berakhir ${formatDate(subscription.trialEnd)}. Bayar tagihan di bawah agar layanan berlanjut tanpa jeda.` };
      }
      return {
        tone: days <= 30 ? "warning" : "success",
        title: `Masa gratis tersisa ${days} hari`,
        body: `Berakhir ${formatDate(subscription.trialEnd)}. Pilih paket di bawah agar layanan berlanjut setelahnya.`,
      };
    }
    case "past_due":
      return {
        tone: "warning",
        title: "Tagihan sudah melewati jatuh tempo",
        body: `Semua fitur masih berjalan sampai ${formatDate(subscription.graceEndsAt)}. Setelah itu akun beralih ke mode baca saja sampai tagihan dibayar.`,
      };
    case "expired":
    case "canceled":
      return {
        tone: "danger",
        title: "Langganan berakhir. Akun dalam mode baca saja",
        body: "Data, foto, dan laporan tetap tersimpan. Unggah foto baru, tambah siswa, dan pembayaran online orang tua aktif kembali setelah tagihan dibayar.",
      };
    case "active":
      if (subscription.cancelAtPeriodEnd) {
        return { tone: "warning", title: "Langganan akan berhenti", body: `Layanan berjalan sampai ${formatDate(subscription.accessUntil)} dan tidak diperpanjang.` };
      }
      if (subscription.pendingPlan) {
        return { tone: "muted", title: `Pindah ke paket ${subscription.pendingPlan.name}`, body: `Berlaku mulai ${formatDate(subscription.pendingPlan.from)}. Sampai saat itu batas paket ${subscription.planName} tetap berlaku.` };
      }
      return hasOpenInvoice ? { tone: "warning", title: "Tagihan menunggu pembayaran", body: "Bayar tagihan di bawah sebelum jatuh tempo agar layanan berlanjut tanpa jeda." } : null;
    default:
      return null;
  }
}

/** A checkout the payer can still complete: pending and inside its payment window. */
export function isPayable(payment: Payment, now: number): boolean {
  return payment.status === "pending" && new Date(payment.expiresAt).getTime() > now;
}

/** The checkout to resume for an invoice, if one is still open. */
export function resumablePayment(payments: readonly Payment[], now: number): Payment | null {
  return payments.find((payment) => isPayable(payment, now)) ?? null;
}

/** How often the pay dialog asks the backend whether a pending checkout was paid. */
export const PAYMENT_POLL_MS = 5000;
