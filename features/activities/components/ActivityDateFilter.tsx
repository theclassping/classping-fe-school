"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  lastThirtyDaysStart,
  shiftDay,
  stepDays,
  todayKey,
  type ActivityDateFilter as Filter,
  type ActivityDateMode,
} from "../dateFilter";
import ActivityDatePicker from "./ActivityDatePicker";
import styles from "./ActivityDateFilter.module.css";

const MODES: [ActivityDateMode, string][] = [["all", "Semua"], ["day", "Per hari"], ["week", "Per minggu"], ["range", "30 hari"]];
const UNITS = { day: "Hari", week: "Minggu", range: "30 hari" } as const;

type Props = {
  value: Filter;
  onChange: (value: Filter) => void;
};

/** Chooses which activities are listed: all, one day, one school week, or 30 days from a chosen start date. */
export default function ActivityDateFilter({ value, onChange }: Props) {
  const { mode, date } = value;

  function changeMode(next: ActivityDateMode) {
    // The 30-day view opens on the 30 days ending today; leaving it returns to today.
    const nextDate = next === "range" ? lastThirtyDaysStart() : mode === "range" ? todayKey() : date;
    onChange({ mode: next, date: nextDate });
  }
  const changeDate = (next: string) => onChange({ mode, date: next });

  return (
    <div className={styles.filter} role="group" aria-label="Filter tanggal aktivitas">
      <div className={styles.segmented} role="radiogroup" aria-label="Rentang waktu">
        {MODES.map(([key, label]) => (
          <button key={key} type="button" role="radio" aria-checked={mode === key} className={mode === key ? styles.active : ""} onClick={() => changeMode(key)}>{label}</button>
        ))}
      </div>
      {mode !== "all" && (
        <div className={styles.stepper}>
          <button type="button" aria-label={`${UNITS[mode]} sebelumnya`} onClick={() => changeDate(shiftDay(date, -stepDays(mode)))}><ChevronLeft /></button>
          <ActivityDatePicker mode={mode} value={date} onChange={changeDate} />
          <button type="button" aria-label={`${UNITS[mode]} berikutnya`} onClick={() => changeDate(shiftDay(date, stepDays(mode)))}><ChevronRight /></button>
          <button type="button" className={styles.reset} onClick={() => changeDate(mode === "range" ? lastThirtyDaysStart() : todayKey())}>
            {mode === "range" ? "30 hari terakhir" : "Hari ini"}
          </button>
        </div>
      )}
    </div>
  );
}
