"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight,
  Grid2X2, Maximize2, MoreHorizontal, Users, X,
} from "lucide-react";
import type { ActivityStudent } from "./activityStudents";
import { activePhotoIndex, type ReportDraft, type ReportPhoto } from "./activityEditorState";
import "./focusedActivityPhotos.css";

type Props = {
  draft: ReportDraft;
  students: ActivityStudent[];
  rosterLoading: boolean;
  rosterError: string;
  showIssues: boolean;
  onSelect: (index: number) => void;
  onStudentChange: (key: string, value: string) => void;
  onRemarkChange: (studentId: string, value: string) => void;
  onBlur: () => void;
  onRetry: (key: string) => void;
  onPreview: (photo: ReportPhoto) => void;
  onRemove: (photo: ReportPhoto) => void;
  onMove: (index: number, offset: number) => void;
};

function photoStatus(photo: ReportPhoto, remarks: Record<string, string>) {
  if (photo.tagState === "group") return "Foto bersama";
  if (photo.tagState === "legacy") return "Foto lama";
  if (photo.tagState === "unreviewed") return "Perlu dicek";
  return remarks[photo.studentId]?.trim() ? "Lengkap" : "Perlu catatan";
}

function PhotoOverview({ draft, students, close, select }: {
  draft: ReportDraft;
  students: ActivityStudent[];
  close: () => void;
  select: (index: number) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const names = new Map(students.map(student => [student.id, student.name]));
  const selected = activePhotoIndex(draft);
  useEffect(() => { dialog.current?.showModal(); }, []);

  return <dialog ref={dialog} className="focus-overview" aria-labelledby="focus-overview-title"
    onCancel={close} onClick={event => { if (event.target === event.currentTarget) close(); }}>
    <header>
      <div><h3 id="focus-overview-title">Semua foto</h3><p>Pilih foto untuk melanjutkan.</p></div>
      <button type="button" onClick={close} aria-label="Tutup semua foto"><X size={22} /></button>
    </header>
    <div className="focus-overview-grid">
      {draft.photos.map((photo, index) => {
        const name = photo.tagState === "individual" ? names.get(photo.studentId) || "Siswa" : photoStatus(photo, draft.remarks);
        return <button type="button" key={photo.key} aria-current={index === selected ? "true" : undefined}
          aria-label={`Buka foto ${index + 1}: ${name}, ${photoStatus(photo, draft.remarks)}`}
          onClick={() => { select(index); close(); }}>
          <span className="focus-overview-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={`Foto kegiatan ${index + 1}`} loading="lazy" />
            <span>{index + 1}</span>
          </span>
          <strong>{name}</strong>
          <small>{photo.tagState === "individual" ? photoStatus(photo, draft.remarks) : photo.upload === "complete" ? "" : "Unggahan belum selesai"}</small>
        </button>;
      })}
    </div>
  </dialog>;
}

export default function FocusedActivityPhotos(props: Props) {
  const { draft, students, rosterLoading, rosterError, showIssues, onSelect, onStudentChange,
    onRemarkChange, onBlur, onRetry, onPreview, onRemove, onMove } = props;
  const [overview, setOverview] = useState(false);
  const editor = useRef<HTMLElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const selectedThumbnail = useRef<HTMLButtonElement>(null);
  const index = activePhotoIndex(draft);
  const photo = draft.photos[index];
  const activeKey = photo?.key;
  const names = new Map(students.map(student => [student.id, student.name]));

  useEffect(() => {
    const rail = strip.current;
    const thumbnail = selectedThumbnail.current;
    if (!rail || !thumbnail) return;
    const left = rail.scrollLeft + thumbnail.getBoundingClientRect().left - rail.getBoundingClientRect().left - (rail.clientWidth - thumbnail.clientWidth) / 2;
    rail.scrollTo({ left: Math.max(0, left), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [activeKey]);

  if (!photo) return null;
  const selectFromGallery = (position: number) => {
    onSelect(position);
    requestAnimationFrame(() => editor.current?.scrollIntoView({ block: "start", behavior: "auto" }));
  };
  const name = names.get(photo.studentId) || "siswa";
  const note = draft.remarks[photo.studentId] || "";
  const status = photoStatus(photo, draft.remarks);
  const complete = photo.tagState === "group" || (photo.tagState === "individual" && !!note.trim());
  const missingStudent = !!photo.studentId && !students.some(student => student.id === photo.studentId);
  const repeatedStudent = draft.photos.filter(item => item.tagState === "individual" && item.studentId === photo.studentId).length > 1;

  return <section className="focus-photos" ref={editor} aria-label="Editor satu foto">
    <div className="focus-toolbar">
      <p className="focus-counter" aria-live="polite">Foto <strong>{index + 1}</strong> dari {draft.photos.length}</p>
      <span className={`focus-state ${showIssues && !complete ? "report-error" : ""}`}>
        {complete && <Check size={15} aria-hidden="true" />}{status}
      </span>
      <details className="focus-photo-menu" key={photo.key}>
        <summary aria-label={`Opsi foto ${index + 1}`}><MoreHorizontal size={22} /></summary>
        <div>
          <button type="button" disabled={index === 0} onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); onMove(index, -1); }}><ArrowUp size={17} /> Pindahkan ke depan</button>
          <button type="button" disabled={index === draft.photos.length - 1} onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); onMove(index, 1); }}><ArrowDown size={17} /> Pindahkan ke belakang</button>
          <button type="button" onClick={() => onRemove(photo)}><X size={17} /> Hapus foto</button>
        </div>
      </details>
    </div>

    <div className="focus-workspace">
      <div className="focus-picture-area">
        <button type="button" className="focus-picture" disabled={!photo.url}
          onClick={() => onPreview(photo)} aria-label={`Perbesar foto ${index + 1}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={`Foto kegiatan ${index + 1}`} />
          <span className="focus-zoom"><Maximize2 size={15} /> Perbesar</span>
        </button>
        {photo.upload !== "complete" && <p className="report-upload-status" role="status">
          {photo.upload === "uploading" ? "Mengunggah foto…" : photo.upload === "error" ? "Unggahan gagal" : "Menunggu unggahan"}
          {photo.upload === "error" && <button type="button" onClick={() => onRetry(photo.key)}>Coba lagi</button>}
        </p>}
      </div>
      <div className="focus-form" key={photo.key}>
        <label htmlFor="focus-student">Siswa dalam foto</label>
        <select id="focus-student" value={photo.tagState === "group" ? "group" : photo.studentId}
          disabled={!draft.classId || rosterLoading || !!rosterError}
          aria-invalid={showIssues && photo.tagState === "unreviewed"}
          onChange={event => onStudentChange(photo.key, event.target.value)}>
          <option value="">{!draft.classId ? "Pilih kelas terlebih dahulu" : rosterLoading ? "Memuat siswa…" : "Pilih siswa"}</option>
          <option value="group">Foto bersama</option>
          {missingStudent && <option value={photo.studentId}>Siswa tidak tersedia di kelas ini</option>}
          {students.map(student => <option key={student.id} value={student.id}>{student.name}</option>)}
        </select>
        {photo.tagState === "individual" ? <div className="focus-remark">
          <label htmlFor="focus-remark">Catatan untuk {name} <span aria-hidden="true">*</span></label>
          <textarea id="focus-remark" rows={3} value={note}
            placeholder={`Contoh: ${name} sudah sangat baik dalam menggunting kertas.`}
            aria-required="true" aria-invalid={showIssues && !note.trim()}
            onChange={event => onRemarkChange(photo.studentId, event.target.value)} onBlur={onBlur}
            aria-describedby="focus-remark-hint" />
          <small id="focus-remark-hint">{repeatedStudent
            ? "Satu catatan ini berlaku untuk semua foto siswa ini dalam kegiatan yang sama."
            : "Catatan wajib diisi sebelum publikasi. Draft dapat dilanjutkan nanti."}</small>
        </div> : <p className="focus-photo-hint">
          {photo.tagState === "group" ? <><Users size={19} aria-hidden="true" /><span>Foto bersama dibagikan kepada wali peserta kegiatan. Tidak perlu catatan individual.</span></>
            : photo.tagState === "legacy" ? "Foto lama tetap disimpan. Pilih siswa atau Foto bersama jika ingin mengklasifikasikannya."
              : "Pilih nama siswa untuk menambahkan catatan, atau pilih Foto bersama."}
        </p>}
      </div>
    </div>

    <nav className="focus-navigation" aria-label="Pindah foto">
      <button type="button" className="secondary-button" disabled={index === 0} onClick={() => onSelect(index - 1)}>
        <ChevronLeft size={18} aria-hidden="true" /><span>Sebelumnya</span>
      </button>
      <button type="button" className="secondary-button" disabled={index === draft.photos.length - 1} onClick={() => onSelect(index + 1)}>
        <span>Berikutnya</span><ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>

    <div className="focus-gallery">
      <div className="focus-gallery-heading"><span>Pilih foto</span><button type="button" onClick={() => setOverview(true)}><Grid2X2 size={16} /> Semua foto</button></div>
      <div className="focus-filmstrip" ref={strip} aria-label="Daftar thumbnail foto">
        {draft.photos.map((item, position) => {
          const selected = position === index;
          const label = item.tagState === "individual" ? names.get(item.studentId) || "Siswa" : item.tagState === "group" ? "Bersama" : `Foto ${position + 1}`;
          const done = item.upload === "complete" && (item.tagState === "group" || (item.tagState === "individual" && !!draft.remarks[item.studentId]?.trim()));
          return <button type="button" className="focus-filmstrip-item" key={item.key}
            ref={selected ? selectedThumbnail : undefined} aria-current={selected ? "true" : undefined}
            aria-label={`Pilih foto ${position + 1}: ${label}, ${photoStatus(item, draft.remarks)}`}
            onClick={() => selectFromGallery(position)}>
            <span className="focus-filmstrip-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" loading="lazy" />
              <span className="focus-filmstrip-number">{position + 1}</span>
              {done && <span className="focus-filmstrip-done"><Check size={11} aria-hidden="true" /></span>}
            </span>
            <span className="focus-filmstrip-label">{label}</span>
          </button>;
        })}
      </div>
    </div>
    {overview && <PhotoOverview draft={draft} students={students} close={() => setOverview(false)} select={selectFromGallery} />}
  </section>;
}
