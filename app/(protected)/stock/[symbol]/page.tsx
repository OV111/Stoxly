"use client";

import { use, useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Star, Plus } from "lucide-react";
import PriceChart from "@/components/stock/PriceChart";
import AddTransactionModal from "@/components/dashboard/AddTransactionModal";
import { Button } from "@/components/ui/button";
import { Classic } from "@/components/loading-ui/classic";

type Quote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
};

type Holding = {
  symbol: string;
  totalQuantity: number;
  totalCostBasis: number;
  avgCostPerUnit: number;
  currentPrice: number | null;
  marketValue: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
};

type CompanyProfile = {
  symbol: string;
  name: string;
  logo: string;
  industry: string;
  marketCapitalization: number;
  currency: string;
  exchange: string;
};

// Imported as a type only, so nothing from the server-side finnhub module is
// pulled into this client bundle — but the shape now can't drift from what
// /api/stocks/[symbol] actually sends.
import type { CompanyNewsItem as NewsItem } from "@/lib/finnhub";

type CandleBar = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type InsiderFiling = {
  accessionNumber: string;
  filingDate: string;
  formType: string;
  filerName: string | null;
  documentUrl: string;
};

type StockData = {
  quote: Quote | null;
  profile: CompanyProfile | null;
  news: NewsItem[];
  candles: CandleBar[] | null;
  insiderFilings: InsiderFiling[];
};

