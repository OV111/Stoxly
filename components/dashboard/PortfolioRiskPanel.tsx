"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type RiskMetrics = {
  beta: number;
  volatility: number;
  maxDrawdown: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  correlationMatrix: Record<string, Record<string, number>>;
};

type PortfolioResponse = {
  risk?: RiskMetrics | null;
};

type RiskMetric = {
  label: string;
  value: number;
  formattedValue: string;
  description: string;
  interpretation: string;
  barValue: number;
  barLabel: string;
};

const formatPercent = (value: number, decimals = 1) =>
  `${(value * 100).toFixed(decimals)}%`;

const formatNumber = (value: number, decimals = 2) => value.toFixed(decimals);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getBarWidth = (value: number, min: number, max: number): number => {
  if (max === min) return 50;

  return clamp(((value - min) / (max - min)) * 100, 0, 100);
};

const PortfolioRiskPanel = () => {
  const [risk, setRisk] = useState<RiskMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCorrelations, setShowCorrelations] = useState(false);

  const fetchRisk = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const response = await fetch("/api/portfolio", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load portfolio risk");
      }

      const data: PortfolioResponse = await response.json();

      setRisk(data.risk ?? null);
    } catch (error) {
      console.error("Failed to fetch portfolio risk:", error);
      setError("Unable to load risk metrics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRisk();
  }, []);

  if (loading) {
    return (
      <section className="flex flex-col rounded-lg border border-gray-800 bg-gray-900">
        <header className="border-b border-zinc-800 px-5 py-3.5">
          <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-zinc-300">
            Risk
          </h2>
        </header>

        <div className="space-y-6 p-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
                <div className="h-3 w-14 animate-pulse rounded bg-zinc-800" />
              </div>

              <div className="h-1.5 w-full animate-pulse rounded-full bg-zinc-900" />

              <div className="h-2.5 w-40 animate-pulse rounded bg-zinc-900" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex flex-col rounded-lg border border-gray-800 bg-gray-900">
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
          <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-zinc-300">
            Risk
          </h2>

          <button
            type="button"
            onClick={() => fetchRisk(true)}
            disabled={refreshing}
            className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
            aria-label="Retry risk metrics"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </header>

        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 p-5">
          <p className="text-sm text-zinc-500">{error}</p>

          <button
            type="button"
            onClick={() => fetchRisk(true)}
            disabled={refreshing}
            className="text-xs font-medium text-zinc-300 transition hover:text-white"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (!risk) {
    return (
      <section className="flex flex-col rounded-lg border border-gray-800 bg-gray-900">
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-zinc-300">
              Risk
            </h2>

            <span className="text-xs text-zinc-600">
              Portfolio risk metrics
            </span>
          </div>

          <button
            type="button"
            onClick={() => fetchRisk(true)}
            disabled={refreshing}
            className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
            aria-label="Refresh risk metrics"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </header>

        <div className="flex min-h-[220px] items-center justify-center p-5">
          <div className="text-center">
            <p className="text-sm text-zinc-400">Risk metrics unavailable</p>

            <p className="mt-1 text-xs text-zinc-600">
              More portfolio history is required to calculate risk.
            </p>
          </div>
        </div>
      </section>
    );
  }

  /*
   * IMPORTANT:
   *
   * These values are displayed according to their actual financial meaning.
   *
   * Volatility:
   * Higher = more risk.
   *
   * Sharpe:
   * Higher = generally better risk-adjusted performance.
   *
   * Beta:
   * ~1 = market-like sensitivity.
   * >1 = more sensitive than the benchmark.
   * <1 = less sensitive.
   *
   * Max drawdown:
   * More negative = worse downside.
   */

  const metrics: RiskMetric[] = [
    {
      label: "Volatility",
      value: risk.volatility,
      formattedValue: formatPercent(risk.volatility),
      description: "Annualized price variability",
      interpretation:
        risk.volatility < 0.15
          ? "Relatively low volatility"
          : risk.volatility < 0.3
            ? "Moderate volatility"
            : "High volatility",
      barValue: clamp(risk.volatility / 0.6, 0, 1) * 100,
      barLabel: "risk",
    },
    {
      label: "Sharpe Ratio",
      value: risk.sharpe,
      formattedValue: formatNumber(risk.sharpe),
      description: "Return per unit of total risk",
      interpretation:
        risk.sharpe >= 1
          ? "Strong risk-adjusted return"
          : risk.sharpe >= 0
            ? "Positive risk-adjusted return"
            : "Negative risk-adjusted return",
      barValue: getBarWidth(risk.sharpe, -1, 3),
      barLabel: "quality",
    },
    {
      label: "Beta",
      value: risk.beta,
      formattedValue: formatNumber(risk.beta),
      description: "Sensitivity to benchmark movements",
      interpretation:
        risk.beta > 1.2
          ? "More sensitive than the market"
          : risk.beta < 0.8
            ? "Less sensitive than the market"
            : "Market-like sensitivity",
      barValue: getBarWidth(risk.beta, 0, 2),
      barLabel: "exposure",
    },
    {
      label: "Max Drawdown",
      value: risk.maxDrawdown,
      formattedValue: formatPercent(risk.maxDrawdown),
      description: "Largest peak-to-trough decline",
      interpretation:
        risk.maxDrawdown > -0.1
          ? "Limited historical drawdown"
          : risk.maxDrawdown > -0.25
            ? "Moderate historical drawdown"
            : "Significant historical drawdown",
      barValue: clamp(Math.abs(risk.maxDrawdown) / 0.6, 0, 1) * 100,
      barLabel: "downside",
    },
    {
      label: "Sortino Ratio",
      value: risk.sortino,
      formattedValue: formatNumber(risk.sortino),
      description: "Return per unit of downside risk only",
      interpretation:
        risk.sortino >= 1
          ? "Strong downside-adjusted return"
          : risk.sortino >= 0
            ? "Positive downside-adjusted return"
            : "Negative downside-adjusted return",
      barValue: getBarWidth(risk.sortino, -1, 3),
      barLabel: "quality",
    },
    {
      label: "Calmar Ratio",
      value: risk.calmar,
      formattedValue: formatNumber(risk.calmar),
      description: "Return relative to max drawdown",
      interpretation:
        risk.calmar >= 1
          ? "Strong return relative to drawdown"
          : risk.calmar >= 0
            ? "Positive but modest recovery profile"
            : "Losses exceed drawdown-adjusted expectations",
      barValue: getBarWidth(risk.calmar, -1, 3),
      barLabel: "recovery",
    },
  ];

  const correlationEntries = Object.entries(risk.correlationMatrix ?? {});

  const hasCorrelations =
    correlationEntries.length > 0 &&
    correlationEntries.some(([, values]) => Object.keys(values).length > 0);

  return (
    <section className="flex flex-col rounded-lg border border-gray-800 bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 border-b border-zinc-800 px-5 py-3.5">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-zinc-300">
            Risk
          </h2>

          <span className="truncate text-xs text-zinc-600">
            Portfolio risk metrics
          </span>
        </div>

        <button
          type="button"
          onClick={() => fetchRisk(true)}
          disabled={refreshing}
          className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Refresh risk metrics"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 p-5">
        <div className="space-y-6">
          {metrics.map((metric) => (
            <div key={metric.label}>
              {/* Metric heading */}
              <div className="mb-2 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-zinc-300">
                    {metric.label}
                  </p>

                  <p className="mt-0.5 text-[10px] text-zinc-600">
                    {metric.description}
                  </p>
                </div>

                <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-zinc-200">
                  {metric.formattedValue}
                </span>
              </div>

              {/* Metric bar */}
              <div className="relative h-1.5 overflow-hidden rounded-full bg-zinc-900">
                <div
                  className="h-full rounded-full bg-zinc-500 transition-all duration-700 group-hover:bg-zinc-300"
                  style={{
                    width: `${metric.barValue}%`,
                  }}
                />
              </div>

              {/* Interpretation */}
              <p className="mt-1.5 text-[10px] text-zinc-600">
                {metric.interpretation}
              </p>
            </div>
          ))}
        </div>

        {/* Correlations */}
        {hasCorrelations && (
          <div className="mt-7 border-t border-zinc-900 pt-5">
            <button
              type="button"
              onClick={() => setShowCorrelations((current) => !current)}
              className="flex w-full items-center justify-between text-left"
            >
              <div>
                <p className="text-xs font-medium text-zinc-300">
                  Correlation Matrix
                </p>

                <p className="mt-0.5 text-[10px] text-zinc-600">
                  How closely portfolio assets move together
                </p>
              </div>

              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600 transition group-hover:text-zinc-300">
                {showCorrelations ? "Hide" : "View"}
              </span>
            </button>

            {showCorrelations && (
              <div className="mt-4 overflow-x-auto">
                <div
                  className="grid min-w-[300px]"
                  style={{
                    gridTemplateColumns: `60px repeat(${correlationEntries.length}, minmax(42px, 1fr))`,
                  }}
                >
                  {/* Empty corner */}
                  <div />

                  {/* Column headers */}
                  {correlationEntries.map(([symbol]) => (
                    <div
                      key={`header-${symbol}`}
                      className="px-1 py-2 text-center font-mono text-[9px] font-medium text-zinc-500"
                    >
                      {symbol}
                    </div>
                  ))}

                  {/* Matrix */}
                  {correlationEntries.map(([rowSymbol, correlations]) => (
                    <div key={rowSymbol} className="contents">
                      <div className="flex items-center px-1 py-2 font-mono text-[9px] font-medium text-zinc-500">
                        {rowSymbol}
                      </div>

                      {correlationEntries.map(([columnSymbol]) => {
                        const correlation = correlations[columnSymbol];

                        return (
                          <div
                            key={`${rowSymbol}-${columnSymbol}`}
                            className="flex items-center justify-center border-t border-zinc-900 px-1 py-2"
                          >
                            <span
                              className={`font-mono text-[9px] tabular-nums ${
                                correlation === undefined
                                  ? "text-zinc-800"
                                  : correlation >= 0.7
                                    ? "text-zinc-200"
                                    : correlation >= 0.3
                                      ? "text-zinc-400"
                                      : "text-zinc-600"
                              }`}
                            >
                              {correlation === undefined
                                ? "—"
                                : correlation.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default PortfolioRiskPanel;
