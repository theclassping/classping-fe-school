import { NextRequest, NextResponse } from "next/server";
import { fetchAlbumImages } from "@/features/album/core/images";
import { albumLoadingPage } from "@/features/album/core/loading";
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
/** The last path segment is the file name (…/album-kelas-a-2026-11-04.pdf), which browsers and Safari's viewer use. */
export async function GET(request: NextRequest, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  if (!file.endsWith(".pdf")) return errorPage("Berkas album tidak dikenal.", 404);
  // A tab navigating here gets a loading page first; it fetches the PDF with `direct=1` and then comes back to it.
  if (request.headers.get("sec-fetch-dest") === "document" && request.nextUrl.searchParams.get("direct") !== "1") {
    const pdfUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, "http://x");
    pdfUrl.searchParams.set("direct", "1");
    return new NextResponse(albumLoadingPage({ title: "Album Kelas", pdfUrl: pdfUrl.pathname + pdfUrl.search }), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }
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
    let pdf: Buffer;
    try {
      const images = await fetchAlbumImages(album.photoUrls);
      pdf = await renderAlbumPdf(album, images, { producer: "ClassPing School Portal" });
    } catch (error) {
      // Vercel keeps the stack in its function logs; the tab gets the message so the failure is not a blank page.
      console.error("[album] generation failed", error);
      const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      return errorPage(`Album gagal dibuat. Coba lagi beberapa saat. (${detail})`, 500);
    }
    return client.apply(new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${album.fileName}"`,
        // Cacheable for this user only: the loading page fetches it, then navigates to it and the browser reuses the bytes.
        // (Safari's PDF viewer also shows a blank page for a response marked no-store.)
        "Cache-Control": "private, max-age=120",
      },
    }));
  } catch (error) {
    const status = error instanceof SessionError ? error.status : 502;
    const response = errorPage(error instanceof SessionError ? error.message : "Tidak dapat menghubungi server. Coba lagi.", status);
    if (status === 401) clearSessionCookies(response);
    return response;
  }
}
