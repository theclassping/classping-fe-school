import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, USER_COOKIE, isSessionUser } from "@/lib/session";

// Login metadata for UI use only. Backend token validation remains authoritative
// for permissions; never authorize requests using this cookie's role.
export function GET(request: NextRequest) {
  const options = { headers: { "Cache-Control": "no-store" } };
  if (!request.cookies.get(ACCESS_COOKIE)?.value && !request.cookies.get(REFRESH_COOKIE)?.value) {
    return NextResponse.json({ user: null }, { ...options, status: 401 });
  }

  try {
    const user: unknown = JSON.parse(request.cookies.get(USER_COOKIE)?.value ?? "null");
    return NextResponse.json({ user: isSessionUser(user) ? user : null }, options);
  } catch {
    return NextResponse.json({ user: null }, options);
  }
}
