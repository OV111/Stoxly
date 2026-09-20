"use client";

import { ArrowUpRight, ArrowDownRight, BriefcaseBusiness } from "lucide-react";

const mockData = {
  holdingsValue: 42851.32,
  costBasis: 38030.0,
  unrealizedPnl: 4821.32,
  unrealizedPnlPct: 12.68,
  realizedPnl: 1284.5,
  twr: 15.41,
  holdingsCount: 15,
};

function formatCurrency(value: number) {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPnl(value: number) {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const PortfolioSummary = () => {
  const {
    holdingsValue,
    costBasis,
    unrealizedPnl,
    unrealizedPnlPct,
    realizedPnl,
    twr,
    holdingsCount,
  } = mockData;

  const isProfit = unrealizedPnl >= 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BriefcaseBusiness
            className="h-3.5 w-3.5 text-teal-400"
            strokeWidth={1.75}
          />

          <h2 className="text-xs font-bold text-blue-400 tracking-widest">
            Portfolio
          </h2>
        </div>

        <span className="text-[10px] font-mono text-gray-500 bg-gray-800/80 border border-gray-700 rounded px-1.5 py-0.5">
          {holdingsCount} holdings
        </span>
      </div>

      {/* Main value */}
      <div>
        <p className="text-3xl font-semibold tracking-tight text-gray-100 tabular-nums">
          {formatCurrency(holdingsValue)}
        </p>

        <p className="mt-1 text-[10px] uppercase tracking-widest text-gray-600">
          Portfolio Value
        </p>
      </div>

      {/* Unrealized P&L */}
      <div className="mt-4 flex items-center gap-2">
        <div
          className={`flex items-center gap-1 ${
            isProfit ? "text-teal-400" : "text-red-500"
          }`}
        >
          {isProfit ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}

          <span className="text-sm font-semibold tabular-nums">
            {formatPnl(unrealizedPnl)}
          </span>
        </div>

        <span className="text-xs text-gray-600">·</span>

        <span
          className={`text-sm font-medium tabular-nums ${
            isProfit ? "text-teal-400" : "text-red-500"
          }`}
        >
          {unrealizedPnlPct >= 0 ? "+" : ""}
          {unrealizedPnlPct.toFixed(2)}%
        </span>

        <span className="text-[10px] text-gray-600">unrealized</span>
      </div>

      {/* Divider */}
      <div className="my-5 border-t border-gray-800" />

      {/* Main metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-600">
            Cost Basis
          </p>

          <p className="mt-1 text-sm font-semibold text-gray-200 tabular-nums">
            {formatCurrency(costBasis)}
          </p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-600">
            Market Value
          </p>

          <p className="mt-1 text-sm font-semibold text-gray-200 tabular-nums">
            {formatCurrency(holdingsValue)}
          </p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-600">
            Realized P&L
          </p>

          <p
            className={`mt-1 text-sm font-semibold tabular-nums ${
              realizedPnl >= 0 ? "text-teal-400" : "text-red-500"
            }`}
          >
            {formatPnl(realizedPnl)}
          </p>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-600">
            TWR
          </p>

          <p
            className={`mt-1 text-sm font-semibold tabular-nums ${
              twr >= 0 ? "text-teal-400" : "text-red-500"
            }`}
          >
            {twr >= 0 ? "+" : ""}
            {twr.toFixed(2)}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default PortfolioSummary;
