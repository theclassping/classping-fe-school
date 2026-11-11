"use client";

import { useCallback, useEffect, useState } from "react";
import { isAbortError } from "./api/errors";

export type Resource<T> = {
  /** Latest loaded value; kept while a reload is in flight so the UI does not flash empty. */
  data: T | undefined;
  /** Error of the latest load, if it failed. */
  error: unknown;
  loading: boolean;
  /** Loads again with the same loader. */
  reload: () => void;
};

type Settled<T> = {
  loader: (signal: AbortSignal) => Promise<T>;
  attempt: number;
  data: T | undefined;
  error: unknown;
};

/**
 * Runs an async loader and tracks its result. The loader runs again whenever
 * its identity changes, so wrap it in useCallback with the inputs it depends
 * on (filters, page, id). Superseded requests are aborted.
 */
export function useResource<T>(loader: (signal: AbortSignal) => Promise<T>): Resource<T> {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loader(controller.signal).then(
      (data) => setSettled({ loader, attempt, data, error: undefined }),
      (error: unknown) => {
        if (isAbortError(error)) return;
        setSettled((previous) => ({ loader, attempt, data: previous?.data, error }));
      },
    );
    return () => controller.abort();
  }, [loader, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  const current = settled?.loader === loader && settled.attempt === attempt;

  return {
    data: settled?.data,
    error: current ? settled.error : undefined,
    loading: !current,
    reload,
  };
}
