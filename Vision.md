# Stoxly — Vision

_Built by Vahe Ohanyan. © 2026 Stoxly._

Implementation detail (data model, systems architecture, build status, research notes) lives in `docs/` — this document is the product vision only. See `docs/status.md` for current build status, `docs/data-model.md` and `docs/systems-architecture.md` for how it's built, `docs/product-research-addendum.md` for open strategic questions, `docs/investment-memory.md` for the journal/decision-intelligence spec.

---

## 1. One-liner

Stoxly is a portfolio analytics platform for individual investors that computes correct time-weighted and money-weighted returns, real risk metrics, and — grounded strictly in that data — plain-language explanations of what actually happened to their stock and crypto holdings.

## 2. Problem

Individual investors who hold more than a handful of positions, across more than one deposit date, cannot get an accurate answer to "how am I actually doing?" from the tools they use today.

- Free trackers (Yahoo Finance, Google Finance, most brokerage apps) show `(current value − cost) / cost` — a number that's wrong the moment a second deposit or a stock split happens, because it doesn't separate strategy performance from the investor's own deposit timing.
- Net-worth apps (Empower, Kubera) aggregate balances but don't do lot-level cost basis, time-weighted return, or risk analytics (beta, volatility, drawdown, correlation).
- Anyone who wants those numbers correctly today either maintains a manual spreadsheet or pays for a professional terminal built for advisors, not self-directed investors.
- Nobody currently connects "what I decided and why" to "what actually happened" — so investors repeat the same reasoning mistakes without a record to check against.

**TODO:** I don't have a validated account of how the target user currently works around this (spreadsheet template, specific competitor product, word of mouth) — worth a few real conversations before the Problem section goes in front of an investor.

## 3. Solution

Stoxly treats every account as an append-only transaction ledger (never mutable position rows), and derives everything else from it:

