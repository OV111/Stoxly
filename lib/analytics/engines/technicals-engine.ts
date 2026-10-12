/**
 * Technical indicators over a daily price series.
 *
 * Pure: bars in, numbers out. Standard textbook definitions (Wilder smoothing
 * for RSI/ATR, SMA-seeded EMAs) so values can be checked against any charting
 * platform.
 *
 * Deliberately descriptive only. It reports where price sits relative to its
 * averages and conventional thresholds; it never rolls those up into a
 * buy/sell "summary rating" — Stoxly doesn't issue trading signals (Vision.md).
 */

export type DailyBar = {
  date: string; // ISO date
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type Series = (number | null)[];

export function sma(values: number[], period: number): Series {
  const out: Series = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** EMA seeded with the SMA of the first `period` values (the common convention). */
export function ema(values: number[], period: number): Series {
  const out: Series = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Wilder's RSI. */
export function rsi(values: number[], period = 14): Series {
  const out: Series = new Array(values.length).fill(null);
  if (values.length <= period) return out;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    if (change >= 0) gain += change;
    else loss -= change;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  const toRsi = () => (avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  out[period] = toRsi();

  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(change, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-change, 0)) / period;
    out[i] = toRsi();
  }
  return out;
}

export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9) {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const line: Series = values.map((_, i) =>
    fastEma[i] !== null && slowEma[i] !== null ? fastEma[i]! - slowEma[i]! : null,
  );

  // The signal EMA runs over the defined part of the MACD line only.
  const firstDefined = line.findIndex((v) => v !== null);
  const signal: Series = new Array(values.length).fill(null);
  if (firstDefined !== -1) {
    const defined = line.slice(firstDefined) as number[];
    ema(defined, signalPeriod).forEach((v, j) => (signal[firstDefined + j] = v));
  }
  const histogram: Series = line.map((v, i) =>
    v !== null && signal[i] !== null ? v - signal[i]! : null,
  );
  return { line, signal, histogram };
}

/** Bollinger Bands with population standard deviation (Bollinger's own definition). */
export function bollinger(values: number[], period = 20, multiplier = 2) {
  const middle = sma(values, period);
  const upper: Series = new Array(values.length).fill(null);
  const lower: Series = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const mean = middle[i]!;
    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) variance += (values[j] - mean) ** 2;
    const sd = Math.sqrt(variance / period);
    upper[i] = mean + multiplier * sd;
    lower[i] = mean - multiplier * sd;
  }
  return { middle, upper, lower };
}

/** Wilder's Average True Range. */
export function atr(bars: DailyBar[], period = 14): Series {
  const out: Series = new Array(bars.length).fill(null);
  if (bars.length <= period) return out;

  const tr = bars.map((b, i) =>
    i === 0
      ? b.high - b.low
      : Math.max(
          b.high - b.low,
          Math.abs(b.high - bars[i - 1].close),
          Math.abs(b.low - bars[i - 1].close),
        ),
  );
  let prev = tr.slice(1, period + 1).reduce((a, b) => a + b, 0) / period;
  out[period] = prev;
  for (let i = period + 1; i < bars.length; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
    out[i] = prev;
  }
  return out;
}

const last = <T>(arr: T[]): T | undefined => arr[arr.length - 1];

// Trading-day lookbacks for the performance strip.
const LOOKBACKS = [
  { key: "1W", days: 5 },
  { key: "1M", days: 21 },
  { key: "3M", days: 63 },
  { key: "6M", days: 126 },
  { key: "1Y", days: 252 },
] as const;

export type PerformanceKey = (typeof LOOKBACKS)[number]["key"] | "YTD";

export type TechnicalsChartPoint = {
  date: string;
  close: number;
  sma50: number | null;
  sma200: number | null;
  bbUpper: number | null;
  bbLower: number | null;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
};

