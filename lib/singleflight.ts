/**
 * Request coalescing (a.k.a. singleflight).
 *
 * Solves the problem a TTL cache cannot: N concurrent callers asking for the
 * same key at the same instant all miss the (still empty) cache and all fan out
 * upstream. The trick is to store the in-flight *promise*, not the result —
 * there is no result yet, but there is something to await. Caller #1 starts the
 * work; callers #2..N join that same promise. One upstream call, N consumers.
 *
 * Scope caveat: this Map lives in one Node/serverless instance. On Vercel each
 * concurrent instance keeps its own, and a cold start starts empty. It still
 * collapses the common burst meaningfully, but it is not a global cache — that
 * would need Redis (Upstash et al).
 */
const inFlight = new Map<string, Promise<unknown>>();

export function singleflight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const promise = fn();
  inFlight.set(key, promise);

  // Clear the slot once settled — on success *and* on failure. Skipping the
  // failure path is the classic bug: one rejected call would pin a permanently
  // rejected promise under that key and every later caller would inherit it.
  // The identity check guards against deleting a newer promise if one replaced
  // this entry in the meantime.
  const release = () => {
    if (inFlight.get(key) === promise) inFlight.delete(key);
  };
  // Two handlers rather than .finally() so the rejection is considered handled
  // here and doesn't surface as an unhandled rejection on the derived promise.
  promise.then(release, release);

  return promise;
}

/** Seconds. Tuned to how fast each kind of data actually changes. */
export const TTL = {
  QUOTE: 10, // "live" enough without being tick-level
  NEWS: 900, // 15 min — headlines don't churn faster
  PROFILE: 86_400, // 24h — company metadata barely moves
  SEARCH: 3_600, // 1h — the symbol universe is near-static
  CANDLE: 3_600, // 1h — closed daily bars are immutable; only today's moves
  EDGAR_TICKER_MAP: 86_400, // 24h — ~10k tickers, changes rarely
  EDGAR_FILINGS: 3_600, // 1h — new filings trickle in, not tick-level
} as const;
