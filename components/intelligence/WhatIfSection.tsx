"use client";

import { useState } from "react";
import { SectionLabel } from "./SectionLabel";

const SYMBOLS = ["TSLA", "AAPL", "NVDA", "BTC"];

export function WhatIfSection() {
  const [symbol, setSymbol] = useState("TSLA");
  const [date, setDate] = useState("2026-01-15");

  return (
    <section>
      <SectionLabel>What-if explainer</SectionLabel>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="rounded-md border border-slate-800 bg-[#0d1411] px-3 py-2.5 text-sm text-slate-200 focus:border-teal-400/50 focus:outline-none"
        >
          {SYMBOLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-slate-800 bg-[#0d1411] px-3 py-2.5 text-sm text-slate-200 focus:border-teal-400/50 focus:outline-none"
        />
        <button className="rounded-md border border-slate-700 px-4 py-2.5 text-sm text-slate-200 transition-colors hover:border-teal-400/50 hover:text-teal-400">
          Run scenario
        </button>
      </div>

      <div className="mt-5 rounded-md border border-slate-800 bg-[#0d1411] p-5">
        <div className="text-sm text-slate-300">
          If you hadn&apos;t bought TSLA on Jan 15, 2026:
        </div>
        <dl className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <dt className="text-slate-400">Time-weighted return</dt>
            <dd className="tabular-nums text-slate-200">
              +14.2% instead of +11.8%{" "}
              <span className="text-rose-400">(−2.4%)</span>
            </dd>
          </div>
          <div className="flex items-center justify-between text-sm">
            <dt className="text-slate-400">Portfolio volatility</dt>
            <dd className="tabular-nums text-slate-200">
              12.1% instead of 14.3%
            </dd>
          </div>
          <div className="flex items-center justify-between text-sm">
            <dt className="text-slate-400">Max drawdown</dt>
            <dd className="tabular-nums text-slate-200">unchanged at −18.3%</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-500">
          This replays your actual transaction ledger with that entry removed.
          No forecasting — purely historical.
        </p>
      </div>
    </section>
  );
}