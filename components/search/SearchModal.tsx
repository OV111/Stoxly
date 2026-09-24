"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TrendingUp, Coins, Building2, Plus, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSearch } from "@/hooks/useSearch";
import { useWatchlist } from "@/hooks/useWatchlist";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Instrument, InstrumentType } from "@/types/search";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Static shortcuts shown before the user types anything — a fast path to
// the symbols people look up most, so the modal isn't a blank box on open.
const SUGGESTIONS: { symbol: string; name: string; type: InstrumentType }[] = [
  { symbol: "AAPL", name: "Apple Inc.", type: "stock" },
  { symbol: "TSLA", name: "Tesla, Inc.", type: "stock" },
  { symbol: "NVDA", name: "NVIDIA Corporation", type: "stock" },
  { symbol: "BTC", name: "Bitcoin", type: "crypto" },
  { symbol: "ETH", name: "Ethereum", type: "crypto" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", type: "etf" },
];

const typeIcon: Record<InstrumentType, React.ReactNode> = {
  stock: <Building2 className="h-4 w-4" />,
  crypto: <Coins className="h-4 w-4" />,
  etf: <TrendingUp className="h-4 w-4" />,
  index: <TrendingUp className="h-4 w-4" />,
};

export default function SearchModal({ open, onOpenChange }: SearchModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-[15%] max-w-xl translate-y-0 gap-0 overflow-hidden rounded-2xl border-border/60 bg-[#0a0a0a] p-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        {/* Keyed to `open` so the palette's state (query, results, input)
            starts fresh each time it mounts, instead of persisting stale
            state from the previous session and needing a reset effect. */}
        {open && <SearchPalette onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function SearchPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { results, isLoading, query, handleSearch } = useSearch();
  const { items, addSymbol } = useWatchlist();
  const [inputValue, setInputValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const onChange = (value: string) => {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(value), 300);
  };

  const getIsAdded = (symbol: string, type: string) =>
    items.some((i) => i.symbol === symbol && i.type === type);

  const handleAdd = async (instrument: Instrument) => {
    try {
      await addSymbol(instrument.symbol, instrument.type);
      toast.success("Added to watchlist", {
        description: `${instrument.symbol} (${instrument.name}) added successfully.`,
      });
    } catch {
      toast.error("Failed to add", {
        description: "Unable to add to watchlist. Please try again.",
      });
    }
  };

  const handleViewAll = () => {
    onClose();
    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
  };

  const goToSymbol = (symbol: string) => {
    onClose();
    router.push(`/stock/${symbol}`);
  };

  const showSuggestions = inputValue.trim().length < 2;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="What are you searching for?"
          className="flex-1 bg-transparent text-lg text-foreground placeholder:text-muted-foreground/70 outline-none"
        />
        {isLoading && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
        )}
        <kbd className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
          Esc
        </kbd>
      </div>

      <div className="scrollbar-hide-default max-h-[50vh] overflow-y-auto p-3">
        {showSuggestions ? (
          <div>
            <p className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">
              Suggestions
            </p>
            <div className="space-y-0.5">
              {SUGGESTIONS.map((s) => (
                <ResultRow
                  key={`${s.type}:${s.symbol}`}
                  symbol={s.symbol}
                  name={s.name}
                  type={s.type}
                  onClick={() => goToSymbol(s.symbol)}
                />
              ))}
            </div>
          </div>
        ) : isLoading ? (
          <div className="space-y-0.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2">
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">No results found for &ldquo;{query}&rdquo;</p>
            <p className="mt-1 text-xs">
              Try a different keyword or check the spelling
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {results.map((instrument) => (
              <ResultRow
                key={`${instrument.type}:${instrument.symbol}`}
                symbol={instrument.symbol}
                name={instrument.name}
                type={instrument.type}
                logo={instrument.logo}
                onClick={() => goToSymbol(instrument.symbol)}
                isAdded={getIsAdded(instrument.symbol, instrument.type)}
                onAdd={() => handleAdd(instrument)}
              />
            ))}
          </div>
        )}
      </div>

      {!showSuggestions && query.length >= 2 && (
        <button
          type="button"
          onClick={handleViewAll}
          className="w-full border-t border-border px-5 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          View all results for &ldquo;{query}&rdquo;
        </button>
      )}
    </>
  );
}

interface ResultRowProps {
  symbol: string;
  name: string;
  type: InstrumentType;
  logo?: string;
  onClick: () => void;
  isAdded?: boolean;
  onAdd?: () => void;
}

// Shared row used for both the static suggestions and live search results,
// so results render with the same look the suggestions already use.
function ResultRow({
  symbol,
  name,
  type,
  logo,
  onClick,
  isAdded,
  onAdd,
}: ResultRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-[#1a1a1e]"
    >
      {logo ? (
        <img
          src={logo}
          alt={`${symbol} logo`}
          className="h-8 w-8 shrink-0 rounded-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {typeIcon[type]}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-foreground">
          {symbol}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {name}
        </span>
      </span>

      {onAdd && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!isAdded) onAdd();
          }}
          disabled={isAdded}
          aria-label={isAdded ? "Already in watchlist" : "Add to watchlist"}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
            isAdded
              ? "text-green-500"
              : "text-muted-foreground hover:bg-background hover:text-foreground",
          )}
        >
          {isAdded ? (
            <Check className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}
