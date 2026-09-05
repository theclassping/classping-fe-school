"use client";

import { Award, Plus, Search, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type Assessment = {
  name: string;
  className: string;
  period: string;
  participants: number;
  average: string;
  status: "Selesai" | "Berlangsung" | "Draf";
};

const initialAssessments: Assessment[] = [
  { name: "Perkembangan Semester 1", className: "A1", period: "Agustus 2026", participants: 8, average: "BSH", status: "Berlangsung" },
  { name: "Observasi Motorik", className: "A2", period: "Agustus 2026", participants: 10, average: "BSB", status: "Selesai" },
  { name: "Perkembangan Bahasa", className: "B1", period: "Agustus 2026", participants: 7, average: "BSH", status: "Berlangsung" },
  { name: "Kesiapan Kognitif", className: "B2", period: "September 2026", participants: 9, average: "—", status: "Draf" },
];

export default function AssessmentPage() {
  const [assessments, setAssessments] = useState(initialAssessments);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState("");

  const filtered = useMemo(() => assessments.filter((assessment) =>
    assessment.name.toLowerCase().includes(search.toLowerCase()) &&
    (classFilter === "ALL" || assessment.className === classFilter)), [assessments, classFilter, search]);

  function createAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setAssessments((current) => [{
      name: String(data.get("name")),
      className: String(data.get("className")),
      period: String(data.get("period")),
      participants: Number(data.get("participants")),
      average: "—",
      status: "Draf",
    }, ...current]);
    setDialogOpen(false);
    setToast("Penilaian baru disimpan sebagai draf.");
    window.setTimeout(() => setToast(""), 3000);
  }

  return (
    <main id="main">
      <section className="page-heading">
        <div><p className="eyebrow">PERKEMBANGAN SISWA</p><h1>Penilaian</h1><p>Catat indikator perkembangan dan siapkan laporan siswa.</p></div>
        <button className="primary-button" type="button" onClick={() => setDialogOpen(true)}><Plus aria-hidden="true" /> Tambah Penilaian</button>
      </section>

      <section className="panel assessment-page-card">
        <div className="panel-heading transaction-heading"><div><h2>Daftar Penilaian</h2><p>Semester 1 · Tahun ajaran 2026/2027</p></div><span className="report-ready">{filtered.length} penilaian</span></div>
        <div className="table-tools">
          <label className="search"><Search aria-hidden="true" /><input type="search" placeholder="Cari penilaian..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <select aria-label="Filter kelas" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}><option value="ALL">Semua Kelas</option><option>A1</option><option>A2</option><option>B1</option><option>B2</option></select>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Nama Penilaian</th><th>Kelas</th><th>Periode</th><th>Peserta</th><th>Rata-rata</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>{filtered.map((assessment) => <tr key={`${assessment.name}-${assessment.className}`}><td><strong>{assessment.name}</strong></td><td>{assessment.className}</td><td>{assessment.period}</td><td>{assessment.participants} siswa</td><td><strong>{assessment.average}</strong></td><td><span className={`status-pill ${assessment.status === "Draf" ? "draft" : ""}`}>{assessment.status}</span></td><td><button className="text-button" type="button" onClick={() => setToast(`Membuka nilai ${assessment.name}.`)}>Kelola nilai</button></td></tr>)}</tbody>
          </table>
        </div>
        {!filtered.length && <p className="empty-state">Tidak ada penilaian yang cocok.</p>}
      </section>

      <section className="panel assessment-admin">
        <div className="panel-heading"><div><h2>Ringkasan Semester</h2><p>Kelengkapan indikator perkembangan</p></div></div>
        <div className="assessment-summary"><div><span>Nilai tersimpan</span><strong>63%</strong><div className="progress"><i style={{ width: "63%" }} /></div></div><div><span>Perlu dilengkapi</span><strong>3 siswa</strong><small>4 indikator perkembangan</small></div><div><span>Siap dibagikan</span><strong>5 laporan</strong><small>Terakhir diperbarui hari ini</small></div></div>
      </section>

      {dialogOpen && <div className="modal-overlay" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="assessmentDialogTitle"><form onSubmit={createAssessment}><div className="dialog-heading"><div><span className="dialog-icon"><Award aria-hidden="true" /></span><div><h2 id="assessmentDialogTitle">Tambah Penilaian</h2><p>Buat lembar penilaian perkembangan baru.</p></div></div><button className="close-button" type="button" aria-label="Tutup" onClick={() => setDialogOpen(false)}><X aria-hidden="true" /></button></div><div className="prototype-dialog-fields"><label className="full">Nama penilaian<input name="name" required placeholder="Contoh: Perkembangan Bahasa" /></label><label>Kelas<select name="className"><option>A1</option><option>A2</option><option>B1</option><option>B2</option></select></label><label>Periode<input name="period" defaultValue="September 2026" required /></label><label>Jumlah peserta<input name="participants" type="number" min="1" defaultValue="8" required /></label></div><div className="dialog-actions"><button className="secondary-button" type="button" onClick={() => setDialogOpen(false)}>Batal</button><button className="primary-button" type="submit">Simpan Penilaian</button></div></form></section></div>}
      {toast && <div className="prototype-toast" role="status">✓ {toast}</div>}
    </main>
  );
}
