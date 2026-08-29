"use client";

export default function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-school">
        <span className="school-avatar">TK</span>

        <div>
          <strong>TK Harapan Bangsa</strong>
          <small>Tahun Ajaran 2026/2027</small>
        </div>
      </div>

      <div className="topbar-actions">
        <button className="view-switch" type="button">
          Lihat sebagai Orang Tua
        </button>

        <button
          className="icon-button"
          type="button"
          aria-label="Notifikasi"
        >
          🔔
        </button>

        <div className="profile">
          <span className="profile-avatar">AS</span>

          <div>
            <strong>Andini Sari</strong>
            <small>Administrator</small>
          </div>

          <span>⌄</span>
        </div>
      </div>
    </header>
  );
}