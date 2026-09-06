"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getActivity, type Activity } from "../activityData";
import { ActivityClass, loadActivityClasses } from "../activityClasses";
import { ActivityStudent, loadActivityStudents } from "../activityStudents";

export default function UpdateActivityPage() {
  const [activity, setActivity] = useState<Activity>(getActivity(null));
  const [classes, setClasses] = useState<ActivityClass[]>([]);
  const [classId, setClassId] = useState("");
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState("");
  const [students, setStudents] = useState<ActivityStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setActivity(
      getActivity(new URLSearchParams(window.location.search).get("activity")),
    );
  }, []);

  useEffect(() => {
    loadActivityClasses()
      .then((loadedClasses) => {
        setClasses(loadedClasses);
        const matchingClass = loadedClasses.find(
          (activityClass) =>
            activityClass.code === activity.className ||
            activityClass.label === activity.className,
        );
        if (matchingClass) setClassId(matchingClass.id);
      })
      .catch((error) => {
        console.error(error);
        setClassesError("Failed to load classes.");
      })
      .finally(() => setClassesLoading(false));
  }, [activity.className]);

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
    setSaved(true);
  }
  return (
    <main>
      <section className="panel student-manage">
        <div className="panel-heading">
          <div>
            <h2>Update Aktivitas</h2>
            <p>Perbarui data kegiatan dan peserta yang terlibat</p>
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
                defaultValue={activity.title}
                required
              />
            </div>
            <div className="field-group">
              <label htmlFor="activityClass">Pilih kelas</label>
              <select
                id="activityClass"
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                disabled={classesLoading}
                required
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
              <select
                id="activityStatus"
                defaultValue={activity.status === "Draf" ? "draft" : "publish"}
              >
                <option value="draft">Draft</option>
                <option value="publish">Publish</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="activityDate">Tanggal kegiatan</label>
              <input
                id="activityDate"
                type="date"
                defaultValue={activity.date}
                required
              />
            </div>
            <div className="field-group">
              <label htmlFor="activityTime">Waktu</label>
              <input
                id="activityTime"
                type="time"
                defaultValue={activity.time.replace(".", ":")}
                required
              />
            </div>
            <div className="field-group full">
              <label htmlFor="activityCaption">Caption / deskripsi</label>
              <textarea
                id="activityCaption"
                rows={4}
                defaultValue={activity.caption}
              />
            </div>
          </div>
          <h3>Peserta</h3>
          <fieldset className="student-tags">
            <legend>Pilih siswa yang hadir / terlihat</legend>
            <div className="tag-options">
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
                  <input
                    type="checkbox"
                    defaultChecked={activity.participants.includes(
                      student.name,
                    )}
                  />{" "}
                  {student.name}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="student-form-actions">
            <Link className="secondary-button" href="/dashboard/activities">
              Batal
            </Link>
            <button className="primary-button" type="submit">
              Perbarui Aktivitas
            </button>
          </div>
          {saved && (
            <p className="settings-save-message" role="status">
              Aktivitas berhasil diperbarui.
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
