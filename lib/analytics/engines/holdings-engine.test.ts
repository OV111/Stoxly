import { describe, it, expect } from "vitest";
import { buildHoldings } from "./holdings-engine";
import { ITransaction } from "@/models/Transactions";

// The engine only ever reads its Decimal128 fields through `Number(x.toString())`,
// so plain JS numbers are a faithful stand-in for Decimal128 in fixtures.
type TxInput = {
  symbol: string | null;
  type: ITransaction["type"];
  quantity: number;
  pricePerUnit?: number;
  fees?: number;
  occurredAt: string;
};

function tx(input: TxInput): ITransaction {
  return {
    symbol: input.symbol,
    type: input.type,
    quantity: input.quantity,
    pricePerUnit: input.pricePerUnit ?? 0,
    fees: input.fees ?? 0,
    currency: "USD",
    fxRateToBase: 1,
    occurredAt: new Date(input.occurredAt),
  } as unknown as ITransaction;
}

const buy = (symbol: string, quantity: number, pricePerUnit: number, occurredAt: string) =>
  tx({ symbol, type: "BUY", quantity, pricePerUnit, occurredAt });

const sell = (symbol: string, quantity: number, pricePerUnit: number, occurredAt: string) =>
  tx({ symbol, type: "SELL", quantity, pricePerUnit, occurredAt });

const split = (symbol: string, ratio: number, occurredAt: string) =>
  tx({ symbol, type: "SPLIT", quantity: ratio, occurredAt });

