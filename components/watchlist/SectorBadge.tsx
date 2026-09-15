"use client";

const SECTOR_COLORS: Record<string, string> = {
  Technology:     "bg-blue-500/10 text-blue-400 ring-blue-500/20",
  Finance:        "bg-teal-500/10 text-teal-400 ring-teal-500/20",
  Healthcare:     "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  Energy:         "bg-yellow-500/10 text-yellow-400 ring-yellow-500/20",
  Consumer:       "bg-purple-500/10 text-purple-400 ring-purple-500/20",
  Industrials:    "bg-orange-500/10 text-orange-400 ring-orange-500/20",
  Materials:      "bg-lime-500/10 text-lime-400 ring-lime-500/20",
  Utilities:      "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20",
  "Real Estate":  "bg-rose-500/10 text-rose-400 ring-rose-500/20",
  Crypto:         "bg-violet-500/10 text-violet-400 ring-violet-500/20",
};

const DEFAULT = "bg-zinc-500/10 text-zinc-400 ring-zinc-500/20";

interface SectorBadgeProps {
  sector: string;
}

export function SectorBadge({ sector }: SectorBadgeProps) {
  const cls = SECTOR_COLORS[sector] ?? DEFAULT;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${cls}`}
    >
      {sector}
    </span>
  );
}