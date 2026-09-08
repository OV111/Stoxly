import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { snapshotPortfolioForUser } from "@/lib/portfolioSnapshotSync";

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
