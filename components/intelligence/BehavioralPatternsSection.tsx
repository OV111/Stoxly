import { SectionLabel } from "./SectionLabel";
import { behavioralPatterns } from "@/lib/portfolio-data";

export function BehavioralPatternsSection() {
  return (
    <section>
      <div className="flex items-baseline justify-between">
        <SectionLabel>Behavioral patterns</SectionLabel>
        <span className="text-xs text-slate-500">
          Based on 47 weeks of transaction and snapshot history
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {behavioralPatterns.map((p) => (
          <div
            key={p.name}
            className="rounded-md border border-slate-800 bg-[#0d1411] p-4"
          >
            <div className="text-sm font-medium text-slate-200">{p.name}</div>
            <p className="mt-2 text-sm text-slate-400">{p.observation}</p>
            <p className="mt-3 text-xs text-slate-500">{p.dataPoint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}