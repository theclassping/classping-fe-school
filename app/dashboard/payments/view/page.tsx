"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getPayment, type Payment } from "../paymentData";

export default function PaymentViewPage() {
    const [payment, setPayment] = useState<Payment>(getPayment(null));

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setPayment(getPayment(new URLSearchParams(window.location.search).get("payment")));
        }, 0);
        return () => window.clearTimeout(timer);
    }, []);

    return (
        <main>
            <section className="panel student-manage">
                <div className="panel-heading">
                    <div><h2>Detail Pembayaran</h2><p>Riwayat dan status pelunasan SPP siswa</p></div>
                    <Link className="secondary-button" href="/dashboard/payments">Kembali</Link>
                </div>
                <div className="student-detail-layout" style={{ padding: "0 22px 20px" }}>
                    <div className="panel detail-panel">
                        <div className="detail-header"><span className="detail-avatar">{payment.initials}</span><div className="detail-meta"><h2>{payment.name}</h2><p>{payment.className} · {payment.month}</p></div></div>
                        <div className="detail-grid">
                            <div className="detail-item"><span>No. Transaksi</span><strong>{payment.invoice}</strong></div>
                            <div className="detail-item"><span>Jumlah</span><strong>{payment.amount}</strong></div>
                            <div className="detail-item"><span>Tanggal Bayar</span><strong>{payment.date}</strong></div>
                            <div className="detail-item"><span>Status</span><strong><span className="status-badge">Lunas</span></strong></div>
                            <div className="detail-item"><span>Wali Murid</span><strong>{payment.guardian}</strong></div>
                            <div className="detail-item"><span>Kontak</span><strong>{payment.phone}</strong></div>
                            <div className="detail-item"><span>Metode</span><strong>{payment.method}</strong></div>
                            <div className="detail-item"><span>Catatan</span><strong>{payment.note}</strong></div>
                        </div>
                    </div>
                    <div className="side-note"><div className="info-card"><h3>Ringkasan</h3><div className="info-list"><div><span>Kelas</span><strong>{payment.className}</strong></div><div><span>Periode</span><strong>{payment.month}</strong></div><div><span>Riwayat</span><strong>{payment.history}</strong></div></div></div><div className="warning-box"><h3>Catatan</h3><p>{payment.note}. Tidak ada tunggakan pada periode berjalan.</p></div></div>
                </div>
            </section>
        </main>
    );
}
