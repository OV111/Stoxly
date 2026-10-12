import YahooFinance from "yahoo-finance2";
import { TTL } from "@/lib/singleflight";
import { cached } from "@/lib/ttl-cache";
import { ETF_UNIVERSE } from "@/constants/etfUniverse";
import type { OptionContract } from "@/lib/analytics/engines/options-engine";

/**
 * Yahoo Finance — options chains, analyst estimates, ownership, ETF
 * composition, and long daily history. Keyless, which is why it backs the
 * stock-detail tabs that Finnhub's free tier doesn't cover.
 *
 * It's an unofficial API, so every function here returns `null` on any
 * failure and the tabs render an explicit "unavailable" state rather than
 * erroring. Shapes are mapped to Stoxly's own types at this boundary so no
 * component depends on Yahoo's response format.
 */
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/** Yahoo spells share classes with a dash (BRK-B), most other sources with a dot. */
const toYahooSymbol = (symbol: string) => symbol.toUpperCase().replace(/\./g, "-");

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const iso = (v: unknown): string | null =>
  v instanceof Date && !Number.isNaN(v.getTime()) ? v.toISOString().slice(0, 10) : null;

/**
 * Yahoo's schema drifts; the library throws a validation error even when the
 * payload is usable, and attaches the raw result. Use it rather than failing.
 */
async function attempt<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    const result = (err as { result?: unknown })?.result;
    if (result) return result as T;
    console.error(`[yahoo:${label}]`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------- history

export type HistoryBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  /** Split- and dividend-adjusted close — use for return math. */
  adjClose: number;
  volume: number;
};

export function fetchDailyHistory(symbol: string, years: number): Promise<HistoryBar[] | null> {
  const ySymbol = toYahooSymbol(symbol);
  return cached(`yahoo:history:${ySymbol}:${years}`, TTL.HISTORY, async () => {
    const result = await attempt("chart", () =>
      yf.chart(ySymbol, {
        period1: new Date(Date.now() - years * 365.25 * 86_400_000),
        interval: "1d",
      }),
    );
    if (!result) return null;

    const bars: HistoryBar[] = [];
    for (const q of result.quotes) {
      const date = iso(q.date);
      const [open, high, low, close] = [num(q.open), num(q.high), num(q.low), num(q.close)];
      // Yahoo emits null rows for halted/holiday sessions — drop them.
      if (!date || open === null || high === null || low === null || close === null) continue;
      bars.push({
        date,
        open,
        high,
        low,
        close,
        adjClose: num(q.adjclose) ?? close,
        volume: num(q.volume) ?? 0,
      });
    }
    return bars.length ? bars : null;
  });
}

// ---------------------------------------------------------------- forecasts

export type EstimatePeriod = {
  period: "0q" | "+1q" | "0y" | "+1y";
  endDate: string | null;
  eps: { avg: number | null; low: number | null; high: number | null; yearAgo: number | null; analysts: number | null; growth: number | null };
  revenue: { avg: number | null; low: number | null; high: number | null; yearAgo: number | null; analysts: number | null; growth: number | null };
  epsTrend: { current: number | null; d7: number | null; d30: number | null; d60: number | null; d90: number | null };
  revisions: { up7: number | null; up30: number | null; down7: number | null; down30: number | null };
};

export type EarningsSurprise = {
  quarter: string | null;
  epsActual: number | null;
  epsEstimate: number | null;
  surprisePercent: number | null;
};

export type Forecasts = {
  currency: string;
  priceTarget: {
    current: number | null;
    low: number | null;
    high: number | null;
    mean: number | null;
    median: number | null;
    analysts: number | null;
  } | null;
  estimates: EstimatePeriod[];
  surprises: EarningsSurprise[];
  nextEarnings: { date: string | null; epsAverage: number | null; revenueAverage: number | null } | null;
};

const ESTIMATE_PERIODS = new Set(["0q", "+1q", "0y", "+1y"]);

