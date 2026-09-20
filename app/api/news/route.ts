import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { Watchlist } from "@/lib/watchlist/model";
import Transaction from "@/models/Transactions";
import { fetchNewsForSymbols, fetchCryptoNews } from "@/lib/finnhub";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // ✅ FIXED: schema is one-doc-per-symbol, not a single doc with symbols[]
    const watchlistDocs = await Watchlist.find(
      { userId: user.id },
      { symbol: 1, _id: 0 }
    ).lean();
    const watchlistSymbols = watchlistDocs.map((d) => d.symbol);

    // Portfolio holdings
    const transactions = await Transaction.find({ userId: user.id });
    const holdingsSymbols = [
      ...new Set(
        transactions
          .filter((t) => t.symbol)
          .map((t) => t.symbol!),
      ),
    ];

    const allSymbols = [...new Set([...watchlistSymbols, ...holdingsSymbols])];

    if (allSymbols.length === 0) {
      return NextResponse.json(
        { items: [], total: 0 },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        },
      );
    }

    const stockSymbols  = allSymbols.filter((s) => !s.startsWith("CRYPTO:"));
    const cryptoSymbols = allSymbols.filter((s) =>  s.startsWith("CRYPTO:"));

    const [stockNews, cryptoNews] = await Promise.all([
      stockSymbols.length  > 0 ? fetchNewsForSymbols(stockSymbols.slice(0, 10))  : Promise.resolve([]),
      cryptoSymbols.length > 0 ? fetchCryptoNews(cryptoSymbols.slice(0, 10))     : Promise.resolve([]),
    ]);

    const sortedNews = [...stockNews, ...cryptoNews]
      .sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 20);

    const items = sortedNews.map((item) => ({
      id:          item.id || `${item.source}-${Date.now()}`,
      title:       item.title,
      source:      item.source || "Unknown",
      publishedAt: item.publishedAt || new Date().toISOString(),
      url:         item.url || "#",
      sentiment:   analyzeSentiment(item.title, item.description || ""),
      category:    item.category || "general",
    }));

    return NextResponse.json(
      { items, total: items.length },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (err) {
    console.error("[news:GET]", err);
    return NextResponse.json(
      { message: "Failed to fetch news" },
      { status: 500 },
    );
  }
}

function analyzeSentiment(
  title: string,
  description: string,
): "bullish" | "bearish" | "neutral" {
  const text = (title + " " + description).toLowerCase();

  const bullishWords = [
    "bull", "bullish", "rally", "surge", "soar", "jump", "rise", "gain",
    "upgrade", "buy", "positive", "record", "high", "boom", "growth",
    "breakout", "strong", "outperform", "beat", "exceed",
  ];
  const bearishWords = [
    "bear", "bearish", "crash", "plunge", "drop", "fall", "decline", "loss",
    "downgrade", "sell", "negative", "low", "slump", "recession", "bear market",
    "weak", "underperform", "miss", "fail", "warning", "crisis",
  ];

  let bullishScore = 0;
  let bearishScore = 0;
  bullishWords.forEach((w) => { if (text.includes(w)) bullishScore++; });
  bearishWords.forEach((w) => { if (text.includes(w)) bearishScore++; });

  if (bullishScore > bearishScore + 2) return "bullish";
  if (bearishScore > bullishScore + 2) return "bearish";
  return "neutral";
}