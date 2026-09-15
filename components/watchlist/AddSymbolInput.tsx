"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, X, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { WatchlistSymbolType } from "@/types/watchlist";
import type { Instrument } from "@/types/search";

interface AddSymbolInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (symbol: string, type: WatchlistSymbolType) => Promise<void>;
  existingItems?: { symbol: string; type: WatchlistSymbolType }[];
  existingSymbols?: string[];
  children: React.ReactNode;
}

export function AddSymbolInput({
  open,
  onOpenChange,
  onAdd,
  existingItems,
  existingSymbols,
  children,
}: AddSymbolInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Instrument[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  const existingSet = useMemo(() => {
    const set = new Set<string>();
    if (existingItems) {
      for (const item of existingItems) {
        set.add(`${item.symbol.toUpperCase()}:${item.type}`);
      }
    } else if (existingSymbols) {
      for (const s of existingSymbols) {
        set.add(s.toUpperCase());
      }
    }
    return set;
  }, [existingItems, existingSymbols]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      abortControllerRef.current?.abort();
      setQuery("");
      setResults([]);
      setAddError(null);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      if (!res.ok) {
        setResults([]);
        return;
      }
      const data: Instrument[] = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setResults([]);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setSearching(false);
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setAddError(null);
    clearTimeout(debounceRef.current);
    if (val.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleAdd = async (r: Instrument) => {
    const key = `${r.symbol.toUpperCase()}:${r.type}`;
    if (addingKey) return;
    setAddingKey(key);
    setAddError(null);
    try {
      await onAdd(r.symbol, r.type);
      onOpenChange(false); // only close on success
    } catch (e) {
      // stay open — show error inline
      setAddError(e instanceof Error ? e.message : "Failed to add symbol");
      setAddingKey(null); // reset so user can retry
    } finally {
      setAddingKey((prev) => (prev === key ? null : prev));
    }
  };

  const TYPE_LABEL: Record<WatchlistSymbolType, string> = {
    stock: "Stock",
    crypto: "Crypto",
    etf: "ETF",
    index: "Index",
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-100 p-0 bg-zinc-900 border border-zinc-800 shadow-2xl rounded-xl overflow-hidden"
        align="end"
        sideOffset={8}
      >
        {/* search input */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-zinc-800">
          <Search className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleChange}
            placeholder="Ticker or company name…"
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
              }}
            >
              <X className="h-3.5 w-3.5 text-zinc-500 hover:text-zinc-300" />
            </button>
          )}
          {searching && (
            <Loader2 className="h-3.5 w-3.5 text-zinc-500 animate-spin" />
          )}
        </div>

        {/* error */}
        {addError && (
          <div className="px-4 py-2 text-xs text-red-400 bg-red-500/10 border-b border-zinc-800">
            {addError}
          </div>
        )}

        {/* results */}
        <div
          className="max-h-74 overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#3f3f46 transparent",
          }}
        >
          {query.length < 2 && (
            <p className="px-4 py-5 text-xs text-zinc-600 text-center">
              Type at least 2 characters to search
            </p>
          )}
          {query.length >= 2 && !searching && results.length === 0 && (
            <p className="px-4 py-5 text-xs text-zinc-500 text-center">
              No results for "{query}"
            </p>
          )}
          {results.map((r) => {
            const itemKey = `${r.symbol.toUpperCase()}:${r.type}`;
            const already = existingItems
              ? existingSet.has(itemKey)
              : existingSet.has(r.symbol.toUpperCase());
            const isAdding = addingKey === itemKey;
            return (
              <button
                key={itemKey}
                type="button"
                disabled={already || isAdding}
                onClick={() => handleAdd(r)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-zinc-800/60 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {r.logo ? (
                    <img
                      src={r.logo}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover shrink-0 bg-zinc-800"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                      <span className="text-[8px] font-bold text-zinc-500">
                        {r.symbol.slice(0, 2)}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-zinc-100">
                        {r.symbol}
                      </span>
                      {r.exchange && (
                        <span className="text-[9px] text-zinc-600">
                          {r.exchange}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-500 truncate">
                      {r.name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-zinc-600">
                    {TYPE_LABEL[r.type]}
                  </span>
                  {already ? (
                    <span className="text-[10px] text-teal-500">Added</span>
                  ) : isAdding ? (
                    <Loader2 className="h-3 w-3 text-teal-400 animate-spin" />
                  ) : (
                    <span className="text-[10px] text-zinc-500">+ Add</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
