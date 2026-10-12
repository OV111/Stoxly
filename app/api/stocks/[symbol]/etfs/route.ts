import { fetchFundProfile, fetchEtfExposure } from "@/lib/yahoo";
import { stockTabRoute, available, unavailable } from "@/lib/stock-tab-route";
import { TTL } from "@/lib/singleflight";
import type { EtfsData } from "@/types/stock-tabs";

export const GET = stockTabRoute<EtfsData>(
  { cacheSeconds: TTL.ETF_HOLDINGS, label: "etfs" },
  async (symbol) => {
    // A fund page shows what the fund holds; a stock page shows which funds hold it.
    const profile = await fetchFundProfile(symbol);
    if (profile) {
      const { kind, ...fund } = profile;
      if (kind === "ETF" || kind === "MUTUALFUND") {
        return available<EtfsData>({ mode: "fund", profile: fund }, "Yahoo Finance fund holdings");
      }
    }

    const exposure = await fetchEtfExposure(symbol);
    return exposure
      ? available<EtfsData>({ mode: "exposure", ...exposure }, "Yahoo Finance fund holdings")
      : unavailable("ETF holdings data is temporarily unavailable.");
  },
);
