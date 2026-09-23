import { ITransaction } from "@/models/Transactions";
import { CashFlow, Holding, ReturnMetrics } from "../types";

// TWR: split the timeline at every external cash flow (DEPOSIT/WITHDRAWAL only —
// buys/sells are internal reallocations), compute each sub-period's simple return
// (endValue - startValue - netFlow) / startValue, then geometrically chain them.
// XIRR (MWR): find the rate r solving sum(CF_i / (1+r)^(t_i/365)) = 0 via
// Newton-Raphson, falling back to bisection over a sign-changing bracket if it
// fails to converge.

function decimalToNumber(value: { toString(): string }): number {
  return Number(value.toString());
}

function portfolioValue(holdings: Holding[], currentPrices: Record<string, number>): number {
  return holdings.reduce((sum, h) => {
    const price = currentPrices[h.symbol] ?? 0;
    return sum + h.totalQuantity * price;
  }, 0);
}

interface TimelineEvent {
  occurredAt: Date;
  type: ITransaction["type"];
  amount: number; // signed cash impact; positive = cash into portfolio's position value context
}

function buildTimeline(transactions: ITransaction[]): TimelineEvent[] {
  return [...transactions]
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
    .map((tx) => {
      const quantity = decimalToNumber(tx.quantity);
      const pricePerUnit = decimalToNumber(tx.pricePerUnit);
      const fees = decimalToNumber(tx.fees);
      const fxRate = decimalToNumber(tx.fxRateToBase);

      let amount = 0;
      switch (tx.type) {
        case "DEPOSIT":
          amount = quantity * fxRate; // deposits store the cash amount in `quantity`
          break;
        case "WITHDRAWAL":
          amount = -quantity * fxRate;
          break;
        case "BUY":
          amount = -(quantity * pricePerUnit + fees) * fxRate;
          break;
        case "SELL":
          amount = (quantity * pricePerUnit - fees) * fxRate;
          break;
        case "DIVIDEND":
          amount = quantity * pricePerUnit * fxRate;
          break;
        case "SPLIT":
          amount = 0;
          break;
      }

      return { occurredAt: tx.occurredAt, type: tx.type, amount };
    });
}

// --- TWR ---

function calculateTWR(
  transactions: ITransaction[],
  holdings: Holding[],
  currentPrices: Record<string, number>,
): number {
  const timeline = buildTimeline(transactions);
  const externalFlows = timeline.filter(
    (e) => e.type === "DEPOSIT" || e.type === "WITHDRAWAL",
  );

  if (externalFlows.length === 0) {
    // No external cash flows recorded — TWR degenerates to the simple return
    // of market value over total cost basis (nothing to strip out).
    const endValue = portfolioValue(holdings, currentPrices);
    const totalCostBasis = holdings.reduce((sum, h) => sum + h.totalCostBasis, 0);
    return totalCostBasis > 0 ? (endValue - totalCostBasis) / totalCostBasis : 0;
  }

  // Approximate each sub-period's start/end value using running net-invested
  // cash (deposits - withdrawals) as a stand-in for market value at flow
  // boundaries when historical prices aren't available; the final period's end
  // value uses live prices.
  let cumulativeNetFlow = 0;
  let periodStartValue = 0;
  let twrFactor = 1;

  for (let i = 0; i < externalFlows.length; i++) {
    const flow = externalFlows[i];
    const periodEndValue = cumulativeNetFlow; // value just before this flow is applied
    if (periodStartValue > 0) {
      const netFlowThisPeriod = 0; // no intermediate flows between boundaries by construction
      const r = (periodEndValue - periodStartValue - netFlowThisPeriod) / periodStartValue;
      twrFactor *= 1 + r;
    }
    cumulativeNetFlow += flow.amount;
    periodStartValue = cumulativeNetFlow;
  }

  // Final sub-period: from the last external flow to now, using live market value.
  const endValue = portfolioValue(holdings, currentPrices);
  if (periodStartValue > 0) {
    const r = (endValue - periodStartValue) / periodStartValue;
    twrFactor *= 1 + r;
  }

  return twrFactor - 1;
}

// --- XIRR (MWR) ---

