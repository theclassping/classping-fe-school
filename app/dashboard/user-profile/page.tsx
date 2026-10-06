"use client";

import { FormEvent, useEffect, useState } from "react";
import type { SessionUser } from "@/lib/session";
import { loadStaffProfile, saveStaffProfile, type StaffProfile } from "./staffProfileApi";
import { getInitials } from "../components/school-store";

const roleLabels: Record<string, string> = {
  ADMIN: "Administrator", STAFF: "Staf", TEACHER: "Guru", PARENT: "Wali", STUDENT: "Siswa",
};

export default function UserProfilePage() {
  const [staff, setStaff] = useState<StaffProfile | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include", cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Sesi tidak tersedia. Silakan masuk kembali.");
        const data = await response.json();
        if (!data.user) throw new Error("Profil pengguna tidak tersedia. Silakan masuk kembali.");
        if (!controller.signal.aborted) setUser(data.user);
        const profile = await loadStaffProfile(data.user.id, controller.signal);
        if (!controller.signal.aborted) setStaff(profile);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Gagal memuat profil pengguna.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadUser();
    return () => controller.abort();
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !staff) return;
    const fields = new FormData(event.currentTarget);
    setSaving(true);
    setSaveError("");
    setMessage("");
    try {
      const updated = await saveStaffProfile(staff, {
        first_name: String(fields.get("first_name")).trim(),
        last_name: String(fields.get("last_name")).trim(),
        email: String(fields.get("email")).trim(),
        phone: String(fields.get("phone")).trim(),
        hire_date: String(fields.get("hire_date")),
        qualification: String(fields.get("qualification")).trim(),
      });
      setStaff(updated);
      setEditing(false);
      setMessage("Profil berhasil diperbarui.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  }

  const name = [staff?.first_name, staff?.last_name].filter(Boolean).join(" ") || staff?.email || "Pengguna";

  return (
    <main id="main">
      <section className="profile-hero panel">
        <span className="profile-logo">{getInitials(name)}</span>
        <div><p className="eyebrow">PROFIL PENGGUNA</p><h1>{staff ? name : "Profil Pengguna"}</h1></div>
        {staff && !loading && !error && <button type="button" className="primary-button profile-edit-action" onClick={() => {
          setSaveError(""); setMessage(""); setEditing(true);
        }}>Edit Profil</button>}
      </section>
      {message && <p role="status">{message}</p>}
      {editing && staff && <section className="panel">
        <h2>Edit Profil</h2>
        {saveError && <p className="form-error" role="alert">{saveError}</p>}
        <form onSubmit={saveProfile}>
          <fieldset disabled={saving} className="form-grid">
            <div className="form-field"><label htmlFor="profile_first_name">Nama depan</label><input id="profile_first_name" name="first_name" defaultValue={staff.first_name} maxLength={150} required /></div>
            <div className="form-field"><label htmlFor="profile_last_name">Nama belakang</label><input id="profile_last_name" name="last_name" defaultValue={staff.last_name} maxLength={150} required /></div>
            <div className="form-field"><label htmlFor="profile_email">Email</label><input id="profile_email" name="email" type="email" defaultValue={staff.email} required /></div>
            <div className="form-field"><label htmlFor="profile_phone">Telepon</label><input id="profile_phone" name="phone" type="tel" defaultValue={staff.phone} /></div>
            <div className="form-field"><label htmlFor="profile_hire_date">Tanggal masuk</label><input id="profile_hire_date" name="hire_date" type="date" defaultValue={staff.hire_date} required /></div>
            <div className="form-field"><label htmlFor="profile_qualification">Kualifikasi</label><input id="profile_qualification" name="qualification" defaultValue={staff.qualification} /></div>
          </fieldset>
          <div className="modal-actions">
            <button type="button" className="secondary-button" disabled={saving} onClick={() => setEditing(false)}>Batal</button>
            <button type="submit" className="primary-button" disabled={saving}>{saving ? "Menyimpan..." : "Simpan perubahan"}</button>
          </div>
        </form>
      </section>}
      <section className="panel">
        {loading || error ? <p role="status">{loading ? "Memuat profil pengguna..." : error}</p> : staff && (
          <>
            <div className="panel-heading"><div><h2>Informasi Akun</h2><p>Data akun yang sedang masuk</p></div></div>
            <ul className="profile-info-list">
              <li><span>Nama lengkap</span><strong>{name}</strong></li>
              <li><span>Email</span><strong>{staff.email}</strong></li>
              <li><span>Telepon</span><strong>{staff.phone || "—"}</strong></li>
              <li><span>Jabatan</span><strong>{staff.staff_type_display || staff.staff_type}</strong></li>
              <li><span>Tanggal masuk</span><strong>{staff.hire_date || "—"}</strong></li>
              <li><span>Kualifikasi</span><strong>{staff.qualification || "—"}</strong></li>
              <li><span>Peran</span><strong>{user ? roleLabels[user.role] ?? user.role : "—"}</strong></li>
              <li><span>Status</span><strong>{staff.is_active ? "Aktif" : "Nonaktif"}</strong></li>
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
