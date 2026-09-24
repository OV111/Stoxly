# Vision — Stoxly

> **If you're an AI reading this cold:** this doc is both the product vision and a live status snapshot. Read "Current Status" first to know exactly what exists and what's next — treat everything below it as the settled architectural decisions this project already made, not open questions to re-litigate. The user is a solo dev building this to learn deeply (finance BSc + fintech master's), not to ship fast — favor correctness and explanation over speed.

---

## Current Status

_Last updated: 2026-09-23. Update this section whenever a build-sequence step lands._

**Done:**

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

**Known gap, not yet closed:** TWR currently approximates each sub-period's value using cumulative net cash invested (deposits − withdrawals) as a stand-in for actual market value at each flow date, because there's no historical price snapshot to pull the real value from. This will under/overstate TWR whenever price movement between deposits is significant. Fixing it needs `PortfolioSnapshot` rows to accumulate (the model and sync route now exist — the daily cron that populates them does not) or the OHLC time-series collection backfilled, so past portfolio value is knowable rather than approximated.

**Resolved:** Finnhub's `/stock/candle` is plan-gated on the current key (confirmed `"restricted"`). `lib/priceBarSync.ts` now falls back to `lib/twelvedata.ts` (`time_series` endpoint, free tier: 8 credits/min, 800/day) whenever Finnhub returns `null`. **Requires `TWELVE_DATA_API_KEY` in `.env.local`** — sign up at twelvedata.com, the code treats a missing key as "provider unavailable" rather than erroring, so `risk-engine.ts` stays gracefully `null` until it's added. Once set, verify with `POST /api/pricebars/sync` — a `"source": "twelvedata"` in the response confirms the fallback fired.

**Done — seeded demo account:** one-click, no signup wall. `lib/demoSeed.ts` (deterministic ~2-year, 15-holding transaction set, includes an NVDA 4:1 split, a partial AAPL sell for realized P&L, a TSLA loss, and recurring dividends) + `lib/demoAccount.ts` (idempotent find-or-create + seed-once-if-empty) + `POST /api/auth/demo` (issues a real session cookie, same path as sign-in) + `TryDemoButton` wired into the landing nav (desktop/mobile) and the sign-in page. **Not yet verified against a live DB** — run it and confirm `/dashboard` renders real TWR/MWR/holdings before trusting it.

**In progress:**

- **Investment Journal** (see "Investment Memory & Decision Intelligence" section below) — `models/InvestmentDecision.ts`, `models/InvestmentNote.ts`, `app/(protected)/journal/`, `app/api/journal/`, `components/journal/`, `lib/journal/format.ts`, `types/journal.ts`, `hooks/useJournal.ts` all under active development. Not yet reflected as "done" until wired end-to-end and verified against a live DB.
- **Billing scaffolding** — `app/api/billing/` route stubs exist; UI shell not yet confirmed complete.

**Not started / remaining:**

- **AI debrief layer** (see "The AI Debrief" section below) — deliberately last, per Build Sequence. Blocked: no `ANTHROPIC_API_KEY` in `.env.local` yet.
- **Billing page** — UI shell for pricing/subscription tiers (`/billing`). Logic to be added later; page scaffolded now so the monetization surface exists. See "Monetization" section below.
- **CSV import** — the immediate onboarding friction fix. Preserves ledger architecture, just changes the ingestion mechanism. See "Onboarding" section below.
- **Cron wiring** — `/api/pricebars/sync`, `/api/snapshots/sync`, and `/api/alerts/evaluate` are all manual-trigger routes. None run on a schedule yet; they need a `vercel.json` crons entry. Until then `PortfolioSnapshot` stays empty and the history chart shows its empty state.
- `risk-engine.ts` is untested — it queries `PriceBar` directly, so unit testing needs either dependency injection of the price-bar fetch or `mongodb-memory-server`. Refactoring it to accept price series as an argument (like the other two engines) is the change to make first.
- **Sortino + Calmar ratios** not yet added to `risk-engine.ts` — see "HARLF Paper" section below for the formulas.
- **Sentiment engine** (`lib/analytics/sentiment-engine.ts`) does not exist yet — planned as a fixture-tested prototype, not live-wired to a news source yet.
- `app/api/market/chart/route.ts` — still a stub.
- Data input is manual-entry only currently — CSV import is the next ingestion step (no brokerage account linking yet).
- `PortfolioHistoryPanel` reuses `components/stock/PriceChart.tsx` by padding snapshot values into unused OHLC fields. Works, but the clean fix is an optional `values: number[]` prop on `PriceChart` that skips the candle mapping.

**Next recommended steps (in order):**

1. Wire cron jobs (`vercel.json` crons for pricebars/sync, snapshots/sync, alerts/evaluate)
2. Verify demo account against a live DB — confirm `/dashboard` renders real TWR/MWR/holdings
3. Scaffold billing page `/billing` (UI shell only, no payment logic yet)
4. CSV import for transaction ingestion
5. AI debrief layer (once `ANTHROPIC_API_KEY` is in `.env.local`)

---

## Strategic Positioning

### The Reframe

"Stock market dashboard" is one of the most saturated portfolio project categories that exists. A reviewer's first reaction to the repo name is pattern recognition, not curiosity: _another ticker app_.

The strongest positioning is not:

> "A better portfolio tracker."

It's:

> **"A portfolio intelligence engine that explains what actually happened to your investments using mathematically correct data."**

That distinction is everything. Brokers show you what you own. Stoxly explains how your portfolio actually performed, what caused it, and how your risk has changed. That's the product.

### The Domain Moat

**Finance BSc + FinTech Master's + full-stack engineering.** Almost nobody in the applicant pool has that combination. The project's job is to make that unmistakable — built by someone who understands markets, not someone who found the Finnhub docs.

The moat is not the UI. It's the ledger, the return math, and the risk analytics underneath — the part that can't be faked by copying a tutorial.

### The Business Moat (Long-Term)

Technical differentiation is not yet a defensible business moat. Another company could build "AI portfolio analysis" with enough resources. The moat becomes real when it's:

> **"A trusted financial data system that produces longitudinal intelligence about your portfolio that gets more valuable the longer you use it."**

Stoxly knows your portfolio composition over 2 years, your deposits, withdrawals, realized P&L, risk evolution, concentration changes, correlations, behavioral patterns, and performance attribution. That history is the moat. The AI can tell you:

> "Your portfolio has become progressively more concentrated over the last 9 months."

That's not replicable in one click. It compounds with time.

---

## What It Is

Stoxly is a personal portfolio analytics platform for tracking stocks and crypto with correct financial math underneath — not a brokerage, not a social platform, not a trading simulator. The UI is the thin, fast, dark-themed layer on top. The actual product is the ledger, the return math, and the risk analytics underneath it, because that's the part that can't be faked or skimmed off a component library.

---

## Core Principles

**Correct over convenient.** Return math, cost basis, and tax lots follow the same rules real brokerages use — not the naive `(current − cost) / cost` that breaks the moment a second deposit happens.

**Derived over stored.** Holdings are never a mutable row you update in place. They're a fold over an append-only transaction log. This is what makes splits, backdated trades, and corrections tractable instead of corrupting.

**Grounded over generative.** The AI layer never states a number it didn't receive from a tool call. Explanation, not prediction — "your portfolio dropped 3%, 80% of it came from one position," never "AAPL will go up."

**Live over stale.** Prices and stats reflect what's happening now, with a caching/coalescing layer that makes that sustainable against a real-world rate limit instead of pretending the limit doesn't exist.

**Demoable over gated.** A reviewer gets a seeded account with two years of realistic transaction history — including a stock split — in one click. No signup wall standing between the work and the person evaluating it.

---

## The Domain Moat — What Naive Trackers Get Wrong

These are the features that are instantly legible to anyone technical who _also_ knows finance, and invisible to anyone who doesn't — which is exactly the point.

### Return math that's actually correct

- **TWR (time-weighted return)** — strips out deposit/withdrawal timing, answers "how did the strategy do."
- **MWR / XIRR (money-weighted return)** — answers "how did _I_ do," given my actual deposit timing.
- XIRR requires Newton-Raphson with a bisection fallback for non-convergence — genuinely interesting numerical code, not boilerplate, and immediately signals domain literacy.

### Corporate actions

Splits, reverse splits, dividends, spinoffs. A 4:1 split silently corrupts cost basis in any tracker that stores positions as mutable rows. Handling it correctly is the forcing function for the event-log data model below.

### Lot-level tax accounting

FIFO / LIFO / specific-lot-ID cost basis, realized vs. unrealized P&L split. Boring-sounding, brutally fiddly, and exactly what real fintech backends actually do.

### Risk analytics

Beta against a benchmark, rolling volatility, max drawdown, Sharpe ratio, Sortino ratio, Calmar ratio, and a correlation matrix across holdings — "you think you're diversified; these five names are 0.9 correlated." This is rare because it's actual _insight_, not a restatement of data the user already has.

---

## Primary User

Stoxly is built first for my own real investing. I'm new to investing and
don't yet have the knowledge to fully understand my portfolio, so I'm
building a system that explains it to me using correct math. It deals with
real money, so correctness and trust come before features, growth, or
monetization. If it genuinely helps me every week, it can help others later.

---

## History — Starting From Zero

Intelligence needs history, and right now Stoxly has almost none:
`PriceBar` is sparse, `PortfolioSnapshot` is empty (no cron yet), and the
journal has no real decisions. Most intelligence features (risk metrics,
behavior patterns, thesis reviews, the debrief) can't work on an empty history.

There are two kinds of history, and they behave differently:

**1. Market history can be backfilled.** Years of price data for any
stock or crypto already exist (TwelveData, CoinGecko). A backfill job can
compute beta, volatility, drawdown, and correlation for current holdings
on day one. This fixes the cold-start problem and the `null` risk row.

**2. Personal history can only be collected, never backfilled.** My
reasons, expectations, and confidence at the moment of a decision are lost
forever if I don't record them then — memory rewrites "why did I buy this?"
within months. This is the most valuable data in Stoxly and the only part
of the moat that can't be copied.

**Rule:** start accumulating both today. Wire the crons, backfill market
data, and journal every real decision from now on. Every day without this
is history lost.

---

## Correctness & Trust

Stoxly handles real money decisions. Target: numbers I can trust enough to
act on, verified rather than assumed.

- **Broker reconciliation.** My broker is the source of truth. Holdings,
  cost basis, and realized P&L must match my broker statement exactly.
  Any mismatch is a bug, fixed before anything else.
- **Never silently wrong.** Missing, stale, or approximate data is labeled
  in the UI. Showing "unknown" is better than a confident wrong number.
- **Known-answer tests.** Every engine (holdings, returns, risk) is tested
  against cases calculated by hand or in Excel. `risk-engine.ts` included.
- **Data validation.** Flag price gaps, stale quotes, and abnormal jumps
  from providers. Perfect math on bad data is still wrong.
- **Edge cases covered.** Splits, dividends, fees, FX conversion, fully
  closed positions.
- **Ledger is sacred.** Transactions are never edited or deleted, only
  corrected with new entries. Database is backed up regularly.
- **Security.** Strong auth, secrets never in code, database never
  publicly exposed.
- **Stoxly informs, I decide.** Before any real trade, key numbers are
  double-checked in my broker.

---

## Intelligence Without Prediction

Real intelligence here means seeing things about my own portfolio that I
can't see myself — not forecasting the market.

- **Financial & political news as context.** Wars, government statements,
  and earnings news shown alongside price moves, stated as "happened at the
  same time," never "caused it."
- **Risk-comfort lens.** I set my own risk comfort; the app shows where I'm
  above it. Not age-based rules ("you're X, so sell") — that's advice.
- **Hidden exposure.** Sector concentration and ETF look-through
  ("you own more Apple than you think").
- **Historical stress tests.** "If 2022 happened again, this portfolio
  would lose X%" — a replay of real history, not a prediction.
- **Currency risk.** AMD/USD exposure and its effect on real value.
- **Behavior patterns.** From the journal, e.g. "you tend to sell after a
  10% drop."
- **Thesis check.** What has happened to the story behind each decision.
- **Beginner explanations.** Plain-language meaning next to every metric,
  so the app teaches me while I use it.
- **Trending assets** can be shown, never framed as "you should buy."

---

## Build Sequence (Revised)

1. Cron wiring (pricebars, snapshots, alerts)
2. Market history backfill + reconciliation job
3. Exact TWR (replace the cash-invested approximation)
4. `risk-engine.ts` refactor + tests; add Sortino and Calmar
5. Broker reconciliation check
6. Finish journal end-to-end; start logging real decisions
7. Metric explanations in the UI
8. AI debrief (grounded)

**Later:** billing, pricing, shareable reports, rate limiting, growth.

## HARLF Paper — What Transfers, What Doesn't

_Added 2026-09-22, after reviewing "HARLF: Hierarchical Reinforcement Learning and Lightweight LLM-Driven Sentiment Integration for Financial Portfolio Optimization" (Coriat & Benhamou, IJCAI 2025 FinLLM Workshop)._

HARLF trains a three-tier RL system (base agents → meta-agents → super-agent) that combines FinBERT news sentiment with quantitative metrics to output monthly portfolio allocation weights — i.e., it's a trading-signal engine. That output mechanism is exactly what Stoxly's closed "no trading signals" decision rules out, so the RL allocation machinery itself (§6–7 of the paper) does not cross over. What does cross over is the paper's **measurement layer** — the inputs the RL system consumes, which are legitimate grounded facts under Stoxly's own architecture:

1. **Sentiment score as a grounded data point.** HARLF's Algorithm 1 computes `S_t = Σ(P_positive − P_negative) / N` — a FinBERT sentiment score averaged over N news articles per asset per time window. This is a measurement, not a prediction, so it fits the grounding rule. Usable in the AI Debrief ("NVDA contributed 71% of weekly gains; news sentiment on NVDA was net positive over the same period") and in Decision Reviews as corroborating context — stated as correlation, never as thesis validation. New file: `lib/analytics/sentiment-engine.ts`, same shape as the other engines (pure function, fixture-testable; route handlers do the news fetching).
2. **Sortino and Calmar ratios.** HARLF computes these monthly alongside Sharpe/volatility/max drawdown (§3.3). Same category of math as what `risk-engine.ts` already has — cheap, direct addition, zero architectural conflict.
3. **Benchmark comparison methodology.** HARLF's results tables (strategy vs. equal-weighted vs. S&P 500 across ROI/Sharpe/volatility, §4.4/§8) are a clean template for the planned "custom benchmarks" Pro feature — same side-by-side shape, applied to the user's actual MWR/TWR instead of a backtested policy. No new engine needed; a query/aggregation layer over `returns-engine.ts` and `risk-engine.ts` output.
4. **Risk-tolerance weighting, reframed as a display lens, not a decision input.** HARLF's reward function (`Reward = α₁·ROI − α₂·MDD − α₃·σ`, §5.2) optimizes tradeoffs *for* the system. Stoxly cannot reuse it that way, but the same α-weighted idea works as a user-set "risk budget" slider that only changes how existing metrics are *displayed* ("above your stated comfort line") — never as an input to any suggestion.
5. **Retrospective what-if simulation.** HARLF's backtesting (§5.4: train 2003–2017, evaluate out-of-sample 2018–2024) is evaluation of an RL policy, not a per-user counterfactual — but the mechanical idea (replay historical prices against a hypothetical rule, measure resulting ROI/Sharpe/drawdown) maps to the planned "what if I'd sold 10% of NVDA" sandbox: strictly retrospective, run only on the user's actual holdings, labeled hypothetical, never advisory.
6. **Explicitly excluded, for contrast: the RL allocation engine itself.** Base agents (PPO/SAC/DDPG/TD3 via Stable Baselines 3) → meta-agents (PyTorch nets combining base agent outputs, §6) → super-agent (final allocation weights, §7, Algorithm 2) is HARLF's actual centerpiece. It's a system that decides what to buy/sell/hold and by how much — precisely the trading-signal shape Stoxly's architecture forbids. This is the one piece that does not cross over.

**Priority read (effort vs. impact vs. what's already blocked):**

1. **Sortino + Calmar** — do first. Same inputs `risk-engine.ts` already has, no new data source, ~20 minutes of work.
2. **Sentiment engine, prototype only** — fixture-tested pure function with mock article input, no live news scraping yet. High strategic value (feeds both the AI Debrief and Decision Reviews) but the debrief itself isn't built, so don't wire live infra prematurely — consistent with the addendum's "prototype the debrief before the API key exists" guidance.
3. **Benchmark comparison table** — easy, but low urgency until the billing/Pro-tier surface exists.
4. **Risk-budget display lens** — pure UX polish, zero backend risk, fine to defer.
5. **What-if sandbox** — depends on the AI Debrief existing first (it's a follow-up affordance on the debrief); building it earlier has no destination.
6. **RL allocation engine** — not adopted, ever. Conflicts with the closed "no trading signals" decision.

---

## Data Model — The Decision That Can't Be Retrofitted

```ts
// models/Transaction.ts — an append-only event log, NOT a mutable position
type TransactionType =
  | "BUY"
  | "SELL"
  | "DIVIDEND"
  | "SPLIT"
  | "DEPOSIT"
  | "WITHDRAWAL";

interface Transaction {
  userId: ObjectId;
  symbol: string | null; // null for cash events
  type: TransactionType;
  quantity: Decimal128; // fractional shares are normal now
  pricePerUnit: Decimal128; // NEVER a JS float
  fees: Decimal128;
  currency: "USD" | "AMD" | "EUR";
  fxRateToBase: Decimal128; // rate AT transaction time, frozen
  occurredAt: Date; // when it happened in the market
  createdAt: Date; // when it entered the system
}
```

Three decisions embedded here that matter more than any feature:

1. **Money is never a JS `Number`.** `0.1 + 0.2 !== 0.3`, and IEEE-754 floats silently corrupt cost basis over hundreds of transactions. Use Mongo `Decimal128` (correct, awkward in JS — pair with `decimal.js` at the boundary).
2. **Positions are derived, never stored.** Holdings = a fold over the transaction log. Same event-sourcing instinct real ledger systems use.
3. **`occurredAt` vs `createdAt` — bitemporality.** Backdating a trade forgotten last week must not corrupt everything computed since.

**OHLC price history** is a separate concern and does not belong in a normal collection — Mongo's native time-series collections are the idiomatic answer.

---

## Systems Problems Worth Solving

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

---

## The AI Debrief — The Product Centerpiece

The AI debrief is not a late feature bolted on. It's what everything else has been building toward. Once a week (or on demand), Stoxly generates a **personal portfolio debrief** — not a market summary, not a news feed, but a structured audit of _your_ portfolio using _your_ actual transaction data and risk metrics.

### What a debrief card looks like

```
Your Week in Stoxly

Portfolio: +2.8%

Main driver: NVDA contributed 71% of weekly gains.
Risk: concentration increased from 28% → 34%.
Diversification: AAPL/NVDA correlation remains high at 0.82.
Investor effect: Your MWR exceeded TWR — timing of your recent deposit worked in your favor (+2.1%).
Conclusion: Most gains came from one position, not broad portfolio improvement.
```

It answers three questions a generic dashboard never does:

- **What actually drove your returns?** — not "markets were up," but attribution to specific positions.
- **Where is your portfolio lying to you?** — assets that feel diversified but are 0.9 correlated, a position that quietly became your largest holding.
- **What does the math say you did well or poorly?** — TWR vs MWR delta in plain language.

### Why it's only possible here

The debrief is only credible because the ledger and risk analytics are correct underneath. A fake tracker can't generate this. That's the whole point of the moat.

### Hard grounding rule

The model may **never** emit a number it didn't receive from a tool call (`getPortfolio`, `getQuote`, `getRiskMetrics`). Enforced via tool use plus post-generation validation: every numeral in the output must appear in the tool results, or it's rejected and retried.

### Eval suite

20–30 fixture cases asserting no hallucinated figures, correct refusal on "should I buy X," stable output structure. This is what AI engineering actually looks like now.

---

## No Buy/Sell Signals — A Hard Architectural Boundary

Stoxly deliberately has no feature for recommending what to buy, sell, or when. This is a **closed design decision**, not a gap.

**Why:**

- **Legal exposure.** Buy/sell signals cross into financial advice territory in most jurisdictions.
- **Corrupts the grounding rule.** A price forecast is by definition not sourced from the portfolio's own data.
- **Predictions are probably wrong.** Stoxly's moat is being correct on backward-looking analysis where correctness is verifiable.
- **Wrong product identity.** Buy/sell signal generation belongs to quantitative trading tools.

**Enforced in the eval suite:** correct refusal on "should I buy X," "what should I invest in," and "is now a good time to buy [symbol]" is a required passing case.

---

## Onboarding — Removing Friction

Manual transaction entry is the current ingestion method and is architecturally correct. But from a product perspective, "enter your 87 transactions manually" kills consumer adoption.

**Ingestion roadmap:**

| Phase | Method                  | Status   |
| ----- | ----------------------- | -------- |
| 1     | Manual entry (modal)    | ✅ Done  |
| 2     | CSV import              | 🔲 Next  |
| 3     | Broker API integrations | 🔲 Later |

CSV import is the immediate priority. It preserves the ledger architecture — the append-only log remains the source of truth, CSV is just a different ingestion path. Each row maps to a `Transaction` document via the same schema. No mutable positions, no shortcuts.

---

## Monetization

**Billing page:** `/billing` — UI shell to be scaffolded now. Payment logic (Stripe or equivalent) to be wired later. The page exists so the monetization surface is present when the project is reviewed or demoed.

### Tier structure (planned)

**Free**

- Portfolio tracking
- Basic holdings + returns
- Watchlist
- Basic risk metrics

**Pro — ~$8–15/month**

- Weekly AI portfolio debrief
- Advanced performance attribution (TWR vs MWR delta explained)
- Concentration + correlation analysis
- Historical risk evolution
- Custom benchmarks
- Larger transaction history
- Price alerts

**B2B / Professional (later)**

- Financial educators, independent advisors, finance communities
- Not the current focus — prove individual user demand first

### What to monetize

Not basic tracking. The intelligence layer. Free tracking → paid intelligence is the right split because tracking is a commodity; grounded, longitudinal portfolio attribution is not.

---

## Scope Boundaries

### In scope

- Stocks, ETFs, crypto, indices/benchmarks
- Portfolio analytics + AI debrief
- Price alerts
- News (Finnhub-sourced, factual, per-symbol)
- Search + instrument discovery
- Billing / subscription tier UI

### Out of scope — permanently closed decisions

- **Trading signals / buy/sell recommendations** — legal exposure + corrupts grounding architecture
- **Social features** (feeds, followers, sentiment from strangers) — different product
- **Paper trading / matching engine / order books** — scope explosion, different project
- **Brokerage execution** — not a brokerage
- **Crypto exchange** — not a trading platform
- **AI chatbot** — the debrief is not a chat interface; it's a structured, grounded report

These are not gaps in the roadmap. They are closed design decisions that protect product identity.

---

## Tech Foundation

| Layer     | Technology                                                   |
| --------- | ------------------------------------------------------------ |
| Framework | Next.js 16 (App Router, Turbopack)                           |
| UI        | Tailwind CSS 4, shadcn/ui, Framer Motion                     |
| Data      | Finnhub API, TwelveData (OHLC fallback), CoinGecko (crypto)  |
| Numbers   | `decimal.js` at the JS boundary, Mongo `Decimal128` at rest  |
| AI        | Claude API — tool use + grounding validation, streaming      |
| Auth      | JWT sessions (`jose`), bcrypt, Google OAuth                  |
| Database  | MongoDB (Mongoose) + native time-series collections for OHLC |
| Payments  | Stripe (planned, not yet wired)                              |

---

## Build Sequence

Order, in priority:

1. ✅ **Transaction schema + pure calculation module** — cost basis, TWR, XIRR. Pure functions, unit-tested.
2. ✅ **Portfolio surface** — holdings derived, not stored.
3. ✅ **Caching/coalescing layer** over Finnhub.
4. ✅ **Alerts + worker** — exactly-once delivery, idempotent, dedupe.
5. ✅ **Risk analytics** — beta, volatility, drawdown, Sharpe, correlation matrix.
6. ✅ **Crypto** — CoinGecko integration, canonical symbols through the ledger.
7. ✅ **Demo account** — seeded, one-click, not yet verified against live DB.
8. 🔲 **Cron wiring** — `vercel.json` crons for all three sync routes.
9. 🔲 **Demo account verification** — confirm against live DB.
10. 🔲 **Billing page** — `/billing` UI shell, no payment logic yet.
11. 🔲 **CSV import** — transaction ingestion step 2.
12. 🔲 **Sortino + Calmar ratios** — extend `risk-engine.ts`, same inputs already in use. Cheap, do alongside the TWR fix.
13. 🔲 **Sentiment engine prototype** — `lib/analytics/sentiment-engine.ts`, fixture-tested, feeds the AI debrief prototype as a grounded input alongside TWR/MWR/risk metrics.
14. 🔲 **Benchmark comparison table** — query layer over existing engines, ships as part of the "custom benchmarks" Pro feature.
15. 🔲 **AI debrief layer** — last, after the math is solid and `ANTHROPIC_API_KEY` is set.

### Analytics Engine Layout

```
lib/analytics/
  types.ts             // shared: Holding, Lot, ReturnMetrics, RiskMetrics, SentimentScore
  holdings-engine.ts   // replays the transaction log → current positions + cost basis
  returns-engine.ts    // holdings + cash-flow timeline + live prices → TWR, MWR/XIRR, unrealized P&L
  risk-engine.ts       // holdings + historical OHLC + benchmark → beta, volatility, drawdown, Sharpe, Sortino, Calmar, correlation matrix
  sentiment-engine.ts  // per-asset news articles → sentiment score per time window (prototype, fixture-tested; see "HARLF Paper" section)
```

Each is independently unit-testable with fixture data. Route handlers fetch transactions/prices from DB and Finnhub, then hand them to these functions — the engines themselves never touch Mongo or the network.

---

## The Three-Minute Test

A reviewer gives this project about three minutes. Two things decide the outcome:

- **A seeded demo account, one click, no signup wall.** A realistic 15-holding portfolio with two years of transactions — including a stock split — visible without the reviewer doing anything.
- **The first screen proves the moat, not the UI.** TWR/MWR split shown side by side, a correlation matrix that says something real — not just another price ticker with a nice dark theme.

---

## Who It Is For

- Individual investors who want a cleaner, correct alternative to Yahoo Finance or Google Finance
- Crypto holders who want stocks and digital assets tracked with the same rigor
- Reviewers and engineers who can tell, in three minutes, the difference between a ticker app and a ledger

---

## Search — Financial Instrument Discovery

Search is Stoxly's financial-instrument discovery layer. It resolves a user's search intent into a canonical, identifiable instrument that the rest of the platform can operate on.

Initial supported universe: stocks/equities, cryptoassets, ETFs, indices/benchmarks. Mutual funds, bonds, commodities, FX, and derivatives are out of scope for now. Search is responsible for **finding and identifying instruments**, not analyzing, recommending, or forecasting them.

---

## Addendum: Product Research & Strategic Critique

This section was added after a deep product-research review. It synthesizes findings from user-behavior patterns, app-store friction analysis, cross-industry mechanisms, and founder-level strategic thinking. Treat these as high-priority insights and open questions, not settled decisions.

### 1. Correctness Bug: TWR Approximation Must Be Fixed Before Anything Else

**Current status:** TWR approximates sub-period value using cumulative net cash invested, not actual market value at each flow date. This is wrong whenever price movement between deposits is significant.

**Why this is critical:** Stoxly's entire positioning is "mathematically correct data." A single reviewer who knows finance will spot the approximation. The first screen — TWR/MWR split — is the three-minute test. If TWR is approximated, the moat is undermined at the exact moment of first impression.

**Action:** Move `PortfolioSnapshot` accumulation (cron wiring) to step 1. Backfill via OHLC if possible. Do not ship the AI debrief, billing, or CSV import until TWR is exact.

### 2. Onboarding Friction: CSV Import Is Not Step 11

**Research finding:** Onboarding friction is the #1 killer of consumer adoption. Manual entry of 87 transactions is a non-starter for real users.

The demo account solves the reviewer problem. It does not solve the user problem. A real user with an existing brokerage account cannot use Stoxly without CSV import.

**Action:** Move CSV import to step 2 or 3, immediately after the TWR fix and demo verification. The ledger architecture makes this a trivial ingestion path — no mutable positions, just a different `Transaction` document source.

### 3. AI Debrief: Prototype Now, Not Last

**Contradiction in original plan:** The AI debrief is called "the product centerpiece" but is deliberately last and blocked by API key.

**Risk:** Building the entire ledger, risk engine, and billing surface, then discovering the debrief format doesn't work as imagined.

**Action:** Build a pure-function prototype of the debrief now, using mock tool calls and fixture portfolio data. Validate:

- Output format is useful and understandable
- Grounding rule is enforceable (every numeral appears in tool results)
- Eval suite catches hallucinations
- Users prefer weekly vs. on-demand

This can be done without `ANTHROPIC_API_KEY` by mocking the Claude response and focusing on the validation layer.

### 4. Risk Engine: Avoid Invisible Value

**Problem:** `risk-engine.ts` returns `null` until enough `PriceBar` history exists. For new users, the risk row — one of the core moat features — may be invisible for weeks or months.

**Action:** Provide synthetic or benchmark-based risk estimates when historical data is insufficient, clearly labeled as estimates. Or offer a "risk preview" using sector-level correlations as a placeholder. Do not let the Pro-tier value proposition remain invisible during the critical early-retention window.

### 5. Monetization: Anchor to Outcomes, Not Features

**Current pricing:** "~$8–15/month" is a range, not a decision.

**Research finding:** Users will pay for outcomes, not features. Subscription fatigue is real.

**Action:** Anchor Pro to a single outcome: "Understand your portfolio better than any broker app can explain." Consider micro-transactions for the debrief ("pay for this report") as an alternative to subscription. Free tracking, paid intelligence is the right split — but the pricing page must say why it's worth paying.

### 6. Shareable Debrief: The Missing Growth Mechanism

**Research finding:** Strava's success is social proof. Spotify Wrapped is social proof. The AI debrief is Stoxly's Wrapped.

**Action:** Design the debrief as a shareable, anonymized artifact. Not a social feed, not followers — but a "portfolio health report" that says "your concentration risk increased 6% this month." This is a viral growth mechanism that respects the "no social features" boundary.

### 7. Crypto Analytics: Unified Ledger, Differentiated Views

**Problem:** Crypto users and stock investors are different personas with different needs. The unified ledger is correct for a portfolio view, but the analytics may need to differ.

**Action:** Keep the append-only ledger for all assets. For analytics, consider asset-class-specific views:

- Stocks: beta, Sharpe, sector rotation
- Crypto: volatility, drawdown, correlation to BTC/ETH
- Both: concentration, correlation matrix

The debrief can say: "Your crypto holdings are 40% of your portfolio and 80% of your risk."

### 8. The Debrief Needs a Follow-Up Affordance

**Current decision:** "No AI chatbot — the debrief is not a chat interface; it's a structured, grounded report." This is correct for the primary interface.

**Research finding:** AI-native products succeed when they allow delegation with verification, not just static reports.

**Action:** Add an "ask about this report" affordance that is grounded in the same tool calls. Users will want to drill down: "Why did NVDA contribute 71%?" or "What if I sold 10% of NVDA?" The latter is a simulation, not advice — label it as hypothetical and keep the grounding rule.

### 9. Domain Literacy: Explain the Moat in the UI

**Problem:** The three-minute test assumes a financially literate reviewer. Most users — even technical ones — may not know what TWR/MWR means.

**Action:** Add one-line explanations next to each metric:

- TWR: "How your strategy performed, ignoring when you added money."
- MWR: "How you actually performed, given your deposit timing."

Don't assume domain knowledge. Explain the moat, don't just display it.

### 10. Boring App Insight: Embrace Reliability Over Excitement

**Research finding:** Boring, reliable, old-fashioned apps survive because they own a recurring, high-stakes workflow. Stoxly's core workflow — tracking a portfolio — is boring. The AI debrief is the reward.

**Action:** Keep the dashboard fast, reliable, predictable. Don't over-animate, over-gamify, or over-design. Users describe boring apps as "I can't live without it." That's the goal.

### 11. Revised Build Sequence (Proposed)

Based on the above, the recommended order becomes:

1. **Fix TWR approximation** — wire `PortfolioSnapshot` cron, backfill if possible. This is the correctness prerequisite.
2. **Verify demo account against live DB** — confirm `/dashboard` renders real TWR/MWR/holdings.
3. **CSV import** — remove onboarding friction for real users.
4. **Prototype AI debrief (mock)** — pure function, fixture data, validate format and grounding.
5. **Risk engine estimates** — provide synthetic/preview risk metrics for new users.
6. **Billing page** — UI shell, outcome-based messaging.
7. **Cron wiring** — all sync routes on schedule.
8. **AI debrief layer** — once `ANTHROPIC_API_KEY` is set.
9. **Shareable debrief** — anonymized health report as growth mechanism.
10. **Follow-up sandbox** — grounded "what-if" simulations on the debrief.

### 12. Friction Map Applied to Stoxly

| Friction Type | Stoxly's Current State | Risk | Opportunity |
| --- | --- | --- | --- |
| Discovery | No public content, no SEO, no community | Invisible to users | Shareable anonymized health report as viral artifact |
| Onboarding | Manual entry only; demo for reviewers | High — kills consumer adoption | CSV import is the immediate fix |
| Cognitive | Dashboard has many panels | Moderate — could overwhelm | Progressive disclosure; explain metrics |
| Interaction | Manual transaction entry | High — tedious | Bulk edit, recurring templates |
| Information | Fragmented across three providers | Low — handled well | Unified portfolio timeline |
| Trust | Grounded AI, no buy/sell signals | Low — architecturally sound | Publish eval suite; show grounding validation |
| Financial | Free tracking, paid intelligence | Moderate — subscription fatigue | Outcome-based pricing; micro-transactions |
| Social | None (deliberately) | Low — different product | Private benchmarking, shareable report |
| Retention | Weekly debrief is habit mechanism | Moderate — needs validation | "Significant change" alerts, not engagement pings |
| AI | Grounded, no hallucination, no chat | Low — architecturally sound | Follow-up sandbox; "explain this metric" |
| Switching | Data export not mentioned | High — users fear lock-in | Explicit "export your ledger" + data ownership messaging |

### 13. Cross-Industry Mechanisms for Stoxly

| Mechanism | Source | Why It Works | Stoxly Application |
| --- | --- | --- | --- |
| Streaks | Duolingo | Habit formation | "Weekly debrief streak" for Pro users (not portfolio checking — too manipulative) |
| Local-first | Obsidian | Data ownership | Export ledger as CSV/JSON; "your data is yours" |
| Transparency | Robinhood's failure | Trust erosion | Publish eval suite; show grounding validation |
| Envelope budgeting | YNAB | Constraint-based behavior | "Risk budget" — how much concentration are you willing to accept? |
| Segments | Strava | Social competition | Private benchmarking against a chosen index |
| Keyboard-first | Linear | Speed and focus | Power-user shortcuts for transaction entry |
| Agentic AI | Cursor | Delegation with review | AI suggests "you may have forgotten to log this dividend" |
| Outcome-based pricing | Education | Pay for results | "Pay for the debrief" micro-transaction |

### 14. Open Questions to Validate

- Do users actually want a weekly debrief, or is on-demand better?
- Is the debrief shareable artifact a growth mechanism or a privacy risk?
- Will users pay for outcome-based pricing, or do they expect a flat subscription?
- How long until `PriceBar` history is sufficient for risk analytics? What's the fallback?
- Does the "no chatbot" decision hold when users want to drill into the debrief?
- Is the crypto + stock unified ledger actually useful, or do users want separate views?
- What is the single most important metric that proves the moat in the three-minute test?

### 15. Founder Takeaways (Condensed)

- Fix TWR before anything else. Correctness is the moat.
- Move CSV import up. Onboarding friction kills adoption.
- Prototype the AI debrief now. Don't build the whole product around an unvalidated centerpiece.
- Provide risk estimates for new users. Invisible value is no value.
- Anchor pricing to outcomes. "Understand your portfolio" is worth more than a feature list.
- Design the debrief as shareable. That's the growth mechanism.
- Explain the moat in the UI. Don't assume domain literacy.
- Embrace boring reliability. The dashboard is the tool; the debrief is the reward.
- Publish the eval suite. Trust is built through transparency.
- Challenge every assumption. The TWR gap is disconfirming evidence for "correct over convenient." The AI debrief's "deliberately last" placement contradicts its "centerpiece" status. Fix these contradictions before they become product failures.

_Note: this addendum section (11–15, and the research synthesis above it) was AI-generated during a product-research pass — kept as reference/open-questions material, not settled architecture._

## Investment Memory & Decision Intelligence

A core future layer of Stoxly is an **Investment Memory & Decision Intelligence system**.

Traditional exchanges and portfolio trackers are very good at recording **what happened financially**: what the user bought, sold, deposited, withdrew, how many shares they own, and how the portfolio performed. Stoxly should go one layer deeper by also capturing **the human context behind important investment decisions**.

The purpose is not to turn Stoxly into a diary or social platform. The purpose is to create a structured, longitudinal memory of the investor's decisions and eventually understand the relationship between:

**What the investor did → Why they did it → What they expected → What the market did → What happened to the portfolio → What happened afterward**

### Lightweight user input

Users should be able to record their reasoning without writing long journal entries. The interface should favor short fields, separate lines, selectable options, and lightweight inputs rather than large text areas.

For an investment decision, a user could optionally record:

- Asset
- Action (BUY / SELL / INCREASE / REDUCE / HOLD / OTHER)
- Why they made the decision
- What they expected to happen
- Time horizon
- Confidence level
- What could prove their thesis wrong
- Optional tags
- Optional connection to a specific transaction

Example:

```text
Investment Decision

Asset: NVDA
Action: Bought

Why?
AI infrastructure demand will remain strong.

Expectation:
Strong long-term growth.

Time horizon:
2–5 years

Confidence:
High

What could prove me wrong?
A significant slowdown in AI infrastructure spending.
```

Users should also be able to create simple **Quick Notes** for thoughts that do not represent a specific investment decision.

Example:

```text
Quick Note

Thinking about reducing my crypto exposure because
it is becoming too large relative to the rest of my portfolio.
```

The goal is to make recording context take seconds rather than turning investing into a writing task.

### Financial truth vs. user context

This system must maintain a strict separation between objective financial data and subjective user input.

**Objective data** comes from Stoxly's existing financial systems:

- Transactions
- Holdings
- Cost basis
- Portfolio snapshots
- Portfolio returns
- TWR / MWR / XIRR
- Risk metrics
- Asset allocation
- Performance contribution
- Drawdowns
- Market prices and historical data
- Relevant benchmark / market context

**Subjective context** comes from the investor:

- Reasons
- Expectations
- Investment thesis
- Confidence
- Time horizon
- Concerns
- Personal observations
- Reflections

User notes must never overwrite or modify the underlying financial truth.

### Decision timeline

Once a decision is recorded, Stoxly can connect it with subsequent financial and market events.

For example:

```text
Sep 18
Bought NVDA
Reason: AI infrastructure growth

        ↓

Sep 25
NVDA +6.4%

        ↓

Oct 03
NVDA -4.1%

        ↓

Oct 15
NVDA becomes 14.8% of portfolio

        ↓

Oct 20
Portfolio drawdown reaches -5.2%

        ↓

Nov 18
90-day decision review
```

This allows Stoxly to preserve not only the original decision, but the **evolution and consequences of that decision over time**.

The system should distinguish between:

1. **The user's action** — what they actually changed.
2. **The user's reasoning** — why they said they made the decision.
3. **Market events** — what happened externally.
4. **Portfolio effects** — how the decision and market movements affected their portfolio.
5. **Subsequent behavior** — what the investor did afterward.

Stoxly should not automatically assume causation simply because two events happened close together.

### AI Decision Reviews

The Investment Memory layer becomes especially valuable when combined with Stoxly's grounded AI.

The AI should be able to analyze a past decision using the original user context together with verified financial and market data.

For example:

```text
DECISION REVIEW

Original decision:
Bought NVDA

Reason:
AI infrastructure demand

Original expectation:
Strong long-term growth

Position:
8.2% → 12.7%

30-day return:
+11.4%

Portfolio contribution:
+1.8%

Maximum drawdown:
-8.7%

Current position:
Still held
```

The AI can then provide a concise review explaining what happened after the decision, how the position affected the portfolio, how the portfolio's risk or allocation changed, and what relevant market conditions occurred during the period.

The AI should clearly distinguish **measured facts, calculated metrics, user statements, and interpretation**.

It should never claim that positive performance proves the user's thesis was correct, or that negative performance proves the thesis was wrong. Investment outcomes and investment reasoning are different things.

### Longitudinal investment intelligence

The biggest value comes from accumulating this information over months and years.

After dozens of decisions, Stoxly can build a historical record containing:

```text
Decision
    ↓
Reason / Thesis
    ↓
Expectation
    ↓
Portfolio Position
    ↓
Market Environment
    ↓
Performance & Risk
    ↓
Subsequent Actions
    ↓
Reflection / Outcome
```

This allows Stoxly to identify measurable patterns in the investor's own history.

For example:

- How long the investor typically holds positions after different types of decisions
- How portfolio allocations changed following major decisions
- How frequently the investor changes an original position
- How often the investor records certain types of reasoning
- How portfolio risk changed following allocation decisions
- How previous decisions evolved over time
- What the investor previously said about a portfolio goal or allocation
- How actual portfolio behavior compares with previously recorded intentions

These should be presented as **observations about the user's historical data**, not recommendations or judgments about what they should do.

### Personal investment memory

Over time, Stoxly should effectively become a **memory layer for the investor's financial life**.

A normal portfolio tracker answers:

> "What do I own and how is it performing?"

Stoxly should additionally be able to answer:

> **"What decisions have I made, why did I make them, what did I expect, what happened afterward, and how has my investment history evolved?"**

This longitudinal combination of **objective financial history + personal decision context + market context + AI analysis** is an important part of Stoxly's differentiation.

The accumulated history should become increasingly useful as more decisions, outcomes, and reflections are recorded. The value is therefore not only in storing individual notes, but in creating a continuously growing **personal investment memory** that can be analyzed over time.

```text
Journal
├── Decisions
├── Notes
├── Timeline
├── Reviews
└── Investment history
```

## Investor-Persona — Vision

_Separate project, documented here for continuity. See "Explicitly not" below — this is not a Stoxly subsystem._

### What this is

A standalone project (separate from Stoxly) to build a fictional expert-investor "mind" — codifying how real expert investors actually reason before making decisions, based on documented principles from investors like Buffett, Munger, and Dalio.

### Why

Most investing mistakes come from unclear or emotional reasoning, not lack of intelligence. This project makes expert-level reasoning explicit, checkable, and reusable — first as a mentor I can consult, later possibly as a fine-tuned model.

### Two layers

1. **Persona Layer** — usable immediately as an AI prompt. Defines the character's identity, core principles (margin of safety, inversion, circle of competence, process-over-outcome, position sizing), and a decision checklist run before any investment call.
2. **Training-Data Layer** — real case studies, mistakes, and Q&A pairs logged over time. Doubles as future fine-tuning data.

### Build order

1. Define persona identity + principles + checklist (fast, done through writing)
2. Use it as a working prompt/mentor on real decisions
3. Log every real reasoning session as a Case Study
4. Only fine-tune a model once 100+ solid case studies exist — not before

### Success looks like

A consistent, rules-based reasoning process I can trust more than gut feeling — eventually possibly a trained model that reasons the same way automatically.

### Explicitly not

- Not connected to Stoxly (separate folder, separate purpose)
- Not a trading bot or automated execution
- Not trained/fine-tuned yet — prompt-only for now

---

_Built by Vahe Ohanyan. © 2026 Stoxly._
