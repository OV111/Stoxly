"use client";

import { JOURNAL_ENTRY_TYPES, type JournalEntryType } from "@/types/journal";

type Props = {
  activeType: JournalEntryType | undefined;
  symbol: string;
  onTypeChange: (type: JournalEntryType | undefined) => void;
  onSymbolChange: (symbol: string) => void;
};

export default function JournalFilters({
  activeType,
  symbol,
  onTypeChange,
  onSymbolChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900 border border-gray-800 p-3 rounded-xl">
      {/* Entry Type Selector */}
      <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-lg border border-gray-800">
        <button
          type="button"
          onClick={() => onTypeChange(undefined)}
          className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all ${
            activeType === undefined
              ? "bg-gray-800 text-white shadow-sm"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          ALL
        </button>
        <button
          type="button"
          onClick={() => onTypeChange(JOURNAL_ENTRY_TYPES.DECISION)}
          className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all ${
            activeType === JOURNAL_ENTRY_TYPES.DECISION
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          DECISIONS
        </button>
        <button
          type="button"
          onClick={() => onTypeChange(JOURNAL_ENTRY_TYPES.NOTE)}
          className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-all ${
            activeType === JOURNAL_ENTRY_TYPES.NOTE
              ? "bg-purple-600 text-white shadow-sm"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          NOTES
        </button>
      </div>

      {/* Symbol Search Input */}
      <div className="relative w-full sm:w-64">
        <input
          type="text"
          placeholder="Filter by Symbol (e.g. BTC)..."
          value={symbol}
          onChange={(e) => onSymbolChange(e.target.value.toUpperCase())}
          className="w-full bg-gray-950 border border-gray-800 text-xs text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500/50 font-mono uppercase placeholder:normal-case placeholder:font-sans placeholder:text-gray-500"
        />
        {symbol && (
          <button
            type="button"
            onClick={() => onSymbolChange("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-300"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}