import { FileDown } from "lucide-react";
import { SectionLabel } from "./SectionLabel";

export function PortfolioReportSection() {
  return (
    <section>
      <SectionLabel>Export portfolio report</SectionLabel>
      <div className="mt-4 rounded-md border border-slate-800 bg-[#0d1411] p-6">
        <p className="max-w-md text-sm text-slate-400">
          A full point-in-time report including holdings, return analytics,
          risk metrics, and this week&apos;s AI debrief.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <button className="flex items-center gap-2 rounded-md border border-slate-700 px-4 py-2.5 text-sm text-slate-200 transition-colors hover:border-teal-400/50 hover:text-teal-400">
            <FileDown size={14} />
            Generate PDF report
          </button>
          <span className="text-xs text-slate-500">
            Last generated: Sep 7, 2026 —{" "}
            <button className="text-slate-400 underline underline-offset-2 hover:text-teal-400">
              Download
            </button>
          </span>
        </div>
      </div>
    </section>
  );
}