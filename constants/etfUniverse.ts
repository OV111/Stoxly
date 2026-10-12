/**
 * The ETFs scanned for the stock page's ETF-exposure view.
 *
 * There is no free reverse lookup ("which ETFs hold X?"), so exposure is
 * computed by reading each of these funds' published top holdings. The UI
 * names this list's size so the result is never mistaken for every ETF in
 * the market. Chosen for coverage: broad-market, style, all eleven SPDR
 * sectors, and the largest thematic/industry funds by assets.
 */
export const ETF_UNIVERSE = [
  // Broad market & style
  "SPY", "IVV", "VOO", "VTI", "QQQ", "DIA", "IWM", "RSP", "VUG", "VTV", "MGK", "SCHD", "VIG",
  // SPDR sectors
  "XLK", "XLF", "XLV", "XLE", "XLY", "XLP", "XLI", "XLC", "XLU", "XLB", "XLRE",
  // Industry & thematic
  "VGT", "SMH", "SOXX", "IGV", "FDN", "IBB", "XBI", "KRE", "ITA", "XRT", "ARKK",
] as const;
