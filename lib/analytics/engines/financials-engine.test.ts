import { describe, it, expect } from "vitest";
import { parseCompanyFacts, type CompanyFacts, type XbrlFact } from "./financials-engine";

// Fiscal year Sep 29 2024 → Sep 27 2025 (a 52-week year), quarters ending
// Dec 28, Mar 29, Jun 28, Sep 27 — the shape of a real Apple filing.
const FY_START = "2024-09-29";
const Q1_END = "2024-12-28";
const Q2_END = "2025-03-29";
const Q3_END = "2025-06-28";
const FY_END = "2025-09-27";

const flow = (start: string, end: string, val: number, form = "10-Q", filed = "2025-11-01"): XbrlFact => ({
  start,
  end,
  val,
  form,
  filed,
});
const instant = (end: string, val: number, form = "10-Q", filed = "2025-11-01"): XbrlFact => ({
  end,
  val,
  form,
  filed,
});

function facts(gaap: Record<string, Record<string, XbrlFact[]>>): CompanyFacts {
  return {
    entityName: "Test Co",
    facts: {
      "us-gaap": Object.fromEntries(
        Object.entries(gaap).map(([concept, units]) => [concept, { units }]),
      ),
    },
  };
}

describe("parseCompanyFacts", () => {
  it("returns null when there are no usable facts", () => {
    expect(parseCompanyFacts({ facts: {} })).toBeNull();
  });

  it("keeps directly reported quarters and derives Q3/Q4 from YTD values", () => {
    const result = parseCompanyFacts(
      facts({
        RevenueFromContractWithCustomerExcludingAssessedTax: {
          USD: [
            flow(FY_START, Q1_END, 120), // Q1 (3M)
            flow(FY_START, Q2_END, 215), // 6M YTD
            flow(Q1_END, Q2_END, 95), // Q2 reported discretely
            flow(FY_START, Q3_END, 300), // 9M YTD — Q3 only implied
            flow(FY_START, FY_END, 400, "10-K"), // FY — Q4 only implied
          ],
        },
      }),
    )!;

    expect(result.annual.map((p) => [p.label, p.values.revenue])).toEqual([["FY2025", 400]]);
    expect(result.quarterly.map((p) => [p.end, p.values.revenue])).toEqual([
      [Q1_END, 120],
      [Q2_END, 95],
      [Q3_END, 85], // 300 − 215
      [FY_END, 100], // 400 − 300
    ]);
    expect(result.quarterly.map((p) => p.label)).toEqual(["Dec 2024", "Mar 2025", "Jun 2025", "Sep 2025"]);
  });

  it("prefers the most recently filed value when a period is restated", () => {
    const result = parseCompanyFacts(
      facts({
        NetIncomeLoss: {
          USD: [
            flow(FY_START, FY_END, 90, "10-K", "2025-11-01"),
            flow(FY_START, FY_END, 95, "10-K", "2026-11-01"), // restated in next year's 10-K
          ],
        },
      }),
    )!;
    expect(result.annual[0].values.netIncome).toBe(95);
  });

  it("merges concepts by priority across a concept switch", () => {
    const result = parseCompanyFacts(
      facts({
        RevenueFromContractWithCustomerExcludingAssessedTax: {
          USD: [flow(FY_START, FY_END, 400, "10-K")],
        },
        SalesRevenueNet: {
          USD: [
            flow("2017-10-01", "2018-09-29", 265, "10-K"),
            flow(FY_START, FY_END, 1, "10-K"), // lower priority — must not override
          ],
        },
      }),
    )!;
    expect(result.annual.map((p) => [p.label, p.values.revenue])).toEqual([
      ["FY2018", 265],
      ["FY2025", 400],
    ]);
  });

  it("does not derive quarters for non-additive per-share metrics", () => {
    const result = parseCompanyFacts(
      facts({
        NetIncomeLoss: { USD: [flow(FY_START, Q3_END, 30), flow(FY_START, FY_END, 40, "10-K")] },
        EarningsPerShareDiluted: {
          "USD/shares": [flow(FY_START, Q3_END, 3.0), flow(FY_START, FY_END, 4.1, "10-K")],
        },
      }),
    )!;
    const q4 = result.quarterly.find((p) => p.end === FY_END)!;
    expect(q4.values.netIncome).toBe(10);
    expect(q4.values.epsDiluted).toBeNull(); // 4.1 − 3.0 would be meaningless
    expect(result.annual[0].values.epsDiluted).toBe(4.1);
  });

  it("aligns balance-sheet instants to period ends and uses only annual forms for annual columns", () => {
    const result = parseCompanyFacts(
      facts({
        NetIncomeLoss: {
          USD: [flow(Q2_END, Q3_END, 20), flow(FY_START, FY_END, 80, "10-K")],
        },
        Assets: { USD: [instant(Q3_END, 500), instant(FY_END, 550, "10-K")] },
      }),
    )!;
    expect(result.annual[0].values.totalAssets).toBe(550);
    expect(result.quarterly.find((p) => p.end === Q3_END)!.values.totalAssets).toBe(500);
  });

  it("derives gross profit and free cash flow when not reported directly", () => {
    const result = parseCompanyFacts(
      facts({
        Revenues: { USD: [flow(FY_START, FY_END, 400, "10-K")] },
        CostOfRevenue: { USD: [flow(FY_START, FY_END, 250, "10-K")] },
        NetCashProvidedByUsedInOperatingActivities: { USD: [flow(FY_START, FY_END, 120, "10-K")] },
        PaymentsToAcquirePropertyPlantAndEquipment: { USD: [flow(FY_START, FY_END, 20, "10-K")] },
      }),
    )!;
    expect(result.annual[0].values.grossProfit).toBe(150);
    expect(result.annual[0].values.freeCashFlow).toBe(100);
  });

  it("limits to the most recent periods", () => {
    const years = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
    const result = parseCompanyFacts(
      facts({
        Revenues: { USD: years.map((y) => flow(`${y - 1}-10-01`, `${y}-09-30`, y, "10-K")) },
      }),
      { annualLimit: 3 },
    )!;
    expect(result.annual.map((p) => p.label)).toEqual(["FY2023", "FY2024", "FY2025"]);
  });
});
