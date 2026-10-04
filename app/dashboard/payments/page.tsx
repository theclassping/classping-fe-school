"use client";

import {
  BellRing,
  Eye,
  Filter,
  Pencil,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "../components/TableActions.module.css";
export type Payment = {
  id?: number;
  payment_id?: number;
  student_name: string;
  class_name: string;
  fee_type_name: string;
  invoice_date: string;
  total_amount: string;
  status: string;
  invoice_status: string;
};

type StudentInvoice = {
  id?: number;
  invoice_no?: string;
  student_name?: string;
  class_name?: string;
  fee_type?: { name?: string };
  invoice_date?: string;
  total_amount?: string;
  status?: string;
  payment?: {
    id?: number;
    amount?: string;
    status?: string;
    submitted_at?: string;
  };
};

function normalizePayment(invoice: StudentInvoice): Payment {
  return {
    id: invoice.id,
    payment_id: invoice.payment?.id,
    student_name: invoice.student_name ?? "-",
    class_name: invoice.class_name ?? "-",
    fee_type_name: invoice.fee_type?.name ?? invoice.invoice_no ?? "-",
    invoice_date: invoice.invoice_date ?? "-",
    total_amount: invoice.total_amount ?? invoice.payment?.amount ?? "-",
    status: invoice.payment?.status ?? invoice.status ?? "-",
    invoice_status: invoice.status ?? "-",
  };
}

function paymentSlug(payment: Payment) {
  return payment.student_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function isCompletedPayment(payment: Payment) {
  return payment.status.trim().toLowerCase() === "completed";
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [reminder, setReminder] = useState<Payment | null>(null);
  const [toast, setToast] = useState("");

  async function loadPayments() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/proxy/student-invoices/", {
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load payments");
      }

      const data = await response.json();

      const invoices: StudentInvoice[] = Array.isArray(data)
        ? data
        : Array.isArray(data.results)
          ? data.results
          : [];
      setPayments(invoices.map(normalizePayment));
    } catch (loadError) {
      console.error(loadError);
      setError("Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPayments(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const classes = Array.from(
    new Set(payments.map((payment) => payment.class_name).filter(Boolean)),
  );

  const filteredPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          payment.student_name.toLowerCase().includes(search.toLowerCase()) &&
          (classFilter === "ALL" || payment.class_name === classFilter),
      ),
    [classFilter, payments, search],
  );

  function updateSearch(value: string) {
    setSearch(value);
  }

  function updateClass(value: string) {
    setClassFilter(value);
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  }

  return (
    <main id="main">
      <section className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRASI SEKOLAH</p>
          <h1>Pembayaran</h1>
          <p>Kelola transaksi SPP dan pengingat pembayaran siswa.</p>
        </div>
        {/* <Link className="primary-button" href="/dashboard/payments/add">
          <Plus aria-hidden="true" /> Catat Pembayaran
        </Link> */}
      </section>
      <section className="panel transactions" id="pembayaran">
        <div className="panel-heading transaction-heading">
          <div>
            <h2>Pembayaran Terbaru</h2>
            <p>Transaksi SPP yang baru saja tercatat</p>
          </div>
          <span className="text-button">
            {filteredPayments.length} transaksi
          </span>
        </div>

        <div className="table-tools">
          <label className="search">
            <Search aria-hidden="true" />
            <input
              type="search"
              placeholder="Cari nama siswa..."
              value={search}
              onChange={(event) => updateSearch(event.target.value)}
            />
          </label>
          <select
            aria-label="Filter kelas"
            value={classFilter}
            onChange={(event) => updateClass(event.target.value)}
          >
            <option value="ALL">Semua Kelas</option>
            {classes.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="filter-button"
            onClick={() => showToast(`${payments.length} transaksi ditemukan.`)}
          >
            <Filter aria-hidden="true" /> Filter
          </button>
        </div>

        {loading ? (
          <p className="empty-state">Loading payments...</p>
        ) : error ? (
          <div className="empty-state">
            <p>{error}</p>
            <button
              type="button"
              className="button-secondary"
              onClick={loadPayments}
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Nama Siswa</th>
                  <th>Kelas</th>
                  <th>Jenis Pembayaran</th>
                  <th>Tanggal Bayar</th>
                  <th>Jumlah</th>
                  <th>Status</th>
                  <th className={styles.actionHeading}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr
                    key={`${paymentSlug(payment)}-${payment.invoice_date}-${payment.fee_type_name}`}
                  >
                    <td>
                      <div className="student-cell">
                        <strong>{payment.student_name}</strong>
                      </div>
                    </td>
                    <td>{payment.class_name}</td>
                    <td>{payment.fee_type_name}</td>
                    <td>{payment.invoice_date}</td>
                    <td>
                      <strong>{payment.total_amount}</strong>
                    </td>
                    <td>
                      <span
                        className={
                          payment.status === "completed"
                            ? "status-pill"
                            : "status-pending"
                        }
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td>
                      <div
                        className={styles.actions}
                        role="group"
                        aria-label={`Aksi pembayaran ${payment.student_name}`}
                      >
                        <Link
                          className={styles.actionButton}
                          href={`/dashboard/payments/view?payment=${payment.payment_id ?? payment.id ?? ""}`}
                          aria-label={`Lihat pembayaran ${payment.student_name}`}
                          title="Lihat pembayaran"
                        >
                          <Eye aria-hidden="true" />
                        </Link>
                        {payment.invoice_status.trim().toLowerCase() === "paid" || payment.status === "completed" ? (
                          <button
                            className={styles.actionButton}
                            type="button"
                            disabled
                            aria-label={`Pembayaran ${payment.student_name} sudah lunas dan tidak dapat diedit`}
                            title="Pembayaran yang sudah lunas tidak dapat diedit"
                          >
                            <Pencil aria-hidden="true" />
                          </button>
                        ) : (
                          <Link
                            className={styles.actionButton}
                            href={
                              payment.payment_id
                                ? `/dashboard/payments/edit?payment=${payment.payment_id}`
                                : `/dashboard/payments/edit?invoice=${payment.id ?? ""}`
                            }
                            aria-label={`Edit pembayaran ${payment.student_name}`}
                            title="Edit pembayaran"
                          >
                            <Pencil aria-hidden="true" />
                          </Link>
                        )}
                        <button
                          className={styles.actionButton}
                          type="button"
                          disabled={isCompletedPayment(payment)}
                          onClick={() => setReminder(payment)}
                          aria-label={
                            isCompletedPayment(payment)
                              ? `Pembayaran ${payment.student_name} sudah lunas`
                              : `Ingatkan pembayaran ${payment.student_name}`
                          }
                          title={
                            isCompletedPayment(payment)
                              ? "Pembayaran sudah lunas"
                              : "Ingatkan pembayaran"
                          }
                        >
                          <BellRing aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && filteredPayments.length === 0 && (
          <p className="empty-state">
            Tidak ada siswa yang cocok dengan pencarian.
          </p>
        )}
        {toast && (
          <p className="settings-save-message" role="status">
            {toast}
          </p>
        )}
      </section>

      {reminder && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>Ingatkan wali siswa via?</h2>
                <p>
                  Pilih media pengiriman reminder untuk {reminder.student_name}.
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setReminder(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="button-secondary"
                onClick={() => setReminder(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  setReminder(null);
                  showToast("Reminder dikirim melalui email.");
                }}
              >
                Email
              </button>
              <button
                type="button"
                className="button-primary"
                onClick={() => {
                  setReminder(null);
                  showToast("Reminder dikirim melalui WhatsApp.");
                }}
              >
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
