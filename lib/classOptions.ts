import { loadList } from "./loadList";
import { loadStaffProfile } from "@/app/dashboard/user-profile/staffProfileApi";

export type ClassOption = { id: number; name: string; class_name: string; code: string };

export async function loadClassOptions(): Promise<ClassOption[]> {
  const response = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("Gagal memuat sesi pengguna.");
  const { user } = await response.json();
  if (!user || typeof user.id !== "number") throw new Error("Sesi pengguna tidak tersedia.");
  const role = user.role?.toUpperCase();
  const staff = role === "STAFF" || role === "TEACHER" ? await loadStaffProfile(user.id) : null;
  if (staff && !staff.is_active) throw new Error("Profil staf tidak aktif.");
  const teacher = role === "TEACHER" || staff?.staff_type?.toLowerCase() === "teacher";
  const branchId = user.branch_id ?? staff?.branch;
  if (!teacher && (!Number.isInteger(branchId) || branchId <= 0)) throw new Error("Cabang sekolah tidak tersedia.");
  const records = await loadList<{
    id: number; class_id?: number; name?: string; class_name?: string; code?: string;
  }>(teacher ? `/api/proxy/class-teachers/?staff_id=${staff!.id}` : `/api/proxy/classes/?branch_id=${branchId}`);
  const options = records.map((record) => {
    // Assignment IDs differ from class IDs; dropdown values must use class IDs.
    const id = teacher ? record.class_id : record.id;
    const name = record.class_name ?? record.name ?? "";
    return { id: id!, name, class_name: name, code: record.code ?? "" };
  }).filter((record) => Number.isInteger(record.id) && record.id > 0);
  return [...new Map(options.map((record) => [record.id, record])).values()];
}
