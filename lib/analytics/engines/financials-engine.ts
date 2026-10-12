/**
 * Financial statements from SEC EDGAR XBRL "companyfacts".
 *
 * Pure: takes the raw companyfacts JSON, returns annual + quarterly periods.
 * Every number here is a figure the company itself filed with the SEC — no
 * third-party normalization — which is the same "grounded, checkable" bar
 * the rest of the analytics layer holds itself to.
 *
 * Two XBRL quirks drive most of the logic:
 *  - 10-Qs report cash-flow items (and some income items) only as
 *    year-to-date cumulative values, and Q4 is never filed on its own — it's
 *    only implied by the 10-K. Discrete quarters are recovered by differencing
 *    consecutive YTD values that share a fiscal-year start.
 *  - Companies switch concepts over time (Apple reported `SalesRevenueNet`,
 *    then `RevenueFromContractWithCustomerExcludingAssessedTax`), so each
 *    metric is a priority list of concepts merged per period.
 */

export type XbrlFact = {
  start?: string;
  end: string;
  val: number;
  form?: string;
  filed?: string;
  fp?: string;
  fy?: number;
};

export type CompanyFacts = {
  entityName?: string;
  facts?: Record<string, Record<string, { units?: Record<string, XbrlFact[]> }>>;
};

export type StatementKind = "income" | "balance" | "cashflow";

export type MetricKey =
  | "revenue"
  | "costOfRevenue"
  | "grossProfit"
  | "researchAndDevelopment"
  | "sellingGeneralAdmin"
  | "operatingIncome"
  | "netIncome"
  | "epsDiluted"
  | "sharesDiluted"
  | "cash"
  | "totalAssets"
  | "totalLiabilities"
  | "longTermDebt"
  | "stockholdersEquity"
  | "operatingCashFlow"
  | "capitalExpenditure"
  | "freeCashFlow"
  | "dividendsPaid"
  | "shareRepurchases";

type MetricDef = {
  key: MetricKey;
  label: string;
  statement: StatementKind;
  /** "flow" = covers a period (start→end); "instant" = a balance at `end`. */
  kind: "flow" | "instant";
  /** Whether quarterly values can be derived by subtracting YTD figures.
   *  False for per-share and share-count metrics, which don't sum. */
  additive: boolean;
  unit: "currency" | "perShare" | "shares";
  /** Concepts in priority order; bare names are us-gaap, prefixed are other taxonomies. */
  concepts: string[];
};