describe("buildHoldings", () => {
  it("turns a single BUY into one lot with matching quantity and cost basis", () => {
    const [holding] = buildHoldings([buy("AAPL", 10, 100, "2024-01-01")]);

    expect(holding.symbol).toBe("AAPL");
    expect(holding.totalQuantity).toBe(10);
    expect(holding.totalCostBasis).toBe(1000);
    expect(holding.avgCostPerUnit).toBe(100);
    expect(holding.realizedPnl).toBe(0);
  });

  it("weights the average cost across multiple BUYs at different prices", () => {
    const [holding] = buildHoldings([
      buy("AAPL", 10, 100, "2024-01-01"),
      buy("AAPL", 30, 200, "2024-02-01"),
    ]);

    // (10 * 100 + 30 * 200) / 40 = 7000 / 40 = 175
    expect(holding.totalQuantity).toBe(40);
    expect(holding.totalCostBasis).toBe(7000);
    expect(holding.avgCostPerUnit).toBe(175);
  });

  it("uses the oldest lot's cost basis when selling FIFO, not the average", () => {
    const [holding] = buildHoldings([
      buy("AAPL", 10, 100, "2024-01-01"),
      buy("AAPL", 10, 200, "2024-02-01"),
      sell("AAPL", 5, 300, "2024-03-01"),
    ]);

    // FIFO consumes the $100 lot: (300 - 100) * 5 = 1000.
    // Average-cost accounting would have given (300 - 150) * 5 = 750.
    expect(holding.realizedPnl).toBe(1000);
    expect(holding.lots).toHaveLength(2);
    expect(holding.lots[0]).toMatchObject({ quantity: 5, costPerUnit: 100 });
    expect(holding.totalQuantity).toBe(15);
    expect(holding.totalCostBasis).toBe(5 * 100 + 10 * 200);
  });

  it("sums realized P&L across every lot a single SELL spans", () => {
    const [holding] = buildHoldings([
      buy("AAPL", 10, 100, "2024-01-01"),
      buy("AAPL", 10, 200, "2024-02-01"),
      sell("AAPL", 15, 300, "2024-03-01"),
    ]);

    // 10 units from the $100 lot + 5 units from the $200 lot.
    expect(holding.realizedPnl).toBe((300 - 100) * 10 + (300 - 200) * 5);
    expect(holding.lots).toHaveLength(1);
    expect(holding.lots[0]).toMatchObject({ quantity: 5, costPerUnit: 200 });
  });

  it("drops a symbol from the result once the whole position is sold", () => {
    const holdings = buildHoldings([
      buy("AAPL", 10, 100, "2024-01-01"),
      sell("AAPL", 10, 150, "2024-02-01"),
    ]);

    expect(holdings).toHaveLength(0);
  });

  // Regression test for a fixed float-dust bug: the engine used to close lots
  // with `lot.quantity === 0`, so 0.1 + 0.2 - 0.3 left 2.78e-17 behind and a
  // fully-sold fractional position stayed visible as an open holding. The
  // engine now closes and filters on QUANTITY_EPSILON instead.
  it("closes a fractional position completely when the full quantity is sold", () => {
    const holdings = buildHoldings([
      buy("AAPL", 0.1, 100, "2024-01-01"),
      buy("AAPL", 0.2, 100, "2024-01-02"),
      sell("AAPL", 0.3, 150, "2024-02-01"),
    ]);

    expect(holdings).toHaveLength(0);
  });

  it("quadruples quantity and quarters cost per unit on a 4:1 SPLIT, leaving cost basis unchanged", () => {
    const [holding] = buildHoldings([
      buy("AAPL", 10, 100, "2024-01-01"),
      buy("AAPL", 20, 400, "2024-02-01"),
      split("AAPL", 4, "2024-03-01"),
    ]);

    expect(holding.totalQuantity).toBe(120); // (10 + 20) * 4
    expect(holding.lots[0]).toMatchObject({ quantity: 40, costPerUnit: 25 });
    expect(holding.lots[1]).toMatchObject({ quantity: 80, costPerUnit: 100 });
    // The whole point of a split: it never changes what you actually paid.
    expect(holding.totalCostBasis).toBeCloseTo(9000, 8);
    expect(holding.avgCostPerUnit).toBeCloseTo(75, 8);
  });

  it("keeps FIFO ordering on split-adjusted lots when selling after a SPLIT", () => {
    const [holding] = buildHoldings([
      buy("AAPL", 10, 100, "2024-01-01"),
      buy("AAPL", 10, 200, "2024-02-01"),
      split("AAPL", 2, "2024-03-01"),
      sell("AAPL", 20, 150, "2024-04-01"),
    ]);

    // After the 2:1 split the lots are 20 @ $50 and 20 @ $100.
    // The sell consumes the whole first (oldest) lot at $50.
    expect(holding.realizedPnl).toBe((150 - 50) * 20);
    expect(holding.lots).toHaveLength(1);
    expect(holding.lots[0]).toMatchObject({ quantity: 20, costPerUnit: 100 });
    expect(holding.totalCostBasis).toBe(2000);
  });

  it("ignores DEPOSIT and WITHDRAWAL rows, which carry no symbol", () => {
    const holdings = buildHoldings([
      tx({ symbol: null, type: "DEPOSIT", quantity: 5000, occurredAt: "2024-01-01" }),
      buy("AAPL", 10, 100, "2024-01-02"),
      tx({ symbol: null, type: "WITHDRAWAL", quantity: 1000, occurredAt: "2024-01-03" }),
    ]);

    expect(holdings).toHaveLength(1);
    expect(holdings[0]).toMatchObject({ symbol: "AAPL", totalQuantity: 10, totalCostBasis: 1000 });
  });

  it("leaves quantity and cost basis untouched on a DIVIDEND", () => {
    const [holding] = buildHoldings([
      buy("AAPL", 10, 100, "2024-01-01"),
      tx({ symbol: "AAPL", type: "DIVIDEND", quantity: 10, pricePerUnit: 2, occurredAt: "2024-02-01" }),
    ]);

    expect(holding.totalQuantity).toBe(10);
    expect(holding.totalCostBasis).toBe(1000);
    expect(holding.realizedPnl).toBe(0);
    expect(holding.lots).toHaveLength(1);
  });

  it("replays a backdated ledger identically to a chronological one", () => {
    const chronological = [
      buy("AAPL", 10, 100, "2024-01-01"),
      buy("AAPL", 10, 200, "2024-02-01"),
      split("AAPL", 2, "2024-03-01"),
      sell("AAPL", 15, 150, "2024-04-01"),
    ];
    const shuffled = [
      chronological[3],
      chronological[1],
      chronological[0],
      chronological[2],
    ];

    expect(buildHoldings(shuffled)).toEqual(buildHoldings(chronological));
  });

  it("keeps positions in different symbols independent", () => {
    const holdings = buildHoldings([
      buy("AAPL", 10, 100, "2024-01-01"),
      buy("MSFT", 5, 300, "2024-01-02"),
      sell("AAPL", 4, 150, "2024-02-01"),
    ]);

    const bySymbol = Object.fromEntries(holdings.map((h) => [h.symbol, h]));
    expect(bySymbol.AAPL).toMatchObject({ totalQuantity: 6, realizedPnl: 200 });
    expect(bySymbol.MSFT).toMatchObject({ totalQuantity: 5, realizedPnl: 0 });
  });
});
