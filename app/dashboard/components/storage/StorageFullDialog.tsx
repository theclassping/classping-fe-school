"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, Clock, Copy, CreditCard, ExternalLink, HardDrive, Lock, Minus, PackagePlus, Plus, Trash2, Wallet } from "lucide-react";
import { errorMessage, isAbortError } from "@/lib/api/errors";
import { formatBytes, type StorageBlock } from "@/lib/storageLimit";
import { randomId } from "@/lib/uuid";
import {
  buyAddon, cancelPayment, categoryLabel, checkoutInvoice, formatRupiah, isResettable, loadInvoiceChannels, loadPayment,
  loadStorageAddons, loadStorageUsage, loadUnpaidStorageAddon, quoteAddon, removeAddon, resetStorage, storageBytesOf,
  type Addon, type PaymentChannel, type ResetSummary, type StorageUsage, type SubscriptionPayment, type UnpaidAddon,
} from "./storageApi";

export type StorageViewer = "staff" | "teacher";

type Step = "home" | "reset" | "reset-confirm" | "reset-done" | "buy" | "pay" | "paid";

const RESET_PHRASE = "HAPUS";
const POLL_MS = 5000;
const PAYMENT_ERRORS = {
  INVOICE_NOT_PAYABLE: "Tagihan ini sudah tidak bisa dibayar. Muat ulang lalu coba lagi.",
  FEATURE_LOCKED: "Langganan sekolah sudah berakhir. Perpanjang langganan terlebih dahulu.",
  PROVIDER_UNAVAILABLE: "Layanan pembayaran sedang tidak tersedia. Coba lagi beberapa saat lagi atau pilih metode lain.",
  CHANNEL_NOT_AVAILABLE: "Metode pembayaran ini sedang tidak tersedia. Pilih metode lain.",
};

/** Price lines and payment channels for the buy step: a new purchase, or an unpaid invoice being paid. */
type Checkout = {
  channels: PaymentChannel[];
  /** Detail rows above "Total tagihan" (price × quantity, tax); empty when paying an existing invoice. */
  lines: { label: string; amount: string }[];
  /** What is being paid, shown above the channels. */
  item: { title: string; detail: string };
  total: string;
};

const METHOD_GROUPS: { method: string; label: string; icon: ReactNode }[] = [
  { method: "virtual_account", label: "Virtual Account", icon: <Building2 size={15} aria-hidden="true" /> },
  { method: "e_wallet", label: "E-Wallet", icon: <Wallet size={15} aria-hidden="true" /> },
  { method: "credit_card", label: "Kartu Kredit", icon: <CreditCard size={15} aria-hidden="true" /> },
];

/** Channels grouped like the guardian checkout: virtual accounts, e-wallets, cards, then anything else. */
function groupChannels(channels: PaymentChannel[]) {
  const known = METHOD_GROUPS.map(group => group.method);
  const groups = METHOD_GROUPS.map(group => ({ ...group, channels: channels.filter(channel => channel.payment_method === group.method) }));
  groups.push({ method: "other", label: "Lainnya", icon: <Wallet size={15} aria-hidden="true" />, channels: channels.filter(channel => !known.includes(channel.payment_method)) });
  return groups.filter(group => group.channels.length > 0);
}

function pendingPaymentKey(branchId: number) {
  return `classping-storage-addon-payment:${branchId}`;
}

