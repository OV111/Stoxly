# Vision — Stoxly

> **If you're an AI reading this cold:** this doc is both the product vision and a live status snapshot. Read "Current Status" first to know exactly what exists and what's next — treat everything below it as the settled architectural decisions this project already made, not open questions to re-litigate. The user is a solo dev building this to learn deeply (finance BSc + fintech master's), not to ship fast — favor correctness and explanation over speed.

---

## Current Status

_Last updated: 2026-08-23. Update this section whenever a build-sequence step lands._

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

**Known gap, not yet closed:** TWR currently approximates each sub-period's value using cumulative net cash invested (deposits − withdrawals) as a stand-in for actual market value at each flow date, because there's no historical price snapshot to pull the real value from. This will under/overstate TWR whenever price movement between deposits is significant. Fixing it needs `PortfolioSnapshot` rows to accumulate (the model and sync route now exist — the daily cron that populates them does not) or the OHLC time-series collection backfilled, so past portfolio value is knowable rather than approximated.

**Resolved:** Finnhub's `/stock/candle` is plan-gated on the current key (confirmed `"restricted"`). `lib/priceBarSync.ts` now falls back to `lib/twelvedata.ts` (`time_series` endpoint, free tier: 8 credits/min, 800/day) whenever Finnhub returns `null`. **Requires `TWELVE_DATA_API_KEY` in `.env.local`** — sign up at twelvedata.com, the code treats a missing key as "provider unavailable" rather than erroring, so `risk-engine.ts` stays gracefully `null` until it's added. Once set, verify with `POST /api/pricebars/sync` — a `"source": "twelvedata"` in the response confirms the fallback fired.

**Done — seeded demo account:** one-click, no signup wall. `lib/demoSeed.ts` (deterministic ~2-year, 15-holding transaction set, includes an NVDA 4:1 split, a partial AAPL sell for realized P&L, a TSLA loss, and recurring dividends) + `lib/demoAccount.ts` (idempotent find-or-create + seed-once-if-empty) + `POST /api/auth/demo` (issues a real session cookie, same path as sign-in) + `TryDemoButton` wired into the landing nav (desktop/mobile) and the sign-in page. **Not yet verified against a live DB** — run it and confirm `/dashboard` renders real TWR/MWR/holdings before trusting it.

- Crypto markets use CoinGecko's bulk market endpoint (not Finnhub), and each asset card can log directly to the append-only ledger using a canonical `CRYPTO:<coin-id>` symbol. The portfolio quote layer recognizes those symbols and values them through CoinGecko, rather than treating crypto as a separate tracker. Requires `COINGECKO_API_KEY` in `.env.local`.
- Crypto Markets supports selecting multiple assets for a grounded live-quote comparison (price, daily move, and session range). It deliberately does not forecast or recommend trades; portfolio-level risk analytics remains tied to the ledger and historical bars.
- The dashboard&apos;s static movers panel is replaced by live CoinGecko crypto gainers and losers, ranked by 24-hour percentage change within the top 100 assets by market cap. The bounded universe is stated in the UI rather than implying a market-wide ranking.
- Crypto asset cards and the dashboard movers render the CoinGecko-supplied asset logos; image hosts are explicitly allowlisted in `next.config.ts`.

**Not started / remaining:**
- **AI debrief layer** (see "The Idea" below) — deliberately last, per Build Sequence. Blocked: no `ANTHROPIC_API_KEY` in `.env.local` yet.
- **Cron wiring** — `/api/pricebars/sync`, `/api/snapshots/sync`, and `/api/alerts/evaluate` are all manual-trigger routes. None run on a schedule yet; they need a `vercel.json` crons entry. Until then `PortfolioSnapshot` stays empty and the history chart shows its empty state.
- `risk-engine.ts` is untested — it queries `PriceBar` directly, so unit testing needs either dependency injection of the price-bar fetch or `mongodb-memory-server`. Refactoring it to accept price series as an argument (like the other two engines) is the change to make first.
- `app/api/market/chart/route.ts` — still a stub.
- Data input is manual-entry only by design (see "Data Input" note below) — no brokerage account linking.
- `PortfolioHistoryPanel` reuses `components/stock/PriceChart.tsx` by padding snapshot values into unused OHLC fields. Works, but the clean fix is an optional `values: number[]` prop on `PriceChart` that skips the candle mapping.

**Next recommended step:** verify Finnhub candle access (see Blocking unknown above) — it gates whether `risk-engine.ts` can ever return real numbers, and the answer determines whether the next task is "wire the cron" or "swap OHLC providers." After that, the seeded demo account is the highest-leverage remaining work per this doc's own argument.

---

## The Reframe

"Stock market dashboard" is one of the most saturated portfolio project categories that exists — up there with e-commerce clones and todo apps. A reviewer's first reaction to the repo name is pattern recognition, not curiosity: _another ticker app_. Every UI feature added inside that frame fights an uphill battle for attention it will not win.

So the question isn't "which features are impressive." It's: **what can be built here that a developer without a finance background literally cannot build correctly?**

That's the moat, and it's a real one: Finance BSc + FinTech Master's + full-stack engineering. Almost nobody in the applicant pool has that combination. The project's job is to make that unmistakable — built by someone who understands markets, not someone who found the Finnhub docs. Every decision below is filtered through that lens.

---

## What It Is

Stoxly is a personal portfolio analytics platform for tracking stocks and crypto with correct financial math underneath — not a brokerage, not a social platform, not a trading simulator. The UI is the thin, fast, dark-themed layer on top. The actual product is the ledger, the return math, and the risk analytics underneath it, because that's the part that can't be faked by copying a tutorial.

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

Beta against a benchmark, rolling volatility, max drawdown, Sharpe ratio, and a correlation matrix across holdings — "you think you're diversified; these five names are 0.9 correlated." This is rare because it's actual _insight_, not a restatement of data the user already has.

None of this is UI work. That's why it's the moat — it can't be faked or skimmed off a component library.

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

1. **Money is never a JS `Number`.** `0.1 + 0.2 !== 0.3`, and IEEE-754 floats silently corrupt cost basis over hundreds of transactions. Use Mongo `Decimal128` (correct, awkward in JS — pair with `decimal.js` at the boundary) or integer minor units. Either is defensible; `Number` is not. This is the single strongest "this person has done real fintech work" signal in the codebase, and the first thing a reviewer with finance/banking experience checks.
2. **Positions are derived, never stored.** Holdings = a fold over the transaction log. Same event-sourcing instinct real ledger systems use — it's what makes corrections and backdated entries tractable instead of destructive.
3. **`occurredAt` vs `createdAt` — bitemporality.** Backdating a trade forgotten last week must not corrupt everything computed since.

**OHLC price history is a separate concern** and does not belong in a normal collection — Mongo's native time-series collections (`timeseries: { timeField, metaField, granularity }`) are the idiomatic answer while staying on Mongo. Mixing high-cardinality tick data into app collections is a mistake reviewers notice immediately.

---

## Systems Problems Worth Solving

Async/infra work that most portfolio projects have zero of — having any is differentiating; handling the edge cases is a talking point.

- **Request coalescing / singleflight over Finnhub** — 50 concurrent requests for AAPL collapse to 1 upstream call, plus a circuit breaker. The API's real rate ceiling is a gift: a genuine constraint forcing a genuine solution.
- **Exactly-once alert delivery** — a distributed-systems problem in miniature: idempotency keys, a fired-state transition that survives worker retries, dedupe so a price oscillating around a threshold doesn't fire 40 emails.
- **Backfill/reconciliation job** — providers revise history after the fact; a job that detects drift between stored bars and source data is unglamorous and extremely "real system."

---

## AI Layer — Done Non-Cliché

Streaming summaries are table stakes in 2026. What isn't:

- **Hard grounding rule** — the model may never emit a number it didn't receive from a tool call (`getPortfolio`, `getQuote`, `getRiskMetrics`). Enforced via tool use plus post-generation validation: every numeral in the output must appear in the tool results, or it's rejected and retried.
- **An eval suite** — 20–30 fixture cases asserting no hallucinated figures, correct refusal on "should I buy X," stable output structure. This is what AI engineering actually looks like now, versus "I called the API" — and almost nobody has it in a portfolio.
- **Explanation, not prediction.** Grounded attribution from the platform's own math, never market forecasting. Financial-advice framing is a liability, not a feature.

---

## The Idea — AI-Powered Portfolio Debrief

Once a week (or on demand), Stoxly generates a **personal portfolio debrief** — not a market summary, not a news feed, but a structured audit of *your* portfolio using *your* actual transaction data and risk metrics.

It answers three questions a generic dashboard never does:

- **What actually drove your returns this week?** — not "markets were up," but "87% of your gain came from NVDA, which now makes up 34% of your portfolio — your concentration risk increased."
- **Where is your portfolio lying to you?** — assets that feel diversified but are 0.9 correlated, a position sized as a small bet that's quietly become your largest holding.
- **What does the math say you did well or poorly?** — TWR vs MWR delta explained in plain language: "you timed your AAPL deposit well, it added 2.1% to your money-weighted return above the strategy return."

**Why this is the right idea for Stoxly specifically:**

- It's only possible because the ledger and risk analytics are correct underneath — a fake tracker can't generate this, which is the whole point of the moat
- The AI layer stays grounded — every sentence traces to a tool call result, no hallucinated numbers, which is exactly the architecture this doc already mandates
- It's a feature a real user actually wants, not a demo gimmick
- It fits the build sequence — it's last, after the math is solid, which is where it belongs

**What it is not:** a market prediction, a "buy/sell" recommendation, or a sentiment scraper. Entirely backward-looking, entirely grounded in the user's own data.

This is the feature that makes Stoxly a product, not a portfolio piece that happens to have a dashboard.

---

## No Buy/Sell Signals — A Hard Architectural Boundary

Stoxly deliberately has no feature for recommending what to buy, sell, or when — for stocks, crypto, or any other asset. This is not a gap in the roadmap. It is a closed design decision.

**Why it's off the table:**

- **Legal exposure.** Emitting a "buy BTC now" or "sell AAPL" signal, even framed as AI output, crosses into financial advice territory in most jurisdictions. The liability is real and disproportionate to any product benefit.
- **It would corrupt the AI grounding rule.** The hard constraint — the model may only emit numbers it received from a tool call — has no meaningful enforcement path for forward-looking predictions. A price forecast is by definition not sourced from the portfolio's own data. Allowing it would make the grounding architecture a lie.
- **Predictions are probably wrong.** A "should I buy X" feature that's right 52% of the time and wrong 48% destroys user trust faster than not having it. Stoxly's moat is being *correct* — backward-looking analysis where correctness is verifiable. Forward-looking predictions aren't verifiable until it's too late.
- **It's a different product.** Buy/sell signal generation belongs to quantitative trading tools, not portfolio analytics platforms. Adding it here is scope explosion that muddies the identity of the project.

**What the AI layer does instead:** it explains what already happened, using the platform's own verified math. "Your BTC position contributed −4.2% to your total return last week, and its 90-day correlation with your NASDAQ holdings is now 0.82" — that is a grounded, useful, legally safe statement. "Buy more BTC" is none of those things.

**Enforced in the eval suite:** correct refusal on "should I buy X," "what should I invest in," and "is now a good time to buy [symbol]" is a required passing case. Any model output that answers those questions affirmatively — even hedged — is a test failure.

---

## What It Is Not

- Not a brokerage — no trade execution
- Not a financial advisor — nothing here is investment advice, and the AI layer is explicitly constrained never to sound like one
- Not a buy/sell signal generator — no recommendations on what or when to buy or sell, for any asset class
- Not a paper-trading/matching-engine simulator — sounds impressive, is scope explosion, and drags toward order books, a different project entirely
- Not a social network — no feeds, no followers, no sentiment from strangers

---

## Tech Foundation

| Layer     | Technology                                                   |
| --------- | ------------------------------------------------------------ |
| Framework | Next.js 16 (App Router, Turbopack)                           |
| UI        | Tailwind CSS 4, shadcn/ui, Framer Motion                     |
| Data      | Finnhub API, TradingView widgets                             |
| Numbers   | `decimal.js` at the JS boundary, Mongo `Decimal128` at rest  |
| AI        | Claude API — tool use + grounding validation, streaming      |
| Auth      | JWT sessions (`jose`), bcrypt, Google OAuth                  |
| Database  | MongoDB (Mongoose) + native time-series collections for OHLC |

---

## Build Sequence — And the Trap

Current known gaps: no Watchlist/Portfolio/Alert models, `app/api/market/chart/route.ts` is an empty stub, no test suite. **Do not add surface area on top of that.** Six new pages over an untested, float-based core makes the repo worse, not better — more code, same rot. A reviewer reads that as breadth without depth, which reads as junior.

Order, in priority:

1. **Transaction schema + pure calculation module** — cost basis, realized/unrealized P&L, TWR, XIRR. Pure functions, trivially unit-tested, and the foundation everything else stands on.
2. **Portfolio surface** on top of the ledger — holdings derived, not stored.
3. **Caching/coalescing layer** over Finnhub — makes "live" sustainable instead of aspirational.
4. **Alerts + worker** — exactly-once delivery, idempotent, dedupe.
5. **Risk analytics** — beta, volatility, drawdown, Sharpe, correlation matrix.
6. **AI layer, last** — it's only interesting once there's real, correct data underneath it to be grounded in.

The trap: building the AI layer or the alerts UI first because they demo well. They demo well and then fall over the first time someone checks the math, which is worse than not having them.

### Analytics Engine Layout

Step 1's "pure calculation module" is three files, one folder — not separate services, not separate folders. They're the same layer (pure functions, no DB/network calls) that compose in sequence:

```
lib/analytics/
  types.ts             // shared: Holding, Lot, ReturnMetrics, RiskMetrics
  holdings-engine.ts    // replays the transaction log → current positions + cost basis. No prices needed.
  returns-engine.ts     // holdings + cash-flow timeline + live prices → TWR, MWR/XIRR, unrealized P&L
  risk-engine.ts         // holdings + historical OHLC + benchmark → beta, volatility, drawdown, Sharpe, correlation matrix
```

Each is independently unit-testable with fixture data. A route handler (e.g. `app/api/portfolio/route.ts`) fetches transactions/prices from the DB and Finnhub, then hands them to these functions — the engines themselves never touch Mongo or the network. Same functions get reused by the AI debrief layer later, no rewrite needed.

---

## The Three-Minute Test

A reviewer gives this project about three minutes. Two things decide the outcome:

- **A seeded demo account, one click, no signup wall.** A realistic 15-holding portfolio with two years of transactions — including a stock split, so the corporate-actions handling is actually visible without the reviewer doing anything. This single decision probably beats any three features on this list for actual conversion.
- **The first screen proves the moat, not the UI.** Cost basis and returns need to be visibly _correct_ — a TWR/MWR split shown side by side, a correlation matrix that says something real — not just another price ticker with a nice dark theme.

---

## Who It Is For

- Individual investors who want a cleaner, correct alternative to Yahoo Finance or Google Finance
- Crypto holders who want stocks and digital assets tracked with the same rigor
- Reviewers and engineers who can tell, in three minutes, the difference between a ticker app and a ledger

---

_Built by Vahe Ohanyan. © 2026 Stoxly._

### Search — Financial Instrument Discovery

Search is Stoxly's financial-instrument discovery layer. It resolves a user's search intent into a canonical, identifiable instrument that the rest of the platform can operate on.

The initial supported universe is:

* **Stocks / Equities** — AAPL, NVDA, TSLA
* **Cryptoassets** — BTC, ETH, SOL
* **ETFs** — SPY, QQQ, VOO
* **Indices / Benchmarks** — S&P 500, NASDAQ-100

Stocks, ETFs, and cryptoassets can become portfolio holdings, while indices primarily serve as reference instruments for benchmarking and risk analytics.

Mutual funds, bonds, commodities, FX, and other instruments may be added later. **Derivatives (options/futures) are currently out of scope** because they require substantially different financial and portfolio semantics.

Search is responsible for **finding and identifying instruments**, not analyzing, recommending, or forecasting them. The result should provide a canonical Stoxly identifier and instrument type so the same identity can flow consistently through the asset page, watchlist, transaction ledger, quotes, analytics, and AI debrief.
