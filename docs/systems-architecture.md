# Systems Problems Worth Solving

_Audited 2026-09-23 against the actual codebase, not aspirationally — "Applied" rows are verified in code, not planned._

Backend infrastructure patterns (the "systems design" layer — how the app behaves under load, failure, and time, distinct from code organization) that are relevant to Stoxly, what's already applied, and where:

| Pattern | Status | Where |
| --- | --- | --- |
| Request coalescing (singleflight) | ✅ Applied | `lib/finnhub.ts`, `lib/coingecko.ts` — every external call wrapped in `singleflight(key, fn)`; 50 concurrent requests for AAPL collapse to 1 upstream call |
| Response caching | ✅ Applied | Same two files — `next: { revalidate: TTL.QUOTE }`, Next.js's fetch-level cache |
| Request timeout | ✅ Applied | Same two files — `signal: AbortSignal.timeout(5_000–8_000)` on every external fetch, so one slow upstream can't hang a route |
| Durable idempotent cache | ✅ Applied | `models/PortfolioSnapshot.ts` + `lib/portfolioSnapshotSync.ts` — unique on `{userId, snapshotDate}` |
| Idempotency / exactly-once delivery | ✅ Applied | `lib/alertEvaluator.ts` — `findOneAndUpdate` compare-and-swap fired-state transition, so a price oscillating around a threshold doesn't fire 40 emails |
| **Job queue / cron scheduling** | 🔲 Missing — **highest priority** | Needs a `vercel.json` crons entry hitting `/api/pricebars/sync`, `/api/snapshots/sync`, `/api/alerts/evaluate` on a schedule. Not "build a queue" — these routes already exist and `/api/alerts/evaluate` is already cron-secret-guarded; apply the same guard to the other two. Everything downstream depends on this: `PortfolioSnapshot` stays empty, TWR stays approximated, risk metrics stay sparse until it runs unattended. |
| **Backfill / reconciliation job** | 🔲 Missing | Would be a new route (e.g. `/api/pricebars/reconcile`) comparing stored `PriceBar` rows against a fresh provider pull for a date range and patching drift. This is what actually fixes the TWR approximation gap — TWR needs complete, correct historical `PriceBar` data, not just whatever partial sync happened to run. |
| **Circuit breaker** | 🔲 Missing | Belongs in the same provider files that already have singleflight/timeout (`finnhub.ts`, `coingecko.ts`, `twelvedata.ts`). Currently a failing upstream just gets retried on every request at full rate. Matters specifically because of free-tier rate limits (TwelveData 800/day, CoinGecko free tier) — without a breaker, a provider outage burns the daily quota on failed retries instead of backing off. |
| **Rate limiting (inbound, on Stoxly's own API)** | 🔲 Missing — low priority now | Would sit in front of routes like `/api/journal`, `/api/portfolio` if the app goes multi-tenant/public. Not a live risk with a single user; build right before any public launch, not before. |

**Recommended build order:** cron wiring first (unblocks the TWR fix and risk metrics) → backfill/reconciliation (actually fixes TWR) → circuit breaker (protects rate-limited free-tier quotas) → rate limiting (only matters once there are other users to abuse it).
