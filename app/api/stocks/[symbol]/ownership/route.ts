import { fetchOwnership } from "@/lib/yahoo";
import { stockTabRoute, available, unavailable } from "@/lib/stock-tab-route";
import { TTL } from "@/lib/singleflight";
import type { OwnershipData } from "@/types/stock-tabs";

export const GET = stockTabRoute<OwnershipData>(
  { cacheSeconds: TTL.OWNERSHIP, label: "ownership" },
  async (symbol) => {
    const ownership = await fetchOwnership(symbol);
    return ownership
      ? available(ownership, "Yahoo Finance, from 13F and Form 4 filings")
      : unavailable(`Ownership data isn't available for ${symbol}.`);
  },
);
