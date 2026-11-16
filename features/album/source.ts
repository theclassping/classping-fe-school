// A class's album source: the published activities of one class in a period, with every photo the teacher uploaded.
// Pure of transport: the PDF route reads straight from the backend via a ListReader.
import { initialsOf } from "@/features/album/core/format";
import { periodRange, type Period } from "@/features/album/core/period";
import type { AlbumActivity, AlbumPhoto, AlbumSchool, AlbumSource, AlbumSubject } from "@/features/album/core/types";

/** Reads every record of a backend list endpoint; `path` is relative to the API root, e.g. "activities/?class_id=3". */
export type ListReader = <T>(path: string) => Promise<T[]>;

export type ApiActivityImage = { id?: number | string; image_url?: string | null; caption?: string | null; position?: number | null };

export type ApiActivity = {
  id?: number | string;
  name?: string | null;
  description?: string | null;
  activity_date?: string | null;
  class_teacher_id?: number | string | null;
  is_publish?: boolean;
  activity_images?: ApiActivityImage[] | null;
};

export type ApiClassTeacher = { id?: number | string; teacher_name?: string | null };

export function publishedActivitiesPath(classId: number, range?: { from: string; to: string }) {
  const filters = new URLSearchParams({ class_id: String(classId), is_publish: "true" });
  if (range) {
    filters.set("date_from", range.from);
    filters.set("date_to", range.to);
  }
  return `activities/?${filters.toString()}`;
}

/** Teacher names by class-teacher assignment id, for the "bersama Bu Anna" line. */
export function teacherNames(records: ApiClassTeacher[]) {
  return new Map(records.filter((record) => record.id != null && record.teacher_name?.trim()).map((record) => [String(record.id), record.teacher_name!.trim()]));
}

/** Every uploaded photo, in the teacher's order; a class album hides nothing. */
export function albumPhotos(activityId: string, images: ApiActivityImage[] | null | undefined): AlbumPhoto[] {
  return (images ?? [])
    .map((image, index) => ({ image, index }))
    .filter(({ image }) => Boolean(image.image_url))
    .sort((a, b) => (a.image.position ?? a.index) - (b.image.position ?? b.index) || a.index - b.index)
    .map(({ image, index }) => ({ id: String(image.id ?? `${activityId}-${index}`), url: image.image_url as string, caption: image.caption?.trim() || undefined }));
}

/** Backend activities → album activities; drafts, records without a date and (older backends ignore `date_from`/`date_to`) days outside the range are left out. */
export function albumActivitiesFrom(items: ApiActivity[], teachers: Map<string, string>, range?: { from: string; to: string }): AlbumActivity[] {
  const activities: AlbumActivity[] = [];
  for (const item of items) {
    const id = item.id ?? item.name;
    const date = item.activity_date?.slice(0, 10);
    if (id == null || !date || item.is_publish === false) continue;
    if (range && (date < range.from || date > range.to)) continue;
    activities.push({
      id: String(id),
      title: item.name?.trim() || "Aktivitas kelas",
      date,
      description: item.description?.trim() || undefined,
      teacher: item.class_teacher_id != null ? teachers.get(String(item.class_teacher_id)) : undefined,
      photos: albumPhotos(String(id), item.activity_images),
    });
  }
  return activities;
}

export function classSubject(classId: number, className: string): AlbumSubject {
  const name = className.trim() || `Kelas ${classId}`;
  return { kind: "class", id: classId, name, initials: initialsOf(name) || "K", className: /^kelas\b/i.test(name) ? name : `Kelas ${name}` };
}

export async function classAlbumSource(classId: number, className: string, period: Period, school: AlbumSchool, list: ListReader): Promise<AlbumSource> {
  const range = periodRange(period);
  const [items, teachers] = await Promise.all([
    list<ApiActivity>(publishedActivitiesPath(classId, range)),
    list<ApiClassTeacher>(`class-teachers/?class_id=${classId}`),
  ]);
  return {
    subject: classSubject(classId, className),
    period,
    school,
    activities: albumActivitiesFrom(items, teacherNames(teachers), range),
    generatedAt: new Date().toISOString(),
  };
}
