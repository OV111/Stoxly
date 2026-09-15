"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";

interface WatchlistEmptyStateProps {
  onAdd?: () => void;
}

export function WatchlistEmptyState({ onAdd }: WatchlistEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-400/10 ring-1 ring-teal-400/20">
        <TrendingUp className="h-6 w-6 text-teal-400" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-zinc-200">Nothing on your watchlist yet</p>
      <p className="mt-1 text-xs text-zinc-500 max-w-[220px]">
        Track symbols you're researching before you commit capital.
      </p>
      {onAdd && (
        <button
          onClick={onAdd}
          className="mt-5 rounded-lg bg-teal-400/10 px-4 py-2 text-xs font-medium text-teal-400 ring-1 ring-teal-400/20 transition-colors hover:bg-teal-400/20"
        >
          Add your first symbol
        </button>
      )}
    </div>
  );
}

export function WatchlistSkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-zinc-800/60">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <div className="flex flex-col gap-1.5 flex-1">
            <Skeleton className="h-3.5 w-16 bg-zinc-800" />
            <Skeleton className="h-2.5 w-28 bg-zinc-800/60" />
          </div>
          <Skeleton className="h-8 w-20 bg-zinc-800" />
          <Skeleton className="h-8 w-[80px] bg-zinc-800" />
          <Skeleton className="h-3 w-24 bg-zinc-800 hidden md:block" />
          <Skeleton className="h-3 w-28 bg-zinc-800 hidden lg:block" />
          <Skeleton className="h-5 w-14 bg-zinc-800 hidden lg:block" />
        </div>
      ))}
    </div>
  );
}