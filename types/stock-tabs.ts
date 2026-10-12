import type { FinancialStatements } from "@/lib/analytics/engines/financials-engine";
import type { TechnicalsSummary } from "@/lib/analytics/engines/technicals-engine";
import type { Seasonality } from "@/lib/analytics/engines/seasonals-engine";
import type { ChainSummary } from "@/lib/analytics/engines/options-engine";
import type { Filing } from "@/lib/edgar";
import type { Forecasts, Ownership, OptionChain, FundProfile, EtfExposure } from "@/lib/yahoo";

/**
 * Wire format for /api/stocks/[symbol]/<tab>. "Not available" is a normal,
 * expected state (an ETF has no income statement, a small cap has no listed
 * options), so it's a 200 with a reason the UI can show — not an error.
 */
export type TabResponse<T> =
  | { available: true; data: T; source: string; asOf: string }
  | { available: false; reason: string };

export type FinancialsData = FinancialStatements;
export type DocumentsData = { filings: Filing[] };
export type OwnershipData = Ownership;
export type TechnicalsData = TechnicalsSummary;
export type SeasonalsData = Seasonality;
export type ForecastsData = Forecasts;
export type OptionsData = { chain: OptionChain; summary: ChainSummary };
export type EtfsData =
  | { mode: "fund"; profile: FundProfile }
  | { mode: "exposure"; scanned: number; exposures: EtfExposure[] };
