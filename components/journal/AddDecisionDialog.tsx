"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DECISION_ACTIONS,
  TIME_HORIZONS,
  CONFIDENCE_LEVELS,
  type CreateInvestmentDecisionInput,
  type DecisionAction,
  type TimeHorizon,
  type ConfidenceLevel,
} from "@/types/journal";
import { capitalizeFirst } from "@/lib/journal/format";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateInvestmentDecisionInput) => Promise<void>;
};

export default function AddDecisionDialog({
  isOpen,
  onClose,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState("");
  const [symbol, setSymbol] = useState("");
  const [action, setAction] = useState<DecisionAction>(DECISION_ACTIONS.BUY);
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>(
    TIME_HORIZONS.MEDIUM,
  );
  const [confidence, setConfidence] = useState<ConfidenceLevel>(
    CONFIDENCE_LEVELS.MEDIUM,
  );
  const [thesis, setThesis] = useState("");
  const [expectation, setExpectation] = useState("");
  const [invalidationCondition, setInvalidationCondition] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);

      await onSubmit({
        title: title.trim() || undefined,
        symbol: symbol.trim().toUpperCase() || undefined,
        action,
        timeHorizon,
        confidence,
        thesis: thesis.trim() || undefined,
        expectation: expectation.trim() || undefined,
        invalidationCondition: invalidationCondition.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      // Reset
      setTitle("");
      setSymbol("");
      setThesis("");
      setExpectation("");
      setInvalidationCondition("");
      setTagsInput("");
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 my-8">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <h2 className="text-xs font-bold text-blue-400 tracking-widest uppercase">
            Log Investment Decision
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-sm"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-mono text-gray-400 mb-1">
                Title
              </label>
              <input
                type="text"
                placeholder="e.g. BTC Breakout Thesis"
                value={title}
                onChange={(e) => setTitle(capitalizeFirst(e.target.value))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">
                Symbol
              </label>
              <input
                type="text"
                placeholder="BTC,AAPL,NVDA..."
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-200 uppercase font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Action Types */}
          <div>
            <label className="block text-[11px] font-mono text-gray-400 mb-1">
              Action
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.values(DECISION_ACTIONS).map((act) => (
                <button
                  key={act}
                  type="button"
                  onClick={() => setAction(act)}
                  className={`py-1 text-[11px] font-mono font-bold rounded border transition-all ${
                    action === act
                      ? "bg-blue-600/20 text-blue-400 border-blue-500"
                      : "bg-gray-950 border-gray-800 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {act}
                </button>
              ))}
            </div>
          </div>

          {/* Time Horizon & Confidence */}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">
                Horizon
              </label>

              <Select
                value={timeHorizon}
                onValueChange={(value) => setTimeHorizon(value as TimeHorizon)}
              >
                <SelectTrigger className="w-full bg-gray-950 border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:border-blue-500 focus:ring-0">
                  <SelectValue placeholder="Select horizon" />
                </SelectTrigger>

                <SelectContent className="bg-gray-900 border-gray-800">
                  {Object.values(TIME_HORIZONS).map((horizon) => (
                    <SelectItem
                      key={horizon}
                      value={horizon}
                      className="text-xs font-mono text-gray-300 focus:bg-gray-800 focus:text-blue-400"
                    >
                      {horizon}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-[11px] font-mono text-gray-400 mb-1">
                Confidence
              </label>

              <Select
                value={confidence}
                onValueChange={(value) =>
                  setConfidence(value as ConfidenceLevel)
                }
              >
                <SelectTrigger className="w-full bg-gray-950 border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:border-blue-500 focus:ring-0">
                  <SelectValue placeholder="Select confidence" />
                </SelectTrigger>

                <SelectContent className="bg-gray-900 border-gray-800">
                  {Object.values(CONFIDENCE_LEVELS).map((level) => (
                    <SelectItem
                      key={level}
                      value={level}
                      className="text-xs text-gray-300 focus:bg-gray-800 focus:text-blue-400"
                    >
                      {[level]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Thesis */}
          <div>
            <label className="block text-[11px] font-mono text-gray-400 mb-1">
              Thesis
            </label>
            <textarea
              rows={3}
              placeholder="Why take this position?"
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Expectation */}
          <div>
            <label className="block text-[11px] font-mono text-gray-400 mb-1">
              Expectation
            </label>
            <input
              type="text"
              placeholder="Target level or outcome"
              value={expectation}
              onChange={(e) => setExpectation(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Invalidation */}
          <div>
            <label className="block text-[11px] font-mono text-gray-400 mb-1">
              Invalidation Condition
            </label>
            <input
              type="text"
              placeholder="When is this thesis wrong? (e.g. breaks below $60k)"
              value={invalidationCondition}
              onChange={(e) => setInvalidationCondition(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-mono text-gray-400 mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              placeholder="macro, breakout, swing"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 bg-blue-500 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Decision"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
