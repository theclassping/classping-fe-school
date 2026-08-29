"use client";

import { useState } from "react";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setError("");

    if (!email || !password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }

    console.log({
      email,
      password,
    });

    // Later:
    // POST /api/auth/login/
  }

  function useDemoAccount(
    account: "admin" | "teacher"
  ) {
    if (account === "admin") {
      setEmail("admin@classping.id");
      setPassword("password");
    }

    if (account === "teacher") {
      setEmail("nia@classping.id");
      setPassword("password");
    }
  }

  return (
    <section className="login-panel">
      <div className="login-card">
        <div className="mobile-login-brand">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>

          <span>
            class<span>ping</span>
          </span>
        </div>

        <p className="eyebrow">
          SELAMAT DATANG KEMBALI
        </p>

        <h2>Masuk ke ClassPing</h2>

        <p className="login-intro">
          Gunakan akun administrator atau guru untuk
          melanjutkan ke portal sekolah.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="loginEmail">
            Alamat email
          </label>

          <div className="login-input">
            <input
              id="loginEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              placeholder="nama@email.com"
            />
          </div>

          <label htmlFor="loginPassword">
            Kata sandi
          </label>

          <div className="login-input">
            <input
              id="loginPassword"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Masukkan kata sandi"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(!showPassword)
              }
            >
              {showPassword ? "Sembunyikan" : "Lihat"}
            </button>
          </div>

          <div className="login-options">
            <label>
              <input type="checkbox" />
              Ingat saya
            </label>

            <button type="button">
              Lupa kata sandi?
            </button>
          </div>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="primary-button login-submit"
            type="submit"
          >
            Masuk →
          </button>
        </form>

        <div className="demo-divider">
          <span>Akun demo</span>
        </div>

        <div className="demo-accounts">
          <button
            type="button"
            onClick={() => useDemoAccount("admin")}
          >
            <span className="demo-icon admin">
              AS
            </span>

            <span>
              <strong>Administrator</strong>
              <small>admin@classping.id</small>
            </span>

            <span>→</span>
          </button>

          <button
            type="button"
            onClick={() => useDemoAccount("teacher")}
          >
            <span className="demo-icon teacher">
              NR
            </span>

            <span>
              <strong>
                Nia Ramadhani · Guru
              </strong>
              <small>nia@classping.id</small>
            </span>

            <span>→</span>
          </button>
        </div>

        <p className="login-help">
          Mencari akses orang tua?{" "}
          <a href="#">
            Buka ClassPing Guardian
          </a>
        </p>
      </div>
    </section>
  );
}