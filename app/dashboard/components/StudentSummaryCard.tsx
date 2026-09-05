import Link from "next/link";
import { Users } from "lucide-react";

export default function StudentSummaryCard() {
  return (
    <article className="panel dashboard-insight student-insight" aria-labelledby="studentSummaryTitle">
      <header className="insight-header">
        <div><h2 id="studentSummaryTitle">Ringkasan Siswa</h2><p className="insight-subtitle">Data siswa tahun ajaran 2026/2027</p></div>
        <Link className="insight-link" href="/dashboard/students">Lihat data <span>→</span></Link>
      </header>
      <div className="student-insight-body">
        <div className="student-total-spotlight"><span className="insight-main-icon"><Users aria-hidden="true" /></span><div><strong>8</strong><span>Siswa aktif</span><small>Dalam 4 kelas aktif</small></div></div>
        <div className="student-detail-list">
          <div className="insight-row"><div><span>Jenis kelamin</span><small>Komposisi siswa</small></div><div className="gender-pills" aria-label="4 perempuan dan 4 laki-laki"><span className="female"><b>4</b> P</span><span className="male"><b>4</b> L</span></div></div>
          <div className="insight-row"><div><span>Rentang usia</span><small>4 th: 1 · 5 th: 4 · 6 th: 3</small></div><strong>4–6 tahun</strong></div>
          <div className="insight-row"><div><span>Status</span><small>0 siswa nonaktif</small></div><span className="active-student-pill"><i /><b>8</b> Aktif</span></div>
        </div>
      </div>
    </article>
  );
}
