// Staff notifications for the school portal: bills with a new payment proof and
// recently published activities come from the backend; "update saved" entries
// are recorded locally by the page that performed the save.

export type SchoolNotification = {
  id: string;
  kind: "payment" | "activity" | "update";
  title: string;
  copy: string;
  href: string;
  occurredAt?: string;
};

export const notificationEvent = "classping-notification";
const LOCAL_KEY = "classping:school:local-notifications";
const READ_KEY = "classping:school:read-notifications";
const MAX_ITEMS = 50;

type PaymentRecord = {
  id?: number | string;
  invoice_no?: string;
  student_name?: string;
  status?: string;
  amount?: string | number;
  submitted_at?: string;
  created_at?: string;
};

type ActivityRecord = {
  id?: number | string;
  name?: string;
  class_name?: string;
  is_publish?: boolean;
  activity_date?: string;
  updated_at?: string;
  created_at?: string;
};

function records<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const container = payload as { results?: unknown; data?: unknown };
    if (Array.isArray(container.results)) return container.results as T[];
    if (Array.isArray(container.data)) return container.data as T[];
  }
  return [];
}

function timestamp(value?: string) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

function rupiah(value?: string | number) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

/** Pure mapping from backend records to notifications, so the shape is testable without a browser. */
export function buildRemoteNotifications(payments: unknown, activities: unknown): SchoolNotification[] {
  const paymentItems = records<PaymentRecord>(payments)
    .filter((item) => item.id != null && (item.status || "").toLowerCase() === "submitted")
    .map((item): SchoolNotification => {
      const occurredAt = item.submitted_at || item.created_at;
      const amount = rupiah(item.amount);
      return {
        id: `payment:${item.id}:${occurredAt || "submitted"}`,
        kind: "payment",
        title: "Bukti pembayaran baru",
        copy: `${item.student_name || "Siswa"} mengirim bukti pembayaran${item.invoice_no ? ` untuk ${item.invoice_no}` : ""}${amount ? ` sebesar ${amount}` : ""}. Menunggu verifikasi.`,
        href: `/dashboard/payments/view?payment=${encodeURIComponent(String(item.id))}`,
        occurredAt,
      };
    });
  const activityItems = records<ActivityRecord>(activities)
    .filter((item) => item.id != null && item.is_publish !== false)
    .map((item): SchoolNotification => {
      const occurredAt = item.updated_at || item.created_at;
      return {
        id: `activity:${item.id}:${occurredAt || "published"}`,
        kind: "activity",
        title: "Aktivitas dipublikasikan",
        copy: `${item.name || "Aktivitas"}${item.class_name ? ` · ${item.class_name}` : ""} kini dapat dilihat wali murid.`,
        href: `/dashboard/activities/view?activity=${encodeURIComponent(String(item.id))}`,
        occurredAt,
      };
    });
  return mergeNotifications(paymentItems, activityItems);
}

/** Newest first, duplicates removed by id, capped so the menu stays readable. */
export function mergeNotifications(...groups: SchoolNotification[][]): SchoolNotification[] {
  const seen = new Set<string>();
  return groups
    .flat()
    .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)))
    .sort((a, b) => timestamp(b.occurredAt) - timestamp(a.occurredAt))
    .slice(0, MAX_ITEMS);
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { credentials: "include", cache: "no-store", signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

/** Pulls the newest payment proofs and published activities. Each source fails independently; the bell keeps whatever loaded. */
export async function loadRemoteNotifications(signal?: AbortSignal): Promise<SchoolNotification[]> {
  const [payments, activities] = await Promise.all([
    fetchJson("/api/proxy/payments/?status=submitted&ordering=-submitted_at&page_size=20", signal).catch(() => []),
    fetchJson("/api/proxy/activities/?is_publish=true&ordering=-updated_at&page_size=20", signal).catch(() => []),
  ]);
  return buildRemoteNotifications(payments, activities);
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "null");
    return (stored ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable (private mode); the in-memory state still works for this session.
  }
}

export function readLocalNotifications(): SchoolNotification[] {
  const stored = readStorage<unknown>(LOCAL_KEY, []);
  return Array.isArray(stored)
    ? stored.filter((item): item is SchoolNotification => Boolean(item && typeof item === "object" && typeof (item as SchoolNotification).id === "string"))
    : [];
}

/** Records a successful save and wakes every open bell in this tab. Call it right after the backend confirms the change. */
export function notifySaved(input: { title: string; copy: string; href?: string }): SchoolNotification {
  const item: SchoolNotification = {
    id: `update:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    kind: "update",
    title: input.title,
    copy: input.copy,
    href: input.href || "/dashboard",
    occurredAt: new Date().toISOString(),
  };
  writeStorage(LOCAL_KEY, mergeNotifications([item], readLocalNotifications()));
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(notificationEvent, { detail: item }));
  return item;
}

export function readReadIds(): string[] {
  const stored = readStorage<unknown>(READ_KEY, []);
  return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
}

export function markRead(ids: string[], current = readReadIds()): string[] {
  const next = [...new Set([...current, ...ids])].slice(-200);
  writeStorage(READ_KEY, next);
  return next;
}

export function formatNotificationDate(value?: string) {
  const time = timestamp(value);
  if (!time) return "";
  const diffMinutes = Math.round((Date.now() - time) / 60_000);
  if (diffMinutes < 1) return "Baru saja";
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  if (diffMinutes < 60 * 24) return `${Math.round(diffMinutes / 60)} jam lalu`;
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(time));
}

/** Browser-level push. Permission is only requested from a user gesture (the bell click); never on page load. */
export async function requestPushPermission() {
  if (typeof Notification === "undefined" || Notification.permission !== "default") return;
  try {
    await Notification.requestPermission();
  } catch {
    // Some browsers reject the promise when the user dismisses the prompt; that is the same as "not now".
  }
}

export function pushToBrowser(items: SchoolNotification[]) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted" || document.visibilityState === "visible") return;
  for (const item of items.slice(0, 3)) {
    try {
      new Notification(item.title, { body: item.copy, tag: item.id });
    } catch {
      // A blocked constructor (for example inside some webviews) must not break polling.
    }
  }
}
