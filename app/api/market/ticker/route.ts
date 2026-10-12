import { NextResponse } from "next/server";
import { fetchTickerQuotes } from "@/lib/yahoo";
import { companies } from "@/components/landing/companies";

// The symbol list is fixed server-side (the landing logo strip), never taken
// from the request, so this public route can't be used to fan out arbitrary
// upstream lookups. Entries without a working ticker (see companies.tsx)
// are skipped and render logo-only.
const SYMBOLS = companies.flatMap((c) =>
  c.symbol ? [c.type === "crypto" ? `${c.symbol}-USD` : c.symbol] : [],
);

export async function GET(): Promise<NextResponse> {
  const quotes = await fetchTickerQuotes(SYMBOLS);
  if (!quotes) {
    return NextResponse.json({ error: "Ticker data unavailable" }, { status: 502 });
  }

  // Re-key crypto back to the bare symbol the client knows ("BTC-USD" → "BTC").
  const body = Object.fromEntries(
    Object.entries(quotes).map(([s, q]) => [s.replace(/-USD$/, ""), q]),
  );
  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
