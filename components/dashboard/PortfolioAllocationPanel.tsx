"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

type AllocationItem = {
  symbol: string;
  name: string;
  value: number;
  percentage: number;
};

type PortfolioResponse = {
  allocation?: AllocationItem[];
};

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const PortfolioAllocationPanel = () => {
  const [allocation, setAllocation] = useState<AllocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllocation = async (isRefresh = false) => {
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
        throw new Error("Failed to load portfolio allocation");
      }

      const data: PortfolioResponse = await response.json();

      setAllocation(data.allocation ?? []);
    } catch (error) {
      console.error("Failed to fetch portfolio allocation:", error);
      setError("Unable to load allocation");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllocation();
  }, []);

  const totalValue = allocation.reduce((total, item) => total + item.value, 0);

  if (loading) {
    return (
      <section className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-950/80">
        <header className="flex items-center justify-between gap-4 border-b border-zinc-800 px-5 py-3.5">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-zinc-300">
              Allocation
            </h2>

            <span className="text-xs text-zinc-600">Portfolio composition</span>
          </div>
        </header>

        <div className="space-y-5 p-5">
          <div className="h-3 w-full animate-pulse rounded-full bg-zinc-800" />

          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
                <div className="h-3 w-16 animate-pulse rounded bg-zinc-800" />
              </div>

              <div className="h-1 w-full animate-pulse rounded-full bg-zinc-900" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-950/80">
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-zinc-300">
              Allocation
            </h2>
          </div>

          <button
            type="button"
            onClick={() => fetchAllocation(true)}
            disabled={refreshing}
            className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
            aria-label="Retry allocation"
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
            onClick={() => fetchAllocation(true)}
            disabled={refreshing}
            className="text-xs font-medium text-zinc-300 transition hover:text-white"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (allocation.length === 0) {
    return (
      <section className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-950/80">
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-zinc-300">
              Allocation
            </h2>

            <span className="text-xs text-zinc-600">Portfolio composition</span>
          </div>

          <button
            type="button"
            onClick={() => fetchAllocation(true)}
            disabled={refreshing}
            className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
            aria-label="Refresh allocation"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </header>

        <div className="flex min-h-[220px] items-center justify-center p-5">
          <div className="text-center">
            <p className="text-sm text-zinc-400">No portfolio holdings yet</p>

            <p className="mt-1 text-xs text-zinc-600">
              Add a transaction to see your allocation.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-950/80">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 border-b border-zinc-800 px-5 py-3.5">
        <div className="flex min-w-0 items-baseline gap-3">
          <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-zinc-300">
            Allocation
          </h2>

          <span className="truncate text-xs text-zinc-600">
            Portfolio composition
          </span>
        </div>

        <button
          type="button"
          onClick={() => fetchAllocation(true)}
          disabled={refreshing}
          className="rounded-md p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Refresh allocation"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 p-5">
        {/* Portfolio value */}
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
              Invested Value
            </p>

            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-zinc-100">
              {formatCurrency(totalValue)}
            </p>
          </div>

          <p className="text-xs text-zinc-600">
            {allocation.length}{" "}
            {allocation.length === 1 ? "position" : "positions"}
          </p>
        </div>

        {/* Stacked allocation bar */}
        <div
          className="mb-6 flex h-3 w-full overflow-hidden rounded-full bg-zinc-900"
          aria-label="Portfolio allocation"
        >
          {allocation.map((item, index) => {
            const width =
              totalValue > 0
                ? (item.value / totalValue) * 100
                : item.percentage;

            const segmentClass =
              index % 5 === 0
                ? "bg-zinc-200"
                : index % 5 === 1
                  ? "bg-zinc-400"
                  : index % 5 === 2
                    ? "bg-zinc-500"
                    : index % 5 === 3
                      ? "bg-zinc-600"
                      : "bg-zinc-700";

            return (
              <div
                key={item.symbol}
                title={`${item.symbol} ${formatPercent(item.percentage)}`}
                className={`h-full transition-all duration-500 ${segmentClass}`}
                style={{
                  width: `${Math.max(width, 0)}%`,
                }}
              />
            );
          })}
        </div>

        {/* Allocation list */}
        <div className="space-y-4">
          {allocation.map((item, index) => {
            const indicatorClass =
              index % 5 === 0
                ? "bg-zinc-200"
                : index % 5 === 1
                  ? "bg-zinc-400"
                  : index % 5 === 2
                    ? "bg-zinc-500"
                    : index % 5 === 3
                      ? "bg-zinc-600"
                      : "bg-zinc-700";

            return (
              <div key={item.symbol} className="group">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${indicatorClass}`}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-zinc-200">
                          {item.symbol}
                        </span>

                        <span className="truncate text-xs text-zinc-600">
                          {item.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-mono text-xs tabular-nums text-zinc-300">
                      {formatCurrency(item.value)}
                    </p>

                    <p className="mt-0.5 font-mono text-[10px] tabular-nums text-zinc-600">
                      {formatPercent(item.percentage)}
                    </p>
                  </div>
                </div>

                {/* Position weight */}
                <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-900">
                  <div
                    className="h-full rounded-full bg-zinc-500 transition-all duration-500 group-hover:bg-zinc-300"
                    style={{
                      width: `${Math.min(Math.max(item.percentage, 0), 100)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PortfolioAllocationPanel;
