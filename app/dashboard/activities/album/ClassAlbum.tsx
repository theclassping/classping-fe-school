"use client";

// The album of one class: class and period live in the URL so the preview and the PDF link always agree.
import { Download } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AlbumPreview from "classping-album/components/AlbumPreview";
import { buildAlbum, downloadPeriodsFor } from "classping-album/model";
import { currentMonth, monthLabel, parsePeriodParam, periodLabel, periodParam, type AcademicYearOption, type Period } from "classping-album/period";
import type { AlbumDocument, AlbumSchool } from "classping-album/types";
import { loadList } from "@/lib/loadList";
import { loadActivityClasses, type ActivityClass } from "../activityClasses";
import { academicYearOptions, classAlbumMonths, classAlbumSource, type ListReader } from "@/features/album/source";
import { loadCurrentBranch } from "../../profile/branchApi";

/** Reads a backend list through the authenticated proxy, following pagination. */
const list: ListReader = (path) => loadList(`/api/proxy/${path}`);

type Month = { year: number; month: number };

async function loadSchool(): Promise<{ school: AlbumSchool; branchId: number }> {
  const branch = await loadCurrentBranch();
  let name = "";
  if (branch.school) {
    const response = await fetch(`/api/proxy/schools/${branch.school}/`, { credentials: "include", cache: "no-store" });
    if (response.ok) {
      const record: { name?: string; school_name?: string } = await response.json();
      name = record.name?.trim() || record.school_name?.trim() || "";
    }
  }
  return { school: { name: name || "Sekolah", branchName: branch.name?.trim() || undefined }, branchId: branch.id };
}

