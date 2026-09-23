"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Classic } from "@/components/loading-ui/classic";

type Mover = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
};

type MoversResponse = {
  gainers: Mover[];
  losers: Mover[];
};

const MoverRow = ({ mover }: { mover: Mover }) => {
  const isPositive = mover.changePercent >= 0;
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-800/60 transition-colors">
      <span className="font-mono font-semibold text-sm text-gray-100">{mover.symbol}</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400">${mover.price?.toFixed(2)}</span>
        <div
          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
            isPositive ? "bg-teal-400/10 text-teal-400" : "bg-red-500/10 text-red-500"
          }`}
        >
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isPositive ? "+" : ""}
          {mover.changePercent?.toFixed(2)}%
        </div>
      </div>
    </div>
  );
};

const MoversColumn = ({ title, movers }: { title: string; movers: Mover[] }) => (
  <div className="bg-gray-800 border border-gray-600 rounded-xl p-4">
    <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-2 px-1">
      {title}
    </h2>
    <div className="divide-y divide-gray-700/60">
      {movers.map((mover) => (
        <MoverRow key={mover.symbol} mover={mover} />
      ))}
    </div>
  </div>
);

const MarketMovers = () => {
  const [data, setData] = useState<MoversResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/market/movers")
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.gainers) && Array.isArray(json.losers)) setData(json);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 min-h-[30vh]">
        <Classic className="size-8 text-gray-400" />
        <p className="text-gray-500 text-sm">Loading today&apos;s movers...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[30vh]">
        <p className="text-red-500 text-sm">Failed to load market movers.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-100">Today&apos;s Market Movers</h1>
        <p className="text-gray-500 mt-1 text-sm">Top gainers and losers, updated live</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MoversColumn title="Top Gainers" movers={data.gainers} />
        <MoversColumn title="Top Losers" movers={data.losers} />
      </div>
    </div>
  );
};

export default MarketMovers;
