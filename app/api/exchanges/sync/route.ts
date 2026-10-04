import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { decrypt } from "@/lib/crypto";
import { getExchangeProvider } from "@/lib/exchanges";
import ExchangeConnection from "@/models/ExchangeConnection";
import SyncedHolding from "@/models/SyncedHolding";

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { connectionId } = body as { connectionId?: unknown };
  if (typeof connectionId !== "string") {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  await connectDB();

  const connection = await ExchangeConnection.findOne({
    _id: connectionId,
    userId: user.id,
  });
  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const provider = getExchangeProvider(connection.provider);
  const apiKey = decrypt(connection.apiKeyEncrypted);
  const apiSecret = decrypt(connection.apiSecretEncrypted);

  try {
    const accountInfo = await provider.getAccountInfo({ apiKey, apiSecret });

    await Promise.all(
      accountInfo.balances.map((balance) =>
        SyncedHolding.findOneAndUpdate(
          { connectionId: connection._id, symbol: balance.symbol },
          {
            userId: user.id,
            connectionId: connection._id,
            symbol: balance.symbol,
            quantity: balance.quantity,
          },
          { upsert: true },
        ),
      ),
    );

    // Drop synced holdings for assets no longer present in the exchange response.
    const currentSymbols = accountInfo.balances.map((b) => b.symbol);
    await SyncedHolding.deleteMany({
      connectionId: connection._id,
      symbol: { $nin: currentSymbols },
    });

    connection.status = "connected";
    connection.lastError = undefined;
    connection.lastSyncedAt = new Date();
    await connection.save();

    return NextResponse.json({
      balances: accountInfo.balances,
      lastSyncedAt: connection.lastSyncedAt,
    });
  } catch (err) {
    connection.status = "error";
    connection.lastError = err instanceof Error ? err.message : "Sync failed";
    await connection.save();

    console.error("[exchanges:sync] failed:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 502 });
  }
}
