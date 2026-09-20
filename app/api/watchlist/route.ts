import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getUserWatchlist,
  addToWatchlist,
  removeFromWatchlist,
} from "@/lib/watchlist/service";
import { fetchWatchlistItems } from "@/lib/watchlist/quotes";
import { WatchlistError } from "@/lib/watchlist/validation";

const ERROR_STATUS: Record<WatchlistError["code"], number> = {
  UNAUTHORIZED: 401,
  INVALID_SYMBOL: 400,
  DUPLICATE: 409,
  LIMIT_REACHED: 409,
  NOT_FOUND: 404,
  UPSTREAM_ERROR: 502,
};

function errorResponse(err: unknown) {
  if (err instanceof WatchlistError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: ERROR_STATUS[err.code] },
    );
  }
  console.error("[watchlist:api] unexpected error:", err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const docs = await getUserWatchlist(user.id);
    const items = await fetchWatchlistItems(docs);

    return NextResponse.json({ items });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body", code: "INVALID_SYMBOL" },
        { status: 400 },
      );
    }

    const { symbol, type } = body as { symbol?: unknown; type?: unknown };
    const doc = await addToWatchlist(user.id, symbol, type);

    return NextResponse.json(
      {
        item: {
          symbol: doc.symbol,
          type: doc.type,
          addedAt: doc.addedAt,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");
    const type = searchParams.get("type");

    await removeFromWatchlist(user.id, symbol, type);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
