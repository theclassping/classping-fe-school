"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadActivity, type ActivityDetailRecord } from "../activityApi";
import {
  loadActivityStudents,
  type ActivityStudent,
} from "../activityStudents";

export default function ManageActivityPage() {
  const [activity, setActivity] = useState<ActivityDetailRecord | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [students, setStudents] = useState<ActivityStudent[]>([]);

  useEffect(() => {
    const activityId = new URLSearchParams(window.location.search).get(
      "activity",
    );

    if (!activityId) {
      setError("Activity ID is missing.");
      setLoading(false);
      return;
    }

    const selectedActivityId = activityId;

    async function loadManageData() {
      try {
        const data = await loadActivity(selectedActivityId);
        if (!data) {
          setError("Activity not found.");
          return;
        }
        setActivity(data);

        setStudents(await loadActivityStudents(String(data.class_id)));
      } catch (loadError) {
        console.error(loadError);
        setError("Failed to load activity.");
      } finally {
        setLoading(false);
      }
    }

    void loadManageData();
  }, []);

  if (loading) {
    return (
      <main>
        <p className="empty-state">Loading activity...</p>
      </main>
    );
  }

  if (error || !activity) {
    return (
      <main>
        <div className="empty-state">
          <p>{error || "Activity not found."}</p>
          <Link className="secondary-button" href="/dashboard/activities">
            Kembali
          </Link>
        </div>
      </main>
    );
  }

  const selectedImage = activity.activity_images[selectedImageIndex];
  const activityStudentIds = new Set(
    activity.activity_students.map((student) => student.id),
  );

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
              <small>{activity.activity_images.length} foto tersimpan</small>
            </div>
            <label className="mini-upload" htmlFor="managePhotos">
              Tambah foto
              <input id="managePhotos" type="file" accept="image/*" multiple />
            </label>
          </div>
          <div className="managed-photo-grid">
            {activity.activity_images.map((image, index) => (
              <button
                className={`managed-photo ${index === selectedImageIndex ? "active" : ""}`}
                type="button"
                key={image.id}
                onClick={() => setSelectedImageIndex(index)}
                aria-label={`Pilih foto ${index + 1}`}
              >
                {image.image_url ? (
                  <img src={image.image_url} alt={`Foto ${index + 1}`} />
                ) : (
                  <span>📷</span>
                )}
                <small className="photo-tag-count">
                  {image.student_id ? "1 tag" : "Belum ditag"}
                </small>
              </button>
            ))}
            {activity.activity_images.length === 0 && (
              <p className="empty-state">No photos uploaded.</p>
            )}
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
                <label key={student.id}>
                  <input
                    type="checkbox"
                    defaultChecked={activityStudentIds.has(Number(student.id))}
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
