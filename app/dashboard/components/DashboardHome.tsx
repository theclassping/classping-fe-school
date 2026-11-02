"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  ClipboardList,
  CreditCard,
  Eye,
  FilePenLine,
  GraduationCap,
  Plus,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import type { SessionUser } from "@/lib/session";
import { loadList } from "@/lib/loadList";
import { loadActivities } from "../activities/activityApi";
import type { Activity } from "../activities/activityData";

type SubmittedPayment = {
  id?: number | string;
  invoice_no?: string;
  student_name?: string;
  class_name?: string;
  amount?: string | number;
  payment_method?: string | null;
  submitted_at?: string;
  created_at?: string;
  status?: string;
};

const PAYMENT_ROLES = ["ADMIN", "STAFF", "OFFICER", "PRINCIPAL"];

export function greetingFor(date = new Date()) {
  const hour = date.getHours();
  if (hour < 4) return "Selamat malam";
  if (hour < 11) return "Selamat pagi";
  if (hour < 15) return "Selamat siang";
  if (hour < 18) return "Selamat sore";
  return "Selamat malam";
}

export function roleView(role?: string): { teacher: boolean; payments: boolean } {
  const upper = (role || "").toUpperCase();
  return { teacher: upper === "TEACHER" || upper === "ADMIN", payments: PAYMENT_ROLES.includes(upper) };
}

/** Drafts first (newest), then the published reports of the last 7 days. */
export function splitActivities(activities: readonly Activity[], now = new Date()) {
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const drafts = activities.filter((item) => item.status === "Draf");
  const published = activities.filter((item) => item.status === "Dipublikasi");
  const thisWeek = published.filter((item) => {
    const time = Date.parse(item.date);
    return !Number.isNaN(time) && time >= weekAgo;
  });
  return { drafts, published, thisWeek };
}

export function rupiah(value?: string | number) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

function formatDay(value?: string, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", withTime ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" } : { weekday: "short", day: "numeric", month: "short" }).format(date);
}

function relativeDay(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  return `${days} hari lalu`;
}

