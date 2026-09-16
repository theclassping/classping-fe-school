"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
    loadActivity,
    type ActivityDetailRecord,
} from "../activityApi";

export default function ViewActivityPage() {
    const [activity, setActivity] =
        useState<ActivityDetailRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const activityId = new URLSearchParams(
            window.location.search
        ).get("activity");

        if (!activityId) {
            setError("Activity ID tidak ditemukan.");
            setLoading(false);
            return;
        }

        const fetchActivity = async () => {
            try {
                const data = await loadActivity(activityId);

                if (!data) {
                    setError("Aktivitas tidak ditemukan.");
                    return;
                }

                setActivity(data);
            } catch (err) {
                console.error(err);
                setError("Gagal mengambil data aktivitas.");
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();
    }, []);

    if (loading) {
        return (
            <main>
                <section className="panel student-manage">
                    <div className="panel-heading">
                        <div>
                            <h2>View Aktivitas</h2>
                            <p>Detail dokumentasi aktivitas siswa</p>
                        </div>
                    </div>

                    <div style={{ padding: "22px" }}>
                        <p>Loading...</p>
                    </div>
                </section>
            </main>
        );
    }

    if (error || !activity) {
        return (
            <main>
                <section className="panel student-manage">
                    <div className="panel-heading">
                        <div>
                            <h2>View Aktivitas</h2>
                            <p>Detail dokumentasi aktivitas siswa</p>
                        </div>

                        <Link
                            className="secondary-button"
                            href="/dashboard/activities"
                        >
                            Kembali
                        </Link>
                    </div>

                    <div style={{ padding: "22px" }}>
                        <p>{error || "Aktivitas tidak ditemukan."}</p>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main>
            <section className="panel student-manage">
                <div className="panel-heading">
                    <div>
                        <h2>View Aktivitas</h2>
                        <p>Detail dokumentasi aktivitas siswa</p>
                    </div>

                    <Link
                        className="secondary-button"
                        href="/dashboard/activities"
                    >
                        Kembali
                    </Link>
                </div>

                <div
                    className="student-detail-layout"
                    style={{ padding: "0 22px 20px" }}
                >
                    <div className="panel detail-panel">
                        <div className="detail-header">
                            <div className="detail-avatar">
                                📸
                            </div>

                            <div className="detail-meta">
                                <h2>{activity.name}</h2>

                                <p>
                                    {activity.class_name} ·{" "}
                                    {activity.activity_date}
                                </p>
                            </div>
                        </div>

                        <div className="detail-grid">
                            <div className="detail-item">
                                <span>Tanggal</span>
                                <strong>{activity.activity_date}</strong>
                            </div>

                            <div className="detail-item">
                                <span>Status</span>

                                <strong>
                                    <span className="status-badge">
                                        {activity.is_publish
                                            ? "Published"
                                            : "Draft"}
                                    </span>
                                </strong>
                            </div>

                            <div className="detail-item full">
                                <span>Deskripsi</span>

                                <strong>
                                    {activity.description || "-"}
                                </strong>
                            </div>

                            <div className="detail-item">
                                <span>Foto</span>

                                <strong>
                                    {activity.activity_images.length} foto
                                </strong>
                            </div>

                            <div className="detail-item">
                                <span>Peserta</span>

                                <strong>
                                    {activity.activity_students.length} siswa
                                </strong>
                            </div>
                        </div>

                        {/* Photos
                        <div className="participant-section">
                            <div className="participant-heading">
                                <h3>Foto Aktivitas</h3>

                                <span>
                                    {activity.activity_images.length} foto
                                </span>
                            </div>

                            <div className="activity-photo-grid">
                                {activity.activity_images.map((image) => (
                                    <div
                                        key={image.id}
                                        className="activity-photo"
                                    >
                                        <img
                                            src={image.image_url}
                                            alt={image.caption || activity.name}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div> */}

                        {/* Participants */}
                        <div className="participant-section">
                            <div className="participant-heading">
                                <h3>Daftar Peserta</h3>

                                <span>
                                    {activity.activity_students.length} siswa
                                </span>
                            </div>

                            <ul className="participant-list">
                                {activity.activity_students.map((student) => (
                                    <li key={student.id}>
                                        {student.first_name} {student.last_name}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="side-note">
                        <div className="info-card">
                            <h3>Ringkasan</h3>

                            <div className="info-list">
                                <div>
                                    <span>Kelas</span>
                                    <strong>{activity.class_name}</strong>
                                </div>

                                <div>
                                    <span>Foto</span>
                                    <strong>
                                        {activity.activity_images.length} foto
                                    </strong>
                                </div>

                                <div>
                                    <span>Peserta</span>
                                    <strong>
                                        {activity.activity_students.length} siswa
                                    </strong>
                                </div>

                                <div>
                                    <span>Terakhir update</span>
                                    <strong>
                                        {new Date(
                                            activity.updated_at
                                        ).toLocaleDateString("id-ID")}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        {activity.description && (
                            <div className="warning-box">
                                <h3>Catatan</h3>
                                <p>{activity.description}</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}