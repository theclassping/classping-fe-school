export default function LoginShowcase() {
  return (
    <section className="login-showcase" aria-label="Tentang ClassPing">
      <div className="login-brand">
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>

        <span>
          class<span>ping</span>
        </span>
      </div>

      <div className="showcase-copy">
        <span className="showcase-pill">
          TK HARAPAN BANGSA
        </span>

        <h1>
          Satu tempat untuk mengikuti setiap langkah kecil.
        </h1>

        <p>
          Kelola kegiatan, perkembangan siswa, dan administrasi
          sekolah dengan lebih dekat dan terarah.
        </p>

        <div className="showcase-preview">
          <div className="preview-photo">
            <span>🎨</span>
            <i />
            <i />
          </div>

          <div className="preview-note">
            <span>Aktivitas hari ini</span>
            <strong>Melukis dengan Jari</strong>
            <small>
              Alya belajar mengenal warna baru.
            </small>

            <div>
              <b>AP</b>
              <b>RA</b>
              <b>+6</b>
            </div>
          </div>
        </div>
      </div>

      <p className="showcase-footer">
        © 2026 ClassPing · Tumbuh bersama, setiap hari.
      </p>
    </section>
  );
}