export function fetchForecasts(symbol: string): Promise<Forecasts | null> {
  const ySymbol = toYahooSymbol(symbol);
  return cached(`yahoo:forecasts:${ySymbol}`, TTL.ESTIMATES, async () => {
    const qs = await attempt("forecasts", () =>
      yf.quoteSummary(ySymbol, {
        modules: ["financialData", "earningsTrend", "earningsHistory", "calendarEvents"],
      }),
    );
    if (!qs) return null;

    const fd = qs.financialData;
    // Analyst *ratings* (recommendationKey/Mean) are intentionally not
    // mapped: Stoxly shows estimates and price targets, never a buy/sell call.
    const priceTarget =
      fd && num(fd.targetMeanPrice) !== null
        ? {
            current: num(fd.currentPrice),
            low: num(fd.targetLowPrice),
            high: num(fd.targetHighPrice),
            mean: num(fd.targetMeanPrice),
            median: num(fd.targetMedianPrice),
            analysts: num(fd.numberOfAnalystOpinions),
          }
        : null;

    const estimates: EstimatePeriod[] = (qs.earningsTrend?.trend ?? [])
      .filter((t) => ESTIMATE_PERIODS.has(t.period))
      .map((t) => ({
        period: t.period as EstimatePeriod["period"],
        endDate: iso(t.endDate),
        eps: {
          avg: num(t.earningsEstimate?.avg),
          low: num(t.earningsEstimate?.low),
          high: num(t.earningsEstimate?.high),
          yearAgo: num(t.earningsEstimate?.yearAgoEps),
          analysts: num(t.earningsEstimate?.numberOfAnalysts),
          growth: num(t.earningsEstimate?.growth),
        },
        revenue: {
          avg: num(t.revenueEstimate?.avg),
          low: num(t.revenueEstimate?.low),
          high: num(t.revenueEstimate?.high),
          yearAgo: num(t.revenueEstimate?.yearAgoRevenue),
          analysts: num(t.revenueEstimate?.numberOfAnalysts),
          growth: num(t.revenueEstimate?.growth),
        },
        epsTrend: {
          current: num(t.epsTrend?.current),
          d7: num(t.epsTrend?.["7daysAgo"]),
          d30: num(t.epsTrend?.["30daysAgo"]),
          d60: num(t.epsTrend?.["60daysAgo"]),
          d90: num(t.epsTrend?.["90daysAgo"]),
        },
        revisions: {
          up7: num(t.epsRevisions?.upLast7days),
          up30: num(t.epsRevisions?.upLast30days),
          down7: num(t.epsRevisions?.downLast7Days),
          down30: num(t.epsRevisions?.downLast30days),
        },
      }));

    const surprises: EarningsSurprise[] = (qs.earningsHistory?.history ?? []).map((h) => ({
      quarter: iso(h.quarter),
      epsActual: num(h.epsActual),
      epsEstimate: num(h.epsEstimate),
      surprisePercent: num(h.surprisePercent),
    }));

    const earnings = qs.calendarEvents?.earnings;
    const nextEarnings = earnings
      ? {
          date: iso(earnings.earningsDate?.[0]),
          epsAverage: num(earnings.earningsAverage),
          revenueAverage: num(earnings.revenueAverage),
        }
      : null;

    if (!priceTarget && estimates.length === 0 && surprises.length === 0) return null;
    return {
      currency: fd?.financialCurrency ?? "USD",
      priceTarget,
      estimates,
      surprises,
      nextEarnings,
    };
  });
}

// ---------------------------------------------------------------- ownership

export type Holder = {
  name: string;
  pctHeld: number | null;
  shares: number | null;
  value: number | null;
  pctChange: number | null;
  reportDate: string | null;
};

export type InsiderTransaction = {
  name: string;
  relation: string | null;
  description: string;
  shares: number | null;
  value: number | null;
  date: string | null;
  /** "D" direct / "I" indirect, as reported on the Form 4. */
  ownership: string | null;
};

