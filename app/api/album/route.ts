import { NextRequest, NextResponse } from "next/server";
import { fetchAlbumImages } from "@/features/album/core/images";
import { MAX_PHOTOS_PER_PDF, buildAlbum } from "@/features/album/core/model";
import { renderAlbumPdf } from "@/features/album/core/pdf/render";
import { currentMonth, parsePeriodParam } from "@/features/album/core/period";
import { classAlbumSource } from "@/features/album/source";
import { backendClient } from "@/lib/backendClient";
import { SessionError, clearSessionCookies } from "@/lib/session";

export const dynamic = "force-dynamic";
// Fetching and shrinking the photos takes a few seconds; a semester of up to MAX_PHOTOS_PER_PDF fits comfortably.
export const maxDuration = 60;

type ApiClass = { id: number; name?: string; class_name?: string; branch?: number | null };
type ApiBranch = { id: number; name?: string; school?: number | null };
type ApiSchool = { id: number; name?: string; school_name?: string };

/** The PDF opens in a new tab, so an error has to be a page the reader can see, not JSON. */
function errorPage(message: string, status: number) {
  const escaped = message.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] as string);
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Album Kelas</title></head><body style="font-family:sans-serif;padding:32px"><p>${escaped}</p></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

/** GET /api/album?class=<id>&period=2026-10 | range:<from>:<to> → the class's album as an inline PDF. */
export async function GET(request: NextRequest) {
  const classId = Number(request.nextUrl.searchParams.get("class"));
  if (!Number.isInteger(classId) || classId <= 0) return errorPage("Pilih kelas terlebih dahulu.", 400);
  const client = await backendClient();
  if (!client) return errorPage("DJANGO_API_URL is not configured", 500);
  try {
    const klass = await client.get<ApiClass>(`classes/${classId}/`);
    if (!klass) return errorPage("Kelas tidak ditemukan.", 404);
    // Teachers may not be allowed to read branches and schools; the cover then just says "Sekolah".
    const optional = <T,>(path: string) => client.get<T>(path).catch((error: unknown) => { if (error instanceof SessionError && error.status === 401) throw error; return null; });
    const branch = klass.branch ? await optional<ApiBranch>(`branches/${klass.branch}/`) : null;
    const schoolRecord = branch?.school ? await optional<ApiSchool>(`schools/${branch.school}/`) : null;
    const school = { name: schoolRecord?.name?.trim() || schoolRecord?.school_name?.trim() || "Sekolah", branchName: branch?.name?.trim() || undefined };
    const period = parsePeriodParam(request.nextUrl.searchParams.get("period") || undefined) ?? currentMonth();
    const album = buildAlbum(await classAlbumSource(classId, klass.name ?? klass.class_name ?? "", period, school, (path) => client.list(path)));
    if (album.photoUrls.length === 0) return errorPage("Belum ada foto pada periode ini.", 404);
    if (album.photoUrls.length > MAX_PHOTOS_PER_PDF) return errorPage(`Album ini memuat ${album.photoUrls.length} foto; buka per bagian dari tombol Album Kelas (maksimal ${MAX_PHOTOS_PER_PDF} foto per PDF).`, 413);
    const images = await fetchAlbumImages(album.photoUrls);
    const pdf = await renderAlbumPdf(album, images, { producer: "ClassPing School Portal" });
    return client.apply(new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${album.fileName}"`,
        "Cache-Control": "no-store",
      },
    }));
  } catch (error) {
    const status = error instanceof SessionError ? error.status : 502;
    const response = errorPage(error instanceof SessionError ? error.message : "Tidak dapat menghubungi server. Coba lagi.", status);
    if (status === 401) clearSessionCookies(response);
    return response;
  }
}
