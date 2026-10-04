# Build Status

_Last updated: 2026-09-23. Update this section whenever a build-sequence step lands. See `Vision.md` for the product vision; this file is the implementation-level status snapshot._

## Done

- Landing page (nav, hero, responsive across breakpoints)
- Auth: sign-in/up, Google OAuth, password reset (`models/User.ts`, `app/api/auth/*`)
- `models/Transactions.ts` — the append-only ledger, `Decimal128` throughout, 5 currencies (USD/AMD/EUR/CNY/GBP)
- `POST`/`GET /api/transactions` + Add Transaction modal UI
- `lib/analytics/holdings-engine.ts` — FIFO replay of the transaction log → current holdings + cost basis
- `lib/analytics/return-engine.ts` — TWR (external-flow sub-period chaining) + XIRR/MWR (Newton-Raphson with bisection fallback)
- `app/api/portfolio/route.ts` + `PortfolioPanel.tsx` — real holdings/cost-basis/unrealized-P&L, live-wired to Finnhub quotes
- Watchlist: `models/Watchlist.ts`, `GET`/`POST`/`DELETE /api/watchlist`, dashboard panel + full CRUD page
- News: `/api/news`, dashboard `NewsPanel`, `/news` page — all live-wired to Finnhub
- `lib/analytics/risk-engine.ts` — beta, annualized volatility, max drawdown, Sharpe, correlation matrix, read from `PriceBar`; returns `null` until enough history exists
- Both engines are wired into `/api/portfolio` and rendered in `PortfolioPanel.tsx` (TWR/MWR + drift, plus a risk row that appears only when `PriceBar` supports it)
- Alerts: `models/Alert.ts` (ARMED/TRIGGERED/DISABLED state machine), `lib/alertEvaluator.ts` with `findOneAndUpdate` compare-and-swap for exactly-once notification + hysteresis/cooldown dedupe, CRUD + cron-secret-guarded `/api/alerts/evaluate`, full CRUD page
- Search: `searchSymbols` + `/api/search` + debounced search page linking to `/stock/[symbol]`
- Portfolio history: `/api/snapshots` + `PortfolioHistoryPanel` on the dashboard (reads the `PortfolioSnapshot` cache)
- `models/PriceBar.ts` (Mongo time-series) + `lib/priceBarSync.ts` + `/api/pricebars/sync`
- `models/PortfolioSnapshot.ts` + `lib/portfolioSnapshotSync.ts` + `/api/snapshots/sync` — idempotent daily cache, unique on `{userId, snapshotDate}`
- **Test suite**: Vitest, 22 tests over `holdings-engine` and `return-engine` (`npm test`). Covers FIFO lot consumption, split cost-basis preservation, out-of-order replay, XIRR known-answer + root verification + degenerate inputs. Caught and fixed a real float-dust bug where a fully-sold fractional position stayed visible as an open holding — the engines now close lots on a `QUANTITY_EPSILON` rather than `=== 0`.
- Crypto markets use CoinGecko's bulk market endpoint (not Finnhub), and each asset card can log directly to the append-only ledger using a canonical `CRYPTO:<coin-id>` symbol. The portfolio quote layer recognizes those symbols and values them through CoinGecko, rather than treating crypto as a separate tracker. Requires `COINGECKO_API_KEY` in `.env.local`.
- Crypto Markets supports selecting multiple assets for a grounded live-quote comparison (price, daily move, and session range). It deliberately does not forecast or recommend trades; portfolio-level risk analytics remains tied to the ledger and historical bars.
- The dashboard's static movers panel is replaced by live CoinGecko crypto gainers and losers, ranked by 24-hour percentage change within the top 100 assets by market cap. The bounded universe is stated in the UI rather than implying a market-wide ranking.
- Crypto asset cards and the dashboard movers render the CoinGecko-supplied asset logos; image hosts are explicitly allowlisted in `next.config.ts`.
- Seeded demo account: one-click, no signup wall. `lib/demoSeed.ts` (deterministic ~2-year, 15-holding transaction set, includes an NVDA 4:1 split, a partial AAPL sell for realized P&L, a TSLA loss, and recurring dividends) + `lib/demoAccount.ts` (idempotent find-or-create + seed-once-if-empty) + `POST /api/auth/demo` (issues a real session cookie, same path as sign-in) + `TryDemoButton` wired into the landing nav (desktop/mobile) and the sign-in page. **Not yet verified against a live DB** — run it and confirm `/dashboard` renders real TWR/MWR/holdings before trusting it.

## Known gaps

**TWR approximation, not yet closed:** TWR currently approximates each sub-period's value using cumulative net cash invested (deposits − withdrawals) as a stand-in for actual market value at each flow date, because there's no historical price snapshot to pull the real value from. This will under/overstate TWR whenever price movement between deposits is significant. Fixing it needs `PortfolioSnapshot` rows to accumulate (the model and sync route now exist — the daily cron that populates them does not) or the OHLC time-series collection backfilled, so past portfolio value is knowable rather than approximated.