- **Correct return math** — TWR (strategy performance, deposit-timing stripped out) and MWR/XIRR (the investor's actual return, given real deposit timing), computed the way real brokerages do it, not approximated.
- **Correct cost basis** — FIFO lot accounting that survives stock splits, partial sells, and backdated corrections without corrupting historical numbers.
- **Real risk analytics** — beta, volatility, max drawdown, Sharpe ratio, and a correlation matrix across holdings, so a portfolio that looks diversified but isn't (five 0.9-correlated names) is visible.
- **A grounded AI debrief** — a weekly, tool-use-backed explanation of what drove returns and how risk changed. The model is never allowed to state a number it didn't receive from a tool call, and never issues a buy/sell recommendation — that boundary is enforced in an eval suite, not just written as a rule.
- **A decision journal** — lightweight, structured capture of why a trade was made and what was expected, connected later to what actually happened. This is data that can only be collected going forward, never backfilled, and it's the part of the product a competitor can't copy by scraping price history.
- **No signup wall for evaluation** — a seeded demo account with two years of realistic transaction history, including a stock split, so the product can be judged in minutes.

## 4. Target users

**Primary persona (today):** the founder — an individual investor with a finance background who wants the same rigor a brokerage's back office uses, applied to their own real portfolio, because they're making real-money decisions with it.

**Early adopters:** self-directed retail investors who already track transactions somewhere (a spreadsheet, a notes app) and are underserved by free trackers' return math; crypto holders who want stocks and digital assets held to the same analytical standard instead of two separate tools; technically literate reviewers (engineers, other investors) who can tell the difference between a ticker app and a correct ledger in a few minutes.

**TODO:** no persona interviews or user research have been done yet outside the founder's own use. Worth validating that a second wave of early adopters actually exists at the stated price point before building the Pro tier out further.

## 5. Why now

- Fractional-share investing and mixed stock/crypto portfolios are now normal for retail investors, but most tracking tools still treat "stocks" and "crypto" as separate products with separate math.
- Large language models with reliable tool-use and post-generation validation now make it practical to generate a trustworthy natural-language explanation of a user's own numbers — without inventing figures — at a cost a solo/small team can afford. That wasn't viable a few years ago.
- Retail participation in markets has grown substantially since 2020, widening the gap between "how many people are investing" and "how many have tools that explain their performance correctly."

**TODO:** I'd want a cited stat here (e.g. brokerage account growth, retail trading volume trend) rather than an assertion — flag if you have a source you want cited, or I can look one up separately.

## 6. Unique advantage

- **Domain expertise encoded into the math, not just the UI.** A finance background plus a fintech-focused graduate degree means the ledger, TWR/XIRR calculation, and risk analytics are built the way real financial systems compute them — not approximated the way most consumer trackers do. This is legible to anyone who knows finance and invisible to anyone who doesn't, which is exactly the audience that matters for trust.
- **Compounding personal data.** The decision journal accumulates a longitudinal record — reasoning, expectations, portfolio state, and outcome — for every real decision the user logs. That history cannot be backfilled or scraped by a competitor; it only exists if it was captured at the time. The longer someone uses Stoxly, the more valuable their own account becomes to them specifically, which is a much stronger moat than the UI or the initial feature set.
- **A trust mechanism, not just a feature.** The AI layer's grounding rule (never state a number that didn't come from a tool call) is verified by an eval suite, and the plan is to publish it — turning "trust us" into something checkable.
- **Portfolio-scoped market context, not a standalone signal product.** Macro, sentiment, regulatory, liquidity, and on-chain data (see `docs/product-research-addendum.md`, HARLF section) get collected as *context for explaining the user's own holdings* — never as a general "ask our AI about Bitcoin" market-commentary product. Several funded tools (Agenticly, Santiment, CryptoQuantify, Intellectia AI) already sell generic cross-asset market intelligence, often framed predictively ("before price moves"). Stoxly can't win that fight and shouldn't try. The differentiated claim only Stoxly can make is portfolio-specific: not "rates rose and sentiment turned negative" (generic, anyone can say it) but "rates rose, sentiment turned negative on AI infrastructure specifically, and that's now 34% of *your* portfolio, up from 28% last month" — grounded in the user's actual ledger. The moment this data layer is usable without a connected portfolio, it's competing head-on with those tools on their own turf instead of on Stoxly's actual moat.

## 7. Business model

**Free tier:** transaction ledger, holdings, basic returns, watchlist, basic risk metrics.

**Paid tier ("Pro"):** the weekly AI debrief, advanced performance attribution (TWR vs. MWR explained), concentration/correlation analysis, historical risk evolution, custom benchmarks, longer transaction history, price alerts.

The split is deliberate: portfolio tracking is a commodity available for free elsewhere; correct, longitudinal portfolio *intelligence* is not, and that's what should be paid for.

**TODO:** exact price point is undecided — "$8–15/month" has been floated internally but not tested against willingness to pay. Also undecided: subscription vs. a per-report micro-transaction for the debrief (e.g. "pay for this week's report" instead of a recurring charge) — worth deciding before the billing page is built out, since it changes what the page needs to say.

**TODO:** no payment processor has been selected yet (Stripe is the assumed default, not committed).

## 8. Market

