const classes = [
  {
    code: "A1",
    name: "Matahari",
    paid: 1,
    total: 2,
    percentage: 50,
    type: "sun",
  },
  {
    code: "A2",
    name: "Pelangi",
    paid: 1,
    total: 2,
    percentage: 50,
    type: "leaf",
  },
  {
    code: "B1",
    name: "Bintang",
    paid: 2,
    total: 2,
    percentage: 100,
    type: "sky",
  },
  {
    code: "B2",
    name: "Bulan",
    paid: 1,
    total: 2,
    percentage: 50,
    type: "berry",
  },
];

export default function ClassStatus() {
  return (
    <article className="panel class-status">
      <div className="panel-heading">
        <div>
          <h2>Status per Kelas</h2>
          <p>Pembayaran bulan Agustus</p>
        </div>

        <button
          className="text-button"
          type="button"
        >
          Lihat semua
        </button>
      </div>

      <div className="class-list">
        {classes.map((item) => (
          <div
            className="class-row"
            key={item.code}
          >
            <span
              className={`class-badge ${item.type}`}
            >
              {item.code}
            </span>

            <div>
              <strong>
                Kelas {item.code} — {item.name}
              </strong>

              <span>
                {item.paid} dari {item.total} siswa
              </span>

              <div className="progress">
                <i
                  style={{
                    width: `${item.percentage}%`,
                  }}
                />
              </div>
            </div>

            <b>{item.percentage}%</b>
          </div>
        ))}
      </div>
    </article>
  );
}