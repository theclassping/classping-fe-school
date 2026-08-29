"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Data Siswa", href: "/students" },
  { label: "Laporan Aktivitas", href: "/activities" },
  { label: "Penilaian", href: "/assessments" },
  { label: "Pembayaran", href: "/payments" },
  { label: "Laporan", href: "/reports" },
];

const settingItems = [
  { label: "Profil Sekolah", href: "/school-profile" },
  { label: "Pengaturan", href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <Link href="/dashboard" className="brand">
        <span className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>

        <span>
          class<span>ping</span>
        </span>
      </Link>

      <nav className="main-nav">
        <p className="nav-label">MENU UTAMA</p>

        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${
              pathname === item.href ? "active" : ""
            }`}
          >
            {item.label}

            {item.href === "/payments" && (
              <span className="nav-badge">8</span>
            )}
          </Link>
        ))}

        <p className="nav-label">PENGATURAN</p>

        {settingItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${
              pathname === item.href ? "active" : ""
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="help-card">
        <span className="help-icon">?</span>

        <strong>Butuh bantuan?</strong>

        <p>Tim ClassPing siap membantu Anda.</p>

        <button type="button">Hubungi Kami</button>
      </div>

      <button className="logout" type="button">
        Keluar
      </button>
    </aside>
  );
}