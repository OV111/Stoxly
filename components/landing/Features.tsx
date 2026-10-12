"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  ChartNoAxesCombined,
  ArrowDownNarrowWide,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import MarketChart from "@/components/landing/MarketChart";

type CryptoMover = {
  symbol: string;
  name: string;
  image: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
};

type MarketStat = {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  ethDominance: number;
  activeCryptocurrencies: number;
  markets: number;
};

// Shared by the header row and data rows so the columns line up. The
// absolute-change column drops out on phones, where four columns don't fit.
const MOVER_GRID = "grid grid-cols-[minmax(0,1fr)_5.5rem_4.5rem] sm:grid-cols-[minmax(0,1fr)_5.5rem_5rem_4.5rem] items-center gap-2";

const StockSkeleton = () => (
  <div className="flex flex-col gap-3">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="flex justify-between items-center">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-14" />
      </div>
    ))}
  </div>
);

const Features = () => {
  const [gainers, setGainers] = useState<CryptoMover[]>([]);
  const [losers, setLosers] = useState<CryptoMover[]>([]);
  const [marketStats, setMarketStats] = useState<MarketStat | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gainersRes, losersRes] = await Promise.all([
          fetch("/api/stocks/gainers"),
          fetch("/api/stocks/losers"),
        ]);
        const gainersData = await gainersRes.json();
        const losersData = await losersRes.json();
        setGainers(Array.isArray(gainersData) ? gainersData : []);
        setLosers(Array.isArray(losersData) ? losersData : []);
      } catch (error) {
        console.error("Failed to fetch movers:", error);
        setGainers([]);
        setLosers([]);
      } finally {
        setLoading(false);
      }
    };

    const fetchStats = async () => {
      try {
        const res = await fetch("/api/market/stats");
        const data = await res.json();
        if (data.error) {
          console.error("Stats error:", data.error);
          setMarketStats(null);
        } else {
          setMarketStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        setMarketStats(null);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchData();
    fetchStats();
  }, []);

  return (
    <section className="container py-10 sm:py-14">
      <div className="text-center mb-8 sm:mb-10">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-blue-400">
          Live market
        </p>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
          Today&apos;s crypto movers
        </h2>
        <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto">
          Stay ahead with live top gainers, losers, and key crypto market data
          updated in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Gainers */}
        <div className="min-h-64 w-full rounded-2xl border border-white/10 bg-gray-800/40 p-5">
          <div className="flex items-center gap-3 mb-3 border-b border-white/5 pb-4">
            <div className="flex items-center justify-center bg-green-500/10 rounded-lg p-2">
              <ChartNoAxesCombined className="text-green-400 size-4" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Top Gainers</p>
              <p className="text-gray-500 text-xs">Best performing today</p>
            </div>
          </div>
          {loading ? (
            <StockSkeleton />
          ) : gainers.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              No gainers data available.
            </p>
          ) : (
            <div className="flex flex-col text-sm">
              <div className={`${MOVER_GRID} pb-2 text-[11px] font-medium uppercase tracking-wider text-gray-500`}>
                <span>Asset</span>
                <span className="text-right">Price</span>
                <span className="hidden text-right sm:block">Change</span>
                <span className="text-right">%</span>
              </div>
              {gainers.map((crypto) => (
                <div
                  className={`${MOVER_GRID} rounded-md py-2 -mx-2 px-2 transition-colors hover:bg-white/[0.03]`}
                  key={crypto.symbol}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {crypto.image && (
                      <Image
                        src={crypto.image}
                        alt=""
                        width={20}
                        height={20}
                        className="w-5 h-5 shrink-0 rounded-full"
                      />
                    )}
                    <span className="font-medium text-white">
                      {crypto.symbol.toUpperCase()}
                    </span>
                    <span className="hidden truncate text-gray-500 sm:inline">
                      {crypto.name}
                    </span>
                  </div>
                  <span className="text-right tabular-nums text-gray-400">
                    ${crypto.price.toFixed(2)}
                  </span>
                  <span className="hidden text-right tabular-nums text-green-400 sm:block">
                    +${crypto.change.toFixed(2)}
                  </span>
                  <span className="text-right tabular-nums font-medium text-green-400">
                    +{crypto.changePercent.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Losers */}
        <div className="min-h-64 w-full rounded-2xl border border-white/10 bg-gray-800/40 p-5">
          <div className="flex items-center gap-3 mb-3 border-b border-white/5 pb-4">
            <div className="flex items-center justify-center bg-red-500/10 rounded-lg p-2">
              <ArrowDownNarrowWide className="text-red-400 size-4" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Top Losers</p>
              <p className="text-gray-500 text-xs">Worst performing today</p>
            </div>
          </div>
          {loading ? (
            <StockSkeleton />
          ) : losers.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">
              No losers data available.
            </p>
          ) : (
            <div className="flex flex-col text-sm">
              <div className={`${MOVER_GRID} pb-2 text-[11px] font-medium uppercase tracking-wider text-gray-500`}>
                <span>Asset</span>
                <span className="text-right">Price</span>
                <span className="hidden text-right sm:block">Change</span>
                <span className="text-right">%</span>
              </div>
              {losers.map((crypto) => (
                <div
                  className={`${MOVER_GRID} rounded-md py-2 -mx-2 px-2 transition-colors hover:bg-white/[0.03]`}
                  key={crypto.symbol}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {crypto.image && (
                      <Image
                        src={crypto.image}
                        alt=""
                        width={20}
                        height={20}
                        className="w-5 h-5 shrink-0 rounded-full"
                      />
                    )}
                    <span className="font-medium text-white">
                      {crypto.symbol.toUpperCase()}
                    </span>
                    <span className="hidden truncate text-gray-500 sm:inline">
                      {crypto.name}
                    </span>
                  </div>
                  <span className="text-right tabular-nums text-gray-400">
                    ${crypto.price.toFixed(2)}
                  </span>
                  <span className="hidden text-right tabular-nums text-red-400 sm:block">
                    -${Math.abs(crypto.change).toFixed(2)}
                  </span>
                  <span className="text-right tabular-nums font-medium text-red-400">
                    {crypto.changePercent.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Market Stats Bar */}
      <div className="mx-0 mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : marketStats ? (
          <>
            <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-gray-800/40 px-4 py-3">
              <span className="text-gray-400 text-xs font-medium">Total Market Cap</span>
              <span className="text-white font-semibold text-lg tabular-nums">
                ${(marketStats.totalMarketCap / 1e12).toFixed(2)}T
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-gray-800/40 px-4 py-3">
              <span className="text-gray-400 text-xs font-medium">24h Volume</span>
              <span className="text-white font-semibold text-lg tabular-nums">
                ${(marketStats.totalVolume24h / 1e9).toFixed(2)}B
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-gray-800/40 px-4 py-3">
              <span className="text-gray-400 text-xs font-medium">BTC Dominance</span>
              <span className="text-white font-semibold text-lg tabular-nums">
                {marketStats.btcDominance.toFixed(1)}%
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-white/10 bg-gray-800/40 px-4 py-3">
              <span className="text-gray-400 text-xs font-medium">Active Coins</span>
              <span className="text-white font-semibold text-lg tabular-nums">
                {marketStats.activeCryptocurrencies.toLocaleString()}
              </span>
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-sm text-center col-span-4 py-4">
            Market stats temporarily unavailable.
          </p>
        )}
      </div>
    </section>
  );
};

export default Features;