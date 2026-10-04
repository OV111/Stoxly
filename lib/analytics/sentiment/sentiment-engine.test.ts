import { describe, it, expect } from "vitest";
import { computeSentimentScores } from "./sentiment-engine";
import { ArticleSentiment, NewsArticle } from "./types";

function article(symbol: string, headline = "headline"): NewsArticle {
  return {
    symbol,
    headline,
    source: "test",
    url: "https://example.com",
    publishedAt: new Date(),
  };
}

function sentiment(symbol: string, score: number): ArticleSentiment {
  return {
    article: article(symbol),
    label: score > 0.15 ? "positive" : score < -0.15 ? "negative" : "neutral",
    score,
  };
}

describe("computeSentimentScores", () => {
  const windowStart = new Date("2026-09-01");
  const windowEnd = new Date("2026-09-08");

  it("averages scores per symbol", () => {
    const classified = [
      sentiment("AAPL", 0.6),
      sentiment("AAPL", 0.2),
      sentiment("NVDA", -0.8),
    ];

    const scores = computeSentimentScores(classified, windowStart, windowEnd);

    const aapl = scores.find((s) => s.symbol === "AAPL")!;
    expect(aapl.articleCount).toBe(2);
    expect(aapl.score).toBeCloseTo(0.4, 5);
    expect(aapl.label).toBe("positive");

    const nvda = scores.find((s) => s.symbol === "NVDA")!;
    expect(nvda.articleCount).toBe(1);
    expect(nvda.score).toBeCloseTo(-0.8, 5);
    expect(nvda.label).toBe("negative");
  });

  it("labels a near-zero average as neutral", () => {
    const classified = [sentiment("MSFT", 0.1), sentiment("MSFT", -0.05)];

    const scores = computeSentimentScores(classified, windowStart, windowEnd);

    expect(scores[0].label).toBe("neutral");
  });

  it("returns an empty array for no input", () => {
    expect(computeSentimentScores([], windowStart, windowEnd)).toEqual([]);
  });
});
