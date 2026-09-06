"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, Pencil, Upload, WalletCards, Clock3, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  defaultSchoolProfile,
  getInitials,
  loadSchoolNotifications,
  loadSchoolProfile,
  saveSchoolNotifications,
  saveSchoolProfile,
  schoolStoreEvent,
  type SchoolNotification,
  type SchoolProfile,
} from "./school-store";

type SchoolHeaderProps = {
  onMenuClick: () => void;
};

const notificationIcons = {
  upload: Upload,
  payment: WalletCards,
  hours: Clock3,
};

export default function SchoolHeader({ onMenuClick }: SchoolHeaderProps) {
  const router = useRouter();
  const actionsRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<SchoolProfile>(defaultSchoolProfile);
  const [notifications, setNotifications] = useState<SchoolNotification[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setProfile(loadSchoolProfile());
      setNotifications(loadSchoolNotifications());
    };
    const timer = window.setTimeout(refresh, 0);
    window.addEventListener(schoolStoreEvent, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(schoolStoreEvent, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setNotificationsOpen(false);
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const unreadCount = notifications.filter((item) => !item.read).length;

  function markAllRead() {
    saveSchoolNotifications(notifications.map((item) => ({ ...item, read: true })));
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextProfile: SchoolProfile = {
      ...profile,
      name: String(data.get("name") || profile.name).trim(),
      email: String(data.get("email") || profile.email).trim().toLowerCase(),
      phone: String(data.get("phone") || "").trim(),
    };
    saveSchoolProfile(nextProfile);
    setProfile(nextProfile);
    setEditing(false);
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <>
      <header className="topbar">
        <button className="mobile-menu" type="button" aria-label="Buka menu" onClick={onMenuClick}>
          <Menu aria-hidden="true" />
        </button>
        <div className="topbar-school">
          <span className="school-avatar">TK</span>
          <div><strong>TK Harapan Bangsa</strong><small>Tahun Ajaran 2026/2027</small></div>
        </div>
        <div className="topbar-actions" ref={actionsRef}>
          <button
            className="icon-button"
            type="button"
            aria-label={`Notifikasi, ${unreadCount} belum dibaca`}
            aria-expanded={notificationsOpen}
            aria-haspopup="true"
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setProfileOpen(false);
            }}
          >
            <Bell aria-hidden="true" />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
          <button
            className="profile profile-button"
            type="button"
            aria-label="Buka menu profil"
            aria-expanded={profileOpen}
            aria-haspopup="true"
            onClick={() => {
              setProfileOpen((open) => !open);
              setNotificationsOpen(false);
            }}
          >
            <span className="profile-avatar">{getInitials(profile.name)}</span>
            <span className="profile-copy"><strong>{profile.name}</strong><small>{profile.role}</small></span>
            <ChevronDown aria-hidden="true" />
          </button>

          {notificationsOpen && (
            <section className="school-notification-panel" aria-label="Daftar notifikasi">
              <header>
                <span><strong>Notifikasi</strong><span>{unreadCount} belum dibaca</span></span>
                {unreadCount > 0 && <button type="button" onClick={markAllRead}>Tandai dibaca</button>}
              </header>
              <div className="school-notification-list">
                {notifications.length ? notifications.map((notification) => {
                  const Icon = notificationIcons[notification.type];
                  return (
                    <Link key={notification.id} className={`school-notification-item ${notification.read ? "" : "unread"}`} href={notification.href}>
                      <span className={`school-notification-icon ${notification.type}`}><Icon aria-hidden="true" /></span>
                      <span><strong>{notification.title}</strong><small>{notification.message}</small><time>{notification.time}</time></span>
                    </Link>
                  );
                }) : <p className="school-notification-empty">Belum ada notifikasi.</p>}
              </div>
            </section>
          )}

          {profileOpen && (
            <section className="school-profile-menu" role="menu" aria-label="Menu profil pengguna">
              <div className="school-profile-menu__head">
                <span className="profile-avatar">{getInitials(profile.name)}</span>
                <div><strong>{profile.name}</strong><small>{profile.role}</small><span>{profile.email}</span></div>
              </div>
              <button type="button" role="menuitem" onClick={() => { setProfileOpen(false); setEditing(true); }}>
                <span><Pencil aria-hidden="true" /></span><span><strong>Edit profil</strong><small>Ubah nama dan informasi akun</small></span>
              </button>
              <button type="button" role="menuitem" className="danger" onClick={logout} disabled={loggingOut}>
                <span><LogOut aria-hidden="true" /></span><span><strong>{loggingOut ? "Keluar…" : "Keluar"}</strong><small>Akhiri sesi di perangkat ini</small></span>
              </button>
            </section>
          )}
        </div>
      </header>

      {editing && (
        <div className="modal-overlay school-profile-overlay" role="presentation">
          <section className="modal school-profile-dialog-react" role="dialog" aria-modal="true" aria-labelledby="editProfileTitle">
            <form onSubmit={saveProfile}>
              <div className="dialog-heading">
                <div><span className="dialog-icon"><Pencil aria-hidden="true" /></span><div><h2 id="editProfileTitle">Edit Profil</h2><p>Perbarui informasi pengguna portal sekolah.</p></div></div>
                <button className="close-button" type="button" aria-label="Tutup" onClick={() => setEditing(false)}><X aria-hidden="true" /></button>
              </div>
              <div className="school-profile-dialog__identity"><span className="profile-avatar">{getInitials(profile.name)}</span><div><strong>{profile.name}</strong><small>{profile.role}</small></div></div>
              <label>Nama lengkap<input name="name" type="text" defaultValue={profile.name} required maxLength={80} /></label>
              <label>Email akun<input name="email" type="email" defaultValue={profile.email} required maxLength={120} /></label>
              <label>Nomor WhatsApp<input name="phone" type="tel" defaultValue={profile.phone} maxLength={24} /></label>
              <div className="dialog-actions"><button className="secondary-button" type="button" onClick={() => setEditing(false)}>Batal</button><button className="primary-button" type="submit">Simpan perubahan</button></div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
