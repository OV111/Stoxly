export const CACHE_TTL = {
  /** Analysis results – 0.5 hour */
  fullAnalysis: 1800,

  /** Price quotes – 6 seconds */
  quote: 10,

  /** Top gainers/losers – 5 minutes */
  gainers: 300,
  losers: 300,

  /** Market stats – 5 minutes */
  marketStats: 300,

  /** Running flag – 5 minutes (auto‑clear) */
  running: 300,
} as const;