function xnpv(rate: number, flows: CashFlow[], t0: number): number {
  return flows.reduce((sum, cf) => {
    const years = (cf.occurredAt.getTime() - t0) / (365 * 24 * 60 * 60 * 1000);
    return sum + cf.amount / Math.pow(1 + rate, years);
  }, 0);
}

function xnpvDerivative(rate: number, flows: CashFlow[], t0: number): number {
  return flows.reduce((sum, cf) => {
    const years = (cf.occurredAt.getTime() - t0) / (365 * 24 * 60 * 60 * 1000);
    if (years === 0) return sum;
    return sum - (years * cf.amount) / Math.pow(1 + rate, years + 1);
  }, 0);
}

function newtonRaphsonXIRR(flows: CashFlow[], t0: number): number | null {
  let rate = 0.1;
  const maxIterations = 100;
  const tolerance = 1e-7;

  for (let i = 0; i < maxIterations; i++) {
    const npv = xnpv(rate, flows, t0);
    if (Math.abs(npv) < tolerance) return rate;

    const derivative = xnpvDerivative(rate, flows, t0);
    if (derivative === 0) return null; // avoid divide-by-zero; let bisection take over

    const nextRate = rate - npv / derivative;
    if (!Number.isFinite(nextRate) || nextRate <= -1) return null;

    rate = nextRate;
  }

  return null; // failed to converge within maxIterations
}

function bisectionXIRR(flows: CashFlow[], t0: number): number {
  let low = -0.9999; // rate must stay above -100%
  let high = 10; // 1000% — generous upper bound

  let npvLow = xnpv(low, flows, t0);
  let npvHigh = xnpv(high, flows, t0);

  // Widen the bracket if we don't yet have a sign change.
  let attempts = 0;
  while (npvLow * npvHigh > 0 && attempts < 50) {
    high *= 2;
    npvHigh = xnpv(high, flows, t0);
    attempts++;
  }

  if (npvLow * npvHigh > 0) {
    // No sign change found — cash flows don't bracket a real root
    // (e.g. all same sign). Fall back to 0 as a neutral result.
    return 0;
  }

  const maxIterations = 200;
  const tolerance = 1e-7;

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const npvMid = xnpv(mid, flows, t0);

    if (Math.abs(npvMid) < tolerance || (high - low) / 2 < tolerance) {
      return mid;
    }

    if (npvLow * npvMid < 0) {
      high = mid;
      npvHigh = npvMid;
    } else {
      low = mid;
      npvLow = npvMid;
    }
  }

  return (low + high) / 2;
}

function calculateXIRR(
  transactions: ITransaction[],
  holdings: Holding[],
  currentPrices: Record<string, number>,
): number {
  const timeline = buildTimeline(transactions);

  // Cash-flow sign convention: money leaving the investor's pocket (deposits,
  // buys) is negative; money returning to the investor (withdrawals, sells,
  // dividends) is positive. buildTimeline already encodes this except deposits
  // need flipping (deposits are +amount as "into portfolio" but negative from
  // the investor's cash-flow perspective).
  const flows: CashFlow[] = timeline
    .filter((e) => e.type !== "SPLIT")
    .map((e) => {
      let amount = e.amount;
      if (e.type === "DEPOSIT") amount = -Math.abs(amount);
      if (e.type === "WITHDRAWAL") amount = Math.abs(amount);
      // BUY/SELL/DIVIDEND already have correct sign from buildTimeline
      return { amount, occurredAt: e.occurredAt };
    });

  const endValue = portfolioValue(holdings, currentPrices);
  const now = new Date();
  flows.push({ amount: endValue, occurredAt: now });

  if (flows.length < 2) return 0;

  const t0 = flows[0].occurredAt.getTime();

  const newtonResult = newtonRaphsonXIRR(flows, t0);
  if (newtonResult !== null) return newtonResult;

  return bisectionXIRR(flows, t0);
}

export function calculateReturns(
  transactions: ITransaction[],
  holdings: Holding[],
  currentPrices: Record<string, number>,
): ReturnMetrics {
  return {
    twr: calculateTWR(transactions, holdings, currentPrices),
    mwr: calculateXIRR(transactions, holdings, currentPrices),
  };
}
