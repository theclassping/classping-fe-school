"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadCurrentBranch } from "../profile/branchApi";

export type StorageState = { capacity: number; usage: number };

const capacityKeys = ["capacity", "capacity_bytes", "capacity_mb", "capacity_gb", "storage_capacity", "storage_capacity_bytes", "storage_capacity_mb", "storage_capacity_gb", "max_capacity", "max_capacity_bytes", "max_storage", "max_storage_bytes", "max_storage_mb", "max_storage_gb", "storage_limit", "storage_limit_bytes", "storage_limit_mb", "storage_limit_gb", "storage_quota", "storage_quota_bytes"];
const usageKeys = ["used_bytes", "storage_used", "storage_used_bytes", "storage_used_mb", "storage_used_gb", "used_storage", "storage_usage", "storage_usage_bytes", "usage_bytes", "usage_mb", "usage_gb", "total_bytes", "total_size", "used"];

function records(value: unknown): Record<string, unknown>[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  return [record, ...Object.values(record).filter(value => value && typeof value === "object" && !Array.isArray(value)).flatMap(records)];
}

function bytesFrom(source: unknown, keys: string[]) {
  for (const record of records(source)) {
    for (const key of keys) {
      const value = record[key];
      const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
      if (!Number.isFinite(amount) || amount < 0) continue;
      if (key.endsWith("_mb")) return amount * 1024 ** 2;
      if (key.endsWith("_gb")) return amount * 1024 ** 3;
      return amount;
    }
    const candidate = Object.entries(record).find(([key, value]) =>
      typeof value === "number" && Number.isFinite(value) && value >= 0 &&
      (keys === capacityKeys ? /^(?:max_)?capacity(?:_bytes|_mb|_gb)?$|storage.*(capacity|limit|quota|max)|(?:capacity|limit|quota|max).*storage/i : /storage.*(used|usage|size)|(?:used|usage).*storage/i).test(key),
    );
    if (candidate) return candidate[1] as number;
  }
  return null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let amount = bytes / 1024;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit++;
  }
  return `${amount.toLocaleString("id-ID", { maximumFractionDigits: 1 })} ${units[unit]}`;
}

export default function StorageMonitoring() {
  const [storage, setStorage] = useState<StorageState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const branch = await loadCurrentBranch(controller.signal);
        const response = await fetch(`/api/proxy/branches/${branch.id}/storage-usage/`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok) throw new Error("Gagal memuat penggunaan penyimpanan.");
        const usageData: unknown = await response.json();
        const capacity = bytesFrom(branch, capacityKeys) ?? bytesFrom(usageData, capacityKeys);
        if (capacity === null || capacity <= 0) throw new Error("Kapasitas penyimpanan belum tersedia.");
        const usage = bytesFrom(usageData, usageKeys);
        if (usage === null) throw new Error("Data penggunaan penyimpanan belum tersedia.");
        if (!controller.signal.aborted) setStorage({ capacity, usage });
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat data penyimpanan.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [retry]);

  const percentage = storage ? Math.min(100, (storage.usage / storage.capacity) * 100) : 0;
  const severity = percentage >= 98 ? "critical" : percentage >= 80 ? "warning" : "normal";
  const warningMessage = severity === "critical"
    ? "Penyimpanan hampir penuh. Segera hubungi ClassPing untuk menambah kapasitas."
    : severity === "warning"
      ? "Kapasitas hampir penuh. Segera hubungi ClassPing."
      : "";
  const barLabel = storage
    ? `${formatBytes(storage.usage)} terpakai dari ${formatBytes(storage.capacity)} (${Math.round((storage.usage / storage.capacity) * 100)}%)`
    : "Memuat penggunaan penyimpanan";

  return (
    <section className={`storage-monitor${severity !== "normal" ? ` is-${severity}` : ""}`} aria-labelledby="storage-monitor-title">
      <div className="storage-monitor__heading">
        <div>
          <h3 id="storage-monitor-title">Penyimpanan</h3>
          <p>Pemakaian kapasitas penyimpanan cabang saat ini.</p>
        </div>
        {!loading && error && <button type="button" className="secondary-button" onClick={() => setRetry(value => value + 1)}>Coba lagi</button>}
      </div>
      {loading ? <p className="storage-monitor__state" role="status">Memuat data penyimpanan...</p> : error ? (
        <p className="storage-monitor__state" role="alert">{error}</p>
      ) : storage ? (
        <div className="storage-monitor__chart">
          <div className="storage-monitor__labels">
            <span>{formatBytes(storage.usage)} terpakai</span>
            <strong>{formatBytes(storage.capacity)} kapasitas</strong>
          </div>
          <div className="storage-monitor__track" aria-hidden="true">
            <div className={`storage-monitor__fill${severity !== "normal" ? ` is-${severity}` : ""}`} style={{ width: `${percentage}%` }} />
          </div>
          <div className="storage-monitor__footer">
            <small aria-label={barLabel}>{Math.round((storage.usage / storage.capacity) * 100)}% digunakan</small>
            <Link href="/dashboard/storage">Lihat detail</Link>
          </div>
          {warningMessage && <p className={`storage-monitor__warning is-${severity}`} role="status">{warningMessage}</p>}
        </div>
      ) : null}
    </section>
  );
}
