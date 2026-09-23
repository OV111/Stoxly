"use client";

import { useState, useMemo, useEffect } from "react";
import SymbolFilterBar from "@/components/news/SymbolFilterBar";
import NewsCard from "@/components/news/NewsCard";
import { Classic } from "@/components/loading-ui/classic";

type ApiNewsItem = {
  symbol: string;
  source: string;
  headline: string;
  summary: string;
  url: string;
  datetime: number; // unix seconds
};

type NewsItem = {
  symbols: string[];
  source: string;
  timeAgo: string;
  headline: string;
  summary: string;
};

const timeAgo = (unixSeconds: number) => {
  const diffMs = Date.now() - unixSeconds * 1000;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const watchlistSymbols = ["AAPL", "MSFT", "TSLA", "AMZN", "GOOGL", "NVDA"];

const NewsFeed = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((data: ApiNewsItem[]) => {
        if (!Array.isArray(data)) return setError(true);
        setNews(
          data.map((item) => ({
            symbols: [item.symbol],
            source: item.source,
            timeAgo: timeAgo(item.datetime),
            headline: item.headline,
            summary: item.summary,
          })),
        );
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!activeSymbol) return news;
    return news.filter((item) => item.symbols.includes(activeSymbol));
  }, [news, activeSymbol]);

  return (
    <div>
      <SymbolFilterBar symbols={watchlistSymbols} active={activeSymbol} onChange={setActiveSymbol} />
      {loading && (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <Classic className="size-8 text-gray-400" />
          <p className="text-gray-500 text-sm">Loading news...</p>
        </div>
      )}
      {error && <p className="text-red-500 text-sm text-center py-12">Failed to load news.</p>}
      {!loading && !error && (
        <div className="flex flex-col gap-4">
          {filtered.map((item, i) => (
            <NewsCard key={i} {...item} />
          ))}
          {filtered.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-12">
              No recent headlines for this symbol.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default NewsFeed;
