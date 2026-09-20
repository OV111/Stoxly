"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  WatchlistItem,
  WatchlistResponse,
  WatchlistErrorResponse,
  AddWatchlistBody,
  WatchlistSymbolType,
} from "@/types/watchlist";

export function useWatchlist() {
  const [items, setItems]     = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchWatchlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/watchlist");
      if (!res.ok) {
        const err: WatchlistErrorResponse = await res.json();
        throw new Error(err.error ?? "Failed to load watchlist");
      }
      const data: WatchlistResponse = await res.json();
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWatchlist(); }, [fetchWatchlist]);

  const addSymbol = useCallback(
    async (symbol: string, type: WatchlistSymbolType) => {
      const body: AddWatchlistBody = { symbol, type };
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err: WatchlistErrorResponse = await res.json();
        throw new Error(err.error ?? "Failed to add symbol");
      }
      await fetchWatchlist();
    },
    [fetchWatchlist]
  );

  const removeSymbol = useCallback(
    async (symbol: string, type?: WatchlistSymbolType) => {
      const resolvedType = type ?? items.find((i) => i.symbol === symbol)?.type;

      // optimistic
      setItems((prev) =>
        prev.filter((i) =>
          resolvedType
            ? !(i.symbol === symbol && i.type === resolvedType)
            : i.symbol !== symbol
        )
      );

      const params = new URLSearchParams({ symbol });
      if (resolvedType) params.set("type", resolvedType);

      const res = await fetch(`/api/watchlist?${params.toString()}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        await fetchWatchlist(); // rollback
        const err: WatchlistErrorResponse = await res.json();
        throw new Error(err.error ?? "Failed to remove symbol");
      }
    },
    [fetchWatchlist, items]
  );

  const symbols = items.map((i) => i.symbol);

  return { items, loading, error, symbols, addSymbol, removeSymbol, refetch: fetchWatchlist };
}