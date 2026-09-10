"use client";

import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import styles from "../components/TableActions.module.css";
import { loadActivities } from "./activityApi";
import type { Activity } from "./activityData";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  useEffect(() => {
    async function fetchActivities() {
      try {
        setLoading(true);
        setError("");
        setActivities(await loadActivities());
      } catch (loadError) {
        console.error(loadError);
        setError("Failed to load activities.");
      } finally {
        setLoading(false);
      }
    }

    void fetchActivities();
  }, []);

  const classOptions = useMemo(
    () => Array.from(new Set(activities.map((activity) => activity.className))),
    [activities],
  );
  const filtered = useMemo(
    () =>
      activities.filter(
        (activity) =>
          (classFilter === "all" || activity.className === classFilter) &&
          (!date || activity.date === date),
      ),
    [activities, classFilter, date],
  );

  return (
    <main>
      <section className="activity-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">DOKUMENTASI HARIAN</p>
            <h2>Laporan Aktivitas</h2>
            <p>
              Kelola aktivitas dan foto yang hanya dapat dilihat orang tua siswa
              terkait.
            </p>
          </div>
          <Link className="primary-button" href="/dashboard/activities/add">
            + Tambah Aktivitas
          </Link>
        </div>
        <div className="activity-toolbar panel">
          <label className="date-chip">
            <span>
              <small>Tanggal kegiatan</small>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </span>
          </label>
          <select
            aria-label="Filter kelas aktivitas"
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
          >
            <option value="all">Semua Kelas</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
          <span className="activity-total">
            {filtered.length} aktivitas ·{" "}
            {filtered.reduce((total, activity) => total + activity.photos, 0)}{" "}
            foto hari ini
          </span>
        </div>
        <div className="activity-grid">
          {loading ? (
            <p className="empty-state">Loading activities...</p>
          ) : error ? (
            <div className="empty-state">
              <p>{error}</p>
              <button
                type="button"
                className="secondary-button"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="empty-state">No activities found.</p>
          ) : (
            filtered.map((activity) => (
              <article className="activity-card panel" key={activity.slug}>
                <div
                  className={`activity-cover art-${activity.slug === "melukis-dengan-jari" ? "paint" : activity.slug === "menanam-kacang-hijau" ? "garden" : "music"}`}
                >
                  <span>{activity.avatar}</span>
                  <b>{activity.photos} foto</b>
                </div>
                <div className="activity-body">
                  <div className="activity-meta">
                    <span>{activity.time}</span>
                    <span>
                      {activity.className} · {activity.classLabel}
                    </span>
                    <span
                      className={
                        activity.status === "Dipublikasi" ? "published" : ""
                      }
                    >
                      ● {activity.status}
                    </span>
                  </div>
                  <h3>{activity.title}</h3>
                  <p>{activity.caption}</p>
                  <div className="tag-summary">
                    <span className="mini-avatars">
                      {activity.participants
                        .slice(0, 3)
                        .map((name) =>
                          name
                            .split(" ")
                            .map((part) => part[0])
                            .join(""),
                        )
                        .join(" ")}
                    </span>
                    <strong>
                      {activity.participants.length} siswa ditandai
                    </strong>
                  </div>
                  <div className="activity-card-actions">
                    <Link
                      className="outline-button"
                      href={`/dashboard/activities/manage?activity=${activity.slug}`}
                    >
                      Kelola foto & tag
                    </Link>
                    <div className={styles.actions} role="group" aria-label={`Aksi untuk ${activity.title}`}>
                      <Link
                        className={styles.actionButton}
                        href={`/dashboard/activities/view?activity=${activity.slug}`}
                        aria-label={`Lihat ${activity.title}`}
                        title="Lihat aktivitas"
                      >
                        <Eye aria-hidden="true" />
                      </Link>
                      <Link
                        className={styles.actionButton}
                        href={`/dashboard/activities/update?activity=${activity.slug}`}
                        aria-label={`Edit ${activity.title}`}
                        title="Edit aktivitas"
                      >
                        <Pencil aria-hidden="true" />
                      </Link>
                      <Link
                        className={`${styles.actionButton} ${styles.dangerButton}`}
                        href={`/dashboard/activities/delete?activity=${activity.slug}`}
                        aria-label={`Hapus ${activity.title}`}
                        title="Hapus aktivitas"
                      >
                        <Trash2 aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