export const METRICS: MetricDef[] = [
  {
    key: "revenue",
    label: "Revenue",
    statement: "income",
    kind: "flow",
    additive: true,
    unit: "currency",
    concepts: [
      "RevenueFromContractWithCustomerExcludingAssessedTax",
      "Revenues",
      "RevenueFromContractWithCustomerIncludingAssessedTax",
      "SalesRevenueNet",
      "SalesRevenueGoodsNet",
      "ifrs-full:Revenue",
    ],
  },
  {
    key: "costOfRevenue",
    label: "Cost of revenue",
    statement: "income",
    kind: "flow",
    additive: true,
    unit: "currency",
    concepts: [
      "CostOfGoodsAndServicesSold",
      "CostOfRevenue",
      "CostOfGoodsSold",
      "ifrs-full:CostOfSales",
    ],
  },
  {
    key: "grossProfit",
    label: "Gross profit",
    statement: "income",
    kind: "flow",
    additive: true,
    unit: "currency",
    concepts: ["GrossProfit", "ifrs-full:GrossProfit"],
  },
  {
    key: "researchAndDevelopment",
    label: "Research & development",
    statement: "income",
    kind: "flow",
    additive: true,
    unit: "currency",
    concepts: ["ResearchAndDevelopmentExpense", "ifrs-full:ResearchAndDevelopmentExpense"],
  },
  {
    key: "sellingGeneralAdmin",
    label: "Selling, general & admin",
    statement: "income",
    kind: "flow",
    additive: true,
    unit: "currency",
    concepts: ["SellingGeneralAndAdministrativeExpense"],
  },
  {
    key: "operatingIncome",
    label: "Operating income",
    statement: "income",
    kind: "flow",
    additive: true,
    unit: "currency",
    concepts: ["OperatingIncomeLoss", "ifrs-full:ProfitLossFromOperatingActivities"],
  },
  {
    key: "netIncome",
    label: "Net income",
    statement: "income",
    kind: "flow",
    additive: true,
    unit: "currency",
    concepts: ["NetIncomeLoss", "ProfitLoss", "ifrs-full:ProfitLoss"],
  },
  {
    key: "epsDiluted",
    label: "EPS (diluted)",
    statement: "income",
    kind: "flow",
    additive: false,
    unit: "perShare",
    concepts: ["EarningsPerShareDiluted", "ifrs-full:DilutedEarningsLossPerShare"],
  },
  {
    key: "sharesDiluted",
    label: "Diluted shares",
    statement: "income",
    kind: "flow",
    additive: false,
    unit: "shares",
    concepts: ["WeightedAverageNumberOfDilutedSharesOutstanding"],
  },
  {
    key: "cash",
    label: "Cash & equivalents",
    statement: "balance",
    kind: "instant",
    additive: false,
    unit: "currency",
    concepts: [
      "CashAndCashEquivalentsAtCarryingValue",
      "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
      "ifrs-full:CashAndCashEquivalents",
    ],
  },
  {
    key: "totalAssets",
    label: "Total assets",
    statement: "balance",
    kind: "instant",
    additive: false,
    unit: "currency",
    concepts: ["Assets", "ifrs-full:Assets"],
  },
  {
    key: "totalLiabilities",
    label: "Total liabilities",
    statement: "balance",
    kind: "instant",
    additive: false,
    unit: "currency",
    concepts: ["Liabilities", "ifrs-full:Liabilities"],
  },
  {
    key: "longTermDebt",
    label: "Long-term debt",
    statement: "balance",
    kind: "instant",
    additive: false,
    unit: "currency",
    concepts: ["LongTermDebtNoncurrent", "LongTermDebt"],
  },
  {
    key: "stockholdersEquity",
    label: "Shareholders' equity",
    statement: "balance",
    kind: "instant",
    additive: false,
    unit: "currency",
    concepts: [
      "StockholdersEquity",
      "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
      "ifrs-full:Equity",
    ],
  },
  {
    key: "operatingCashFlow",
    label: "Operating cash flow",
    statement: "cashflow",
    kind: "flow",
    additive: true,
    unit: "currency",
    concepts: [
      "NetCashProvidedByUsedInOperatingActivities",
      "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations",
      "ifrs-full:CashFlowsFromUsedInOperatingActivities",
    ],
  },
  {
    key: "capitalExpenditure",
    label: "Capital expenditure",
    statement: "cashflow",
    kind: "flow",
    additive: true,
    unit: "currency",
    concepts: [
      "PaymentsToAcquirePropertyPlantAndEquipment",
      "PaymentsToAcquireProductiveAssets",
      "ifrs-full:PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities",
    ],
  },
  {
    key: "freeCashFlow",
    label: "Free cash flow",
    statement: "cashflow",
    kind: "flow",
    additive: true,
    unit: "currency",
    concepts: [], // derived: operating cash flow − capex
  },
  {
    key: "dividendsPaid",
    label: "Dividends paid",
    statement: "cashflow",
    kind: "flow",
    additive: true,
    unit: "currency",
    concepts: ["PaymentsOfDividends", "PaymentsOfDividendsCommonStock"],
  },
  {
    key: "shareRepurchases",
    label: "Share repurchases",
    statement: "cashflow",
    kind: "flow",
    additive: true,
    unit: "currency",
    concepts: ["PaymentsForRepurchaseOfCommonStock"],
  },
];

export type FinancialPeriod = {
  /** ISO date the period ends on — also the balance-sheet date. */
  end: string;
  label: string;
  values: Record<MetricKey, number | null>;
};

export type FinancialStatements = {
  entityName: string | null;
  currency: string;
  annual: FinancialPeriod[];
  quarterly: FinancialPeriod[];
};

// Day-count windows. 52/53-week fiscal calendars give 364/371-day years and
// 91/98-day quarters, so these are deliberately loose.
const QUARTER_DAYS: [number, number] = [80, 100];
const YEAR_DAYS: [number, number] = [350, 380];
const ANNUAL_FORMS = new Set(["10-K", "10-K/A", "10-KT", "20-F", "20-F/A", "40-F"]);

const MS_PER_DAY = 86_400_000;
const daysBetween = (start: string, end: string) =>
  Math.round((Date.parse(end) - Date.parse(start)) / MS_PER_DAY);
const within = (n: number, [lo, hi]: [number, number]) => n >= lo && n <= hi;

/** Later filings restate earlier ones; keep the most recently filed value per key. */
function latestByKey(facts: XbrlFact[], keyOf: (f: XbrlFact) => string): Map<string, XbrlFact> {
  const out = new Map<string, XbrlFact>();
  for (const f of facts) {
    const key = keyOf(f);
    const prev = out.get(key);
    if (!prev || (f.filed ?? "") >= (prev.filed ?? "")) out.set(key, f);
  }
  return out;
}

type Series = { annual: Map<string, number>; quarterly: Map<string, number> };

function flowSeries(facts: XbrlFact[], additive: boolean): Series {
  const annual = new Map<string, number>();
  const quarterly = new Map<string, number>();

  const durational = [...latestByKey(
    facts.filter((f) => f.start),
    (f) => `${f.start}|${f.end}`,
  ).values()];

  for (const f of durational) {
    const days = daysBetween(f.start!, f.end);
    if (within(days, YEAR_DAYS)) annual.set(f.end, f.val);
    else if (within(days, QUARTER_DAYS)) quarterly.set(f.end, f.val);
  }

  if (additive) {
    // Recover discrete quarters from YTD runs: Q2 = 6M − 3M, Q4 = 12M − 9M, …
    const byStart = new Map<string, XbrlFact[]>();
    for (const f of durational) {
      const group = byStart.get(f.start!) ?? [];
      group.push(f);
      byStart.set(f.start!, group);
    }
    for (const group of byStart.values()) {
      group.sort((a, b) => a.end.localeCompare(b.end));
      for (let i = 1; i < group.length; i++) {
        const prev = group[i - 1];
        const curr = group[i];
        const stepDays = daysBetween(prev.end, curr.end);
        if (!within(stepDays, QUARTER_DAYS)) continue;
        // Directly reported quarters win over derived ones.
        if (!quarterly.has(curr.end)) quarterly.set(curr.end, curr.val - prev.val);
      }
    }
  }

  return { annual, quarterly };
}

