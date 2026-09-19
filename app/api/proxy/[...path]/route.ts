import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies, refreshSession, SessionError, setSessionCookies, type Tokens } from "@/lib/session";

async function proxyRequest(request: NextRequest, path: string[]) {
  const apiUrl = process.env.DJANGO_API_URL;
  if (!apiUrl) return NextResponse.json({ detail: "DJANGO_API_URL is not configured" }, { status: 500 });

  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  let renewed: Tokens | undefined;

  try {
    if (!accessToken) {
      if (!refreshToken) throw new SessionError(401, "Authentication credentials were not provided.");
      renewed = await refreshSession(refreshToken);
      accessToken = renewed.access;
    }

    const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
    const url = `${apiUrl}/api/${path.map(encodeURIComponent).join("/")}/${request.nextUrl.search}`;
    const forward = (token: string) => {
      const headers = new Headers({ Authorization: `Bearer ${token}` });
      const contentType = request.headers.get("content-type");
      if (contentType) headers.set("Content-Type", contentType);
      return fetch(url, { method: request.method, headers, body, cache: "no-store", redirect: "manual" });
    };

    let upstream = await forward(accessToken);
    // Retry only a rejected authentication request, and only once. Reuse the
    // buffered body so POST/PATCH and multipart uploads survive renewal.
    if (upstream.status === 401 && refreshToken && !renewed) {
      renewed = await refreshSession(refreshToken);
      upstream = await forward(renewed.access);
    }
    if (upstream.status === 401) throw new SessionError(401, "Your session has expired. Please sign in again.");

    const headers = new Headers({ "Cache-Control": "no-store" });
    const contentType = upstream.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    const response = new NextResponse(upstream.status === 204 ? null : await upstream.arrayBuffer(), { status: upstream.status, headers });
    if (renewed) setSessionCookies(response, renewed);
    return response;
  } catch (error) {
    const status = error instanceof SessionError ? error.status : 502;
    const response = NextResponse.json({ detail: error instanceof SessionError ? error.message : "Unable to connect to Django API. Please try again." }, { status });
    if (status === 401) clearSessionCookies(response);
    else if (renewed) setSessionCookies(response, renewed);
    return response;
  }
}

export async function GET(
    request: NextRequest,
    context: {
        params: Promise<{ path: string[] }>;
    },
) {
    const { path } = await context.params;

    return proxyRequest(request, path);
}

export async function POST(
    request: NextRequest,
    context: {
        params: Promise<{ path: string[] }>;
    },
) {
    const { path } = await context.params;

    return proxyRequest(request, path);
}

export async function PUT(
    request: NextRequest,
    context: {
        params: Promise<{ path: string[] }>;
    },
) {
    const { path } = await context.params;

    return proxyRequest(request, path);
}

export async function PATCH(
    request: NextRequest,
    context: {
        params: Promise<{ path: string[] }>;
    },
) {
    const { path } = await context.params;

    return proxyRequest(request, path);
}

export async function DELETE(
    request: NextRequest,
    context: {
        params: Promise<{ path: string[] }>;
    },
) {
    const { path } = await context.params;

    return proxyRequest(request, path);
}
