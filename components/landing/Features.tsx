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
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-white via-blue-400 to-blue-600 bg-clip-text text-transparent">
          Today&apos;s Crypto Movers
        </h2>
        <p className="text-gray-500 text-sm sm:text-base max-w-xl mx-auto">
          Stay ahead with live top gainers, losers, and key crypto market data
          updated in real time.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Gainers */}
        <div className="min-h-64 md:h-100 w-full rounded-xl border border-gray-800 p-4">
          <div className="flex items-center gap-3 mb-4 border-b border-gray-800 pb-3">
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
            <div className="flex flex-col gap-3">
              {gainers.map((crypto) => (
                <div className="flex justify-between items-center" key={crypto.symbol}>
                  <div className="flex items-center gap-2">
                    {crypto.image && (
                      <Image
                        src={crypto.image}
                        alt={crypto.name}
                        width={20}
                        height={20}
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <span className="text-green-400 font-medium">
                      {crypto.symbol.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-gray-400">
                    ${crypto.price.toFixed(2)}
                  </span>
                  <span className="text-green-400">
                    +${crypto.change.toFixed(2)}
                  </span>
                  <span className="text-green-400">
                    +{crypto.changePercent.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Losers */}
        <div className="min-h-64 md:h-100 w-full rounded-xl border border-gray-800 p-4">
          <div className="flex items-center gap-3 mb-4 border-b border-gray-800 pb-3">
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
            <div className="flex flex-col gap-3">
              {losers.map((crypto) => (
                <div className="flex justify-between items-center" key={crypto.symbol}>
                  <div className="flex items-center gap-2">
                    {crypto.image && (
                      <Image
                        src={crypto.image}
                        alt={crypto.name}
                        width={20}
                        height={20}
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <span className="text-red-400 font-medium">
                      {crypto.symbol.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-gray-400">
                    ${crypto.price.toFixed(2)}
                  </span>
                  <span className="text-red-400">
                    -${Math.abs(crypto.change).toFixed(2)}
                  </span>
                  <span className="text-red-400">
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
            <div className="flex flex-col gap-1 rounded-xl border border-gray-800 px-4 py-3">
              <span className="text-gray-400 text-xs font-medium">Total Market Cap</span>
              <span className="text-white font-bold text-lg">
                ${(marketStats.totalMarketCap / 1e12).toFixed(2)}T
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-gray-800 px-4 py-3">
              <span className="text-gray-400 text-xs font-medium">24h Volume</span>
              <span className="text-white font-bold text-lg">
                ${(marketStats.totalVolume24h / 1e9).toFixed(2)}B
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-gray-800 px-4 py-3">
              <span className="text-gray-400 text-xs font-medium">BTC Dominance</span>
              <span className="text-white font-bold text-lg">
                {marketStats.btcDominance.toFixed(1)}%
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-gray-800 px-4 py-3">
              <span className="text-gray-400 text-xs font-medium">Active Coins</span>
              <span className="text-white font-bold text-lg">
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