function instantSeries(facts: XbrlFact[]): Series {
  const annual = new Map<string, number>();
  const quarterly = new Map<string, number>();
  const instants = facts.filter((f) => !f.start);

  for (const f of latestByKey(instants, (f) => f.end).values()) quarterly.set(f.end, f.val);
  for (const f of latestByKey(
    instants.filter((f) => f.form && ANNUAL_FORMS.has(f.form)),
    (f) => f.end,
  ).values()) {
    annual.set(f.end, f.val);
  }

  return { annual, quarterly };
}

function pickUnit(units: Record<string, XbrlFact[]>, unit: MetricDef["unit"]): [string, XbrlFact[]] | null {
  const keys = Object.keys(units);
  const match =
    unit === "perShare"
      ? keys.find((k) => k.includes("/shares"))
      : unit === "shares"
        ? keys.find((k) => k === "shares")
        : (keys.find((k) => k === "USD") ?? keys.find((k) => !k.includes("/") && k !== "shares"));
  return match ? [match, units[match]] : null;
}

function factsFor(cf: CompanyFacts, concept: string, unit: MetricDef["unit"]) {
  const [taxonomy, name] = concept.includes(":") ? concept.split(":") : ["us-gaap", concept];
  const units = cf.facts?.[taxonomy]?.[name]?.units;
  return units ? pickUnit(units, unit) : null;
}

/** Merge concept series by priority: for each period, the first concept that has it wins. */
function metricSeries(cf: CompanyFacts, def: MetricDef, currencyOut: { value: string | null }): Series {
  const merged: Series = { annual: new Map(), quarterly: new Map() };
  for (const concept of def.concepts) {
    const found = factsFor(cf, concept, def.unit);
    if (!found) continue;
    const [unitKey, facts] = found;
    if (def.unit === "currency" && !currencyOut.value) currencyOut.value = unitKey;
    const series = def.kind === "flow" ? flowSeries(facts, def.additive) : instantSeries(facts);
    for (const [end, v] of series.annual) if (!merged.annual.has(end)) merged.annual.set(end, v);
    for (const [end, v] of series.quarterly) if (!merged.quarterly.has(end)) merged.quarterly.set(end, v);
  }
  return merged;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Fiscal years are conventionally named for the calendar year they end in
// (Apple's FY2025 ends Sep 2025, NVIDIA's FY2026 ends Jan 2026).
const annualLabel = (end: string) => `FY${end.slice(0, 4)}`;
const quarterLabel = (end: string) => `${MONTHS[Number(end.slice(5, 7)) - 1]} ${end.slice(0, 4)}`;

function buildPeriods(
  all: Map<MetricKey, Series>,
  which: "annual" | "quarterly",
  limit: number,
  label: (end: string) => string,
): FinancialPeriod[] {
  // Period spine = ends where the headline flow metrics exist, so stray
  // instants (e.g. equity-statement opening balances) don't become columns.
  const spine = new Set<string>();
  for (const key of ["revenue", "netIncome", "operatingIncome"] as MetricKey[]) {
    for (const end of all.get(key)?.[which].keys() ?? []) spine.add(end);
  }

  const ends = [...spine].sort().slice(-limit);
  return ends.map((end) => {
    const values = {} as Record<MetricKey, number | null>;
    for (const def of METRICS) values[def.key] = all.get(def.key)?.[which].get(end) ?? null;

    if (values.grossProfit === null && values.revenue !== null && values.costOfRevenue !== null) {
      values.grossProfit = values.revenue - values.costOfRevenue;
    }
    if (values.operatingCashFlow !== null && values.capitalExpenditure !== null) {
      values.freeCashFlow = values.operatingCashFlow - values.capitalExpenditure;
    }
    return { end, label: label(end), values };
  });
}

export function parseCompanyFacts(
  cf: CompanyFacts,
  { annualLimit = 5, quarterlyLimit = 8 } = {},
): FinancialStatements | null {
  const currency = { value: null as string | null };
  const all = new Map<MetricKey, Series>();
  for (const def of METRICS) all.set(def.key, metricSeries(cf, def, currency));

  const annual = buildPeriods(all, "annual", annualLimit, annualLabel);
  const quarterly = buildPeriods(all, "quarterly", quarterlyLimit, quarterLabel);
  if (annual.length === 0 && quarterly.length === 0) return null;

  return {
    entityName: cf.entityName ?? null,
    currency: currency.value ?? "USD",
    annual,
    quarterly,
  };
}
