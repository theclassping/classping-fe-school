import Link from "next/link";

export default function ActivitySummaryCard() {
  return (
    <article className="panel dashboard-insight activity-insight" aria-labelledby="activitySummaryTitle">
      <header className="insight-header">
        <div><h2 id="activitySummaryTitle">Ringkasan Aktivitas</h2><p className="insight-subtitle">Dokumentasi kegiatan harian</p></div>
        <Link className="insight-link" href="/dashboard/activities">Lihat laporan <span>→</span></Link>
      </header>
      <div className="activity-kpi-strip" aria-label="Statistik aktivitas hari ini">
        <div className="primary"><strong>3</strong><span>Aktivitas</span><small>2 kelas terlibat</small></div>
        <div><strong>12</strong><span>Foto</span><small>Diunggah hari ini</small></div>
        <div><strong>2</strong><span>Dipublikasi</span><small>Dilihat orang tua</small></div>
      </div>
      <div className="activity-attention-row"><span className="attention-icon">!</span><div><strong>2 foto belum ditandai</strong><small>Tambahkan tag siswa sebelum dipublikasi.</small></div><Link href="/dashboard/activities">Periksa</Link></div>
      <div className="latest-activity-row"><div><span>Aktivitas terakhir</span><strong>Bermain Alat Musik</strong><small>A2 · Pelangi · 11.00</small></div><span className="status-pill draft">Draf</span></div>
    </article>
  );
}
