import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, SessionError, clearSessionCookies, isSessionUser, refreshSession, setSessionCookies, type Tokens } from "@/lib/session";

export async function PATCH(request: NextRequest) {
  let renewed: Tokens | undefined;
  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  try {
    const fields = await request.json();
    if (typeof fields.first_name !== "string" || !fields.first_name.trim() ||
        typeof fields.last_name !== "string" || !fields.last_name.trim()) {
      return NextResponse.json({ detail: "Nama depan dan nama belakang wajib diisi." }, { status: 400 });
    }
    if (!access) {
      if (!refresh) throw new SessionError(401, "Silakan masuk kembali.");
      renewed = await refreshSession(refresh);
      access = renewed.access;
    }
    const send = async (method: string, body?: string): Promise<Response> => {
      // Select the account from the JWT, never from a client-supplied user ID.
      // The backend validates this token before reading or changing the account.
      let userId: unknown;
      try {
        userId = JSON.parse(Buffer.from(access!.split(".")[1], "base64url").toString()).user_id;
      } catch { throw new SessionError(401, "Sesi tidak valid. Silakan masuk kembali."); }
      if (!/^\d+$/.test(String(userId))) throw new SessionError(401, "Sesi tidak valid.");
      const response = await fetch(`${process.env.DJANGO_API_URL}/api/users/${userId}/`, {
        method, headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
        body, cache: "no-store",
      });
      if (response.status === 401 && refresh && !renewed) {
        renewed = await refreshSession(refresh);
        access = renewed.access;
        return send(method, body);
      }
      if (response.status === 401) throw new SessionError(401, "Silakan masuk kembali.");
      return response;
    };
    const upstream = await send("PATCH", JSON.stringify({
      first_name: fields.first_name.trim(), last_name: fields.last_name.trim(),
    }));
    if (!upstream.ok) {
      const response = new NextResponse(await upstream.text(), {
        status: upstream.status, headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json", "Cache-Control": "no-store" },
      });
      if (renewed) setSessionCookies(response, renewed);
      return response;
    }
    const detail = await send("GET");
    if (!detail.ok) throw new SessionError(502, "Nama tersimpan, tetapi profil belum dapat dimuat kembali. Silakan muat ulang halaman.");
    const user: unknown = await detail.json();
    if (!isSessionUser(user)) throw new SessionError(502, "Respons profil tidak valid.");
    const response = NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
    setSessionCookies(response, { access: access!, refresh: renewed?.refresh ?? refresh }, user);
    return response;
  } catch (error) {
    const status = error instanceof SessionError ? error.status : 502;
    const response = NextResponse.json({ detail: error instanceof Error ? error.message : "Gagal menyimpan profil." }, { status });
    if (status === 401) clearSessionCookies(response);
    else if (renewed) setSessionCookies(response, renewed);
    return response;
  }
}
