"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { SectionLabel } from "./SectionLabel";

export function AskYourPortfolioSection() {
  const [query, setQuery] = useState("");

  return (
    <section>
      <SectionLabel>Ask your portfolio</SectionLabel>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="mt-4 flex items-center gap-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Which position hurt me most in Q3?"
          className="flex-1 rounded-md border border-slate-800 bg-[#0d1411] px-3.5 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-teal-400/50 focus:outline-none"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-md bg-teal-400 px-4 py-2.5 text-sm font-medium text-[#0a0f0d] transition-colors hover:bg-teal-300"
        >
          <Send size={14} />
          Ask
        </button>
      </form>

      <div className="mt-5 rounded-md border border-slate-800 bg-[#0d1411] p-5">
        <div className="text-sm text-slate-400">
          How has my concentration changed over the last 3 months?
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-200">
          Your largest position, NVDA, grew from 19% to 34% of the portfolio
          between June and September, driven almost entirely by price
          appreciation rather than new buying. Overall concentration, measured
          by the weight of your top three holdings, rose from 51% to 63% over
          the same window. That shift also pushed your average pairwise
          correlation from 0.61 to 0.74, reducing the diversification benefit
          of holding six positions.
        </p>
        <p className="mt-3 text-xs text-slate-500">
          Answer derived from 47 portfolio snapshots and current holdings data.
        </p>
      </div>

      <div className="mt-3 rounded-md border border-slate-800/60 bg-[#0d1411]/50 p-5">
        <div className="text-sm text-slate-500">Should I buy more NVDA?</div>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Stoxly doesn&apos;t make buy or sell recommendations. I can show you
          NVDA&apos;s current weight in your portfolio (28.4%) and its
          contribution to your returns — ask me that instead.
        </p>
      </div>
    </section>
  );
}