function readPendingPayment(branchId: number): number | null {
  try {
    const value = Number(window.localStorage.getItem(pendingPaymentKey(branchId)));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function writePendingPayment(branchId: number, paymentId: number | null) {
  try {
    if (paymentId) window.localStorage.setItem(pendingPaymentKey(branchId), String(paymentId));
    else window.localStorage.removeItem(pendingPaymentKey(branchId));
  } catch {
    // Storage blocked: the payment still works, it just won't resume after a reload.
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

type Severity = "full" | "warning" | "ok";

function Meter({ used, capacity, requested, severity }: { used: number; capacity: number | null; requested?: number; severity: Severity }) {
  const percent = capacity ? Math.min(100, (used / capacity) * 100) : 0;
  const free = capacity === null ? null : Math.max(0, capacity - used);
  const shown = percent > 0 && percent < 1 ? "<1" : String(Math.floor(percent));
  return (
    <div className={`storage-full-dialog__meter is-${severity}`}>
      <div className="storage-monitor__labels">
        <span>{formatBytes(used)} terpakai</span>
        <strong>{capacity === null ? "Tanpa batas" : `${formatBytes(capacity)} kapasitas`}</strong>
      </div>
      <div className="storage-monitor__track" aria-hidden="true">
        <div className={`storage-monitor__fill${severity === "full" ? " is-critical" : severity === "warning" ? " is-warning" : ""}`} style={{ width: `${percent}%` }} />
      </div>
      <small>
        {requested && free !== null
          ? `Ruang tidak cukup untuk file ini (butuh ${formatBytes(requested)}, tersisa ${formatBytes(free)}).`
          : `${shown}% digunakan`}
      </small>
    </div>
  );
}

/**
 * Storage dialog shown when an upload is refused (storage full or the
 * subscription expired), or opened from the storage page.
 * Staff can free up space (reset a category) or buy a storage add-on through
 * the payment gateway; teachers are only told to contact the school admin.
 */
export default function StorageFullDialog({
  viewer,
  branchId,
  block,
  failedFiles,
  onClose,
  onCapacityRestored,
}: {
  viewer: StorageViewer;
  branchId: number | null;
  /** Null when opened by hand rather than by a refused upload. */
  block: StorageBlock | null;
  failedFiles: string[];
  onClose: () => void;
  /** Called when space was bought or freed, so refused uploads can be retried. */
  onCapacityRestored: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>("home");
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const [category, setCategory] = useState("");
  const [classId, setClassId] = useState("");
  const [estimateResult, setEstimateResult] = useState<{ key: string; summary: ResetSummary | null; error: string } | null>(null);
  const [phrase, setPhrase] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [quoteResult, setQuoteResult] = useState<{ key: string; quote: Checkout | null; error: string } | null>(null);
  const [channelCode, setChannelCode] = useState("");
  // An add-on bought but not paid (e.g. the provider was down): pay its invoice instead of buying again.
  const [unpaid, setUnpaid] = useState<UnpaidAddon | null>(null);
  const [payment, setPayment] = useState<SubscriptionPayment | null>(null);
  const [copied, setCopied] = useState(false);

  const locked = block?.kind === "subscription_locked" || usage?.storage_state === "read_only";
  const manage = viewer === "staff" && !locked && branchId !== null;
  const addon = addons[0] ?? null;
  const maxQuantity = Math.max(1, addon?.max_quantity ?? 10);
  // Results are keyed by their request, so "loading" is simply "no result for the current choice yet".
  const estimateKey = `${category}|${classId}`;
  const estimate = estimateResult?.key === estimateKey ? estimateResult.summary : null;
  const estimateError = estimateResult?.key === estimateKey ? estimateResult.error : "";
  const estimating = step === "reset" && Boolean(category) && estimateResult?.key !== estimateKey;
  const quoteKey = unpaid ? `invoice:${unpaid.invoice.id}` : `${addon?.code ?? ""}|${quantity}`;
  const quote = quoteResult?.key === quoteKey ? quoteResult.quote : null;
  const quoteError = quoteResult?.key === quoteKey ? quoteResult.error : "";
  const quoting = step === "buy" && Boolean(addon) && quoteResult?.key !== quoteKey;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const refreshUnpaid = useCallback(async (codes: string[], signal?: AbortSignal) => {
    const next = codes.length ? await loadUnpaidStorageAddon(codes, signal) : null;
    setUnpaid(next);
    return next;
  }, []);

  const refreshUsage = useCallback(async (signal?: AbortSignal) => {
    if (branchId === null) return null;
    const next = await loadStorageUsage(branchId, signal);
    setUsage(next);
    return next;
  }, [branchId]);

  // Staff: usage (categories, classes) and the add-on catalogue; resume a payment left open.
  useEffect(() => {
    if (viewer !== "staff" || branchId === null) return;
    const controller = new AbortController();
    (async () => {
      try {
        const [nextUsage, nextAddons] = await Promise.all([refreshUsage(controller.signal), loadStorageAddons(controller.signal)]);
        if (controller.signal.aborted) return;
        setAddons(nextAddons);
        await refreshUnpaid(nextAddons.map(row => row.code), controller.signal);
        const firstResettable = nextUsage?.by_category?.find(row => isResettable(row.category) && row.files > 0);
        setCategory(current => current || firstResettable?.category || "");
        const pendingId = readPendingPayment(branchId);
        if (pendingId) {
          const pending = await loadPayment(pendingId, controller.signal);
          if (controller.signal.aborted) return;
          if (pending.status === "pending") { setPayment(pending); setStep("pay"); }
          else writePendingPayment(branchId, null);
        }
      } catch (error) {
        if (!isAbortError(error)) setLoadError(errorMessage(error, "Data penyimpanan belum bisa dimuat."));
      }
    })();
    return () => controller.abort();
  }, [viewer, branchId, refreshUsage, refreshUnpaid]);

  // Reset estimate (dry run) whenever the category or class changes.
  useEffect(() => {
    if (step !== "reset" || branchId === null || !category) return;
    let cancelled = false;
    const key = `${category}|${classId}`;
    resetStorage(branchId, category, classId ? Number(classId) : null, true)
      .then(summary => { if (!cancelled) setEstimateResult({ key, summary, error: "" }); })
      .catch(error => { if (!cancelled) setEstimateResult({ key, summary: null, error: errorMessage(error, "Estimasi belum bisa dihitung.") }); });
    return () => { cancelled = true; };
  }, [step, branchId, category, classId]);

  // Price and payment channels: for the chosen quantity, or for the unpaid invoice.
  useEffect(() => {
    if (step !== "buy" || !addon) return;
    const controller = new AbortController();
    const key = unpaid ? `invoice:${unpaid.invoice.id}` : `${addon.code}|${quantity}`;
    const load: Promise<Checkout> = unpaid
      ? loadInvoiceChannels(unpaid.invoice.id, controller.signal).then(result => ({
        channels: result.channels,
        lines: [],
        item: {
          title: `${unpaid.purchase.addon_name} · ${unpaid.purchase.quantity} paket`,
          detail: `${unpaid.invoice.number}${unpaid.invoice.period_end ? ` · s.d. ${formatDate(unpaid.invoice.period_end)}` : ""}`,
        },
        total: result.invoice_total,
      }))
      : quoteAddon(addon.code, quantity, controller.signal).then(result => ({
        channels: result.channels,
        lines: [
          { label: `${result.quantity} paket × ${formatRupiah(result.unit_price)}/bulan`, amount: result.subtotal },
          { label: "PPN", amount: result.tax },
        ],
        item: {
          title: `${addon.name} · ${result.quantity} paket`,
          detail: result.period_end ? `Dihitung sampai ${formatDate(result.period_end)}, mengikuti periode langganan` : "",
        },
        total: result.total,
      }));
    load
      .then(next => {
        setQuoteResult({ key, quote: next, error: "" });
        setChannelCode(current => next.channels.some(channel => channel.code === current) ? current : next.channels[0]?.code ?? "");
      })
      .catch(error => { if (!isAbortError(error)) setQuoteResult({ key, quote: null, error: errorMessage(error, "Harga belum bisa dimuat.", PAYMENT_ERRORS) }); });
    return () => controller.abort();
  }, [step, addon, quantity, unpaid]);

  // Poll the payment until the provider confirms it (or it ends).
  useEffect(() => {
    if (step !== "pay" || !payment || payment.status !== "pending") return;
    const controller = new AbortController();
    const timer = window.setInterval(() => {
      loadPayment(payment.id, controller.signal)
        .then(next => {
          setPayment(next);
          if (next.status === "paid") {
            if (branchId !== null) writePendingPayment(branchId, null);
            setStep("paid");
            void refreshUsage().catch(() => undefined);
            onCapacityRestored();
          } else if (next.status !== "pending" && branchId !== null) {
            writePendingPayment(branchId, null);
          }
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [step, payment, branchId, refreshUsage, onCapacityRestored]);

  function go(next: Step) {
    setActionError("");
    setStep(next);
  }

  async function confirmReset() {
    if (branchId === null || !category) return;
    setBusy(true);
    setActionError("");
    try {
      await resetStorage(branchId, category, classId ? Number(classId) : null, false);
      setEstimateResult(null);
      setStep("reset-done");
      void refreshUsage().catch(() => undefined);
    } catch (error) {
      setActionError(errorMessage(error, "Foto belum berhasil dihapus. Coba lagi."));
    } finally {
      setBusy(false);
    }
  }

  async function startPurchase() {
    if (!addon || !channelCode || branchId === null) return;
    setBusy(true);
    setActionError("");
    try {
      if (unpaid) {
        const started = await checkoutInvoice(unpaid.invoice.id, channelCode, randomId());
        setPayment(started);
        writePendingPayment(branchId, started.id);
        setStep(started.status === "paid" ? "paid" : "pay");
        return;
      }
      const result = await buyAddon(addon.code, quantity, channelCode, randomId());
      if (result.payment) {
        setPayment(result.payment);
        writePendingPayment(branchId, result.payment.id);
        setStep(result.payment.status === "paid" ? "paid" : "pay");
      } else if (result.addon.status === "active") {
        setStep("paid");
        void refreshUsage().catch(() => undefined);
        onCapacityRestored();
      } else {
        setActionError("Pembayaran belum bisa dimulai. Coba lagi.");
      }
    } catch (error) {
      setActionError(errorMessage(error, "Pembelian belum bisa diproses. Coba lagi.", PAYMENT_ERRORS));
      // The purchase may exist even though the payment did not start: retry by paying its invoice.
      await refreshUnpaid(addons.map(row => row.code)).catch(() => null);
    } finally {
      setBusy(false);
    }
  }

  async function cancelOrder() {
    if (!unpaid) return;
    setBusy(true);
    setActionError("");
    try {
      await removeAddon(unpaid.purchase.id);
      setUnpaid(null);
      setQuantity(1);
    } catch (error) {
      setActionError(errorMessage(error, "Pesanan belum bisa dibatalkan. Coba lagi.", PAYMENT_ERRORS));
    } finally {
      setBusy(false);
    }
  }

  async function backToCheckout() {
    setPayment(null);
    await refreshUnpaid(addons.map(row => row.code)).catch(() => null);
    go("buy");
  }

  async function abandonPayment() {
    if (!payment) return;
    setBusy(true);
    try {
      await cancelPayment(payment.id);
    } catch {
      // Already closed on the provider side; nothing left to cancel.
    } finally {
      if (branchId !== null) writePendingPayment(branchId, null);
      setBusy(false);
      await backToCheckout();
    }
  }

  async function copyPaymentCode() {
    if (!payment?.payment_code) return;
    try {
      await navigator.clipboard.writeText(payment.payment_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const used = usage?.used_bytes ?? (block?.kind === "storage_full" ? block.usedBytes : 0);
  const capacity = usage ? usage.capacity_bytes : block?.kind === "storage_full" ? block.capacityBytes : null;
  const requested = block?.kind === "storage_full" ? block.requestedBytes : undefined;
  // A refused upload is "full" whatever the numbers; opened by hand, follow the backend's status.
  const severity: Severity = block?.kind === "storage_full" || usage?.status === "over" ? "full" : usage?.status === "warning" ? "warning" : "ok";
  const categories = usage?.by_category ?? [];
  const resettable = categories.filter(row => isResettable(row.category) && row.files > 0);
  const protectedRows = categories.filter(row => !isResettable(row.category) && row.files > 0);
  const failedNote = failedFiles.length > 0 && (
    <p className="storage-full-dialog__note">
      {failedFiles.length === 1 ? `"${failedFiles[0]}" belum terunggah` : `${failedFiles.length} file belum terunggah`} dan tetap tersimpan, bisa diunggah lagi nanti.
    </p>
  );
  const unitBytes = addon ? storageBytesOf(addon) ?? 0 : 0;
  const channel = quote?.channels.find(item => item.code === channelCode) ?? null;
  const paymentEnded = payment && ["expired", "cancelled", "failed"].includes(payment.status);

  const close = (
    <button type="button" className="modal-close" aria-label="Tutup" disabled={busy} onClick={onClose}>×</button>
  );
  const header = (icon: ReactNode, tone: string, title: string, text: string, withClose = true) => (
    <div className="modal-header">
      <div className="storage-full-dialog__title">
        <span className={`storage-full-dialog__icon is-${tone}`} aria-hidden="true">{icon}</span>
        <div>
          <h2 id="storage-full-title">{title}</h2>
          <p id="storage-full-description">{text}</p>
        </div>
      </div>
      {withClose && close}
    </div>
  );

  let content: ReactNode;
  if (locked) {
    content = (
      <>
        {header(<Lock size={22} />, "warning", "Langganan sekolah sudah berakhir",
          viewer === "teacher"
            ? "Foto lama tetap bisa dilihat, tapi foto baru belum bisa diunggah. Hubungi admin sekolah."
            : "Foto lama tetap bisa dilihat, tapi foto baru belum bisa diunggah sampai langganan sekolah diperpanjang. Hubungi ClassPing untuk memperpanjang langganan.")}
        {failedNote}
        <div className="modal-actions"><button type="button" className="button-primary" autoFocus onClick={onClose}>Mengerti</button></div>
      </>
    );
  } else if (viewer === "teacher") {
    content = (
      <>
        {header(<HardDrive size={22} />, "danger", "Penyimpanan sekolah penuh", "Hubungi admin sekolah.")}
        {failedNote}
        <div className="modal-actions"><button type="button" className="button-primary" autoFocus onClick={onClose}>Mengerti</button></div>
      </>
    );
  } else if (!manage) {
    content = (
      <>
        {header(<HardDrive size={22} />, "danger", "Penyimpanan sekolah penuh", "Data cabang belum tersedia. Muat ulang halaman lalu coba lagi.")}
        <div className="modal-actions"><button type="button" className="button-primary" onClick={onClose}>Tutup</button></div>
      </>
    );
  } else if (step === "reset") {
    content = (
      <>
        {header(<Trash2 size={22} />, "warning", "Kosongkan ruang", "Pilih foto yang mau dihapus. Datanya tetap tersimpan, hanya fotonya yang dihapus.", false)}
        <div className="storage-full-dialog__form">
          <label htmlFor="storage-reset-category">Kategori</label>
          <select id="storage-reset-category" value={category} disabled={busy} onChange={event => setCategory(event.target.value)}>
            {resettable.map(row => <option key={row.category} value={row.category}>{categoryLabel(row.category)} · {formatBytes(row.used_bytes)}</option>)}
          </select>
          <label htmlFor="storage-reset-class">Kelas</label>
          <select id="storage-reset-class" value={classId} disabled={busy} onChange={event => setClassId(event.target.value)}>
            <option value="">Semua kelas</option>
            {(usage?.by_class ?? []).map(row => <option key={row.class_id} value={row.class_id}>{row.class_name}</option>)}
          </select>
        </div>
        <div className="storage-full-dialog__estimate" aria-live="polite">
          <small>Perkiraan ruang yang kosong</small>
          {estimating ? <strong>Menghitung…</strong> : estimate ? (
            <>
              <strong>{formatBytes(estimate.bytes)} · {estimate.files.toLocaleString("id-ID")} foto</strong>
              {capacity !== null && <small>Penyimpanan menjadi {formatBytes(Math.max(0, used - estimate.bytes))} dari {formatBytes(capacity)}</small>}
            </>
          ) : <strong>—</strong>}
        </div>
        {(estimateError || actionError) && <p className="storage-full-dialog__error" role="alert">{estimateError || actionError}</p>}
        <div className="modal-actions">
          <button type="button" className="button-secondary" onClick={() => go("home")}>Kembali</button>
          <button type="button" className="button-primary danger-button" disabled={estimating || !estimate || estimate.files === 0} onClick={() => { setPhrase(""); go("reset-confirm"); }}>Lanjut</button>
        </div>
      </>
    );
  } else if (step === "reset-confirm") {
    content = (
      <>
        {header(<AlertTriangle size={22} />, "danger", "Hapus foto ini permanen?",
          `${estimate ? `${estimate.files.toLocaleString("id-ID")} foto (${formatBytes(estimate.bytes)}) ` : ""}akan dihapus dan tidak bisa dikembalikan. Orang tua juga tidak bisa melihatnya lagi.`, false)}
        <div className="storage-full-dialog__safe"><Lock size={14} aria-hidden="true" /> Bukti pembayaran, data siswa, kelas, dan tagihan tetap tersimpan.</div>
        <div className="storage-full-dialog__form">
          <label htmlFor="storage-reset-phrase">Ketik <strong>{RESET_PHRASE}</strong> untuk konfirmasi</label>
          <input id="storage-reset-phrase" autoComplete="off" value={phrase} disabled={busy} onChange={event => setPhrase(event.target.value)} />
        </div>
        {actionError && <p className="storage-full-dialog__error" role="alert">{actionError}</p>}
        <div className="modal-actions">
          <button type="button" className="button-secondary" disabled={busy} onClick={() => go("reset")}>Kembali</button>
          <button type="button" className="button-primary danger-button" disabled={busy || phrase.trim().toUpperCase() !== RESET_PHRASE} onClick={confirmReset}>
            {busy ? "Menghapus…" : "Hapus foto"}
          </button>
        </div>
      </>
    );
  } else if (step === "reset-done") {
    content = (
      <>
        {header(<CheckCircle2 size={22} />, "success", "Foto sedang dihapus", "Penghapusan berjalan di latar belakang. Ruang penyimpanan bertambah bertahap dalam beberapa menit.")}
        <div className="modal-actions">
          <button type="button" className="button-secondary" onClick={onClose}>Tutup</button>
          {failedFiles.length > 0 && <button type="button" className="button-primary" onClick={() => { onCapacityRestored(); onClose(); }}>Coba unggah lagi</button>}
        </div>
      </>
    );
  } else if (step === "buy") {
    content = (
      <>
        {unpaid
          ? header(<PackagePlus size={22} />, "warning", "Lanjutkan pembayaran add-on",
            `Pesanan ${unpaid.purchase.addon_name} (${unpaid.purchase.quantity} paket) belum dibayar. Pilih metode pembayaran untuk melanjutkan, atau batalkan pesanan.`, false)
          : header(<PackagePlus size={22} />, "success", `Beli ${addon?.name ?? "add-on penyimpanan"}`,
            addon?.billing === "recurring" ? "Tagihan bulanan mengikuti periode langganan sekolah." : "Dibayar sekali.", false)}
        {addon ? (
          <>
            {!unpaid && <div className="storage-full-dialog__qty">
              <div>
                <strong>Jumlah paket</strong>
                <small>{capacity !== null && unitBytes ? `Kapasitas menjadi ${formatBytes(capacity + unitBytes * quantity)}` : `Maksimal ${maxQuantity} paket`}</small>
              </div>
              <div className="storage-full-dialog__stepper">
                <button type="button" aria-label="Kurangi paket" disabled={busy || quantity <= 1} onClick={() => setQuantity(value => Math.max(1, value - 1))}><Minus size={16} /></button>
                <span aria-live="polite">{unitBytes ? formatBytes(unitBytes * quantity) : `${quantity} paket`}</span>
                <button type="button" aria-label="Tambah paket" disabled={busy || quantity >= maxQuantity} onClick={() => setQuantity(value => Math.min(maxQuantity, value + 1))}><Plus size={16} /></button>
              </div>
            </div>}
            {quote && (
              <div className="storage-checkout__item">
                <div><strong>{quote.item.title}</strong>{quote.item.detail && <small>{quote.item.detail}</small>}</div>
                <span>{formatRupiah(quote.total)}</span>
              </div>
            )}
            <fieldset className="storage-checkout__channels" disabled={busy || quoting}>
              <legend>Metode pembayaran</legend>
              {quote?.channels.length ? groupChannels(quote.channels).map(group => (
                <div className="storage-checkout__group" key={group.method}>
                  <h3>{group.icon} {group.label}</h3>
                  {group.channels.map(item => (
                    <label key={item.code} className={`storage-checkout__channel${item.code === channelCode ? " is-selected" : ""}`}>
                      <input type="radio" name="storage-addon-channel" value={item.code} checked={item.code === channelCode} onChange={() => { setChannelCode(item.code); setActionError(""); }} />
                      <span className="storage-checkout__name">{item.name}</span>
                      <span className="storage-checkout__fee">{Number(item.transaction_fee) > 0 ? `Biaya ${formatRupiah(item.transaction_fee)}` : "Tanpa biaya"}</span>
                      <strong>{formatRupiah(item.amount)}</strong>
                    </label>
                  ))}
                </div>
              )) : <p className="storage-full-dialog__note">{quoting ? "Memuat metode pembayaran…" : "Belum ada metode pembayaran yang tersedia."}</p>}
            </fieldset>
            {quote && (
              <div className="storage-checkout__summary">
                {quote.lines.map(line => <div key={line.label}><span>{line.label}</span><span>{formatRupiah(line.amount)}</span></div>)}
                <div><span>Total tagihan</span><strong>{formatRupiah(quote.total)}</strong></div>
                <div><span>Biaya transaksi</span><strong>{channel ? formatRupiah(channel.transaction_fee) : "—"}</strong></div>
                <div className="is-total"><span>Total dibayar</span><strong>{formatRupiah(channel?.amount ?? quote.total)}</strong></div>
                {addon.billing === "recurring" && <p>Selanjutnya {formatRupiah(Number(addon.price) * (unpaid?.purchase.quantity ?? quantity))} / bulan + PPN, ditagih bersama langganan.</p>}
              </div>
            )}
          </>
        ) : <p className="storage-full-dialog__note">{loadError || "Add-on penyimpanan belum tersedia."}</p>}
        {(quoteError || actionError) && <p className="storage-full-dialog__error" role="alert">{quoteError || actionError}</p>}
        <div className="modal-actions">
          <button type="button" className="button-secondary" disabled={busy} onClick={() => go("home")}>Kembali</button>
          {unpaid && <button type="button" className="button-secondary storage-full-dialog__cancel" disabled={busy} onClick={cancelOrder}>Batalkan pesanan</button>}
          <button type="button" className="button-primary" disabled={busy || quoting || !channel} onClick={startPurchase}>
            {busy ? "Menyiapkan pembayaran…" : <>Bayar sekarang <ArrowRight size={16} aria-hidden="true" /></>}
          </button>
        </div>
      </>
    );
  } else if (step === "pay" && payment) {
    const link = payment.billing_url || payment.payment_link;
    content = (
      <>
        {paymentEnded
          ? header(<AlertTriangle size={22} />, "danger", "Pembayaran tidak selesai", payment.status === "expired" ? "Batas waktu pembayaran sudah lewat." : "Pembayaran dibatalkan atau gagal.")
          : header(<Clock size={22} />, "warning", "Menunggu pembayaran", `Selesaikan pembayaran sebelum ${formatDateTime(payment.expires_at)}. Status diperbarui otomatis.`)}
        <div className="storage-full-dialog__payment">
          <small>{payment.channel_name} · {payment.invoice_number}</small>
          {payment.payment_code ? (
            <>
              <strong className="storage-full-dialog__code">{payment.payment_code}</strong>
              <button type="button" className="button-secondary" onClick={copyPaymentCode}><Copy size={14} aria-hidden="true" /> {copied ? "Tersalin" : "Salin kode pembayaran"}</button>
            </>
          ) : link ? (
            <a className="button-primary" href={link} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> Buka halaman pembayaran</a>
          ) : null}
          <strong className="storage-full-dialog__amount">{formatRupiah(payment.amount)}</strong>
        </div>
        {!paymentEnded && <p className="storage-full-dialog__note" role="status">Mengecek status pembayaran…</p>}
        <div className="modal-actions">
          {paymentEnded ? (
            <button type="button" className="button-primary" onClick={() => void backToCheckout()}>Coba lagi</button>
          ) : (
            <>
              <button type="button" className="button-secondary" disabled={busy} onClick={abandonPayment}>Batalkan</button>
              <button type="button" className="button-secondary" disabled={busy} onClick={onClose}>Tutup, bayar nanti</button>
            </>
          )}
        </div>
      </>
    );
  } else if (step === "paid") {
    content = (
      <>
        {header(<CheckCircle2 size={22} />, "success", "Pembayaran berhasil",
          usage?.capacity_bytes ? `Kapasitas sekarang ${formatBytes(usage.capacity_bytes)}.` : "Kapasitas penyimpanan sudah bertambah.")}
        <div className="modal-actions">
          <button type="button" className="button-secondary" onClick={onClose}>Tutup</button>
          {failedFiles.length > 0 && <button type="button" className="button-primary" onClick={() => { onCapacityRestored(); onClose(); }}>Unggah {failedFiles.length} file yang tertunda</button>}
        </div>
      </>
    );
  } else {
    content = (
      <>
        {severity === "full"
          ? header(<HardDrive size={22} />, "danger", "Penyimpanan penuh", "Foto dan file baru belum bisa diunggah. Kosongkan ruang atau tambah kapasitas untuk melanjutkan.")
          : severity === "warning"
            ? header(<HardDrive size={22} />, "warning", "Penyimpanan hampir penuh", "Kosongkan ruang atau tambah kapasitas sebelum penyimpanan penuh.")
            : header(<HardDrive size={22} />, "success", "Kelola penyimpanan", "Kosongkan ruang atau tambah kapasitas penyimpanan sekolah.")}
        <Meter used={used} capacity={capacity} requested={requested} severity={severity} />
        {failedNote}
        {loadError && <p className="storage-full-dialog__error" role="alert">{loadError}</p>}
        <div className="storage-full-dialog__options">
          <section className="storage-full-option" aria-labelledby="storage-option-free">
            <header>
              <span className="storage-full-option__icon is-free" aria-hidden="true"><Trash2 size={18} /></span>
              <div>
                <h3 id="storage-option-free">Kosongkan ruang</h3>
                <p>Hapus foto per kategori atau kelas. Datanya tetap ada, hanya fotonya yang dihapus.</p>
              </div>
            </header>
            <ul className="storage-full-option__list" aria-label="Pemakaian per kategori">
              {resettable.slice(0, 3).map(row => (
                <li key={row.category}><span>{categoryLabel(row.category)}</span><small>{row.files.toLocaleString("id-ID")} file · {formatBytes(row.used_bytes)}</small></li>
              ))}
              {protectedRows.map(row => (
                <li key={row.category} className="is-protected"><span><Lock size={12} aria-hidden="true" /> {categoryLabel(row.category)}</span><small>{formatBytes(row.used_bytes)} · dilindungi</small></li>
              ))}
            </ul>
            <div className="storage-full-option__actions">
              <button type="button" className="button-secondary" disabled={!resettable.length} onClick={() => go("reset")}>Pilih yang mau dihapus</button>
            </div>
          </section>
          <section className="storage-full-option is-recommended" aria-labelledby="storage-option-addon">
            <span className="storage-full-option__badge">Disarankan</span>
            <header>
              <span className="storage-full-option__icon is-addon" aria-hidden="true"><PackagePlus size={18} /></span>
              <div>
                <h3 id="storage-option-addon">Tambah kapasitas</h3>
                <p>Semua konten tetap aman. Kapasitas langsung bertambah setelah pembayaran lunas.</p>
              </div>
            </header>
            {addon && (
              <div className="storage-full-option__price">
                <strong>{addon.name}</strong>
                <span>{formatRupiah(addon.price)}<small> {addon.billing === "recurring" ? "/ bulan per paket" : "per paket"}</small></span>
              </div>
            )}
            <div className="storage-full-option__actions">
              <button type="button" className="button-primary" disabled={!addon} onClick={() => { setQuantity(1); go("buy"); }}>{unpaid ? "Lanjutkan pembayaran" : "Beli add-on"}</button>
            </div>
          </section>
        </div>
      </>
    );
  }

  return (
    <dialog ref={dialog} className="modal storage-full-dialog" aria-labelledby="storage-full-title" aria-describedby="storage-full-description" onCancel={event => {
      event.preventDefault();
      if (!busy) onClose();
    }}>
      {content}
    </dialog>
  );
}
