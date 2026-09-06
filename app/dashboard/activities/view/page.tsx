"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActivity, type Activity } from "../activityData";

export default function ViewActivityPage() {
  const [activity, setActivity] = useState<Activity>(getActivity(null));

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("activity");
    setActivity(getActivity(slug));
  }, []);

  return (
    <main>
      <section className="panel student-manage">
        <div className="panel-heading">
          <div>
            <h2>View Aktivitas</h2>
            <p>Detail dokumentasi aktivitas siswa</p>
          </div>
          <Link className="secondary-button" href="/dashboard/activities">
            Kembali
          </Link>
        </div>

        <div
          className="student-detail-layout"
          style={{ padding: "0 22px 20px" }}
        >
          <div className="panel detail-panel">
            <div className="detail-header">
              <span className="detail-avatar">{activity.avatar}</span>
              <div className="detail-meta">
                <h2>{activity.title}</h2>
                <p>
                  {activity.className} · {activity.classLabel} · {activity.date}
                </p>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span>Waktu</span>
                <strong>{activity.time}</strong>
              </div>
              <div className="detail-item">
                <span>Status</span>
                <strong>
                  <span className="status-badge">{activity.status}</span>
                </strong>
              </div>
              <div className="detail-item full">
                <span>Caption</span>
                <strong>{activity.caption}</strong>
              </div>
              <div className="detail-item">
                <span>Foto</span>
                <strong>{activity.photos} foto</strong>
              </div>
              <div className="detail-item">
                <span>Peserta</span>
                <strong>{activity.participants.length} siswa</strong>
              </div>
            </div>

            <div className="participant-section">
              <div className="participant-heading">
                <h3>Daftar Peserta</h3>
                <span>{activity.participants.length} siswa</span>
              </div>
              <ul className="participant-list">
                {activity.participants.map((student) => (
                  <li key={student}>{student}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="side-note">
            <div className="info-card">
              <h3>Ringkasan</h3>
              <div className="info-list">
                <div>
                  <span>Kelas</span>
                  <strong>{activity.className}</strong>
                </div>
                <div>
                  <span>Foto tagged</span>
                  <strong>{activity.participants.length} siswa</strong>
                </div>
                <div>
                  <span>Terakhir update</span>
                  <strong>{activity.date}</strong>
                </div>
              </div>
            </div>

            <div className="warning-box">
              <h3>Catatan</h3>
              <p>{activity.note}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
