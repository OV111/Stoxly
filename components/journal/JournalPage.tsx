"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useJournal } from "@/hooks/useJornal";
import { Classic } from "@/components/loading-ui/classic";
import Panel from "@/components/dashboard/Panel";
import JournalFilters from "./JournalFilters";
import JournalEntryCard from "./JournalEntryCard";
import DecisionMetrics from "./DecisionMetrics";
import DecisionTimeline from "./DecisionTimeline";
import DecisionReview from "./DecisionReview";
import AddDecisionDialog from "./AddDecisionDialog";
import AddNoteDialog from "./AddNoteDialog";
import {
  JOURNAL_ENTRY_TYPES,
  type JournalEntryType,
  type InvestmentDecision,
} from "@/types/journal";

type ViewMode = "GRID" | "TIMELINE" | "REVIEWS";

export default function JournalPage() {
  const router = useRouter();
  const [filterType, setFilterType] = useState<JournalEntryType | undefined>();
  const [symbol, setSymbol] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("GRID");

  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

  const {
    entries,
    loading,
    error,
    createDecision,
    createNote,
    updateDecision,
    deleteEntry,
  } = useJournal({
    type: filterType,
    symbol: symbol.trim() || undefined,
  });

  // Extract decisions for metrics and reviews
  const decisions = useMemo(
    () =>
      entries.filter(
        (e): e is InvestmentDecision => e.type === JOURNAL_ENTRY_TYPES.DECISION
      ),
    [entries]
  );

  const handleSaveReflection = async (id: string, reflection: string) => {
    await updateDecision(id, { reflection });
  };

  const handleSelectEntry = (id: string) => {
    const entry = entries.find((e) => e._id === id);
    if (entry?.type === JOURNAL_ENTRY_TYPES.DECISION) {
      router.push(`/journal/${id}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800/80 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide font-mono">
            INVESTMENT JOURNAL
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Track decisions, review trade post-mortems, and record notes.
          </p>
        </div>

        {/* Modal Triggers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNoteModalOpen(true)}
            className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-mono font-semibold px-3.5 py-2 rounded-xl transition-colors"
          >
            + NOTE
          </button>
          <button
            onClick={() => setIsDecisionModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-semibold px-3.5 py-2 rounded-xl shadow-lg shadow-blue-900/20 transition-colors"
          >
            + DECISION
          </button>
        </div>
      </div>

      {/* Decision Summary Metrics Banner */}
      <DecisionMetrics decisions={decisions} />

      {/* Control Bar: Filters & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <JournalFilters
            activeType={filterType}
            symbol={symbol}
            onTypeChange={setFilterType}
            onSymbolChange={setSymbol}
          />
        </div>

        {/* View Switcher Tabs */}<div className="border border-gray-800 p-3 rounded-xl">


        <div className="flex items-center gap-1 bg-gray-950 p-1 rounded-lg border border-gray-800 self-start md:self-auto">
          {(["GRID", "TIMELINE", "REVIEWS"] as const).map((mode) => (
            <button
            key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-md transition-all ${
                viewMode === mode
                ? "bg-gray-800 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
            >
              {mode}
            </button>
          ))}
        </div>
            </div>
      </div>

      {/* Status Messages */}
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <Classic className="size-8 text-gray-400" />
          <p className="text-xs font-mono text-gray-500">
            Loading journal entries...
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-mono text-rose-400">
          {error}
        </div>
      )}

      {/* Dynamic Main View */}
      {!loading && !error && (
        <>
          {entries.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-800 rounded-2xl">
              <p className="text-xs font-mono text-gray-500">
                No journal entries match your filters.
              </p>
            </div>
          ) : (
            <>
              {/* Card Grid View */}
              {viewMode === "GRID" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {entries.map((entry) => (
                    <div
                      key={entry._id}
                      onClick={() =>
                        entry.type === JOURNAL_ENTRY_TYPES.DECISION &&
                        router.push(`/journal/${entry._id}`)
                      }
                      className={
                        entry.type === JOURNAL_ENTRY_TYPES.DECISION
                          ? "cursor-pointer"
                          : undefined
                      }
                    >
                      <JournalEntryCard entry={entry} onDelete={deleteEntry} />
                    </div>
                  ))}
                </div>
              )}

              {/* Timeline View */}
              {viewMode === "TIMELINE" && (
                <div className="max-w-2xl mx-auto">
                  <DecisionTimeline entries={entries} onSelectEntry={handleSelectEntry} />
                </div>
              )}

              {/* Post-Mortem Reviews View */}
              {viewMode === "REVIEWS" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {decisions.length === 0 ? (
                    <Panel title="REVIEWS" slot="EMPTY">
                      <p className="text-xs text-gray-500">
                        No decisions available for review.
                      </p>
                    </Panel>
                  ) : (
                    decisions.map((decision) => (
                      <DecisionReview
                        key={decision._id}
                        decision={decision}
                        onSaveReflection={handleSaveReflection}
                      />
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Dialog Modals */}
      <AddDecisionDialog
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        onSubmit={async (input) => {
          await createDecision(input);
        }}
      />

      <AddNoteDialog
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onSubmit={async (input) => {
          await createNote(input);
        }}
      />
    </div>
  );
}