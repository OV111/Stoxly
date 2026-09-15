"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  debounceMs?: number;
  defaultValue?: string;
  minChars?: number;
  className?: string;
}

export function SearchInput({
  onSearch,
  isLoading = false,
  placeholder = "Search stocks and crypto...",
  debounceMs = 300,
  defaultValue = "",
  minChars = 2,
  className,
}: SearchInputProps) {
  const [query, setQuery] = useState(defaultValue);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback(
    (value: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const trimmed = value.trim();

      if (trimmed.length >= minChars) {
        setIsDebouncing(true);
        timeoutRef.current = setTimeout(() => {
          onSearch(trimmed);
          setIsDebouncing(false);
          timeoutRef.current = null;
        }, debounceMs);
      } else {
        onSearch("");
        setIsDebouncing(false);
      }
    },
    [onSearch, debounceMs, minChars],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  const showLoading = isLoading || isDebouncing;
  const showClear = query.length > 0 && !showLoading;

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

        <Input
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            handleSearch(val);
          }}
          placeholder={placeholder}
          className="h-10 pl-9 pr-10 bg-background/50 backdrop-blur-sm border-muted-foreground/20 focus:ring-2 focus:ring-primary/50"
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {showLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {showClear && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full p-0.5 hover:bg-muted transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
