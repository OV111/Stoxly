"use client";

import Panel from "@/components/dashboard/Panel";
import type { InvestmentDecision } from "@/types/journal";

type Props = {
  decisions: InvestmentDecision[];
};

export default function DecisionMetrics({ decisions }: Props) {
  const total = decisions.length;

  const actionCounts = decisions.reduce((acc, d) => {
    acc[d.action] = (acc[d.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const confidenceCounts = decisions.reduce((acc, d) => {
    if (d.confidence) {
      acc[d.confidence] = (acc[d.confidence] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const reviewedCount = decisions.filter((d) => Boolean(d.reflection)).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Panel title="TOTAL DECISIONS" slot="LOGGED">
        <div className="flex items-baseline justify-between mt-1">
          <span className="text-2xl font-bold font-mono text-white">{total}</span>
          <span className="text-xs text-gray-400 font-mono">
            {reviewedCount} Reviewed
          </span>
        </div>
      </Panel>

      <Panel title="BUY VS SELL" slot="RATIO">
        <div className="flex items-center gap-4 mt-1 font-mono">
          <div>
            <span className="text-2xl font-bold text-emerald-400">
              {actionCounts.BUY || 0}
            </span>
            <span className="text-[10px] text-gray-500 block">BUYS</span>
          </div>
          <div className="h-6 w-[1px] bg-gray-800" />
          <div>
            <span className="text-2xl font-bold text-rose-400">
              {actionCounts.SELL || 0}
            </span>
            <span className="text-[10px] text-gray-500 block">SELLS</span>
          </div>
          <div className="h-6 w-[1px] bg-gray-800" />
          <div>
            <span className="text-2xl font-bold text-amber-400">
              {actionCounts.HOLD || 0}
            </span>
            <span className="text-[10px] text-gray-500 block">HOLDS</span>
          </div>
        </div>
      </Panel>

      <Panel title="HIGH CONFIDENCE" slot="CONVICTION">
        <div className="flex items-baseline justify-between mt-1">
          <span className="text-2xl font-bold font-mono text-emerald-400">
            {confidenceCounts.HIGH || 0}
          </span>
          <span className="text-xs text-gray-400 font-mono">
            {total > 0
              ? `${Math.round(((confidenceCounts.HIGH || 0) / total) * 100)}%`
              : "0%"}
          </span>
        </div>
      </Panel>

      <Panel title="REVIEW RATE" slot="POST-MORTEM">
        <div className="flex items-baseline justify-between mt-1">
          <span className="text-2xl font-bold font-mono text-blue-400">
            {total > 0 ? `${Math.round((reviewedCount / total) * 100)}%` : "0%"}
          </span>
          <span className="text-xs text-gray-400 font-mono">
            {total - reviewedCount} Pending
          </span>
        </div>
      </Panel>
    </div>
  );
}