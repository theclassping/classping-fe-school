const workDays = [
  { day: "Sen", hours: "2j", height: "40%" },
  { day: "Sel", hours: "3,5j", height: "70%" },
  { day: "Rab", hours: "2,75j", height: "55%" },
  { day: "Kam", hours: "4,5j", height: "90%", today: true },
  { day: "Jum", hours: "—", height: "0%", future: true },
];

export default function WorkTimeCard() {
  return (
    <article className="panel worktime-card">
      <div className="panel-heading">
        <div>
          <h2>Aktivitas Anda Pekan Ini</h2>
          <p>Waktu aktif mengelola ClassPing</p>
        </div>

        <span className="week-chip">
          24–28 Agu
        </span>
      </div>

      <div className="worktime-summary">
        <div>
          <strong>12j 45m</strong>
          <span>Total waktu aktif</span>
        </div>

        <span className="worktime-change">
          ↗ 1j 20m dari minggu lalu
        </span>
      </div>

      <div
        className="worktime-chart"
        aria-label="Waktu aktif selama minggu ini"
      >
        {workDays.map((item) => (
          <div
            key={item.day}
            className={`workday ${
              item.today ? "today" : ""
            } ${item.future ? "future" : ""}`}
          >
            <span>
              <i style={{ height: item.height }} />
            </span>

            <b>{item.hours}</b>

            <small>{item.day}</small>
          </div>
        ))}
      </div>

      <div className="weekly-goal">
        <span>Target mingguan</span>

        <strong>12j 45m / 15j</strong>

        <div className="progress">
          <i style={{ width: "85%" }} />
        </div>
      </div>
    </article>
  );
}