**TODO:** no market sizing (TAM/SAM/SOM) has been done. I don't want to invent a number here — if you want this section filled in, the inputs I'd need are: rough count of self-directed/retail brokerage accounts in the target geography, and what fraction of those investors hold ≥2 asset classes or make ≥1 deposit/withdrawal per quarter (since that's roughly where naive return math starts being visibly wrong).

**First niche to win:** self-directed investors who already hold both stocks and crypto and who track their own transactions manually today — they feel the "wrong return math" and "no unified view" problems most acutely, and the demo account plus seeded split scenario is built specifically to prove the value to this group in one sitting.

## 9. Competitors

| Competitor | Category | How Stoxly differs |
| --- | --- | --- |
| Yahoo Finance / Google Finance | Free market data + basic tracking | No correct TWR/MWR split, no lot-level cost basis, no risk analytics; Stoxly's core math doesn't exist there |
| Empower (Personal Capital) / Kubera | Net-worth aggregation | Strong at balance aggregation across accounts, weak at return-math correctness and risk analytics; different job (net worth vs. portfolio performance) |
| Sharesight | Portfolio performance tracking | Closest existing competitor on the return-math side — **TODO: I haven't done a direct feature comparison and don't want to assert specifics I haven't verified; worth a hands-on comparison before this row goes in front of anyone** |
| Delta / CoinStats | Crypto-only portfolio trackers | Crypto-specific, don't unify with stock holdings or apply the same cost-basis/return rigor across asset classes |
| Brokerage apps (Robinhood, etc.) | Trade execution | Built for placing trades, not for explaining historical performance; Stoxly is deliberately not a brokerage and has no execution surface |

**TODO:** this list is my best guess at the relevant categories, not a validated competitive analysis. Sharesight in particular deserves real research before you rely on this table.

## 10. Traction & milestones

**Now:** ledger, holdings engine, return engine (TWR/XIRR), risk engine (beta/volatility/drawdown/Sharpe/correlation), alerts, watchlist, news, crypto (CoinGecko-integrated), portfolio history snapshots, a 22-test suite over the core financial engines, and a seeded one-click demo account (not yet verified against a live database). Full detail in `docs/status.md`.

**Next 3 months:** cron-schedule the sync jobs so portfolio history actually accumulates, verify the demo account against a live database, fix the TWR approximation (it currently stands in market value with net cash invested), ship CSV import to remove the manual-entry onboarding barrier.

**Next 6 months:** billing page and a decided pricing model, a prototyped AI debrief validated on fixture data (before any API key is live), Sortino/Calmar added to the risk engine, the decision journal wired end-to-end.

**Next 12 months:** the live AI debrief shipped and gated behind the Pro tier, a small number of real users beyond the founder using it weekly, and a first read on whether the pricing model converts.

**TODO:** these are directional, not committed dates — let me know if you want this section to carry actual target dates instead of "3/6/12 months from now."

## 11. Metrics

**TODO:** no KPIs have been formally decided. Candidates worth considering, to confirm or replace:

- **Correctness:** TWR/MWR and cost-basis figures reconciled against a real broker statement with zero discrepancy — this is closer to a compliance bar than a growth metric, but it's the one number that has to be right before anything else matters.
- **Groundedness:** eval-suite pass rate on the "never state an unsourced number" rule and on refusing buy/sell requests — a trust metric, not a vanity one.
- **Engagement:** weekly-active use of the debrief once it ships (does the founder, and later other users, actually open it every week).
- **Conversion:** free-to-Pro conversion rate, once there's a Pro tier and users beyond the founder to convert.

## 12. Long-term vision

In three to five years, Stoxly's value shouldn't primarily be the dashboard — it should be the accumulated history underneath it: years of transactions, decisions, reasoning, and outcomes for each user, producing observations no snapshot tool can offer ("your portfolio has become progressively more concentrated over the last nine months," grounded in that user's own data going back years). That longitudinal record is the actual moat, because it can't be replicated by a competitor in a single product cycle — it only exists if it was captured the whole time.

Near-term, that means proving the model works for one real investor (the founder) using real money. If it holds up there, the natural extension is the same analytics and journal for other self-directed investors, and — later, unvalidated — a professional/B2B tier for financial educators or independent advisors, which is explicitly deferred until individual-user demand is proven.

**Explicitly out of scope, permanently:** trading signals or buy/sell recommendations (legal exposure and it corrupts the "every number is grounded" trust architecture), social/social-feed features, a trading simulator or order book, and brokerage execution. These are closed decisions, not gaps — the product is an explanation layer on top of a user's real portfolio, not a trading platform.
