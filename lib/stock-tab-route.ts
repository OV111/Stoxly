import { NextResponse } from "next/server";
import { isCryptoSymbol } from "@/constants/cryptoAssets";
import type { TabResponse } from "@/types/stock-tabs";

// Tickers, share classes (BRK.B / BRK-B), and index/FX forms (^GSPC, EURUSD=X).
const SYMBOL_PATTERN = /^[A-Z0-9.\-^=]{1,15}$/;

type Context = { params: Promise<{ symbol: string }> };

export const unavailable = (reason: string): TabResponse<never> => ({ available: false, reason });

export const available = <T>(data: T, source: string): TabResponse<T> => ({
  available: true,
  data,
  source,
  asOf: new Date().toISOString(),
});

/**
 * Shared shell for every /api/stocks/[symbol]/<tab> route: validates the
 * symbol, short-circuits crypto (these tabs are equity/fund data), sets a CDN
 * cache header sized to how fast the tab's data changes, and turns unexpected
 * throws into a 500 so one broken provider never takes the page down.
 *
 * The data isn't user-specific, so it's safe to cache publicly.
 */
export function stockTabRoute<T>(
  options: { cacheSeconds: number; label: string },
  handler: (symbol: string, request: Request) => Promise<TabResponse<T>>,
) {
  return async (request: Request, { params }: Context): Promise<NextResponse> => {
    const symbol = decodeURIComponent((await params).symbol).toUpperCase();

    if (isCryptoSymbol(symbol)) {
      return NextResponse.json(unavailable("This data covers stocks and funds, not crypto assets."));
    }
    if (!SYMBOL_PATTERN.test(symbol)) {
      return NextResponse.json({ error: "Invalid symbol" }, { status: 400 });
    }

    try {
      const body = await handler(symbol, request);
      return NextResponse.json(body, {
        headers: body.available
          ? {
              "Cache-Control": `public, s-maxage=${options.cacheSeconds}, stale-while-revalidate=${options.cacheSeconds * 2}`,
            }
          : // Don't let the CDN pin a transient provider outage.
            { "Cache-Control": "no-store" },
      });
    } catch (err) {
      console.error(`[stocks:${options.label}] ${symbol}`, err);
      return NextResponse.json({ error: `Failed to load ${options.label}` }, { status: 500 });
    }
  };
}
