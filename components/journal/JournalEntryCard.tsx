"use client";

import Panel from "@/components/dashboard/Panel";
import type { JournalEntry } from "@/types/journal";

type Props = {
  entry: JournalEntry;
  onDelete: (id: string) => void;
};

const ACTION_COLORS: Record<string, string> = {
  BUY: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  INCREASE: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  SELL: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  REDUCE: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  HOLD: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  OTHER: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  HIGH: "text-emerald-400",
  MEDIUM: "text-amber-400",
  LOW: "text-rose-400",
};

export default function JournalEntryCard({ entry, onDelete }: Props) {
  const isDecision = entry.type === "DECISION";

  return (
    <Panel
      title={entry.title || (isDecision ? "DECISION LOG" : "INVESTMENT NOTE")}
      slot={entry.symbol || "GENERAL"}
      meta={new Date(entry.createdAt).toLocaleDateString()}
    >
      <div
        className={`space-y-3 border-l-2 -ml-px pl-3 ${
          isDecision ? "border-blue-500/60" : "border-purple-500/60"
        }`}
      >
        {/* Entry Type Marker */}
        <span
          className={`inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
            isDecision
              ? "text-blue-400 bg-blue-500/10"
              : "text-purple-400 bg-purple-500/10"
          }`}
        >
          {isDecision ? "Decision" : "Note"}
        </span>

        {/* Decision Header */}
        {entry.type === "DECISION" && (
          <div className="flex items-center justify-between border-b border-gray-800 pb-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                  ACTION_COLORS[entry.action] ?? ACTION_COLORS.OTHER
                }`}
              >
                {entry.action}
              </span>
              {entry.timeHorizon && (
                <span className="text-[10px] font-mono text-gray-400 bg-gray-800/60 px-1.5 py-0.5 rounded border border-gray-700/60">
                  {entry.timeHorizon}
                </span>
              )}
            </div>

            {entry.confidence && (
              <span className="text-xs text-gray-400 font-mono">
                Confidence:{" "}
                <strong className={CONFIDENCE_COLORS[entry.confidence]}>
                  {entry.confidence}
                </strong>
              </span>
            )}
          </div>
        )}

        {/* Content Body */}
        {entry.type === "DECISION" ? (
          <div className="space-y-2">
            {entry.thesis && (
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                {entry.thesis}
              </p>
            )}
            {entry.expectation && (
              <div className="text-xs text-gray-400">
                <span className="font-mono text-gray-500 uppercase text-[10px]">Expectation:</span>{" "}
                {entry.expectation}
              </div>
            )}
            {entry.invalidationCondition && (
              <div className="text-xs text-amber-400/90 bg-amber-950/20 border border-amber-900/30 p-2 rounded">
                <span className="font-mono uppercase text-[10px] block text-amber-400">Invalidation:</span>
                {entry.invalidationCondition}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
            {entry.content}
          </p>
        )}

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end pt-2 border-t border-gray-800/60">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry._id);
            }}
            className="text-xs text-gray-500 hover:text-rose-400 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </Panel>
  );
}