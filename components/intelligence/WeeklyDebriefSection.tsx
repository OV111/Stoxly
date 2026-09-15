"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { fmtPct, fmtSignedPct1 } from "@/lib/format";
import { weeklyDebrief, groundingSources, debriefHistory } from "@/lib/portfolio-data";

export function WeeklyDebriefSection() {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  const d = weeklyDebrief;

  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-slate-400">Weekly debrief</h2>;
        <span className="text-xs text-slate-500">{d.range}</span>
      </div>

      <div className="rounded-md border border-slate-800 bg-[#0d1411] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-xs text-slate-500">Portfolio return</div>
            <div
              className={`mt-1 text-3xl font-medium tabular-nums ${
                d.portfolioReturn >= 0 ? "text-teal-400" : "text-rose-400"
              }`}
            >
              {fmtPct(d.portfolioReturn)}
            </div>
          </div>
          <button className="rounded-md bg-teal-400 px-4 py-2 text-sm font-medium text-[#0a0f0d] transition-colors hover:bg-teal-300">
            Generate debrief
          </button>
        </div>

        <dl className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Main driver</dt>
            <dd className="mt-1 text-sm text-slate-200">
              <span className="tabular-nums text-teal-400">{d.driver.symbol}</span>{" "}
              contributed <span className="tabular-nums">{d.driver.contribution}%</span>{" "}
              of weekly gains
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Risk shift</dt>
            <dd className="mt-1 text-sm text-slate-200">
              Concentration increased{" "}
              <span className="tabular-nums">{d.concentration.from}%</span> →{" "}
              <span className="tabular-nums text-rose-400">{d.concentration.to}%</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Diversification warning</dt>
            <dd className="mt-1 text-sm text-slate-200">
              {d.correlation.pair} correlation at{" "}
              <span className="tabular-nums text-rose-400">
                {d.correlation.value.toFixed(2)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Investor effect</dt>
            <dd className="mt-1 text-sm text-slate-200">
              MWR beat TWR by{" "}
              <span className="tabular-nums text-teal-400">{fmtPct(d.mwrTwrGap)}</span>{" "}
              — deposit timing worked in your favor
            </dd>
          </div>
        </dl>

        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-slate-300">
          {d.conclusion}
        </p>

        <GroundingSources
          open={sourcesOpen}
          onToggle={() => setSourcesOpen((v) => !v)}
        />
      </div>

      <DebriefHistoryTimeline
        expandedWeek={expandedWeek}
        onToggle={(i) => setExpandedWeek(expandedWeek === i ? null : i)}
      />
    </section>
  );
}

function GroundingSources({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="mt-8 border-t border-slate-800 pt-4">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs text-slate-500 transition-colors hover:text-slate-300"
      >
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
        {open ? "Hide data sources" : "Show data sources"}
      </button>

      {open && (
        <div className="mt-3 space-y-2 rounded-md border border-slate-800 bg-[#0a0f0d] p-4 font-mono text-xs text-slate-400">
          {groundingSources.map((s) => (
            <div key={s.call}>
              <span className="text-teal-400">{s.call}</span>
              {" → "}
              {s.detail}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DebriefHistoryTimeline({
  expandedWeek,
  onToggle,
}: {
  expandedWeek: number | null;
  onToggle: (index: number) => void;
}) {
  return (
    <>
      <div className="mt-4 -mx-2 flex gap-2 overflow-x-auto px-2 pb-2">
        {debriefHistory.map((w, i) => {
          const max = Math.max(...w.spark.map((v) => Math.abs(v)), 1);
          const isExpanded = expandedWeek === i;
          return (
            <button
              key={w.range}
              onClick={() => onToggle(i)}
              className={`flex min-w-[104px] shrink-0 flex-col gap-2 rounded-md border p-3 text-left transition-colors ${
                isExpanded
                  ? "border-teal-400/50 bg-[#0e1a17]"
                  : "border-slate-800 bg-[#0d1411] hover:border-slate-700"
              }`}
            >
              <span className="text-[11px] text-slate-500">{w.range}</span>
              <span
                className={`text-sm font-medium tabular-nums ${
                  w.return >= 0 ? "text-teal-400" : "text-rose-400"
                }`}
              >
                {fmtSignedPct1(w.return)}
              </span>
              <div className="flex h-5 items-end gap-[2px]">
                {w.spark.map((v, j) => (
                  <div
                    key={j}
                    className={`w-[3px] rounded-[1px] ${
                      v >= 0 ? "bg-teal-400" : "bg-rose-400"
                    }`}
                    style={{ height: `${Math.max(Math.abs(v) / max, 0.15) * 100}%` }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {expandedWeek !== null && (
        <div className="mt-3 rounded-md border border-slate-800 bg-[#0d1411] p-4 text-sm text-slate-400">
          Debrief for {debriefHistory[expandedWeek].range}: portfolio returned{" "}
          <span className="tabular-nums text-slate-200">
            {fmtSignedPct1(debriefHistory[expandedWeek].return)}
          </span>
          . Full breakdown available on request.
        </div>
      )}
    </>
  );
}