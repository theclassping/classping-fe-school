"use client";

import { CalendarDays, Plus, Search, Upload, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { addSchoolNotification } from "../components/school-store";

type Activity = {
  id: string;
  title: string;
  className: string;
  classLabel: string;
  time: string;
  photoCount: number;
  tagged: number;
  status: "Dipublikasi" | "Draf";
  description: string;
  art: string;
  emoji: string;
};

const initialActivities: Activity[] = [
  { id: "melukis-dengan-jari", title: "Melukis dengan Jari", className: "A1", classLabel: "Matahari", time: "09.00", photoCount: 4, tagged: 8, status: "Dipublikasi", description: "Anak-anak mengenal warna primer dan mencampurnya menjadi warna baru.", art: "art-paint", emoji: "🎨" },
  { id: "menanam-kacang-hijau", title: "Menanam Kacang Hijau", className: "A1", classLabel: "Matahari", time: "10.15", photoCount: 5, tagged: 12, status: "Dipublikasi", description: "Belajar merawat tanaman dan mengamati proses pertumbuhan biji.", art: "art-garden", emoji: "🌱" },
  { id: "bermain-alat-musik", title: "Bermain Alat Musik", className: "A2", classLabel: "Pelangi", time: "11.00", photoCount: 3, tagged: 2, status: "Draf", description: "Eksplorasi ritme sederhana menggunakan tamborin dan marakas.", art: "art-music", emoji: "🎵" },
];

export default function ActivitiesPage() {
  const [activities, setActivities] = useState(initialActivities);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState("");

  const filtered = useMemo(() => activities.filter((activity) =>
    activity.title.toLowerCase().includes(search.toLowerCase()) &&
    (classFilter === "ALL" || activity.className === classFilter)), [activities, classFilter, search]);

  function createActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const className = String(data.get("className"));
    const title = String(data.get("title")).trim();
    const nextActivity: Activity = {
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      title,
      className,
      classLabel: className === "A1" ? "Matahari" : className === "A2" ? "Pelangi" : className === "B1" ? "Bintang" : "Bulan",
      time: String(data.get("time")),
      photoCount: 1,
      tagged: Number(data.get("tagged") || 0),
      status: data.get("publish") === "on" ? "Dipublikasi" : "Draf",
      description: String(data.get("description")).trim(),
      art: "art-paint",
      emoji: "📷",
    };
    setActivities((current) => [nextActivity, ...current]);
    addSchoolNotification({ id: `activity-${nextActivity.id}`, type: "upload", title: "Aktivitas berhasil diunggah", message: `${nextActivity.title} telah ${nextActivity.status === "Dipublikasi" ? "dipublikasikan" : "disimpan sebagai draf"}.`, href: "/dashboard/activities" });
    setDialogOpen(false);
    setToast("Aktivitas berhasil disimpan.");
    window.setTimeout(() => setToast(""), 3000);
  }

  return (
    <main id="main">
      <section className="page-heading">
        <div><p className="eyebrow">DOKUMENTASI HARIAN</p><h1>Laporan Aktivitas</h1><p>Kelola aktivitas dan foto yang hanya dapat dilihat orang tua siswa terkait.</p></div>
        <button className="primary-button" type="button" onClick={() => setDialogOpen(true)}><Plus aria-hidden="true" /> Tambah Aktivitas</button>
      </section>

      <section className="panel activity-toolbar">
        <label className="date-chip"><CalendarDays aria-hidden="true" /><span>Tanggal kegiatan<strong>5 September 2026</strong></span></label>
        <label className="search"><Search aria-hidden="true" /><input type="search" placeholder="Cari aktivitas..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <select aria-label="Filter kelas" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}><option value="ALL">Semua Kelas</option><option>A1</option><option>A2</option><option>B1</option><option>B2</option></select>
        <span className="activity-total">{filtered.length} aktivitas · {filtered.reduce((total, item) => total + item.photoCount, 0)} foto</span>
      </section>

      <section className="activity-grid activity-page-grid" aria-label="Daftar aktivitas">
        {filtered.map((activity) => (
          <article className="activity-card panel" key={activity.id}>
            <div className={`activity-cover ${activity.art}`}><span>{activity.emoji}</span><b>{activity.photoCount} foto</b></div>
            <div className="activity-body">
              <div className="activity-meta"><span>{activity.time}</span><span>{activity.className} · {activity.classLabel}</span><span className={activity.status === "Dipublikasi" ? "published" : "draft"}>● {activity.status}</span></div>
              <h3>{activity.title}</h3><p>{activity.description}</p>
              <div className={`tag-summary ${activity.status === "Draf" ? "warning-tag" : ""}`}><span className="mini-avatars">{activity.status === "Draf" ? "!" : "AP"}</span><strong>{activity.status === "Draf" ? "2 foto belum memiliki tag" : `${activity.tagged} siswa ditandai`}</strong></div>
              <div className="activity-card-actions"><button className="outline-button" type="button" onClick={() => setToast(`Pengelolaan foto ${activity.title} siap dibuka.`)}>{activity.status === "Draf" ? "Lanjutkan & tag siswa" : "Kelola foto & tag"}</button></div>
            </div>
          </article>
        ))}
      </section>
      {!filtered.length && <div className="activity-empty panel"><span>📅</span><h3>Belum ada aktivitas</h3><p>Tidak ada laporan yang cocok dengan filter.</p></div>}

      {dialogOpen && (
        <div className="modal-overlay" role="presentation">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="activityDialogTitle">
            <form onSubmit={createActivity}>
              <div className="dialog-heading"><div><span className="dialog-icon"><Upload aria-hidden="true" /></span><div><h2 id="activityDialogTitle">Tambah Aktivitas</h2><p>Unggah dokumentasi kegiatan dan tandai siswa.</p></div></div><button className="close-button" type="button" aria-label="Tutup" onClick={() => setDialogOpen(false)}><X aria-hidden="true" /></button></div>
              <div className="prototype-dialog-fields">
                <label className="full">Judul aktivitas<input name="title" required placeholder="Contoh: Membuat Kolase" /></label>
                <label>Kelas<select name="className" defaultValue="A1"><option>A1</option><option>A2</option><option>B1</option><option>B2</option></select></label>
                <label>Waktu<input name="time" type="time" defaultValue="09:00" required /></label>
                <label className="full">Deskripsi<textarea name="description" required placeholder="Tuliskan cerita singkat kegiatan..." /></label>
                <label>Jumlah siswa ditandai<input name="tagged" type="number" min="0" defaultValue="0" /></label>
                <label className="prototype-check"><input name="publish" type="checkbox" /> Publikasikan sekarang</label>
              </div>
              <div className="dialog-actions"><button className="secondary-button" type="button" onClick={() => setDialogOpen(false)}>Batal</button><button className="primary-button" type="submit">Simpan Aktivitas</button></div>
            </form>
          </section>
        </div>
      )}
      {toast && <div className="prototype-toast" role="status">✓ {toast}</div>}
    </main>
  );
}