export default function ClassAlbum() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [classes, setClasses] = useState<ActivityClass[] | null>(null);
  const [school, setSchool] = useState<{ school: AlbumSchool; branchId: number } | null>(null);
  const [years, setYears] = useState<AcademicYearOption[]>([]);
  // Months and album are tagged with what they were loaded for, so a stale one is simply not shown.
  const [loadedMonths, setLoadedMonths] = useState<{ classId: number; months: Month[] } | null>(null);
  const [loadedAlbum, setLoadedAlbum] = useState<{ key: string; document: AlbumDocument } | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const requestedClass = searchParams.get("class") ?? "";
  const selectedClass = useMemo(() => classes?.find((item) => item.id === requestedClass) ?? classes?.[0] ?? null, [classes, requestedClass]);
  const classId = selectedClass ? Number(selectedClass.id) : 0;
  const months = loadedMonths?.classId === classId ? loadedMonths.months : null;
  const requestedPeriod = searchParams.get("period") ?? "";
  const period: Period | null = useMemo(() => {
    if (!months) return null;
    return parsePeriodParam(requestedPeriod || undefined, years) ?? (months[0] ? { kind: "month", ...months[0] } : currentMonth());
  }, [months, years, requestedPeriod]);
  const periodKey = period ? periodParam(period) : "";
  const albumKey = `${classId}:${periodKey}`;
  const album = loadedAlbum?.document ?? null;
  const building = Boolean(classId && period) && loadedAlbum?.key !== albumKey;

  // The classes this user may see, and the school for the cover.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [loadedClasses, loadedSchool] = await Promise.all([loadActivityClasses(), loadSchool()]);
        if (!active) return;
        setClasses(loadedClasses);
        setSchool(loadedSchool);
        setYears(await academicYearOptions(loadedSchool.branchId, list));
      } catch (loadError) {
        console.error(loadError);
        if (active) setError(loadError instanceof Error ? loadError.message : "Gagal memuat daftar kelas.");
      }
    })();
    return () => { active = false; };
  }, []);

  // The months the selected class has activities in.
  useEffect(() => {
    if (!classId) return;
    let active = true;
    classAlbumMonths(classId, list)
      .then((loaded) => { if (active) setLoadedMonths({ classId, months: loaded }); })
      .catch((loadError) => { console.error(loadError); if (active) setError("Gagal memuat kegiatan kelas."); });
    return () => { active = false; };
  }, [classId]);

  // The album itself, rebuilt whenever the class or the period changes.
  useEffect(() => {
    if (!classId || !period || !school || !selectedClass) return;
    let active = true;
    const key = albumKey;
    classAlbumSource(classId, selectedClass.label, period, school.school, list)
      .then((source) => { if (active) { setLoadedAlbum({ key, document: buildAlbum(source) }); setError(""); } })
      .catch((loadError) => { console.error(loadError); if (active) setError("Gagal menyusun album kelas."); });
    return () => { active = false; };
    // albumKey stands in for the period object, which is rebuilt on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, albumKey, school, selectedClass?.label]);

  function update(key: "class" | "period", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    if (key === "class") params.delete("period");
    router.replace(`${pathname}?${params.toString()}`);
  }

  const periodChoices = useMemo(() => {
    const choices = [
      ...(months ?? []).map(({ year, month }) => ({ value: periodParam({ kind: "month", year, month }), label: monthLabel(year, month) })),
      ...years.map((year) => ({ value: `year:${year.id}`, label: `Tahun Ajaran ${year.label}` })),
    ];
    if (period && !choices.some((choice) => choice.value === periodKey)) {
      choices.unshift({ value: periodKey, label: periodLabel(period) });
    }
    return choices;
  }, [months, years, period, periodKey]);

  if (classes && classes.length === 0) {
    return <p className="empty-state">Belum ada kelas yang dapat Anda lihat. Album kelas tersedia untuk kelas yang Anda ampu.</p>;
  }

  // A year with more photos than one PDF can hold downloads as consecutive parts.
  const downloadParts = album ? downloadPeriodsFor(album).map((part) => ({ value: periodParam(part), label: periodLabel(part) })) : [{ value: periodKey, label: period ? periodLabel(period) : "" }];
  const hrefFor = (value: string) => (classId ? `/api/album?class=${classId}&period=${encodeURIComponent(value)}` : "#");
  return (
    <div className="class-album">
      <div className="al-toolbar panel">
        <label>
          <span>Kelas</span>
          <select aria-label="Pilih kelas" value={selectedClass?.id ?? ""} onChange={(event) => update("class", event.target.value)} disabled={!classes}>
            {!classes && <option value="">Memuat kelas…</option>}
            {classes?.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label>
          <span>Periode</span>
          <select aria-label="Pilih periode" value={periodKey} onChange={(event) => update("period", event.target.value)} disabled={!period}>
            {!period && <option value="">Memuat periode…</option>}
            {periodChoices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </select>
        </label>
        {album && <p>{album.pages.length} halaman · {album.photoUrls.length} foto</p>}
        {downloadParts.length === 1 ? (
          <a
            className="primary-button"
            href={hrefFor(downloadParts[0].value)}
            download
            aria-disabled={!album || building}
            aria-busy={downloading}
            onClick={(event) => {
              if (!album || building) { event.preventDefault(); return; }
              setDownloading(true);
              setTimeout(() => setDownloading(false), 8000);
            }}
          >
            <Download aria-hidden="true" /> {downloading ? "Menyiapkan PDF…" : "Unduh PDF"}
          </a>
        ) : (
          <div className="al-download-parts">
            <small>Album ini besar, jadi diunduh dalam {downloadParts.length} berkas PDF.</small>
            <div>
              {downloadParts.map((part, index) => (
                <a key={part.value} className="primary-button" href={hrefFor(part.value)} download aria-disabled={building} onClick={(event) => { if (building) event.preventDefault(); }}>
                  <Download aria-hidden="true" /> Bagian {index + 1}: {part.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
      {error && <p className="al-status error" role="alert">{error}</p>}
      {!error && !album && <p className="al-status">Menyusun album…</p>}
      {album && building && <p className="al-status">Memperbarui album…</p>}
      {album && <AlbumPreview document={album} />}
      {selectedClass && album && album.photoUrls.length === 0 && (
        <p className="al-status">Belum ada foto yang dipublikasikan untuk {selectedClass.label} pada periode ini. <Link href="/dashboard/activities/add">Tambah aktivitas</Link></p>
      )}
    </div>
  );
}
