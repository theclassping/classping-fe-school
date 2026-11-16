"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  calendarWeeks,
  dayRangeOf,
  formatDayKey,
  formatMonth,
  formatSelection,
  isWeekend,
  shiftMonth,
  todayKey,
  type DatedMode,
  type DayKey,
  type DayRange,
} from "../dateFilter";
import styles from "./ActivityDateFilter.module.css";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const COPY: Record<DatedMode, { dialog: string; hint: string }> = {
  day: { dialog: "Pilih tanggal", hint: "Klik tanggal untuk melihat aktivitas hari itu." },
  week: { dialog: "Pilih minggu", hint: "Klik tanggal mana pun untuk memilih minggu Senin sampai Jumat." },
  range: { dialog: "Pilih tanggal mulai", hint: "Klik tanggal mulai; 30 hari sejak tanggal itu ikut terpilih." },
};

type Props = {
  mode: DatedMode;
  value: DayKey;
  onChange: (value: DayKey) => void;
};

/**
 * A calendar popover. Clicking (or hovering) a day marks what the mode covers:
 * that day, its Monday-to-Friday week, or the 30 days starting there.
 */
export default function ActivityDatePicker({ mode, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => shiftMonth(value, 0));
  const [hovered, setHovered] = useState<DayKey | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const today = todayKey();

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function show() {
    setMonth(shiftMonth(value, 0));
    setHovered(null);
    setOpen((current) => !current);
  }

  function pick(day: DayKey) {
    onChange(day);
    setOpen(false);
  }

  const selected = dayRangeOf(mode, value);
  const preview = hovered && hovered !== value ? dayRangeOf(mode, hovered) : null;
  const inRange = (day: DayKey, range: DayRange) => day >= range.start && day <= range.end;

  return (
    <div className={styles.field} ref={root}>
      <button type="button" className={styles.trigger} aria-haspopup="dialog" aria-expanded={open} aria-controls={id} onClick={show}>
        <CalendarDays aria-hidden="true" />
        <span>{formatSelection(mode, value)}</span>
      </button>
      {open && (
        <div className={styles.popover} id={id} role="dialog" aria-label={COPY[mode].dialog}>
          <div className={styles.popoverHead}>
            <button type="button" aria-label="Bulan sebelumnya" onClick={() => setMonth((current) => shiftMonth(current, -1))}><ChevronLeft /></button>
            <strong aria-live="polite">{formatMonth(month)}</strong>
            <button type="button" aria-label="Bulan berikutnya" onClick={() => setMonth((current) => shiftMonth(current, 1))}><ChevronRight /></button>
          </div>
          <p className={styles.hint}>{COPY[mode].hint}</p>
          <table className={styles.calendar} onMouseLeave={() => setHovered(null)}>
            <thead><tr>{WEEKDAYS.map((name) => <th key={name} scope="col" abbr={name}>{name}</th>)}</tr></thead>
            <tbody>
              {calendarWeeks(month).map((week) => (
                <tr key={week[0]}>
                  {week.map((day) => {
                    const isSelected = inRange(day, selected);
                    const classes = [
                      day.slice(0, 7) !== month.slice(0, 7) ? styles.outside : "",
                      isWeekend(day) && mode === "week" ? styles.weekend : "",
                      isSelected ? styles.selected : "",
                      isSelected && day === selected.start ? styles.rangeStart : "",
                      isSelected && day === selected.end ? styles.rangeEnd : "",
                      preview && inRange(day, preview) ? styles.preview : "",
                      day === today ? styles.today : "",
                    ].filter(Boolean).join(" ");
                    return (
                      <td key={day} className={classes}>
                        <button
                          type="button"
                          aria-label={formatDayKey(day)}
                          aria-pressed={day === value}
                          onMouseEnter={() => setHovered(day)}
                          onFocus={() => setHovered(day)}
                          onClick={() => pick(day)}
                        >
                          {Number(day.slice(8, 10))}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
