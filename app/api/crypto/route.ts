import { NextRequest, NextResponse } from "next/server";
import { CRYPTO_ASSETS } from "@/constants/cryptoAssets";
import { fetchCryptoQuotes } from "@/lib/coingecko";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const forceRefresh = request.nextUrl.searchParams.get("forceRefresh") === "true";
    const quotes = await fetchCryptoQuotes(
      CRYPTO_ASSETS.map((asset) => asset.symbol),
      { forceRefresh },
    );
    const quoteBySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));

    const assets = CRYPTO_ASSETS.flatMap((asset) => {
      const quote = quoteBySymbol.get(asset.symbol);
      if (!quote) return [];

      return [{
        ...asset,
        image: quote.image,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changePercent,
        high: quote.high,
        low: quote.low,
      }];
    });

    return NextResponse.json(assets);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
