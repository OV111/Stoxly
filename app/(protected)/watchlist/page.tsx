"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WatchlistTable } from "@/components/watchlist/WatchlistTable";
import { AddSymbolInput } from "@/components/watchlist/AddSymbolInput";
import { WatchlistAddButton } from "@/components/watchlist/WatchlistAddButton";
import { useWatchlist } from "@/hooks/useWatchlist";
import { TrendingUp, RefreshCw } from "lucide-react";
import type { WatchlistSymbolType } from "@/types/watchlist";

export default function WatchlistPage() {
  const router = useRouter();
  const { items, loading, error, symbols, addSymbol, removeSymbol, refetch } =
    useWatchlist();
  const [addOpen, setAddOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAdd = async (symbol: string, type: WatchlistSymbolType) => {
    await addSymbol(symbol, type);
  };

  const handleAddToPortfolio = (symbol: string) => {
    router.push(`/portfolio/add?symbol=${symbol}`);
  };

  return (
    <div className="min-h-screen ">
      <div className="mx-10">
        <div className="flex flex-wrap items-end justify-between gap-10 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-100 md:text-3xl">
              Watchlist
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {items.length} / 50 symbol{items.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              title="Refresh prices"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-40"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>

            <AddSymbolInput
              open={addOpen}
              onOpenChange={setAddOpen}
              onAdd={handleAdd}
              existingItems={items}
            >
              <WatchlistAddButton  />
            </AddSymbolInput>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error} —{" "}
            <button
              onClick={refetch}
              className="underline underline-offset-2 hover:text-red-300"
            >
              try again
            </button>
          </div>
        )}

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 overflow-hidden">
          <WatchlistTable
            items={items}
            loading={loading}
            onRemove={removeSymbol}
            onAddToPortfolio={handleAddToPortfolio}
            onAddSymbol={() => setAddOpen(true)}
          />
        </div>
      </div>
    </div>
  );
}
