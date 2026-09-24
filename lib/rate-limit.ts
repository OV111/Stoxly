/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Deliberately dependency-free: it protects a single server instance, which
 * is the right trade-off while this app runs as one process. On a serverless
 * host each instance keeps its own counters, so the effective limit is looser
 * than the configured one — swap the store for Redis (e.g. @upstash/ratelimit)
 * if this ever needs to hold across instances.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Bounds memory if a flood of unique keys arrives (e.g. spoofed IPs). Pruning
// only runs once the map is large, so the common path stays O(1).
const MAX_TRACKED_KEYS = 10_000;

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the window resets. Only meaningful when `ok` is false. */
  retryAfter: number;
};

/**
 * Records a hit against `key` and reports whether it is allowed.
 *
 * @param key    Identity to throttle — caller decides the shape (IP, IP+email…).
 * @param limit  Allowed hits per window.
 * @param windowMs Window length in milliseconds.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_TRACKED_KEYS) prune(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  return { ok: true, retryAfter: 0 };
}

/**
 * Best-effort client IP. `x-forwarded-for` is set by Vercel and most proxies;
 * it is spoofable when the app is exposed without one, which is why this is
 * only used for throttling and never for authorization.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
