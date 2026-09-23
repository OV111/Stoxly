"use client";

import { useState } from "react";
import Panel from "@/components/dashboard/Panel";
import type { InvestmentDecision } from "@/types/journal";

type Props = {
  decision: InvestmentDecision;
  onSaveReflection: (id: string, reflection: string) => Promise<void>;
};

export default function DecisionReview({ decision, onSaveReflection }: Props) {
  const [reflection, setReflection] = useState(decision.reflection || "");
  const [isEditing, setIsEditing] = useState(!decision.reflection);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!reflection.trim()) return;
    setLoading(true);
    try {
      await onSaveReflection(decision._id, reflection.trim());
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save reflection:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel
      title={`POST-MORTEM REVIEW: ${decision.title || decision.symbol || "DECISION"}`}
      slot={decision.action}
      meta={new Date(decision.createdAt).toLocaleDateString()}
    >
      <div className="space-y-3">
        {/* Thesis context recap */}
        <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-800 text-xs text-gray-400 space-y-1">
          <p className="font-mono text-[10px] text-gray-500 uppercase">Original Thesis</p>
          <p className="text-gray-300">{decision.thesis || "No thesis logged."}</p>
        </div>

        {/* Reflection Input / Render */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              rows={3}
              placeholder="How did this decision play out? What did you learn?"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            />
            <div className="flex justify-end gap-2">
              {decision.reflection && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 text-xs text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Review"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-2 bg-blue-950/20 border border-blue-900/30 p-3 rounded-lg">
            <div>
              <p className="text-[10px] font-mono text-blue-400 uppercase mb-1">
                Reflection ({decision.reflectionCreatedAt ? new Date(decision.reflectionCreatedAt).toLocaleDateString() : "Saved"})
              </p>
              <p className="text-xs text-gray-200 whitespace-pre-wrap">
                {decision.reflection}
              </p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="text-[10px] font-mono text-blue-400 hover:underline"
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </Panel>
  );
}