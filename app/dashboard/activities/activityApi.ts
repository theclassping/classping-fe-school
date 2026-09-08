import type { Activity } from "./activityData";

type ActivityStudentRecord = {
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  nickname?: string;
};

type ActivityRecord = {
  id?: number | string;
  class_id?: number | string;
  class_name?: string;
  name?: string;
  description?: string;
  activity_date?: string;
  images?: unknown[];
  students?: ActivityStudentRecord[];
  created_at?: string;
  status?: string;
};

function getRecords(data: unknown): ActivityRecord[] {
  if (Array.isArray(data)) return data as ActivityRecord[];
  if (!data || typeof data !== "object") return [];

  const response = data as { results?: unknown; data?: unknown };
  if (Array.isArray(response.results))
    return response.results as ActivityRecord[];
  if (Array.isArray(response.data)) return response.data as ActivityRecord[];

  return [];
}

function studentName(student: ActivityStudentRecord) {
  return (
    student.nickname ||
    [student.first_name, student.middle_name, student.last_name]
      .filter(Boolean)
      .join(" ")
  );
}

function activityStatus(status?: string): Activity["status"] {
  return status?.toLowerCase() === "draft" ? "Draf" : "Dipublikasi";
}

function activityTime(createdAt?: string) {
  if (!createdAt) return "-";

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(":", ".");
}

export function normalizeActivities(data: unknown): Activity[] {
  return getRecords(data)
    .filter((record) => record.id !== undefined)
    .map((record) => {
      const className = record.class_name ?? "-";
      const participants = (record.students ?? [])
        .map(studentName)
        .filter(Boolean);

      return {
        slug: String(record.id),
        title: record.name ?? "Untitled activity",
        avatar: "📷",
        className,
        classLabel: className,
        time: activityTime(record.created_at),
        date: record.activity_date ?? "",
        status: activityStatus(record.status),
        caption: record.description ?? "",
        photos: Array.isArray(record.images) ? record.images.length : 0,
        participants,
        note: "",
      } satisfies Activity;
    });
}

export async function loadActivities() {
  const response = await fetch("/api/proxy/activities/", {
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401) {
    window.location.href = "/login";
    return [];
  }

  if (!response.ok) throw new Error("Failed to load activities");

  return normalizeActivities(await response.json());
}
