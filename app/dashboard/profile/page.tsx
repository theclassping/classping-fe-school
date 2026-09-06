"use client";

import { Pencil, X } from "lucide-react";
import { FormEvent, useState } from "react";

type SchoolProfile = {
  name: string;
  npsn: string;
  address: string;
  phone: string;
  email: string;
};

const initialProfile: SchoolProfile = {
  name: "TK Harapan Bangsa",
  npsn: "20261234",
  address: "Jl. Merdeka No. 12, Bandung",
  phone: "(022) 456-7890",
  email: "admin@harapanbangsa.sch.id",
};

export default function SchoolProfilePage() {
  const [profile, setProfile] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState("");

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setProfile({ name: String(data.get("name")), npsn: String(data.get("npsn")), address: String(data.get("address")), phone: String(data.get("phone")), email: String(data.get("email")) });
    setEditing(false);
    setToast("Profil sekolah berhasil diperbarui.");
    window.setTimeout(() => setToast(""), 3000);
  }

  return (
    <main id="main">
      <section className="profile-hero panel">
        <span className="profile-logo">TK</span>
        <div><p className="eyebrow">PROFIL SEKOLAH</p><h1>{profile.name}</h1><p>Satuan pendidikan anak usia dini · Aktif</p></div>
        <button className="primary-button profile-edit-action" type="button" onClick={() => setEditing(true)}><Pencil aria-hidden="true" /> Edit Profil</button>
      </section>

      <section className="profile-page-grid">
        <article className="panel">
          <div className="panel-heading"><div><h2>Informasi Sekolah</h2><p>Identitas dan kontak utama</p></div></div>
          <ul className="profile-info-list"><li><span>Nama sekolah</span><strong>{profile.name}</strong></li><li><span>NPSN</span><strong>{profile.npsn}</strong></li><li><span>Alamat</span><strong>{profile.address}</strong></li><li><span>Telepon</span><strong>{profile.phone}</strong></li><li><span>Email</span><strong>{profile.email}</strong></li></ul>
        </article>
        <article className="panel">
          <div className="panel-heading"><div><h2>Ringkasan</h2><p>Tahun ajaran 2026/2027</p></div></div>
          <ul className="profile-info-list"><li><span>Jumlah kelas</span><strong>4 kelas aktif</strong></li><li><span>Jumlah siswa</span><strong>8 siswa</strong></li><li><span>Guru aktif</span><strong>12 orang</strong></li><li><span>Status</span><strong className="paid-text">Aktif</strong></li></ul>
        </article>
        <article className="panel">
          <div className="panel-heading"><div><h2>Cabang Sekolah</h2><p>Lokasi yang terhubung</p></div></div>
          <ul className="profile-info-list"><li><span>Cabang Pusat</span><strong>Jl. Merdeka No. 12</strong></li><li><span>Cabang Cibiru</span><strong>Jl. Cibiru Indah No. 8</strong></li><li><span>Cabang Ujungberung</span><strong>Jl. Ujungberung Raya No. 21</strong></li></ul>
        </article>
        <article className="panel">
          <div className="panel-heading"><div><h2>Media Sosial</h2><p>Kanal resmi sekolah</p></div></div>
          <ul className="profile-info-list"><li><span>Instagram</span><strong>@harapanbangsa_tk</strong></li><li><span>Facebook</span><strong>TK Harapan Bangsa</strong></li><li><span>YouTube</span><strong>Harapan Bangsa School</strong></li><li><span>TikTok</span><strong>@harapanbangsa</strong></li></ul>
        </article>
      </section>

      {editing && <div className="modal-overlay" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="schoolProfileDialogTitle"><form onSubmit={save}><div className="dialog-heading"><div><span className="dialog-icon"><Pencil aria-hidden="true" /></span><div><h2 id="schoolProfileDialogTitle">Edit Profil Sekolah</h2><p>Perbarui informasi yang ditampilkan di portal.</p></div></div><button className="close-button" type="button" aria-label="Tutup" onClick={() => setEditing(false)}><X aria-hidden="true" /></button></div><div className="prototype-dialog-fields"><label className="full">Nama sekolah<input name="name" defaultValue={profile.name} required /></label><label>NPSN<input name="npsn" defaultValue={profile.npsn} required /></label><label>Telepon<input name="phone" defaultValue={profile.phone} required /></label><label className="full">Alamat<input name="address" defaultValue={profile.address} required /></label><label className="full">Email<input name="email" type="email" defaultValue={profile.email} required /></label></div><div className="dialog-actions"><button className="secondary-button" type="button" onClick={() => setEditing(false)}>Batal</button><button className="primary-button" type="submit">Simpan perubahan</button></div></form></section></div>}
      {toast && <div className="prototype-toast" role="status">✓ {toast}</div>}
    </main>
  );
}
