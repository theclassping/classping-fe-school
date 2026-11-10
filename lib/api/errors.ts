// Errors from the Django API, as seen through /api/proxy.
//
// Django answers errors in two shapes:
//   coded:      {"detail": "…", "code": "INSUFFICIENT_BALANCE", ...extra}
//   validation: {"field": ["message", …], …}
// Features map `code` to Indonesian text with `errorMessage`; they never show
// the backend's English `detail` directly.

type ErrorBody = Record<string, unknown>;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Stable backend error code, e.g. "OTP_INVALID"; null for validation or unknown errors. */
    readonly code: string | null,
    /** The full JSON body, for extras such as `remaining_attempts`. */
    readonly body: ErrorBody,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const body = await readErrorBody(response);
    const code = typeof body.code === "string" ? body.code : null;
    return new ApiError(describeErrorBody(body) || `HTTP ${response.status}`, response.status, code, body);
  }
}

async function readErrorBody(response: Response): Promise<ErrorBody> {
  try {
    const value: unknown = await response.json();
    return value && typeof value === "object" && !Array.isArray(value) ? (value as ErrorBody) : {};
  } catch {
    return {};
  }
}

/** Developer-facing text of an error body: `detail`, otherwise the field errors joined. */
export function describeErrorBody(body: ErrorBody): string {
  if (typeof body.detail === "string") return body.detail;
  return Object.entries(body)
    .filter(([field]) => field !== "code")
    .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
    .join("; ");
}

/** True for a fetch cancelled through an AbortSignal (a superseded or unmounted request). */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/** Indonesian messages keyed by backend error code. */
export type ErrorMessages = Readonly<Record<string, string>>;

const STATUS_MESSAGES: Readonly<Record<number, string>> = {
  401: "Sesi berakhir. Silakan masuk kembali.",
  403: "Anda tidak memiliki akses ke fitur ini.",
  429: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
};
const SERVER_MESSAGE = "Server sedang bermasalah. Silakan coba lagi nanti.";

/**
 * User-facing message for any thrown error, most specific first:
 * the feature's message for the backend code, then a generic one for the
 * HTTP status, then `fallback`.
 */
export function errorMessage(error: unknown, fallback: string, messages: ErrorMessages = {}): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.code && messages[error.code]) return messages[error.code];
  return STATUS_MESSAGES[error.status] ?? (error.status >= 500 ? SERVER_MESSAGE : fallback);
}
