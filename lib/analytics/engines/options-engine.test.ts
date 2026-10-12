import { describe, it, expect } from "vitest";
import { summarizeChain, midPrice, type OptionContract } from "./options-engine";

function contract(strike: number, overrides: Partial<OptionContract> = {}): OptionContract {
  return {
    contractSymbol: `X${strike}`,
    strike,
    lastPrice: 1,
    bid: null,
    ask: null,
    change: null,
    percentChange: null,
    volume: 0,
    openInterest: 0,
    impliedVolatility: 0.3,
    inTheMoney: false,
    ...overrides,
  };
}

describe("midPrice", () => {
  it("uses the bid/ask midpoint, falling back to last trade", () => {
    expect(midPrice(contract(100, { bid: 2, ask: 3 }))).toBe(2.5);
    expect(midPrice(contract(100, { bid: 0, ask: 3, lastPrice: 1.2 }))).toBe(1.2);
  });
});

describe("summarizeChain", () => {
  const calls = [
    contract(90, { volume: 10, openInterest: 100, bid: 10, ask: 11 }),
    contract(100, { volume: 50, openInterest: 300, bid: 4, ask: 5, impliedVolatility: 0.4 }),
    contract(110, { volume: 40, openInterest: 600, bid: 1, ask: 1.5 }),
  ];
  const puts = [
    contract(90, { volume: 5, openInterest: 500, bid: 0.8, ask: 1 }),
    contract(100, { volume: 30, openInterest: 200, bid: 3, ask: 4, impliedVolatility: 0.5 }),
    contract(110, { volume: 15, openInterest: 50, bid: 10, ask: 11 }),
  ];

  it("totals volume and open interest and computes put/call ratios", () => {
    const s = summarizeChain(calls, puts, 101);
    expect(s.callVolume).toBe(100);
    expect(s.putVolume).toBe(50);
    expect(s.putCallVolumeRatio).toBe(0.5);
    expect(s.putCallOpenInterestRatio).toBeCloseTo(750 / 1000);
  });

  it("prices the implied move from the at-the-money straddle", () => {
    const s = summarizeChain(calls, puts, 101);
    expect(s.atmStrike).toBe(100);
    expect(s.atmImpliedVolatility).toBeCloseTo(0.45);
    expect(s.impliedMoveDollars).toBeCloseTo(4.5 + 3.5);
    expect(s.impliedMove).toBeCloseTo(8 / 101);
  });

  it("finds the max-pain strike", () => {
    // Payout to holders if settled at:
    //   90:  calls 0                       + puts (10·200 + 20·50) = 3000
    //   100: calls 10·100 = 1000           + puts 10·50 = 500      = 1500
    //   110: calls 20·100 + 10·300 = 5000  + puts 0                = 5000
    expect(summarizeChain(calls, puts, 101).maxPain).toBe(100);
  });

  it("degrades to nulls without an underlying price or open interest", () => {
    const s = summarizeChain([contract(100)], [contract(100)], null);
    expect(s.atmStrike).toBeNull();
    expect(s.impliedMove).toBeNull();
    expect(s.maxPain).toBeNull();
    expect(s.putCallVolumeRatio).toBeNull();
  });
});
