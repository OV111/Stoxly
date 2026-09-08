"use client";
// import {CometSpinner} from "@/components/loading-ui/comet-spinner";
import {Classic} from "@/components/loading-ui/classic";
import { useEffect, useState } from "react";
import { BarChart3, RefreshCw, WalletCards, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import CryptoAssetCard from "@/components/crypto/CryptoAssetCard";
import { useRef } from "react";

type CryptoAsset = {
  symbol: string;
  ticker: string;
  name: string;
  image?: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
};

type AnalysisResult = {
  analysisId: string;
  status: "completed" | "processing" | "error";
  data?: any; // Full analysis data from backend
  message?: string;
};

const formatPrice = (price: number) =>
  price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

const BATCH = 12;

const CryptoPage = () => {
  const [assets, setAssets] = useState<CryptoAsset[]>([]);
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(BATCH);
  const [error, setError] = useState(false);

  // ============================================================
  // 1. Load assets from your existing API
  // ============================================================
  const loadAssets = (isInitialLoad = false) => {
    if (isInitialLoad) {
      setInitialLoading(true);
      setVisibleCount(BATCH);
      setError(false);
    } else {
      setRefreshing(true);
      setError(false);
    }

    return fetch("/api/crypto")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setError(true);
          return;
        }
        setAssets(data);
        setSelectedSymbols((symbols) =>
          symbols.filter((symbol) =>
            data.some((asset) => asset.symbol === symbol)
          )
        );
      })
      .catch(() => setError(true))
      .finally(() => {
        if (isInitialLoad) setInitialLoading(false);
        else setRefreshing(false);
      });
  };

  // ============================================================
  // 2. Run analysis for selected assets
  // ============================================================
  const runAnalysis = async (assetId: string) => {
    setAnalysisLoading(true);
    setAnalysisResult(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceRefresh: false }),
      });

      const result = await response.json();

      if (response.ok) {
        setAnalysisResult({
          status: result.status,
          analysisId: result.analysisId,
          data: result.data,
          message: result.message,
        });
        setShowAnalysis(true);
      } else {
        setAnalysisResult({
          status: "error",
          message: result.message || "Analysis failed",
        });
        setShowAnalysis(true);
      }
    } catch (error) {
      setAnalysisResult({
        status: "error",
        message: "Failed to connect to analysis service",
      });
      setShowAnalysis(true);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // ============================================================
  // 3. Poll for analysis status (if processing)
  // ============================================================
  useEffect(() => {
    if (!showAnalysis || !analysisResult || analysisResult.status !== "processing") return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/assets/${selectedSymbols[0]}/analysis`);
        const result = await response.json();

        if (result.exists && result.data) {
          setAnalysisResult({
            status: "completed",
            analysisId: result.data.analysisId,
            data: result.data,
          });
          clearInterval(pollInterval);
        }
      } catch (error) {
        // Continue polling
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [showAnalysis, analysisResult, selectedSymbols]);

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
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore]);
  const selectedAssets = assets.filter((asset) =>
    selectedSymbols.includes(asset.symbol)
  );
  const averageChange = selectedAssets.length
    ? selectedAssets.reduce((sum, asset) => sum + asset.changePercent, 0) /
      selectedAssets.length
    : 0;
  const bestPerformer = selectedAssets.reduce<CryptoAsset | null>(
    (best, asset) =>
      !best || asset.changePercent > best.changePercent ? asset : best,
    null
  );
  const weakestPerformer = selectedAssets.reduce<CryptoAsset | null>(
    (weakest, asset) =>
      !weakest || asset.changePercent < weakest.changePercent ? asset : weakest,
    null
  );

  const toggleSelected = (symbol: string) => {
    setSelectedSymbols((symbols) =>
      symbols.includes(symbol)
        ? symbols.filter((selectedSymbol) => selectedSymbol !== symbol)
        : [...symbols, symbol]
    );
  };

  const handleAnalyzeClick = () => {
    if (selectedAssets.length === 1) {
      // Single asset → run full AI analysis
      runAnalysis(selectedAssets[0].symbol);
    } else {
      // Multiple assets → show comparative analysis (existing behavior)
      setShowAnalysis(true);
      setAnalysisResult(null);
    }
  };

  // ============================================================
  // 7. Render states
  // ============================================================
  if (initialLoading)
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Classic className="size-10"/>
      </div>
    );

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
            disabled={refreshing}
            onClick={() => void loadAssets()}
          >
            <RefreshCw
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            size="sm"
            disabled={selectedAssets.length === 0 || analysisLoading}
            onClick={handleAnalyzeClick}
            className="border border-teal-400/30 bg-teal-400/10 text-teal-400 hover:bg-teal-400/20"
          >
            {analysisLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <BarChart3 className="size-3.5" />
            )}
            {analysisLoading
              ? "Analyzing..."
              : `Analyze ${selectedAssets.length || ""}`}
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
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-6 py-12 text-center">
          <WalletCards className="mx-auto size-7 text-gray-600" />
          <p className="mt-3 font-medium text-gray-300">
            No crypto quotes are available right now.
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Check your CoinGecko key and try again shortly.
          </p>
        </div>
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

// ============================================================
// AnalysisModal Component (Full AI analysis)
// ============================================================
const AnalysisModal = ({
  asset,
  result,
  onClose,
}: {
  asset: CryptoAsset;
  result: AnalysisResult;
  onClose: () => void;
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    scores: true,
    summary: true,
    technical: false,
    fundamental: false,
    risk: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (result.status === "processing") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-2xl border border-gray-800 bg-gray-950 p-8 shadow-2xl">
          <div className="flex flex-col items-center gap-6 text-center">
            <Loader2 className="size-12 animate-spin text-teal-400" />
            <div>
              <h2 className="text-xl font-semibold text-gray-100">
                Analyzing {asset.name}
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Our AI is analyzing market data, on-chain metrics, sentiment, and risks.
                This typically takes 15-30 seconds.
              </p>
            </div>
            <Button variant="outline" onClick={onClose} className="border-gray-700">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-2xl border border-red-800 bg-gray-950 p-8 shadow-2xl">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="rounded-full bg-red-900/30 p-4">
              <X className="size-8 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-100">Analysis Failed</h2>
              <p className="mt-2 text-sm text-gray-400">
                {result.message || "Something went wrong. Please try again."}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  onClose();
                  // Could retry here
                }}
                className="bg-teal-400 text-gray-950 hover:bg-teal-300"
              >
                Try Again
              </Button>
              <Button variant="outline" onClick={onClose} className="border-gray-700">
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // result.status === "completed"
  const data = result.data;

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-2xl rounded-2xl border border-gray-800 bg-gray-950 p-8 shadow-2xl">
          <p className="text-center text-gray-400">No analysis data available.</p>
          <Button variant="outline" onClick={onClose} className="mt-4 border-gray-700">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-4xl rounded-2xl border border-gray-800 bg-gray-950 p-6 shadow-2xl md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-gray-800 pb-4">
            <div>
              <div className="flex items-center gap-3">
                {asset.image && (
                  <img src={asset.image} alt={asset.name} className="size-8 rounded-full" />
                )}
                <div>
                  <h2 className="text-xl font-bold text-gray-100">
                    {asset.name} <span className="text-gray-500">({asset.ticker})</span>
                  </h2>
                  <p className="text-sm text-gray-400">
                    ${formatPrice(asset.price)} ·{" "}
                    <span className={asset.changePercent >= 0 ? "text-teal-400" : "text-red-500"}>
                      {asset.changePercent >= 0 ? "+" : ""}
                      {asset.changePercent.toFixed(2)}%
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-gray-400 hover:bg-white/10 hover:text-white"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Recommendation Banner */}
          {data.recommendation && (
            <div className="mt-4 rounded-lg border border-teal-400/20 bg-teal-400/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-400">
                    Recommendation
                  </p>
                  <p className="text-lg font-semibold text-gray-100">
                    {data.recommendation.overall.replace("_", " ").toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-400">{data.recommendation.rationale}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Confidence</p>
                  <p className="text-2xl font-bold text-teal-400">
                    {data.recommendation.confidence}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Scores */}
          {data.scores && (
            <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900/30 p-4">
              <button
                onClick={() => toggleSection("scores")}
                className="flex w-full items-center justify-between"
              >
                <h3 className="font-semibold text-gray-100">Scores</h3>
                {expandedSections.scores ? (
                  <ChevronUp className="size-4 text-gray-400" />
                ) : (
                  <ChevronDown className="size-4 text-gray-400" />
                )}
              </button>
              {expandedSections.scores && (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Object.entries(data.scores.modules || {}).map(([key, value]: [string, any]) => (
                    <div key={key} className="rounded-lg bg-gray-950/50 p-3">
                      <p className="text-xs text-gray-500">{key}</p>
                      <p className="text-lg font-semibold text-gray-100">{value.score}</p>
                      <p className="text-xs text-gray-500">Conf: {value.confidence}%</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Summary / Investment Thesis */}
          {data.analysis && (
            <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900/30 p-4">
              <button
                onClick={() => toggleSection("summary")}
                className="flex w-full items-center justify-between"
              >
                <h3 className="font-semibold text-gray-100">Investment Thesis</h3>
                {expandedSections.summary ? (
                  <ChevronUp className="size-4 text-gray-400" />
                ) : (
                  <ChevronDown className="size-4 text-gray-400" />
                )}
              </button>
              {expandedSections.summary && (
                <div className="mt-3 space-y-2 text-sm text-gray-300">
                  <p className="text-gray-200">{data.analysis.investment_thesis}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-teal-400">Bull Case</p>
                      <p className="text-sm text-gray-400">{data.analysis.bull_case}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-red-400">Bear Case</p>
                      <p className="text-sm text-gray-400">{data.analysis.bear_case}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Technical Analysis */}
          {data.technicalAnalysis && (
            <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900/30 p-4">
              <button
                onClick={() => toggleSection("technical")}
                className="flex w-full items-center justify-between"
              >
                <h3 className="font-semibold text-gray-100">Technical Analysis</h3>
                {expandedSections.technical ? (
                  <ChevronUp className="size-4 text-gray-400" />
                ) : (
                  <ChevronDown className="size-4 text-gray-400" />
                )}
              </button>
              {expandedSections.technical && (
                <div className="mt-3 text-sm text-gray-300">
                  <p className="text-gray-200">{data.technicalAnalysis.narrative}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-gray-950/50 p-2">
                      <span className="text-gray-500">RSI</span>
                      <p className="font-mono text-teal-400">
                        {data.technicalAnalysis.indicators?.rsi14?.toFixed(1) || "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-950/50 p-2">
                      <span className="text-gray-500">Trend</span>
                      <p className="font-mono text-teal-400">
                        {data.technicalAnalysis.indicators?.trend || "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-950/50 p-2">
                      <span className="text-gray-500">Score</span>
                      <p className="font-mono text-teal-400">
                        {data.technicalAnalysis.score}/100
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Risk Analysis */}
          {data.riskAnalysis && (
            <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900/30 p-4">
              <button
                onClick={() => toggleSection("risk")}
                className="flex w-full items-center justify-between"
              >
                <h3 className="font-semibold text-gray-100">Risk Analysis</h3>
                {expandedSections.risk ? (
                  <ChevronUp className="size-4 text-gray-400" />
                ) : (
                  <ChevronDown className="size-4 text-gray-400" />
                )}
              </button>
              {expandedSections.risk && (
                <div className="mt-3 text-sm text-gray-300">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full px-3 py-1 text-xs font-semibold uppercase">
                      {data.riskAnalysis.overallRiskLevel || "Unknown"}
                    </span>
                    <span className="text-gray-400">Risk Score: {data.riskAnalysis.riskScore}/100</span>
                  </div>
                  <p className="mt-2 text-gray-200">{data.riskAnalysis.summary}</p>
                </div>
              )}
            </div>
          )}

          {/* Outlook */}
          {data.recommendation?.timeHorizon && (
            <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900/30 p-4">
              <h3 className="font-semibold text-gray-100">Outlook</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-gray-950/50 p-3">
                  <p className="text-xs text-gray-500">Short-term</p>
                  <p className="font-semibold text-gray-200">
                    {data.recommendation.timeHorizon.shortTerm?.direction || "—"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {data.recommendation.timeHorizon.shortTerm?.description || ""}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-950/50 p-3">
                  <p className="text-xs text-gray-500">Medium-term</p>
                  <p className="font-semibold text-gray-200">
                    {data.recommendation.timeHorizon.mediumTerm?.direction || "—"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {data.recommendation.timeHorizon.mediumTerm?.description || ""}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-950/50 p-3">
                  <p className="text-xs text-gray-500">Long-term</p>
                  <p className="font-semibold text-gray-200">
                    {data.recommendation.timeHorizon.longTerm?.direction || "—"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {data.recommendation.timeHorizon.longTerm?.description || ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Disclaimers */}
          {data.disclaimers && data.disclaimers.length > 0 && (
            <div className="mt-4 border-t border-gray-800 pt-4">
              <p className="text-xs leading-5 text-gray-500">
                {data.disclaimers.join(" ")}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-4">
            <p className="text-xs text-gray-500">
              Analysis ID: {data.analysisId || "N/A"}
            </p>
            <Button variant="outline" onClick={onClose} className="border-gray-700">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoPage;