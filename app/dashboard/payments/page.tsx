"use client";

import {
  BellRing,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Pencil,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadList } from "@/lib/loadList";
import styles from "../components/TableActions.module.css";
import filterStyles from "./Payments.module.css";
import PaymentTransfer from "./PaymentTransfer";
const PAGE_SIZE = 10;
export type Payment = {
  id?: number;
  invoice_no: string;
  payment_id?: number;
  student_name: string;
  class_name: string;
  fee_type_name: string;
  invoice_date: string;
  payment_date: string;
  payment_method?: string | null;
  verified_at?: string | null;
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
    paid_at?: string | null;
    payment_method?: string | null;
    verified_at?: string | null;
  };
};

function normalizePayment(invoice: StudentInvoice): Payment {
  return {
    id: invoice.id,
    invoice_no: invoice.invoice_no ?? "",
    payment_id: invoice.payment?.id,
    student_name: invoice.student_name ?? "-",
    class_name: invoice.class_name ?? "-",
    fee_type_name: invoice.fee_type?.name ?? invoice.invoice_no ?? "-",
    invoice_date: invoice.invoice_date ?? "-",
    payment_date: (invoice.payment?.paid_at || invoice.payment?.submitted_at)?.slice(0, 10) ?? "",
    payment_method: invoice.payment?.payment_method,
    verified_at: invoice.payment?.verified_at,
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [feeTypeFilter, setFeeTypeFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reminder, setReminder] = useState<Payment | null>(null);
  const [toast, setToast] = useState("");
  const [page, setPage] = useState(1);

  async function loadPayments() {
    try {
      setLoading(true);
      setError("");

      const sessionResponse = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });
      if (sessionResponse.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!sessionResponse.ok) throw new Error("Failed to load session.");
      const session = await sessionResponse.json();
      const branchId = session.user?.branch_id;
      if (!Number.isInteger(branchId) || branchId <= 0) {
        setPayments([]);
        setError("Tidak ada cabang sekolah yang terhubung dengan akun Anda.");
        return;
      }
      const invoices = await loadList<StudentInvoice>(`/api/proxy/student-invoices?branch_id=${branchId}`);
      setPayments(invoices.map(normalizePayment));
      setPage(1);
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
  const statuses = Array.from(new Set(payments.map((payment) => payment.status)));
  const feeTypes = Array.from(new Set(payments.map((payment) => payment.fee_type_name)));
  const activeFilterCount = Number(statusFilter !== "ALL") + Number(feeTypeFilter !== "ALL") + Number(!!(dateFrom || dateTo));

  const filteredPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          payment.student_name.toLowerCase().includes(search.toLowerCase()) &&
          (classFilter === "ALL" || payment.class_name === classFilter) &&
          (statusFilter === "ALL" || payment.status === statusFilter) &&
          (feeTypeFilter === "ALL" || payment.fee_type_name === feeTypeFilter) &&
          (!dateFrom || (!!payment.payment_date && payment.payment_date >= dateFrom)) &&
          (!dateTo || (!!payment.payment_date && payment.payment_date <= dateTo)),
      ),
    [classFilter, payments, search, statusFilter, feeTypeFilter, dateFrom, dateTo],
  );

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visiblePayments = filteredPayments.slice(startIndex, startIndex + PAGE_SIZE);

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function updateClass(value: string) {
    setClassFilter(value);
    setPage(1);
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

        <div className={`table-tools ${filterStyles.toolbar}`}>
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
            className={`filter-button ${filtersOpen ? filterStyles.activeToggle : ""}`}
            aria-expanded={filtersOpen}
            aria-controls="payment-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <Filter aria-hidden="true" /> Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
          <PaymentTransfer payments={payments} filteredPayments={filteredPayments} disabled={loading || !!error} onImported={loadPayments} />
        </div>

        {filtersOpen && (
          <div className={filterStyles.panel} id="payment-filters">
            <div className={filterStyles.heading}>
              <strong>Filter pembayaran</strong>
              <span>Daftar diperbarui otomatis saat filter berubah.</span>
            </div>
            <div className={filterStyles.fields}>
            <label className={filterStyles.field}>
              Tanggal bayar dari
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className={filterStyles.field}>
              Sampai tanggal
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label className={filterStyles.field} htmlFor="payment-fee-type-filter">Jenis pembayaran
              <select
                id="payment-fee-type-filter"
                value={feeTypeFilter}
                onChange={(event) => {
                  setFeeTypeFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">Semua Jenis Pembayaran</option>
                {feeTypes.map((feeType) => (
                  <option key={feeType} value={feeType}>{feeType}</option>
                ))}
              </select>
            </label>
            <label className={filterStyles.field} htmlFor="payment-status-filter">Status pembayaran
            <select
              id="payment-status-filter"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Semua Status</option>
              {statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            </label>
            <button
              type="button"
              className={filterStyles.reset}
              disabled={!dateFrom && !dateTo && statusFilter === "ALL" && feeTypeFilter === "ALL" && classFilter === "ALL" && !search}
              onClick={() => {
                setStatusFilter("ALL");
                setFeeTypeFilter("ALL");
                setDateFrom("");
                setDateTo("");
                setClassFilter("ALL");
                setSearch("");
                setPage(1);
              }}
            >
              Reset filter
            </button>
            </div>
          </div>
        )}

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
                {visiblePayments.map((payment) => (
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
                    <td>{payment.payment_date || "-"}</td>
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
        {!loading && !error && filteredPayments.length > 0 && (
          <div className={styles.paginationFooter}>
            <span className={styles.paginationSummary} role="status">
              Menampilkan <strong>{startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredPayments.length)}</strong> dari <strong>{filteredPayments.length}</strong> transaksi
            </span>
            <nav className={styles.paginationControls} aria-label="Halaman pembayaran">
              <button className={styles.paginationButton} type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                <ChevronLeft aria-hidden="true" /> Sebelumnya
              </button>
              <span className={styles.pageIndicator} aria-live="polite">Halaman <strong>{currentPage}</strong> dari {totalPages}</span>
              <button className={styles.paginationButton} type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
                Berikutnya <ChevronRight aria-hidden="true" />
              </button>
            </nav>
          </div>
        )}
        {!loading && !error && filteredPayments.length === 0 && (
          <p className="empty-state">
            Tidak ada pembayaran yang cocok dengan pencarian atau filter.
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
