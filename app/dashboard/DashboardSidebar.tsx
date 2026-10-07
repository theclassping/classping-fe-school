"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  School,
  GraduationCap,
  CreditCard,
  ClipboardList,
  Settings,
  Mail,
  X,
} from "lucide-react";
import LogoutButton from "./LogoutButton";

type DashboardSidebarProps = {
  open?: boolean;
  onNavigate?: () => void;
};

const menuItems = [
  // {
  //   label: "Dashboard",
  //   href: "/dashboard",
  //   icon: LayoutDashboard,
  // },
  // {
  //   label: "Users",
  //   href: "/dashboard/users",
  //   icon: Users,
  // },
  // {
  //   label: "Schools",
  //   href: "/dashboard/schools",
  //   icon: School,
  // },
  {
    label: "Data Siswa",
    href: "/dashboard/students",
    icon: GraduationCap,
  },
  // {
  //   label: "Teachers",
  //   href: "/dashboard/teachers",
  //   icon: UserRound,
  // },
  // {
  //   label: "Classes",
  //   href: "/dashboard/classes",
  //   icon: BookOpen,
  // },
  {
    label: "Laporan Aktivitas",
    href: "/dashboard/activities",
    icon: ClipboardList,
  },
  // {
  //   label: "Penilaian",
  //   href: "/dashboard/assessment",
  //   icon: Award,
  // },
  {
    label: "Pembayaran",
    href: "/dashboard/payments",
    icon: CreditCard,
  },
];

export default function DashboardSidebar({ open = false, onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [canManageSettings, setCanManageSettings] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSubject, setContactSubject] = useState("Permintaan bantuan ClassPing");
  const [contactMessage, setContactMessage] = useState("");

  useEffect(() => {
    if (!contactOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setContactOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contactOpen]);

  function openEmailDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const subject = encodeURIComponent(contactSubject);
    const body = encodeURIComponent(contactMessage);
    window.location.href = `mailto:the.class.ping@gmail.com?subject=${subject}&body=${body}`;
  }

  useEffect(() => {
    const controller = new AbortController();
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!controller.signal.aborted) {
          setCanManageSettings(data.user?.role === "STAFF" || data.user?.role === "ADMIN");
        }
      } catch (error) {
        if (!controller.signal.aborted) console.error("Gagal memuat sesi pengguna", error);
      }
    }
    void loadSession();
    return () => controller.abort();
  }, []);

  return (
    <>
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <Link href="/dashboard/profile" className="brand" aria-label="ClassPing home" onClick={onNavigate}>
        <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
        <span>class<span>ping</span></span>
      </Link>

      <nav className="main-nav admin-nav" aria-label="Main navigation">
        <p className="nav-label">MENU UTAMA</p>

        {menuItems.map((item) => {
          const Icon = item.icon;

          const active =
            pathname === item.href ||
            (item.href !== "/dashboard/profile" &&
              pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${active ? "active" : ""}`}
              onClick={onNavigate}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <p className="nav-label">PENGATURAN</p>
         <Link
          href="/dashboard/profile"
          className={`nav-item ${pathname.startsWith("/dashboard/profile") ? "active" : ""}`}
          onClick={onNavigate}
        >
          <School aria-hidden="true" />
          <span>Profil Sekolah</span>
        </Link>
        {canManageSettings && <Link
          href="/dashboard/settings"
          className={`nav-item ${pathname.startsWith("/dashboard/settings") ? "active" : ""}`}
          onClick={onNavigate}
        >
          <Settings aria-hidden="true" />
          <span>Pengaturan</span>
        </Link>}
      </nav>

      <div className="help-card">
        <span className="help-icon">?</span>
        <strong>Butuh bantuan?</strong>
        <p>Tim ClassPing siap membantu Anda.</p>
        <button type="button" onClick={() => {
          setContactSubject("Permintaan bantuan ClassPing");
          setContactMessage("");
          setContactOpen(true);
        }}>Hubungi Kami</button>
      </div>

      <LogoutButton />
    </aside>
    {contactOpen && (
      <div
        className="modal-overlay contact-modal-overlay"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setContactOpen(false);
        }}
      >
        <section className="modal contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-dialog-title" aria-describedby="contact-dialog-description">
          <header className="modal-header">
            <div>
              <h2 id="contact-dialog-title">Hubungi tim ClassPing</h2>
              <p id="contact-dialog-description">Tulis pesan bantuan. Draf akan dibuka di aplikasi email Anda.</p>
            </div>
            <button className="modal-close" type="button" aria-label="Tutup" onClick={() => setContactOpen(false)}>
              <X aria-hidden="true" />
            </button>
          </header>

          <div className="contact-recipient">
            <span>Kepada</span>
            <Mail aria-hidden="true" />
            <strong>the.class.ping@gmail.com</strong>
          </div>

          <form onSubmit={openEmailDraft}>
            <label className="contact-field">
              <span>Subjek</span>
              <input autoFocus value={contactSubject} onChange={(event) => setContactSubject(event.target.value)} required />
            </label>
            <label className="contact-field">
              <span>Pesan</span>
              <textarea value={contactMessage} onChange={(event) => setContactMessage(event.target.value)} placeholder="Jelaskan kendala atau bantuan yang Anda perlukan..." required rows={6} />
            </label>
            <p className="contact-email-note">Draf akan dibuka untuk Anda periksa dan kirim. Pesan tidak dikirim otomatis.</p>
            <div className="modal-actions">
              <button className="button-secondary" type="button" onClick={() => setContactOpen(false)}>Batal</button>
              <button className="button-primary" type="submit"><Mail aria-hidden="true" /> Buka aplikasi email</button>
            </div>
          </form>
        </section>
      </div>
    )}
    </>
  );
}
