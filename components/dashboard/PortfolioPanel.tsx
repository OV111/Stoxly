"use client";

import { useEffect, useState, useCallback } from "react";
import Panel from "@/components/dashboard/Panel";
import { RefreshCw } from "lucide-react";

type ReturnMetrics = {
  twr: number;
  mwr: number;
};

type RiskMetrics = {
  beta: number;
  volatility: number;
  maxDrawdown: number;
  sharpe: number;
  correlationMatrix: Record<string, Record<string, number>>;
};

type PortfolioData = {
  holdingsValue: number;
  costBasis: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  returns: ReturnMetrics | null;
  risk: RiskMetrics | null;
};

const asPercent = (decimal: number) => `${(decimal * 100).toFixed(2)}%`;
const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PortfolioPanel = () => {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPortfolio = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/portfolio");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch portfolio");
      }

      if (data && typeof data.holdingsValue === "number") {
        setPortfolio(data);
      } else {
        throw new Error("Invalid portfolio data format");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load portfolio");
      setPortfolio(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  if (loading) {
    return (
      <Panel title="PORTFOLIO" slot="@portfolio" meta="settled + pending">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800/60 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="h-4 bg-gray-800/60 rounded w-1/2" />
              <div className="h-10 bg-gray-800/60 rounded w-2/3" />
              <div className="flex gap-8">
                <div className="h-12 bg-gray-800/60 rounded w-1/3" />
                <div className="h-12 bg-gray-800/60 rounded w-1/3" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-800/60 rounded w-1/2" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-20 bg-gray-800/60 rounded" />
                <div className="h-20 bg-gray-800/60 rounded" />
              </div>
            </div>
          </div>
        </div>
      </Panel>
    );
  }

  if (error || !portfolio) {
    return (
      <Panel title="PORTFOLIO" slot="@portfolio" meta="settled + pending">
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <p className="text-red-500 text-sm">{error || "Failed to load portfolio."}</p>
          <button
            onClick={() => fetchPortfolio()}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </Panel>
    );
  }

  const isUnrealizedPositive = portfolio.unrealizedPnl >= 0;
  const hasReturns = portfolio.returns !== null;
  const hasRisk = portfolio.risk !== null;

  return (
    <Panel
      title="PORTFOLIO"
      slot="@portfolio"
      meta="settled + pending"
      action={
        <button
          onClick={() => fetchPortfolio(true)}
          disabled={refreshing}
          className="text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column - Holdings */}
        <div>
          <p className="text-[11px] font-semibold text-gray-500 tracking-wide mb-1">
            HOLDINGS VALUE
          </p>
          <p className="text-3xl font-mono font-bold text-gray-100">
            {formatCurrency(portfolio.holdingsValue)}
          </p>
          <p className="text-sm font-mono mt-1 text-gray-500">— today</p>

          <div className="flex gap-8 mt-4">
            <div>
              <p className="text-[11px] font-semibold text-gray-500 tracking-wide mb-1">
                COST BASIS
              </p>
              <p className="text-sm font-mono text-gray-300">
                {formatCurrency(portfolio.costBasis)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 tracking-wide mb-1">
                UNREALIZED
              </p>
              <p
                className={`text-sm font-mono ${
                  isUnrealizedPositive ? "text-teal-400" : "text-red-500"
                }`}
              >
                {isUnrealizedPositive ? "+" : ""}
                {formatCurrency(portfolio.unrealizedPnl)}{" "}
                ({isUnrealizedPositive ? "+" : ""}
                {portfolio.unrealizedPnlPct.toFixed(2)}%)
              </p>
            </div>
          </div>
        </div>

        {/* Right column - Returns & Risk */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-gray-500 tracking-wide">
              RETURN, ANNUALIZED
            </p>
          </div>

          {hasReturns ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-semibold text-gray-300">TWR</span>
                    <span className="text-[9px] font-mono text-blue-400 bg-blue-500/10 rounded px-1 py-0.5">
                      GIPS
                    </span>
                  </div>
                  <p
                    className={`text-lg font-mono font-bold ${
                      portfolio.returns.twr >= 0 ? "text-teal-400" : "text-red-500"
                    }`}
                  >
                    {portfolio.returns.twr >= 0 ? "+" : ""}
                    {asPercent(portfolio.returns.twr)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                    Cash flows neutralized. Approximated at flow boundaries.
                  </p>
                </div>
                <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-semibold text-gray-300">MWR</span>
                    <span className="text-[9px] font-mono text-blue-400 bg-blue-500/10 rounded px-1 py-0.5">
                      XIRR
                    </span>
                  </div>
                  <p
                    className={`text-lg font-mono font-bold ${
                      portfolio.returns.mwr >= 0 ? "text-teal-400" : "text-red-500"
                    }`}
                  >
                    {portfolio.returns.mwr >= 0 ? "+" : ""}
                    {asPercent(portfolio.returns.mwr)}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-1 leading-snug">
                    Newton-Raphson, bisection fallback.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800 text-[11px] font-mono">
                <span className="text-gray-500">Δ TWR-MWR</span>
                <span className={Math.abs(portfolio.returns.twr - portfolio.returns.mwr) > 0.05 ? "text-amber-400" : "text-gray-400"}>
                  {((portfolio.returns.twr - portfolio.returns.mwr) * 100).toFixed(2)} pp
                </span>
              </div>
            </>
          ) : (
            <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">Add transactions to see returns</p>
            </div>
          )}

          {hasRisk && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <p className="text-[11px] font-semibold text-gray-500 tracking-wide mb-2">RISK</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-gray-500">BETA</p>
                  <p className={`text-sm font-mono ${Math.abs(portfolio.risk.beta) > 1.2 ? "text-amber-400" : "text-gray-200"}`}>
                    {portfolio.risk.beta.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">VOL</p>
                  <p className={`text-sm font-mono ${portfolio.risk.volatility > 0.3 ? "text-amber-400" : "text-gray-200"}`}>
                    {asPercent(portfolio.risk.volatility)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">MAX DD</p>
                  <p className="text-sm font-mono text-red-500">
                    {asPercent(portfolio.risk.maxDrawdown)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">SHARPE</p>
                  <p className={`text-sm font-mono ${portfolio.risk.sharpe < 0.5 ? "text-amber-400" : "text-gray-200"}`}>
                    {portfolio.risk.sharpe.toFixed(2)}
                  </p>
                </div>
              </div>

              {Object.keys(portfolio.risk.correlationMatrix).length > 1 && (
                <div className="mt-3 pt-3 border-t border-gray-800">
                  <p className="text-[10px] text-gray-500 tracking-wide mb-2">CORRELATION MATRIX</p>
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full">
                      <div className="grid gap-0.5" style={{ gridTemplateColumns: `auto repeat(${Object.keys(portfolio.risk.correlationMatrix).length}, minmax(50px, 1fr))` }}>
                        <div className="p-1 text-[10px] text-gray-500 font-medium"></div>
                        {Object.keys(portfolio.risk.correlationMatrix).map((symbol) => (
                          <div key={symbol} className="p-1 text-[10px] text-gray-500 font-medium text-center truncate">
                            {symbol}
                          </div>
                        ))}
                        {Object.entries(portfolio.risk.correlationMatrix).map(([rowSymbol, correlations]) => (
                          <>
                            <div key={`label-${rowSymbol}`} className="p-1 text-[10px] text-gray-500 font-medium truncate">
                              {rowSymbol}
                            </div>
                            {Object.values(correlations).map((value, idx) => {
                              const absVal = Math.abs(value);
                              let bgColor = "bg-gray-800/30";
                              let textColor = "text-gray-400";
                              if (absVal > 0.7) {
                                bgColor = value > 0 ? "bg-teal-500/30" : "bg-red-500/30";
                                textColor = value > 0 ? "text-teal-400" : "text-red-400";
                              } else if (absVal > 0.3) {
                                bgColor = "bg-gray-600/30";
                                textColor = "text-gray-300";
                              }
                              return (
                                <div key={`${rowSymbol}-${idx}`} className={`p-1 ${bgColor} rounded text-center`}>
                                  <span className={`text-[10px] font-mono ${textColor}`}>
                                    {value.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
};

export default PortfolioPanel;