export interface NewsArticle {
  symbol: string; // canonical symbol, e.g. "AAPL" or "CRYPTO:bitcoin"
  headline: string;
  summary?: string;
  source: string;
  url: string;
  publishedAt: Date;
}

export type SentimentLabel = "positive" | "neutral" | "negative";

export interface ArticleSentiment {
  article: NewsArticle;
  label: SentimentLabel;
  score: number; // -1 (very negative) .. +1 (very positive)
}

export interface SentimentScore {
  symbol: string;
  windowStart: Date;
  windowEnd: Date;
  articleCount: number;
  score: number; // HARLF's S_t = Σ(P_pos − P_neg) / N, aggregated
  label: SentimentLabel;
}
