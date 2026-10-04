import crypto from "crypto";
import type {
  ExchangeAccountInfo,
  ExchangeCredentials,
  ExchangeProvider,
} from "./types";

const BASE_URL = "https://api.binance.com";

function sign(secret: string, query: string): string {
  return crypto.createHmac("sha256", secret).update(query).digest("hex");
}

interface BinanceAccountResponse {
  canTrade: boolean;
  canWithdraw: boolean;
  balances: { asset: string; free: string; locked: string }[];
}

async function getAccountInfo(
  credentials: ExchangeCredentials
): Promise<ExchangeAccountInfo> {
  const { apiKey, apiSecret } = credentials;

  const timestamp = Date.now();
  const query = `timestamp=${timestamp}&recvWindow=5000`;
  const signature = sign(apiSecret, query);

  const res = await fetch(
    `${BASE_URL}/api/v3/account?${query}&signature=${signature}`,
    {
      headers: { "X-MBX-APIKEY": apiKey },
      signal: AbortSignal.timeout(8_000),
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Binance account request failed (${res.status}): ${body}`);
  }

  const data: BinanceAccountResponse = await res.json();

  const balances = data.balances
    .map((b) => ({ symbol: b.asset, quantity: parseFloat(b.free) + parseFloat(b.locked) }))
    .filter((b) => b.quantity > 0);

  return {
    balances,
    canTrade: data.canTrade,
    canWithdraw: data.canWithdraw,
  };
}

export const binanceProvider: ExchangeProvider = {
  name: "binance",
  getAccountInfo,
};
