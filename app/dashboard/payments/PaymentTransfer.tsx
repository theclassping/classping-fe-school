"use client";

import { Download, Upload } from "lucide-react";
import { useState } from "react";
import type { Payment } from "./page";
import styles from "./Payments.module.css";

type ImportRow = { invoice_no: string; student_invoice_id: number; amount: string; payment_method: string; status: string };

async function downloadExcel(filename: string, rows: unknown[][]) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("Pembayaran");
  rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF147D64" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns.forEach((column) => { column.width = 24; });
  sheet.getColumn(1).width = rows[0]?.[0] === "No" ? 8 : 28;
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function readExcel(file: File): Promise<string[][]> {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("File Excel tidak memiliki worksheet.");
  if (sheet.rowCount > 501) throw new Error("File maksimal berisi 500 pembayaran.");
  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      if (cell.type === 6) throw new Error("Rumus Excel tidak didukung. Gunakan nilai biasa.");
      values[column - 1] = cell.text.trim();
    });
    if (values.some(Boolean)) rows.push(values);
  });
  return rows;
}

export default function PaymentTransfer({ payments, filteredPayments, disabled, onImported }: {
  payments: Payment[]; filteredPayments: Payment[]; disabled: boolean; onImported: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  async function exportPayments() {
    setExporting(true);
    setExportError("");
    try {
      const data: unknown[][] = [];
      for (const [index, payment] of filteredPayments.entries()) {
        let method = payment.payment_method;
        let verifiedAt = payment.verified_at;
        if (payment.payment_id && (method === undefined || verifiedAt === undefined)) {
          const response = await fetch(`/api/proxy/payments/${payment.payment_id}/`, { credentials: "include", cache: "no-store" });
          if (!response.ok) throw new Error(`Gagal memuat detail pembayaran ${payment.student_name}. Silakan coba lagi.`);
          const body = await response.json();
          const detail = body.data ?? body;
          method = detail.payment_method;
          verifiedAt = detail.verified_at;
        }
        const methods: Record<string, string> = { cash: "Tunai", bank_transfer: "Transfer Bank", qris: "QRIS" };
        data.push([index + 1, payment.invoice_no, payment.student_name, payment.class_name, payment.fee_type_name,
          payment.payment_date || "-", payment.total_amount, payment.status,
          method ? methods[method] ?? method : "-", verifiedAt?.slice(0, 10) || "-"]);
      }
      await downloadExcel("pembayaran.xlsx", [
        ["No", "invoice_no", "Nama Siswa", "Kelas", "Jenis Pembayaran", "Tanggal Bayar", "Jumlah", "Status", "Metode Pembayaran", "Tanggal Verifikasi"],
        ...data,
      ]);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Gagal mengekspor pembayaran.");
    } finally { setExporting(false); }
  }

  async function readFile(file?: File) {
    setRows([]); setMessage("");
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error("Ukuran file maksimal 2 MB.");
      if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error("Gunakan file Excel .xlsx.");
      const [headers, ...data] = await readExcel(file);
      const required = ["invoice_no", "amount", "payment_method", "status"];
      if (!headers || required.some((key) => !headers.includes(key)) || new Set(headers).size !== headers.length) {
        throw new Error("Kolom Excel tidak sesuai. Gunakan template yang tersedia.");
      }
      if (!data.length || data.length > 500) throw new Error("File harus berisi 1–500 pembayaran.");
      const seen = new Set<string>();
      const parsed = data.map((values, index) => {
        const record = Object.fromEntries(headers.map((key, i) => [key, values[i] ?? ""]));
        const fail = (reason: string): never => { throw new Error(`Baris ${index + 2}: ${reason}`); };
        const matches = payments.filter((payment) => payment.invoice_no === record.invoice_no);
        if (!record.invoice_no || !matches.length) fail("Nomor invoice tidak ditemukan di cabang ini.");
        if (matches.length > 1) fail("Nomor invoice tidak unik di cabang ini.");
        const invoice = matches[0];
        const id = invoice.id;
        if (!id || !Number.isSafeInteger(id) || id <= 0) fail("Data invoice tidak memiliki ID yang valid.");
        if (invoice.payment_id || invoice.invoice_status.toLowerCase() === "paid") fail("Invoice sudah memiliki pembayaran atau sudah lunas.");
        if (seen.has(record.invoice_no)) fail("Nomor invoice duplikat.");
        seen.add(record.invoice_no);
        if (!/^\d+(\.\d{1,2})?$/.test(record.amount) || !Number.isFinite(Number(record.amount)) || Number(record.amount) <= 0) fail("Jumlah harus angka positif tanpa pemisah ribuan.");
        if (!["cash", "bank_transfer", "qris"].includes(record.payment_method)) fail("Metode harus cash, bank_transfer, atau qris.");
        if (!["submitted", "completed"].includes(record.status)) fail("Status harus submitted atau completed.");
        return { invoice_no: record.invoice_no, student_invoice_id: id!, amount: record.amount, payment_method: record.payment_method, status: record.status };
      });
      setRows(parsed);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal membaca Excel."); }
  }

  async function save() {
    setBusy(true); setMessage("");
    let count = 0;
    let failure = "";
    try {
      for (const row of rows) {
        const response = await fetch("/api/proxy/payments/", {
          method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ student_invoice_id: row.student_invoice_id, amount: row.amount, payment_method: row.payment_method, status: row.status }),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(`Invoice ${row.invoice_no}: ${typeof body?.detail === "string" ? body.detail : `gagal disimpan (HTTP ${response.status})`}`);
        }
        count++;
      }
    } catch (error) { failure = error instanceof Error ? error.message : "Gagal mengimpor pembayaran."; }
    finally {
      // Clear the preview to prevent accidentally submitting successful rows again.
      setRows([]);
      setMessage(`${count} pembayaran berhasil diimpor.${failure ? `\n${failure}\nProses dihentikan. Muat ulang file yang hanya berisi invoice yang belum berhasil.` : ""}`);
      await onImported();
      setBusy(false);
    }
  }

  return <>
    <div className={styles.transferActions}>
      <button type="button" className="filter-button" disabled={disabled || exporting || !filteredPayments.length} onClick={() => void exportPayments()}><Download aria-hidden="true" /> {exporting ? "Mengekspor…" : "Export Excel"}</button>
      <button type="button" className="filter-button" disabled={disabled} onClick={() => { setOpen(true); setRows([]); setMessage(""); }}><Upload aria-hidden="true" /> Import Excel</button>
    </div>
    {exportError && <p role="alert">{exportError}</p>}
    {open && <div className="modal-overlay"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="import-payment-title" onKeyDown={(event) => { if (event.key === "Escape" && !busy) setOpen(false); }}>
      <div className="modal-header"><div><h2 id="import-payment-title">Import pembayaran</h2><p>Catat pembayaran baru menggunakan file Excel (.xlsx).</p></div><button autoFocus type="button" className="modal-close" aria-label="Tutup import" disabled={busy} onClick={() => setOpen(false)}>×</button></div>
      <div className={styles.importBody}>
        <p>Isi invoice_no pada template dengan nomor invoice dari Export Excel. Invoice harus berasal dari cabang akun ini dan belum memiliki pembayaran. Jumlah ditulis tanpa pemisah ribuan. Import tidak mengubah tanggal pembayaran.</p>
        <button type="button" className="filter-button" disabled={busy} onClick={() => void downloadExcel("template-import-pembayaran.xlsx", [["invoice_no", "amount", "payment_method", "status"]]).catch(() => setMessage("Gagal mengunduh template Excel."))}><Download aria-hidden="true" /> Unduh template</button>
        <label className={styles.field}>File Excel (.xlsx)<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" disabled={busy} onChange={(event) => { void readFile(event.target.files?.[0]); event.target.value = ""; }} /></label>
        {rows.length > 0 && <><p>{rows.length} pembayaran siap diimpor. Periksa data sebelum menyimpan.</p><div className={styles.preview}><table><thead><tr><th>Nomor Invoice</th><th>Jumlah</th><th>Metode</th><th>Status</th></tr></thead><tbody>{rows.map((row) => <tr key={row.invoice_no}><td>{row.invoice_no}</td><td>{row.amount}</td><td>{row.payment_method}</td><td>{row.status}</td></tr>)}</tbody></table></div></>}
        {message && <p className={styles.feedback} role="status">{message}</p>}
      </div>
      <div className="modal-actions"><button type="button" className="button-secondary" disabled={busy} onClick={() => setOpen(false)}>Tutup</button><button type="button" className="button-primary" disabled={busy || !rows.length || disabled} onClick={() => void save()}>{busy ? "Mengimpor…" : "Simpan pembayaran"}</button></div>
    </section></div>}
  </>;
}
