# Investment Memory & Decision Intelligence

A core future layer of Stoxly is an **Investment Memory & Decision Intelligence system**.

Traditional exchanges and portfolio trackers are very good at recording **what happened financially**: what the user bought, sold, deposited, withdrew, how many shares they own, and how the portfolio performed. Stoxly should go one layer deeper by also capturing **the human context behind important investment decisions**.

The purpose is not to turn Stoxly into a diary or social platform. The purpose is to create a structured, longitudinal memory of the investor's decisions and eventually understand the relationship between:

**What the investor did → Why they did it → What they expected → What the market did → What happened to the portfolio → What happened afterward**

## Lightweight user input

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

## Financial truth vs. user context

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

## Decision timeline

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

## AI Decision Reviews

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

## Longitudinal investment intelligence

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

## Personal investment memory

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
