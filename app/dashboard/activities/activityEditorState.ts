import { randomId } from "@/lib/uuid";
export type PhotoState = "unreviewed" | "individual" | "group" | "legacy";
export type ReportPhoto = {
  key: string; id?: number; file?: File; url?: string; imageData?: unknown;
  uploadKey?: string; uploadUrl?: string; uploadExpires?: number;
  localFileKey?: string;
  urlRefreshedAt?: number;
  upload: "pending" | "uploading" | "complete" | "error"; error?: string;
  tagState: PhotoState; studentId: string; caption: string;
};
export type ReportDraft = {
  clientId: string; activityId?: number; revision?: number; workflowVersion: number;
  title: string; classId: string; teacherId: string; date: string; description: string;
  participants: string[]; remarks: Record<string, string>; photos: ReportPhoto[];
  removedPhotoIds: number[]; expanded: string; version: number; syncedVersion: number;
  published: boolean; updatedAt: number;
  review?: boolean;
};
export type ReportRecord = {
  id: number; client_id?: string; revision: number; workflow_version: number;
  name: string; class_id: number; class_teacher_id: number; activity_date: string;
  description: string; is_publish: boolean;
  activity_students: { id: number }[];
  student_remarks?: { student_id: number; remark: string }[];
  activity_images: { id: number; client_id?: string; image_url?: string; image_data?: unknown; student_id?: number | null; tag_state?: PhotoState; caption?: string; position?: number }[];
};
export function emptyDraft(): ReportDraft {
  return { clientId: randomId(), workflowVersion: 2, title: "", classId: "", teacherId: "",
    date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
    description: "", participants: [], remarks: {}, photos: [], removedPhotoIds: [], expanded: "",
    version: 0, syncedVersion: 0, published: false, updatedAt: Date.now() };
}
export function draftFromRecord(record: ReportRecord): ReportDraft {
  return { ...emptyDraft(), clientId: record.client_id || randomId(), activityId: record.id, revision: record.revision,
    workflowVersion: record.workflow_version, title: record.name, classId: String(record.class_id), teacherId: String(record.class_teacher_id),
    date: record.activity_date, description: record.description, participants: record.activity_students.map(s => String(s.id)),
    remarks: Object.fromEntries((record.student_remarks || []).map(r => [String(r.student_id), r.remark])), published: record.is_publish,
    photos: [...record.activity_images].sort((a,b) => (a.position || 0) - (b.position || 0)).map(p => ({
      key: p.client_id || randomId(), id: p.id, url: p.image_url, imageData: p.image_data, urlRefreshedAt: Date.now(),
      upload: "complete", tagState: p.tag_state || (p.student_id ? "individual" : "legacy"), studentId: p.student_id ? String(p.student_id) : "", caption: p.caption || "",
    })),
  };
}
export function taggedStudents(draft: ReportDraft): string[] {
  return [...new Set(draft.photos.filter(p => p.tagState === "individual" && p.studentId).map(p => p.studentId))];
}
export function activePhotoIndex(draft: ReportDraft): number {
  if (!draft.photos.length) return -1;
  return Math.max(0, draft.photos.findIndex(photo => photo.key === draft.expanded));
}
export function selectReportPhoto(draft: ReportDraft, index: number): ReportDraft {
  const photo = draft.photos[Math.max(0, Math.min(index, draft.photos.length - 1))];
  return { ...draft, expanded: photo?.key || "" };
}
export function removeReportPhoto(draft: ReportDraft, key: string): ReportDraft {
  const removed = draft.photos.find(photo => photo.key === key);
  if (!removed) return draft;
  const index = activePhotoIndex(draft);
  const activeKey = draft.photos[index]?.key;
  const photos = draft.photos.filter(photo => photo.key !== key);
  return { ...draft, photos,
    removedPhotoIds: removed.id ? [...new Set([...draft.removedPhotoIds, removed.id])] : draft.removedPhotoIds,
    expanded: activeKey === key ? photos[Math.min(index, photos.length - 1)]?.key || "" : activeKey || "",
  };
}
export function canSync(draft: ReportDraft) {
  return !!(draft.title.trim() && draft.classId && draft.teacherId && draft.date);
}
export function reportIssues(draft: ReportDraft): string[] {
  const errors: string[] = [];
  if (!canSync(draft)) errors.push("Lengkapi judul, kelas, guru, dan tanggal kegiatan.");
  if (draft.photos.some(p => p.upload !== "complete")) errors.push("Tunggu unggahan foto selesai atau coba lagi foto yang gagal.");
  if (draft.photos.some(p => p.tagState === "unreviewed")) errors.push("Pilih siswa atau Foto bersama untuk setiap foto.");
  if (taggedStudents(draft).some(id => !draft.remarks[id]?.trim())) errors.push("Lengkapi catatan untuk setiap siswa yang ditandai.");
  return errors;
}
export function reportPayload(draft: ReportDraft, publish: boolean, saveId: string) {
  const participants = [...new Set([...draft.participants, ...taggedStudents(draft)])];
  return {
    ...(!draft.activityId ? { client_id: draft.clientId } : { expected_revision: draft.revision }),
    client_save_id: saveId, class_id: Number(draft.classId), class_teacher_id: Number(draft.teacherId),
    name: draft.title, description: draft.description, activity_date: draft.date, is_publish: publish,
    student_ids: participants.map(Number),
    student_remarks: participants.map(id => ({ student_id: Number(id), remark: draft.remarks[id] || "" })),
    activity_images: [
      ...draft.photos.filter(p => p.upload === "complete").map((p, position) => ({
        ...(p.id ? { id: p.id } : { client_id: p.key }),
        // Leave historical untagged photos unchanged until explicitly reviewed.
        ...(p.tagState !== "legacy" ? { tag_state: p.tagState, student_id: p.studentId ? Number(p.studentId) : null } : {}),
        ...(!p.id ? { image_data: p.uploadKey || p.imageData } : {}), caption: p.caption, position,
      })),
      ...draft.removedPhotoIds.map(id => ({ id, _destroy: true })),
    ],
  };
}
