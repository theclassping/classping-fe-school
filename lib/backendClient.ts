// Server-side reads from the Django API with the signed-in user's token, for route handlers that cannot go through
// /api/proxy (the album PDF). Mirrors the proxy: renew an expired access token once, then set the renewed cookies.
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, SessionError, refreshSession, setSessionCookies, type Tokens } from "@/lib/session";

export class BackendClient {
  renewed?: Tokens;

  constructor(private apiUrl: string, private access: string | undefined, private refresh: string | undefined) {}

  private async request(path: string): Promise<Response> {
    const url = `${this.apiUrl}/api/${path}`;
    const send = (token: string) => fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!this.access) {
      if (!this.refresh) throw new SessionError(401, "Authentication credentials were not provided.");
      this.renewed = await refreshSession(this.refresh);
      this.access = this.renewed.access;
    }
    let response = await send(this.access);
    if (response.status === 401 && this.refresh && !this.renewed) {
      this.renewed = await refreshSession(this.refresh);
      this.access = this.renewed.access;
      response = await send(this.access);
    }
    if (response.status === 401) throw new SessionError(401, "Your session has expired. Please sign in again.");
    return response;
  }

  /** One record, or null when the backend answers 404; other failures throw. */
  async get<T>(path: string): Promise<T | null> {
    const response = await this.request(path);
    if (response.status === 404) return null;
    if (!response.ok) throw new SessionError(502, `Backend answered ${response.status} for ${path}.`);
    return (await response.json()) as T;
  }

  /** Every record of a list endpoint, following DRF pagination. */
  async list<T>(path: string): Promise<T[]> {
    const records: T[] = [];
    const visited = new Set<string>();
    let next: string | null = path;
    while (next && !visited.has(next)) {
      visited.add(next);
      const data: T[] | { results?: T[]; data?: T[]; next?: string | null } | null = await this.get(next);
      if (!data) break;
      if (Array.isArray(data)) {
        records.push(...data);
        break;
      }
      records.push(...(data.results ?? data.data ?? []));
      next = data.next ? data.next.replace(/^.*?\/api\//, "") : null;
    }
    return records;
  }

  /** Carries renewed session cookies to the browser, as the proxy does. */
  apply(response: NextResponse) {
    if (this.renewed) setSessionCookies(response, this.renewed);
    return response;
  }
}

/** A client for the current request's session; null when the API URL is not configured. */
export async function backendClient(): Promise<BackendClient | null> {
  const apiUrl = process.env.DJANGO_API_URL;
  if (!apiUrl) return null;
  const jar = await cookies();
  return new BackendClient(apiUrl, jar.get(ACCESS_COOKIE)?.value, jar.get(REFRESH_COOKIE)?.value);
}
