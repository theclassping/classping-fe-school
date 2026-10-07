"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState(
    !uid || !token ? "Tautan ini tidak lengkap atau sudah kedaluwarsa. Hubungi administrator sekolah untuk bantuan." : "",
  );
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!uid || !token) {
      setError("Tautan ini tidak lengkap atau sudah kedaluwarsa. Hubungi administrator sekolah untuk bantuan.");
      return;
    }
    if (password !== confirmation) {
      setError("Konfirmasi kata sandi belum sama.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, token, new_password: password }),
      });
      const data = (await response.json()) as { detail?: string; new_password?: string[] };
      if (!response.ok) {
        setError(data.new_password?.[0] || data.detail || "Tautan reset tidak valid atau sudah kedaluwarsa. Hubungi administrator sekolah untuk bantuan.");
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
        <a className="reset-brand" href="/login" aria-label="ClassPing, kembali ke masuk">
          <span className="reset-brand-mark" aria-hidden="true"><span /><span /><span /></span>
          <span>class<span>ping</span></span>
        </a>
        {complete ? (
          <>
            <p className="reset-eyebrow">KATA SANDI DIPERBARUI</p>
            <h1>Kata sandi berhasil diubah</h1>
            <p className="reset-copy">Silakan masuk kembali menggunakan kata sandi baru Anda.</p>
            <Link className="reset-submit" href="/login">Masuk ke ClassPing</Link>
          </>
        ) : (
          <>
            <p className="reset-eyebrow">KEAMANAN AKUN</p>
            <h1>Buat kata sandi baru</h1>
            <p className="reset-copy">Gunakan kata sandi baru untuk melindungi akun ClassPing Anda.</p>
            <form onSubmit={submit}>
              <label htmlFor="newPassword">Kata sandi baru</label>
              <div className="reset-input">
                <LockKeyhole aria-hidden="true" />
                <input id="newPassword" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>{showPassword ? <EyeOff /> : <Eye />}</button>
              </div>
              <label htmlFor="confirmPassword">Konfirmasi kata sandi</label>
              <div className="reset-input">
                <LockKeyhole aria-hidden="true" />
                <input id="confirmPassword" type={showConfirmation ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required />
                <button type="button" onClick={() => setShowConfirmation((value) => !value)} aria-label={showConfirmation ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}>{showConfirmation ? <EyeOff /> : <Eye />}</button>
              </div>
              {error && <p className="reset-error" role="alert">{error}</p>}
              <button className="reset-submit" type="submit" disabled={loading}>{loading ? "Menyimpan…" : "Simpan kata sandi baru"}</button>
            </form>
            <p className="reset-help">Tautan bermasalah? Hubungi administrator sekolah untuk bantuan.</p>
          </>
        )}
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="reset-page"><section className="reset-card" aria-busy="true"><p role="status">Memuat formulir…</p></section></main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
