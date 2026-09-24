import { describe, it, expect, vi, beforeEach } from "vitest";
import { Holding } from "../types";

// risk-engine reads daily closes from the PriceBar collection. Mock the model so
// the math is tested in isolation: `barsBySymbol` is what each query "returns".
const barsBySymbol = new Map<string, { timestamp: Date; close: number }[]>();

vi.mock("@/models/PriceBar", () => ({
  default: {
    find: ({ symbol }: { symbol: string }) => ({
      sort: () => ({ lean: async () => barsBySymbol.get(symbol) ?? [] }),
    }),
  },
}));

const { calculateRiskMetrics } = await import("./risk-engine");

const DAY_MS = 24 * 60 * 60 * 1000;

/** Store a close series ending yesterday, one bar per calendar day. */
function setCloses(symbol: string, closes: number[]) {
  const start = Date.now() - closes.length * DAY_MS;
  barsBySymbol.set(
    symbol,
    closes.map((close, i) => ({ timestamp: new Date(start + i * DAY_MS), close })),
  );
}

/** Compound a list of daily returns into a close series starting at 100. */
function closesFromReturns(returns: number[]): number[] {
  const closes = [100];
  for (const r of returns) closes.push(closes[closes.length - 1] * (1 + r));
  return closes;
}

function holding(symbol: string, totalQuantity: number): Holding {
  return {
    symbol,
    lots: [],
    totalQuantity,
    totalCostBasis: 0,
    avgCostPerUnit: 0,
    realizedPnl: 0,
  };
}

// 30 alternating daily returns: enough history (engine needs >= 20 overlapping days).
const spyReturns = Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 0.01 : -0.005));

describe("calculateRiskMetrics", () => {
  beforeEach(() => barsBySymbol.clear());

  it("returns null when there are no open holdings", async () => {
    expect(await calculateRiskMetrics([holding("AAPL", 0)], { AAPL: 100 })).toBeNull();
  });

  it("returns null when price history is too short to be meaningful", async () => {
    setCloses("AAPL", closesFromReturns(spyReturns.slice(0, 10)));
    setCloses("SPY", closesFromReturns(spyReturns.slice(0, 10)));
    expect(await calculateRiskMetrics([holding("AAPL", 1)], { AAPL: 100 })).toBeNull();
  });

  it("gives beta 1 for a portfolio that moves exactly like the benchmark", async () => {
    setCloses("AAPL", closesFromReturns(spyReturns));
    setCloses("SPY", closesFromReturns(spyReturns));

    const metrics = await calculateRiskMetrics([holding("AAPL", 1)], { AAPL: 100 });
    expect(metrics!.beta).toBeCloseTo(1, 6);
    expect(metrics!.correlationMatrix.AAPL.AAPL).toBe(1);
  });

  it("gives beta 2 for a portfolio with twice the benchmark's daily moves", async () => {
    setCloses("TQQQ", closesFromReturns(spyReturns.map((r) => r * 2)));
    setCloses("SPY", closesFromReturns(spyReturns));

    const metrics = await calculateRiskMetrics([holding("TQQQ", 1)], { TQQQ: 50 });
    expect(metrics!.beta).toBeCloseTo(2, 6);
  });

  it("measures max drawdown as the worst peak-to-trough fall", async () => {
    // Rise 20% to a peak of 120, then fall to 90: a (90 - 120) / 120 = -25% drawdown.
    const closes = [100, 110, 120, 105, 90, ...Array.from({ length: 20 }, () => 95)];
    setCloses("AAPL", closes);
    setCloses("SPY", closesFromReturns(spyReturns));

    const metrics = await calculateRiskMetrics([holding("AAPL", 1)], { AAPL: 95 });
    expect(metrics!.maxDrawdown).toBeCloseTo(-0.25, 6);
  });

  it("computes pairwise correlation between holdings", async () => {
    setCloses("AAPL", closesFromReturns(spyReturns));
    setCloses("INV", closesFromReturns(spyReturns.map((r) => -r))); // perfect mirror
    setCloses("SPY", closesFromReturns(spyReturns));

    const metrics = await calculateRiskMetrics(
      [holding("AAPL", 1), holding("INV", 1)],
      { AAPL: 100, INV: 100 },
    );
    expect(metrics!.correlationMatrix.AAPL.INV).toBeCloseTo(-1, 6);
  });
});
