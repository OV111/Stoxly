import { ArticleSentiment, SentimentLabel, SentimentScore } from "./types";

function labelFromScore(score: number): SentimentLabel {
  if (score > 0.15) return "positive";
  if (score < -0.15) return "negative";
  return "neutral";
}

/**
 * Pure aggregation — no network, no DB. Groups already-classified articles by
 * symbol and averages their scores (HARLF's S_t = Σ(P_pos − P_neg) / N).
 */
export function computeSentimentScores(
  classified: ArticleSentiment[],
  windowStart: Date,
  windowEnd: Date,
): SentimentScore[] {
  const bySymbol = new Map<string, ArticleSentiment[]>();
  for (const item of classified) {
    const list = bySymbol.get(item.article.symbol) ?? [];
    list.push(item);
    bySymbol.set(item.article.symbol, list);
  }

  return [...bySymbol.entries()].map(([symbol, items]) => {
    const score = items.reduce((sum, i) => sum + i.score, 0) / items.length;
    return {
      symbol,
      windowStart,
      windowEnd,
      articleCount: items.length,
      score,
      label: labelFromScore(score),
    };
  });
}
