"use client";

import { useEffect, useState, useCallback } from "react";
import Panel from "@/components/dashboard/Panel";
import { RefreshCw, Plus, X } from "lucide-react";

type WatchlistItem = {
  id: string;
  symbol: string;
  name: string;
  type: "stock" | "crypto";
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  image?: string;
};

type WatchlistData = {
  items: WatchlistItem[];
};

const formatCurrency = (value: number) =>
  `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const WatchlistPanel = () => {
  const [watchlist, setWatchlist] = useState<WatchlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchWatchlist = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);

    // Replace your try block in fetchWatchlist:
    try {
      const response = await fetch("/api/watchlist");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch watchlist");
      }

      // Normalize: ensure items is always an array
      setWatchlist({
        items: Array.isArray(data.items) ? data.items : [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load watchlist");
      setWatchlist(null);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  const addSymbol = async () => {
    if (!newSymbol.trim()) return;

    setAdding(true);
    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: newSymbol.toUpperCase().trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to add symbol");
      }

      setNewSymbol("");
      await fetchWatchlist();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add symbol");
    } finally {
      setAdding(false);
    }
  };

  const removeSymbol = async (symbol: string) => {
    try {
      const response = await fetch(`/api/watchlist?symbol=${symbol}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove symbol");
      }

      await fetchWatchlist();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove symbol");
    }
  };

  if (loading) {
    return (
      <Panel title="WATCHLIST" slot="@watchlist">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2 rounded bg-gray-800/30"
            >
              <div className="w-10 h-10 rounded-full bg-gray-800/60" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-800/60 rounded w-1/4" />
                <div className="h-3 bg-gray-800/60 rounded w-1/3" />
              </div>
              <div className="h-6 bg-gray-800/60 rounded w-16" />
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title="WATCHLIST" slot="@watchlist">
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <p className="text-red-500 text-sm">{error}</p>
          <button
            onClick={() => fetchWatchlist()}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </Panel>
    );
  }

  const hasItems = watchlist && watchlist.items.length > 0;

  return (
    <Panel
      title="WATCHLIST"
      slot="@watchlist"
      action={
        <button
          onClick={() => fetchWatchlist(true)}
          disabled={refreshing}
          className="text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
        </button>
      }
    >
      {/* Add symbol input */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSymbol()}
          placeholder="Add symbol (e.g., AAPL)"
          className="flex-1 px-3 py-1.5 text-sm bg-gray-800/60 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
          disabled={adding}
        />
        <button
          onClick={addSymbol}
          disabled={adding || !newSymbol.trim()}
          className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {hasItems ? (
        <div className="space-y-2">
          {watchlist.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800/30 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-semibold text-gray-400 overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.symbol}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  item.symbol.slice(0, 2)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-200">
                    {item.symbol}
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {item.price !== null ? formatCurrency(item.price) : "—"}
                  </span>
                  {item.changePercent !== null && (
                    <span
                      className={`text-xs font-mono ${
                        item.changePercent >= 0
                          ? "text-teal-400"
                          : "text-red-500"
                      }`}
                    >
                      {item.changePercent >= 0 ? "+" : ""}
                      {item.changePercent.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeSymbol(item.symbol)}
                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500">No watchlist items yet.</p>
          <p className="text-xs text-gray-600 mt-1">
            Search and add symbols above.
          </p>
        </div>
      )}
    </Panel>
  );
};

export default WatchlistPanel;
