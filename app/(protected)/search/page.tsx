"use client";

import { useState, useEffect, useCallback } from "react";
import { SearchInput } from "@/components/search/SearchInput";
import { SearchResultsList } from "@/components/search/SearchResultsList";
import { Instrument } from "@/types/search";
import { toast } from "sonner"; //

export default function SearchPage() {
  const [results, setResults] = useState<Instrument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [watchlistSymbols, setWatchlistSymbols] = useState<Set<string>>(
    new Set(),
  );

  // Fetch current watchlist
  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch("/api/watchlist");
      if (res.ok) {
        const data = await res.json();
        const symbols = new Set<string>();
        data.forEach((item: any) => {
          symbols.add(`${item.type}:${item.symbol}`);
        });
        setWatchlistSymbols(symbols);
      }
    } catch (error) {
      console.error("[SearchPage] Failed to fetch watchlist:", error);
    }
  }, []);

  // Load watchlist on mount
  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // Perform search
  const handleSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    setQuery(trimmed);

    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        throw new Error(`Search failed: ${res.status}`);
      }
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error("[SearchPage] Search error:", error);
      toast.error("Search failed", {
        description: "Unable to fetch results. Please try again.",
      });
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add to watchlist
  const handleAdd = useCallback(async (instrument: Instrument) => {
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: instrument.symbol,
          type: instrument.type,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to add: ${res.status}`);
      }

      // Update local watchlist set
      setWatchlistSymbols((prev) => {
        const next = new Set(prev);
        next.add(`${instrument.type}:${instrument.symbol}`);
        return next;
      });

      toast.success("Added to watchlist", {
        description: `${instrument.symbol} (${instrument.name}) added successfully.`,
      });
    } catch (error) {
      console.error("[SearchPage] Add failed:", error);
      toast.error("Failed to add", {
        description: "Unable to add to watchlist. Please try again.",
      });
    }
  }, []);

  const getIsAdded = useCallback(
    (symbol: string, type: string) => {
      return watchlistSymbols.has(`${type}:${symbol}`);
    },
    [watchlistSymbols],
  );

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground">
          Find stocks, ETFs, and cryptocurrencies to add to your watchlist
        </p>
      </div>

      {/* Search Input */}
      <SearchInput
        onSearch={handleSearch}
        isLoading={isLoading}
        placeholder="Search for stocks, ETFs, or crypto..."
      />

      {/* Results */}
      <SearchResultsList
        results={results}
        isLoading={isLoading}
        query={query}
        onAdd={handleAdd}
        getIsAdded={getIsAdded}
      />
    </div>
  );
}
