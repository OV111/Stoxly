import { singleflight, TTL } from "@/lib/singleflight";
import { isCryptoSymbol } from "@/constants/cryptoAssets";
import { Instrument } from "@/types/search";

export type Quote = {
  symbol: string;
  image: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume?: number | null;
  marketCap?: number | null;
  sparkline?: number[];
  high52?: number | null;
  low52?: number | null;
};

export type CryptoMover = {
  symbol: string;
  name: string;
  image: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  volume?: number;
};

type CoinGeckoMarket = {
  id: string;
  name: string;
  image: string;
  current_price: number | null;
  price_change_24h: number | null;
  price_change_percentage_24h: number | null;
  high_24h: number | null;
  low_24h: number | null;
  market_cap?: number;
  total_volume?: number;
  sparkline_in_7d?: {
    price: number[];
  };
};

const BASE_URL = "https://api.coingecko.com/api/v3";

// Unified search for stocks and crypto
export async function searchCrypto(query: string): Promise<Instrument[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  return singleflight(`coingecko:search:${q.toLowerCase()}`, async () => {
    try {
      const params = new URLSearchParams({
        query: q,
      });
      const response = await fetch(`${BASE_URL}/search?${params}`, {
        signal: AbortSignal.timeout(5_000), // 5 second timeout for search
      });

      if (!response.ok) {
        console.error(`[coingecko] search request failed: ${response.status}`);
        return [];
      }

      const data = await response.json();
      if (!data.coins || !Array.isArray(data.coins)) return [];

      // Take top 10 results to keep the response lean
      const coins = data.coins.slice(0, 10);

      return coins.map((coin: any) => ({
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        type: 'crypto',
        logo: coin.thumb || undefined,
        exchange: 'CoinGecko',
        market: 'Global',
        currency: 'USD',
      }));
    } catch (err) {
      console.error("[coingecko] searchCrypto failed", err);
      return [];
    }
  });
}
/**
 * Fetches crypto market data in one request.
 */
export async function fetchCryptoQuotes(symbols: string[]): Promise<Quote[]> {
  const cryptoSymbols = [...new Set(symbols.filter(isCryptoSymbol))];
  if (cryptoSymbols.length === 0) return [];

  const ids = cryptoSymbols.map((symbol) => symbol.slice("CRYPTO:".length));
  const cacheKey = [...ids].sort().join(",");

  return singleflight(`coingecko:markets:${cacheKey}`, async () => {
    try {
      const params = new URLSearchParams({
        vs_currency: "usd",
        ids: ids.join(","),
        price_change_percentage: "24h",
        precision: "full",
        sparkline: "true",
      });
      const response = await fetch(`${BASE_URL}/coins/markets?${params}`, {
        next: { revalidate: TTL.QUOTE },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        console.error(`[coingecko] markets request failed: ${response.status}`);
        return [];
      }
      const markets = await response.json();
      if (!Array.isArray(markets)) return [];

      const byId = new Map(markets.map((market) => [market.id, market]));
      return cryptoSymbols.flatMap((symbol) => {
        const market = byId.get(symbol.slice("CRYPTO:".length));
        if (
          !market ||
          market.current_price === null ||
          market.current_price <= 0
        )
          return [];

        const sparklinePrices = market.sparkline_in_7d?.price;
        const sparkline =
          Array.isArray(sparklinePrices) && sparklinePrices.length > 0
            ? sparklinePrices
            : undefined;

        const current = market.current_price;
        const rawLow = sparkline && sparkline.length > 0 ? Math.min(...sparkline) : (market.low_24h ?? current);
        const rawHigh = sparkline && sparkline.length > 0 ? Math.max(...sparkline) : (market.high_24h ?? current);
        const low52 = Math.min(rawLow, current);
        const high52 = Math.max(rawHigh, current);

        return [
          {
            symbol,
            image: market.image,
            price: current,
            change: market.price_change_24h ?? 0,
            changePercent: market.price_change_percentage_24h ?? 0,
            open: 0,
            high: market.high_24h ?? current,
            low: market.low_24h ?? current,
            previousClose: 0,
            volume: market.total_volume ?? null,
            marketCap: market.market_cap ?? null,
            sparkline,
            high52,
            low52,
          },
        ];
      });
    } catch (err) {
      console.error("[coingecko] failed to fetch markets", err);
      return [];
    }
  });
}

/**
 * Ranks the 100 largest crypto assets by their 24-hour percentage move.
 */
export async function fetchTopCryptoMovers(
  limit = 5,
): Promise<{ gainers: CryptoMover[]; losers: CryptoMover[] }> {
  return singleflight("coingecko:top-movers", async () => {
    try {
      const params = new URLSearchParams({
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: "100",
        page: "1",
        price_change_percentage: "24h",
        precision: "full",
      });
      const response = await fetch(`${BASE_URL}/coins/markets?${params}`, {
        next: { revalidate: TTL.QUOTE },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        console.error(
          `[coingecko] top movers request failed: ${response.status}`,
        );
        return { gainers: [], losers: [] };
      }

      const markets: CoinGeckoMarket[] = await response.json();
      if (!Array.isArray(markets)) return { gainers: [], losers: [] };

      const movers = markets.flatMap((market) => {
        if (
          market.current_price === null ||
          market.price_change_percentage_24h === null
        )
          return [];
        return [
          {
            symbol: market.id,
            name: market.name,
            image: market.image,
            price: market.current_price,
            change: market.price_change_24h ?? 0,
            changePercent: market.price_change_percentage_24h,
            marketCap: market.market_cap,
            volume: market.total_volume,
          },
        ];
      });
      const sorted = [...movers].sort(
        (a, b) => b.changePercent - a.changePercent,
      );
      return {
        gainers: sorted.slice(0, limit),
        losers: sorted.slice(-limit).reverse(),
      };
    } catch (err) {
      console.error("[coingecko] failed to fetch top movers", err);
      return { gainers: [], losers: [] };
    }
  });
}
