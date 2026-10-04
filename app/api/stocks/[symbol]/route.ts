import { NextResponse } from "next/server";
import {
  fetchQuote,
  fetchCompanyProfile,
  fetchCompanyNews,
  fetchDailyCandles,
  fetchMarketStatus,
} from "@/lib/finnhub";
import { fetchInsiderFilings } from "@/lib/edgar";
import { fetchDailyCandlesFromTwelveData } from "@/lib/twelvedata";
import { fetchDailySeriesFromAlphaVantage } from "@/lib/alphavantage";
import { isCryptoSymbol } from "@/constants/cryptoAssets";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> },
): Promise<NextResponse> {
  try {
    const { symbol } = await params;
    const upperSymbol = symbol.toUpperCase();
    const isCrypto = isCryptoSymbol(upperSymbol);

    const to = Math.floor(Date.now() / 1000);
    const from = to - 90 * 86_400;

    const [quote, profile, news, finnhubCandles, insiderFilings, marketStatus] = await Promise.all([
      fetchQuote(upperSymbol),
      fetchCompanyProfile(upperSymbol),
      fetchCompanyNews(upperSymbol),
      fetchDailyCandles(upperSymbol, from, to),
      fetchInsiderFilings(upperSymbol),
      isCrypto ? Promise.resolve(null) : fetchMarketStatus("US"),
    ]);

    // Finnhub's /stock/candle is plan-gated (returns null) for the current
    // key — fall back to Twelve Data, then Alpha Vantage's daily series.
    const candles =
      finnhubCandles ??
      (await fetchDailyCandlesFromTwelveData(upperSymbol, from, to)) ??
      (isCrypto
        ? null
        : (await fetchDailySeriesFromAlphaVantage(upperSymbol))?.filter(
            (bar) => bar.timestamp.getTime() >= from * 1000,
          ) ?? null);

    return NextResponse.json({ quote, profile, news, candles, insiderFilings, marketStatus });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
