import { fetchDailyHistory } from "@/lib/yahoo";
import { fetchDailyCandlesFromTwelveData } from "@/lib/twelvedata";
import { computeTechnicals, type DailyBar } from "@/lib/analytics/engines/technicals-engine";
import { stockTabRoute, available, unavailable } from "@/lib/stock-tab-route";
import { TTL } from "@/lib/singleflight";
import type { TechnicalsData } from "@/types/stock-tabs";

// Two years: enough to seed the 200-day average and still chart a full year.
const HISTORY_YEARS = 2;

async function loadBars(symbol: string): Promise<{ bars: DailyBar[]; source: string } | null> {
  const yahoo = await fetchDailyHistory(symbol, HISTORY_YEARS);
  if (yahoo) return { bars: yahoo, source: "Yahoo Finance daily prices" };

  const to = Math.floor(Date.now() / 1000);
  const from = to - HISTORY_YEARS * 365 * 86_400;
  const twelve = await fetchDailyCandlesFromTwelveData(symbol, from, to);
  if (!twelve?.length) return null;
  return {
    bars: twelve.map((b) => ({ ...b, date: b.timestamp.toISOString().slice(0, 10) })),
    source: "Twelve Data daily prices",
  };
}

export const GET = stockTabRoute<TechnicalsData>(
  { cacheSeconds: TTL.HISTORY, label: "technicals" },
  async (symbol) => {
    const loaded = await loadBars(symbol);
    const technicals = loaded ? computeTechnicals(loaded.bars) : null;
    return technicals && loaded
      ? available(technicals, loaded.source)
      : unavailable(`There isn't enough price history for ${symbol} to compute indicators.`);
  },
);
