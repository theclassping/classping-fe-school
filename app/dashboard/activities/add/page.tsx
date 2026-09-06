"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ActivityClass, loadActivityClasses } from "../activityClasses";
import { ActivityStudent, loadActivityStudents } from "../activityStudents";
import { ActivityTeacher, loadActivityTeachers } from "../activityTeachers";

export default function AddActivityPage() {
  const router = useRouter();
  const [saved, setSaved] = useState("");
  const [classes, setClasses] = useState<ActivityClass[]>([]);
  const [classId, setClassId] = useState("");
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState("");
  const [students, setStudents] = useState<ActivityStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");
  const [teachers, setTeachers] = useState<ActivityTeacher[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teachersError, setTeachersError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    setTeachers([]);
    setTeacherId("");
    setTeachersError("");
    if (!classId) return;

    setStudentsLoading(true);
    loadActivityStudents(classId)
      .then(setStudents)
      .catch((error) => {
        console.error(error);
        setStudentsError("Failed to load students for this class.");
      })
      .finally(() => setStudentsLoading(false));

    setTeachersLoading(true);
    loadActivityTeachers(classId)
      .then(setTeachers)
      .catch((error) => {
        console.error(error);
        setTeachersError("Failed to load teachers for this class.");
      })
      .finally(() => setTeachersLoading(false));
  }, [classId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSaved("");

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const selectedStudentIds = formData
        .getAll("student_ids")
        .map((studentId) => Number(studentId))
        .filter((studentId) => Number.isInteger(studentId));

      formData.delete("student_ids");
      selectedStudentIds.forEach((studentId) => {
        formData.append("student_ids", String(studentId));
      });
      formData.set("class_teacher_id", teacherId);
      formData.set("status", "publish");
      formData.set("class_id", classId);

      const response = await fetch("/api/proxy/activities/", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "Failed to publish activity.",
        );
      }

      router.push("/dashboard/activities");
    } catch (error) {
      console.error(error);
      setSaved(
        error instanceof Error ? error.message : "Failed to publish activity.",
      );
    } finally {
      setSubmitting(false);
    }
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
                name="name"
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
              <label htmlFor="activityTeacher">Teacher</label>
              <select
                id="activityTeacher"
                value={teacherId}
                onChange={(event) => setTeacherId(event.target.value)}
                required
                disabled={!classId || teachersLoading}
              >
                <option value="">
                  {teachersLoading ? "Memuat guru..." : "Pilih guru"}
                </option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
              {teachersError && (
                <small className="form-error">{teachersError}</small>
              )}
            </div>
            <div className="field-group">
              <label htmlFor="activityDate">Tanggal kegiatan</label>
              <input
                id="activityDate"
                name="activity_date"
                type="date"
                defaultValue="2026-08-27"
                required
              />
            </div>
            <div className="field-group">
              <label htmlFor="activityTime">Waktu</label>
              <input
                id="activityTime"
                name="time"
                type="time"
                defaultValue="09:00"
                required
              />
            </div>
            <div className="field-group full">
              <label htmlFor="activityCaption">Caption / deskripsi</label>
              <textarea id="activityCaption" name="caption" rows={4} />
            </div>
          </div>
          <h3>Unggah Foto</h3>
          <label className="upload-zone" htmlFor="activityPhotos">
            <strong>Pilih foto aktivitas</strong>
            <span>Format JPG/PNG, boleh lebih dari satu file</span>
            <input
              id="activityPhotos"
              name="photos"
              type="file"
              accept="image/*"
              multiple
            />
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
                  <input
                    name="student_ids"
                    type="checkbox"
                    value={student.id}
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
            <button
              className="primary-button"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Mempublikasikan..." : "Publikasikan"}
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
