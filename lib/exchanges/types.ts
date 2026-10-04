export interface ExchangeBalance {
  symbol: string; // e.g. "BTC"
  quantity: number;
}

export interface ExchangeAccountInfo {
  balances: ExchangeBalance[];
  canTrade: boolean;
  canWithdraw: boolean;
}

export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface ExchangeProvider {
  name: string;
  getAccountInfo(credentials: ExchangeCredentials): Promise<ExchangeAccountInfo>;
}
