import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { getJournalEntry } from "@/lib/journal/queries";
import Transaction from "@/models/Transactions";
import PriceBar from "@/models/PriceBar";
import { buildHoldings } from "@/lib/analytics/engines/holdings-engine";
import { fetchQuotes } from "@/lib/finnhub";
import type {
  DecisionPositionContext,
  DecisionPriceContext,
} from "@/types/journal";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const entry = await getJournalEntry({ entryId: id, userId: user.id });
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (entry.type !== "DECISION") {
      return NextResponse.json(
        { error: "Review is only available for decisions" },
        { status: 400 },
      );
    }

    let position: DecisionPositionContext | null = null;
    let priceContext: DecisionPriceContext | null = null;

    if (entry.symbol) {
      await connectDB();

      const [transactions, quotes, decisionBar] = await Promise.all([
        Transaction.find({ userId: user.id }),
        fetchQuotes([entry.symbol]),
        PriceBar.findOne({
          symbol: entry.symbol,
          timestamp: { $gte: new Date(entry.createdAt) },
        })
          .sort({ timestamp: 1 })
          .lean(),
      ]);

      const currentPrice = quotes.find((q) => q.symbol === entry.symbol)?.price ?? null;

      const holding = buildHoldings(transactions).find(
        (h) => h.symbol === entry.symbol,
      );
      if (holding && holding.totalQuantity > 0 && currentPrice !== null) {
        const marketValue = holding.totalQuantity * currentPrice;
        const unrealizedPnlPct =
          holding.totalCostBasis > 0
            ? ((marketValue - holding.totalCostBasis) / holding.totalCostBasis) * 100
            : 0;
        position = {
          symbol: entry.symbol,
          quantity: holding.totalQuantity,
          currentPrice,
          marketValue,
          unrealizedPnlPct,
        };
      }

      if (decisionBar && currentPrice !== null && decisionBar.close > 0) {
        priceContext = {
          priceAtDecision: decisionBar.close,
          currentPrice,
          changePct:
            ((currentPrice - decisionBar.close) / decisionBar.close) * 100,
          asOf: decisionBar.timestamp.toISOString(),
        };
      }
    }

    return NextResponse.json({ decision: entry, position, priceContext });
  } catch (error) {
    console.error("GET /api/journal/[id]/review error:", error);
    return NextResponse.json(
      { error: "Failed to load decision review" },
      { status: 500 },
    );
  }
}
