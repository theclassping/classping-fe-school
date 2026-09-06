"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { activities } from "./activityData";

export default function ActivitiesPage() {
  const [date, setDate] = useState("2026-08-27");
  const [classFilter, setClassFilter] = useState("all");
  const filtered = useMemo(
    () =>
      activities.filter(
        (activity) =>
          classFilter === "all" || activity.className === classFilter,
      ),
    [classFilter],
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
            <option value="A1">Kelas A1 - Matahari</option>
            <option value="A2">Kelas A2 - Pelangi</option>
            <option value="B1">Kelas B1 - Bintang</option>
            <option value="B2">Kelas B2 - Bulan</option>
          </select>
          <span className="activity-total">
            {filtered.length} aktivitas ·{" "}
            {filtered.reduce((total, activity) => total + activity.photos, 0)}{" "}
            foto hari ini
          </span>
        </div>
        <div className="activity-grid">
          {filtered.map((activity) => (
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
                  <strong>{activity.participants.length} siswa ditandai</strong>
                </div>
                <div className="activity-card-actions">
                  <Link
                    className="outline-button"
                    href={`/dashboard/activities/manage?activity=${activity.slug}`}
                  >
                    Kelola foto & tag
                  </Link>
                  <div className="student-action-wrap">
                    <details className="action-menu-details">
                      <summary
                        className="more-button"
                        aria-label={`Menu untuk ${activity.title}`}
                      >
                        <span className="vertical-dots" aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </span>
                      </summary>
                      <div className="action-menu">
                        <Link
                          className="action-menu-item"
                          href={`/dashboard/activities/view?activity=${activity.slug}`}
                        >
                          View
                        </Link>
                        <Link
                          className="action-menu-item"
                          href={`/dashboard/activities/update?activity=${activity.slug}`}
                        >
                          Update
                        </Link>
                        <Link
                          className="action-menu-item danger"
                          href={`/dashboard/activities/delete?activity=${activity.slug}`}
                        >
                          Delete
                        </Link>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
