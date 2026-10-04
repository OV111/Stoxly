# Data Model — The Decision That Can't Be Retrofitted

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

## Analytics Engine Layout

```
lib/analytics/
  types.ts             // shared: Holding, Lot, ReturnMetrics, RiskMetrics, SentimentScore
  holdings-engine.ts   // replays the transaction log → current positions + cost basis
  returns-engine.ts    // holdings + cash-flow timeline + live prices → TWR, MWR/XIRR, unrealized P&L
  risk-engine.ts       // holdings + historical OHLC + benchmark → beta, volatility, drawdown, Sharpe, Sortino, Calmar, correlation matrix
  sentiment-engine.ts  // per-asset news articles → sentiment score per time window (prototype, fixture-tested; see product-research-addendum.md)
```

Each engine is independently unit-testable with fixture data. Route handlers fetch transactions/prices from DB and Finnhub, then hand them to these functions — the engines themselves never touch Mongo or the network.

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
