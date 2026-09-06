export type SchoolProfile = {
  name: string;
  email: string;
  phone: string;
  role: "Guru" | "Administrator";
};

export type SchoolNotification = {
  id: string;
  type: "upload" | "payment" | "hours";
  title: string;
  message: string;
  href: string;
  time: string;
  read: boolean;
};

export const schoolStoreEvent = "classping-school-store-updated";
export const defaultSchoolProfile: SchoolProfile = {
  name: "Nia Ramadhani",
  email: "nia@classping.id",
  phone: "0812-3456-7801",
  role: "Guru",
};

const profileKey = "classping-react-school-profile";
const notificationKey = "classping-react-school-notifications";

const defaultNotifications: SchoolNotification[] = [
  {
    id: "activity-published",
    type: "upload",
    title: "Aktivitas berhasil dipublikasikan",
    message: "Foto Melukis dengan Jari sudah tampil untuk orang tua siswa yang ditandai.",
    href: "/dashboard/activities",
    time: "Baru saja",
    read: false,
  },
  {
    id: "payment-received",
    type: "payment",
    title: "Pembayaran SPP diterima",
    message: "Pembayaran Alya untuk September 2026 telah tercatat lunas.",
    href: "/dashboard/payments",
    time: "12 menit lalu",
    read: false,
  },
];

function emitStoreUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(schoolStoreEvent));
  }
}

export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";
}

export function loadSchoolProfile(): SchoolProfile {
  if (typeof window === "undefined") return defaultSchoolProfile;
  try {
    const saved = JSON.parse(window.localStorage.getItem(profileKey) || "null");
    return saved ? { ...defaultSchoolProfile, ...saved } : defaultSchoolProfile;
  } catch {
    return defaultSchoolProfile;
  }
}

export function saveSchoolProfile(profile: SchoolProfile) {
  window.localStorage.setItem(profileKey, JSON.stringify(profile));
  emitStoreUpdate();
}

export function loadSchoolNotifications(): SchoolNotification[] {
  if (typeof window === "undefined") return defaultNotifications;
  try {
    const saved = JSON.parse(window.localStorage.getItem(notificationKey) || "null");
    return Array.isArray(saved) ? saved : defaultNotifications;
  } catch {
    return defaultNotifications;
  }
}

export function saveSchoolNotifications(notifications: SchoolNotification[]) {
  window.localStorage.setItem(notificationKey, JSON.stringify(notifications));
  emitStoreUpdate();
}

export function addSchoolNotification(notification: Omit<SchoolNotification, "read" | "time"> & Partial<Pick<SchoolNotification, "read" | "time">>) {
  const notifications = loadSchoolNotifications();
  const nextNotification: SchoolNotification = {
    ...notification,
    read: notification.read ?? false,
    time: notification.time ?? "Baru saja",
  };
  const withoutDuplicate = notifications.filter((item) => item.id !== nextNotification.id);
  saveSchoolNotifications([nextNotification, ...withoutDuplicate].slice(0, 20));
}
