import { fetchFinancialStatements } from "@/lib/edgar";
import { stockTabRoute, available, unavailable } from "@/lib/stock-tab-route";
import { TTL } from "@/lib/singleflight";
import type { FinancialsData } from "@/types/stock-tabs";

export const GET = stockTabRoute<FinancialsData>(
  { cacheSeconds: TTL.FUNDAMENTALS, label: "financials" },
  async (symbol) => {
    const statements = await fetchFinancialStatements(symbol);
    return statements
      ? available(statements, "SEC EDGAR XBRL filings")
      : unavailable(
          `No SEC financial statements were found for ${symbol}. ETFs, funds, and many non-US companies don't file them in this format.`,
        );
  },
);
