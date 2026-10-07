export type Branch = {
  id: number;
  school: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  is_active: boolean;
  location_id: number | null;
  location?: {
    id: number;
    name: string;
    path: Array<{ id: number; name: string; type: string }>;
  } | null;
};

export type SchoolRecord = {
  id: number;
  name: string;
  register_number?: string;
  is_active: boolean;
  branches?: Branch[];
};

type StaffRecord = { user: number; branch: number; is_active: boolean };
export const branchUpdatedEvent = "classping-branch-updated";

async function requestJson(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...options,
  });
  if (!response.ok) {
    throw new Error(response.status === 401
      ? "Sesi berakhir. Silakan masuk kembali."
      : "Gagal memuat atau menyimpan profil sekolah. Silakan coba lagi.");
  }
  return response.json();
}

export async function loadCurrentBranch(signal?: AbortSignal): Promise<Branch> {
  const session = await requestJson("/api/auth/session", { signal });
  const userId = session.user?.id;
  if (typeof userId !== "number") throw new Error("Data pengguna tidak tersedia. Silakan masuk kembali.");

  let url = `/api/proxy/staffs/?user=${userId}`;
  const visited = new Set<string>();
  while (!visited.has(url)) {
    visited.add(url);
    const data = await requestJson(url, { signal });
    const records: StaffRecord[] = Array.isArray(data) ? data : data.results ?? data.data ?? [];
    // Check user IDs explicitly: a backend may return records for other users.
    const staff = records.find((record) => record.user === userId && record.is_active);
    if (staff && typeof staff.branch === "number") {
      return requestJson(`/api/proxy/branches/${staff.branch}/`, { signal });
    }
    if (!data.next) break;
    const params = new URL(data.next, "https://backend.invalid").searchParams;
    params.set("user", String(userId));
    url = `/api/proxy/staffs/?${params}`;
  }
  throw new Error("Tidak ada cabang sekolah yang terhubung dengan akun Anda.");
}

export async function loadSchools(signal?: AbortSignal): Promise<SchoolRecord[]> {
  let url = "/api/proxy/schools/";
  const visited = new Set<string>();
  const schools: SchoolRecord[] = [];

  while (!visited.has(url)) {
    visited.add(url);
    const data = await requestJson(url, { signal });
    const records = Array.isArray(data)
      ? data
      : Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.data?.results)
          ? data.data.results
          : Array.isArray(data.data)
            ? data.data
            : [];
    schools.push(...records.filter((school: unknown): school is SchoolRecord => {
      if (!school || typeof school !== "object") return false;
      const record = school as Partial<SchoolRecord>;
      return typeof record.id === "number" && typeof record.name === "string";
    }));

    if (!data.next) break;
    const params = new URL(data.next, "https://backend.invalid").searchParams;
    const query = params.toString();
    if (!query) break;
    url = `/api/proxy/schools/?${query}`;
  }

  return schools;
}

export async function saveBranch(branchId: number, fields: Pick<Branch, "name" | "code" | "address" | "phone" | "email">): Promise<Branch> {
  const branch: Branch = await requestJson(`/api/proxy/branches/${branchId}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(branchUpdatedEvent, { detail: branch }));
  }
  return branch;
}
