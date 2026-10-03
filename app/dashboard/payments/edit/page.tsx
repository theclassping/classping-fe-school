"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Proof = { id: number; image_data: unknown; image_url?: string };

function proofImageData(proof: Proof): string {
  if (typeof proof.image_url === "string") return proof.image_url;
  const value = proof.image_data;
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const data = value as {
      image_data?: unknown;
      image_url?: unknown;
      url?: unknown;
      file_key?: unknown;
      object_key?: unknown;
    };
    if (typeof data.image_data === "string") return data.image_data;
    if (typeof data.image_url === "string") return data.image_url;
    if (typeof data.url === "string") return data.url;
    if (typeof data.file_key === "string") return data.file_key;
    if (typeof data.object_key === "string") return data.object_key;
    return JSON.stringify(value);
  }
  return value == null ? "-" : String(value);
}
type PaymentDetail = {
  id: number;
  student_invoice_id: number;
  invoice_no: string;
  student_name: string;
  amount: string;
  payment_method: string;
  status: string;
  proofs?: Proof[];
};
type InvoiceDetail = {
  id: number;
  invoice_no: string;
  student_name: string;
  class_name: string;
  total_amount: string;
  fee_type?: { name?: string };
};
type EditRecord = {
  paymentId: number | null;
  invoiceId: number;
  invoiceNo: string;
  studentName: string;
  className: string;
  feeTypeName: string;
  amount: string;
  paymentMethod: string;
  status: string;
  proofs: Proof[];
};

function unwrap<T>(value: T | { data: T }): T {
  return value && typeof value === "object" && "data" in value
    ? value.data
    : (value as T);
}

async function responseError(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  return typeof data?.detail === "string" ? data.detail : fallback;
}

