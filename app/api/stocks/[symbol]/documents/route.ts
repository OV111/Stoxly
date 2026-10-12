import { fetchFilings } from "@/lib/edgar";
import { stockTabRoute, available, unavailable } from "@/lib/stock-tab-route";
import { TTL } from "@/lib/singleflight";
import type { DocumentsData } from "@/types/stock-tabs";

const MAX_DOCUMENTS = 150;

export const GET = stockTabRoute<DocumentsData>(
  { cacheSeconds: TTL.EDGAR_FILINGS, label: "documents" },
  async (symbol) => {
    const filings = await fetchFilings(symbol);
    return filings && filings.length > 0
      ? available({ filings: filings.slice(0, MAX_DOCUMENTS) }, "SEC EDGAR")
      : unavailable(`${symbol} has no filings on SEC EDGAR.`);
  },
);