**Resolved:** Finnhub's `/stock/candle` is plan-gated on the current key (confirmed `"restricted"`). `lib/priceBarSync.ts` now falls back to `lib/twelvedata.ts` (`time_series` endpoint, free tier: 8 credits/min, 800/day) whenever Finnhub returns `null`. **Requires `TWELVE_DATA_API_KEY` in `.env.local`** — sign up at twelvedata.com, the code treats a missing key as "provider unavailable" rather than erroring, so `risk-engine.ts` stays gracefully `null` until it's added. Once set, verify with `POST /api/pricebars/sync` — a `"source": "twelvedata"` in the response confirms the fallback fired.

## In progress

- **Investment Journal** (see `docs/investment-memory.md`) — `models/InvestmentDecision.ts`, `models/InvestmentNote.ts`, `app/(protected)/journal/`, `app/api/journal/`, `components/journal/`, `lib/journal/format.ts`, `types/journal.ts`, `hooks/useJournal.ts` all under active development. Not yet reflected as "done" until wired end-to-end and verified against a live DB.
- **Billing scaffolding** — `app/api/billing/` route stubs exist; UI shell not yet confirmed complete.

## Not started / remaining

- **AI debrief layer** — deliberately after the correctness fixes land. Blocked: no `ANTHROPIC_API_KEY` in `.env.local` yet.
- **Billing page** — UI shell for pricing/subscription tiers (`/billing`). Logic to be added later; page scaffolded now so the monetization surface exists.
- **CSV import** — the immediate onboarding friction fix. Preserves ledger architecture, just changes the ingestion mechanism.
- **Cron wiring** — `/api/pricebars/sync`, `/api/snapshots/sync`, and `/api/alerts/evaluate` are all manual-trigger routes. None run on a schedule yet; they need a `vercel.json` crons entry. Until then `PortfolioSnapshot` stays empty and the history chart shows its empty state.
- `risk-engine.ts` is untested — it queries `PriceBar` directly, so unit testing needs either dependency injection of the price-bar fetch or `mongodb-memory-server`. Refactoring it to accept price series as an argument (like the other two engines) is the change to make first.
- **Sortino + Calmar ratios** not yet added to `risk-engine.ts` — see `docs/product-research-addendum.md` (HARLF Paper section) for the formulas.
- **Sentiment engine** (`lib/analytics/sentiment-engine.ts`) does not exist yet — planned as a fixture-tested prototype, not live-wired to a news source yet.
- `app/api/market/chart/route.ts` — still a stub.
- Data input is manual-entry only currently — CSV import is the next ingestion step (no brokerage account linking yet).
- `PortfolioHistoryPanel` reuses `components/stock/PriceChart.tsx` by padding snapshot values into unused OHLC fields. Works, but the clean fix is an optional `values: number[]` prop on `PriceChart` that skips the candle mapping.

## Next recommended steps (in order)

1. Wire cron jobs (`vercel.json` crons for pricebars/sync, snapshots/sync, alerts/evaluate) — unblocks the TWR fix and risk metrics
2. Verify demo account against a live DB — confirm `/dashboard` renders real TWR/MWR/holdings
3. CSV import for transaction ingestion — real-user onboarding is currently manual-entry-only, the #1 adoption blocker
4. Sortino + Calmar ratios — cheap addition to `risk-engine.ts`, same inputs already in use
5. Scaffold billing page `/billing` (UI shell only, no payment logic yet)
6. AI debrief prototype (mock tool calls, fixture data) — validate output format and grounding before `ANTHROPIC_API_KEY` exists
7. AI debrief layer, live (once `ANTHROPIC_API_KEY` is in `.env.local`)

**Later (after the above):** market history backfill + reconciliation, broker reconciliation check, journal finished end-to-end, metric explanations in the UI, pricing/shareable reports, rate limiting, growth.

## Build sequence — completed milestones

What's already shipped, in the order it was built:

1. Transaction schema + pure calculation module — cost basis, TWR, XIRR. Pure functions, unit-tested.
2. Portfolio surface — holdings derived, not stored.
3. Caching/coalescing layer over Finnhub.
4. Alerts + worker — exactly-once delivery, idempotent, dedupe.
5. Risk analytics — beta, volatility, drawdown, Sharpe, correlation matrix.
6. Crypto — CoinGecko integration, canonical symbols through the ledger.
7. Demo account — seeded, one-click, not yet verified against live DB.

**Remaining, not yet scheduled individually above:** sentiment engine prototype (`lib/analytics/sentiment-engine.ts`), benchmark comparison table (query layer over existing engines, ships with the "custom benchmarks" Pro feature).
