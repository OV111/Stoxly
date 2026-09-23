import { connectDB } from "@/lib/mongoose";
import Transaction from "@/models/Transactions";
import PortfolioSnapshot, {
  IPortfolioSnapshot,
} from "@/models/PortfolioSnapshot";
import { buildHoldings } from "@/lib/analytics/engines/holdings-engine";
import { fetchQuotes } from "@/lib/finnhub";

export type PortfolioSnapshotResult = IPortfolioSnapshot;

/**
 * Computes today's portfolio snapshot for a user from live data (transaction
 * log replay + current Finnhub quotes) and upserts it into PortfolioSnapshot,
 * keyed on {userId, snapshotDate = today at midnight UTC}. Running this
 * multiple times on the same UTC day updates the same document rather than
 * creating duplicates.
 *
 * Scope note: this only ever computes TODAY's snapshot using live prices.
 * Backfilling historical snapshots from PriceBar data is a future step.
 */
export async function snapshotPortfolioForUser(
  userId: string,
): Promise<PortfolioSnapshotResult> {
  await connectDB();

  const transactions = await Transaction.find({ userId });
  const holdings = buildHoldings(transactions);

  const symbols = holdings.map((h) => h.symbol);
  const quotes = await fetchQuotes(symbols);
  const priceBySymbol = new Map(quotes.map((q) => [q.symbol, q.price]));

  const holdingsWithMarketValue = holdings.map((h) => {
    const currentPrice = priceBySymbol.get(h.symbol) ?? null;
    const marketValue =
      currentPrice !== null ? h.totalQuantity * currentPrice : null;
    return { symbol: h.symbol, marketValue };
  });

  const costBasis = holdings.reduce((sum, h) => sum + h.totalCostBasis, 0);
  const holdingsValue = holdingsWithMarketValue.reduce(
    (sum, h) => sum + (h.marketValue ?? 0),
    0,
  );
  const unrealizedPnl = holdingsValue - costBasis;
  const unrealizedPnlPct =
    costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : 0;

  const assetAllocation: Record<string, number> = {};
  if (holdingsValue > 0) {
    for (const h of holdingsWithMarketValue) {
      if (h.marketValue !== null) {
        assetAllocation[h.symbol] = h.marketValue / holdingsValue;
      }
    }
  }

  const snapshotDate = new Date();
  snapshotDate.setUTCHours(0, 0, 0, 0);

  const snapshot = await PortfolioSnapshot.findOneAndUpdate(
    { userId, snapshotDate },
    {
      userId,
      snapshotDate,
      holdingsValue,
      costBasis,
      unrealizedPnl,
      unrealizedPnlPct,
      assetAllocation,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return snapshot;
}
