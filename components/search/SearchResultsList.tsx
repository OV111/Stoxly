"use client";

import { Instrument } from "@/types/search";
import { InstrumentCard } from "./InstrumentCard";
import { cn } from "@/lib/utils";

interface SearchResultsListProps {
  results: Instrument[];
  isLoading?: boolean;
  query?: string;
  onAdd?: (instrument: Instrument) => Promise<void> | void;
  getIsAdded?: (symbol: string, type: string) => boolean;
  compact?: boolean;
  className?: string;
}

export function SearchResultsList({
  results,
  isLoading = false,
  query = "",
  onAdd,
  getIsAdded,
  compact = false,
  className,
}: SearchResultsListProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg bg-muted/50 h-14 flex items-center px-4"
          >
            <div className="h-8 w-8 rounded-full bg-muted/30 mr-3" />
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-20 bg-muted/30 rounded" />
              <div className="h-3 w-32 bg-muted/30 rounded" />
            </div>
            <div className="h-8 w-16 bg-muted/30 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0 && query.length >= 2) {
    return (
      <div className={cn(
        "text-center py-8 text-muted-foreground",
        className
      )}>
        <p className="text-sm">No results found for `{query}`</p>
        <p className="text-xs mt-1">Try a different keyword or check the spelling</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={cn(
        "text-center py-8 text-muted-foreground",
        className
      )}>
        <p className="text-sm">Start typing to search for stocks and crypto</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {results.map((instrument) => {
        const isAdded = getIsAdded
          ? getIsAdded(instrument.symbol, instrument.type)
          : false;

        return (
          <InstrumentCard
            key={`${instrument.type}:${instrument.symbol}`}
            instrument={instrument}
            isAdded={isAdded}
            onAdd={onAdd}
            compact={compact}
          />
        );
      })}
    </div>
  );
}