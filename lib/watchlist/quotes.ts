// lib/watchlist/quotes.ts
import {
  fetchQuotes,
  fetchCompanyProfile,
  type Quote,
  type CompanyProfile,
} from "@/lib/finnhub";
import { fetchCryptoQuotes } from "@/lib/coingecko";
import { CRYPTO_ASSETS } from "@/constants/cryptoAssets";
import type { WatchlistItem, WatchlistItemDoc } from "@/types/watchlist";

function resolveCryptoAsset(symbol: string) {
  const norm = symbol.trim().toUpperCase();
  const byTicker = CRYPTO_ASSETS.find((a) => a.ticker.toUpperCase() === norm);
  if (byTicker) return byTicker;

  const bySymbol = CRYPTO_ASSETS.find((a) => a.symbol.toUpperCase() === norm);
  if (bySymbol) return bySymbol;

  if (symbol.startsWith("CRYPTO:")) {
    const id = symbol.slice("CRYPTO:".length);
    return { symbol, ticker: id.toUpperCase(), name: id };
  }

  return { symbol: `CRYPTO:${symbol.toLowerCase()}`, ticker: norm, name: norm };
}

export async function fetchWatchlistItems(
  docs: WatchlistItemDoc[],
): Promise<WatchlistItem[]> {
  if (docs.length === 0) return [];

  // Guard against malformed docs (missing / non-string symbol)
  const validDocs = docs.filter(
    (d): d is WatchlistItemDoc =>
      typeof d?.symbol === "string" && d.symbol.length > 0,
  );

  if (validDocs.length === 0) return [];

  const cryptoDocs = validDocs.filter((d) => d.type === "crypto");
  const stockDocs = validDocs.filter((d) => d.type !== "crypto");

  // Resolve crypto definitions
  const cryptoAssetDefs = cryptoDocs.map((d) => ({
    docSymbol: d.symbol,
    asset: resolveCryptoAsset(d.symbol),
  }));

  const cryptoSymbolIds = [...new Set(cryptoAssetDefs.map((c) => c.asset.symbol))];
  const stockSymbols = [...new Set(stockDocs.map((d) => d.symbol))];

  const [cryptoQuotes, stockQuotes, profiles] = await Promise.all([
    cryptoSymbolIds.length > 0 ? fetchCryptoQuotes(cryptoSymbolIds) : Promise.resolve([]),
    stockSymbols.length > 0 ? fetchQuotes(stockSymbols) : Promise.resolve([]),
    Promise.all(stockSymbols.map((s) => fetchCompanyProfile(s))),
  ]);

  // Index crypto quotes by both asset symbol (e.g. "CRYPTO:ethereum") and ticker (e.g. "ETH")
  const cryptoQuoteMap = new Map<string, Quote>();
  for (const q of cryptoQuotes) {
    cryptoQuoteMap.set(q.symbol, q);
    const def = cryptoAssetDefs.find((c) => c.asset.symbol === q.symbol);
    if (def) {
      cryptoQuoteMap.set(def.docSymbol.toUpperCase(), q);
      cryptoQuoteMap.set(def.asset.ticker.toUpperCase(), q);
    }
  }

  // Index stock quotes & profiles by symbol
  const stockQuoteMap = new Map<string, Quote>(stockQuotes.map((q) => [q.symbol.toUpperCase(), q]));
  const profileMap = new Map<string, CompanyProfile>();
  for (const p of profiles) {
    if (p) profileMap.set(p.symbol.toUpperCase(), p);
  }

  return validDocs.map((doc) => {
    const symUpper = doc.symbol.toUpperCase();

    if (doc.type === "crypto") {
      const def = resolveCryptoAsset(doc.symbol);
      const q = cryptoQuoteMap.get(symUpper) ?? cryptoQuoteMap.get(def.symbol);

      return {
        symbol: doc.symbol,
        type: doc.type,
        name: def.name || doc.symbol,
        price: q?.price ?? null,
        change: q?.change ?? null,
        changePercent: q?.changePercent ?? null,
        logo: q?.image,
        exchange: "CoinGecko",
        sector: "Crypto",
        marketCap: q?.marketCap ?? null,
        volume: q?.volume ?? null,
        sparkline: q?.sparkline,
        high52: q?.high52 ?? null,
        low52: q?.low52 ?? null,
      };
    }

    const q = stockQuoteMap.get(symUpper);
    const p = profileMap.get(symUpper);

    // Finnhub marketCapitalization is expressed in millions
    const stockCap = p?.marketCapitalization ? p.marketCapitalization * 1_000_000 : null;

    return {
      symbol: doc.symbol,
      type: doc.type,
      name: p?.name ?? doc.symbol,
      price: q?.price ?? null,
      change: q?.change ?? null,
      changePercent: q?.changePercent ?? null,
      logo: p?.logo ?? q?.image,
      exchange: p?.exchange,
      sector: p?.industry ?? null,
      marketCap: stockCap,
      volume: null,
      sparkline: undefined,
      high52: q?.high ?? null,
      low52: q?.low ?? null,
    };
  });
}
