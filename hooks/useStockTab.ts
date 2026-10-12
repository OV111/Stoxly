"use client";

import { useCallback, useEffect, useState } from "react";
import type { TabResponse } from "@/types/stock-tabs";

/**
 * Session-lifetime cache of tab responses, so flipping back to a tab you've
 * already opened is instant. Server and CDN caching handle freshness; this
 * only avoids repeat round-trips within one visit.
 */
const responseCache = new Map<string, TabResponse<unknown>>();

type Result<T> = { url: string; response: TabResponse<T> | null; error: string | null };

/**
 * Fetches one stock-detail tab. Display state is derived during render from
 * the cache and the last settled request, so the effect only ever sets state
 * from async callbacks.
 */
export function useStockTab<T>(symbol: string, tab: string, query?: Record<string, string | undefined>) {
  const qs = new URLSearchParams(
    Object.entries(query ?? {}).filter((e): e is [string, string] => Boolean(e[1])),
  ).toString();
  const base = `/api/stocks/${encodeURIComponent(symbol)}/${tab}`;
  const url = `${base}${qs ? `?${qs}` : ""}`;

  const [result, setResult] = useState<Result<T> | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (responseCache.has(url)) return;

    const controller = new AbortController();
    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
        return body as TabResponse<T>;
      })
      .then((response) => {
        if (response.available) responseCache.set(url, response);
        setResult({ url, response, error: null });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setResult({ url, response: null, error: err instanceof Error ? err.message : "Request failed" });
      });

    return () => controller.abort();
  }, [url, attempt]);

  const cached = responseCache.get(url) as TabResponse<T> | undefined;
  const current = result?.url === url ? result : null;
  const response = cached ?? current?.response ?? null;
  const error = cached ? null : (current?.error ?? null);
  // While a new query loads (e.g. another options expiration), keep showing
  // the previous response dimmed instead of flashing a spinner — but only for
  // the same symbol and tab, never another stock's numbers.
  const sameView = result !== null && (result.url === base || result.url.startsWith(`${base}?`));
  const previous = !response && !error && sameView ? (result.response ?? null) : null;

  const retry = useCallback(() => {
    responseCache.delete(url);
    setResult(null);
    setAttempt((n) => n + 1);
  }, [url]);

  return {
    response: response ?? previous,
    loading: !response && !error && !previous,
    refetching: Boolean(previous),
    error,
    retry,
  };
}
