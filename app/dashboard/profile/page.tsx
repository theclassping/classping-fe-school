"use client";

import { Pencil, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

import styles from "./SchoolProfile.module.css";

import { loadCurrentBranch, saveBranch, type Branch } from "./branchApi";

export default function SchoolProfilePage() {
  const [profile, setProfile] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState("");

  const dialogRef = useRef<HTMLDialogElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void loadCurrentBranch(controller.signal)
      .then((branch) => {
        if (!controller.signal.aborted) setProfile(branch);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Gagal memuat profil sekolah.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    if (!editing) return;
    const dialog = dialogRef.current;
    const editButton = editButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    dialog?.querySelector<HTMLInputElement>('[name="name"]')?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      editButton?.focus();
    };
  }, [editing]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || saving) return;
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setSaveError("");
    try {
      const updated = await saveBranch(profile.id, {
        name: String(data.get("name")), code: String(data.get("code")),
        address: String(data.get("address")), phone: String(data.get("phone")),
        email: String(data.get("email")),
      });
      setProfile(updated);
      setEditing(false);
      setToast("Profil sekolah berhasil diperbarui.");
      window.setTimeout(() => setToast(""), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Gagal menyimpan profil sekolah.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || error || !profile) {
    return <main id="main"><section className="panel">
      <h1>Profil Sekolah</h1>
      <p role="status">{loading ? "Memuat profil sekolah..." : error || "Profil sekolah tidak tersedia."}</p>
      {!loading && <button type="button" className="secondary-button" onClick={() => {
        setError(""); setLoading(true); setReload((value) => value + 1);
      }}>Coba lagi</button>}
    </section></main>;
  }

  return (
    <main id="main">
      <section className="profile-hero panel">
        <span className="profile-logo">{profile.code}</span>
        <div><p className="eyebrow">PROFIL SEKOLAH</p><h1>{profile.name}</h1><p>Cabang sekolah · {profile.is_active ? "Aktif" : "Nonaktif"}</p></div>
        <button ref={editButtonRef} className="primary-button profile-edit-action" type="button" onClick={() => { setSaveError(""); setEditing(true); }}><Pencil aria-hidden="true" /> Edit Profil</button>
      </section>

      <section className="profile-page-grid">
        <article className="panel">
          <div className="panel-heading"><div><h2>Informasi Sekolah</h2><p>Identitas dan kontak utama</p></div></div>
          <ul className="profile-info-list"><li><span>Nama cabang</span><strong>{profile.name}</strong></li><li><span>Kode cabang</span><strong>{profile.code}</strong></li><li><span>Alamat</span><strong>{profile.address}</strong></li><li><span>Telepon</span><strong>{profile.phone}</strong></li><li><span>Email</span><strong>{profile.email}</strong></li></ul>
        </article>
        <article className="panel">
          <div className="panel-heading"><div><h2>Lokasi</h2><p>Wilayah cabang sekolah</p></div></div>
          <ul className="profile-info-list">
            {(profile.location?.path ?? []).map((location) => (
              <li key={location.id}><span>{{ COUNTRY: "Negara", PROVINCE: "Provinsi", CITY: "Kota", DISTRICT: "Kecamatan", VILLAGE: "Kelurahan" }[location.type] ?? location.type}</span><strong>{location.name}</strong></li>
            ))}
            {!profile.location?.path?.length && <li><span>Lokasi</span><strong>{profile.location?.name || "Belum tersedia"}</strong></li>}
            <li><span>Status</span><strong>{profile.is_active ? "Aktif" : "Nonaktif"}</strong></li>
          </ul>
        </article>
      </section>

      {editing && (
        <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="schoolProfileDialogTitle" aria-describedby="schoolProfileDialogDescription" onCancel={(event) => { if (saving) event.preventDefault(); else setEditing(false); }}>
          <form onSubmit={save}>
            <header className={styles.header}>
              <span className={styles.icon}><Pencil aria-hidden="true" /></span>
              <div>
                <h2 id="schoolProfileDialogTitle">Edit Profil Sekolah</h2>
                <p id="schoolProfileDialogDescription">Perbarui identitas dan kontak sekolah Anda.</p>
              </div>
              <button className={styles.close} type="button" aria-label="Tutup" disabled={saving} onClick={() => setEditing(false)}><X aria-hidden="true" /></button>
            </header>
            <div className={styles.body}>
              {saveError && <p className="form-error" role="alert">{saveError}</p>}
              <fieldset className={styles.group}>
                <legend>Identitas sekolah</legend>
                <div className={styles.fields}>
                  <label className={styles.full}>Nama cabang<input name="name" autoComplete="organization" defaultValue={profile.name} required /></label>
                  <label className={styles.full}>Kode cabang<input name="code" defaultValue={profile.code} required /></label>
                </div>
              </fieldset>
              <fieldset className={styles.group}>
                <legend>Alamat & kontak</legend>
                <div className={styles.fields}>
                  <label className={styles.full}>Alamat sekolah<textarea name="address" autoComplete="street-address" defaultValue={profile.address} rows={2} required /></label>
                  <label>Telepon<input name="phone" type="tel" autoComplete="tel" defaultValue={profile.phone} required /></label>
                  <label>Email sekolah<input name="email" type="email" autoComplete="email" defaultValue={profile.email} required /></label>
                </div>
              </fieldset>
            </div>
            <footer className={styles.footer}>
              <span>Semua kolom wajib diisi.</span>
              <div className={styles.actions}>
                <button className="secondary-button" type="button" disabled={saving} onClick={() => setEditing(false)}>Batal</button>
                <button className="primary-button" type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan perubahan"}</button>
              </div>
            </footer>
          </form>
        </dialog>
      )}
      {toast && <div className="prototype-toast" role="status">✓ {toast}</div>}
    </main>
  );
}
