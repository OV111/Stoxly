import type { ExchangeProvider } from "./types";
import { binanceProvider } from "./binance";
import type { ExchangeProviderName } from "@/models/ExchangeConnection";

const providers: Record<ExchangeProviderName, ExchangeProvider> = {
  binance: binanceProvider,
};

export function getExchangeProvider(name: ExchangeProviderName): ExchangeProvider {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unsupported exchange provider: ${name}`);
  }
  return provider;
}
