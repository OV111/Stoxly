# Product Research & Strategic Critique

_AI-generated during a product-research pass. Kept as reference/open-questions material, not settled architecture. Where a recommendation below was adopted, it's reflected directly in `Vision.md`'s roadmap/milestones — this file is the reasoning trail, not the source of truth on current plans._

## Research findings, by topic

**TWR approximation is a correctness risk.** Stoxly's entire positioning is "mathematically correct data." A reviewer who knows finance will spot the current TWR approximation (cash-invested stand-in for actual market value at each flow date). The first screen — TWR/MWR split — is the three-minute test, so this is the highest-priority fix.

**Onboarding friction is the #1 adoption killer.** The seeded demo account solves the reviewer problem, not the user problem. A real user with an existing brokerage account can't use Stoxly without CSV import — manual entry of dozens of transactions is a non-starter.

**The AI debrief should be prototyped early, not last.** It's called the product centerpiece but was originally scheduled last, blocked on an API key. Risk: building the entire ledger, risk engine, and billing surface before discovering the debrief format doesn't work as imagined. A pure-function prototype (mocked tool calls, fixture data) can validate output format, the grounding rule, and eval coverage without a live key.

**Risk engine has an invisible-value problem.** `risk-engine.ts` returns `null` until enough `PriceBar` history exists — for new users, one of the core moat features may be invisible for weeks. Worth considering synthetic/benchmark-based estimates, clearly labeled, so Pro-tier value isn't invisible during early retention.

**Pricing should anchor to an outcome, not a feature list.** "~$8–15/month" is a range, not a decision. Users pay for outcomes ("understand your portfolio better than any broker app can explain"), and subscription fatigue is real — a per-report micro-transaction is worth considering as an alternative to subscription.

**The debrief is a plausible growth mechanism.** Strava and Spotify Wrapped both work as social proof without being social features. A shareable, anonymized "portfolio health report" (e.g. "your concentration risk increased 6% this month") could work the same way for Stoxly while respecting the no-social-features boundary.

**Crypto and stock investors may need differentiated analytics views on the unified ledger** — stocks: beta, Sharpe, sector rotation; crypto: volatility, drawdown, correlation to BTC/ETH; both: concentration, correlation matrix. The ledger itself stays unified regardless.

**The debrief likely needs a follow-up affordance.** "No AI chatbot" is correct as the primary interface, but users will want to drill down ("why did NVDA contribute 71%?", "what if I'd sold 10% of NVDA?"). An "ask about this report" affordance, grounded in the same tool calls, resolves this without becoming a general chat interface — the latter question is a hypothetical simulation, never advice.

**Most users, even technical ones, don't know what TWR/MWR mean.** The three-minute test currently assumes a financially literate reviewer. One-line plain-language explanations next to each metric (e.g. "TWR: how your strategy performed, ignoring when you added money") make the moat legible instead of just displayed.

**Boring, reliable apps win the recurring high-stakes workflow.** Stoxly's core workflow — tracking a portfolio — is meant to be boring and dependable; the AI debrief is the reward layer. Don't over-animate or over-gamify the dashboard itself.

## Friction map

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

## Cross-industry mechanisms worth borrowing

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

## Open questions to validate

- Do users actually want a weekly debrief, or is on-demand better?
- Is the debrief shareable artifact a growth mechanism or a privacy risk?
- Will users pay for outcome-based pricing, or do they expect a flat subscription?
- How long until `PriceBar` history is sufficient for risk analytics? What's the fallback?
- Does the "no chatbot" decision hold when users want to drill into the debrief?
- Is the crypto + stock unified ledger actually useful, or do users want separate views?
- What is the single most important metric that proves the moat in the three-minute test?

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
2. **Sentiment engine, prototype only** — fixture-tested pure function with mock article input, no live news scraping yet. High strategic value (feeds both the AI Debrief and Decision Reviews) but the debrief itself isn't built, so don't wire live infra prematurely.
3. **Benchmark comparison table** — easy, but low urgency until the billing/Pro-tier surface exists.
4. **Risk-budget display lens** — pure UX polish, zero backend risk, fine to defer.
5. **What-if sandbox** — depends on the AI Debrief existing first (it's a follow-up affordance on the debrief); building it earlier has no destination.
6. **RL allocation engine** — not adopted, ever. Conflicts with the closed "no trading signals" decision.
