"use client";
// import {CometSpinner} from "@/components/loading-ui/comet-spinner";
import { useState } from "react";
import { X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CryptoAsset, AnalysisResult } from "@/types/crypro";

const formatPrice = (price: number) =>
  price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

export const AnalysisModal = ({
  asset,
  result,
  onClose,
}: {
  asset: CryptoAsset;
  result: AnalysisResult;
  onClose: () => void;
}) => {
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
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
                Our AI is analyzing market data, on-chain metrics, sentiment,
                and risks. This typically takes 15-30 seconds.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-700"
            >
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
              <h2 className="text-xl font-semibold text-gray-100">
                Analysis Failed
              </h2>
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
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-700"
              >
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
          <p className="text-center text-gray-400">
            No analysis data available.
          </p>
          <Button
            variant="outline"
            onClick={onClose}
            className="mt-4 border-gray-700"
          >
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
                  <img
                    src={asset.image}
                    alt={asset.name}
                    className="size-8 rounded-full"
                  />
                )}
                <div>
                  <h2 className="text-xl font-bold text-gray-100">
                    {asset.name}{" "}
                    <span className="text-gray-500">({asset.ticker})</span>
                  </h2>
                  <p className="text-sm text-gray-400">
                    ${formatPrice(asset.price)} ·{" "}
                    <span
                      className={
                        asset.changePercent >= 0
                          ? "text-teal-400"
                          : "text-red-500"
                      }
                    >
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
                    {data.recommendation.overall
                      .replace("_", " ")
                      .toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-400">
                    {data.recommendation.rationale}
                  </p>
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
                  {Object.entries(data.scores.modules || {}).map(
                    ([key, value]: [string, any]) => (
                      <div key={key} className="rounded-lg bg-gray-950/50 p-3">
                        <p className="text-xs text-gray-500">{key}</p>
                        <p className="text-lg font-semibold text-gray-100">
                          {value.score}
                        </p>
                        <p className="text-xs text-gray-500">
                          Conf: {value.confidence}%
                        </p>
                      </div>
                    ),
                  )}
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
                <h3 className="font-semibold text-gray-100">
                  Investment Thesis
                </h3>
                {expandedSections.summary ? (
                  <ChevronUp className="size-4 text-gray-400" />
                ) : (
                  <ChevronDown className="size-4 text-gray-400" />
                )}
              </button>
              {expandedSections.summary && (
                <div className="mt-3 space-y-2 text-sm text-gray-300">
                  <p className="text-gray-200">
                    {data.analysis.investment_thesis}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-teal-400">
                        Bull Case
                      </p>
                      <p className="text-sm text-gray-400">
                        {data.analysis.bull_case}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-red-400">
                        Bear Case
                      </p>
                      <p className="text-sm text-gray-400">
                        {data.analysis.bear_case}
                      </p>
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
                <h3 className="font-semibold text-gray-100">
                  Technical Analysis
                </h3>
                {expandedSections.technical ? (
                  <ChevronUp className="size-4 text-gray-400" />
                ) : (
                  <ChevronDown className="size-4 text-gray-400" />
                )}
              </button>
              {expandedSections.technical && (
                <div className="mt-3 text-sm text-gray-300">
                  <p className="text-gray-200">
                    {data.technicalAnalysis.narrative}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg bg-gray-950/50 p-2">
                      <span className="text-gray-500">RSI</span>
                      <p className="font-mono text-teal-400">
                        {data.technicalAnalysis.indicators?.rsi14?.toFixed(1) ||
                          "—"}
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
                    <span className="text-gray-400">
                      Risk Score: {data.riskAnalysis.riskScore}/100
                    </span>
                  </div>
                  <p className="mt-2 text-gray-200">
                    {data.riskAnalysis.summary}
                  </p>
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
                    {data.recommendation.timeHorizon.shortTerm?.direction ||
                      "—"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {data.recommendation.timeHorizon.shortTerm?.description ||
                      ""}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-950/50 p-3">
                  <p className="text-xs text-gray-500">Medium-term</p>
                  <p className="font-semibold text-gray-200">
                    {data.recommendation.timeHorizon.mediumTerm?.direction ||
                      "—"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {data.recommendation.timeHorizon.mediumTerm?.description ||
                      ""}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-950/50 p-3">
                  <p className="text-xs text-gray-500">Long-term</p>
                  <p className="font-semibold text-gray-200">
                    {data.recommendation.timeHorizon.longTerm?.direction || "—"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {data.recommendation.timeHorizon.longTerm?.description ||
                      ""}
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
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-700"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
