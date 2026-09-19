import { NextResponse } from "next/server";

// Cookies are shared across localhost ports; keep School separate from Guardian.
export const ACCESS_COOKIE = "school_access_token";
export const REFRESH_COOKIE = "school_refresh_token";

export type Tokens = { access: string; refresh?: string };

function tokenMaxAge(token: string, fallback: number) {
  try {
    const { exp } = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    if (typeof exp === "number") return Math.max(0, Math.floor(exp - Date.now() / 1000));
  } catch {
    // The backend validates tokens. Decoding here only aligns cookie expiry.
  }
  return fallback;
}

export function setSessionCookies(response: NextResponse, tokens: Tokens) {
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set(ACCESS_COOKIE, tokens.access, { ...options, maxAge: tokenMaxAge(tokens.access, 60 * 15) });
  if (tokens.refresh) {
    response.cookies.set(REFRESH_COOKIE, tokens.refresh, { ...options, maxAge: tokenMaxAge(tokens.refresh, 60 * 60 * 24 * 7) });
  }
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
}

export class SessionError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Coalesce concurrent API requests in this instance, without retaining tokens
// after refresh completes. Backend validation remains authoritative.
const refreshing = new Map<string, Promise<Tokens>>();

export function refreshSession(refreshToken: string): Promise<Tokens> {
  const existing = refreshing.get(refreshToken);
  if (existing) return existing;
  const pending = (async () => {
    const response = await fetch(`${process.env.DJANGO_API_URL}/api/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
      cache: "no-store",
    });
    if (response.status === 400 || response.status === 401) {
      throw new SessionError(401, "Your session has expired. Please sign in again.");
    }
    if (!response.ok) throw new SessionError(502, "Unable to renew your session. Please try again.");
    const tokens = await response.json();
    if (typeof tokens.access !== "string" || !tokens.access ||
        (tokens.refresh !== undefined && typeof tokens.refresh !== "string")) {
      throw new SessionError(502, "Invalid session response from server.");
    }
    return { access: tokens.access, refresh: tokens.refresh };
  })().finally(() => refreshing.delete(refreshToken));
  refreshing.set(refreshToken, pending);
  return pending;
}
