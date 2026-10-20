"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { Download, Eye, EyeOff, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
const router = useRouter();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
event.preventDefault();

setError("");
setLoading(true);

try {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    setError(data.detail || "Invalid email or password");
    return;
  }

  router.push("/dashboard/profile");
  router.refresh();
} catch {
  setError("Unable to connect to server");
} finally {
  setLoading(false);
}

}

  return (
    <main className="login-page">
      <section className="login-showcase">
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>

          <span>
            class<span>ping</span>
          </span>
        </div>

        <div className="showcase-copy">
          <span className="showcase-pill">
            Portal Sekolah
          </span>

          <h1>
            Satu tempat untuk mengikuti setiap langkah kecil.
          </h1>

          <p>
            Kelola kegiatan, perkembangan siswa, dan administrasi
            sekolah dengan lebih dekat dan terarah.
          </p>
        </div>

        <p className="showcase-footer">
          © 2026 ClassPing · Tumbuh bersama, setiap hari.
        </p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <p className="eyebrow">
            SELAMAT DATANG KEMBALI
          </p>

          <h2>Masuk ke ClassPing</h2>

          <p className="login-intro">
            Gunakan akun administrator atau guru untuk melanjutkan
            ke portal sekolah.
          </p>

          <form onSubmit={handleSubmit} className="login-form">
            {error && ( <div className="login-error"> {error} </div> )}
            <label htmlFor="loginEmail">
              Alamat email
            </label>

            <div className="login-input">
              <input
                id="loginEmail"
                name="email"
                type="email"
                value={email} 
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@email.com"
                required
              />
            </div>

            <label htmlFor="loginPassword">
              Kata sandi
            </label>

            <div className="login-input">
              <input
                id="loginPassword"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password} 
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan kata sandi"
                required
              />
              <button
                type="button"
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                aria-pressed={showPassword}
                aria-controls="loginPassword"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>

            <p className="reset-help"><Link href="/forgot-password">Lupa kata sandi?</Link></p>

            <button
              className="primary-button login-submit"
              type="submit"
              disabled={loading}
            >
              Masuk
              {loading ? "..." : ""}
            </button>
          </form>

          <a
            className="login-guide"
            href="/panduan/panduan-portal-sekolah.pdf"
            target="_blank"
            rel="noopener"
          >
            <FileText aria-hidden="true" />
            <span>
              <strong>Panduan pengguna</strong>
              <small>Cara menggunakan portal sekolah (PDF)</small>
            </span>
            <Download aria-hidden="true" />
          </a>
        </div>
      </section>
    </main>
  );
}
