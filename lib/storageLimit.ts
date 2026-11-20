// Upload refusals caused by the branch's storage or subscription, and the
// window event that opens the storage dialog (StorageBlockHost) from any
// upload flow — React components and plain controllers alike.
//
// Backend contract (POST /api/media/presign/):
//   403 {"code": "storage_full", used_bytes, capacity_bytes, requested_bytes, addons: [...]}
//   403 {"code": "FEATURE_LOCKED", feature: "storage_bytes"}  subscription expired
//   507 {"code": "server_storage_full"}                        local disk full (dev only)
// A 403 without one of these codes is an ordinary permission error.

export type StorageOffer = {
  code: string;
  name: string;
  price: string;
  billing: string;
  adds_bytes: number | null;
};

export type StorageBlock =
  | { kind: "storage_full"; usedBytes: number; capacityBytes: number; requestedBytes: number; offers: StorageOffer[] }
  | { kind: "subscription_locked" };

export const STORAGE_BLOCK_EVENT = "classping-storage-blocked";
export const STORAGE_DIALOG_OPEN_EVENT = "classping-storage-dialog-open";
/** Fired when space was bought or freed: upload flows retry what the storage refused. */
export const STORAGE_RESTORED_EVENT = "classping-storage-restored";

export type StorageBlockEventDetail = { block: StorageBlock; fileName?: string };

const SERVER_STORAGE_FULL_MESSAGE = "Server penyimpanan sedang penuh. Coba lagi nanti.";

export class StorageBlockedError extends Error {
  constructor(readonly block: StorageBlock) {
    super(block.kind === "storage_full" ? "Penyimpanan sekolah penuh." : "Langganan sekolah sudah berakhir.");
    this.name = "StorageBlockedError";
  }
}

function count(value: unknown) {
  const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(amount) && amount >= 0 ? amount : 0;
}

/** The storage block described by an error response, or null for any other error. */
export function storageBlockFrom(status: number, body: unknown): StorageBlock | null {
  if (status !== 403 || !body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (record.code === "storage_full") {
    const offers = Array.isArray(record.addons) ? (record.addons as StorageOffer[]).filter(offer => offer && typeof offer.code === "string") : [];
    return {
      kind: "storage_full",
      usedBytes: count(record.used_bytes),
      capacityBytes: count(record.capacity_bytes),
      requestedBytes: count(record.requested_bytes),
      offers,
    };
  }
  if (record.code === "FEATURE_LOCKED") return { kind: "subscription_locked" };
  return null;
}

/**
 * Throws the right error for a failed presign or upload response:
 * StorageBlockedError for storage/subscription refusals, an Error with
 * Indonesian text for a full server disk, otherwise an Error with `fallback`.
 */
export function throwUploadError(status: number, body: unknown, fallback: string): never {
  const block = storageBlockFrom(status, body);
  if (block) throw new StorageBlockedError(block);
  const code = body && typeof body === "object" ? (body as Record<string, unknown>).code : undefined;
  if (status === 507 || code === "server_storage_full") throw new Error(SERVER_STORAGE_FULL_MESSAGE);
  throw new Error(fallback);
}

/** Opens the storage dialog for a refused upload. `fileName` lets the dialog count files left out. */
export function reportStorageBlock(block: StorageBlock, fileName?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<StorageBlockEventDetail>(STORAGE_BLOCK_EVENT, { detail: { block, fileName } }));
}

/** Opens the storage dialog without an upload (e.g. "Kelola penyimpanan" on the storage page). */
export function openStorageDialog() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STORAGE_DIALOG_OPEN_EVENT));
}

export function announceStorageRestored() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STORAGE_RESTORED_EVENT));
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let amount = bytes / 1024;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit++;
  }
  return `${amount.toLocaleString("id-ID", { maximumFractionDigits: amount < 10 ? 2 : 1 })} ${units[unit]}`;
}
