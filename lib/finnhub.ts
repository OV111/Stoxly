import { singleflight, TTL } from "@/lib/singleflight";
import { fetchCryptoQuotes } from "@/lib/coingecko";
import { isCryptoSymbol } from "@/constants/cryptoAssets";

export const STOCK_SYMBOLS: string[] = [
  "AAPL",
  "MSFT",
  "NVDA",
  "GOOGL",
  "AMZN",
  "META",
  "TSLA",
  "AMD",
  "NFLX",
  "PYPL",
  "INTC",
  "CRM",
  "ORCL",
  "UBER",
  "SHOP",
  "SNAP",
  "SPOT",
  "COIN",
  "SQ",
];

export type Quote = {
  symbol: string;
  image?: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  // Populated only by the CoinGecko path (`fetchCryptoQuotes`), which gets
  // them in the same bulk /coins/markets response. Finnhub's /quote returns
  // none of them, so every consumer must treat them as absent for stocks —
  // they're optional rather than `| null` to keep that distinction visible.
  marketCap?: number | null;
  volume?: number | null;
  sparkline?: number[];
  high52?: number | null;
  low52?: number | null;
};

// lib/finnhub.ts (add these functions)

/**
 * Fetch news for stock symbols using Finnhub.
 * Returns an empty array if the API key is missing or the request fails.
 */
export async function fetchNewsForSymbols(symbols: string[]): Promise<NewsItem[]> {
  if (symbols.length === 0) return [];

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    console.warn('[finnhub] FINNHUB_API_KEY missing – skipping stock news');
    return [];
  }

  try {
    // Finnhub free tier only supports "general" news, not per-symbol filtering.
    // We'll filter client-side.
    const response = await fetch(
      `https://finnhub.io/api/v1/news?category=general&token=${apiKey}`,
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) {
      console.error(`[finnhub] news request failed: ${response.status}`);
      return [];
    }

    const data = await response.json();
    if (!Array.isArray(data)) return [];

    // Filter by symbols (case-insensitive)
    const filtered = data.filter((item: any) => {
      const text = (item.headline || '') + ' ' + (item.summary || '');
      return symbols.some(sym => text.toUpperCase().includes(sym.toUpperCase()));
    });

    return filtered.map((item: any) => ({
      id: `finnhub-${item.id || item.datetime}`,
      title: item.headline || 'No title',
      description: item.summary || '',
      source: item.source || 'Finnhub',
      publishedAt: new Date(item.datetime * 1000).toISOString(),
      url: item.url || '#',
      category: item.category || 'general',
    }));
  } catch (err) {
    console.error('[finnhub] failed to fetch news:', err);
    return [];
  }
}

/**
 * Fetch crypto news from multiple sources (CryptoPanic, CoinGecko, CryptoCompare)
 * Returns an empty array if all sources fail.
 */
