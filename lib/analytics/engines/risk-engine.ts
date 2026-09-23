import PriceBar from "@/models/PriceBar";
import { Holding, RiskMetrics } from "../types";

// Formulas: beta = cov(portfolioReturns, benchmarkReturns) / var(benchmarkReturns), on
// date-aligned daily simple returns. Volatility = stdev(dailyReturns) * sqrt(252) (annualized).
// Max drawdown = worst peak-to-trough decline in the cumulative-return curve (compounded from 1.0).
// Sharpe = (annualizedReturn - riskFreeRate) / annualizedVolatility. Correlation = Pearson r
// between each pair of holdings' daily return series.
// Sortino = (annualizedReturn - riskFreeRate) / annualizedDownsideDeviation, where downside
// deviation only counts daily returns below 0 (the minimum acceptable return) — a stricter
// Sharpe variant that doesn't penalize upside volatility. Calmar = annualizedReturn / |maxDrawdown|.

const TRADING_DAYS_PER_YEAR = 252;
const RISK_FREE_RATE = 0.04; // placeholder — real impl would look up a live Treasury yield
const BENCHMARK_SYMBOL = "SPY";
const MIN_OVERLAPPING_DAYS = 20;

const LOOKBACK_DAYS = 365;

/** date (yyyy-mm-dd) -> close */
type CloseSeries = Map<string, number>;

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function fetchCloses(symbol: string): Promise<CloseSeries> {
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  const bars = await PriceBar.find({ symbol, timestamp: { $gte: since } })
    .sort({ timestamp: 1 })
    .lean();

  const closes: CloseSeries = new Map();
  for (const bar of bars as unknown as { timestamp: Date; close: number }[]) {
    closes.set(dateKey(bar.timestamp), bar.close);
  }
  return closes;
}

/** Daily simple returns keyed by the later date of each pair of consecutive closes. */
function toReturns(closes: CloseSeries): Map<string, number> {
  const dates = Array.from(closes.keys()).sort();
  const returns = new Map<string, number>();
  for (let i = 1; i < dates.length; i++) {
    const prev = closes.get(dates[i - 1])!;
    const curr = closes.get(dates[i])!;
    if (prev !== 0) {
      returns.set(dates[i], (curr - prev) / prev);
    }
  }
  return returns;
}

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

/** Downside deviation: stdev of returns below the minimum acceptable return (0), including
 * zero for returns at or above it so the sample size matches the full return series. */
