import { singleflight, TTL } from "@/lib/singleflight";
import type { Quote, CompanyProfile, CompanyNewsItem, CandleBar } from "@/lib/finnhub";

/**
 * Alpha Vantage — fallback for quote/profile/news when Finnhub is
 * unreachable or unconfigured. Free tier: 25 requests/day, so this is a
 * fallback only, never the primary path — callers try Finnhub first.
 * Same shapes as lib/finnhub.ts so callers don't care which provider answered.
 */

const BASE_URL = "https://www.alphavantage.co/query";
const MIN_SPACING_MS = 1_500;

const successCache = new Map<string, { expires: number; data: any }>();
let queue: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

/**
 * Rate-limit and error replies come back as HTTP 200 with an "Information" /
 * "Note" / "Error Message" body, so Next's fetch cache would store them as
 * successes. Bypass it, cache only real payloads here, and serialize calls to
 * stay under the free tier's per-second burst limit.
 */
async function avRequest(params: string, ttlSeconds: number): Promise<any | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return null;

  const cached = successCache.get(params);
  if (cached && cached.expires > Date.now()) return cached.data;

  const run = async () => {
    const wait = lastCallAt + MIN_SPACING_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();

    const response = await fetch(`${BASE_URL}?${params}&apikey=${apiKey}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      console.warn(`[alphavantage] ${params} -> HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const problem = data?.Information ?? data?.Note ?? data?.["Error Message"];
    if (problem) {
      console.warn(`[alphavantage] ${params} -> ${problem}`);
      return BURST_LIMIT.test(String(problem)) ? RETRY : null;
    }

    successCache.set(params, { expires: Date.now() + ttlSeconds * 1000, data });
    return data;
  };

  const runWithRetry = async () => {
    const first = await run();
    if (first !== RETRY) return first;
    lastCallAt = Date.now() + 1_000;
    const second = await run();
    return second === RETRY ? null : second;
  };

  const result = queue.then(runWithRetry, runWithRetry);
  queue = result.catch(() => undefined);
  return result;
}

const RETRY = Symbol("retry");
const BURST_LIMIT = /per second|spreading out/i;

export async function fetchDailySeriesFromAlphaVantage(symbol: string): Promise<CandleBar[] | null> {
  return singleflight(`alphavantage:daily:${symbol}`, async () => {
    try {
      const data = await avRequest(
        `function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact`,
        TTL.NEWS,
      );
      const series = data?.["Time Series (Daily)"];
      if (!series) return null;

      return Object.entries(series)
        .map(([day, bar]: [string, any]) => ({
          timestamp: new Date(`${day}T00:00:00Z`),
          open: Number(bar["1. open"]),
          high: Number(bar["2. high"]),
          low: Number(bar["3. low"]),
          close: Number(bar["4. close"]),
          volume: Number(bar["5. volume"]),
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (err) {
      console.error(`[alphavantage:daily] failed for ${symbol}:`, err);
      return null;
    }
  });
}

export async function fetchQuoteFromAlphaVantage(symbol: string): Promise<Quote | null> {
  // Derived from the daily series so one cached call serves both quote and chart —
  // the free tier's daily budget can't afford a separate GLOBAL_QUOTE per view.
  const bars = await fetchDailySeriesFromAlphaVantage(symbol);
  if (!bars || bars.length < 2) return null;

  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  const change = last.close - prev.close;

  return {
    symbol,
    price: last.close,
    change,
    changePercent: (change / prev.close) * 100,
    open: last.open,
    high: last.high,
    low: last.low,
    previousClose: prev.close,
    volume: last.volume,
  };
}

export async function fetchProfileFromAlphaVantage(symbol: string): Promise<CompanyProfile | null> {
  return singleflight(`alphavantage:profile:${symbol}`, async () => {
    try {
      const data = await avRequest(`function=OVERVIEW&symbol=${symbol}`, TTL.PROFILE);
      if (!data || !data.Name) return null;

      return {
        symbol,
        name: data.Name,
        logo: "", // Alpha Vantage's OVERVIEW has no logo field — Finnhub-only.
        industry: data.Industry ?? "",
        marketCapitalization: data.MarketCapitalization
          ? Number(data.MarketCapitalization) / 1_000_000 // Finnhub reports in millions; normalize to match.
          : 0,
        currency: data.Currency ?? "USD",
        exchange: data.Exchange ?? "",
      };
    } catch (err) {
      console.error(`[alphavantage:profile] failed for ${symbol}:`, err);
      return null;
    }
  });
}

export async function fetchNewsFromAlphaVantage(symbol: string): Promise<CompanyNewsItem[]> {
  return singleflight(`alphavantage:news:${symbol}`, async () => {
    try {
      const data = await avRequest(`function=NEWS_SENTIMENT&tickers=${symbol}&limit=20`, TTL.NEWS);
      if (!Array.isArray(data?.feed)) return [];

      return data.feed.map((item: any) => ({
        symbol,
        source: item.source ?? "Alpha Vantage",
        headline: item.title ?? "",
        summary: item.summary ?? "",
        url: item.url ?? "#",
        // Alpha Vantage format: "20260930T140000" — parse to unix seconds.
        datetime: item.time_published
          ? Math.floor(
              new Date(
                item.time_published.replace(
                  /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,
                  "$1-$2-$3T$4:$5:$6Z",
                ),
              ).getTime() / 1000,
            )
          : Math.floor(Date.now() / 1000),
      }));
    } catch (err) {
      console.error(`[alphavantage:news] failed for ${symbol}:`, err);
      return [];
    }
  });
}
