import { describe, it, expect } from "vitest";
import { computeLedger, computePositions } from "./index";
import type { Transaction } from "./types";

let seq = 0;
function tx(fields: Omit<Transaction, "id" | "accountId">): Transaction {
  seq += 1;
  return { id: `t${seq}`, accountId: "acc", ...fields };
}

const buy = (symbol: string, date: string, shares: number, price: number) =>
  tx({ type: "BUY", symbol, date: new Date(date), shares, price });
const sell = (symbol: string, date: string, shares: number, price: number) =>
  tx({ type: "SELL", symbol, date: new Date(date), shares, price });

describe("computeLedger", () => {
  it("FIFO sells the oldest lot first", () => {
    const state = computeLedger([
      buy("AAPL", "2024-01-01", 10, 100),
      buy("AAPL", "2024-02-01", 10, 150),
      sell("AAPL", "2024-03-01", 10, 200),
    ]);

    expect(state.realizedGains).toHaveLength(1);
    expect(state.realizedGains[0].pnl).toBe(1000); // (200 - 100) * 10
    expect(state.lots).toHaveLength(1);
    expect(state.lots[0].costPerShare).toBe(150);
  });

  it("LIFO sells the newest lot first", () => {
    const state = computeLedger(
      [
        buy("AAPL", "2024-01-01", 10, 100),
        buy("AAPL", "2024-02-01", 10, 150),
        sell("AAPL", "2024-03-01", 10, 200),
      ],
      "LIFO",
    );

    expect(state.realizedGains[0].pnl).toBe(500); // (200 - 150) * 10
    expect(state.lots[0].costPerShare).toBe(100);
  });

  it("splits a sell across lots and keeps the partial remainder", () => {
    const state = computeLedger([
      buy("AAPL", "2024-01-01", 5, 100),
      buy("AAPL", "2024-02-01", 5, 120),
      sell("AAPL", "2024-03-01", 7, 130),
    ]);

    expect(state.realizedGains.map((g) => g.shares)).toEqual([5, 2]);
    expect(state.lots).toEqual([expect.objectContaining({ shares: 3, costPerShare: 120 })]);
  });

  it("replays transactions in date order, regardless of input order", () => {
    const state = computeLedger([
      sell("AAPL", "2024-03-01", 10, 200),
      buy("AAPL", "2024-01-01", 10, 100),
    ]);

    expect(state.realizedGains[0].pnl).toBe(1000);
  });

  it("throws on overselling instead of going short silently", () => {
    expect(() =>
      computeLedger([buy("AAPL", "2024-01-01", 5, 100), sell("AAPL", "2024-02-01", 6, 100)]),
    ).toThrow(/Oversell/);
  });

  it("only sells lots of the matching symbol", () => {
    const state = computeLedger([
      buy("MSFT", "2024-01-01", 10, 300),
      buy("AAPL", "2024-02-01", 10, 100),
      sell("AAPL", "2024-03-01", 10, 110),
    ]);

    expect(state.lots).toEqual([expect.objectContaining({ symbol: "MSFT", shares: 10 })]);
  });

  it("a split multiplies shares and divides cost, preserving total cost basis", () => {
    const state = computeLedger([
      buy("NVDA", "2024-01-01", 10, 400),
      tx({ type: "SPLIT", symbol: "NVDA", date: new Date("2024-06-01"), splitRatio: 4 }),
    ]);

    expect(state.lots[0].shares).toBe(40);
    expect(state.lots[0].costPerShare).toBe(100);
    expect(state.lots[0].originalCostPerShare).toBe(400);
  });

  it("classifies holding term: under a year SHORT, a year or more LONG", () => {
    const state = computeLedger([
      buy("AAPL", "2023-01-01", 10, 100),
      buy("AAPL", "2024-01-01", 10, 100),
      sell("AAPL", "2024-06-01", 20, 120),
    ]);

    expect(state.realizedGains.map((g) => g.term)).toEqual(["LONG", "SHORT"]);
  });

  it("records a dividend as realized income without touching lots", () => {
    const state = computeLedger([
      buy("KO", "2024-01-01", 10, 60),
      tx({ type: "DIVIDEND", symbol: "KO", date: new Date("2024-04-01"), cashAmount: 4.6 }),
    ]);

    expect(state.realizedGains).toEqual([expect.objectContaining({ type: "DIVIDEND", pnl: 4.6 })]);
    expect(state.lots[0].shares).toBe(10);
  });
});

describe("computePositions", () => {
  it("aggregates open lots into a position with unrealized P&L", () => {
    const state = computeLedger([
      buy("AAPL", "2024-01-01", 10, 100),
      buy("AAPL", "2024-02-01", 10, 200),
    ]);

    const [position] = computePositions(state, { AAPL: 180 });

    expect(position.totalShares).toBe(20);
    expect(position.avgCostBasis).toBe(150);
    expect(position.marketValue).toBe(3600);
    expect(position.unrealizedPnL).toBe(600);
    expect(position.unrealizedPnLPct).toBe(20);
  });

  it("drops fully closed positions", () => {
    const state = computeLedger([
      buy("AAPL", "2024-01-01", 10, 100),
      sell("AAPL", "2024-02-01", 10, 120),
    ]);

    expect(computePositions(state, { AAPL: 130 })).toEqual([]);
  });
});
