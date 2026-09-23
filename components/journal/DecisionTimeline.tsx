"use client";

import type { JournalEntry } from "@/types/journal";

type Props = {
  entries: JournalEntry[];
  onSelectEntry?: (id: string) => void;
};

export default function DecisionTimeline({ entries, onSelectEntry }: Props) {
  return (
    <div className="relative pl-6 border-l border-gray-800 space-y-6 my-4">
      {entries.map((entry) => {
        const isDecision = entry.type === "DECISION";

        return (
          <div key={entry._id} className="relative group">
            {/* Timeline Dot Indicator */}
            <div
              className={`absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full border-2 bg-gray-950 transition-transform group-hover:scale-125 ${
                isDecision
                  ? "border-blue-500 bg-blue-500"
                  : "border-purple-500 bg-purple-500"
              }`}
            />

            {/* Item Card */}
            <div
              onClick={() => onSelectEntry?.(entry._id)}
              className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-400">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </span>
                  {entry.symbol && (
                    <span className="text-[10px] font-mono bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">
                      ${entry.symbol}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-mono uppercase font-bold ${
                    isDecision ? "text-blue-400" : "text-purple-400"
                  }`}
                >
                  {isDecision ? entry.action : "NOTE"}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-white mb-1">
                {entry.title || (isDecision ? `${entry.action} ${entry.symbol || ""}` : "Note Entry")}
              </h3>

              <p className="text-xs text-gray-400 line-clamp-2">
                {isDecision ? entry.thesis : entry.content}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}