import { describe, it, expect } from "vitest";
import { assertValidSymbol, assertValidType, isValidSymbol, WatchlistError } from "./validation";

describe("watchlist validation", () => {
  it.each(["AAPL", "brk.b", " msft ", "BTC-USD", "SPY"])("accepts %j", (s) => {
    expect(isValidSymbol(s)).toBe(true);
  });

  it.each(["", "   ", "A".repeat(16), "AAPL;DROP", "$AAPL", "<script>", 42, null, undefined, { $ne: "" }])(
    "rejects %j",
    (s) => {
      expect(isValidSymbol(s)).toBe(false);
    },
  );

  it("normalizes to trimmed uppercase", () => {
    expect(assertValidSymbol("  aapl ")).toBe("AAPL");
  });

  it("throws a typed WatchlistError the API layer can map to a 400", () => {
    try {
      assertValidSymbol("not valid!");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(WatchlistError);
      expect((err as WatchlistError).code).toBe("INVALID_SYMBOL");
    }
  });

  it("only allows known instrument types", () => {
    expect(assertValidType("stock")).toBe("stock");
    expect(() => assertValidType("options")).toThrow(WatchlistError);
  });
});
