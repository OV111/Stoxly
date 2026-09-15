"use client";

import { useState } from "react";
import { SectionLabel } from "./SectionLabel";
import { fmtPct } from "@/lib/format";
import { attributionData, type Period } from "@/lib/portfolio-data";

const PERIODS: Period[] = ["1W", "1M", "3M", "YTD"];

export function PerformanceAttributionSection() {
  const [period, setPeriod] = useState<Period>("1W");

  const rows = [...attributionData[period]].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  );
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.contribution)));

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>Performance attribution</SectionLabel>
        <div className="flex gap-1 rounded-md border border-slate-800 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded px-2.5 py-1 text-xs transition-colors ${
                period === p
                  ? "bg-[#0e1a17] text-teal-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-slate-800 bg-[#0d1411] p-6">
        <div className="space-y-3">
          {rows.map((r) => (
            <AttributionRow key={r.symbol} row={r} maxAbs={maxAbs} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AttributionRow({
  row,
  maxAbs,
}: {
  row: { symbol: string; contribution: number };
  maxAbs: number;
}) {
  const positive = row.contribution >= 0;
  const widthPct = (Math.abs(row.contribution) / maxAbs) * 100;

  return (
    <div className="flex items-center gap-3">
      <div className="w-14 shrink-0 text-sm text-slate-300">{row.symbol}</div>
      <div className="relative h-5 flex-1">
        <div className="absolute inset-y-0 left-1/2 w-px bg-slate-800" />
        {positive ? (
          <div
            className="absolute inset-y-0 left-1/2 rounded-sm bg-teal-400"
            style={{ width: `${widthPct / 2}%` }}
          />
        ) : (
          <div
            className="absolute inset-y-0 right-1/2 rounded-sm bg-rose-500"
            style={{ width: `${widthPct / 2}%` }}
          />
        )}
      </div>
      <div
        className={`w-16 shrink-0 text-right text-sm tabular-nums ${
          positive ? "text-teal-400" : "text-rose-400"
        }`}
      >
        {fmtPct(row.contribution)}
      </div>
    </div>
  );
}