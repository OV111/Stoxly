import type { InstrumentType } from "@/types/search";

export type WatchlistSymbolType = InstrumentType; // "stock" | "crypto" | "etf" | "index"

export interface WatchlistItemDoc {
  _id: string;
  userId: string;
  symbol: string;
  type: WatchlistSymbolType;
  addedAt: Date;
}

export interface WatchlistItem {
  symbol: string;
  type: WatchlistSymbolType;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  logo?: string;
  exchange?: string;

  volume?: number | null;
  marketCap?: number | null;
  sector?: string | null;
  high52?: number | null;
  low52?: number | null;
  sparkline?: number[]; // 7d closes
}

export interface AddWatchlistBody {
  symbol: string;
  type: WatchlistSymbolType;
}

export interface WatchlistResponse {
  items: WatchlistItem[];
}

export interface WatchlistErrorResponse {
  error: string;
  code?:
    | "UNAUTHORIZED"
    | "INVALID_SYMBOL"
    | "DUPLICATE"
    | "LIMIT_REACHED"
    | "NOT_FOUND"
    | "UPSTREAM_ERROR";
}

export const WATCHLIST_MAX_ITEMS = 50;

// UI-only sort/filter types
export type SortKey = "changePercent" | "marketCap" | "volume" | "symbol";
export type SortDir = "asc" | "desc";
export type Filter  = "all" | "gainers" | "losers";