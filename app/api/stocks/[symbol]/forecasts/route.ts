import { fetchForecasts } from "@/lib/yahoo";
import { stockTabRoute, available, unavailable } from "@/lib/stock-tab-route";
import { TTL } from "@/lib/singleflight";
import type { ForecastsData } from "@/types/stock-tabs";

export const GET = stockTabRoute<ForecastsData>(
  { cacheSeconds: TTL.ESTIMATES, label: "forecasts" },
  async (symbol) => {
    const forecasts = await fetchForecasts(symbol);
    return forecasts
      ? available(forecasts, "Wall Street analyst consensus via Yahoo Finance")
      : unavailable(`No analysts publish estimates for ${symbol}.`);
  },
);
