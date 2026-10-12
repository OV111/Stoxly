import { describe, it, expect } from "vitest";
import {
  sma,
  ema,
  rsi,
  macd,
  bollinger,
  atr,
  computeTechnicals,
  type DailyBar,
} from "./technicals-engine";

function bars(closes: number[], range = 2): DailyBar[] {
  const start = Date.UTC(2025, 0, 1);
  return closes.map((close, i) => ({
    date: new Date(start + i * 86_400_000).toISOString().slice(0, 10),
    open: close,
    high: close + range / 2,
    low: close - range / 2,
    close,
    volume: 1_000,
  }));
}

describe("sma", () => {
  it("averages a trailing window and is null until the window fills", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });
});

describe("ema", () => {
  it("seeds with the SMA, then applies the 2/(n+1) multiplier", () => {
    const out = ema([1, 2, 3, 4], 3);
    expect(out.slice(0, 2)).toEqual([null, null]);
    expect(out[2]).toBe(2); // SMA seed of 1,2,3
    expect(out[3]).toBeCloseTo(4 * 0.5 + 2 * 0.5); // k = 0.5
  });
});

describe("rsi", () => {
  it("is 100 for a series that only rises and 0 for one that only falls", () => {
    const up = Array.from({ length: 30 }, (_, i) => 100 + i);
    const down = Array.from({ length: 30 }, (_, i) => 100 - i);
    expect(rsi(up, 14)[29]).toBe(100);
    expect(rsi(down, 14)[29]).toBe(0);
  });

  it("is 50 when average gains equal average losses", () => {
    const zigzag = Array.from({ length: 15 }, (_, i) => (i % 2 === 0 ? 100 : 101));
    expect(rsi(zigzag, 14)[14]).toBeCloseTo(50);
  });

  it("is null before period + 1 values", () => {
    expect(rsi([1, 2, 3], 14)).toEqual([null, null, null]);
  });
});

describe("macd", () => {
  it("is zero everywhere it is defined for a flat series", () => {
    const flat = new Array(60).fill(50);
    const { line, signal, histogram } = macd(flat);
    expect(line[25]).toBe(0);
    expect(line[24]).toBeNull(); // slow EMA not seeded yet
    expect(signal[33]).toBe(0); // 26 + 9 − 2
    expect(signal[32]).toBeNull();
    expect(histogram[59]).toBe(0);
  });
});

describe("bollinger", () => {
  it("collapses to the mean for a flat series", () => {
    const { upper, middle, lower } = bollinger(new Array(25).fill(10), 20, 2);
    expect([upper[24], middle[24], lower[24]]).toEqual([10, 10, 10]);
  });

  it("uses population standard deviation", () => {
    // Values 1..4: mean 2.5, population SD √1.25.
    const { upper } = bollinger([1, 2, 3, 4], 4, 1);
    expect(upper[3]).toBeCloseTo(2.5 + Math.sqrt(1.25));
  });
});

describe("atr", () => {
  it("equals the bar range when there are no gaps", () => {
    const out = atr(bars(new Array(20).fill(100), 4), 14);
    expect(out[13]).toBeNull();
    expect(out[14]).toBe(4);
    expect(out[19]).toBe(4);
  });
});

describe("computeTechnicals", () => {
  it("returns null for fewer than 30 bars", () => {
    expect(computeTechnicals(bars(new Array(29).fill(100)))).toBeNull();
  });

  it("reports price relative to averages, 52-week range, and lookback performance", () => {
    const closes = Array.from({ length: 300 }, (_, i) => 100 + i); // steady uptrend
    const t = computeTechnicals(bars(closes, 2))!;

    expect(t.price).toBe(399);
    const sma50 = t.movingAverages.find((m) => m.type === "SMA" && m.period === 50)!;
    expect(sma50.value).toBeCloseTo(374.5); // mean of 350..399
    expect(sma50.pctFromPrice).toBeCloseTo(399 / 374.5 - 1);

    expect(t.rsi14).toBe(100);
    expect(t.range52w.high).toBe(400); // 399 + range/2
    expect(t.range52w.pctFromHigh).toBeCloseTo(399 / 400 - 1);

    const oneWeek = t.performance.find((p) => p.key === "1W")!;
    expect(oneWeek.value).toBeCloseTo(399 / 394 - 1);
    expect(t.volume.ratio).toBe(1);
    expect(t.chart).toHaveLength(252);
    expect(t.chart.at(-1)!.close).toBe(399);
  });

  it("leaves the 200-day average null when history is too short", () => {
    const t = computeTechnicals(bars(Array.from({ length: 120 }, (_, i) => 100 + (i % 5))))!;
    expect(t.movingAverages.find((m) => m.period === 200)!.value).toBeNull();
    expect(t.performance.find((p) => p.key === "1Y")!.value).toBeNull();
  });
});
