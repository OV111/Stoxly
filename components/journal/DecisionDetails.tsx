"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Classic } from "@/components/loading-ui/classic";
import Panel from "@/components/dashboard/Panel";
import DecisionReview from "./DecisionReview";
import type { DecisionReviewData } from "@/types/journal";

type Props = {
  decisionId: string;
};

const ACTION_COLORS: Record<string, string> = {
  BUY: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  INCREASE: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  SELL: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  REDUCE: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  HOLD: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  OTHER: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

export default function DecisionDetails({ decisionId }: Props) {
  const router = useRouter();
  const [data, setData] = useState<DecisionReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/journal/${decisionId}/review`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to load decision");
      }
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [decisionId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveReflection = async (id: string, reflection: string) => {
    const res = await fetch(`/api/journal/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reflection }),
    });
    if (!res.ok) throw new Error("Failed to save reflection");
    await load();
  };

  const handleDelete = async () => {
    const res = await fetch(`/api/journal/${decisionId}`, { method: "DELETE" });
    if (res.ok) router.push("/journal");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Classic className="size-8 text-gray-400" />
        <p className="text-xs font-mono text-gray-500">Loading decision...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-mono text-rose-400">
        {error ?? "Decision not found"}
      </div>
    );
  }

  const { decision, position, priceContext } = data;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-5">
        <div>
          <button
            onClick={() => router.push("/journal")}
            className="text-xs font-mono text-gray-500 hover:text-gray-300 mb-2"
          >
            ← BACK TO JOURNAL
          </button>
          <h1 className="text-xl font-bold text-white tracking-wide font-mono">
            {decision.title || `${decision.action} ${decision.symbol ?? ""}`}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                ACTION_COLORS[decision.action] ?? ACTION_COLORS.OTHER
              }`}
            >
              {decision.action}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(decision.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="text-xs text-gray-500 hover:text-rose-400 transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Live Market Context */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Panel title="POSITION TODAY" slot={decision.symbol || "N/A"}>
          {position ? (
            <div className="space-y-1 mt-1">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold font-mono text-white">
                  {position.quantity.toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  })}
                </span>
                <span className="text-xs text-gray-400 font-mono">shares</span>
              </div>
              <div className="flex items-baseline justify-between text-xs font-mono">
                <span className="text-gray-400">
                  ${position.marketValue.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={
                    position.unrealizedPnlPct >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }
                >
                  {position.unrealizedPnlPct >= 0 ? "+" : ""}
                  {position.unrealizedPnlPct.toFixed(2)}% unrealized
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              {decision.symbol
                ? "No open position in this symbol."
                : "This decision isn't linked to a symbol."}
            </p>
          )}
        </Panel>

        <Panel title="PRICE SINCE DECISION" slot={decision.symbol || "N/A"}>
          {priceContext ? (
            <div className="space-y-1 mt-1">
              <div className="flex items-baseline justify-between">
                <span
                  className={`text-2xl font-bold font-mono ${
                    priceContext.changePct >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}
                >
                  {priceContext.changePct >= 0 ? "+" : ""}
                  {priceContext.changePct.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-baseline justify-between text-xs font-mono text-gray-400">
                <span>${priceContext.priceAtDecision.toFixed(2)} at decision</span>
                <span>${priceContext.currentPrice.toFixed(2)} now</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              Not enough price history yet to show the move since this decision.
            </p>
          )}
        </Panel>
      </div>

      {/* Thesis / Expectation / Invalidation */}
      <Panel title="DECISION CONTEXT" slot={decision.timeHorizon || "—"}>
        <div className="space-y-3 mt-1">
          {decision.thesis && (
            <div>
              <h4 className="text-[11px] font-mono uppercase text-gray-400 mb-1">
                Thesis
              </h4>
              <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                {decision.thesis}
              </p>
            </div>
          )}
          {decision.expectation && (
            <div>
              <h4 className="text-[11px] font-mono uppercase text-gray-400 mb-1">
                Expectation
              </h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                {decision.expectation}
              </p>
            </div>
          )}
          {decision.invalidationCondition && (
            <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-2.5">
              <h4 className="text-[10px] font-mono uppercase text-amber-400 mb-0.5">
                Invalidation Condition
              </h4>
              <p className="text-xs text-amber-200/90">
                {decision.invalidationCondition}
              </p>
            </div>
          )}
          {decision.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {decision.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Panel>

      {/* Post-mortem reflection */}
      <DecisionReview decision={decision} onSaveReflection={handleSaveReflection} />
    </div>
  );
}
