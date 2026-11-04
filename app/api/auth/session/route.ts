import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE, isSessionUser, withUserBranch, refreshSession, setSessionCookies, clearSessionCookies, SessionError, type Tokens } from "@/lib/session";

// Login metadata for UI use only. Backend token validation remains authoritative
// for permissions; never authorize requests using this cookie's role.
export async function GET(request: NextRequest) {
  const options = { headers: { "Cache-Control": "no-store" } };
  if (!request.cookies.get(ACCESS_COOKIE)?.value && !request.cookies.get(REFRESH_COOKIE)?.value) {
    return NextResponse.json({ user: null }, { ...options, status: 401 });
  }

  try {
    const user: unknown = JSON.parse(request.cookies.get(USER_COOKIE)?.value ?? "null");
    if (!isSessionUser(user)) return NextResponse.json({ user: null }, options);
    if (user.branch_id !== undefined) return NextResponse.json({ user }, options);

    let access = request.cookies.get(ACCESS_COOKIE)?.value;
    const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
    let renewed: Tokens | undefined;
    if (!access && refresh) {
      renewed = await refreshSession(refresh);
      access = renewed.access;
    }
    if (!access) return NextResponse.json({ user: null }, { ...options, status: 401 });
    let enriched;
    try {
      enriched = await withUserBranch(user, access);
    } catch (error) {
      if (!(error instanceof SessionError) || error.status !== 401 || !refresh || renewed) throw error;
      renewed = await refreshSession(refresh);
      access = renewed.access;
      enriched = await withUserBranch(user, access);
    }
    const response = NextResponse.json({ user: enriched }, options);
    setSessionCookies(response, { access, refresh: renewed?.refresh ?? refresh }, enriched);
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ user: null }, options);
    const status = error instanceof SessionError ? error.status : 502;
    const response = NextResponse.json({ detail: "Unable to load session. Please try again." }, { ...options, status });
    if (status === 401) clearSessionCookies(response);
    return response;
  }
}
