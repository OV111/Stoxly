import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getCurrentUser } from "@/lib/getCurrentUser";
import Transaction from "@/models/Transactions";
import { fetchCompanyNews, fetchCryptoNews } from "@/lib/finnhub";
import { classifyArticles } from "@/lib/analytics/sentiment/classify";
import { computeSentimentScores } from "@/lib/analytics/sentiment/sentiment-engine";
import { NewsArticle } from "@/lib/analytics/sentiment/types";

// Cap how many held symbols get a sentiment pass — keeps Finnhub + Groq
// call volume bounded to what a real portfolio needs, not a watchlist-sized feed.
const MAX_SYMBOLS = 10;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Portfolio-scoped by design: only symbols the user actually holds,
    // never a general market feed. See Vision.md §6.
    const transactions = await Transaction.find(
      { userId: user.id },
      { symbol: 1, _id: 0 },
    ).lean();
    const heldSymbols = [
      ...new Set(transactions.filter((t) => t.symbol).map((t) => t.symbol as string)),
    ].slice(0, MAX_SYMBOLS);

    if (heldSymbols.length === 0) {
      return NextResponse.json({ scores: [] }, { status: 200 });
    }

    const stockSymbols = heldSymbols.filter((s) => !s.startsWith("CRYPTO:"));
    const cryptoSymbols = heldSymbols.filter((s) => s.startsWith("CRYPTO:"));

    const [stockResults, cryptoResults] = await Promise.all([
      Promise.all(stockSymbols.map((symbol) => fetchCompanyNews(symbol))),
      Promise.all(cryptoSymbols.map((symbol) => fetchCryptoNews([symbol]))),
    ]);

    const articles: NewsArticle[] = [
      ...stockResults.flat().map((item) => ({
        symbol: item.symbol,
        headline: item.headline,
        summary: item.summary,
        source: item.source,
        url: item.url,
        publishedAt: new Date(item.datetime * 1000),
      })),
      ...cryptoResults.flatMap((items, i) =>
        items.map((item) => ({
          symbol: cryptoSymbols[i],
          headline: item.title,
          summary: item.description,
          source: item.source,
          url: item.url,
          publishedAt: new Date(item.publishedAt),
        })),
      ),
    ];

    if (articles.length === 0) {
      return NextResponse.json({ scores: [] }, { status: 200 });
    }

    const classified = await classifyArticles(articles);

    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - 7 * 86_400_000);
    const scores = computeSentimentScores(classified, windowStart, windowEnd);

    return NextResponse.json(
      { scores },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, s-maxage=1800, stale-while-revalidate=3600",
        },
      },
    );
  } catch (err) {
    console.error("[sentiment]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
