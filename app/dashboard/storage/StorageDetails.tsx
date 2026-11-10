"use client";

import { useEffect, useState } from "react";
import { loadCurrentBranch } from "../profile/branchApi";

type Dimension = "category" | "class";
type Breakdown = { label: string; files: number; bytes: number };
export type StorageDetailsData = { totalFiles: number; usedBytes: number; capacityBytes: number | null; categories: Breakdown[]; classes: Breakdown[] };
const chartColors = ["#0E826E", "#F2A07E", "#4F8AA8", "#E8B64E", "#8B72B5", "#5AA78C", "#D97745", "#7186C4"];

const fileArrays = ["files", "items", "objects", "results"];
const categoryArrays = ["by_category", "category_breakdown", "category_usage", "category_stats", "categories"];
const classArrays = ["by_class", "class_breakdown", "class_usage", "class_stats", "classes"];
const fileCountKeys = ["files", "file_count", "files_count", "total_files", "count", "objects_count"];
const sizeKeys = ["size_bytes", "file_size", "storage_bytes", "used_bytes", "total_bytes", "bytes", "size", "storage_used"];
const capacityKeys = ["capacity", "capacity_bytes", "capacity_mb", "capacity_gb", "storage_capacity", "storage_capacity_bytes", "storage_capacity_mb", "storage_capacity_gb", "max_capacity", "max_capacity_bytes", "max_storage", "max_storage_bytes", "storage_limit", "storage_limit_bytes", "storage_quota"];
const totalUsageKeys = ["used_bytes", "storage_used", "storage_used_bytes", "usage_bytes", "total_bytes", "total_size", "used_storage"];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function allRecords(value: unknown): Record<string, unknown>[] {
  const record = asRecord(value);
  if (!record) return [];
  return [record, ...Object.values(record).flatMap(child => allRecords(child))];
}

