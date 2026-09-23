import { describe, it, expect } from "vitest";
import { calculateReturns } from "./return-engine";
import { Holding } from "../types";
import { ITransaction } from "@/models/Transactions";

// NOTE ON TWR: the engine currently approximates historical market value with
// running net-invested cash at each external-flow boundary (see the comment in
// return-engine.ts). The TWR tests below assert that CURRENT documented
// behaviour, not the textbook-ideal TWR. Once daily portfolio valuations are
// available this approximation should be revisited and these tests rewritten.

const DAY_MS = 24 * 60 * 60 * 1000;
const YEAR_MS = 365 * DAY_MS;

/** A date `days` days in the past, so cash flows line up against the `new Date()`
 *  terminal value the engine appends. */
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

type TxInput = {
  symbol?: string | null;
  type: ITransaction["type"];
  quantity: number;
  pricePerUnit?: number;
  fees?: number;
  occurredAt: Date;
};

function tx(input: TxInput): ITransaction {
  return {
    symbol: input.symbol ?? null,
    type: input.type,
    quantity: input.quantity,
    pricePerUnit: input.pricePerUnit ?? 0,
    fees: input.fees ?? 0,
    currency: "USD",
    fxRateToBase: 1,
    occurredAt: input.occurredAt,
  } as unknown as ITransaction;
}

function holding(symbol: string, totalQuantity: number, totalCostBasis: number): Holding {
  return {
    symbol,
    lots: [{ quantity: totalQuantity, costPerUnit: totalCostBasis / totalQuantity, occurredAt: daysAgo(365) }],
    totalQuantity,
    totalCostBasis,
    avgCostPerUnit: totalCostBasis / totalQuantity,
    realizedPnl: 0,
  };
}

/** Independent re-implementation of the NPV the solver is supposed to zero out.
 *  Verifying the root beats hardcoding a magic number. */
function xnpv(rate: number, flows: { amount: number; occurredAt: Date }[]): number {
  const t0 = flows[0].occurredAt.getTime();
  return flows.reduce((sum, cf) => {
    const years = (cf.occurredAt.getTime() - t0) / YEAR_MS;
    return sum + cf.amount / Math.pow(1 + rate, years);
  }, 0);
}