export type InsiderHolder = {
  name: string;
  relation: string | null;
  sharesDirect: number | null;
  latestTransaction: string | null;
  latestTransactionDate: string | null;
};

export type Ownership = {
  breakdown: {
    insidersPct: number | null;
    institutionsPct: number | null;
    institutionsFloatPct: number | null;
    institutionCount: number | null;
  } | null;
  institutions: Holder[];
  funds: Holder[];
  insiderTransactions: InsiderTransaction[];
  insiders: InsiderHolder[];
};

type RawHolder = {
  organization?: string;
  pctHeld?: number;
  position?: number;
  value?: number;
  pctChange?: number;
  reportDate?: Date;
};

const mapHolders = (list: RawHolder[] | undefined): Holder[] =>
  (list ?? []).map((h) => ({
    name: h.organization ?? "Unknown",
    pctHeld: num(h.pctHeld),
    shares: num(h.position),
    value: num(h.value),
    pctChange: num(h.pctChange),
    reportDate: iso(h.reportDate),
  }));

export function fetchOwnership(symbol: string): Promise<Ownership | null> {
  const ySymbol = toYahooSymbol(symbol);
  return cached(`yahoo:ownership:${ySymbol}`, TTL.OWNERSHIP, async () => {
    const qs = await attempt("ownership", () =>
      yf.quoteSummary(ySymbol, {
        modules: [
          "majorHoldersBreakdown",
          "institutionOwnership",
          "fundOwnership",
          "insiderTransactions",
          "insiderHolders",
        ],
      }),
    );
    if (!qs) return null;

    const b = qs.majorHoldersBreakdown;
    const result: Ownership = {
      breakdown: b
        ? {
            insidersPct: num(b.insidersPercentHeld),
            institutionsPct: num(b.institutionsPercentHeld),
            institutionsFloatPct: num(b.institutionsFloatPercentHeld),
            institutionCount: num(b.institutionsCount),
          }
        : null,
      institutions: mapHolders(qs.institutionOwnership?.ownershipList as RawHolder[] | undefined),
      funds: mapHolders(qs.fundOwnership?.ownershipList as RawHolder[] | undefined),
      insiderTransactions: (qs.insiderTransactions?.transactions ?? []).slice(0, 25).map((t) => ({
        name: t.filerName,
        relation: t.filerRelation ?? null,
        // Yahoo leaves transactionText empty for some option exercises.
        description: t.transactionText || "Transaction",
        shares: num(t.shares),
        value: num(t.value),
        date: iso(t.startDate),
        ownership: t.ownership ?? null,
      })),
      insiders: (qs.insiderHolders?.holders ?? []).map((h) => ({
        name: h.name,
        relation: h.relation ?? null,
        sharesDirect: num(h.positionDirect),
        latestTransaction: h.transactionDescription ?? null,
        latestTransactionDate: iso(h.latestTransDate),
      })),
    };

    const empty =
      !result.breakdown &&
      result.institutions.length === 0 &&
      result.funds.length === 0 &&
      result.insiderTransactions.length === 0;
    return empty ? null : result;
  });
}

// ---------------------------------------------------------------- options

export type OptionChain = {
  underlying: number | null;
  currency: string;
  expirations: string[];
  expiration: string;
  calls: OptionContract[];
  puts: OptionContract[];
};

type RawContract = {
  contractSymbol: string;
  strike: number;
  lastPrice?: number;
  bid?: number;
  ask?: number;
  change?: number;
  percentChange?: number;
  volume?: number;
  openInterest?: number;
  impliedVolatility?: number;
  inTheMoney?: boolean;
};