function downsideDeviation(xs: number[], minimumAcceptableReturn = 0): number {
  if (xs.length < 2) return 0;
  const downsideSquares = xs.map((x) => (x < minimumAcceptableReturn ? (x - minimumAcceptableReturn) ** 2 : 0));
  const variance = downsideSquares.reduce((s, x) => s + x, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

function covariance(xs: number[], ys: number[]): number {
  if (xs.length < 2 || xs.length !== ys.length) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let sum = 0;
  for (let i = 0; i < xs.length; i++) {
    sum += (xs[i] - mx) * (ys[i] - my);
  }
  return sum / (xs.length - 1);
}

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const sx = stdev(xs);
  const sy = stdev(ys);
  if (sx === 0 || sy === 0) return 0;
  return covariance(xs, ys) / (sx * sy);
}

/** Align a set of return series on their shared dates, preserving chronological order. */
function alignOnCommonDates(
  seriesBySymbol: Map<string, Map<string, number>>,
): { dates: string[]; aligned: Map<string, number[]> } {
  const symbols = Array.from(seriesBySymbol.keys());
  if (symbols.length === 0) return { dates: [], aligned: new Map() };

  let commonDates = new Set(seriesBySymbol.get(symbols[0])!.keys());
  for (const symbol of symbols.slice(1)) {
    const dates = seriesBySymbol.get(symbol)!;
    commonDates = new Set([...commonDates].filter((d) => dates.has(d)));
  }

  const sortedDates = Array.from(commonDates).sort();
  const aligned = new Map<string, number[]>();
  for (const symbol of symbols) {
    const series = seriesBySymbol.get(symbol)!;
    aligned.set(
      symbol,
      sortedDates.map((d) => series.get(d)!),
    );
  }

  return { dates: sortedDates, aligned };
}

export async function calculateRiskMetrics(
  holdings: Holding[],
  currentPrices: Record<string, number>,
): Promise<RiskMetrics | null> {
  const heldHoldings = holdings.filter((h) => h.totalQuantity > 0);
  if (heldHoldings.length === 0) return null;

  const totalPortfolioValue = heldHoldings.reduce((sum, h) => {
    const price = currentPrices[h.symbol];
    return sum + (price ? price * h.totalQuantity : 0);
  }, 0);
  if (totalPortfolioValue <= 0) return null;

  const weights = new Map<string, number>();
  for (const h of heldHoldings) {
    const price = currentPrices[h.symbol];
    if (!price) continue;
    weights.set(h.symbol, (price * h.totalQuantity) / totalPortfolioValue);
  }
  if (weights.size === 0) return null;

  // Fetch daily closes for each holding plus the benchmark, and derive daily return series.
  const symbols = Array.from(weights.keys());
  const returnSeriesBySymbol = new Map<string, Map<string, number>>();

  for (const symbol of symbols) {
    const closes = await fetchCloses(symbol);
    const returns = toReturns(closes);
    if (returns.size > 0) returnSeriesBySymbol.set(symbol, returns);
  }

  const benchmarkCloses = await fetchCloses(BENCHMARK_SYMBOL);
  const benchmarkReturns = toReturns(benchmarkCloses);

  if (returnSeriesBySymbol.size === 0 || benchmarkReturns.size === 0) return null;

  // Portfolio daily return = weighted sum of holdings' returns on each date, using
  // *current* static weights (not historical weights on each day) — a known simplification.
  const { dates: holdingDates, aligned: alignedHoldingReturns } = alignOnCommonDates(
    returnSeriesBySymbol,
  );
  if (holdingDates.length < MIN_OVERLAPPING_DAYS) return null;

  const activeSymbols = Array.from(alignedHoldingReturns.keys());
  const activeWeightSum = activeSymbols.reduce((s, sym) => s + (weights.get(sym) ?? 0), 0);
  if (activeWeightSum <= 0) return null;

  const portfolioReturnsByDate = new Map<string, number>();
  holdingDates.forEach((date, i) => {
    let weightedSum = 0;
    for (const symbol of activeSymbols) {
      const w = (weights.get(symbol) ?? 0) / activeWeightSum; // renormalize over symbols with data
      weightedSum += w * alignedHoldingReturns.get(symbol)![i];
    }
    portfolioReturnsByDate.set(date, weightedSum);
  });

  // Align portfolio returns with the benchmark for beta.
  const { aligned: alignedForBeta } = alignOnCommonDates(
    new Map([
      ["__portfolio__", portfolioReturnsByDate],
      [BENCHMARK_SYMBOL, benchmarkReturns],
    ]),
  );
  const portfolioAligned = alignedForBeta.get("__portfolio__") ?? [];
  const benchmarkAligned = alignedForBeta.get(BENCHMARK_SYMBOL) ?? [];

  if (portfolioAligned.length < MIN_OVERLAPPING_DAYS) return null;

  const benchmarkVariance = stdev(benchmarkAligned) ** 2;
  const beta =
    benchmarkVariance !== 0 ? covariance(portfolioAligned, benchmarkAligned) / benchmarkVariance : 0;

  // Volatility: stdev of daily portfolio returns, annualized.
  const portfolioReturnsChrono = holdingDates.map((d) => portfolioReturnsByDate.get(d)!);
  const dailyVolatility = stdev(portfolioReturnsChrono);
  const annualizedVolatility = dailyVolatility * Math.sqrt(TRADING_DAYS_PER_YEAR);

  // Max drawdown: walk the cumulative-return curve compounded from 1.0.
  let cumulative = 1;
  let peak = 1;
  let maxDrawdown = 0;
  for (const r of portfolioReturnsChrono) {
    cumulative *= 1 + r;
    if (cumulative > peak) peak = cumulative;
    const drawdown = (cumulative - peak) / peak; // <= 0
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
  }

  // Sharpe ratio: annualize mean daily return, compare to placeholder risk-free rate.
  const annualizedReturn = mean(portfolioReturnsChrono) * TRADING_DAYS_PER_YEAR;
  const sharpe = annualizedVolatility !== 0 ? (annualizedReturn - RISK_FREE_RATE) / annualizedVolatility : 0;

  // Sortino ratio: same numerator as Sharpe, but only penalizes downside volatility.
  const annualizedDownsideDeviation = downsideDeviation(portfolioReturnsChrono) * Math.sqrt(TRADING_DAYS_PER_YEAR);
  const sortino =
    annualizedDownsideDeviation !== 0 ? (annualizedReturn - RISK_FREE_RATE) / annualizedDownsideDeviation : 0;

  // Calmar ratio: annualized return relative to the worst peak-to-trough decline.
  const calmar = maxDrawdown !== 0 ? annualizedReturn / Math.abs(maxDrawdown) : 0;

  // Correlation matrix: pairwise Pearson correlation between each pair of holdings.
  const correlationMatrix: Record<string, Record<string, number>> = {};
  for (const symbolA of activeSymbols) {
    correlationMatrix[symbolA] = {};
    for (const symbolB of activeSymbols) {
      correlationMatrix[symbolA][symbolB] =
        symbolA === symbolB
          ? 1
          : pearsonCorrelation(
              alignedHoldingReturns.get(symbolA)!,
              alignedHoldingReturns.get(symbolB)!,
            );
    }
  }

  return {
    beta,
    volatility: annualizedVolatility,
    maxDrawdown,
    sharpe,
    sortino,
    calmar,
    correlationMatrix,
  };
}
