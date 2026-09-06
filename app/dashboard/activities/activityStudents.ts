export type ActivityStudent = {
  id: string;
  name: string;
};

type StudentRecord = {
  id?: number | string;
  name?: string;
  student_name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  user?: {
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    name?: string;
  };
};

function getRecords(data: unknown): StudentRecord[] {
  if (Array.isArray(data)) return data as StudentRecord[];
  if (!data || typeof data !== "object") return [];

  const response = data as { results?: unknown; data?: unknown };
  if (Array.isArray(response.results))
    return response.results as StudentRecord[];
  if (Array.isArray(response.data)) return response.data as StudentRecord[];

  return [];
}

function getStudentName(record: StudentRecord) {
  const directName = record.name ?? record.student_name;
  if (directName) return directName;

  const source = record.user ?? record;
  return [source.first_name, source.middle_name, source.last_name]
    .filter(Boolean)
    .join(" ");
}

export function normalizeActivityStudents(data: unknown): ActivityStudent[] {
  return getRecords(data)
    .filter((record) => record.id !== undefined)
    .map((record) => ({
      id: String(record.id),
      name: getStudentName(record),
    }))
    .filter((student) => student.name);
}

export async function loadActivityStudents(classId: string) {
  const response = await fetch(
    `/api/proxy/class-students/?class_id=${encodeURIComponent(classId)}`,
    {
      credentials: "include",
      cache: "no-store",
    },
  );

  if (response.status === 401) {
    window.location.href = "/login";
    return [];
  }

  if (!response.ok) throw new Error("Failed to load class students");

  return normalizeActivityStudents(await response.json());
}
