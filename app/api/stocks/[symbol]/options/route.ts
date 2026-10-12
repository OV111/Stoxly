import { fetchOptionChain } from "@/lib/yahoo";
import { summarizeChain } from "@/lib/analytics/engines/options-engine";
import { stockTabRoute, available, unavailable } from "@/lib/stock-tab-route";
import { TTL } from "@/lib/singleflight";
import type { OptionsData } from "@/types/stock-tabs";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const GET = stockTabRoute<OptionsData>(
  { cacheSeconds: TTL.OPTIONS, label: "options" },
  async (symbol, request) => {
    const requested = new URL(request.url).searchParams.get("expiration");
    const expiration = requested && ISO_DATE.test(requested) ? requested : undefined;

    const chain = await fetchOptionChain(symbol, expiration);
    if (!chain || (chain.calls.length === 0 && chain.puts.length === 0)) {
      return unavailable(`${symbol} has no listed options.`);
    }
    return available(
      { chain, summary: summarizeChain(chain.calls, chain.puts, chain.underlying) },
      "Yahoo Finance options chain (delayed)",
    );
  },
);
