import { useState, useEffect, useCallback } from "react";
import type {
  JournalEntry,
  CreateInvestmentDecisionInput,
  CreateInvestmentNoteInput,
  UpdateInvestmentDecisionInput,
  UpdateInvestmentNoteInput,
} from "@/types/journal";

type FilterType = "DECISION" | "NOTE" | undefined;

interface UseJournalOptions {
  type?: FilterType;
  symbol?: string;
  limit?: number;
}

interface UseJournalReturn {
  entries: JournalEntry[];
  loading: boolean;
  error: string | null;
  createDecision: (
    input: CreateInvestmentDecisionInput,
  ) => Promise<JournalEntry>;
  createNote: (input: CreateInvestmentNoteInput) => Promise<JournalEntry>;
  updateDecision: (
    id: string,
    input: UpdateInvestmentDecisionInput,
  ) => Promise<void>;
  updateNote: (id: string, input: UpdateInvestmentNoteInput) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  refresh: () => void;
}

export function useJournal(options: UseJournalOptions = {}): UseJournalReturn {
  const { type, symbol, limit = 50 } = options;

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (symbol) params.set("symbol", symbol);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return `/api/journal${qs ? `?${qs}` : ""}`;
  }, [type, symbol, limit]);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildUrl());
      if (!res.ok) throw new Error("Failed to fetch journal");
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  const createDecision = useCallback(
    async (input: CreateInvestmentDecisionInput): Promise<JournalEntry> => {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, type: "DECISION" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create decision");
      }
      const data = await res.json();
      const entry = data.entry as JournalEntry;
      setEntries((prev) => [entry, ...prev]);
      return entry;
    },
    [],
  );

  const createNote = useCallback(
    async (input: CreateInvestmentNoteInput): Promise<JournalEntry> => {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, type: "NOTE" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create note");
      }
      const data = await res.json();
      const entry = data.entry as JournalEntry;
      setEntries((prev) => [entry, ...prev]);
      return entry;
    },
    [],
  );

  const updateDecision = useCallback(
    async (id: string, input: UpdateInvestmentDecisionInput): Promise<void> => {
      const res = await fetch(`/api/journal/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update decision");
      }
      const data = await res.json();
      const updated = data.entry as JournalEntry;
      setEntries((prev) => prev.map((e) => (e._id === id ? updated : e)));
    },
    [],
  );

  const updateNote = useCallback(
    async (id: string, input: UpdateInvestmentNoteInput): Promise<void> => {
      const res = await fetch(`/api/journal/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update note");
      }
      const data = await res.json();
      const updated = data.entry as JournalEntry;
      setEntries((prev) => prev.map((e) => (e._id === id ? updated : e)));
    },
    [],
  );

  const deleteEntry = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/journal/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to delete entry");
    }
    setEntries((prev) => prev.filter((e) => e._id !== id));
  }, []);

  return {
    entries,
    loading,
    error,
    createDecision,
    createNote,
    updateDecision,
    updateNote,
    deleteEntry,
    refresh: fetch_,
  };
}
