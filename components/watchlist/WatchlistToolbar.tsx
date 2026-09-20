"use client";

import { ArrowUpDown, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SortKey, SortDir, Filter } from "@/types/watchlist";

const SORT_LABELS: Record<SortKey, string> = {
  changePercent: "% Change",
  marketCap:     "Market cap",
  volume:        "Volume",
  symbol:        "Symbol",
};

interface WatchlistToolbarProps {
  sortKey: SortKey;
  sortDir: SortDir;
  filter: Filter;
  onSort: (key: SortKey) => void;
  onFilter: (f: Filter) => void;
  total: number;
}

export function WatchlistToolbar({
  sortKey,
  sortDir,
  filter,
  onSort,
  onFilter,
  total,
}: WatchlistToolbarProps) {
  const filters: { label: string; value: Filter }[] = [
    { label: "All", value: "all" },
    { label: "Gainers", value: "gainers" },
    { label: "Losers", value: "losers" },
  ];

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b bg-gray-800 border-gray-800">
      {/* filter pills */}
      <div className="flex items-center gap-1">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilter(f.value)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        {/* count */}
        <span className="text-[11px] text-zinc-600 tabular-nums hidden sm:block">
          {total} symbol{total !== 1 ? "s" : ""}
        </span>

        {/* sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
              <ArrowUpDown className="h-3 w-3" />
              <span>{SORT_LABELS[sortKey]}</span>
              <ChevronDown className="h-3 w-3 text-zinc-600" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-zinc-900 border-zinc-800 text-zinc-300 text-xs min-w-[140px]"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <DropdownMenuItem
                key={key}
                onClick={() => onSort(key)}
                className={`cursor-pointer text-xs ${sortKey === key ? "text-teal-400" : ""}`}
              >
                {SORT_LABELS[key]}
                {sortKey === key && (
                  <span className="ml-auto text-zinc-600">
                    {sortDir === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}