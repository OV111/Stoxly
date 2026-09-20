import { Watchlist } from "@/lib/watchlist/model";
import { WATCHLIST_MAX_ITEMS } from "@/types/watchlist";
import type { WatchlistItemDoc, WatchlistSymbolType } from "@/types/watchlist";
import {
  WatchlistError,
  assertValidSymbol,
  assertValidType,
  normalizeSymbol,
} from "@/lib/watchlist/validation";
import { db } from "@/lib/db"; // ← singleton from your DatabaseConnection file

export async function getUserWatchlist(
  userId: string,
): Promise<WatchlistItemDoc[]> {
  await db.connect();
  const docs = await Watchlist.find({ userId })
    .sort({ addedAt: -1 })
    .lean<WatchlistItemDoc[]>();
  return docs;
}

export async function addToWatchlist(
  userId: string,
  rawSymbol: unknown,
  rawType: unknown,
): Promise<WatchlistItemDoc> {
  const symbol = assertValidSymbol(rawSymbol);
  const type = assertValidType(rawType);

  await db.connect();

  // Limit check
  const count = await Watchlist.countDocuments({ userId });
  if (count >= WATCHLIST_MAX_ITEMS) {
    throw new WatchlistError(
      "LIMIT_REACHED",
      `Watchlist is limited to ${WATCHLIST_MAX_ITEMS} symbols`,
    );
  }

  // Dedup check (also enforced by unique index)
  const existing = await Watchlist.findOne({ userId, symbol, type }).lean();
  if (existing) {
    throw new WatchlistError(
      "DUPLICATE",
      `${symbol} is already in your watchlist`,
    );
  }

  try {
    const doc = await Watchlist.create({ userId, symbol, type });
    return doc.toObject() as unknown as WatchlistItemDoc;
  } catch (err: unknown) {
    // Race condition: unique index fired
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: number }).code === 11000
    ) {
      throw new WatchlistError(
        "DUPLICATE",
        `${symbol} is already in your watchlist`,
      );
    }
    throw err;
  }
}

export async function removeFromWatchlist(
  userId: string,
  rawSymbol: unknown,
  rawType: unknown,
): Promise<void> {
  const symbol = assertValidSymbol(rawSymbol);
  const type = assertValidType(rawType);

  await db.connect();

  const result = await Watchlist.deleteOne({ userId, symbol, type });
  if (result.deletedCount === 0) {
    throw new WatchlistError("NOT_FOUND", `${symbol} is not in your watchlist`);
  }
}

/** Returns just symbol+type pairs — used by the quotes fetcher */
export function toQuoteRequests(
  docs: WatchlistItemDoc[],
): { symbol: string; type: WatchlistSymbolType }[] {
  return docs.map((d) => ({ symbol: normalizeSymbol(d.symbol), type: d.type }));
}
