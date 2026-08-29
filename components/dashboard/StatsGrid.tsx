const stats = [
  {
    type: "green",
    icon: "◈",
    title: "Total SPP Terkumpul",
    value: "Rp 1.250.000",
    trend: "↗ 12%",
    description: (
      <>
        dari target <span>Rp 2.000.000</span>
      </>
    ),
  },
  {
    type: "blue",
    icon: "✓",
    title: "Sudah Membayar",
    value: "5",
    suffix: "siswa",
    trend: "Bulan ini",
    description: (
      <>
        dari total <span>8</span> siswa
      </>
    ),
  },
  {
    type: "orange",
    icon: "◷",
    title: "Belum Membayar",
    value: "3",
    suffix: "siswa",
    trend: "Perlu tindak lanjut",
    description: (
      <>
        <span>1</span> siswa melewati jatuh tempo
      </>
    ),
  },
  {
    type: "purple",
    icon: "♙",
    title: "Total Siswa",
    value: "8",
    suffix: "siswa",
    trend: "Aktif",
    description: (
      <>
        <span>4</span> kelas aktif
      </>
    ),
  },
];

export default function StatsGrid() {
  return (
    <section className="stats-grid" aria-label="Ringkasan SPP">
      {stats.map((stat) => (
        <article
          key={stat.title}
          className={`stat-card ${stat.type}`}
        >
          <div className="stat-top">
            <span className="stat-icon">
              {stat.icon}
            </span>

            <span className="trend">
              {stat.trend}
            </span>
          </div>

          <p>{stat.title}</p>

          <strong>
            {stat.value}
            {stat.suffix && (
              <em> {stat.suffix}</em>
            )}
          </strong>

          <small>{stat.description}</small>

          {stat.type === "orange" && (
            <button
              className="stat-action"
              type="button"
            >
              ♧ Atur pengingat WhatsApp
            </button>
          )}
        </article>
      ))}
    </section>
  );
}