function findArray(value: unknown, keys: string[]): unknown[] | null {
  for (const record of allRecords(value)) {
    for (const key of keys) if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return null;
}

function numberValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

function findMetric(source: unknown, keys: string[]) {
  for (const record of allRecords(source)) {
    for (const key of keys) {
      const raw = record[key];
      const value = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
      if (!Number.isFinite(value) || value < 0) continue;
      if (key.endsWith("_mb")) return value * 1024 ** 2;
      if (key.endsWith("_gb")) return value * 1024 ** 3;
      return value;
    }
  }
  return null;
}

function classLabel(record: Record<string, unknown>) {
  const value = record.class_name ?? record.class_label ?? record.class ?? record.name ?? record.label ?? record.title;
  if (typeof value === "string" || typeof value === "number") return String(value);
  const nested = asRecord(value);
  return String(nested?.class_name ?? nested?.name ?? nested?.label ?? nested?.id ?? "");
}

function categoryLabel(record: Record<string, unknown>) {
  const value = record.category_name ?? record.category ?? record.type ?? record.name ?? record.label ?? record.purpose;
  if (typeof value === "string" || typeof value === "number") return String(value);
  const nested = asRecord(value);
  return String(nested?.name ?? nested?.label ?? nested?.id ?? "");
}

function aggregateFiles(files: unknown[], dimension: Dimension): Breakdown[] {
  const groups = new Map<string, Breakdown>();
  for (const item of files) {
    const record = asRecord(item);
    if (!record) continue;
    const label = dimension === "class" ? classLabel(record) : categoryLabel(record);
    if (!label) continue;
    const current = groups.get(label) ?? { label, files: 0, bytes: 0 };
    current.files += 1;
    current.bytes += numberValue(record, sizeKeys) ?? 0;
    groups.set(label, current);
  }
  return [...groups.values()].sort((a, b) => b.bytes - a.bytes || b.files - a.files);
}

function parseBreakdown(source: unknown, dimension: Dimension): Breakdown[] {
  const arrayKeys = dimension === "class" ? classArrays : categoryArrays;
  const rows = findArray(source, arrayKeys);
  if (rows) {
    return rows.flatMap(item => {
      const record = asRecord(item);
      if (!record) return [];
      const label = dimension === "class" ? classLabel(record) : categoryLabel(record);
      return label ? [{ label, files: numberValue(record, fileCountKeys) ?? 0, bytes: numberValue(record, sizeKeys) ?? 0 }] : [];
    }).sort((a, b) => b.bytes - a.bytes || b.files - a.files);
  }
  const files = findArray(source, fileArrays);
  return files ? aggregateFiles(files, dimension) : [];
}

function parseStorageDetails(source: unknown, branch: unknown): StorageDetailsData {
  const totalKeys = ["files", "total_files", "file_count", "files_count", "objects_count"];
  const total = allRecords(source).map(record => numberValue(record, totalKeys)).find(value => value !== null) ?? null;
  const files = findArray(source, fileArrays);
  const categories = parseBreakdown(source, "category");
  const classes = parseBreakdown(source, "class");
  const summedUsage = Math.max(categories.reduce((sum, item) => sum + item.bytes, 0), classes.reduce((sum, item) => sum + item.bytes, 0));
  return {
    totalFiles: total ?? (files?.length ?? Math.max(categories.reduce((sum, item) => sum + item.files, 0), classes.reduce((sum, item) => sum + item.files, 0))),
    usedBytes: findMetric(source, totalUsageKeys) ?? summedUsage,
    capacityBytes: findMetric(source, capacityKeys) ?? findMetric(branch, capacityKeys),
    categories,
    classes,
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let amount = bytes / 1024;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) { amount /= 1024; unit++; }
  return `${amount.toLocaleString("id-ID", { maximumFractionDigits: 1 })} ${units[unit]}`;
}

function PieChart({ title, rows }: { title: string; rows: Breakdown[] }) {
  const totalBytes = rows.reduce((sum, row) => sum + row.bytes, 0);
  const useBytes = totalBytes > 0;
  const total = useBytes ? totalBytes : rows.reduce((sum, row) => sum + row.files, 0);
  let offset = 0;
  const segments = rows.map((row, index) => {
    const amount = useBytes ? row.bytes : row.files;
    const start = total ? offset / total * 360 : 0;
    offset += amount;
    const end = total ? offset / total * 360 : 0;
    return `${chartColors[index % chartColors.length]} ${start}deg ${end}deg`;
  });

  return (
    <section className="storage-pie-card">
      <h2>{title}</h2>
      {rows.length ? (
        <>
          <div className="storage-pie" role="img" aria-label={`Diagram pie ${title}`} style={{ background: `conic-gradient(${segments.join(", ")})` }} />
          <ul className="storage-pie-legend">
            {rows.map((row, index) => (
              <li key={row.label}>
                <i style={{ background: chartColors[index % chartColors.length] }} aria-hidden="true" />
                <span className="storage-pie-legend__label">{row.label}</span>
                <span className="storage-pie-legend__value">{row.files.toLocaleString("id-ID")} file · {formatBytes(row.bytes)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : <p className="storage-details-state">Belum ada data.</p>}
    </section>
  );
}

export default function StorageDetails() {
  const [data, setData] = useState<StorageDetailsData | null>(null);
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
          credentials: "include", cache: "no-store", signal: controller.signal,
        });
        if (response.status === 401) { window.location.href = "/login"; return; }
        if (!response.ok) throw new Error("Gagal memuat detail penyimpanan.");
        const usage = await response.json();
        const parsed = parseStorageDetails(usage, branch);
        if (!controller.signal.aborted) setData(parsed);
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "Gagal memuat detail penyimpanan.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [retry]);

  const usedPercentage = data?.capacityBytes && data.capacityBytes > 0 ? data.usedBytes / data.capacityBytes * 100 : null;
  const storageSeverity = usedPercentage === null ? "normal" : usedPercentage >= 98 ? "critical" : usedPercentage >= 80 ? "warning" : "normal";
  const storageWarning = storageSeverity === "critical"
    ? "Penyimpanan hampir penuh. Segera hubungi ClassPing untuk menambah kapasitas."
    : storageSeverity === "warning"
      ? "Kapasitas hampir penuh. Segera hubungi ClassPing."
      : "";

  return (
    <main className="storage-details-page">
      <section className="panel storage-details-card">
        <header className="storage-details-header">
          <div>
            <p className="eyebrow">Beranda · Penyimpanan</p>
            <h1>Detail penyimpanan</h1>
            <p>Jumlah file dan pemakaian ruang berdasarkan kategori dan kelas.</p>
          </div>
          {!loading && error && <button type="button" className="secondary-button" onClick={() => setRetry(value => value + 1)}>Coba lagi</button>}
        </header>

        {loading ? <p role="status" className="storage-details-state">Memuat detail penyimpanan...</p> : error ? (
          <p role="alert" className="storage-details-state">{error}</p>
        ) : data ? (
          <>
            <div className="storage-details-summary">
              <div className="storage-details-total"><span>Total file</span><strong>{data.totalFiles.toLocaleString("id-ID")}</strong></div>
              <div className="storage-details-total"><span>Kapasitas terpakai</span><strong>{formatBytes(data.usedBytes)}</strong></div>
              <div className="storage-details-total"><span>Kapasitas maksimum</span><strong>{data.capacityBytes === null ? "Belum tersedia" : formatBytes(data.capacityBytes)}</strong></div>
            </div>
            {storageWarning && <p className={`storage-details-warning is-${storageSeverity}`} role="alert">{storageWarning}</p>}
            <div className="storage-pie-grid">
              <PieChart title="Berdasarkan kategori" rows={data.categories} />
              <PieChart title="Berdasarkan kelas" rows={data.classes} />
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
