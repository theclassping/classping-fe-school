"use client";

// "Album Kelas" on the activity report: opens the PDF of whatever the list shows for the selected class in a new
// tab. The list showing everything has no range, so the button first asks for an academic year and semester.
import { useMemo, useState } from "react";
import type { Activity } from "@/app/dashboard/activities/activityData";
import { dayRangeOf, formatSelection, todayKey, type ActivityDateFilter } from "@/features/activities/dateFilter";
import { MAX_PHOTOS_PER_PDF, downloadPartsFor } from "@/features/album/core/model";
import { periodParam } from "@/features/album/core/period";
import { academicYearLabel, academicYearsOf, monthPhotoCountsFor, semesterLabel, semesterPeriod, type Semester } from "@/features/album/semester";

const HINT = "Pilih kelas terlebih dahulu untuk membuat album.";

const albumHref = (classId: number, period: string) => `/api/album?class=${classId}&period=${encodeURIComponent(period)}`;

export default function AlbumButton({ dateFilter, classId, activities }: { dateFilter: ActivityDateFilter; classId: number | undefined; activities: readonly Activity[] }) {
  if (!classId) {
    return (
      <div className="album-chooser">
        <button type="button" className="secondary-button album-button" disabled title={HINT}>Album Kelas</button>
        <p className="album-chooser-hint">{HINT}</p>
      </div>
    );
  }
  if (dateFilter.mode === "all") return <SemesterChooser classId={classId} activities={activities} />;
  const { start, end } = dayRangeOf(dateFilter.mode, dateFilter.date);
  return (
    <a className="secondary-button album-button" href={albumHref(classId, periodParam({ kind: "range", from: start, to: end }))} target="_blank" rel="noopener">
      Album Kelas <small>{formatSelection(dateFilter.mode, dateFilter.date)}</small>
    </a>
  );
}

function SemesterChooser({ classId, activities }: { classId: number; activities: readonly Activity[] }) {
  const dated = useMemo(() => activities.filter((item) => item.status !== "Draf").map((item) => ({ day: item.date.slice(0, 10), photos: item.photos })), [activities]);
  const years = useMemo(() => academicYearsOf(dated.map((item) => item.day), todayKey()), [dated]);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(years[0]);
  const [semester, setSemester] = useState<Semester>(1);
  const period = semesterPeriod(year, semester);
  const months = monthPhotoCountsFor(dated, period);
  const photos = months.reduce((sum, month) => sum + month.photos, 0);
  const parts = photos > MAX_PHOTOS_PER_PDF ? downloadPartsFor({ period, monthPhotoCounts: months }) : [];
  return (
    <div className="album-chooser">
      <button type="button" className="secondary-button album-button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        Album Kelas <small>Pilih semester</small>
      </button>
      {open && (
        <div className="panel album-chooser-panel" role="dialog" aria-label="Pilih semester album">
          <label>
            Tahun ajaran
            <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
              {years.map((value) => <option key={value} value={value}>{academicYearLabel(value)}</option>)}
            </select>
          </label>
          <fieldset>
            <legend>Semester</legend>
            {([1, 2] as const).map((value) => (
              <label key={value}>
                <input type="radio" name="album-semester" checked={semester === value} onChange={() => setSemester(value)} /> {semesterLabel(year, value)}
              </label>
            ))}
          </fieldset>
          {photos === 0 ? (
            <p className="album-chooser-note">Belum ada foto di semester ini.</p>
          ) : parts.length > 1 ? (
            <>
              <p className="album-chooser-note">{photos} foto, lebih dari {MAX_PHOTOS_PER_PDF} per PDF, jadi album dibuka per bagian.</p>
              {parts.map((part) => (
                <a key={part.label} className="secondary-button" href={albumHref(classId, periodParam(part.period))} target="_blank" rel="noopener">{part.label} ({part.photos} foto)</a>
              ))}
            </>
          ) : (
            <a className="primary-button" href={albumHref(classId, periodParam(period))} target="_blank" rel="noopener">Buka album ({photos} foto)</a>
          )}
        </div>
      )}
    </div>
  );
}
