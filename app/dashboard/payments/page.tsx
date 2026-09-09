"use client";

import { BellRing, Eye, Filter, Pencil, Plus, Search, WalletCards, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { addSchoolNotification } from "../components/school-store";
import styles from "../components/TableActions.module.css";
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
    const [recording, setRecording] = useState(false);
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
        const timer = window.setTimeout(() => void loadPayments(), 0);
        return () => window.clearTimeout(timer);
    }, []);

    const classes = Array.from(
        new Set(payments.map((payment) => payment.class_name).filter(Boolean))
    );

    const filteredPayments = useMemo(() => payments.filter((payment) =>
        payment.student_name.toLowerCase().includes(search.toLowerCase()) &&
        (classFilter === "ALL" || payment.class_name === classFilter)
    ), [classFilter, payments, search]);

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

    function recordPayment(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const payment: Payment = {
            student_name: String(data.get("studentName")),
            class_name: String(data.get("className")),
            fee_type_name: String(data.get("month")),
            invoice_date: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date()),
            total_amount: `Rp ${Number(data.get("amount")).toLocaleString("id-ID")}`,
            status: "paid",
        };
        setPayments((current) => [payment, ...current]);
        setRecording(false);
        showToast("Pembayaran berhasil dicatat.");
        addSchoolNotification({ id: `payment-${Date.now()}`, type: "payment", title: "Pembayaran SPP diterima", message: `Pembayaran ${payment.student_name} untuk ${payment.fee_type_name} telah tercatat lunas.`, href: "/dashboard/payments" });
    }

    return (
        <main id="main">
            <section className="page-heading">
                <div><p className="eyebrow">ADMINISTRASI SEKOLAH</p><h1>Pembayaran</h1><p>Kelola transaksi SPP dan pengingat pembayaran siswa.</p></div>
                <button className="primary-button" type="button" onClick={() => setRecording(true)}><Plus aria-hidden="true" /> Catat Pembayaran</button>
            </section>
            <section className="panel transactions" id="pembayaran">
                <div className="panel-heading transaction-heading">
                    <div>
                        <h2>Pembayaran Terbaru</h2>
                        <p>Transaksi SPP yang baru saja tercatat</p>
                    </div>
                    <span className="text-button">{filteredPayments.length} transaksi</span>
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
                        <thead><tr><th>Nama Siswa</th><th>Kelas</th><th>Jenis Pembayaran</th><th>Tanggal Bayar</th><th>Jumlah</th><th>Status</th><th className={styles.actionHeading}>Aksi</th></tr></thead>
                        <tbody>
                            {filteredPayments.map((payment) => (
                                <tr key={`${paymentSlug(payment)}-${payment.invoice_date}-${payment.fee_type_name}`}>
                                    <td><div className="student-cell"><strong>{payment.student_name}</strong></div></td>
                                    <td>{payment.class_name}</td><td>{payment.fee_type_name}</td><td>{payment.invoice_date}</td><td><strong>{payment.total_amount}</strong></td>
                                    <td><span className={payment.status === "paid" ? "status-pill" : "status-pending"}>{payment.status}</span></td>
                                    <td>
                                        <div className={styles.actions} role="group" aria-label={`Aksi pembayaran ${payment.student_name}`}>
                                            <Link className={styles.actionButton} href={`/dashboard/payments/view?payment=${paymentSlug(payment)}`} aria-label={`Lihat pembayaran ${payment.student_name}`} title="Lihat pembayaran"><Eye aria-hidden="true" /></Link>
                                            <Link className={styles.actionButton} href={`/dashboard/payments/edit?payment=${paymentSlug(payment)}`} aria-label={`Edit pembayaran ${payment.student_name}`} title="Edit pembayaran"><Pencil aria-hidden="true" /></Link>
                                            <button className={styles.actionButton} type="button" onClick={() => setReminder(payment)} aria-label={`Ingatkan pembayaran ${payment.student_name}`} title="Ingatkan pembayaran"><BellRing aria-hidden="true" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )}
                {!loading && !error && filteredPayments.length === 0 && <p className="empty-state">Tidak ada siswa yang cocok dengan pencarian.</p>}
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

            {recording && (
                <div className="modal-overlay" role="presentation">
                    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="recordPaymentTitle">
                        <form onSubmit={recordPayment}>
                            <div className="dialog-heading"><div><span className="dialog-icon"><WalletCards aria-hidden="true" /></span><div><h2 id="recordPaymentTitle">Catat Pembayaran</h2><p>Tambahkan pembayaran SPP siswa.</p></div></div><button className="close-button" type="button" aria-label="Tutup" onClick={() => setRecording(false)}><X aria-hidden="true" /></button></div>
                            <div className="prototype-dialog-fields"><label className="full">Nama siswa<input name="studentName" required placeholder="Contoh: Alya Putri Ramadhani" /></label><label>Kelas<select name="className"><option>A1</option><option>A2</option><option>B1</option><option>B2</option></select></label><label>Bulan SPP<select name="month"><option>September 2026</option><option>Agustus 2026</option><option>Juli 2026</option></select></label><label>Jumlah<input name="amount" type="number" min="1" defaultValue="250000" required /></label><label>Metode<select name="method"><option>Transfer Bank</option><option>QRIS</option><option>Tunai</option></select></label></div>
                            <div className="dialog-actions"><button className="secondary-button" type="button" onClick={() => setRecording(false)}>Batal</button><button className="primary-button" type="submit">Simpan Pembayaran</button></div>
                        </form>
                    </section>
                </div>
            )}
        </main>
    );
}
