// Browser client for the Django API.
//
// Every call goes through the same-origin proxy (app/api/proxy/[...path]),
// which attaches the access token from the httpOnly cookie and renews it when
// it expires. Client code therefore never sees a token or the backend URL.
//
// Paths are written without the "/api/" prefix or slashes around them:
//   apiGet("wallet")            → GET /api/proxy/wallet       → Django /api/wallet/
//   apiGetPage("wallet/ledger") → GET /api/proxy/wallet/ledger?page=1&page_size=10

import { ApiError } from "./errors";

const PROXY_PREFIX = "/api/proxy";
const LOGIN_PATH = "/login";

export type QueryValue = string | number | boolean | null | undefined;
/** Query parameters; empty, null, and undefined values are left out. */
export type Query = Readonly<Record<string, QueryValue>>;

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  method?: Method;
  query?: Query;
  /** Sent as JSON. */
  body?: unknown;
  signal?: AbortSignal;
};

/** One page of a list endpoint. */
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function proxyUrl(path: string, query: Query = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const search = params.toString();
  return `${PROXY_PREFIX}/${path.replace(/^\/+|\/+$/g, "")}${search ? `?${search}` : ""}`;
}

/** Sends the request; resolves with the response when it is 2xx, otherwise throws ApiError. */
async function send(path: string, { method = "GET", query, body, signal }: RequestOptions): Promise<Response> {
  const hasBody = body !== undefined;
  const response = await fetch(proxyUrl(path, query), {
    method,
    signal,
    credentials: "include",
    cache: "no-store",
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(body) : undefined,
  });
  if (response.ok) return response;
  // The proxy has already tried to renew the session; a 401 here means it is over.
  if (response.status === 401) window.location.assign(new URL(LOGIN_PATH, window.location.origin));
  throw await ApiError.fromResponse(response);
}

async function readJson<T>(response: Response): Promise<T> {
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return readJson<T>(await send(path, options));
}

export function apiGet<T>(path: string, query?: Query, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(path, { query, signal });
}

export function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(path, { method: "POST", body, signal });
}

/**
 * One page of a Django list endpoint. With `?page`, Django returns a bare JSON
 * array and puts the totals in X-Total-Count / X-Page / X-Page-Size /
 * X-Total-Pages headers (forwarded by the proxy).
 */
export async function apiGetPage<T>(path: string, page: number, pageSize: number, query: Query = {}, signal?: AbortSignal): Promise<Page<T>> {
  const response = await send(path, { query: { ...query, page, page_size: pageSize }, signal });
  const items = await readJson<T[]>(response);
  const header = (name: string, fallback: number) => {
    const raw = response.headers.get(name);
    const value = raw === null ? Number.NaN : Number(raw);
    return Number.isInteger(value) && value >= 0 ? value : fallback;
  };
  const total = header("X-Total-Count", items.length);
  const size = header("X-Page-Size", pageSize) || pageSize;
  return {
    items,
    total,
    page: header("X-Page", page),
    pageSize: size,
    totalPages: header("X-Total-Pages", Math.max(1, Math.ceil(total / size))),
  };
}