export async function fetchCryptoNews(symbols: string[]): Promise<NewsItem[]> {
  if (symbols.length === 0) return [];

  const news: NewsItem[] = [];

  // 1. Try CryptoPanic (best for crypto)
  const cryptoPanicKey = process.env.CRYPTOPANIC_API_KEY;
  if (cryptoPanicKey) {
    try {
      const currencies = symbols.map(s => s.replace('CRYPTO:', '')).join(',');
      const response = await fetch(
        `https://cryptopanic.com/api/v1/posts/?auth_token=${cryptoPanicKey}&currencies=${currencies}&limit=20`,
        { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.results && Array.isArray(data.results)) {
          news.push(...data.results.map((item: any) => ({
            id: `cryptopanic-${item.id || Date.now()}`,
            title: item.title || 'No title',
            description: item.description || '',
            source: item.source?.title || 'CryptoPanic',
            publishedAt: item.published_at || new Date().toISOString(),
            url: item.url || '#',
            category: 'crypto',
          })));
        }
      }
    } catch (err) {
      console.error('[cryptopanic] failed:', err);
    }
  }

  // 2. Fallback: CoinGecko news (no API key required)
  if (news.length === 0) {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/news?category=general',
        { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          news.push(...data.data.map((item: any) => ({
            id: `coingecko-${item.id || Date.now()}`,
            title: item.title || 'No title',
            description: item.description || '',
            source: item.source || 'CoinGecko',
            publishedAt: item.created_at || new Date().toISOString(),
            url: item.url || '#',
            category: 'crypto',
          })));
        }
      }
    } catch (err) {
      console.error('[coingecko] news failed:', err);
    }
  }

  // 3. Final fallback: CryptoCompare
  if (news.length === 0) {
    try {
      const response = await fetch(
        'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&limit=20',
        { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.Data && Array.isArray(data.Data)) {
          news.push(...data.Data.map((item: any) => ({
            id: `cryptocompare-${item.id || Date.now()}`,
            title: item.title || 'No title',
            description: item.body || '',
            source: item.source || 'CryptoCompare',
            publishedAt: new Date(item.published_on * 1000).toISOString(),
            url: item.url || '#',
            category: 'crypto',
          })));
        }
      }
    } catch (err) {
      console.error('[cryptocompare] failed:', err);
    }
  }

  // Filter by symbols (if any)
  const filtered = symbols.length > 0
    ? news.filter(item => {
        const text = (item.title + ' ' + item.description).toLowerCase();
        return symbols.some(sym => text.includes(sym.replace('CRYPTO:', '').toLowerCase()));
      })
    : news;

  return filtered.slice(0, 20);
}

// Define the NewsItem type

export async function fetchQuote(symbol: string): Promise<Quote | null> {
  if (isCryptoSymbol(symbol)) {
    return (await fetchCryptoQuotes([symbol]))[0] ?? null;
  }

  return singleflight(`quote:${symbol}`, async () => {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`,
        { next: { revalidate: TTL.QUOTE } },
      );
      if (!response.ok) return null;

      const data = await response.json();
      return {
        symbol,
        price: data.c,
        change: data.d,
        changePercent: data.dp,
        open: data.o,
        high: data.h,
        low: data.l,
        previousClose: data.pc,
      };
    } catch (err) {
      console.error(`Failed to fetch quote for ${symbol}:`, err);
      return null;
    }
  });
}

export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const cryptoSymbols = symbols.filter(isCryptoSymbol);
  const marketSymbols = symbols.filter((symbol) => !isCryptoSymbol(symbol));
  const [stockQuotes, cryptoQuotes] = await Promise.all([
    Promise.all(marketSymbols.map(fetchQuote)),
    fetchCryptoQuotes(cryptoSymbols),
  ]);

  return [...stockQuotes, ...cryptoQuotes].filter(
    (quote): quote is Quote => quote != null && quote.price !== 0 && quote.changePercent != null,
  );
}

export type NewsItem = {
  id: string;
  title: string;
  description: string;
  source: string;
  publishedAt: string;
  url: string;
  category: string;
};

/**
 * Per-symbol news, in Finnhub's own shape.
 *
 * Deliberately NOT `NewsItem`: that type is the normalized, cross-provider
 * shape used by the news feed (`fetchNewsForSymbols`, `fetchCryptoNews`),
 * whereas this passes Finnhub's fields through untouched for the stock detail
 * page, which renders `headline`/`summary` and formats `datetime` itself.
 * The function was previously annotated `NewsItem[]` while returning this —
 * the annotation was wrong, not the data.
 */
export type CompanyNewsItem = {
  symbol: string;
  source: string;
  headline: string;
  summary: string;
  url: string;
  /** Unix seconds, as Finnhub returns it. */
  datetime: number;
};

export async function fetchCompanyNews(symbol: string): Promise<CompanyNewsItem[]> {
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  // Date range is part of the key — it's part of what varies the response.
  return singleflight(`news:${symbol}:${from}:${to}`, async () => {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`,
        { next: { revalidate: TTL.NEWS } },
      );
      if (!response.ok) return [];

      const data = await response.json();
      if (!Array.isArray(data)) return [];

      return data.map((item) => ({
        symbol,
        source: item.source,
        headline: item.headline,
        summary: item.summary,
        url: item.url,
        datetime: item.datetime,
      }));
    } catch (err) {
      console.error(`Failed to fetch news for ${symbol}:`, err);
      return [];
    }
  });
}