const mapContract = (c: RawContract): OptionContract => ({
  contractSymbol: c.contractSymbol,
  strike: c.strike,
  lastPrice: num(c.lastPrice),
  bid: num(c.bid),
  ask: num(c.ask),
  change: num(c.change),
  percentChange: num(c.percentChange),
  volume: num(c.volume),
  openInterest: num(c.openInterest),
  // Yahoo reports a placeholder ~1e-5 IV for contracts with no market.
  impliedVolatility: num(c.impliedVolatility) !== null && c.impliedVolatility! > 0.0001 ? c.impliedVolatility! : null,
  inTheMoney: Boolean(c.inTheMoney),
});

/** @param expiration ISO date; omitted = nearest expiration. */
export function fetchOptionChain(symbol: string, expiration?: string): Promise<OptionChain | null> {
  const ySymbol = toYahooSymbol(symbol);
  return cached(`yahoo:options:${ySymbol}:${expiration ?? "next"}`, TTL.OPTIONS, async () => {
    const result = await attempt("options", () =>
      yf.options(ySymbol, expiration ? { date: new Date(`${expiration}T00:00:00Z`) } : {}),
    );
    const chain = result?.options?.[0];
    if (!result || !chain) return null;

    return {
      underlying: num(result.quote?.regularMarketPrice),
      currency: result.quote?.currency ?? "USD",
      expirations: result.expirationDates.map(iso).filter((d): d is string => d !== null),
      expiration: iso(chain.expirationDate) ?? expiration ?? "",
      calls: (chain.calls as RawContract[]).map(mapContract),
      puts: (chain.puts as RawContract[]).map(mapContract),
    };
  });
}

// ---------------------------------------------------------------- ETFs

export type FundHolding = { symbol: string | null; name: string; weight: number };

export type FundProfile = {
  symbol: string;
  name: string | null;
  family: string | null;
  category: string | null;
  expenseRatio: number | null;
  totalAssets: number | null;
  yield: number | null;
  holdings: FundHolding[];
  sectors: { sector: string; weight: number }[];
  allocation: { stock: number | null; bond: number | null; cash: number | null; other: number | null };
};

export type QuoteKind = "EQUITY" | "ETF" | "MUTUALFUND" | "INDEX" | "CRYPTOCURRENCY" | "OTHER";

const SECTOR_LABELS: Record<string, string> = {
  realestate: "Real estate",
  consumer_cyclical: "Consumer cyclical",
  basic_materials: "Basic materials",
  consumer_defensive: "Consumer defensive",
  technology: "Technology",
  communication_services: "Communication services",
  financial_services: "Financial services",
  utilities: "Utilities",
  industrials: "Industrials",
  energy: "Energy",
  healthcare: "Healthcare",
};

async function loadFundProfile(ySymbol: string): Promise<(FundProfile & { kind: QuoteKind }) | null> {
  const qs = await attempt("fund", () =>
    yf.quoteSummary(ySymbol, {
      modules: ["quoteType", "topHoldings", "fundProfile", "summaryDetail"],
    }),
  );
  if (!qs) return null;

  const rawKind = qs.quoteType?.quoteType;
  const kind: QuoteKind =
    rawKind === "EQUITY" || rawKind === "ETF" || rawKind === "MUTUALFUND" || rawKind === "INDEX" || rawKind === "CRYPTOCURRENCY"
      ? rawKind
      : "OTHER";
  const th = qs.topHoldings;

  return {
    kind,
    symbol: ySymbol,
    name: qs.quoteType?.longName ?? qs.quoteType?.shortName ?? null,
    family: qs.fundProfile?.family ?? null,
    category: qs.fundProfile?.categoryName ?? null,
    expenseRatio: num(qs.fundProfile?.feesExpensesInvestment?.annualReportExpenseRatio),
    totalAssets: num(qs.summaryDetail?.totalAssets),
    yield: num(qs.summaryDetail?.yield),
    holdings: (th?.holdings ?? []).map((h) => ({
      symbol: h.symbol || null,
      name: h.holdingName ?? h.symbol ?? "Unknown",
      weight: h.holdingPercent ?? 0,
    })),
    // Yahoo returns sector weights as an array of single-key objects.
    sectors: (th?.sectorWeightings ?? [])
      .flatMap((entry) => Object.entries(entry as Record<string, number>))
      .filter(([, w]) => typeof w === "number" && w > 0)
      .map(([key, weight]) => ({ sector: SECTOR_LABELS[key] ?? key, weight }))
      .sort((a, b) => b.weight - a.weight),
    allocation: {
      stock: num(th?.stockPosition),
      bond: num(th?.bondPosition),
      cash: num(th?.cashPosition),
      other: num(th?.otherPosition),
    },
  };
}

