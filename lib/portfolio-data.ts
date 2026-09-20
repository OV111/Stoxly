export type Period = "1W" | "1M" | "3M" | "YTD";

export type Insight = {
  id: string;
  tone: "warning" | "positive";
  finding: string;
  context: string;
};

export const weeklyDebrief = {
  range: "Sep 8 – 14, 2026",
  portfolioReturn: 2.8,
  driver: { symbol: "NVDA", contribution: 71 },
  concentration: { from: 28, to: 34 },
  correlation: { pair: "AAPL / NVDA", value: 0.82 },
  mwrTwrGap: 2.1,
  conclusion:
    "This week's gain was carried almost entirely by NVDA, which alone accounted for 71% of the move — a level of dependence worth noting given the position also grew from 28% to 34% of the portfolio over the same period. AAPL and NVDA are now moving together more than usual, at a 0.82 correlation, which trims the diversification benefit of holding both. On the deposit side, timing worked in your favor this week: money-weighted return beat time-weighted return by 2.1%, meaning contributions landed ahead of the rally rather than after it.",
};

export const groundingSources = [
  { call: "getPortfolio", detail: "15 holdings, prices as of Sep 14 09:32 UTC" },
  { call: "getRiskMetrics", detail: "Sharpe 1.24, beta 0.91, max drawdown −18.3%" },
  { call: "getSnapshots", detail: "47 daily snapshots (Oct 2024 – Sep 2026)" },
];

export const debriefHistory = [
  { range: "Sep 8–14", return: 2.8, spark: [1, 2, 1, 3, 2, 3, 4] },
  { range: "Sep 1–7", return: -1.4, spark: [2, 1, -1, -2, -1, -2, -1] },
  { range: "Aug 25–31", return: 0.9, spark: [0, 1, 1, 0, 1, 2, 1] },
  { range: "Aug 18–24", return: 3.6, spark: [1, 2, 3, 3, 4, 4, 5] },
  { range: "Aug 11–17", return: -0.6, spark: [1, 0, -1, 0, -1, -1, -1] },
  { range: "Aug 4–10", return: 1.7, spark: [0, 1, 1, 2, 2, 2, 3] },
  { range: "Jul 28–Aug 3", return: -2.1, spark: [1, 0, -1, -2, -2, -3, -2] },
  { range: "Jul 21–27", return: 4.2, spark: [0, 1, 2, 3, 4, 4, 5] },
];

export const attributionData: Record<
  Period,
  { symbol: string; contribution: number }[]
> = {
  "1W": [
    { symbol: "NVDA", contribution: 1.98 },
    { symbol: "AAPL", contribution: 0.44 },
    { symbol: "MSFT", contribution: 0.21 },
    { symbol: "GOOGL", contribution: 0.09 },
    { symbol: "AMZN", contribution: 0.05 },
    { symbol: "BTC", contribution: -0.18 },
    { symbol: "TSLA", contribution: -0.31 },
  ],
  "1M": [
    { symbol: "NVDA", contribution: 6.72 },
    { symbol: "MSFT", contribution: 1.15 },
    { symbol: "AAPL", contribution: 0.88 },
    { symbol: "AMZN", contribution: 0.32 },
    { symbol: "GOOGL", contribution: 0.11 },
    { symbol: "BTC", contribution: -1.04 },
    { symbol: "TSLA", contribution: -1.62 },
  ],
  "3M": [
    { symbol: "NVDA", contribution: 14.31 },
    { symbol: "MSFT", contribution: 3.02 },
    { symbol: "AAPL", contribution: 1.76 },
    { symbol: "AMZN", contribution: 0.94 },
    { symbol: "GOOGL", contribution: 0.41 },
    { symbol: "TSLA", contribution: -3.87 },
    { symbol: "BTC", contribution: -4.52 },
  ],
  YTD: [
    { symbol: "NVDA", contribution: 22.4 },
    { symbol: "MSFT", contribution: 5.61 },
    { symbol: "AAPL", contribution: 3.29 },
    { symbol: "AMZN", contribution: 1.87 },
    { symbol: "GOOGL", contribution: 0.95 },
    { symbol: "TSLA", contribution: -6.14 },
    { symbol: "BTC", contribution: -8.03 },
  ],
};

export const initialInsights: Insight[] = [
  {
    id: "concentration",
    tone: "warning",
    finding: "Concentration spike",
    context: "NVDA is now 34% of portfolio (was 28% last week).",
  },
  {
    id: "correlation",
    tone: "warning",
    finding: "Correlation warning",
    context: "4 of 6 positions correlate above 0.80.",
  },
  {
    id: "sharpe",
    tone: "positive",
    finding: "Sharpe ratio improved",
    context: "Moved from 0.91 to 1.24 over 30 days.",
  },
];

export const behavioralPatterns = [
  {
    name: "Momentum buyer",
    observation:
      "You've added to positions after 10%+ upward moves in 7 of 9 cases.",
    dataPoint: "7 of 9 additions followed a double-digit rally.",
  },
  {
    name: "Short holder",
    observation: "Positions tend to be sold well before the one-year mark.",
    dataPoint: "Average holding period before sell: 52 days.",
  },
  {
    name: "Loss aversion signal",
    observation: "Losing positions stay in the portfolio longer than winners.",
    dataPoint: "Losers held 2.3× longer than winners on average.",
  },
];