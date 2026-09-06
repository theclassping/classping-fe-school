"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActivity, type Activity } from "../activityData";

export default function DeleteActivityPage() {
  const [activity, setActivity] = useState<Activity>(getActivity(null));
  const [deleted, setDeleted] = useState(false);
  useEffect(() => {
    setActivity(
      getActivity(new URLSearchParams(window.location.search).get("activity")),
    );
  }, []);
  if (deleted)
    return (
      <main>
        <section className="panel student-manage">
          <div className="panel-heading">
            <div>
              <h2>Aktivitas dihapus</h2>
              <p>Dokumen aktivitas dan tag terkait sudah dihapus.</p>
            </div>
          </div>
          <div className="student-form">
            <Link className="primary-button" href="/dashboard/activities">
              Kembali ke aktivitas
            </Link>
          </div>
        </section>
      </main>
    );
  return (
    <main>
      <section className="panel student-manage">
        <div className="panel-heading">
          <div>
            <h2>Delete Aktivitas</h2>
            <p>Hapus dokumen aktivitas yang tidak diperlukan</p>
          </div>
          <Link className="secondary-button" href="/dashboard/activities">
            Kembali
          </Link>
        </div>
        <div className="warning-box" style={{ margin: "0 22px 22px" }}>
          <h3>Konfirmasi penghapusan</h3>
          <p>
            Aktivitas “{activity.title}” akan dihapus dari laporan kegiatan.
            Foto dan tag yang terkait juga akan dihapus dari sistem.
          </p>
        </div>
        <form
          className="student-form"
          onSubmit={(event) => {
            event.preventDefault();
            setDeleted(true);
          }}
        >
          <div className="form-grid">
            <div className="field-group full">
              <label htmlFor="deleteReason">Alasan penghapusan</label>
              <select id="deleteReason">
                <option>Data duplikat</option>
                <option>Informasi salah</option>
                <option>Lainnya</option>
              </select>
            </div>
            <div className="field-group full">
              <label htmlFor="deleteNote">Catatan admin</label>
              <textarea
                id="deleteNote"
                rows={4}
                placeholder="Tulis catatan atau keterangan penghapusan..."
              />
            </div>
          </div>
          <div className="student-form-actions">
            <Link className="secondary-button" href="/dashboard/activities">
              Batal
            </Link>
            <button className="primary-button" type="submit">
              Hapus Aktivitas
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