export type SymbolSearchResult = {
  symbol: string;
  displaySymbol: string;
  description: string;
  type: string;
};

export async function searchSymbols(query: string): Promise<SymbolSearchResult[]> {
  // Normalize the key so "AAPL", "aapl" and " aapl " share one cache entry —
  // a debounced search box produces exactly these near-duplicate keys.
  const normalized = query.trim().toLowerCase();

  return singleflight(`search:${normalized}`, async () => {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${process.env.FINNHUB_API_KEY}`,
        { next: { revalidate: TTL.SEARCH } },
      );
      if (!response.ok) return [];

      const data = await response.json();
      if (!Array.isArray(data?.result)) return [];

      return data.result.map((item: Record<string, string>) => ({
        symbol: item.symbol,
        displaySymbol: item.displaySymbol,
        description: item.description,
        type: item.type,
      }));
    } catch (err) {
      console.error(`Failed to search symbols for "${query}":`, err);
      return [];
    }
  });
}

export type CompanyProfile = {
  symbol: string;
  name: string;
  logo: string;
  industry: string;
  marketCapitalization: number;
  currency: string;
  exchange: string;
};

export async function fetchCompanyProfile(symbol: string): Promise<CompanyProfile | null> {
  return singleflight(`profile:${symbol}`, async () => {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`,
        { next: { revalidate: TTL.PROFILE } },
      );
      if (!response.ok) return null;

      const data = await response.json();
      if (!data || !data.name) return null;

      return {
        symbol,
        name: data.name,
        logo: data.logo,
        industry: data.finnhubIndustry,
        marketCapitalization: data.marketCapitalization,
        currency: data.currency,
        exchange: data.exchange,
      };
    } catch (err) {
      console.error(`Failed to fetch company profile for ${symbol}:`, err);
      return null;
    }
  });
}

export type CandleBar = {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/**
 * Daily OHLC candles for one symbol between two unix-seconds timestamps.
 * Returns `null` (distinct from `[]`) when the request itself failed or the
 * plan doesn't have access — Finnhub's `/stock/candle` endpoint is gated on
 * paid plans for US equities on some free keys, and this needs to be
 * distinguishable from "the request succeeded, there's just no data."
 */
export async function fetchDailyCandles(
  symbol: string,
  fromUnix: number,
  toUnix: number,
): Promise<CandleBar[] | null> {
  // Bucket the range to the day. Callers derive `toUnix` from Date.now(), so a
  // raw-seconds key would be unique on every call and never hit cache.
  const fromDay = Math.floor(fromUnix / 86_400);
  const toDay = Math.floor(toUnix / 86_400);

  return singleflight(`candle:${symbol}:${fromDay}:${toDay}`, async () => {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${fromUnix}&to=${toUnix}&token=${process.env.FINNHUB_API_KEY}`,
        { next: { revalidate: TTL.CANDLE } },
      );
      if (!response.ok) {
        console.error(`[finnhub:candle] ${symbol} request failed: ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data.s === "no_data") return [];
      if (data.s !== "ok") {
        console.error(`[finnhub:candle] ${symbol} not accessible on this plan:`, data);
        return null;
      }

      const bars: CandleBar[] = data.t.map((unixSeconds: number, i: number) => ({
        timestamp: new Date(unixSeconds * 1000),
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i],
      }));

      return bars;
    } catch (err) {
      console.error(`Failed to fetch candles for ${symbol}:`, err);
      return null;
    }
  });
}
