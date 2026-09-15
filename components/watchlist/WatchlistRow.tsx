"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, PlusCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SparklineChart } from "./SparklineChart";
import { RangeBar } from "./RangeBar";
import { SectorBadge } from "./SectorBadge";
import type { WatchlistItem } from "@/types/watchlist";

interface WatchlistRowProps {
  item: WatchlistItem;
  onRemove: (symbol: string) => Promise<void>;
  onAddToPortfolio: (symbol: string) => void;
}

function fmtPrice(n: number) {
  if (n >= 1_000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (n < 1)      return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function fmtVolume(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function fmtMarketCap(n?: number | null) {
  if (!n) return "—";
  if (n >= 1_000_000_000_000) return `$${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000)     return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)         return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

export function WatchlistRow({ item, onRemove, onAddToPortfolio }: WatchlistRowProps) {
  const router   = useRouter();
  const [removing, setRemoving] = useState(false);
  const [hovered, setHovered]   = useState(false);

  const { symbol, name, price, change, changePercent, logo, exchange, volume, marketCap, sector, high52, low52, sparkline } = item;

  const isUp        = (changePercent ?? 0) >= 0;
  const changeColor = isUp ? "text-teal-400" : "text-red-500";
  const changeBg    = isUp ? "bg-teal-400/10" : "bg-red-500/10";

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setRemoving(true);
    try { await onRemove(symbol); } finally { setRemoving(false); }
  };

  const handleAddToPortfolio = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToPortfolio(symbol);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16, transition: { duration: 0.18 } }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => router.push(`/markets/${symbol.toLowerCase()}`)}
      className={`
        relative flex items-center gap-3 px-4 py-3.5 cursor-pointer
        border-b border-zinc-800/60 transition-colors duration-100
        ${hovered ? "bg-zinc-800/40" : "bg-transparent"}
      `}
    >
      {/* 1. Logo + symbol + name */}
      <div className="flex items-center gap-2.5 w-[150px] shrink-0">
        {logo ? (
          <img
            src={logo}
            alt={symbol}
            className="h-7 w-7 rounded-full object-cover bg-zinc-800 shrink-0"
          />
        ) : (
          <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-zinc-500">{symbol.slice(0, 2)}</span>
          </div>
        )}
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold text-zinc-100 tracking-wide">{symbol}</span>
          <span className="text-[11px] text-zinc-500 truncate">{name}</span>
        </div>
      </div>

      {/* 2. Price + % change */}
      <div className="flex flex-col items-end gap-1 w-[105px] shrink-0">
        <span className="text-sm font-semibold text-zinc-100 tabular-nums">
          {price !== null ? fmtPrice(price) : <span className="text-zinc-700">—</span>}
        </span>
        {changePercent !== null && (
          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${changeBg} ${changeColor}`}>
            {isUp ? "+" : ""}{changePercent.toFixed(2)}%
          </span>
        )}
      </div>

      {/* 3. Sparkline — 7d */}
      <div className="shrink-0 hidden sm:block">
        {sparkline && sparkline.length >= 2 ? (
          <SparklineChart data={sparkline} width={80} height={32} />
        ) : (
          <div className="w-20 h-8 rounded bg-zinc-800/40" />
        )}
      </div>

      {/* 4. Volume */}
      <div className="flex flex-col gap-0.5 w-[70px] shrink-0 hidden md:flex">
        <span className="text-[10px] text-zinc-600">Vol</span>
        <span className="text-xs text-zinc-300 tabular-nums">
          {volume != null ? fmtVolume(volume) : "—"}
        </span>
      </div>

      {/* 5. 52w range */}
      <div className="flex-1 min-w-[120px] hidden lg:block">
        {price !== null && high52 && low52 ? (
          <RangeBar low={low52} high={high52} current={price} />
        ) : (
          <div className="h-1 rounded-full bg-zinc-800/40" />
        )}
      </div>

      {/* 6. Market cap + sector */}
      <div className="flex flex-col gap-1 w-[110px] shrink-0 hidden xl:flex">
        <span className="text-xs text-zinc-300 tabular-nums">{fmtMarketCap(marketCap)}</span>
        {sector && <SectorBadge sector={sector} />}
      </div>

      {/* 7+8. Actions — hover only */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 6 }}
            transition={{ duration: 0.12 }}
            className="flex items-center gap-2 ml-auto shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleAddToPortfolio}
              title="Add to portfolio"
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium text-teal-400 bg-teal-400/10 hover:bg-teal-400/20 transition-colors"
            >
              <PlusCircle className="h-3 w-3" />
              <span className="hidden sm:inline">Portfolio</span>
            </button>
            <button
              onClick={handleRemove}
              disabled={removing}
              title="Remove from watchlist"
              className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
            >
              {removing
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2 className="h-3.5 w-3.5" />
              }
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}