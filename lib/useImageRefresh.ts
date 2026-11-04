"use client";

import { useCallback, useEffect, useRef, type SyntheticEvent } from "react";

// Presigned image URLs are reused server-side and may reach the client with only
// ~10 minutes left. When an <img> fails (usually a 403 after expiry), refetch the
// record so it carries fresh URLs. Throttled so a genuinely broken image cannot loop.
const MIN_REFRESH_INTERVAL_MS = 30_000;

export function useImageRefresh(refresh: () => Promise<unknown>) {
  const latest = useRef(refresh);
  const state = useRef({ running: false, last: 0 });
  useEffect(() => { latest.current = refresh; }, [refresh]);

  return useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const src = event.currentTarget.currentSrc || event.currentTarget.src;
    // Local previews (object/data URLs) never expire.
    if (!src.startsWith("http")) return;
    const current = state.current;
    if (current.running || Date.now() - current.last < MIN_REFRESH_INTERVAL_MS) return;
    current.running = true;
    current.last = Date.now();
    void latest.current().catch(() => {}).finally(() => { current.running = false; });
  }, []);
}
