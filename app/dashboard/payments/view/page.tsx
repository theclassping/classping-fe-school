"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";

type PaymentProof = {
  id: number;
  payment_id: number;
  image_data: unknown;
  image_url?: string;
  uploaded_at: string;
};

function proofImageData(proof: PaymentProof): string {
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

function isProofImage(value: string) {
  return value.startsWith("http") || value.startsWith("data:image/") || value.startsWith("blob:");
}

type PaymentDetail = {
  id: number;
  student_invoice_id: number;
  invoice_no: string;
  student_name: string;
  amount: string;
  payment_method: string;
  status: string;
  submitted_at: string | null;
  paid_at: string | null;
  verified_at: string | null;
  verified_by_id: number | null;
  verified_by: string | null;
  rejection_reason: string | null;
  proofs: PaymentProof[];
  created_at: string;
  updated_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatAmount(value: string) {
  const amount = Number(value);
  return Number.isNaN(amount) ? value : `Rp ${amount.toLocaleString("id-ID")}`;
}

export default function PaymentViewPage() {
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProof, setSelectedProof] = useState<{ src: string; alt: string } | null>(null);
  const [proofZoom, setProofZoom] = useState(1);

  useEffect(() => {
    if (!selectedProof) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedProof(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedProof]);

  useEffect(() => {
    const paymentId = new URLSearchParams(window.location.search).get(
      "payment",
    );
    const controller = new AbortController();

    async function loadPayment() {
      if (!paymentId || !/^\d+$/.test(paymentId)) {
        setError("Payment ID is missing or invalid.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/proxy/payments/${paymentId}/`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok) throw new Error("Failed to load payment details.");

        const data = await response.json();
        setPayment(data.data ?? data);
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }
        console.error(loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load payment details.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadPayment();
    return () => controller.abort();
  }, []);

  return (
    <>
    <main>
      <section className="panel student-manage">
        <div className="panel-heading">
          <div>
            <h2>Detail Pembayaran</h2>
            <p>Riwayat dan status pelunasan SPP siswa</p>
          </div>
          <Link className="secondary-button" href="/dashboard/payments">
            Kembali
          </Link>
        </div>

        {loading ? (
          <p className="empty-state">Loading payment details...</p>
        ) : error ? (
          <div className="empty-state">
            <p>{error}</p>
          </div>
        ) : payment ? (
          <div className="student-detail-layout payment-detail-layout">
            <div className="panel detail-panel payment-detail-panel">
              <div className="detail-header">
                <span className="detail-avatar">
                  {payment.student_name
                    .split(" ")
                    .map((name) => name[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <div className="detail-meta">
                  <h2>{payment.student_name}</h2>
                  <p>{payment.invoice_no}</p>
                </div>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <span>No. Invoice</span>
                  <strong>{payment.invoice_no}</strong>
                </div>
                <div className="detail-item">
                  <span>Jumlah</span>
                  <strong>{formatAmount(payment.amount)}</strong>
                </div>
                <div className="detail-item">
                  <span>Metode Pembayaran</span>
                  <strong>{payment.payment_method}</strong>
                </div>
                <div className="detail-item">
                  <span>Status</span>
                  <strong>
                    <span className="status-badge">{payment.status}</span>
                  </strong>
                </div>
                <div className="detail-item">
                  <span>Submitted</span>
                  <strong>{formatDate(payment.submitted_at)}</strong>
                </div>
                <div className="detail-item">
                  <span>Paid</span>
                  <strong>{formatDate(payment.paid_at)}</strong>
                </div>
                <div className="detail-item">
                  <span>Verified</span>
                  <strong>{formatDate(payment.verified_at)}</strong>
                </div>
                <div className="detail-item">
                  <span>Verified By</span>
                  <strong>{payment.verified_by ?? "-"}</strong>
                </div>
                <div className="detail-item">
                  <span>Rejection Reason</span>
                  <strong>{payment.rejection_reason ?? "-"}</strong>
                </div>
              </div>

              <div className="payment-proofs">
                <h3>Payment Proofs</h3>
                {payment.proofs.length === 0 ? (
                  <p>No payment proofs uploaded.</p>
                ) : (
                  payment.proofs.map((proof) => {
                    const image = proofImageData(proof);
                    const hasImage = isProofImage(image);
                    return (
                      <div className="payment-proof" key={proof.id}>
                        {hasImage && (
                        <button
                          className="payment-proof-preview"
                          type="button"
                          aria-label={`View payment proof ${proof.id} larger`}
                          onClick={() => {
                            setSelectedProof({ src: image, alt: `Payment proof ${proof.id}` });
                            setProofZoom(1);
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image} alt={`Payment proof ${proof.id}`} />
                          <span>Click to enlarge</span>
                        </button>
                        )}
                        <div className="payment-proof-meta">
                          <strong>Proof #{proof.id}</strong>
                          <p>Uploaded {formatDate(proof.uploaded_at)}</p>
                          {!hasImage && <p>{image}</p>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
    {selectedProof && (
      <div
        className="payment-proof-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Payment proof image viewer"
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelectedProof(null);
        }}
      >
        <div className="payment-proof-lightbox__toolbar">
          <strong>{selectedProof.alt}</strong>
          <div className="payment-proof-lightbox__controls">
            <button type="button" aria-label="Zoom out" onClick={() => setProofZoom((zoom) => Math.max(0.5, zoom - 0.25))} disabled={proofZoom <= 0.5}>
              <ZoomOut aria-hidden="true" />
            </button>
            <span aria-live="polite">{Math.round(proofZoom * 100)}%</span>
            <button type="button" aria-label="Zoom in" onClick={() => setProofZoom((zoom) => Math.min(3, zoom + 0.25))} disabled={proofZoom >= 3}>
              <ZoomIn aria-hidden="true" />
            </button>
            <button type="button" aria-label="Reset zoom" onClick={() => setProofZoom(1)} disabled={proofZoom === 1}>
              <RotateCcw aria-hidden="true" />
            </button>
            <button type="button" aria-label="Close image viewer" onClick={() => setSelectedProof(null)}>
              <X aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="payment-proof-lightbox__viewport">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedProof.src}
            alt={selectedProof.alt}
            style={{ transform: `scale(${proofZoom})` }}
          />
        </div>
      </div>
    )}
    </>
  );
}
