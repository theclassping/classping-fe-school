"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadActivity, type ActivityDetailRecord } from "../activityApi";
import DeleteActivityDialog from "../DeleteActivityDialog";

export default function DeleteActivityPage() {
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityDetailRecord | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const id = new URLSearchParams(window.location.search).get("activity");
        const record = id ? await loadActivity(id) : null;
        if (active) {
          if (record) setActivity(record);
          else setError("Aktivitas tidak ditemukan.");
        }
      } catch {
        if (active) setError("Gagal memuat aktivitas.");
      }
    }
    void load();
    return () => { active = false; };
  }, []);
  const returnToList = () => router.replace("/dashboard/activities");
  return (
    <main>
      {activity ? <DeleteActivityDialog
        activity={{ id: activity.id, title: activity.name }}
        onCancel={returnToList}
        onDeleted={returnToList}
      /> : <section className="panel student-manage">
        <p role="status" className="empty-state">{error || "Memuat aktivitas..."}</p>
        {error && <Link className="secondary-button" href="/dashboard/activities">Kembali</Link>}
      </section>}
    </main>
  );
}
