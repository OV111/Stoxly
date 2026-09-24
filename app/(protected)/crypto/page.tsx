"use client";
import { Classic } from "@/components/loading-ui/classic";
import { useEffect, useState } from "react";
import { BarChart3, RefreshCw, WalletCards, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import CryptoAssetCard from "@/components/crypto/CryptoAssetCard";
import { useRef } from "react";
import { AnalysisModal } from "@/components/crypto/AnalysisModal";
import { CryptoAsset, AnalysisResult } from "@/types/crypro";

const formatPrice = (price: number) =>
  price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

const BATCH = 12;

// CoinGecko's free tier rate-limits aggressively, and a forced refresh always
// bypasses caching to guarantee live data — so unlike the initial/cached load,
// repeated force-refreshes have no coalescing to fall back on. A per-instance
// cooldown is what actually stops rapid clicks from tripping 429s, since
// disabling the button only during the (sub-100ms) in-flight request doesn't.
const REFRESH_COOLDOWN_MS = 15_000;

const CryptoPage = () => {
  const [assets, setAssets] = useState<CryptoAsset[]>([]);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(BATCH);
  const [error, setError] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownUntilRef = useRef(0);

  // ============================================================
  // 1. Load assets from your existing API
  // ============================================================
  const loadAssets = (isInitialLoad = false) => {
    if (isInitialLoad) {
      setInitialLoading(true);
      setVisibleCount(BATCH);
      setError(false);
    } else {
      if (Date.now() < cooldownUntilRef.current) return Promise.resolve();
      cooldownUntilRef.current = Date.now() + REFRESH_COOLDOWN_MS;
      setCooldownRemaining(REFRESH_COOLDOWN_MS / 1000);
      setRefreshing(true);
      setError(false);
    }

    const url = isInitialLoad ? "/api/crypto" : "/api/crypto?forceRefresh=true";

    return fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setError(true);
          return;
        }
        setAssets(data);
        setSelectedSymbols((symbols) =>
          symbols.filter((symbol) =>
            data.some((asset) => asset.symbol === symbol),
          ),
        );
      })
      .catch(() => setError(true))
      .finally(() => {
        if (isInitialLoad) setInitialLoading(false);
        else setRefreshing(false);
      });
  };

  // ============================================================
  // 2b. Tick down the refresh cooldown display
  // ============================================================
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const tick = setInterval(() => {
      const remainingMs = cooldownUntilRef.current - Date.now();
      setCooldownRemaining(Math.max(0, Math.ceil(remainingMs / 1000)));
    }, 1000);
    return () => clearInterval(tick);
  }, [cooldownRemaining]);

  // ============================================================
  // 4. Load assets on mount
  // ============================================================
  useEffect(() => {
    const timer = window.setTimeout(() => void loadAssets(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  // ============================================================
  // 5. Infinite scroll
  // ============================================================
  const loaderRef = useRef<HTMLDivElement>(null);

  // ============================================================
  // 6. Computed values
  // ============================================================
  const visibleAssets = assets.slice(0, visibleCount);
  const hasMore = visibleCount < assets.length;
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount((c) => c + BATCH);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);
  const selectedAssets = assets.filter((asset) =>
    selectedSymbols.includes(asset.symbol),
  );
  const averageChange = selectedAssets.length
    ? selectedAssets.reduce((sum, asset) => sum + asset.changePercent, 0) /
      selectedAssets.length
    : 0;
  const bestPerformer = selectedAssets.reduce<CryptoAsset | null>(
    (best, asset) =>
      !best || asset.changePercent > best.changePercent ? asset : best,
    null,
  );
  const weakestPerformer = selectedAssets.reduce<CryptoAsset | null>(
    (weakest, asset) =>
      !weakest || asset.changePercent < weakest.changePercent ? asset : weakest,
    null,
  );

  const toggleSelected = (symbol: string) => {
    setSelectedSymbols((symbols) =>
      symbols.includes(symbol)
        ? symbols.filter((selectedSymbol) => selectedSymbol !== symbol)
        : [...symbols, symbol],
    );
  };

  const handleAnalyzeClick = () => {
    // Every selection size now takes the grounded live-quote comparison path.
    // The single-asset branch used to call the lib/crypto-engine scoring
    // service, which is quarantined (see tsconfig `exclude`) — it emits
    // bullish/bearish asset scores, which Vision.md rules out as a trading
    // signal, and it has never compiled.
    setShowAnalysis(true);
    setAnalysisResult(null);
  };

  if (error && assets.length === 0)
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-lg text-red-500">Failed to load crypto data.</p>
        <Button variant="outline" onClick={() => void loadAssets(true)}>
          <RefreshCw className="size-4" /> Try again
        </Button>
      </div>
    );

  // ============================================================
  // 8. Main render
  // ============================================================
  return (
    <div className="space-y-8 px-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 md:text-3xl">
            Crypto Markets
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Select assets to compare their live market data, then analyze your
            selection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={refreshing || cooldownRemaining > 0}
            onClick={() => void loadAssets()}
          >
            <RefreshCw
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing
              ? "Refreshing..."
              : cooldownRemaining > 0
                ? `Refresh (${cooldownRemaining}s)`
                : "Refresh"}
          </Button>
          <Button
            size="sm"
            disabled={selectedAssets.length === 0}
            onClick={handleAnalyzeClick}
            className="border border-teal-400/30 bg-teal-400/10 text-teal-400 hover:bg-teal-400/20"
          >
            <BarChart3 className="size-3.5" />
            {`Compare ${selectedAssets.length || ""}`}
          </Button>
        </div>
      </div>

      {/* ============================================================
          ANALYSIS RESULT (Full AI analysis for single asset)
          ============================================================ */}
      {showAnalysis && selectedAssets.length === 1 && analysisResult && (
        <AnalysisModal
          asset={selectedAssets[0]}
          result={analysisResult}
          onClose={() => {
            setShowAnalysis(false);
            setAnalysisResult(null);
          }}
        />
      )}

      {/* ============================================================
          COMPARATIVE ANALYSIS (Multiple assets - existing behavior)
          ============================================================ */}
      {showAnalysis && selectedAssets.length > 1 && (
        <section className="rounded-xl border border-teal-400/25 bg-teal-400/5 p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                Selected-market analysis
              </p>
              <h2 className="mt-1 text-xl font-semibold text-gray-100">
                {selectedAssets.map((asset) => asset.ticker).join(", ")}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAnalysis(false);
                setAnalysisResult(null);
              }}
              className="rounded-md p-1 text-gray-400 hover:bg-white/10 hover:text-white"
              aria-label="Close analysis"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <AnalysisStat
              label="Average daily move"
              value={`${averageChange >= 0 ? "+" : ""}${averageChange.toFixed(2)}%`}
              positive={averageChange >= 0}
            />
            <AnalysisStat
              label="Strongest today"
              value={
                bestPerformer
                  ? `${bestPerformer.ticker} ${bestPerformer.changePercent >= 0 ? "+" : ""}${bestPerformer.changePercent.toFixed(2)}%`
                  : "—"
              }
              positive={(bestPerformer?.changePercent ?? 0) >= 0}
            />
            <AnalysisStat
              label="Weakest today"
              value={
                weakestPerformer
                  ? `${weakestPerformer.ticker} ${weakestPerformer.changePercent >= 0 ? "+" : ""}${weakestPerformer.changePercent.toFixed(2)}%`
                  : "—"
              }
              positive={(weakestPerformer?.changePercent ?? 0) >= 0}
            />
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-gray-800">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-gray-950/50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Asset</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">24h move</th>
                  <th className="px-4 py-3 font-medium">24h range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {selectedAssets.map((asset) => {
                  const rangePercent =
                    asset.low > 0
                      ? ((asset.high - asset.low) / asset.low) * 100
                      : 0;
                  const positive = asset.changePercent >= 0;
                  return (
                    <tr key={asset.symbol} className="text-gray-300">
                      <td className="px-4 py-3 font-medium">
                        {asset.name}{" "}
                        <span className="font-mono text-gray-500">
                          {asset.ticker}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        ${formatPrice(asset.price)}
                      </td>
                      <td
                        className={`px-4 py-3 font-mono ${positive ? "text-teal-400" : "text-red-500"}`}
                      >
                        {positive ? "+" : ""}
                        {asset.changePercent.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-400">
                        ${formatPrice(asset.low)} – ${formatPrice(asset.high)}{" "}
                        <span className="text-gray-500">
                          ({rangePercent.toFixed(2)}%)
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs leading-5 text-gray-500">
            This is a live market snapshot, not investment advice. Portfolio
            returns, correlation, and risk require your logged transaction and
            price history.
          </p>
        </section>
      )}

      {/* ============================================================
          ASSET CARDS
          ============================================================ */}

      {assets.length === 0 ? (
        initialLoading ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
            <Classic className="size-10" />
            <p className="text-gray-500 text-sm">Loading crypto markets...</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-6 py-12 text-center">
            <WalletCards className="mx-auto size-7 text-gray-600" />

            <p className="mt-3 font-medium text-gray-300">
              No crypto quotes are available right now.
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Check your CoinGecko key and try again shortly.
            </p>
          </div>
        )
      ) : (
        <div className="relative">
          {refreshing && (
            <div className="absolute inset-x-0 -top-1 z-10 flex justify-center">
              <span className="rounded-full border border-teal-400/20 bg-gray-950 px-3 py-1 text-xs text-teal-400 shadow-lg">
                Updating crypto prices…
              </span>
            </div>
          )}

          {error && (
            <p className="mb-3 text-sm text-red-500">
              Couldn&apos;t refresh prices. Showing the last available quotes.
            </p>
          )}

          <div
            className={`grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${
              refreshing ? "opacity-60" : "opacity-100"
            }`}
          >
            {visibleAssets.map((asset) => (
              <CryptoAssetCard
                key={asset.symbol}
                asset={asset}
                selected={selectedSymbols.includes(asset.symbol)}
                onSelect={toggleSelected}
              />
            ))}
          </div>

          {hasMore && (
            <div ref={loaderRef} className="flex justify-center p-10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVisibleCount((c) => c + BATCH)}
                className="border-gray-700 text-gray-400 hover:text-white"
              >
                Load more ({assets.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// AnalysisStat Component
// ============================================================
const AnalysisStat = ({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) => (
  <div className="rounded-lg border border-gray-800 bg-gray-950/40 p-4">
    <p className="text-xs text-gray-500">{label}</p>
    <p
      className={`mt-1 font-mono text-lg font-semibold ${
        positive ? "text-teal-400" : "text-red-500"
      }`}
    >
      {value}
    </p>
  </div>
);

export default CryptoPage;
