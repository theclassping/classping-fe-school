"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ActivityClass, loadActivityClasses } from "../activityClasses";
import { ActivityStudent, loadActivityStudents } from "../activityStudents";

export default function AddActivityPage() {
  const [saved, setSaved] = useState("");
  const [classes, setClasses] = useState<ActivityClass[]>([]);
  const [classId, setClassId] = useState("");
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState("");
  const [students, setStudents] = useState<ActivityStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");

  useEffect(() => {
    loadActivityClasses()
      .then(setClasses)
      .catch((error) => {
        console.error(error);
        setClassesError("Failed to load classes.");
      })
      .finally(() => setClassesLoading(false));
  }, []);

  useEffect(() => {
    setStudents([]);
    setStudentsError("");
    if (!classId) return;

    setStudentsLoading(true);
    loadActivityStudents(classId)
      .then(setStudents)
      .catch((error) => {
        console.error(error);
        setStudentsError("Failed to load students for this class.");
      })
      .finally(() => setStudentsLoading(false));
  }, [classId]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved("Aktivitas berhasil disimpan.");
  }
  return (
    <main>
      <section className="panel student-manage">
        <div className="panel-heading">
          <div>
            <h2>Tambah Aktivitas</h2>
            <p>Buat aktivitas harian untuk siswa dan pilih status publikasi</p>
          </div>
          <Link className="secondary-button" href="/dashboard/activities">
            Kembali
          </Link>
        </div>
        <form className="student-form" onSubmit={submit}>
          <div className="form-grid">
            <div className="field-group full">
              <label htmlFor="activityTitle">Judul aktivitas</label>
              <input
                id="activityTitle"
                required
                placeholder="Contoh: Membuat Kolase"
              />
            </div>
            <div className="field-group">
              <label htmlFor="activityClass">Pilih kelas</label>
              <select
                id="activityClass"
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                required
                disabled={classesLoading}
              >
                <option value="">
                  {classesLoading ? "Memuat kelas..." : "Pilih kelas"}
                </option>
                {classes.map((activityClass) => (
                  <option key={activityClass.id} value={activityClass.id}>
                    {activityClass.code === activityClass.label
                      ? activityClass.label
                      : `${activityClass.code} - ${activityClass.label}`}
                  </option>
                ))}
              </select>
              {classesError && (
                <small className="form-error">{classesError}</small>
              )}
            </div>
            <div className="field-group">
              <label htmlFor="activityStatus">Status</label>
              <select id="activityStatus">
                <option value="draft">Draft</option>
                <option value="publish">Publish</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="activityDate">Tanggal kegiatan</label>
              <input
                id="activityDate"
                type="date"
                defaultValue="2026-08-27"
                required
              />
            </div>
            <div className="field-group">
              <label htmlFor="activityTime">Waktu</label>
              <input
                id="activityTime"
                type="time"
                defaultValue="09:00"
                required
              />
            </div>
            <div className="field-group full">
              <label htmlFor="activityCaption">Caption / deskripsi</label>
              <textarea id="activityCaption" rows={4} />
            </div>
          </div>
          <h3>Unggah Foto</h3>
          <label className="upload-zone" htmlFor="activityPhotos">
            <strong>Pilih foto aktivitas</strong>
            <span>Format JPG/PNG, boleh lebih dari satu file</span>
            <input id="activityPhotos" type="file" accept="image/*" multiple />
          </label>
          <h3>Peserta</h3>
          <fieldset className="student-tags">
            <legend>Pilih siswa yang hadir / terlihat</legend>
            <div className="tag-options">
              {!classId && <p>Pilih kelas untuk memuat daftar siswa.</p>}
              {studentsLoading && <p>Memuat siswa...</p>}
              {studentsError && (
                <small className="form-error">{studentsError}</small>
              )}
              {!studentsLoading &&
                !studentsError &&
                classId &&
                students.length === 0 && <p>Tidak ada siswa di kelas ini.</p>}
              {students.map((student) => (
                <label key={student.id}>
                  <input type="checkbox" /> {student.name}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="student-form-actions">
            <Link className="secondary-button" href="/dashboard/activities">
              Batal
            </Link>
            <button
              className="button-secondary"
              type="button"
              onClick={() => setSaved("Draft berhasil disimpan.")}
            >
              Simpan Draf
            </button>
            <button className="primary-button" type="submit">
              Publikasikan
            </button>
          </div>
          {saved && (
            <p className="settings-save-message" role="status">
              {saved}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
