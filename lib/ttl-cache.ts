import { singleflight } from "@/lib/singleflight";

/**
 * Singleflight plus a per-instance TTL memo of the *processed* result.
 *
 * Next's fetch cache rejects bodies over 2MB, and several upstream payloads
 * used by the stock tabs (EDGAR companyfacts/submissions, Yahoo options
 * chains) are well past that — so the raw fetch can't be cached there. What
 * the routes actually serve is a small derived shape, so that's what gets
 * memoized here instead.
 *
 * `null` is never cached: it means "upstream failed or doesn't cover this
 * symbol", and a transient failure shouldn't pin an empty tab for the TTL.
 */
const store = new Map<string, { expires: number; value: unknown }>();

// Same bound-the-map reasoning as lib/rate-limit.ts — symbols are
// user-controlled input, so the key space is unbounded.
const MAX_ENTRIES = 2_000;

export function cached<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T | null>,
): Promise<T | null> {
  const hit = store.get(key);
  if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value as T);

  return singleflight(key, async () => {
    const value = await fn();
    if (value !== null) {
      if (store.size >= MAX_ENTRIES) {
        const now = Date.now();
        for (const [k, entry] of store) if (entry.expires <= now) store.delete(k);
        // Still full of live entries — drop the oldest insertion.
        if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value!);
      }
      store.set(key, { expires: Date.now() + ttlSeconds * 1000, value });
    }
    return value;
  });
}