export default function DashboardHome() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesError, setActivitiesError] = useState("");
  const [payments, setPayments] = useState<SubmittedPayment[]>([]);
  const [paymentsError, setPaymentsError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/auth/session", { credentials: "include", cache: "no-store", signal: controller.signal });
        if (response.status === 401) { window.location.href = "/login"; return; }
        if (!response.ok) throw new Error("Sesi tidak dapat dimuat.");
        const { user: sessionUser } = (await response.json()) as { user: SessionUser | null };
        if (controller.signal.aborted || !sessionUser) return;
        setUser(sessionUser);
        const view = roleView(sessionUser.role);
        const jobs: Promise<void>[] = [
          loadActivities().then((items) => { if (!controller.signal.aborted) setActivities(items); })
            .catch(() => { if (!controller.signal.aborted) setActivitiesError("Laporan aktivitas belum dapat dimuat."); }),
        ];
        if (view.payments) {
          jobs.push(loadList<SubmittedPayment>("/api/proxy/payments/?status=submitted")
            .then((items) => { if (!controller.signal.aborted) setPayments(items.filter((item) => (item.status || "").toLowerCase() === "submitted")); })
            .catch(() => { if (!controller.signal.aborted) setPaymentsError("Pembayaran belum dapat dimuat."); }));
        }
        await Promise.all(jobs);
      } catch (error) {
        if (!controller.signal.aborted) console.error("Gagal memuat beranda", error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  const view = roleView(user?.role);
  const { drafts, published, thisWeek } = useMemo(() => splitActivities(activities), [activities]);
  const recent = published.slice(0, view.payments && !view.teacher ? 3 : 4);
  const firstName = user?.first_name?.trim() || user?.full_name?.trim().split(" ")[0] || "";
  const today = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const staffOnly = view.payments && !view.teacher;

  return (
    <main id="main" className={`home ${staffOnly ? "home-staff" : "home-teacher"}`}>
      <section className="home-welcome">
        <div>
          <p className="eyebrow">{today}</p>
          <h1>{greetingFor()}{firstName ? `, ${firstName}` : ""}! <span aria-hidden="true">👋</span></h1>
          <p>{view.teacher && !view.payments ? "Bagikan cerita seru anak-anak hari ini kepada orang tua." : view.payments && !view.teacher ? "Berikut hal-hal yang menunggu Anda hari ini." : "Ringkasan aktivitas dan pembayaran sekolah hari ini."}</p>
        </div>
        <div className="home-stats" aria-label="Ringkasan singkat">
          <div className="home-stat sun"><Camera aria-hidden="true" /><strong>{loading ? "…" : thisWeek.length}</strong><span>Laporan minggu ini</span></div>
          {view.teacher && <div className="home-stat peach"><FilePenLine aria-hidden="true" /><strong>{loading ? "…" : drafts.length}</strong><span>Draft tersimpan</span></div>}
          {view.payments && <div className="home-stat sky"><ReceiptText aria-hidden="true" /><strong>{loading ? "…" : payments.length}</strong><span>Menunggu verifikasi</span></div>}
        </div>
      </section>

      <div className="home-grid">
        {view.payments && (
          <section className="home-main">
            <article className={`panel home-hero home-hero-verify ${payments.length ? "" : "calm"}`}>
              <div className="home-hero-copy">
                <span className="home-sticker"><BadgeCheck aria-hidden="true" /> Verifikasi pembayaran</span>
                <h2>{loading ? "Memeriksa bukti pembayaran…" : payments.length ? `${payments.length} bukti pembayaran menunggu dicek` : "Semua bukti pembayaran sudah dicek"}</h2>
                <p>{payments.length ? "Orang tua sudah mengunggah bukti transfer. Periksa dan konfirmasi agar tagihan mereka berubah menjadi lunas." : "Tidak ada yang antre hari ini. Bukti baru akan muncul di sini begitu orang tua mengirimnya."}</p>
                <Link className="primary-button home-cta" href="/dashboard/payments">{payments.length ? "Verifikasi sekarang" : "Buka pembayaran"} <ArrowRight aria-hidden="true" /></Link>
              </div>
              <div className="home-hero-art" aria-hidden="true"><i className="blob a" /><i className="blob b" /><ReceiptText /></div>
            </article>

            <article className="panel home-list">
              <header className="home-list-head">
                <div><h2>Bukti pembayaran masuk</h2><p>Diurutkan dari yang terbaru</p></div>
                <Link className="text-button" href="/dashboard/payments">Semua pembayaran <ArrowRight aria-hidden="true" /></Link>
              </header>
              {loading ? (
                <p className="home-empty">Memuat pembayaran…</p>
              ) : paymentsError ? (
                <p className="home-empty" role="alert">{paymentsError}</p>
              ) : payments.length === 0 ? (
                <div className="home-empty"><span aria-hidden="true">🎉</span><strong>Tidak ada antrean</strong><p>Semua pembayaran yang masuk sudah diverifikasi.</p></div>
              ) : (
                <ul className="home-rows">
                  {payments.slice(0, 6).map((payment) => (
                    <li className="home-row" key={String(payment.id)}>
                      <span className="home-avatar">{(payment.student_name || "S").split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span>
                      <div className="home-row-copy">
                        <strong>{payment.student_name || "Siswa"}</strong>
                        <span>{[payment.invoice_no, payment.class_name, payment.payment_method?.replace(/_/g, " ")].filter(Boolean).join(" · ")}</span>
                      </div>
                      <div className="home-row-meta">
                        <strong>{rupiah(payment.amount)}</strong>
                        <span>{relativeDay(payment.submitted_at || payment.created_at) || formatDay(payment.submitted_at || payment.created_at, true)}</span>
                      </div>
                      <div className="home-row-actions">
                        <Link className="home-icon-link" href={`/dashboard/payments/view?payment=${encodeURIComponent(String(payment.id))}`} aria-label={`Lihat bukti pembayaran ${payment.student_name || ""}`} title="Lihat bukti"><Eye aria-hidden="true" /></Link>
                        <Link className="home-chip-link" href={`/dashboard/payments/edit?payment=${encodeURIComponent(String(payment.id))}`}>Verifikasi</Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        )}

        {view.teacher && (
          <section className="home-main">
            <article className="panel home-hero home-hero-report">
              <div className="home-hero-copy">
                <span className="home-sticker"><Sparkles aria-hidden="true" /> Laporan aktivitas</span>
                <h2>Ada cerita seru hari ini?</h2>
                <p>Unggah foto kegiatan, tandai anak-anak, dan orang tua langsung menerimanya di portal mereka.</p>
                <div className="home-hero-actions">
                  <Link className="primary-button home-cta" href="/dashboard/activities/add"><Plus aria-hidden="true" /> Tambah aktivitas</Link>
                  {drafts.length > 0 && <Link className="home-ghost-link" href={`/dashboard/activities/update?activity=${drafts[0].slug}`}><FilePenLine aria-hidden="true" /> Lanjutkan draft terakhir</Link>}
                </div>
              </div>
              <div className="home-hero-art" aria-hidden="true"><i className="blob a" /><i className="blob b" /><Camera /></div>
            </article>

            <article className="panel home-list">
              <header className="home-list-head">
                <div><h2>Draft laporan</h2><p>Belum dipublikasikan ke orang tua</p></div>
                <Link className="text-button" href="/dashboard/activities">Semua laporan <ArrowRight aria-hidden="true" /></Link>
              </header>
              {loading ? (
                <p className="home-empty">Memuat draft…</p>
              ) : activitiesError ? (
                <p className="home-empty" role="alert">{activitiesError}</p>
              ) : drafts.length === 0 ? (
                <div className="home-empty"><span aria-hidden="true">✨</span><strong>Tidak ada draft tersimpan</strong><p>Semua laporan sudah dipublikasikan. Mulai cerita baru dengan tombol Tambah aktivitas.</p></div>
              ) : (
                <ul className="home-drafts">
                  {drafts.slice(0, 4).map((draft) => (
                    <li className="home-draft" key={draft.slug}>
                      <div className="home-draft-cover">
                        {draft.imageUrl ? <img src={draft.imageUrl} alt="" /> : <Camera aria-hidden="true" />}
                        <b>{draft.photos} foto</b>
                      </div>
                      <div className="home-draft-copy">
                        <span className="home-draft-meta">{draft.className}{draft.date ? ` · ${formatDay(draft.date)}` : ""}</span>
                        <strong>{draft.title}</strong>
                        <span className="home-draft-meta">{draft.participants.length} anak · {draft.taggedStudentCount ?? 0} ditandai</span>
                      </div>
                      <div className="home-draft-actions">
                        <Link className="primary-button small" href={`/dashboard/activities/update?activity=${draft.slug}`}><FilePenLine aria-hidden="true" /> Lanjutkan</Link>
                        <Link className="home-chip-link" href={`/dashboard/activities/view?activity=${draft.slug}`}><Eye aria-hidden="true" /> Pratinjau</Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </section>
        )}

        <aside className="home-side">
          <article className="panel home-recent">
            <header className="home-list-head">
              <div><h2>Baru dibagikan</h2><p>Laporan yang sudah dilihat orang tua</p></div>
            </header>
            {loading ? (
              <p className="home-empty">Memuat…</p>
            ) : recent.length === 0 ? (
              <p className="home-empty">Belum ada laporan yang dipublikasikan.</p>
            ) : (
              <ul className="home-recent-list">
                {recent.map((activity) => (
                  <li key={activity.slug}>
                    <Link href={`/dashboard/activities/view?activity=${activity.slug}`}>
                      <span className="home-recent-thumb">{activity.imageUrl ? <img src={activity.imageUrl} alt="" /> : <Camera aria-hidden="true" />}</span>
                      <span className="home-recent-copy"><strong>{activity.title}</strong><small>{activity.className} · {formatDay(activity.date)} · {activity.photos} foto</small></span>
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <nav className="panel home-shortcuts" aria-label="Pintasan">
            <h2>Pintasan</h2>
            <Link href="/dashboard/students"><span className="mint"><GraduationCap aria-hidden="true" /></span><strong>Data siswa</strong><small>Profil dan wali murid</small></Link>
            <Link href="/dashboard/activities"><span className="sun"><ClipboardList aria-hidden="true" /></span><strong>Laporan aktivitas</strong><small>Semua cerita kelas</small></Link>
            {view.payments && <Link href="/dashboard/payments"><span className="sky"><CreditCard aria-hidden="true" /></span><strong>Pembayaran</strong><small>Tagihan dan verifikasi</small></Link>}
          </nav>
        </aside>
      </div>
    </main>
  );
}
