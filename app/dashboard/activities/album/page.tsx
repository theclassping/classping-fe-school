import "classping-album/album.css";
import "./classAlbum.css";
import Link from "next/link";
import { Suspense } from "react";
import ClassAlbum from "./ClassAlbum";

export const metadata = { title: "Album Kelas" };

export default function ClassAlbumPage() {
  return (
    <main>
      <section className="activity-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">ALBUM KENANGAN</p>
            <h2>Album Kelas</h2>
            <p>Kegiatan dan foto satu kelas dalam satu album digital yang bisa diunduh sebagai PDF A4.</p>
          </div>
          <Link className="secondary-button" href="/dashboard/activities">Laporan Aktivitas</Link>
        </div>
        <Suspense fallback={<p className="empty-state">Memuat album…</p>}>
          <ClassAlbum />
        </Suspense>
      </section>
    </main>
  );
}
