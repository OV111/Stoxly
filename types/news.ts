export type NewsCategory = 'general' | 'forex' | 'crypto' | 'merger';
export type NewsSource = 'finnhub' | 'coingecko';

export interface NewsArticle {
  id: string;              // canonical id (source + article id)
  headline: string;
  summary: string;
  url: string;
  image?: string;
  source: string;          // e.g. "Reuters", "Yahoo"
  sourceType: NewsSource;  // which adapter provided it
  datetime: number;        // unix timestamp (seconds)
  category?: NewsCategory;
  relatedSymbols?: string[]; // e.g. ["AAPL", "CRYPTO:bitcoin"]
  provider?: string;       // e.g. "finnhub"
}