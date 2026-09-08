"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/dashboard/Panel";
import { RefreshCw, ExternalLink, Clock } from "lucide-react";

type NewsItem = {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  category?: string;
};

type NewsData = {
  items: NewsItem[];
  total: number;
};

const NewsPanel = () => {
  const [news, setNews] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/news");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch news");
      }

      setNews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load news");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  if (loading) {
    return (
      <Panel title="NEWS" slot="@news">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 bg-gray-800/30 rounded-lg space-y-2">
              <div className="h-4 bg-gray-800/60 rounded w-3/4" />
              <div className="flex items-center gap-2">
                <div className="h-3 bg-gray-800/60 rounded w-1/4" />
                <div className="h-3 bg-gray-800/60 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  if (error || !news) {
    return (
      <Panel title="NEWS" slot="@news">
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <p className="text-red-500 text-sm">{error || "Failed to load news."}</p>
          <button
            onClick={() => fetchNews()}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="NEWS"
      slot="@news"
      meta={`${news.total} articles`}
      action={
        <button
          onClick={() => fetchNews(true)}
          disabled={refreshing}
          className="text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      }
    >
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
        {news.items.slice(0, 10).map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-lg hover:bg-gray-800/30 transition-all group border border-gray-800/50 hover:border-gray-700"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors line-clamp-2">
                  {item.title}
                </h3>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] font-medium text-gray-500">
                    {item.source}
                  </span>
                  <span className="w-0.5 h-0.5 rounded-full bg-gray-600" />
                  <span className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(item.publishedAt)}
                  </span>
                  {item.sentiment && (
                    <>
                      <span className="w-0.5 h-0.5 rounded-full bg-gray-600" />
                      <span
                        className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                          item.sentiment === 'bullish'
                            ? 'bg-teal-500/10 text-teal-400'
                            : item.sentiment === 'bearish'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-gray-500/10 text-gray-400'
                        }`}
                      >
                        {item.sentiment}
                      </span>
                    </>
                  )}
                  {item.category && (
                    <>
                      <span className="w-0.5 h-0.5 rounded-full bg-gray-600" />
                      <span className="text-[9px] text-gray-500">
                        {item.category}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors flex-shrink-0 mt-1" />
            </div>
          </a>
        ))}
        {news.items.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No news available</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4b5563;
        }
      `}</style>
    </Panel>
  );
};

export default NewsPanel;