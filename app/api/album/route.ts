import { NextRequest, NextResponse } from "next/server";
import { fetchAlbumImages } from "classping-album/images";
import { MAX_PHOTOS_PER_PDF, buildAlbum } from "classping-album/model";
import { renderAlbumPdf } from "classping-album/pdf/render";
import { currentMonth, parsePeriodParam } from "classping-album/period";
import { academicYearOptions, classAlbumSource } from "@/features/album/source";
import { backendClient } from "@/lib/backendClient";
import { SessionError, clearSessionCookies } from "@/lib/session";

export const dynamic = "force-dynamic";
// Fetching and shrinking a month of class photos takes a few seconds; a whole year can take longer.
export const maxDuration = 60;


type ApiClass = { id: number; name?: string; class_name?: string; branch?: number | null };
type ApiBranch = { id: number; name?: string; school?: number | null };
type ApiSchool = { id: number; name?: string; school_name?: string };

function errorResponse(detail: string, status: number) {
  return NextResponse.json({ detail }, { status, headers: { "Cache-Control": "no-store" } });
}

/** GET /api/album?class=<id>&period=2026-10 | year:<id> → the class's album as a PDF download. */
export async function GET(request: NextRequest) {
  const classId = Number(request.nextUrl.searchParams.get("class"));
  if (!Number.isInteger(classId) || classId <= 0) return errorResponse("Pilih kelas terlebih dahulu.", 400);
  const client = await backendClient();
  if (!client) return errorResponse("DJANGO_API_URL is not configured", 500);
  try {
    const klass = await client.get<ApiClass>(`classes/${classId}/`);
    if (!klass) return errorResponse("Kelas tidak ditemukan.", 404);
    const branch = klass.branch ? await client.get<ApiBranch>(`branches/${klass.branch}/`) : null;
    const schoolRecord = branch?.school ? await client.get<ApiSchool>(`schools/${branch.school}/`) : null;
    const school = { name: schoolRecord?.name?.trim() || schoolRecord?.school_name?.trim() || "Sekolah", branchName: branch?.name?.trim() || undefined };
    const years = await academicYearOptions(klass.branch, (path) => client.list(path));
    const period = parsePeriodParam(request.nextUrl.searchParams.get("period") || undefined, years) ?? currentMonth();
    const album = buildAlbum(await classAlbumSource(classId, klass.name ?? klass.class_name ?? "", period, school, (path) => client.list(path)));
    if (album.photoUrls.length > MAX_PHOTOS_PER_PDF) return errorResponse(`Album ini memuat ${album.photoUrls.length} foto; unduh per bagian dari halaman album (maksimal ${MAX_PHOTOS_PER_PDF} foto per PDF).`, 413);
    const images = await fetchAlbumImages(album.photoUrls);
    const pdf = await renderAlbumPdf(album, images, { producer: "ClassPing School Portal" });
    return client.apply(new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${album.fileName}"`,
        "Cache-Control": "no-store",
      },
    }));
  } catch (error) {
    const status = error instanceof SessionError ? error.status : 502;
    const response = errorResponse(error instanceof SessionError ? error.message : "Unable to connect to Django API. Please try again.", status);
    if (status === 401) clearSessionCookies(response);
    return response;
  }
}
