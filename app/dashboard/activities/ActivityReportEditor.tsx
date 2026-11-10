"use client";

import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X, ArrowLeft } from "lucide-react";
import FocusedActivityPhotos from "./FocusedActivityPhotos";
import { ActivityDraftController, reportRequest } from "./ActivityDraftController";
import { draftFromRecord, emptyDraft, reportIssues, taggedStudents, selectReportPhoto, removeReportPhoto, type ReportDraft, type ReportPhoto, type ReportRecord } from "./activityEditorState";
import { readDraft, removeDraft } from "./activityDraftStore";
import { loadActivityClasses, type ActivityClass } from "./activityClasses";
import { loadActivityStudents, type ActivityStudent } from "./activityStudents";
import { loadActivityTeachers, type ActivityTeacher } from "./activityTeachers";
import { notifySaved } from "@/lib/notifications";
import { useImageRefresh } from "@/lib/useImageRefresh";
import { randomId } from "@/lib/uuid";
import "./activityEditor.css";

function PhotoPreview({ photo, close, onImageError }: { photo: ReportPhoto; close: () => void; onImageError: (event: SyntheticEvent<HTMLImageElement>) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="report-photo-dialog" aria-label="Pratinjau foto aktivitas" onCancel={close} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <button type="button" onClick={close} aria-label="Tutup pratinjau"><X size={22} /></button>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={photo.url} alt="Pratinjau foto kegiatan" onError={onImageError} />
  </dialog>;
}

export default function ActivityReportEditor({ editing = false }: { editing?: boolean }) {
  const router = useRouter();
  const [, render] = useReducer(n => n + 1, 0);
  const [controller, setController] = useState<ActivityDraftController | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [classes, setClasses] = useState<ActivityClass[]>([]);
  const [students, setStudents] = useState<ActivityStudent[]>([]);
  const [teachers, setTeachers] = useState<ActivityTeacher[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string>();
  const [showIssues, setShowIssues] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const [retryLoad, setRetryLoad] = useState(0);
  const objectUrls = useRef(new Map<string, string>());
  const reviewHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let cancelled = false;
    const urls = objectUrls.current;
    let activeController: ActivityDraftController | null = null;
    async function load() {
      await Promise.resolve();
      if (cancelled) return;
      setReady(false); setLoadError("");
      const [session, availableClasses] = await Promise.all([
        reportRequest<{ user?: { id: number; branch_id?: number } }>("/api/auth/session"), loadActivityClasses(),
      ]);
      if (!session.user?.id) throw new Error("Sesi tidak tersedia. Silakan masuk kembali.");
      const id = editing ? new URLSearchParams(window.location.search).get("activity") : null;
      if (editing && (!id || !/^\d+$/.test(id))) throw new Error("Pilih aktivitas dari daftar untuk melanjutkan.");
      const scope = `activity:${session.user.id}:${session.user.branch_id || "school"}`;
      let key = `${scope}:${id || "new"}`;
      let storageError = false;
      let stored = await readDraft(key).catch(() => { storageError = true; return undefined; });
      // A newly created report keeps its recovery entry while the list links to its server ID.
      if (editing && !stored) {
        const createdHere = await readDraft(`${scope}:new`).catch(() => undefined);
        if (createdHere?.draft.activityId === Number(id)) { stored = createdHere; key = createdHere.key; }
      }
      const activityId = id || stored?.draft.activityId;
      const remote = activityId ? await reportRequest<ReportRecord>(`/api/proxy/activities/${activityId}/`).catch(error => {
        if (stored && (error.status === 0 || !navigator.onLine)) return undefined;
        if (!editing && error.status === 404) return null;
        throw error;
      }) : undefined;
      // The activity behind this Tambah aktivitas draft was deleted (possibly on another device): start a new report.
      if (remote === null && stored) { await removeDraft(key).catch(() => {}); stored = undefined; }
      const hasUnsynced = !!stored && (stored.draft.version !== stored.draft.syncedVersion || !!stored.pending || stored.draft.photos.some(p => p.upload !== "complete"));
      const oldPublishedNewDraft = !editing && remote?.is_publish && !hasUnsynced;
      let draft = stored && (hasUnsynced || !remote) ? stored.draft : remote ? draftFromRecord(remote) : emptyDraft();
      if (stored && remote && !hasUnsynced) {
        draft = { ...draft, expanded: stored.draft.expanded, review: stored.draft.review,
          photos: draft.photos.map(photo => ({ ...photo, key: stored.draft.photos.find(p => p.id === photo.id)?.key || photo.key })) };
      }
      if (oldPublishedNewDraft) { await removeDraft(key); draft = emptyDraft(); }
      if (cancelled) return;
      draft = { ...draft, photos: draft.photos.map(photo => {
        const current = remote?.activity_images.find(p => p.id === photo.id || p.client_id === photo.key);
        if (photo.file) { const url = URL.createObjectURL(photo.file); urls.set(photo.key, url); return { ...photo, url, upload: photo.upload === "uploading" ? "pending" : photo.upload }; }
        return { ...photo, url: current?.image_url || photo.url, urlRefreshedAt: current?.image_url ? Date.now() : photo.urlRefreshedAt };
      }) };
      const c = new ActivityDraftController(key, draft, render, stored && !oldPublishedNewDraft ? stored.pending : undefined, session.user.branch_id);
      // A replay of an ambiguous committed request must reach the server before deciding it conflicts.
      if (hasUnsynced && remote && stored?.draft.revision !== remote.revision && !stored?.pending) {
        c.conflict = true; c.error = "Versi server telah berubah. Perubahan di perangkat ini tetap tersimpan.";
      }
      c.localFailed = storageError;
      activeController = c; setController(c);
      setClasses(availableClasses); setRecovered(!!stored && hasUnsynced); setReady(true);
      c.start();
    }
    void load().catch(error => { if (!cancelled) setLoadError(error instanceof Error ? error.message : "Gagal memuat aktivitas."); });
    return () => { cancelled = true; activeController?.dispose(); urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); };
  }, [editing, retryLoad]);

  const c = controller;
  const draft = ready ? c?.draft : undefined;
  const classId = draft?.classId || "";
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setStudents([]); setTeachers([]); setRosterError("");
      if (!classId) { setRosterLoading(false); return; }
      setRosterLoading(true);
      const [s, t] = await Promise.all([loadActivityStudents(classId), loadActivityTeachers(classId)]);
      if (cancelled) return;
      setStudents(s); setTeachers(t);
      if (!controller?.draft.teacherId && t.length === 1) controller?.change(d => ({ ...d, teacherId: t[0].id }), true);
    }).catch(error => { if (!cancelled) setRosterError(error.message); }).finally(() => { if (!cancelled) setRosterLoading(false); });
    return () => { cancelled = true; };
  }, [classId, retryLoad, controller]);

  useEffect(() => {
    if (!ready || !c) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { if (c.localFailed || c.localPending > 0) event.preventDefault(); };
    const save = () => { void c.flushLocal().catch(() => {}); void c.sync().catch(() => {}); };
    const hidden = () => { if (document.visibilityState === "hidden") save(); };
    const online = () => { c.uploadPhotos(); save(); render(); };
    const offline = () => render();
    const intercept = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const target = new URL(anchor.href, location.href);
      if (target.pathname === location.pathname && target.search === location.search) return;
      event.preventDefault(); event.stopPropagation();
      void c.flushLocal().then(() => { router.push(target.pathname + target.search); }).catch(error => setActionError(error.message));
    };
    window.addEventListener("beforeunload", beforeUnload); window.addEventListener("online", online); window.addEventListener("offline", offline);
    document.addEventListener("visibilitychange", hidden); document.addEventListener("click", intercept, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); window.removeEventListener("online", online); window.removeEventListener("offline", offline); document.removeEventListener("visibilitychange", hidden); document.removeEventListener("click", intercept, true); };
  }, [ready, c, router]);

  const onImageError = useImageRefresh(useCallback(async () => {
    const activityId = controller?.draft.activityId;
    if (!controller || !activityId || !navigator.onLine) return;
    const remote = await reportRequest<ReportRecord>(`/api/proxy/activities/${activityId}/`);
    controller.change(d => ({ ...d, photos: d.photos.map(photo => {
      if (photo.file) return photo;
      const current = remote.activity_images.find(p => p.id === photo.id || p.client_id === photo.key);
      return current?.image_url ? { ...photo, url: current.image_url, urlRefreshedAt: Date.now() } : photo;
    }) }), false, false);
  }, [controller]));

  if (loadError) return <main><section className="panel report-editor"><h2>Aktivitas belum dapat dibuka</h2><p role="alert">{loadError}</p><button className="secondary-button" onClick={() => setRetryLoad(n => n + 1)}>Coba lagi</button> <Link href="/login">Masuk kembali</Link> · <Link href="/dashboard/activities">Daftar aktivitas</Link></section></main>;
  if (!draft || !c) return <main><p role="status">Memuat laporan aktivitas…</p></main>;
  const tagged = taggedStudents(draft);
  const names = new Map(students.map(s => [s.id, s.name]));
  const issues = reportIssues(draft);
  const photoPending = draft.photos.some(p => p.upload !== "complete");
  const fullySaved = !!draft.activityId && draft.version === draft.syncedVersion && !c.pending && !photoPending && !c.error;
  const status = c.localFailed ? "Penyimpanan perangkat gagal · Jangan tutup halaman" : c.saving ? "Menyimpan…" : fullySaved ? (draft.published ? "Aktivitas dipublikasikan" : "Draft tersimpan") : c.localPending ? "Menyimpan di perangkat…" : "Tersimpan di perangkat · Menunggu sinkronisasi";
  const change = (update: (d: ReportDraft) => ReportDraft, urgent = false, content = true) => { setActionError(""); c.change(d => { const next = update(d); return { ...next, review: content ? false : next.review }; }, urgent, content); };
  const field = (key: "title" | "teacherId" | "date" | "description", value: string) => change(d => ({ ...d, [key]: value }));
  const chooseClass = (value: string) => {
    if (value === draft.classId) return;
    if ((tagged.length || draft.participants.length) && !window.confirm("Mengganti kelas akan menghapus tag foto dan pilihan peserta kelas sebelumnya. Foto dan catatan tetap disimpan dalam draft. Lanjutkan?")) return;
    change(d => ({ ...d, classId: value, teacherId: "", participants: [], photos: d.photos.map(p => p.tagState === "individual" ? { ...p, studentId: "", tagState: "unreviewed" } : p) }), true);
  };
  const selectStudent = (key: string, value: string) => change(d => ({ ...d, expanded: value && value !== "group" ? key : d.expanded,
    photos: d.photos.map(p => p.key === key ? { ...p, studentId: value === "group" ? "" : value, tagState: value === "group" ? "group" : value ? "individual" : "unreviewed" } : p) }), true);
  const addPhotos = (files: File[]) => {
    if (files.some(f => !f.type.startsWith("image/"))) { setActionError("Pilih file gambar untuk diunggah."); return; }
    const photos: ReportPhoto[] = files.map(file => { const key = randomId(); const url = URL.createObjectURL(file); objectUrls.current.set(key, url); return { key, file, url, upload: "pending", tagState: "group", studentId: "", caption: "" }; });
    change(d => ({ ...d, photos: [...d.photos, ...photos], expanded: d.expanded || photos[0]?.key || "" }), true);
  };
  const removePhoto = (photo: ReportPhoto) => {
    if (!window.confirm("Hapus foto ini dari laporan? Catatan siswa tetap disimpan dalam draft.")) return;
    change(d => removeReportPhoto(d, photo.key), true);
  };
  const reorder = (index: number, offset: number) => change(d => { const photos = [...d.photos]; [photos[index], photos[index + offset]] = [photos[index + offset], photos[index]]; return { ...d, photos }; }, true);
  const saveDraft = async (close = false) => {
    if (draft.published && !window.confirm("Simpan sebagai draft dan sembunyikan aktivitas ini dari wali murid sampai dipublikasikan kembali?")) return;
    setBusy(true); setActionError("");
    try {
      if (c.draft.published) c.change(d => ({ ...d, published: false }), false);
      try { await c.sync(); } catch (error) { await c.flushLocal(); if (!close) throw error; }
      await c.flushLocal();
      if (close) { notifySaved({ title: "Draft aktivitas disimpan", copy: c.error || c.draft.version !== c.draft.syncedVersion ? "Perubahan tersimpan di perangkat ini dan dapat dilanjutkan nanti." : "Aktivitas dapat dilanjutkan dari daftar draft.", href: "/dashboard/activities" }); router.push("/dashboard/activities"); }
    } catch (error) { setActionError(error instanceof Error ? error.message : "Draft belum tersimpan."); }
    finally { setBusy(false); }
  };
  const review = () => {
    setShowIssues(true);
    if (issues.length) {
      const firstIncomplete = draft.photos.find(photo => photo.upload !== "complete" || photo.tagState === "unreviewed" || (photo.tagState === "individual" && !draft.remarks[photo.studentId]?.trim()));
      if (firstIncomplete) c.change(d => ({ ...d, expanded: firstIncomplete.key, review: false }), false, false);
      setActionError(issues.join(" "));
      return;
    }
    c.change(d => ({ ...d, review: true }), false, false);
    requestAnimationFrame(() => reviewHeading.current?.focus());
  };
  const publish = async () => {
    setBusy(true); setActionError("");
    try { await c.sync(true); await c.finish().catch(() => {}); notifySaved({ title: "Aktivitas dipublikasikan", copy: `${c.draft.title} kini dapat dilihat wali murid sesuai aksesnya.`, href: "/dashboard/activities" }); router.push("/dashboard/activities"); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Gagal mempublikasikan aktivitas."); }
    finally { setBusy(false); }
  };
  const reloadServer = async () => {
    if (!window.confirm("Muat versi server? Perubahan lokal yang belum tersinkronisasi akan dibuang. Salin catatan yang ingin dipertahankan terlebih dahulu.")) return;
    await removeDraft(c.key); setRetryLoad(n => n + 1);
  };
  const previewPhoto = draft.photos.find(p => p.key === preview);

  return <main><section className="panel report-editor">
    <header className="report-heading"><div><Link className="report-back" href="/dashboard/activities"><ArrowLeft size={16} /> Laporan aktivitas</Link><h2>{editing ? "Edit aktivitas" : "Tambah aktivitas"}</h2><p role="status" aria-live="polite" className={c.localFailed ? "report-error" : "report-save-status"}>{status}</p></div><button className="secondary-button" disabled={busy} onClick={() => void saveDraft()}>Simpan draft</button></header>
    {recovered && <p className="report-recovery" role="status">Draft sebelumnya dipulihkan. Anda dapat melanjutkan dari foto terakhir.</p>}
    {draft.published && <p className="report-recovery">Aktivitas ini sudah dipublikasikan. Perubahan disimpan di perangkat sampai Anda meninjau dan mempublikasikan pembaruan.</p>}
    {(actionError || c.error || c.localFailed) && <div className="report-alert" role="alert"><p>{actionError || c.error || "Penyimpanan perangkat tidak tersedia. Jangan tutup halaman ini sebelum berhasil menyimpan ke server."}</p>{c.conflict ? <button type="button" className="secondary-button" onClick={() => void reloadServer()}>Muat versi server</button> : <button type="button" className="secondary-button" disabled={busy} onClick={() => void saveDraft()}>Coba simpan lagi</button>}</div>}
    <fieldset disabled={busy} className="report-body">
    {draft.review ? <section className="report-review"><h3 ref={reviewHeading} tabIndex={-1}>Pratinjau laporan</h3><p className="report-preview-hint">Belum dipublikasikan. Periksa laporan sebelum menekan Publikasikan.</p><h4>{draft.title}</h4><p>{classes.find(k => k.id === draft.classId)?.label} · {draft.date}</p><p className="report-description">{draft.description}</p><p>{draft.photos.length} foto · {tagged.length} siswa · {draft.photos.filter(p => p.tagState === "group").length} foto bersama</p>
      <div className="report-review-photos">{draft.photos.map((photo, i) => <button type="button" key={photo.key} onClick={() => setPreview(photo.key)} aria-label={`Pratinjau foto ${i + 1}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={`Foto ${i + 1}`} onError={onImageError} /><span>{photo.tagState === "group" ? "Foto bersama" : photo.tagState === "legacy" ? "Foto lama" : names.get(photo.studentId) || "Siswa"}</span>
      </button>)}</div>
      {tagged.map(id => <div className="report-review-note" key={id}><strong>Catatan untuk {names.get(id) || "siswa"}</strong><p>{draft.remarks[id]}</p></div>)}
      <p className="report-privacy">Foto individual dan catatan hanya untuk wali siswa terkait. Foto bersama dibagikan kepada wali peserta kegiatan.</p>
      <button className="secondary-button" type="button" onClick={() => c.change(d => ({ ...d, review: false }), false, false)}>Kembali mengedit</button>
    </section> : <>
      <details className="report-details" open={!draft.photos.length || !draft.classId} key={draft.photos.length ? "with-photos" : "empty"}><summary>Detail kegiatan <span>{draft.title || "Judul, kelas, guru, dan tanggal"}</span></summary><div className="report-fields">
        <label>Judul aktivitas<input value={draft.title} maxLength={255} placeholder="Contoh: Menggunting bentuk" onChange={e => field("title", e.target.value)} onBlur={() => c.schedule(true)} /></label>
        <label>Kelas<select aria-label="Kelas" value={draft.classId} onChange={e => chooseClass(e.target.value)}><option value="">Pilih kelas</option>{classes.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}</select></label>
        <label>Guru<select aria-label="Guru" disabled={!draft.classId || rosterLoading} value={draft.teacherId} onChange={e => field("teacherId", e.target.value)}><option value="">{rosterLoading ? "Memuat guru…" : "Pilih guru"}</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
        <label>Tanggal kegiatan<input type="date" value={draft.date} onChange={e => field("date", e.target.value)} /></label>
        <label className="report-full">Deskripsi kegiatan<textarea rows={3} value={draft.description} placeholder="Ceritakan kegiatan kelas secara umum…" onChange={e => field("description", e.target.value)} onBlur={() => c.schedule(true)} /></label>
      </div></details>
      {rosterError && <p className="report-error" role="alert">{rosterError} <button type="button" onClick={() => setRetryLoad(n => n + 1)}>Coba lagi</button></p>}
      <div className="report-photo-heading"><div><h3>Foto kegiatan</h3><p>{tagged.length} siswa · {draft.photos.filter(p => p.tagState === "group").length} foto bersama</p></div><label className="report-add"><ImagePlus size={18} /> Tambah foto<input type="file" multiple accept="image/*" onChange={e => { addPhotos(Array.from(e.target.files || [])); e.target.value = ""; }} /></label></div>
      {!draft.photos.length && <div className="report-empty"><ImagePlus size={32} /><p>Tambahkan foto, lalu pilih nama siswa atau Foto bersama.</p><small>Catatan cukup ditulis sekali untuk setiap siswa.</small></div>}
      <FocusedActivityPhotos draft={draft} students={students} rosterLoading={rosterLoading} rosterError={rosterError} showIssues={showIssues}
        onSelect={index => c.change(d => selectReportPhoto(d, index), false, false)}
        onStudentChange={selectStudent}
        onRemarkChange={(studentId, value) => change(d => ({ ...d, remarks: { ...d.remarks, [studentId]: value } }))}
        onBlur={() => c.schedule(true)}
        onRetry={key => change(d => ({ ...d, photos: d.photos.map(photo => photo.key === key ? { ...photo, upload: "pending", error: undefined } : photo) }), true)}
        onPreview={photo => setPreview(photo.key)} onRemove={removePhoto} onMove={reorder} onImageError={onImageError} />
      <details className="report-participants"><summary>Peserta kegiatan <span>{new Set([...draft.participants, ...tagged]).size} siswa</span></summary><p>Siswa yang ditandai otomatis menjadi peserta. Tambahkan peserta lain untuk menerima laporan dan foto bersama.</p><div>{students.map(s => <label key={s.id}><input type="checkbox" checked={draft.participants.includes(s.id) || tagged.includes(s.id)} disabled={tagged.includes(s.id)} onChange={e => change(d => ({ ...d, participants: e.target.checked ? [...d.participants, s.id] : d.participants.filter(id => id !== s.id) }), true)} /><span>{s.name}{tagged.includes(s.id) && <small>Ditandai di foto</small>}</span></label>)}</div></details>
    </>}
    </fieldset>
    <footer className="report-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => void saveDraft(true)}>Simpan &amp; tutup</button>{draft.review ? <button className="primary-button" disabled={busy || c.conflict || issues.length > 0} onClick={() => void publish()}>{busy ? "Mempublikasikan…" : "Publikasikan"}</button> : <button className="primary-button" disabled={busy || c.conflict} onClick={review}>Pratinjau laporan</button>}</footer>
    {previewPhoto && <PhotoPreview key={previewPhoto.key} photo={previewPhoto} close={() => setPreview(undefined)} onImageError={onImageError} />}
  </section></main>;
}
