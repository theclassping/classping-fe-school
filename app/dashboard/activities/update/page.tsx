"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { activities, type Activity } from "../activityData";
import { loadActivity } from "../activityApi";
import { ActivityClass, loadActivityClasses } from "../activityClasses";
import { ActivityStudent, loadActivityStudents } from "../activityStudents";

export default function UpdateActivityPage() {
  const [activity, setActivity] = useState<Activity>(activities[0]);
  const [classes, setClasses] = useState<ActivityClass[]>([]);
  const [classId, setClassId] = useState("");
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState("");
  const [students, setStudents] = useState<ActivityStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activityError, setActivityError] = useState("");
  useEffect(() => {
    const activityId = new URLSearchParams(window.location.search).get("activity");
    if (!activityId) {
      setActivityError("Activity ID tidak ditemukan.");
      setLoading(false);
      return;
    }

    loadActivity(activityId)
      .then((data) => {
        if (!data) {
          setActivityError("Aktivitas tidak ditemukan.");
          return;
        }
        setActivity({
          slug: String(data.id),
          title: data.name,
          avatar: "📷",
          className: data.class_name,
          classLabel: data.class_name,
          time: "-",
          date: data.activity_date,
          status: data.is_publish ? "Dipublikasi" : "Draf",
          caption: data.description,
          photos: data.activity_images?.length ?? 0,
          participants: data.activity_students.map((student) =>
            student.nickname ||
            [student.first_name, student.middle_name, student.last_name]
              .filter(Boolean)
              .join(" "),
          ),
          note: "",
        });
        setSelectedParticipantIds(data.activity_students.map((student) => String(student.id)));
      })
      .catch((error) => {
        console.error(error);
        setActivityError("Gagal mengambil detail aktivitas.");
      })
      .finally(() => setLoading(false));
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

  if (loading) return <main><section className="panel student-manage"><p>Memuat detail aktivitas...</p></section></main>;
  if (activityError) return <main><section className="panel student-manage"><p>{activityError}</p></section></main>;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("caption") ?? ""),
      activity_date: String(formData.get("activity_date") ?? ""),
      class_id: Number(classId),
      is_publish: formData.get("status") === "publish",
      student_ids: formData.getAll("student_ids").map(Number),
    };

    try {
      const response = await fetch(`/api/proxy/activities/${activity.slug}/`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok) throw new Error("Failed to update activity.");
      setSaved(true);
    } catch (error) {
      console.error(error);
      setActivityError(
        error instanceof Error ? error.message : "Failed to update activity.",
      );
    }
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
                name="name"
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
                name="status"
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
                name="activity_date"
                type="date"
                defaultValue={activity.date}
                required
              />
            </div>
            <div className="field-group full">
              <label htmlFor="activityCaption">Caption / deskripsi</label>
              <textarea
                id="activityCaption"
                name="caption"
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
                    name="student_ids"
                    value={student.id}
                    defaultChecked={selectedParticipantIds.includes(student.id)}
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
