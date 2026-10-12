import { fetchDailyHistory } from "@/lib/yahoo";
import { computeSeasonality } from "@/lib/analytics/engines/seasonals-engine";
import { stockTabRoute, available, unavailable } from "@/lib/stock-tab-route";
import { TTL } from "@/lib/singleflight";
import type { SeasonalsData } from "@/types/stock-tabs";

// Eleven years of data yields ten complete calendar years plus this one.
const HISTORY_YEARS = 11;

export const GET = stockTabRoute<SeasonalsData>(
  { cacheSeconds: TTL.HISTORY, label: "seasonals" },
  async (symbol) => {
    const bars = await fetchDailyHistory(symbol, HISTORY_YEARS);
    const seasonality = bars
      ? computeSeasonality(bars.map((b) => ({ date: b.date, adjClose: b.adjClose })), new Date())
      : null;
    return seasonality && seasonality.cells.length >= 12
      ? available(seasonality, "Yahoo Finance adjusted daily closes")
      : unavailable(`${symbol} needs at least a year of trading history for seasonality.`);
  },
);
