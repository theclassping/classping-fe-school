"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setComplete(false);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { detail?: string; email?: string[] };
      if (!response.ok) {
        setError(data.email?.[0] || data.detail || "Permintaan tidak dapat diproses.");
      } else {
        setComplete(true);
      }
    } catch {
      setError("Tidak dapat terhubung ke server. Silakan coba kembali.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="reset-page">
      <section className="reset-card">
        <Link className="reset-brand" href="/login" aria-label="ClassPing, kembali ke masuk">
          <span className="reset-brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span>class<span>ping</span></span>
        </Link>
        <p className="reset-eyebrow">PEMULIHAN AKUN</p>
        <h1>Lupa kata sandi?</h1>
        <p className="reset-copy">Masukkan email yang terdaftar untuk meminta tautan pemulihan akun.</p>
        <form onSubmit={submit} aria-busy={loading}>
          <label htmlFor="recoveryEmail">Alamat email</label>
          <div className="reset-input">
            <Mail aria-hidden="true" />
            <input id="recoveryEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          </div>
          {error && <p className="reset-error" role="alert">{error}</p>}
          {complete && <p className="reset-help" role="status">Jika akun terdaftar, tautan pemulihan telah dikirim ke email Anda.</p>}
          <button className="reset-submit" type="submit" disabled={loading}>{loading ? "Mengirim…" : "Kirim tautan pemulihan"}</button>
        </form>
        <p className="reset-help"><Link href="/login">Kembali ke halaman masuk</Link></p>
      </section>
    </main>
  );
}
