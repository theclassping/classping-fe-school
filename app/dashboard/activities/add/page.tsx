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
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<
    Array<{ file: File; url: string }>
  >([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const previews = selectedPhotos.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPhotoPreviews(previews);

    return () => previews.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [selectedPhotos]);

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

  async function uploadActivityImages(files: File[]) {
    const fileKeys: string[] = [];

    for (const file of files) {
      const presignResponse = await fetch("/api/proxy/media/presign", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
          expires_in: 3600,
        }),
      });

      if (presignResponse.status === 401) {
        window.location.href = "/login";
        return [];
      }

      if (!presignResponse.ok) {
        throw new Error("Failed to prepare image upload.");
      }

      const { file_key: fileKey, presigned_url: presignedUrl } =
        (await presignResponse.json()) as {
          file_key?: string;
          presigned_url?: string;
        };

      if (!fileKey || !presignedUrl) {
        throw new Error("Image upload did not return a usable upload URL.");
      }

      const uploadResponse = await fetch(presignedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload ${file.name}.`);
      }

      fileKeys.push(fileKey);
    }

    return fileKeys;
  }

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
      const imageFiles = formData
        .getAll("photos")
        .filter(
          (value): value is File => value instanceof File && value.size > 0,
        );
      const imageKeys = await uploadActivityImages(imageFiles);
      const activityPayload = {
        class_teacher_id: Number(teacherId),
        class_id: Number(classId),
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("caption") ?? ""),
        activity_date: String(formData.get("activity_date") ?? ""),
        is_publish: true,
        activity_images: imageKeys.map((fileKey) => ({
          image_data: fileKey,
        })),
        student_ids: selectedStudentIds,
      };

      const response = await fetch("/api/proxy/activities/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityPayload),
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
              onChange={(event) =>
                setSelectedPhotos(Array.from(event.target.files ?? []))
              }
            />
          </label>
          {photoPreviews.length > 0 && (
            <div className="upload-preview" aria-label="Preview foto aktivitas">
              {photoPreviews.map(({ file, url }) => (
                <div
                  className="upload-preview-item"
                  key={`${file.name}-${file.lastModified}`}
                >
                  <img src={url} alt={`Preview ${file.name}`} />
                  <small title={file.name}>{file.name}</small>
                </div>
              ))}
            </div>
          )}
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
