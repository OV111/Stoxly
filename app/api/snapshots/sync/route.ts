import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/getCurrentUser";
import {
  snapshotPortfolioForUser,
  snapshotAllPortfolios,
} from "@/lib/portfolioSnapshotSync";

/**
 * Cron entry point (see vercel.json) — snapshots every user's portfolio, not
 * just one. Vercel Cron can't hold a session cookie, so this is guarded by a
 * shared secret instead, same reasoning as /api/alerts/evaluate. When
 * CRON_SECRET is unset (local dev) it falls back to requiring a logged-in
 * user so the route is never wide open in either configuration.
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

    const results = await snapshotAllPortfolios();

    return NextResponse.json({ results }, { status: 200 });
  } catch (err) {
    console.error("[snapshots/sync:GET]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// Manual, session-scoped trigger — snapshots only the caller's own portfolio.
// Kept for ad-hoc testing from the browser while logged in.
export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const snapshot = await snapshotPortfolioForUser(user.id);

    if (!snapshot) {
      return NextResponse.json(
        { message: "Failed to create snapshot – no portfolio data" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message: "Snapshot created successfully",
        snapshot,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[snapshots/sync:POST]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
