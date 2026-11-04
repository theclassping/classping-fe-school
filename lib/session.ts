import { NextResponse } from "next/server";

// Cookies are shared across localhost ports; keep School separate from Guardian.
export const ACCESS_COOKIE = "school_access_token";
export const REFRESH_COOKIE = "school_refresh_token";
export const USER_COOKIE = "school_user";

export type SessionUser = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  branch_id?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== "object") return false;
  const user = value as Record<string, unknown>;
  return (user.branch_id === undefined || user.branch_id === null ||
    (typeof user.branch_id === "number" && Number.isInteger(user.branch_id) && user.branch_id > 0)) &&
    typeof user.id === "number" && typeof user.is_active === "boolean" &&
    ["email", "first_name", "last_name", "full_name", "role", "created_at", "updated_at"]
      .every((field) => typeof user[field] === "string") && Boolean(user.role);
}

export type Tokens = { access: string; refresh?: string };

// UI metadata only; backend permissions remain authoritative.
export async function withUserBranch(user: SessionUser, access: string): Promise<SessionUser> {
  if (user.branch_id !== undefined) return user;
  let query = new URLSearchParams({ user: String(user.id) }).toString();
  const visited = new Set<string>();
  while (!visited.has(query)) {
    visited.add(query);
    const response = await fetch(`${process.env.DJANGO_API_URL}/api/staffs/?${query}`, {
      headers: { Authorization: `Bearer ${access}` }, cache: "no-store",
    });
    if (!response.ok) throw new SessionError(response.status === 401 ? 401 : 502, "Unable to load the user's branch.");
    const data = await response.json();
    const records = Array.isArray(data) ? data : data.results ?? data.data ?? [];
    const staff = records.find((record: { user: number; is_active: boolean; branch: number }) =>
      record.user === user.id && record.is_active && Number.isInteger(record.branch) && record.branch > 0);
    if (staff) return { ...user, branch_id: staff.branch };
    if (!data.next) break;
    const params = new URL(data.next, "https://backend.invalid").searchParams;
    params.set("user", String(user.id));
    query = params.toString();
  }
  return { ...user, branch_id: null };
}

function tokenMaxAge(token: string, fallback: number) {
  try {
    const { exp } = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    if (typeof exp === "number") return Math.max(0, Math.floor(exp - Date.now() / 1000));
  } catch {
    // The backend validates tokens. Decoding here only aligns cookie expiry.
  }
  return fallback;
}

export function setSessionCookies(response: NextResponse, tokens: Tokens, user?: SessionUser) {
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set(ACCESS_COOKIE, tokens.access, { ...options, maxAge: tokenMaxAge(tokens.access, 60 * 15) });
  if (tokens.refresh) {
    response.cookies.set(REFRESH_COOKIE, tokens.refresh, { ...options, maxAge: tokenMaxAge(tokens.refresh, 60 * 60 * 24 * 7) });
  }
  if (user) {
    response.cookies.set(USER_COOKIE, JSON.stringify(user), {
      ...options,
      maxAge: tokenMaxAge(tokens.refresh ?? tokens.access, 60 * 60 * 24 * 7),
    });
  }
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  response.cookies.delete(USER_COOKIE);
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
