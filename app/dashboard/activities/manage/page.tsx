"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { activityPhotos, activityRequest, saveActivityPhoto, type ActivityDetail, type ActivityPhoto } from "../activityPhotos";
import { loadActivityStudents, type ActivityStudent } from "../activityStudents";

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
        if (!/^\d+$/.test(activityId)) throw new Error("Pilih aktivitas dari daftar laporan aktivitas.");
        const detail = await activityRequest<ActivityDetail>(`/api/proxy/activities/${activityId}/`);
        const classStudents = await loadActivityStudents(String(detail.class_id));
        if (cancelled) return;
        const images = activityPhotos(detail);
        setActivity(detail);
        setPhotos(images);
        setSelectedId(images[0]?.id ?? "");
        setStudents(classStudents);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Aktivitas gagal dimuat.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [activityId, retry]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const selected = photos.find((photo) => photo.id === selectedId);
  const dirty = photos.some((photo) => photo.file || photo.studentId !== photo.savedStudentId);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activity) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      for (const [index, photo] of photos.entries()) {
        if (!photo.file && photo.studentId === photo.savedStudentId) continue;
        const updated = await saveActivityPhoto(activity.id, photo, index);
        // Preserve successful writes if a later request fails, avoiding duplicate uploads on retry.
        setPhotos((current) => current.map((item) => item.id === photo.id ? updated : item));
        setSelectedId((current) => current === photo.id ? updated.id : current);
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Foto dan tag belum tersimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main><section className="panel student-manage">
      <div className="panel-heading">
        <div><h2>Kelola Foto & Tag</h2><p>{activity?.name ?? "Pilih foto dan siswa yang terlihat pada dokumentasi aktivitas."}</p></div>
        <Link className="secondary-button" href="/dashboard/activities">Kembali</Link>
      </div>
      {error && <div className="form-error" role="alert">{error}{!activity && <button className="secondary-button" type="button" onClick={() => setRetry((value) => value + 1)}>Coba lagi</button>}</div>}
      {loading ? <p role="status">Memuat foto aktivitas...</p> : activity && (
        <form className="student-form" onSubmit={save}>
          <div className="privacy-notice"><p><strong>Tag sesuai kelas</strong><span>Pilih satu siswa dari kelas aktivitas untuk setiap foto.</span></p></div>
          <div className="existing-photo-heading">
            <div><strong>Foto aktivitas</strong><small>{photos.filter((photo) => !photo.file).length} foto tersimpan{photos.some((photo) => photo.file) ? ` · ${photos.filter((photo) => photo.file).length} foto baru` : ""}</small></div>
            <label className="mini-upload" htmlFor="managePhotos">Tambah foto
              <input id="managePhotos" type="file" accept="image/*" multiple disabled={saving} onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                if (files.some((file) => !file.type.startsWith("image/"))) { setError("Pilih file gambar untuk diunggah."); return; }
                const added = files.map((file) => {
                  const url = URL.createObjectURL(file);
                  objectUrls.current.push(url);
                  return { id: crypto.randomUUID(), url, caption: file.name, studentId: "", savedStudentId: "", file };
                });
                setPhotos((current) => [...current, ...added]);
                if (added[0]) setSelectedId(added[0].id);
                setSaved(false);
                event.target.value = "";
              }} />
            </label>
          </div>
          {photos.length === 0 && <p role="status">Belum ada foto. Tambahkan foto aktivitas untuk mulai menandai siswa.</p>}
          <div className="managed-photo-grid">
            {photos.map((photo, index) => (
              <button className={`managed-photo ${photo.id === selectedId ? "active" : ""}`} type="button" key={photo.id} aria-label={`Pilih foto ${index + 1}`} aria-pressed={photo.id === selectedId} onClick={() => setSelectedId(photo.id)}>
                {/* Signed media URLs come from the API and may expire. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {photo.url ? <img src={photo.url} alt={photo.caption || `Foto aktivitas ${index + 1}`} /> : <span>📷</span>}
                <small className="photo-tag-count">{photo.studentId ? "1 tag" : "Belum ditag"}</small>
              </button>
            ))}
          </div>
          {selected && <>
            <figure className="selected-activity-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {selected.url ? <img src={selected.url} alt={selected.caption || `Foto ${photos.indexOf(selected) + 1}`} /> : <p>Pratinjau foto tidak tersedia.</p>}
              <figcaption>Foto {photos.indexOf(selected) + 1} dari {photos.length}{selected.caption ? ` · ${selected.caption}` : ""}</figcaption>
            </figure>
            <div className="form-field">
              <label htmlFor="photo-student">Siswa dalam foto yang dipilih</label>
              <select id="photo-student" value={selected.studentId} disabled={saving} onChange={(event) => {
                const studentId = event.target.value;
                setPhotos((current) => current.map((photo) => photo.id === selectedId ? { ...photo, studentId } : photo));
                setSaved(false);
              }}>
                <option value="">Belum ditag</option>
                {selected.studentId && !students.some((student) => student.id === selected.studentId) && <option value={selected.studentId} disabled>Siswa tidak lagi tersedia di kelas ini</option>}
                {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
              </select>
              {students.length === 0 && <p>Belum ada siswa yang tersedia di kelas ini.</p>}
            </div>
          </>}
          <div className="student-form-actions">
            <Link className="secondary-button" href="/dashboard/activities">Batal</Link>
            <button className="primary-button" type="submit" disabled={saving || !dirty}>{saving ? "Menyimpan..." : "Simpan Foto & Tag"}</button>
          </div>
          {saved && <p className="settings-save-message" role="status">Foto dan tag berhasil disimpan.</p>}
        </form>
      )}
    </section></main>
  );
}

function ManageActivity() {
  const searchParams = useSearchParams();
  const activityId = searchParams.get("activity") ?? "";
  return <PhotoManager key={activityId} activityId={activityId} />;
}

export default function ManageActivityPage() {
  return <Suspense fallback={<p role="status">Memuat aktivitas...</p>}><ManageActivity /></Suspense>;
}
