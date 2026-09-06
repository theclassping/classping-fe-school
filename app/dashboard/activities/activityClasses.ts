export type ActivityClass = {
  id: string;
  label: string;
  code: string;
};

type ClassRecord = {
  id?: number | string;
  name?: string;
  label?: string;
  title?: string;
  code?: string;
  class_name?: string;
  class_code?: string;
};

function getRecords(data: unknown): ClassRecord[] {
  if (Array.isArray(data)) return data as ClassRecord[];
  if (!data || typeof data !== "object") return [];

  const response = data as {
    results?: unknown;
    data?: unknown;
  };

  if (Array.isArray(response.results)) return response.results as ClassRecord[];
  if (Array.isArray(response.data)) return response.data as ClassRecord[];

  return [];
}

export function normalizeActivityClasses(data: unknown): ActivityClass[] {
  return getRecords(data)
    .filter((record) => record.id !== undefined)
    .map((record) => {
      const code = String(record.code ?? record.class_code ?? "");
      const label = String(
        record.class_name ??
          record.name ??
          record.label ??
          record.title ??
          code,
      );

      return {
        id: String(record.id),
        code: code || label,
        label,
      };
    });
}

export async function loadActivityClasses() {
  const response = await fetch("/api/proxy/classes/", {
    credentials: "include",
    cache: "no-store",
  });

  if (response.status === 401) {
    window.location.href = "/login";
    return [];
  }

  if (!response.ok) throw new Error("Failed to load classes");

  return normalizeActivityClasses(await response.json());
}