export function fetchFundProfile(symbol: string) {
  const ySymbol = toYahooSymbol(symbol);
  return cached(`yahoo:fund:${ySymbol}`, TTL.ETF_HOLDINGS, () => loadFundProfile(ySymbol));
}

/**
 * Top holdings of every fund in ETF_UNIVERSE, cached once for all symbols —
 * one scan serves every stock page for a day instead of ~35 calls per view.
 */
function fetchEtfUniverse(): Promise<FundProfile[] | null> {
  return cached("yahoo:etf-universe", TTL.ETF_HOLDINGS, async () => {
    const profiles: FundProfile[] = [];
    const queue = [...ETF_UNIVERSE];
    // Small worker pool: Yahoo throttles bursts, and this runs at most daily.
    const worker = async () => {
      for (let etf = queue.shift(); etf; etf = queue.shift()) {
        const profile = await fetchFundProfile(etf);
        if (profile) profiles.push(profile);
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    return profiles.length ? profiles : null;
  });
}

export type EtfExposure = {
  etf: string;
  name: string | null;
  category: string | null;
  expenseRatio: number | null;
  weight: number;
  rank: number;
};

export async function fetchEtfExposure(
  symbol: string,
): Promise<{ scanned: number; exposures: EtfExposure[] } | null> {
  const ySymbol = toYahooSymbol(symbol);
  const universe = await fetchEtfUniverse();
  if (!universe) return null;

  const exposures: EtfExposure[] = [];
  for (const fund of universe) {
    const index = fund.holdings.findIndex((h) => h.symbol?.toUpperCase() === ySymbol);
    if (index === -1) continue;
    exposures.push({
      etf: fund.symbol,
      name: fund.name,
      category: fund.category,
      expenseRatio: fund.expenseRatio,
      weight: fund.holdings[index].weight,
      rank: index + 1,
    });
  }
  exposures.sort((a, b) => b.weight - a.weight);
  return { scanned: universe.length, exposures };
}

// ---------------------------------------------------------------- ticker tape

export type TickerQuote = { price: number; changePercent: number };

/**
 * Price + day change for a fixed list of symbols in ONE batched Yahoo call —
 * backs the landing-page logo strip. Crypto is passed as Yahoo's `BTC-USD`
 * form; results are keyed by the symbol as given. Missing symbols are simply
 * absent from the map.
 */
export function fetchTickerQuotes(
  symbols: string[],
): Promise<Record<string, TickerQuote> | null> {
  const key = `yahoo:ticker:${[...symbols].sort().join(",")}`;
  return cached(key, TTL.TICKER, async () => {
    const ySymbols = symbols.map(toYahooSymbol);
    const result = await attempt("quote", () =>
      yf.quote(ySymbols, { fields: ["regularMarketPrice", "regularMarketChangePercent"] }),
    );
    if (!result) return null;

    const byYahoo = new Map(
      (Array.isArray(result) ? result : [result]).map((q) => [q.symbol, q]),
    );
    const out: Record<string, TickerQuote> = {};
    symbols.forEach((symbol, i) => {
      const q = byYahoo.get(ySymbols[i]);
      const price = num(q?.regularMarketPrice);
      const changePercent = num(q?.regularMarketChangePercent);
      if (price !== null && changePercent !== null) out[symbol] = { price, changePercent };
    });
    return Object.keys(out).length ? out : null;
  });
}
