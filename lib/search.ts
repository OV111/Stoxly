import { Instrument } from "@/types/search";
import { searchStocks } from "./stock-search";
import { searchCrypto } from "./coingecko";
import { getCached, setCache } from "@/lib/cache";
// index from Instrument isn't called
export async function unifiedSearch(query: string): Promise<Instrument[]> {
  const q = query.trim();

  if (q.length < 2) {
    return [];
  }

  const cacheKey = `search:${q.toLowerCase()}`;
  const cached = await getCached<Instrument[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const [cryptosResult, stocksResult] = await Promise.allSettled([
    searchCrypto(q),
    searchStocks(q),
  ]);

  let results: Instrument[] = [];

  if (cryptosResult.status === "fulfilled") {
    results.push(...cryptosResult.value);
  } else {
    console.error("[search] Crypto provider failed:", cryptosResult.reason);
  }

  if (stocksResult.status === "fulfilled") {
    results.push(...stocksResult.value);
  } else {
    console.error("[search] Stocks provider failed:", stocksResult.reason);
  }

  if (results.length === 0) return [];

  const seen = new Set<string>();
  results = results.filter((item) => {
    const key = `${item.type}:${item.symbol}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  results.sort((a, b) => {
    const ql = q.toLowerCase();
    const aExact = a.symbol.toLowerCase() === ql;
    const bExact = b.symbol.toLowerCase() === ql;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return (b.marketCap ?? 0) - (a.marketCap ?? 0); // highest cap first
  });

  await setCache(cacheKey, results, 3600);
  return results;
}
