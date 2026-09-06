"use client";

import Link from "next/link";
import { Filter, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
// import { payments, type Payment } from "./paymentData";
export type Payment = {
    student_name: string;
    class_name: string;
    fee_type_name: string;
    invoice_date: string;
    total_amount: string;
    status: string;
};

function paymentSlug(payment: Payment) {
    return payment.student_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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

            setPayments(
                Array.isArray(data)
                    ? data
                    : Array.isArray(data.results)
                        ? data.results
                        : []
            );
        } catch (loadError) {
            console.error(loadError);
            setError("Failed to load payments.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadPayments();
    }, []);

    const classes = Array.from(
        new Set(payments.map((payment) => payment.class_name).filter(Boolean))
    );

    // const filteredPayments = payments.filter((payment) => {
    //     const name = payment.name.toLowerCase();
    //     const searchTerm = search.toLowerCase();

    //     return (
    //         name.includes(searchTerm) &&
    //         (classFilter === "ALL" || payment.className === classFilter)
    //     );
    // });

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
        <main>
            <section className="panel transactions" id="pembayaran">
                <div className="panel-heading transaction-heading">
                    <div>
                        <h2>Pembayaran Terbaru</h2>
                        <p>Transaksi SPP yang baru saja tercatat</p>
                    </div>
                    <span className="text-button">{payments.length} transaksi</span>
                </div>

                <div className="table-tools">
                    <label className="search">
                        <Search aria-hidden="true" />
                        <input type="search" placeholder="Cari nama siswa..." value={search} onChange={(event) => updateSearch(event.target.value)} />
                    </label>
                    <select aria-label="Filter kelas" value={classFilter} onChange={(event) => updateClass(event.target.value)}>
                        <option value="ALL">Semua Kelas</option>
                        {classes.map((className) => <option key={className} value={className}>{className}</option>)}
                    </select>
                    <button type="button" className="filter-button" onClick={() => showToast(`${payments.length} transaksi ditemukan.`)}>
                        <Filter aria-hidden="true" /> Filter
                    </button>
                </div>

                {loading ? (
                    <p className="empty-state">Loading payments...</p>
                ) : error ? (
                    <div className="empty-state">
                        <p>{error}</p>
                        <button type="button" className="button-secondary" onClick={loadPayments}>Try again</button>
                    </div>
                ) : (
                <div className="table-scroll">
                    <table>
                        <thead><tr><th>Nama Siswa</th><th>Kelas</th><th>Jenis Pembayaran</th><th>Tanggal Bayar</th><th>Jumlah</th><th>Status</th><th aria-label="Aksi" /></tr></thead>
                        <tbody>
                            {payments.map((payment) => (
                                <tr key={`${paymentSlug(payment)}-${payment.invoice_date}`}>
                                    <td><div className="student-cell"><strong>{payment.student_name}</strong></div></td>
                                    <td>{payment.class_name}</td><td>{payment.fee_type_name}</td><td>{payment.invoice_date}</td><td><strong>{payment.total_amount}</strong></td>
                                    <td><span className={payment.status === "paid" ? "status-pill" : "status-pending"}>{payment.status}</span></td>
                                    <td>
                                        <div className="student-action-wrap">
                                            <details className="action-menu-details">
                                                <summary className="more-button" aria-label={`Menu untuk ${payment.student_name}`}>
                                                    <span className="vertical-dots" aria-hidden="true"><i /><i /><i /></span>
                                                </summary>
                                                <div className="action-menu">
                                                    <Link className="action-menu-item" href={`/dashboard/payments/view?payment=${paymentSlug(payment)}`}>View</Link>
                                                    <Link className="action-menu-item" href={`/dashboard/payments/edit?payment=${paymentSlug(payment)}`}>Edit</Link>
                                                    <button className="action-menu-item" type="button" onClick={() => setReminder(payment)}>Send Reminder</button>
                                                </div>
                                            </details>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}
                {!loading && !error && payments.length === 0 && <p className="empty-state">Tidak ada siswa yang cocok dengan pencarian.</p>}
                {toast && <p className="settings-save-message" role="status">{toast}</p>}
            </section>

            {reminder && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <div><h2>Ingatkan wali siswa via?</h2><p>Pilih media pengiriman reminder untuk {reminder.student_name}.</p></div>
                            <button type="button" className="modal-close" onClick={() => setReminder(null)}>×</button>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="button-secondary" onClick={() => setReminder(null)}>Batal</button>
                            <button type="button" className="button-secondary" onClick={() => { setReminder(null); showToast("Reminder dikirim melalui email."); }}>Email</button>
                            <button type="button" className="button-primary" onClick={() => { setReminder(null); showToast("Reminder dikirim melalui WhatsApp."); }}>WhatsApp</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
