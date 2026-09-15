"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { initialInsights, type Insight } from "@/lib/portfolio-data";

export function ActiveInsightsSection() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = initialInsights.filter((i) => !dismissed.has(i.id));

  return (
    <section>
      <SectionLabel>Active insights</SectionLabel>

      <div className="mt-4">
        {visible.length === 0 ? (
          <p className="text-sm text-slate-500">No unusual patterns this week.</p>
        ) : (
          <div className="space-y-2">
            {visible.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onDismiss={() =>
                  setDismissed((prev) => new Set(prev).add(insight.id))
                }
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function InsightCard({
  insight,
  onDismiss,
}: {
  insight: Insight;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-slate-800 bg-[#0d1411] p-4">
      {insight.tone === "warning" ? (
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
      ) : (
        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal-400" />
      )}
      <div className="flex-1">
        <div className="text-sm text-slate-200">{insight.finding}</div>
        <div className="mt-0.5 text-sm text-slate-500">{insight.context}</div>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 text-slate-600 transition-colors hover:text-slate-300"
        aria-label="Dismiss insight"
      >
        <X size={14} />
      </button>
    </div>
  );
}