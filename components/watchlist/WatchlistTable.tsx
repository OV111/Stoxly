"use client";

import { useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { WatchlistRow } from "./WatchlistRow";
import { WatchlistToolbar } from "./WatchlistToolbar";
import { WatchlistEmptyState, WatchlistSkeletonRows } from "./WatchlistEmptyState";
import type { WatchlistItem, WatchlistSymbolType, SortKey, SortDir, Filter } from "@/types/watchlist";

interface WatchlistTableProps {
  items: WatchlistItem[];
  loading: boolean;
  onRemove: (symbol: string, type?: WatchlistSymbolType) => Promise<void>;
  onAddToPortfolio: (symbol: string) => void;
  onAddSymbol: () => void;
}

export function WatchlistTable({
  items,
  loading,
  onRemove,
  onAddToPortfolio,
  onAddSymbol,
}: WatchlistTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("changePercent");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter]   = useState<Filter>("all");

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const displayed = useMemo(() => {
    let list = [...items];

    if (filter === "gainers") list = list.filter((i) => (i.changePercent ?? 0) >= 0);
    if (filter === "losers")  list = list.filter((i) => (i.changePercent ?? 0) <  0);

    list.sort((a, b) => {
      let av: number, bv: number;
      switch (sortKey) {
        case "changePercent":
          av = a.changePercent ?? -Infinity;
          bv = b.changePercent ?? -Infinity;
          break;
        case "marketCap":
          av = a.marketCap ?? 0;
          bv = b.marketCap ?? 0;
          break;
        case "volume":
          av = a.volume ?? 0;
          bv = b.volume ?? 0;
          break;
        case "symbol":
          return sortDir === "asc"
            ? a.symbol.localeCompare(b.symbol)
            : b.symbol.localeCompare(a.symbol);
        default:
          av = 0; bv = 0;
      }
      return sortDir === "asc" ? av - bv : bv - av;
    });

    return list;
  }, [items, sortKey, sortDir, filter]);

  if (loading) return <WatchlistSkeletonRows count={6} />;

  if (items.length === 0) {
    return <WatchlistEmptyState onAdd={onAddSymbol} />;
  }

  return (
    <div>
      <WatchlistToolbar
        sortKey={sortKey}
        sortDir={sortDir}
        filter={filter}
        onSort={handleSort}
        onFilter={setFilter}
        total={displayed.length}
      />

      {/* column headers — desktop only */}
      <div className="hidden lg:flex items-center gap-3 px-4 py-2.5 border-b border-zinc-800/40">
        <span className="text-[10px] text-zinc-600 w-[150px] shrink-0">Symbol</span>
        <span className="text-[10px] text-zinc-600 w-[105px] shrink-0 text-right">Price / Change</span>
        <span className="text-[10px] text-zinc-600 w-20 shrink-0 hidden sm:block">7d</span>
        <span className="text-[10px] text-zinc-600 w-[70px] shrink-0 hidden md:block">Volume</span>
        <span className="text-[10px] text-zinc-600 flex-1 min-w-[120px]">52w range</span>
        <span className="text-[10px] text-zinc-600 w-[110px] shrink-0 hidden xl:block">Cap / Sector</span>
      </div>

      <AnimatePresence initial={false}>
        {displayed.map((item) => (
          <WatchlistRow
            key={`${item.symbol}-${item.type}`}
            item={item}
            onRemove={(s) => onRemove(s, item.type)}
            onAddToPortfolio={onAddToPortfolio}
          />
        ))}
      </AnimatePresence>

      {displayed.length === 0 && items.length > 0 && (
        <p className="py-10 text-center text-xs text-zinc-600">
          No symbols match this filter.
        </p>
      )}
    </div>
  );
}