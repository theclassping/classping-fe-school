"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActivity, students, type Activity } from "../activityData";

export default function ManageActivityPage() {
  const [activity, setActivity] = useState<Activity>(getActivity(null));
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setActivity(
      getActivity(new URLSearchParams(window.location.search).get("activity")),
    );
  }, []);
  return (
    <main>
      <section className="panel student-manage">
        <div className="panel-heading">
          <div>
            <h2>Kelola Foto & Tag</h2>
            <p>
              Siapkan foto dan pilih siswa yang terlihat pada dokumentasi
              aktivitas
            </p>
          </div>
          <Link className="secondary-button" href="/dashboard/activities">
            Kembali
          </Link>
        </div>
        <form
          className="student-form"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(true);
          }}
        >
          <div className="privacy-notice">
            <p>
              <strong>Tag terbatas sesuai kelas</strong>
              <span>
                Hanya siswa dari kelas aktivitas ini yang dapat dipilih.
              </span>
            </p>
          </div>
          <div className="existing-photo-heading">
            <div>
              <strong>Foto aktivitas</strong>
              <small>{activity.photos} foto tersimpan</small>
            </div>
            <label className="mini-upload" htmlFor="managePhotos">
              Tambah foto
              <input id="managePhotos" type="file" accept="image/*" multiple />
            </label>
          </div>
          <div className="managed-photo-grid">
            {Array.from({ length: activity.photos }, (_, index) => (
              <button
                className={`managed-photo ${index === 0 ? "active" : ""}`}
                type="button"
                key={index}
                aria-label={`Pilih foto ${index + 1}`}
              >
                <span>{activity.avatar}</span>
                <small className="photo-tag-count">
                  {index === 0
                    ? `${activity.participants.length} tag`
                    : "Belum ditag"}
                </small>
              </button>
            ))}
          </div>
          <fieldset className="student-tags manage-student-tags">
            <legend>Siswa dalam foto yang dipilih</legend>
            <p>
              Pilih semua siswa yang terlihat. Orang tua hanya menerima foto
              yang menandai anaknya.
            </p>
            <label className="select-all-students">
              <input type="checkbox" /> Pilih seluruh kelas
            </label>
            <div className="tag-options">
              {students.map((student) => (
                <label key={student}>
                  <input
                    type="checkbox"
                    defaultChecked={activity.participants.includes(student)}
                  />{" "}
                  {student}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="student-form-actions">
            <Link className="secondary-button" href="/dashboard/activities">
              Batal
            </Link>
            <button className="primary-button" type="submit">
              Simpan Foto & Tag
            </button>
          </div>
          {saved && (
            <p className="settings-save-message" role="status">
              Foto dan tag berhasil disimpan.
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
