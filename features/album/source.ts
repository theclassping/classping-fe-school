// A class's album source: the published activities of one class in a period, with every photo the teacher uploaded.
// Pure of transport: the page reads through /api/proxy, the PDF route straight from the backend, both via a ListReader.
import { initialsOf } from "classping-album/format";
import { monthsWithActivities, periodRange, type AcademicYearOption, type Period } from "classping-album/period";
import type { AlbumActivity, AlbumPhoto, AlbumSchool, AlbumSource, AlbumSubject } from "classping-album/types";

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

type ApiAcademicYear = { id?: number | string; name?: string | null; start_date?: string | null; end_date?: string | null };

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

/** Backend activities → album activities; drafts and records without a date are left out. */
export function albumActivitiesFrom(items: ApiActivity[], teachers: Map<string, string>): AlbumActivity[] {
  const activities: AlbumActivity[] = [];
  for (const item of items) {
    const id = item.id ?? item.name;
    const date = item.activity_date?.slice(0, 10);
    if (id == null || !date || item.is_publish === false) continue;
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
  const [items, teachers] = await Promise.all([
    list<ApiActivity>(publishedActivitiesPath(classId, periodRange(period))),
    list<ApiClassTeacher>(`class-teachers/?class_id=${classId}`),
  ]);
  return {
    subject: classSubject(classId, className),
    period,
    school,
    activities: albumActivitiesFrom(items, teacherNames(teachers)),
    generatedAt: new Date().toISOString(),
  };
}

/** Months the class has published activities in, newest first, for the period picker. */
export async function classAlbumMonths(classId: number, list: ListReader) {
  const items = await list<ApiActivity>(publishedActivitiesPath(classId));
  return monthsWithActivities(items.filter((item) => item.is_publish !== false).map((item) => item.activity_date?.slice(0, 10) || ""));
}

/** Academic years of the branch, newest first; empty when the backend does not share them. */
export async function academicYearOptions(branchId: number | null | undefined, list: ListReader): Promise<AcademicYearOption[]> {
  if (!branchId) return [];
  const years = await list<ApiAcademicYear>(`academic-years/?branch_id=${branchId}`);
  return years
    .filter((year) => year.id != null && year.start_date && year.end_date && year.name)
    .map((year) => ({ id: String(year.id), label: year.name as string, start: (year.start_date as string).slice(0, 10), end: (year.end_date as string).slice(0, 10) }))
    .sort((a, b) => b.start.localeCompare(a.start));
}
