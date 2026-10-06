export type StaffProfile = {
  id: number;
  branch: number;
  user: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  staff_type: string;
  staff_type_display: string;
  hire_date: string;
  qualification: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

async function requestJson(url: string, options: RequestInit = {}) {
  const response = await fetch(url, { credentials: "include", cache: "no-store", ...options });
  const data = await response.json();
  if (!response.ok) {
    const detail = data.detail || Object.entries(data).map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : String(value)}`).join("; ");
    throw new Error(detail || "Gagal memuat atau menyimpan profil staf.");
  }
  return data;
}

export async function loadStaffProfile(userId: number, signal?: AbortSignal): Promise<StaffProfile> {
  let url = `/api/proxy/staffs/?user=${userId}`;
  const visited = new Set<string>();
  let inactive: StaffProfile | undefined;
  while (!visited.has(url)) {
    visited.add(url);
    const data = await requestJson(url, { signal });
    const records: StaffProfile[] = Array.isArray(data) ? data : data.results ?? data.data ?? [];
    const matching = records.filter((record) => record.user === userId);
    const active = matching.find((record) => record.is_active);
    if (active) return active;
    inactive ??= matching[0];
    if (!data.next) break;
    const params = new URL(data.next, "https://backend.invalid").searchParams;
    params.set("user", String(userId));
    url = `/api/proxy/staffs/?${params}`;
  }
  if (inactive) return inactive;
  throw new Error("Profil staf yang terhubung dengan akun Anda tidak ditemukan.");
}

export type StaffProfileFields = Pick<StaffProfile, "first_name" | "last_name" | "email" | "phone" | "hire_date" | "qualification">;

export async function saveStaffProfile(staff: StaffProfile, fields: StaffProfileFields): Promise<StaffProfile> {
  return requestJson(`/api/proxy/staffs/${staff.id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ branch: staff.branch, user: staff.user, ...fields }),
  });
}
