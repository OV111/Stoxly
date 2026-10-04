import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import ExchangeConnection from "@/models/ExchangeConnection";
import SyncedHolding from "@/models/SyncedHolding";

export async function GET() {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const connections = await ExchangeConnection.find({ userId: user.id }).lean();

  const items = await Promise.all(
    connections.map(async (connection) => {
      const holdings = await SyncedHolding.find({ connectionId: connection._id })
        .select("symbol quantity")
        .lean();
      return {
        id: connection._id,
        provider: connection.provider,
        label: connection.label,
        status: connection.status,
        lastError: connection.lastError,
        lastSyncedAt: connection.lastSyncedAt,
        holdings: holdings.map((h) => ({ symbol: h.symbol, quantity: h.quantity })),
      };
    }),
  );

  return NextResponse.json({ connections: items });
}
