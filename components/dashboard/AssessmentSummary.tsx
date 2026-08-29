export default function AssessmentSummary() {
  return (
    <section className="panel assessment-admin">
      <div className="panel-heading">
        <div>
          <h2>Ringkasan Penilaian</h2>
          <p>
            Perkembangan siswa semester berjalan
          </p>
        </div>

        <button
          className="text-button"
          type="button"
        >
          Kelola penilaian →
        </button>
      </div>

      <div className="assessment-summary">
        <div>
          <span>Nilai tersimpan</span>

          <strong>63%</strong>

          <div className="progress">
            <i style={{ width: "63%" }} />
          </div>
        </div>

        <div>
          <span>Perlu dilengkapi</span>

          <strong>3 siswa</strong>

          <small>4 indikator perkembangan</small>
        </div>

        <div>
          <span>Terakhir diperbarui</span>

          <strong>25 Agu 2026</strong>

          <small>oleh Bu Ratna</small>
        </div>
      </div>
    </section>
  );
}