"use client";

import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  activityPhotos,
  activityRequest,
  deleteActivityPhoto,
  saveActivityPhoto,
  type ActivityDetail,
  type ActivityPhoto,
} from "../activityPhotos";
import {
  loadActivityStudents,
  type ActivityStudent,
} from "../activityStudents";

function PhotoManager({ activityId }: { activityId: string }) {
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [photos, setPhotos] = useState<ActivityPhoto[]>([]);
  const [students, setStudents] = useState<ActivityStudent[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [retry, setRetry] = useState(0);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        if (!/^\d+$/.test(activityId)) {
          throw new Error("Pilih aktivitas dari daftar aktivitas.");
        }
        const detail = await activityRequest<ActivityDetail>(
          `/api/proxy/activities/${activityId}/`,
        );
        const classStudents = await loadActivityStudents(
          String(detail.class_id),
        );
        if (cancelled) return;
        const loadedPhotos = activityPhotos(detail);
        setActivity(detail);
        setPhotos(loadedPhotos);
        setSelectedId(loadedPhotos[0]?.id ?? "");
        setStudents(classStudents);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Aktivitas gagal dimuat.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [activityId, retry]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    if (!saved) return;
    const timeout = window.setTimeout(() => setSaved(false), 3200);
    return () => window.clearTimeout(timeout);
  }, [saved]);

  const selected = photos.find((photo) => photo.id === selectedId);
  const dirty = photos.some(
    (photo) =>
      photo.file ||
      photo.studentIds.join(",") !== photo.savedStudentIds.join(","),
  );

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activity) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      for (const [index, photo] of photos.entries()) {
        if (
          !photo.file &&
          photo.studentIds.join(",") === photo.savedStudentIds.join(",")
        )
          continue;
        const updated = await saveActivityPhoto(activity.id, photo, index);
        setPhotos((current) =>
          current.map((item) => (item.id === photo.id ? updated : item)),
        );
        setSelectedId((current) =>
          current === photo.id ? updated.id : current,
        );
      }
      setSaved(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Foto dan tag belum tersimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removePhoto(photo: ActivityPhoto) {
    if (saving) return;
    setError("");
    try {
      if (!photo.file) await deleteActivityPhoto(photo.id);
      if (photo.url.startsWith("blob:")) {
        URL.revokeObjectURL(photo.url);
        objectUrls.current = objectUrls.current.filter((url) => url !== photo.url);
      }
      setPhotos((current) => {
        const remaining = current.filter((item) => item.id !== photo.id);
        if (photo.id === selectedId) setSelectedId(remaining[0]?.id ?? "");
        return remaining;
      });
      setSaved(false);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Foto belum dapat dihapus.",
      );
    }
  }

  if (loading) {
    return (
      <main>
        <p className="empty-state">Memuat aktivitas...</p>
      </main>
    );
  }

  if (error && !activity) {
    return (
      <main>
        <div className="empty-state">
          <p>{error}</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setRetry((value) => value + 1)}
          >
            Coba lagi
          </button>
        </div>
      </main>
    );
  }

  if (!activity) return null;

  return (
    <main>
      <section className="panel student-manage">
        <div className="panel-heading">
          <div>
            <h2>Kelola Foto & Tag</h2>
            <p>{activity.name}</p>
          </div>
          <Link className="secondary-button" href="/dashboard/activities">
            Kembali
          </Link>
        </div>

        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}

        <form className="student-form" onSubmit={save}>
          <div className="privacy-notice">
            <p>
              <strong>Tag sesuai kelas</strong>
              <span>
                Pilih satu siswa dari kelas aktivitas untuk setiap foto.
              </span>
            </p>
          </div>

          <div className="existing-photo-heading">
            <div>
              <strong>Foto aktivitas</strong>
              <small>
                {photos.filter((photo) => !photo.file).length} foto tersimpan
                {photos.some((photo) => photo.file)
                  ? ` · ${photos.filter((photo) => photo.file).length} foto baru`
                  : ""}
              </small>
            </div>
            <label className="mini-upload" htmlFor="managePhotos">
              Tambah foto
              <input
                id="managePhotos"
                type="file"
                accept="image/*"
                multiple
                disabled={saving}
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  if (files.some((file) => !file.type.startsWith("image/"))) {
                    setError("Pilih file gambar untuk diunggah.");
                    return;
                  }
                  const added = files.map((file) => {
                    const url = URL.createObjectURL(file);
                    objectUrls.current.push(url);
                    return {
                      id: crypto.randomUUID(),
                      url,
                      caption: file.name,
                      studentIds: [],
                      savedStudentIds: [],
                      studentId: "",
                      savedStudentId: "",
                      file,
                    };
                  });
                  setPhotos((current) => [...current, ...added]);
                  if (added[0]) setSelectedId(added[0].id);
                  setSaved(false);
                  event.target.value = "";
                }}
              />
            </label>
          </div>

          {photos.length === 0 && (
            <p role="status">
              Belum ada foto. Tambahkan foto aktivitas untuk mulai menandai
              siswa.
            </p>
          )}

          <div className="managed-photo-grid">
            {photos.map((photo, index) => (
              <div className="managed-photo-wrap" key={photo.id}>
                <button
                  className={`managed-photo ${photo.id === selectedId ? "active" : ""}`}
                  type="button"
                  aria-label={`Pilih foto ${index + 1}`}
                  aria-pressed={photo.id === selectedId}
                  onClick={() => setSelectedId(photo.id)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {photo.url ? (
                    <img
                      src={photo.url}
                      alt={photo.caption || `Foto aktivitas ${index + 1}`}
                    />
                  ) : (
                    <span>📷</span>
                  )}
                  <small className="photo-tag-count">
                    {photo.studentIds.length ? `${photo.studentIds.length} tag` : "Belum ditag"}
                  </small>
                </button>
                <button
                  className="managed-photo-remove"
                  type="button"
                  aria-label={`Hapus foto ${index + 1}`}
                  title="Hapus foto"
                  disabled={saving}
                  onClick={() => void removePhoto(photo)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {selected && (
            <>
              <figure className="selected-activity-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {selected.url ? (
                  <img
                    src={selected.url}
                    alt={selected.caption || "Foto aktivitas terpilih"}
                  />
                ) : (
                  <p>Pratinjau foto tidak tersedia.</p>
                )}
                <figcaption>
                  Foto {photos.indexOf(selected) + 1} dari {photos.length}
                  {selected.caption ? ` · ${selected.caption}` : ""}
                </figcaption>
              </figure>

              <fieldset className="form-field student-tags">
                <legend>Siswa dalam foto yang dipilih</legend>
                <div className="tag-options">
                  {selected.studentIds.some((id) => !students.some((student) => student.id === id)) && (
                      <label>
                        <input type="checkbox" checked disabled readOnly />
                        <span>Siswa yang dipilih tidak lagi tersedia di kelas ini</span>
                      </label>
                    )}
                  {students.map((student) => (
                    <label key={student.id}>
                      <input
                        type="checkbox"
                        checked={selected.studentIds.includes(student.id)}
                        disabled={saving}
                        onChange={(event) => {
                          setPhotos((current) =>
                            current.map((photo) =>
                              photo.id === selectedId
                                ? {
                                    ...photo,
                                    studentIds: event.target.checked
                                      ? [...new Set([...photo.studentIds, student.id])]
                                      : photo.studentIds.filter((id) => id !== student.id),
                                    studentId: event.target.checked
                                      ? student.id
                                      : photo.studentId === student.id ? "" : photo.studentId,
                                  }
                                : photo,
                            ),
                          );
                          setSaved(false);
                        }}
                      />
                      <span>{student.name}</span>
                    </label>
                  ))}
                </div>
                {students.length === 0 && (
                  <p>Belum ada siswa yang tersedia di kelas ini.</p>
                )}
              </fieldset>
            </>
          )}

          <div className="student-form-actions">
            <Link className="secondary-button" href="/dashboard/activities">
              Batal
            </Link>
            <button
              className="primary-button"
              type="submit"
              disabled={saving || !dirty}
            >
              {saving ? "Menyimpan..." : "Simpan Foto & Tag"}
            </button>
          </div>

          {saved && (
            <p className="save-toast" role="status" aria-live="polite">
              Foto dan tag berhasil disimpan.
            </p>
          )}
        </form>
      </section>
    </main>
  );
}

function ManageActivity() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get("activity") ?? "";
  return <PhotoManager key={activityId} activityId={activityId} />;
}

export default function ManageActivityPage() {
  return (
    <Suspense fallback={<p role="status">Memuat aktivitas...</p>}>
      <ManageActivity />
    </Suspense>
  );
}
