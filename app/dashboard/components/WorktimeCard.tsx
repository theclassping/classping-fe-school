"use client";

import { useEffect, useRef, useState } from "react";
import { addSchoolNotification } from "./school-store";

type WorktimeRecord = {
  weekKey: string;
  days: number[];
  previousTotal: number;
};

const storageKey = "classping-react-school-worktime";
const labels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const seedDays = [120, 210, 165, 270, 0, 0, 0];

function getWeek(date = new Date()) {
  const start = new Date(date);
  const dayFromMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayFromMonday);
  start.setHours(0, 1, 0, 0);
  if (date < start) start.setDate(start.getDate() - 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  return { start, end, key };
}

function getWeekFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const start = new Date(year, month - 1, day, 0, 1, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

function formatMinutes(value: number, zero = "—") {
  const minutes = Math.max(0, Math.round(value));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return remainder ? `${remainder}m` : zero;
  return remainder ? `${hours}j ${remainder}m` : `${hours}j`;
}

function currentRecord(): WorktimeRecord {
  const week = getWeek();
  if (typeof window === "undefined") return { weekKey: week.key, days: seedDays, previousTotal: 685 };
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null") as WorktimeRecord | null;
    if (!saved) return { weekKey: week.key, days: seedDays, previousTotal: 685 };
    if (saved.weekKey !== week.key) {
      return {
        weekKey: week.key,
        days: Array(7).fill(0),
        previousTotal: saved.days.reduce((sum, item) => sum + Number(item || 0), 0),
      };
    }
    return { ...saved, days: Array.from({ length: 7 }, (_, index) => Number(saved.days[index] || 0)) };
  } catch {
    return { weekKey: week.key, days: seedDays, previousTotal: 685 };
  }
}

function initialRecord(): WorktimeRecord {
  return { weekKey: getWeek().key, days: seedDays, previousTotal: 685 };
}

export default function WorktimeCard() {
  const [record, setRecord] = useState<WorktimeRecord>(() => initialRecord());
  const [storageReady, setStorageReady] = useState(false);
  const lastTick = useRef(0);
  const week = getWeekFromKey(record.weekKey);
  const total = record.days.reduce((sum, item) => sum + item, 0);
  const difference = total - record.previousTotal;
  const todayIndex = (new Date().getDay() + 6) % 7;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRecord(currentRecord());
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    window.localStorage.setItem(storageKey, JSON.stringify(record));
    if (total >= 40 * 60) {
      addSchoolNotification({
        id: `hours-over-${record.weekKey}`,
        type: "hours",
        title: "Batas 40 jam terlampaui",
        message: `Waktu aktif pekan ini sudah ${formatMinutes(total, "0m")}. Pertimbangkan pembagian beban kerja.`,
        href: "/dashboard",
      });
    } else if (total >= 36 * 60) {
      addSchoolNotification({
        id: `hours-near-${record.weekKey}`,
        type: "hours",
        title: "Mendekati 40 jam pekan ini",
        message: `Waktu aktif sudah ${formatMinutes(total, "0m")} dari target 40 jam.`,
        href: "/dashboard",
      });
    }
  }, [record, storageReady, total]);

  useEffect(() => {
    lastTick.current = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      const elapsed = Math.min(1, Math.max(0, (now - lastTick.current) / 60_000));
      lastTick.current = now;
      if (document.hidden) return;
      setRecord((current) => {
        const latestWeek = getWeek(new Date(now));
        const next = current.weekKey === latestWeek.key
          ? { ...current, days: [...current.days] }
          : { weekKey: latestWeek.key, days: Array(7).fill(0), previousTotal: current.days.reduce((sum, item) => sum + item, 0) };
        const index = (new Date(now).getDay() + 6) % 7;
        next.days[index] += elapsed;
        return next;
      });
    }, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" });
  const weekLabel = `${dateFormatter.format(week.start)}–${dateFormatter.format(week.end)}`;

  return (
    <article className="panel worktime-card">
      <div className="panel-heading">
        <div><h2>Aktivitas Anda Pekan Ini</h2><p>Waktu aktif mengelola ClassPing</p></div>
        <span className="week-chip">{weekLabel}</span>
      </div>
      <div className="worktime-summary">
        <div><strong>{formatMinutes(total, "0m")}</strong><span>Total waktu aktif</span></div>
        <span className={`worktime-change ${difference < 0 ? "down" : ""}`}>{difference === 0 ? "Sama dengan minggu lalu" : `${difference > 0 ? "↗" : "↘"} ${formatMinutes(Math.abs(difference), "0m")} dari minggu lalu`}</span>
      </div>
      <div className="worktime-chart" aria-label={`Waktu aktif pekan ini: ${record.days.map((minutes, index) => `${labels[index]} ${formatMinutes(minutes)}`).join(", ")}`}>
        {record.days.map((minutes, index) => (
          <div className={`workday ${index === todayIndex ? "today" : ""} ${index > todayIndex ? "future" : ""}`} key={labels[index]}>
            <span><i style={{ height: `${Math.min(100, Math.max(minutes > 0 ? 3 : 0, (minutes / 480) * 100))}%` }} /></span>
            <b>{formatMinutes(minutes)}</b><small>{labels[index]}</small>
          </div>
        ))}
      </div>
      <div className="weekly-goal"><span>Target mingguan</span><strong>{formatMinutes(total, "0m")} / 40j</strong><div className="progress"><i style={{ width: `${Math.min(100, (total / 2400) * 100)}%` }} /></div></div>
    </article>
  );
}