describe("calculateReturns — MWR (XIRR)", () => {
  it("returns 10% for 1000 invested that is worth 1100 exactly one year later", () => {
    const transactions = [
      tx({ symbol: "AAPL", type: "BUY", quantity: 10, pricePerUnit: 100, occurredAt: daysAgo(365) }),
    ];
    const holdings = [holding("AAPL", 10, 1000)];

    const { mwr } = calculateReturns(transactions, holdings, { AAPL: 110 });

    expect(mwr).toBeCloseTo(0.1, 3);
  });

  it("finds a genuine NPV root for a multi-cashflow timeline", () => {
    const dates = [daysAgo(900), daysAgo(600), daysAgo(300), daysAgo(90)];
    const transactions = [
      tx({ type: "DEPOSIT", quantity: 5000, occurredAt: dates[0] }),
      tx({ symbol: "AAPL", type: "BUY", quantity: 20, pricePerUnit: 150, fees: 5, occurredAt: dates[1] }),
      tx({ symbol: "MSFT", type: "BUY", quantity: 10, pricePerUnit: 300, fees: 5, occurredAt: dates[2] }),
      tx({ symbol: "AAPL", type: "SELL", quantity: 5, pricePerUnit: 200, fees: 5, occurredAt: dates[3] }),
    ];
    const holdings = [holding("AAPL", 15, 2250), holding("MSFT", 10, 3000)];
    const prices = { AAPL: 220, MSFT: 340 };

    const { mwr } = calculateReturns(transactions, holdings, prices);

    expect(Number.isFinite(mwr)).toBe(true);
    expect(mwr).toBeGreaterThan(-1);
    expect(mwr).toBeLessThan(10);

    // Rebuild the same flow series and confirm the returned rate really zeroes the NPV.
    const flows = [
      { amount: -5000, occurredAt: dates[0] },
      { amount: -(20 * 150 + 5), occurredAt: dates[1] },
      { amount: -(10 * 300 + 5), occurredAt: dates[2] },
      { amount: 5 * 200 - 5, occurredAt: dates[3] },
      { amount: 15 * 220 + 10 * 340, occurredAt: new Date() },
    ];
    expect(Math.abs(xnpv(mwr, flows))).toBeLessThan(1e-3);
  });

  it("is negative when the portfolio is worth less than what went into it", () => {
    const transactions = [
      tx({ symbol: "AAPL", type: "BUY", quantity: 10, pricePerUnit: 100, occurredAt: daysAgo(365) }),
    ];
    const holdings = [holding("AAPL", 10, 1000)];

    const { mwr } = calculateReturns(transactions, holdings, { AAPL: 70 });

    expect(mwr).toBeLessThan(0);
    expect(mwr).toBeCloseTo(-0.3, 3);
  });

  it("returns 0 for an empty ledger instead of NaN", () => {
    const { mwr } = calculateReturns([], [], {});

    expect(mwr).toBe(0);
  });

  it("stays finite for a single transaction with no offsetting value", () => {
    const transactions = [
      tx({ type: "DEPOSIT", quantity: 1000, occurredAt: daysAgo(180) }),
    ];

    const { mwr } = calculateReturns(transactions, [], {});

    expect(Number.isFinite(mwr)).toBe(true);
  });

  it("falls back to 0 when all cash flows share a sign and no root exists", () => {
    const transactions = [
      tx({ type: "DEPOSIT", quantity: 1000, occurredAt: daysAgo(400) }),
      tx({ type: "DEPOSIT", quantity: 2000, occurredAt: daysAgo(200) }),
      tx({ type: "DEPOSIT", quantity: 500, occurredAt: daysAgo(30) }),
    ];

    // No holdings => terminal value 0, so every flow is negative: no sign change.
    const { mwr } = calculateReturns(transactions, [], {});

    expect(mwr).toBe(0);
  });

  it("terminates promptly on a large ledger rather than spinning in the solver", () => {
    const transactions = Array.from({ length: 200 }, (_, i) =>
      tx({ symbol: "AAPL", type: "BUY", quantity: 1, pricePerUnit: 100 + i, occurredAt: daysAgo(1000 - i * 4) }),
    );
    const holdings = [holding("AAPL", 200, 39900)];

    const started = Date.now();
    const { mwr } = calculateReturns(transactions, holdings, { AAPL: 250 });

    expect(Date.now() - started).toBeLessThan(1000);
    expect(Number.isFinite(mwr)).toBe(true);
  });
});

describe("calculateReturns — TWR (current approximation)", () => {
  it("falls back to market value over cost basis when no external flows are recorded", () => {
    const transactions = [
      tx({ symbol: "AAPL", type: "BUY", quantity: 10, pricePerUnit: 100, occurredAt: daysAgo(365) }),
    ];
    const holdings = [holding("AAPL", 10, 1000)];

    const { twr } = calculateReturns(transactions, holdings, { AAPL: 125 });

    expect(twr).toBeCloseTo(0.25, 10);
  });

  it("returns 0 with no transactions and no holdings", () => {
    expect(calculateReturns([], [], {}).twr).toBe(0);
  });

  it("chains the final live-priced sub-period off the last deposit", () => {
    const transactions = [
      tx({ type: "DEPOSIT", quantity: 1000, occurredAt: daysAgo(365) }),
      tx({ symbol: "AAPL", type: "BUY", quantity: 10, pricePerUnit: 100, occurredAt: daysAgo(364) }),
    ];
    const holdings = [holding("AAPL", 10, 1000)];

    const { twr } = calculateReturns(transactions, holdings, { AAPL: 120 });

    // Single deposit => one boundary (start value 1000) and one final period
    // measured against live value 1200: factor 1.2 - 1 = 0.2.
    expect(twr).toBeCloseTo(0.2, 10);
  });
});
