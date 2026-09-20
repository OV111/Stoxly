import type { WatchlistSymbolType } from "@/types/watchlist";

const VALID_TYPES: WatchlistSymbolType[] = ["stock", "crypto", "etf", "index"];

/** Symbol rules: 1–15 chars, letters/digits/./- */
const SYMBOL_RE = /^[A-Z0-9.\-]{1,15}$/;

export function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidSymbol(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  return SYMBOL_RE.test(normalizeSymbol(raw));
}

export function isValidType(raw: unknown): raw is WatchlistSymbolType {
  return typeof raw === "string" && VALID_TYPES.includes(raw as WatchlistSymbolType);
}

/** Throwing variant for service-layer use */
export function assertValidSymbol(raw: unknown): string {
  if (!isValidSymbol(raw)) {
    throw new WatchlistError("INVALID_SYMBOL", "Invalid symbol");
  }
  return normalizeSymbol(raw);
}

export function assertValidType(raw: unknown): WatchlistSymbolType {
  if (!isValidType(raw)) {
    throw new WatchlistError("INVALID_SYMBOL", "Invalid instrument type");
  }
  return raw;
}

/** Custom error so the API layer can map codes → HTTP status */
export class WatchlistError extends Error {
  code:
    | "UNAUTHORIZED"
    | "INVALID_SYMBOL"
    | "DUPLICATE"
    | "LIMIT_REACHED"
    | "NOT_FOUND"
    | "UPSTREAM_ERROR";

  constructor(code: WatchlistError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "WatchlistError";
  }
}