const timeAgo = (unixSeconds: number) => {
  const diffMs = Date.now() - unixSeconds * 1000;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const formatMarketCap = (marketCapMillions: number) => {
  if (marketCapMillions >= 1_000_000) return `$${(marketCapMillions / 1_000_000).toFixed(2)}T`;
  if (marketCapMillions >= 1_000) return `$${(marketCapMillions / 1_000).toFixed(2)}B`;
  return `$${marketCapMillions.toFixed(0)}M`;
};

type StockPageProps = {
  params: Promise<{ symbol: string }>;
};

const StockPage = ({ params }: StockPageProps) => {
  const { symbol } = use(params);
  const upperSymbol = symbol.toUpperCase();

  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Independent of the main stock fetch — these are per-user, private data
  // (holdings, watchlist), so they're never cached on the shared /api/stocks
  // route and are allowed to fail/load on their own timeline.
  const [holding, setHolding] = useState<Holding | null>(null);
  const [isWatchlisted, setIsWatchlisted] = useState<boolean | null>(null); // null = still checking
  const [watchlistBusy, setWatchlistBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/stocks/${upperSymbol}`)
      .then((r) => r.json())
      .then((json) => {
        if (json && !json.error) setData(json);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((json) => {
        const match = json?.holdings?.find((h: Holding) => h.symbol === upperSymbol);
        setHolding(match ?? null);
      })
      .catch(() => setHolding(null));

    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((json) => {
        setIsWatchlisted(Array.isArray(json) && json.some((q: Quote) => q.symbol === upperSymbol));
      })
      .catch(() => setIsWatchlisted(false));
  }, [upperSymbol]);

  const toggleWatchlist = async () => {
    if (isWatchlisted === null || watchlistBusy) return;
    setWatchlistBusy(true);
    const wasWatchlisted = isWatchlisted;
    setIsWatchlisted(!wasWatchlisted); // optimistic — reverted below on failure

    try {
      const res = await fetch("/api/watchlist", {
        method: wasWatchlisted ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: upperSymbol }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setIsWatchlisted(wasWatchlisted); // roll back the optimistic flip
    } finally {
      setWatchlistBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 min-h-[50vh]">
        <Classic className="size-8 text-gray-400" />
        <p className="text-gray-500 text-lg">Loading {upperSymbol}...</p>
      </div>
    );
  }

  if (error || !data || !data.quote) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-red-500 text-lg">Failed to load data for {upperSymbol}.</p>
      </div>
    );
  }

  const { quote, profile, news, candles, insiderFilings } = data;
  const isPositive = quote.changePercent >= 0;
  const hasChart = Array.isArray(candles) && candles.length > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex items-center gap-4">
            {profile?.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.logo}
                alt={`${upperSymbol} logo`}
                className="w-12 h-12 rounded-lg bg-gray-700 object-contain p-1"
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-100">
                  {profile?.name ?? upperSymbol}
                </h1>
                <span className="text-xs font-mono font-semibold px-2 py-1 rounded bg-gray-700 text-yellow-400">
                  {upperSymbol}
                </span>
              </div>
              {profile?.exchange && (
                <p className="text-gray-500 mt-1 text-sm">{profile.exchange}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleWatchlist}
                disabled={isWatchlisted === null || watchlistBusy}
                className="bg-gray-900 border-gray-700 hover:bg-gray-700"
              >
                <Star
                  className={`size-3.5 ${
                    isWatchlisted ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
                  }`}
                />
                {isWatchlisted ? "Watchlisted" : "Watchlist"}
              </Button>
              <AddTransactionModal
                defaultSymbol={upperSymbol}
                trigger={
                  <Button
                    size="sm"
                    className="bg-teal-400/10 text-teal-400 border border-teal-400/30 hover:bg-teal-400/20"
                  >
                    <Plus className="size-3.5" />
                    Log Transaction
                  </Button>
                }
              />
            </div>

            <div className="text-left sm:text-right">
              <p className="text-3xl md:text-4xl font-bold font-mono text-gray-100">
                ${quote.price?.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <div
                className={`inline-flex items-center gap-1 text-sm font-medium font-mono px-2 py-1 rounded mt-2 ${
                  isPositive ? "bg-teal-400/10 text-teal-400" : "bg-red-500/10 text-red-500"
                }`}
              >
                {isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              {isPositive ? "+" : ""}
              {quote.change?.toFixed(2)} ({isPositive ? "+" : ""}
              {quote.changePercent?.toFixed(2)}%)
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-gray-700">
          {quote.open != null && quote.previousClose != null && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Day Range</p>
              <p className="text-sm font-mono text-gray-200 mt-1">
                ${quote.low?.toFixed(2)} – ${quote.high?.toFixed(2)}
              </p>
            </div>
          )}
          {quote.previousClose != null && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Prev. Close</p>
              <p className="text-sm font-mono text-gray-200 mt-1">
                ${quote.previousClose?.toFixed(2)}
              </p>
            </div>
          )}
          {profile?.marketCapitalization != null && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Market Cap</p>
              <p className="text-sm font-mono text-gray-200 mt-1">
                {formatMarketCap(profile.marketCapitalization)}
              </p>
            </div>
          )}
          {profile?.industry && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Industry</p>
              <p className="text-sm text-gray-200 mt-1">{profile.industry}</p>
            </div>
          )}
          {profile?.currency && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Currency</p>
              <p className="text-sm font-mono text-gray-200 mt-1">{profile.currency}</p>
            </div>
          )}
          {!profile && (
            <p className="text-xs text-gray-500">
              Extended company data isn&apos;t available for {upperSymbol}.
            </p>
          )}
        </div>
      </div>

      {/* Your Position — connects this page to the user's own ledger, the
          thing a generic quote page can't do */}
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
          Your Position
        </h2>
        {holding ? (
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Quantity</p>
              <p className="text-lg font-mono font-bold text-gray-100 mt-1">
                {holding.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Cost</p>
              <p className="text-lg font-mono text-gray-200 mt-1">
                ${holding.avgCostPerUnit.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Market Value</p>
              <p className="text-lg font-mono text-gray-200 mt-1">
                {holding.marketValue != null
                  ? `$${holding.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Unrealized P&L</p>
              <p
                className={`text-lg font-mono font-bold mt-1 ${
                  (holding.unrealizedPnl ?? 0) >= 0 ? "text-teal-400" : "text-red-500"
                }`}
              >
                {holding.unrealizedPnl != null ? (
                  <>
                    {holding.unrealizedPnl >= 0 ? "+" : ""}$
                    {holding.unrealizedPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    {holding.unrealizedPnlPct != null && (
                      <span className="text-sm font-normal ml-1">
                        ({holding.unrealizedPnlPct >= 0 ? "+" : ""}
                        {holding.unrealizedPnlPct.toFixed(2)}%)
                      </span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-500">
              You don&apos;t hold any {upperSymbol} yet.
            </p>
            <AddTransactionModal
              defaultSymbol={upperSymbol}
              trigger={
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-gray-900 border-gray-700 hover:bg-gray-700"
                >
                  <Plus className="size-3.5" />
                  Log your first {upperSymbol} transaction
                </Button>
              }
            />
          </div>
        )}
      </div>

      {/* Price chart */}
      {hasChart && (
        <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Price History (90d)
          </h2>
          <PriceChart candles={candles!} />
        </div>
      )}

      {/* Insider activity — SEC EDGAR Form 4 filings, metadata only for now */}
      {insiderFilings.length > 0 && (
        <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Insider Activity
          </h2>
          <div className="flex flex-col divide-y divide-gray-800/80">
            {insiderFilings.map((filing) => (
              <a
                key={filing.accessionNumber}
                href={filing.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 first:pt-0 last:pb-0 flex items-center justify-between hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-2 text-sm text-gray-200">
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-gray-700 text-blue-400">
                    Form {filing.formType}
                  </span>
                  <span>{filing.filerName ?? "Insider transaction"}</span>
                </div>
                <span className="text-xs font-mono text-gray-500">{filing.filingDate}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* News */}
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">News</h2>
        {news.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No recent news for {upperSymbol}.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-800/80">
            {news.slice(0, 10).map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 first:pt-0 last:pb-0 block hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-2 mb-1 text-[11px] font-mono text-gray-500">
                  <span className="text-blue-400 font-semibold">{item.symbol}</span>
                  <span>·</span>
                  <span>{item.source}</span>
                  <span>·</span>
                  <span>{timeAgo(item.datetime)}</span>
                </div>
                <p className="text-sm text-gray-200 leading-snug">{item.headline}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockPage;