export default function PaymentEditPage() {
  const router = useRouter();
  const [record, setRecord] = useState<EditRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("payment");
    const invoiceId = params.get("invoice");
    const controller = new AbortController();

    async function load() {
      try {
        if (paymentId && /^\d+$/.test(paymentId)) {
          const response = await fetch(`/api/proxy/payments/${paymentId}/`, {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          });
          if (response.status === 401) return router.push("/login");
          if (!response.ok) {
            throw new Error(await responseError(response, "Gagal memuat pembayaran."));
          }
          const payment = unwrap<PaymentDetail>(await response.json());
          setRecord({
            paymentId: payment.id,
            invoiceId: payment.student_invoice_id,
            invoiceNo: payment.invoice_no,
            studentName: payment.student_name,
            className: "-",
            feeTypeName: "-",
            amount: payment.amount,
            paymentMethod: payment.payment_method,
            status: payment.status,
            proofs: payment.proofs ?? [],
          });
          return;
        }

        if (invoiceId && /^\d+$/.test(invoiceId)) {
          const response = await fetch(`/api/proxy/student-invoices/${invoiceId}/`, {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          });
          if (response.status === 401) return router.push("/login");
          if (!response.ok) {
            throw new Error(await responseError(response, "Gagal memuat invoice."));
          }
          const invoice = unwrap<InvoiceDetail>(await response.json());
          setRecord({
            paymentId: null,
            invoiceId: invoice.id,
            invoiceNo: invoice.invoice_no,
            studentName: invoice.student_name,
            className: invoice.class_name,
            feeTypeName: invoice.fee_type?.name ?? "-",
            amount: invoice.total_amount,
            paymentMethod: "",
            status: "submitted",
            proofs: [],
          });
          return;
        }
        throw new Error("Payment ID atau invoice ID tidak valid.");
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        console.error(loadError);
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat data.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [router]);

  async function uploadProof(file: File) {
    // Keep this flow aligned with activity image uploads: request a presigned
    // URL, upload the file directly, then send the returned file key in the
    // payment payload.
    const response = await fetch("/api/proxy/media/presign", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        content_type: file.type,
        expires_in: 3600,
      }),
    });
    if (!response.ok) throw new Error("Gagal menyiapkan unggahan bukti pembayaran.");
    const upload = (await response.json()) as {
      file_key?: string;
      presigned_url?: string;
    };
    if (!upload.file_key || !upload.presigned_url) {
      throw new Error("URL unggahan bukti pembayaran tidak tersedia.");
    }
    const uploaded = await fetch(upload.presigned_url, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!uploaded.ok) throw new Error("Gagal mengunggah bukti pembayaran.");
    return upload.file_key;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record) return;
    setSubmitting(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const file = form.get("proof");
      const proofKey =
        !record.paymentId && file instanceof File && file.size
          ? await uploadProof(file)
          : null;
      const response = await fetch(
        record.paymentId
          ? `/api/proxy/payments/${record.paymentId}/`
          : "/api/proxy/payments/",
        {
          method: record.paymentId ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_invoice_id: record.invoiceId,
            amount: record.amount,
            payment_method: record.paymentMethod,
            status: record.status,
            ...(proofKey ? { proofs: [{ image_data: proofKey }] } : {}),
          }),
        },
      );
      if (response.status === 401) return router.push("/login");
      if (!response.ok) {
        throw new Error(await responseError(response, "Gagal menyimpan pembayaran."));
      }
      router.push("/dashboard/payments");
      router.refresh();
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error ? submitError.message : "Gagal menyimpan pembayaran.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const update = (values: Partial<EditRecord>) =>
    setRecord((current) => (current ? { ...current, ...values } : current));

  return (
    <main>
      <section className="panel student-manage">
        <div className="panel-heading">
          <div>
            <h2>{record?.paymentId ? "Update Pembayaran" : "Catat Pembayaran"}</h2>
            <p>
              {record?.paymentId
                ? "Perbarui rincian dan bukti pembayaran."
                : "Tambahkan pembayaran dan unggah bukti untuk invoice ini."}
            </p>
          </div>
          <Link className="secondary-button" href="/dashboard/payments">Kembali</Link>
        </div>

        {loading ? (
          <p className="empty-state">Memuat data pembayaran...</p>
        ) : !record ? (
          <div className="empty-state"><p>{error || "Data tidak ditemukan."}</p></div>
        ) : (
          <form className="student-form" onSubmit={submit}>
            <h3>Informasi Pembayaran</h3>
            <div className="form-grid">
              <div className="field-group">
                <label htmlFor="paymentInvoice">Nomor invoice</label>
                <input id="paymentInvoice" value={record.invoiceNo} readOnly />
              </div>
              <div className="field-group">
                <label htmlFor="paymentStudent">Nama siswa</label>
                <input id="paymentStudent" value={record.studentName} readOnly />
              </div>
              {!record.paymentId && (
                <>
                  <div className="field-group">
                    <label htmlFor="paymentClass">Kelas</label>
                    <input id="paymentClass" value={record.className} readOnly />
                  </div>
                  <div className="field-group">
                    <label htmlFor="paymentFeeType">Jenis biaya</label>
                    <input id="paymentFeeType" value={record.feeTypeName} readOnly />
                  </div>
                </>
              )}
              <div className="field-group">
                <label htmlFor="paymentAmount">Jumlah</label>
                <input id="paymentAmount" type="number" min="1" step="0.01"
                  value={record.amount} onChange={(event) => update({ amount: event.target.value })} required />
              </div>
              <div className="field-group">
                <label htmlFor="paymentMethod">Metode pembayaran</label>
                <select id="paymentMethod" value={record.paymentMethod}
                  onChange={(event) => update({ paymentMethod: event.target.value })} required>
                  <option value="">Pilih metode pembayaran</option>
                  <option value="cash">Tunai</option>
                  <option value="bank_transfer">Transfer Bank</option>
                  <option value="qris">QRIS</option>
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="paymentStatus">Status</label>
                <select id="paymentStatus" value={record.status}
                  onChange={(event) => update({ status: event.target.value })} required>
                  {/* <option value="pending">Pending</option> */}
                  <option value="submitted">Submitted</option>
                  {/* <option value="paid">Paid</option> */}
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              {!record.paymentId && (
                <div className="field-group full">
                  <label htmlFor="paymentProof">Bukti pembayaran</label>
                  <input id="paymentProof" name="proof" type="file"
                    accept="image/jpeg,image/png,image/webp" />
                  <small>Format JPG, PNG, atau WebP.</small>
                </div>
              )}
            </div>

            {record.proofs.length > 0 && (
              <div className="payment-proofs">
                <h3>Bukti saat ini</h3>
                {record.proofs.map((proof) => (
                  <div className="payment-proof" key={proof.id}>
                    {proofImageData(proof).startsWith("http") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={proofImageData(proof)} alt={`Bukti pembayaran ${proof.id}`} />
                    ) : <span>{proofImageData(proof)}</span>}
                  </div>
                ))}
              </div>
            )}

            <div className="student-form-actions">
              <Link className="secondary-button" href="/dashboard/payments">Batal</Link>
              <button className="primary-button" type="submit" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Simpan Pembayaran"}
              </button>
            </div>
            {error && <p className="settings-save-message form-error" role="alert">{error}</p>}
          </form>
        )}
      </section>
    </main>
  );
}
