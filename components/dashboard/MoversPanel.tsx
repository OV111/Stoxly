"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

type Mover = {
  symbol: string;
  name: string;
  image: string;
  price: number;
  changePercent: number;
  marketCap?: number;
  volume?: number;
};

type MoversData = {
  gainers: Mover[];
  losers: Mover[];
};

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MoversPanel = () => {
  const [movers, setMovers] = useState<MoversData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMovers = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/crypto/movers");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch movers");
      }

      setMovers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load movers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMovers();
  }, []);

  if (loading) {
    return (
      <Panel title="CRYPTO MOVERS" slot="@movers">
        <div className="animate-pulse space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-3 bg-gray-800/30 rounded-lg space-y-2">
                <div className="h-4 bg-gray-800/60 rounded w-1/2" />
                <div className="h-6 bg-gray-800/60 rounded w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </Panel>
    );
  }

  if (error || !movers) {
    return (
      <Panel title="CRYPTO MOVERS" slot="@movers">
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <p className="text-red-500 text-sm">{error || "Failed to load movers."}</p>
          <button
            onClick={() => fetchMovers()}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </Panel>
    );
  }

  const renderMover = (mover: Mover, isGainer: boolean) => (
    <div className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-800/20 transition-colors">
      <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-400 overflow-hidden flex-shrink-0">
        {mover.image ? (
          <img src={mover.image} alt={mover.symbol} className="w-full h-full object-cover" />
        ) : (
          mover.symbol.slice(0, 2).toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-gray-300">
            {mover.symbol.toUpperCase()}
          </span>
          <span className="text-[10px] text-gray-500 truncate">{mover.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-gray-400">
            {formatCurrency(mover.price)}
          </span>
          <span
            className={`text-[11px] font-mono ${
              isGainer ? "text-teal-400" : "text-red-500"
            }`}
          >
            {isGainer ? "+" : ""}
            {mover.changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className={`p-1 rounded ${isGainer ? "text-teal-400" : "text-red-500"}`}>
        {isGainer ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
      </div>
    </div>
  );

  return (
    <Panel
      title="CRYPTO MOVERS"
      slot="@movers"
      meta="top 100 by market cap"
      action={
        <button
          onClick={() => fetchMovers(true)}
          disabled={refreshing}
          className="text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-[10px] font-semibold text-teal-400 tracking-wide">GAINERS</span>
          </div>
          <div className="space-y-1">
            {movers.gainers.slice(0, 5).map((mover) => renderMover(mover, true))}
            {movers.gainers.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-2">No gainers</p>
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-red-500" />
            <span className="text-[10px] font-semibold text-red-500 tracking-wide">LOSERS</span>
          </div>
          <div className="space-y-1">
            {movers.losers.slice(0, 5).map((mover) => renderMover(mover, false))}
            {movers.losers.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-2">No losers</p>
            )}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-gray-600 text-center mt-3">
        Last 24 hours · Top 100 assets
      </p>
    </Panel>
  );
};

export default MoversPanel;