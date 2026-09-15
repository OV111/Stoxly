"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, ArrowRight } from "lucide-react";
import { SparklineChart } from "@/components/watchlist/SparklineChart";
import { WatchlistSkeletonRows } from "@/components/watchlist/WatchlistEmptyState";
import { useWatchlist } from "@/hooks/useWatchlist";

function fmtPrice(n: number) {
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function WatchlistPanel() {
  const router  = useRouter();
  const { items, loading } = useWatchlist();
  const preview = items.slice(0, 5);

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-teal-400" strokeWidth={1.75} />
          <span className="text-sm font-medium text-zinc-200">Watchlist</span>
          {!loading && (
            <span className="text-[10px] text-zinc-600">{items.length}/50</span>
          )}
        </div>
        <Link
          href="/watchlist"
          className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-teal-400 transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* rows */}
      {loading ? (
        <WatchlistSkeletonRows count={4} />
      ) : preview.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-zinc-600">Nothing tracked yet.</p>
          <Link href="/watchlist" className="mt-1 inline-block text-xs text-teal-400 hover:underline">
            Add symbols
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/40">
          {preview.map((item) => {
            const { symbol, name, price, changePercent, logo, sparkline } = item;
            const isUp        = (changePercent ?? 0) >= 0;
            const changeColor = isUp ? "text-teal-400" : "text-red-500";

            return (
              <button
                key={symbol}
                onClick={() => router.push(`/markets/${symbol.toLowerCase()}`)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/40 transition-colors"
              >
                {/* logo */}
                {logo ? (
                  <img src={logo} alt={symbol} className="h-6 w-6 rounded-full object-cover bg-zinc-800 shrink-0" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <span className="text-[8px] font-bold text-zinc-500">{symbol.slice(0, 2)}</span>
                  </div>
                )}

                {/* symbol + name */}
                <div className="flex flex-col gap-0.5 flex-1 text-left min-w-0">
                  <span className="text-xs font-semibold text-zinc-100">{symbol}</span>
                  <span className="text-[10px] text-zinc-600 truncate">{name}</span>
                </div>

                {/* sparkline */}
                {sparkline && sparkline.length >= 2 && (
                  <SparklineChart data={sparkline} width={56} height={24} />
                )}

                {/* price + change */}
                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span className="text-xs font-semibold text-zinc-100 tabular-nums">
                    {price !== null ? fmtPrice(price) : "—"}
                  </span>
                  {changePercent !== null && (
                    <span className={`text-[10px] font-medium tabular-nums ${changeColor}`}>
                      {isUp ? "+" : ""}{changePercent.toFixed(2)}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}