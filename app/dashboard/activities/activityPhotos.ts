export type ActivityPhoto = {
  id: string;
  url: string;
  caption: string;
  studentId: string;
  savedStudentId: string;
  file?: File;
};

export type ActivityDetail = {
  id: number;
  name: string;
  class_id: number;
  activity_images: {
    id: number;
    image_url: string;
    caption?: string;
    student_id?: number | null;
    position?: number;
  }[];
};

export async function activityRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "include", cache: "no-store", ...init });
  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("Sesi berakhir. Silakan masuk kembali.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof data?.detail === "string" ? data.detail : "Permintaan gagal. Silakan coba lagi.");
  return data as T;
}

export function activityPhotos(detail: ActivityDetail): ActivityPhoto[] {
  return [...(detail.activity_images ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((photo) => ({
      id: String(photo.id), url: photo.image_url, caption: photo.caption ?? "",
      studentId: photo.student_id == null ? "" : String(photo.student_id),
      savedStudentId: photo.student_id == null ? "" : String(photo.student_id),
    }));
}

export async function saveActivityPhoto(activityId: number, photo: ActivityPhoto, position: number) {
  let fileKey: string | undefined;
  if (photo.file) {
    const upload = await activityRequest<{ file_key: string; presigned_url: string }>("/api/proxy/media/presign/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: photo.file.name, content_type: photo.file.type, expires_in: 3600 }),
    });
    if (!upload.file_key || !upload.presigned_url) throw new Error("Alamat unggah foto tidak tersedia.");
    const response = await fetch(upload.presigned_url, { method: "PUT", headers: { "Content-Type": photo.file.type || "application/octet-stream" }, body: photo.file });
    if (!response.ok) throw new Error(`Gagal mengunggah ${photo.file.name}.`);
    fileKey = upload.file_key;
  }
  const result = await activityRequest<ActivityDetail["activity_images"][number]>(
    photo.file ? "/api/proxy/activity-images/" : `/api/proxy/activity-images/${encodeURIComponent(photo.id)}/`,
    {
      method: photo.file ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: photo.studentId ? Number(photo.studentId) : null,
        ...(photo.file ? { activity_id: activityId, image_data: fileKey, position } : {}), }),
    },
  );
  return activityPhotos({ id: activityId, name: "", class_id: 0, activity_images: [result] })[0];
}
