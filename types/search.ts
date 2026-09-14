
export type InstrumentType = 'stock' | 'crypto' | 'etf' | 'index';

export interface Instrument {
  symbol: string;       // e.g., "AAPL", "BTC"
  name: string;         // e.g., "Apple Inc.", "Bitcoin"
  type: InstrumentType;
  logo?: string;        // URL (CoinGecko provides, others may not)
  exchange?: string;    // e.g., "NASDAQ", "NYSE"
  market?: string;      // e.g., "US", "Global"
  currency?: string;    // e.g., "USD"
  marketCap?:number;
  // optional internal id – can be constructed from symbol+type
  id?: string;
}