"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Classic } from "@/components/loading-ui/classic";

type SentimentScore = {
  symbol: string;
  windowStart: string;
  windowEnd: string;
  articleCount: number;
  score: number;
  label: "positive" | "neutral" | "negative";
};

type SentimentPanelProps = {
  symbol: string;
};

const LABEL_STYLE: Record<SentimentScore["label"], { text: string; icon: typeof TrendingUp }> = {
  positive: { text: "text-teal-400", icon: TrendingUp },
  negative: { text: "text-red-500", icon: TrendingDown },
  neutral: { text: "text-gray-400", icon: Minus },
};

const SentimentPanel = ({ symbol }: SentimentPanelProps) => {
  const [scores, setScores] = useState<SentimentScore[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch("/api/sentiment")
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json?.scores)) setScores(json.scores);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Classic className="size-6 text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-500 py-4 text-center">
        Couldn&apos;t load sentiment for {symbol}.
      </p>
    );
  }

  const match = scores?.find((s) => s.symbol === symbol);

  if (!match) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-8 text-center">
        <p className="text-gray-300 font-medium">No sentiment data for {symbol}</p>
        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
          Sentiment is computed from recent news for symbols in your ledger. Add a
          transaction for {symbol}, or check back after news breaks for it.
        </p>
      </div>
    );
  }

  const { text, icon: Icon } = LABEL_STYLE[match.label];

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">News sentiment, last 7 days</p>
          <div className={`flex items-center gap-2 mt-1 ${text}`}>
            <Icon className="size-5" />
            <span className="text-lg font-semibold capitalize">{match.label}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-gray-100">
            {match.score >= 0 ? "+" : ""}
            {match.score.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">
            {match.articleCount} article{match.articleCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <p className="text-xs text-gray-500 border-t border-gray-700 pt-3">
        Grounded in real headlines only — this score never predicts price direction,
        it describes the tone of recent coverage for {symbol}.
      </p>
    </div>
  );
};

export default SentimentPanel;
