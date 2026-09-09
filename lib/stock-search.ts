// lib/stock-search.ts
import { Instrument } from "@/types/search";

const ALPHA_VANTAGE_API = "https://www.alphavantage.co/query";

/**
 * Searches for stocks and ETFs using Alpha Vantage's SYMBOL_SEARCH.
 * Returns normalized Instrument[] for use in the unified search.
 */
export async function searchStocks(query: string): Promise<Instrument[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    console.warn("[stock-search] ALPHA_VANTAGE_API_KEY is missing.");
    return [];
  }

  try {
    const params = new URLSearchParams({
      function: "SYMBOL_SEARCH",
      keywords: q,
      apikey: apiKey,
    });

    const response = await fetch(`${ALPHA_VANTAGE_API}?${params}`, {
      signal: AbortSignal.timeout(5_000), // 5s timeout
    });

    if (!response.ok) {
      console.error(`[stock-search] HTTP error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Alpha Vantage returns { bestMatches: [...] } or an error object
    if (!data.bestMatches || !Array.isArray(data.bestMatches)) {
      // Rate limit or no results
      if (data.Note) {
        console.warn("[stock-search] Alpha Vantage rate limit:", data.Note);
      }
      return [];
    }

    // Take top 10 results to keep response lean
    const matches = data.bestMatches.slice(0, 10);

    return matches.map((match: any) => {
      const symbol = match["1. symbol"] || "";
      const name = match["2. name"] || symbol;
      const typeRaw = match["3. type"] || "Equity";
      const region = match["4. region"] || "";
      const currency = match["8. currency"] || "USD";

      // Detect ETF vs Stock
      let type: "stock" | "etf" = "stock";
      if (typeRaw.toLowerCase().includes("etf")) {
        type = "etf";
      }

      return {
        symbol: symbol.toUpperCase(),
        name: name,
        type: type,
        exchange: region,
        market: region,
        currency: currency,
        // Alpha Vantage does NOT provide logos
      };
    });
  } catch (err) {
    console.error("[stock-search] failed:", err);
    return []; // Graceful fallback: return empty array
  }
}