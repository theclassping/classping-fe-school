export type ActivityTeacher = {
  id: string;
  name: string;
};

type TeacherRecord = {
  id?: number | string;
  name?: string;
  teacher_name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  user?: {
    name?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
  };
};

function getRecords(data: unknown): TeacherRecord[] {
  if (Array.isArray(data)) return data as TeacherRecord[];
  if (!data || typeof data !== "object") return [];

  const response = data as { results?: unknown; data?: unknown };
  if (Array.isArray(response.results))
    return response.results as TeacherRecord[];
  if (Array.isArray(response.data)) return response.data as TeacherRecord[];

  return [];
}

function getTeacherName(record: TeacherRecord) {
  const directName = record.teacher_name ?? record.name;
  if (directName) return directName;

  const source = record.user ?? record;
  return [source.first_name, source.middle_name, source.last_name]
    .filter(Boolean)
    .join(" ");
}

export function normalizeActivityTeachers(data: unknown): ActivityTeacher[] {
  return getRecords(data)
    .filter((record) => record.id !== undefined)
    .map((record) => ({
      id: String(record.id),
      name: getTeacherName(record),
    }))
    .filter((teacher) => teacher.name);
}

export async function loadActivityTeachers(classId: string) {
  const response = await fetch(
    `/api/proxy/class-teachers/?class_id=${encodeURIComponent(classId)}`,
    {
      credentials: "include",
      cache: "no-store",
    },
  );

  if (response.status === 401) {
    window.location.href = "/login";
    return [];
  }

  if (!response.ok) throw new Error("Failed to load class teachers");

  return normalizeActivityTeachers(await response.json());
}
