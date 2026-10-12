import { singleflight, TTL } from "@/lib/singleflight";
import { cached } from "@/lib/ttl-cache";
import {
  parseCompanyFacts,
  type CompanyFacts,
  type FinancialStatements,
} from "@/lib/analytics/engines/financials-engine";

/**
 * SEC EDGAR — free, no API key, no daily cap (fair-use ~10 req/s). The one
 * hard requirement is a descriptive User-Agent; requests without one are
 * blocked. https://www.sec.gov/os/webmaster-faq#developers
 */
const USER_AGENT = `Stoxly ${process.env.EDGAR_CONTACT_EMAIL ?? "contact@stoxly.app"}`;

async function edgarFetch(url: string, revalidate: number): Promise<Response> {
  return fetch(url, { headers: { "User-Agent": USER_AGENT }, next: { revalidate } });
}

/**
 * For payloads over Next's 2MB fetch-cache limit (submissions, companyfacts
 * for large filers). Callers memoize the processed result via `cached`.
 */
async function edgarFetchUncached(url: string): Promise<Response> {
  return fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
}

type TickerEntry = { cik_str: number; ticker: string; title: string };

/**
 * EDGAR doesn't know tickers — everything is keyed by CIK. This map is ~10k
 * entries and changes rarely, so it's fetched once and cached for a day
 * rather than re-pulled per symbol lookup.
 */
async function loadTickerToCikMap(): Promise<Map<string, string>> {
  return singleflight("edgar:ticker-map", async () => {
    const res = await edgarFetch(
      "https://www.sec.gov/files/company_tickers.json",
      TTL.EDGAR_TICKER_MAP,
    );
    if (!res.ok) return new Map();

    const data: Record<string, TickerEntry> = await res.json();
    const map = new Map<string, string>();
    for (const entry of Object.values(data)) {
      map.set(entry.ticker.toUpperCase(), String(entry.cik_str).padStart(10, "0"));
    }
    return map;
  });
}

export async function getCikForSymbol(symbol: string): Promise<string | null> {
  const map = await loadTickerToCikMap();
  // EDGAR spells share classes with a dash (BRK-B).
  return map.get(symbol.toUpperCase().replace(/\./g, "-")) ?? null;
}

// ---------------------------------------------------------------- filings

export type Filing = {
  accessionNumber: string;
  filingDate: string;
  reportDate: string | null;
  formType: string;
  description: string | null;
  /** 8-K item codes, e.g. ["2.02", "9.01"]. */
  items: string[];
  documentUrl: string;
  indexUrl: string;
};

type SubmissionsResponse = {
  name?: string;
  filings: {
    recent: {
      form: string[];
      filingDate: string[];
      reportDate: string[];
      accessionNumber: string[];
      primaryDocument: string[];
      primaryDocDescription: string[];
      items: string[];
    };
  };
};

// EDGAR's "recent" block holds up to ~1,000 filings. Keep all of them so the
// Form 4 scan below sees the same window it always did; the mapped shape is
// small enough that caching the full list is cheap.
const MAX_FILINGS = 1_000;

/** Recent filings for one company, most recent first. */
export async function fetchFilings(symbol: string): Promise<Filing[] | null> {
  const cik = await getCikForSymbol(symbol);
  if (!cik) return null;

  return cached(`edgar:filings:${cik}`, TTL.EDGAR_FILINGS, async () => {
    try {
      const res = await edgarFetchUncached(`https://data.sec.gov/submissions/CIK${cik}.json`);
      if (!res.ok) return null;

      const data: SubmissionsResponse = await res.json();
      const r = data.filings.recent;
      const cikNoLeadingZeros = String(Number(cik));

      const filings: Filing[] = [];
      // Parallel arrays, most-recent-first — this is EDGAR's own response shape.
      for (let i = 0; i < r.form.length && filings.length < MAX_FILINGS; i++) {
        const accessionNoDashes = r.accessionNumber[i].replace(/-/g, "");
        const base = `https://www.sec.gov/Archives/edgar/data/${cikNoLeadingZeros}/${accessionNoDashes}`;
        filings.push({
          accessionNumber: r.accessionNumber[i],
          filingDate: r.filingDate[i],
          reportDate: r.reportDate?.[i] || null,
          formType: r.form[i],
          description: r.primaryDocDescription?.[i] || null,
          items: r.items?.[i] ? r.items[i].split(",").map((s) => s.trim()).filter(Boolean) : [],
          documentUrl: r.primaryDocument[i] ? `${base}/${r.primaryDocument[i]}` : `${base}/`,
          indexUrl: `${base}/${r.accessionNumber[i]}-index.htm`,
        });
      }
      return filings;
    } catch (err) {
      console.error(`Failed to fetch EDGAR filings for ${symbol}:`, err);
      return null;
    }
  });
}

export type InsiderFiling = {
  accessionNumber: string;
  filingDate: string;
  formType: string;
  filerName: string | null;
  documentUrl: string;
};

const MAX_INSIDER_FILINGS = 10;

/**
 * Recent Form 4 (insider transaction) filings for one symbol. Metadata only —
 * shares/price require parsing the individual filing's XML, not fetched here.
 */
export async function fetchInsiderFilings(symbol: string): Promise<InsiderFiling[]> {
  const filings = await fetchFilings(symbol);
  if (!filings) return [];

  return filings
    .filter((f) => f.formType === "4")
    .slice(0, MAX_INSIDER_FILINGS)
    .map((f) => ({
      accessionNumber: f.accessionNumber,
      filingDate: f.filingDate,
      formType: f.formType,
      filerName: null, // not present in submissions.json; would need the filing itself
      documentUrl: f.documentUrl,
    }));
}

// ---------------------------------------------------------------- financials

/** Annual + quarterly statements from the company's own XBRL filings. */
export async function fetchFinancialStatements(symbol: string): Promise<FinancialStatements | null> {
  const cik = await getCikForSymbol(symbol);
  if (!cik) return null;

  return cached(`edgar:financials:${cik}`, TTL.FUNDAMENTALS, async () => {
    try {
      const res = await edgarFetchUncached(
        `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
      );
      if (!res.ok) return null; // 404 = no XBRL (funds, some foreign filers)
      const facts: CompanyFacts = await res.json();
      return parseCompanyFacts(facts);
    } catch (err) {
      console.error(`Failed to fetch EDGAR financials for ${symbol}:`, err);
      return null;
    }
  });
}
