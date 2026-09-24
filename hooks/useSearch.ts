"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Instrument } from "@/types/search";

export function useSearch() {
  const [results, setResults] = useState<Instrument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");
  const requestId = useRef(0);

  const handleSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    setQuery(trimmed);

    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const currentRequest = ++requestId.current;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        throw new Error(`Search failed: ${res.status}`);
      }
      const data = await res.json();

      // Ignore stale responses from an earlier, slower request.
      if (currentRequest !== requestId.current) return;
      setResults(data);
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      console.error("[useSearch] Search error:", error);
      toast.error("Search failed", {
        description: "Unable to fetch results. Please try again.",
      });
      setResults([]);
    } finally {
      if (currentRequest === requestId.current) setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setQuery("");
    setResults([]);
  }, []);

  return { results, isLoading, query, handleSearch, reset };
}
