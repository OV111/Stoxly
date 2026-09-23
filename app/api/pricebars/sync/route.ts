import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getCurrentUser } from "@/lib/getCurrentUser";
import Transaction from "@/models/Transactions";
import { syncPriceBarsForSymbols } from "@/lib/priceBarSync";

// Daily cron window: pulls just the last week rather than re-fetching/re-deduping
// a full year every run. Self-healing — if a day gets missed (deploy downtime,
// provider outage), the next run's overlap picks it up.
const CRON_SYNC_DAYS = 7;

/**
 * Cron entry point (see vercel.json) — syncs price bars for every symbol
 * anyone currently holds, not a caller-supplied list. Vercel Cron can't hold
 * a session cookie, so this is guarded by a shared secret instead, same
 * reasoning as /api/alerts/evaluate. When CRON_SECRET is unset (local dev) it
 * falls back to requiring a logged-in user so the route is never wide open in
 * either configuration.
 */
export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
    } else {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
    }

    await connectDB();
    const symbols = (await Transaction.distinct("symbol", {
      symbol: { $ne: null },
    })) as string[];

    const results = await syncPriceBarsForSymbols(symbols, CRON_SYNC_DAYS);

    return NextResponse.json({ results }, { status: 200 });
  } catch (err) {
    console.error("[pricebars/sync:GET]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

/**
 * Manual, session-scoped trigger — call from the browser/Postman while logged
 * in to backfill an explicit symbol list over an explicit window (e.g. a full
 * year for a newly seeded account). Body: { symbols: string[], days?: number }
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { symbols, days } = body;

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json(
        { message: "symbols (non-empty array) is required" },
        { status: 400 },
      );
    }

    const results = await syncPriceBarsForSymbols(symbols, days ?? 365);

    return NextResponse.json({ results }, { status: 200 });
  } catch (err) {
    console.error("[pricebars/sync:POST]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
