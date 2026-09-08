import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import { getCurrentUser } from "@/lib/getCurrentUser";
import PortfolioSnapshot from "@/models/PortfolioSnapshot";

const DEFAULT_DAYS = 90;
const MAX_DAYS = 365; // Prevent excessive query

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const daysParam = url.searchParams.get("days");
    let days = DEFAULT_DAYS;

    if (daysParam) {
      const parsed = Number(daysParam);
      if (Number.isFinite(parsed) && parsed > 0) {
        days = Math.min(Math.floor(parsed), MAX_DAYS);
      }
    }

    await connectDB();

    const cutoff = new Date(Date.now() - days * 86_400_000);

    const snapshots = await PortfolioSnapshot.find({
      userId: user.id,
      snapshotDate: { $gte: cutoff },
    })
      .sort({ snapshotDate: 1 })
      .lean();

    // Early return if no data
    if (snapshots.length === 0) {
      return NextResponse.json(
        {
          snapshots: [],
          totalDeposits: 0,
          totalWithdrawals: 0,
          startValue: 0,
          endValue: 0,
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          },
        },
      );
    }

    // Transform to component shape
    const transformed = snapshots.map((s: any) => ({
      date: s.snapshotDate.toISOString().split("T")[0], // YYYY-MM-DD
      value: s.totalValue ?? 0,
      deposits: s.netDeposits && s.netDeposits > 0 ? s.netDeposits : 0,
      withdrawals:
        s.netDeposits && s.netDeposits < 0 ? Math.abs(s.netDeposits) : 0,
    }));

    // Compute aggregates
    const totalDeposits = transformed.reduce((sum, d) => sum + d.deposits, 0);
    const totalWithdrawals = transformed.reduce(
      (sum, d) => sum + d.withdrawals,
      0,
    );
    const startValue = transformed[0].value;
    const endValue = transformed[transformed.length - 1].value;

    const response = {
      snapshots: transformed,
      totalDeposits,
      totalWithdrawals,
      startValue,
      endValue,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("[snapshots:GET]", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
