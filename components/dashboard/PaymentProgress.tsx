const payments = [
  { month: "Jan", amount: "19jt", height: "76%" },
  { month: "Feb", amount: "21jt", height: "84%" },
  { month: "Mar", amount: "18jt", height: "72%" },
  { month: "Apr", amount: "23jt", height: "92%" },
  { month: "Mei", amount: "22jt", height: "88%" },
  {
    month: "Jun",
    amount: "18,75jt",
    height: "75%",
    current: true,
  },
];

export default function PaymentProgress() {
  return (
    <article className="panel payment-progress">
      <div className="panel-heading">
        <div>
          <h2>Progres Pembayaran</h2>
          <p>Realisasi SPP 6 bulan terakhir</p>
        </div>

        <select aria-label="Pilih tahun">
          <option>2026</option>
          <option>2025</option>
        </select>
      </div>

      <div className="chart-wrap">
        <div className="chart-y">
          <span>25jt</span>
          <span>20jt</span>
          <span>15jt</span>
          <span>10jt</span>
          <span>5jt</span>
          <span>0</span>
        </div>

        <div
          className="chart"
          aria-label="Grafik pembayaran Januari hingga Juni"
        >
          <div className="grid-lines" />

          {payments.map((payment) => (
            <div
              key={payment.month}
              className="bar-group"
            >
              <div
                className={`bar ${
                  payment.current ? "current" : ""
                }`}
                style={{
                  ["--height" as string]:
                    payment.height,
                }}
              >
                <span>{payment.amount}</span>
              </div>

              <small>{payment.month}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="chart-legend">
        <span>
          <i />
          SPP terkumpul
        </span>

        <span className="target">
          <i />
          Target bulanan Rp 24jt
        </span>
      </div>
    </article>
  );
}