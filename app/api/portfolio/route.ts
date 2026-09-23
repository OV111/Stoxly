import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getCurrentUser } from "@/lib/getCurrentUser";
import Transaction from "@/models/Transactions";
import { buildHoldings } from "@/lib/analytics/engines/holdings-engine";
import { calculateReturns } from "@/lib/analytics/engines/return-engine";
import { calculateRiskMetrics } from "@/lib/analytics/engines/risk-engine";
import { fetchQuotes } from "@/lib/finnhub";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const transactions = await Transaction.find({ userId: user.id });
    const holdings = buildHoldings(transactions);

    const symbols = holdings.map((h) => h.symbol);
    const quotes = await fetchQuotes(symbols);
    const priceBySymbol = new Map(quotes.map((q) => [q.symbol, q.price]));

    const holdingsWithMarketData = holdings.map((h) => {
      const currentPrice = priceBySymbol.get(h.symbol) ?? null;
      const marketValue =
        currentPrice !== null ? h.totalQuantity * currentPrice : null;
      const unrealizedPnl =
        marketValue !== null ? marketValue - h.totalCostBasis : null;
      const unrealizedPnlPct =
        marketValue !== null && h.totalCostBasis > 0
          ? (unrealizedPnl! / h.totalCostBasis) * 100
          : null;

      return {
        symbol: h.symbol,
        totalQuantity: h.totalQuantity,
        totalCostBasis: h.totalCostBasis,
        avgCostPerUnit: h.avgCostPerUnit,
        realizedPnl: h.realizedPnl,
        currentPrice,
        marketValue,
        unrealizedPnl,
        unrealizedPnlPct,
      };
    });

    const costBasis = holdings.reduce((sum, h) => sum + h.totalCostBasis, 0);
    const holdingsValue = holdingsWithMarketData.reduce(
      (sum, h) => sum + (h.marketValue ?? 0),
      0,
    );
    const unrealizedPnl = holdingsValue - costBasis;
    const unrealizedPnlPct = costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

    // Return + risk metrics. `currentPrices` is the plain symbol->price map both
    // engines expect. Risk metrics read historical PriceBar data and return null
    // when there isn't enough of it yet — that's expected, not an error.
    const currentPrices: Record<string, number> = Object.fromEntries(
      quotes.map((q) => [q.symbol, q.price]),
    );

    const returns =
      holdings.length > 0 ? calculateReturns(transactions, holdings, currentPrices) : null;

    let risk = null;
    try {
      risk = holdings.length > 0 ? await calculateRiskMetrics(holdings, currentPrices) : null;
    } catch (riskErr) {
      // Risk metrics are a nice-to-have — never let them take down the whole
      // portfolio response, which the dashboard depends on.
      console.error("[portfolio:GET] risk metrics failed", riskErr);
    }

    return NextResponse.json(
      {
        holdingsValue,
        costBasis,
        unrealizedPnl,
        unrealizedPnlPct,
        holdings: holdingsWithMarketData,
        returns,
        risk,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[portfolio:GET]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
