"use client";

interface RangeBarProps {
  low: number;
  high: number;
  current: number;
}

function fmt(n: number) {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

export function RangeBar({ low, high, current }: RangeBarProps) {
  const range = high - low;
  const pct = range === 0 ? 50 : Math.min(100, Math.max(0, ((current - low) / range) * 100));

  return (
    <div className="flex flex-col gap-1 w-full min-w-[120px]">
      <div className="relative h-1 rounded-full bg-zinc-800 overflow-visible">
        {/* filled track */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-zinc-600"
          style={{ width: `${pct}%` }}
        />
        {/* thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-teal-400 ring-2 ring-zinc-900 shadow"
          style={{ left: `calc(${pct}% - 4px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600 tabular-nums">
        <span>{fmt(low)}</span>
        <span>{fmt(high)}</span>
      </div>
    </div>
  );
}