export type TechnicalsSummary = {
  asOf: string;
  price: number;
  movingAverages: { period: number; type: "SMA" | "EMA"; value: number | null; pctFromPrice: number | null }[];
  rsi14: number | null;
  macd: { line: number | null; signal: number | null; histogram: number | null };
  bollinger: { upper: number | null; middle: number | null; lower: number | null; percentB: number | null };
  atr14: number | null;
  atrPct: number | null;
  range52w: { high: number; low: number; pctFromHigh: number; pctFromLow: number };
  volume: { latest: number; avg50: number | null; ratio: number | null };
  performance: { key: PerformanceKey; value: number | null }[];
  chart: TechnicalsChartPoint[];
};

const pctDiff = (value: number | null, base: number) =>
  value === null || value === 0 ? null : (base - value) / value;

export function computeTechnicals(bars: DailyBar[], chartPoints = 252): TechnicalsSummary | null {
  // RSI/ATR need period+1 bars; anything shorter isn't worth showing.
  if (bars.length < 30) return null;

  const closes = bars.map((b) => b.close);
  const price = last(closes)!;
  const latestBar = last(bars)!;

  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const rsi14 = rsi(closes, 14);
  const m = macd(closes);
  const bb = bollinger(closes, 20, 2);
  const atr14 = atr(bars, 14);
  const volAvg50 = sma(bars.map((b) => b.volume), 50);

  const yearBars = bars.slice(-252);
  const high52 = Math.max(...yearBars.map((b) => b.high));
  const low52 = Math.min(...yearBars.map((b) => b.low));

  const bbUpper = last(bb.upper) ?? null;
  const bbLower = last(bb.lower) ?? null;
  const percentB =
    bbUpper !== null && bbLower !== null && bbUpper !== bbLower
      ? (price - bbLower) / (bbUpper - bbLower)
      : null;

  const performance: TechnicalsSummary["performance"] = LOOKBACKS.map(({ key, days }) => ({
    key,
    value: closes.length > days ? price / closes[closes.length - 1 - days] - 1 : null,
  }));
  const year = latestBar.date.slice(0, 4);
  const lastPriorYearClose = [...bars].reverse().find((b) => b.date.slice(0, 4) < year)?.close;
  performance.push({ key: "YTD", value: lastPriorYearClose ? price / lastPriorYearClose - 1 : null });

  const atrLatest = last(atr14) ?? null;
  const avg50 = last(volAvg50) ?? null;

  const start = Math.max(0, bars.length - chartPoints);
  const chart: TechnicalsChartPoint[] = bars.slice(start).map((b, j) => {
    const i = start + j;
    return {
      date: b.date,
      close: b.close,
      sma50: sma50[i],
      sma200: sma200[i],
      bbUpper: bb.upper[i],
      bbLower: bb.lower[i],
      rsi: rsi14[i],
      macd: m.line[i],
      macdSignal: m.signal[i],
      macdHistogram: m.histogram[i],
    };
  });

  return {
    asOf: latestBar.date,
    price,
    movingAverages: [
      { period: 20, type: "SMA", value: last(sma20) ?? null, pctFromPrice: pctDiff(last(sma20) ?? null, price) },
      { period: 50, type: "SMA", value: last(sma50) ?? null, pctFromPrice: pctDiff(last(sma50) ?? null, price) },
      { period: 200, type: "SMA", value: last(sma200) ?? null, pctFromPrice: pctDiff(last(sma200) ?? null, price) },
      { period: 12, type: "EMA", value: last(ema12) ?? null, pctFromPrice: pctDiff(last(ema12) ?? null, price) },
      { period: 26, type: "EMA", value: last(ema26) ?? null, pctFromPrice: pctDiff(last(ema26) ?? null, price) },
    ],
    rsi14: last(rsi14) ?? null,
    macd: {
      line: last(m.line) ?? null,
      signal: last(m.signal) ?? null,
      histogram: last(m.histogram) ?? null,
    },
    bollinger: { upper: bbUpper, middle: last(bb.middle) ?? null, lower: bbLower, percentB },
    atr14: atrLatest,
    atrPct: atrLatest !== null ? atrLatest / price : null,
    range52w: {
      high: high52,
      low: low52,
      pctFromHigh: price / high52 - 1,
      pctFromLow: price / low52 - 1,
    },
    volume: {
      latest: latestBar.volume,
      avg50,
      ratio: avg50 ? latestBar.volume / avg50 : null,
    },
    performance,
    chart,
  };
}
