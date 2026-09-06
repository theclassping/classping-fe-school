import Link from "next/link";
import ActivitySummaryCard from "./components/ActivitySummaryCard";
import PriorityCard from "./components/PriorityCard";
import StudentSummaryCard from "./components/StudentSummaryCard";
import WorktimeCard from "./components/WorktimeCard";

const classes = [
  { code: "A1", name: "Matahari", paid: 1, total: 2, tone: "sun" },
  { code: "A2", name: "Pelangi", paid: 1, total: 2, tone: "leaf" },
  { code: "B1", name: "Bintang", paid: 2, total: 2, tone: "sky" },
  { code: "B2", name: "Bulan", paid: 1, total: 2, tone: "berry" },
];

const payments = [
  { initials: "AP", name: "Alya Putri Ramadhani", className: "A1", date: "27 Agu 2026" },
  { initials: "RA", name: "Raka Aditya Pratama", className: "B1", date: "27 Agu 2026" },
  { initials: "NZ", name: "Nayla Zahra Aulia", className: "A2", date: "26 Agu 2026" },
  { initials: "DA", name: "Daffa Alfarizi", className: "B2", date: "26 Agu 2026" },
];

export default function DashboardPage() {
  const today = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()).toUpperCase();

  return (
    <main id="main">
      <div id="adminView">
        <section className="welcome-row">
          <div><p className="eyebrow">{today}</p><h1>Selamat pagi, Bu Nia! <span aria-hidden="true">👋</span></h1><p>Berikut ringkasan aktivitas dan hal penting sekolah hari ini.</p></div>
        </section>

        <section className="admin-focus-grid" aria-label="Aktivitas admin dan tugas penting">
          <WorktimeCard />
          <PriorityCard />
        </section>

        <section className="dashboard-insight-grid" aria-label="Ringkasan siswa dan aktivitas">
          <StudentSummaryCard />
          <ActivitySummaryCard />
        </section>

        <section className="panel assessment-admin">
          <div className="panel-heading"><div><h2>Ringkasan Penilaian</h2><p>Perkembangan siswa semester berjalan</p></div><Link className="text-button" href="/dashboard/assessment">Kelola penilaian →</Link></div>
          <div className="assessment-summary">
            <div><span>Nilai tersimpan</span><strong>63%</strong><div className="progress"><i style={{ width: "63%" }} /></div></div>
            <div><span>Perlu dilengkapi</span><strong>3 siswa</strong><small>4 indikator perkembangan</small></div>
            <div><span>Terakhir diperbarui</span><strong>25 Agu 2026</strong><small>oleh Bu Ratna</small></div>
          </div>
        </section>

        <section className="overview-grid dashboard-class-overview">
          <article className="panel class-status">
            <div className="panel-heading"><div><h2>Status Pembayaran SPP per Kelas</h2><p>Pembayaran bulan Agustus</p></div><Link className="text-button" href="/dashboard/payments">Lihat semua →</Link></div>
            <div className="class-list">
              {classes.map((item) => {
                const percentage = Math.round((item.paid / item.total) * 100);
                return <div className="class-row" key={item.code}><span className={`class-badge ${item.tone}`}>{item.code}</span><div><strong>Kelas {item.code} — {item.name}</strong><span>{item.paid} dari {item.total} siswa</span><div className="progress"><i style={{ width: `${percentage}%` }} /></div></div><b>{percentage}%</b></div>;
              })}
            </div>
          </article>
        </section>

        <section className="panel transactions">
          <div className="panel-heading transaction-heading"><div><h2>Pembayaran Terbaru</h2><p>Transaksi SPP yang baru saja tercatat</p></div><Link className="text-button" href="/dashboard/payments">Lihat semua transaksi <span>→</span></Link></div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Nama Siswa</th><th>Kelas</th><th>Bulan SPP</th><th>Tanggal Bayar</th><th>Jumlah</th><th>Status</th></tr></thead>
              <tbody>{payments.map((payment) => <tr key={payment.name}><td><div className="student-cell"><span className="student-avatar">{payment.initials}</span><strong>{payment.name}</strong></div></td><td>{payment.className}</td><td>Agustus 2026</td><td>{payment.date}</td><td><strong>Rp 250.000</strong></td><td><span className="status-pill">Lunas</span></td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
