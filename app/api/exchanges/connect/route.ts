import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import { encrypt } from "@/lib/crypto";
import { getExchangeProvider } from "@/lib/exchanges";
import ExchangeConnection, {
  ExchangeProviderName,
} from "@/models/ExchangeConnection";

const SUPPORTED_PROVIDERS: ExchangeProviderName[] = ["binance"];

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { provider, apiKey, apiSecret, label } = body as {
    provider?: unknown;
    apiKey?: unknown;
    apiSecret?: unknown;
    label?: unknown;
  };

  if (
    typeof provider !== "string" ||
    !SUPPORTED_PROVIDERS.includes(provider as ExchangeProviderName)
  ) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }
  if (typeof apiKey !== "string" || !apiKey.trim() || typeof apiSecret !== "string" || !apiSecret.trim()) {
    return NextResponse.json({ error: "apiKey and apiSecret are required" }, { status: 400 });
  }

  const providerName = provider as ExchangeProviderName;
  const exchangeProvider = getExchangeProvider(providerName);

  // Validate the key works and is read-only before storing anything.
  let accountInfo;
  try {
    accountInfo = await exchangeProvider.getAccountInfo({ apiKey, apiSecret });
  } catch (err) {
    console.error("[exchanges:connect] validation failed:", err);
    return NextResponse.json(
      { error: "Could not verify credentials with the exchange" },
      { status: 400 },
    );
  }

  if (accountInfo.canTrade || accountInfo.canWithdraw) {
    return NextResponse.json(
      {
        error:
          "This API key has trade or withdraw permissions. Create a key with read-only access instead.",
      },
      { status: 400 },
    );
  }

  await connectDB();

  const connection = await ExchangeConnection.findOneAndUpdate(
    { userId: user.id, provider: providerName },
    {
      userId: user.id,
      provider: providerName,
      label: typeof label === "string" ? label : undefined,
      apiKeyEncrypted: encrypt(apiKey),
      apiSecretEncrypted: encrypt(apiSecret),
      status: "connected",
      lastError: undefined,
      lastSyncedAt: new Date(),
    },
    { upsert: true, new: true },
  );

  return NextResponse.json(
    {
      connection: {
        id: connection._id,
        provider: connection.provider,
        label: connection.label,
        status: connection.status,
        lastSyncedAt: connection.lastSyncedAt,
      },
      balances: accountInfo.balances,
    },
    { status: 201 },
  );
}
