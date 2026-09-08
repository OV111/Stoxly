import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getCurrentUser } from "@/lib/getCurrentUser";
import Watchlist from "@/models/Watchlist";
import { fetchQuotes } from "@/lib/finnhub";
import { fetchCryptoQuotes } from "@/lib/coingecko";

const isCryptoSymbol = (symbol: string) => symbol.startsWith("CRYPTO:");

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const watchlist = await Watchlist.findOne({ userId: user.id });
    const symbols = watchlist?.symbols ?? [];

    if (symbols.length === 0) {
      return NextResponse.json({ items: [], total: 0 }, { status: 200 });
    }

    // Separate stocks and crypto
    const stockSymbols = symbols.filter((s) => !isCryptoSymbol(s));
    const cryptoSymbols = symbols.filter((s) => isCryptoSymbol(s));

    // Fetch quotes for both
    const [stockQuotes, cryptoQuotes] = await Promise.all([
      stockSymbols.length > 0 ? fetchQuotes(stockSymbols) : [],
      cryptoSymbols.length > 0 ? fetchCryptoQuotes(cryptoSymbols) : [],
    ]);

    // Format stocks
    const stockItems = stockQuotes.map((q) => ({
      id: q.symbol,
      symbol: q.symbol,
      name: q.symbol, // You might want to fetch names from a separate endpoint
      type: "stock" as const,
      price: q.price,
      change: q.change,
      changePercent: q.changePercent,
      volume: null,
      image: null,
    }));

    // Format crypto
    const cryptoItems = cryptoQuotes.map((q) => ({
      id: q.symbol,
      symbol: q.symbol.replace("CRYPTO:", ""),
      name: q.symbol.replace("CRYPTO:", "").toUpperCase(),
      type: "crypto" as const,
      price: q.price,
      change: q.change,
      changePercent: q.changePercent,
      volume: null,
      image: q.image,
    }));

    const items = [...stockItems, ...cryptoItems];

    return NextResponse.json({ items, total: items.length }, { status: 200 });
  } catch (err) {
    console.error("[watchlist:GET]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { symbol } = body;

    if (!symbol || typeof symbol !== "string" || !symbol.trim()) {
      return NextResponse.json(
        { message: "symbol is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const normalizedSymbol = symbol.trim().toUpperCase();

    const watchlist = await Watchlist.findOneAndUpdate(
      { userId: user.id },
      { $addToSet: { symbols: normalizedSymbol } },
      { upsert: true, new: true },
    );

    return NextResponse.json(watchlist, { status: 200 });
  } catch (err) {
    console.error("[watchlist:POST]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { symbol } = body;

    if (!symbol || typeof symbol !== "string" || !symbol.trim()) {
      return NextResponse.json(
        { message: "symbol is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const normalizedSymbol = symbol.trim().toUpperCase();

    const watchlist = await Watchlist.findOneAndUpdate(
      { userId: user.id },
      { $pull: { symbols: normalizedSymbol } },
      { new: true },
    );

    return NextResponse.json(watchlist ?? { symbols: [] }, { status: 200 });
  } catch (err) {
    console.error("[watchlist:DELETE]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
