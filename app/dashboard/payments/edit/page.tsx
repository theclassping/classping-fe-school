"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getPayment, type Payment } from "../paymentData";

export default function PaymentEditPage() {
    const [payment, setPayment] = useState<Payment>(getPayment(null));
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setPayment(getPayment(new URLSearchParams(window.location.search).get("payment")));
    }, []);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaved(true);
    }

    return (
        <main>
            <section className="panel student-manage">
                <div className="panel-heading"><div><h2>Update Pembayaran</h2><p>Perbarui rincian tagihan dan status pembayaran</p></div><Link className="secondary-button" href="/dashboard/payments">Kembali</Link></div>
                <form className="student-form" onSubmit={handleSubmit}>
                    <h3>Informasi Pembayaran</h3>
                    <div className="form-grid">
                        <div className="field-group"><label htmlFor="paymentStudent">Nama siswa</label><input id="paymentStudent" value={payment.name} onChange={(event) => setPayment({ ...payment, name: event.target.value })} required /></div>
                        <div className="field-group"><label htmlFor="paymentClass">Kelas</label><select id="paymentClass" value={payment.className} onChange={(event) => setPayment({ ...payment, className: event.target.value })}><option>A1</option><option>A2</option><option>B1</option><option>B2</option></select></div>
                        <div className="field-group"><label htmlFor="paymentMonth">Bulan SPP</label><select id="paymentMonth" value={payment.month} onChange={(event) => setPayment({ ...payment, month: event.target.value })}><option>Agustus 2026</option><option>Juli 2026</option><option>Juni 2026</option></select></div>
                        <div className="field-group"><label htmlFor="paymentAmount">Jumlah</label><input id="paymentAmount" value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} required /></div>
                        <div className="field-group"><label htmlFor="paymentDate">Tanggal bayar</label><input id="paymentDate" type="text" value={payment.date} onChange={(event) => setPayment({ ...payment, date: event.target.value })} required /></div>
                        <div className="field-group"><label htmlFor="paymentStatus">Status</label><select id="paymentStatus"><option>Lunas</option><option>Belum Lunas</option><option>Tertunda</option></select></div>
                        <div className="field-group full"><label htmlFor="paymentNote">Catatan</label><textarea id="paymentNote" value={payment.note} onChange={(event) => setPayment({ ...payment, note: event.target.value })} /></div>
                    </div>
                    <div className="student-form-actions"><Link className="secondary-button" href="/dashboard/payments">Batal</Link><button className="primary-button" type="submit">Simpan Perubahan</button></div>
                    {saved && <p className="settings-save-message" role="status">Pembayaran berhasil disimpan.</p>}
                </form>
            </section>
        </main>
    );
}