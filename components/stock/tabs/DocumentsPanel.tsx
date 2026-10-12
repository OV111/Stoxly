"use client";

import { useMemo, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { useStockTab } from "@/hooks/useStockTab";
import type { DocumentsData } from "@/types/stock-tabs";
import type { Filing } from "@/lib/edgar";
import { TabFrame, Panel, fmtDate } from "./shared";

type Category = "key" | "reports" | "current" | "proxy" | "insider" | "ownership" | "registration" | "all";

const FORM_CATEGORY: [RegExp, Exclude<Category, "key" | "all">][] = [
  [/^(10-K|10-Q|20-F|40-F|6-K|10-KT)(\/A)?$/, "reports"],
  [/^8-K(\/A)?$/, "current"],
  // EDGAR spells these both ways: "DEF 14A" (spaced) and "DEFA14A" (not).
  [/^(DEF|DEFA|PRE|DEFM|DFAN|PX) ?14[AC]/, "proxy"],
  [/^(3|4|5|144)(\/A)?$/, "insider"],
  [/^(SC 13[DG]|SCHEDULE 13[DG]|13F)/, "ownership"],
  [/^(S-\d|F-\d|424B|FWP)/, "registration"],
];

const categoryOf = (form: string) => FORM_CATEGORY.find(([re]) => re.test(form))?.[1] ?? "other";

const KEY_CATEGORIES = new Set(["reports", "current", "proxy"]);

const CATEGORY_LABELS: { value: Category; label: string }[] = [
  { value: "key", label: "Key filings" },
  { value: "reports", label: "Annual & quarterly" },
  { value: "current", label: "Current reports" },
  { value: "proxy", label: "Proxy" },
  { value: "insider", label: "Insider" },
  { value: "ownership", label: "Ownership" },
  { value: "registration", label: "Offerings" },
  { value: "all", label: "All" },
];

const FORM_NAMES: Record<string, string> = {
  "10-K": "Annual report",
  "10-Q": "Quarterly report",
  "20-F": "Annual report (foreign issuer)",
  "40-F": "Annual report (Canadian issuer)",
  "6-K": "Foreign issuer report",
  "8-K": "Current report",
  "DEF 14A": "Proxy statement",
  "DEFA14A": "Additional proxy materials",
  "PRE 14A": "Preliminary proxy statement",
  "3": "Initial insider ownership",
  "4": "Insider transaction",
  "5": "Annual insider ownership",
  "144": "Proposed insider sale",
  "SC 13G": "Passive 5%+ ownership stake",
  "SC 13D": "Active 5%+ ownership stake",
  "SCHEDULE 13G": "Passive 5%+ ownership stake",
  "SCHEDULE 13D": "Active 5%+ ownership stake",
  "S-1": "IPO registration",
  "S-3": "Shelf registration",
  "S-8": "Employee stock plan registration",
  "424B2": "Prospectus",
  "FWP": "Free writing prospectus",
};

// The 8-K items investors most often look for; the rest show by number.
const EIGHT_K_ITEMS: Record<string, string> = {
  "1.01": "Material agreement",
  "1.02": "Agreement terminated",
  "2.01": "Acquisition or disposition",
  "2.02": "Earnings results",
  "2.03": "New debt obligation",
  "2.05": "Restructuring costs",
  "2.06": "Impairment",
  "3.01": "Listing notice",
  "4.01": "Auditor change",
  "5.02": "Executive or board change",
  "5.03": "Bylaws amended",
  "5.07": "Shareholder vote results",
  "7.01": "Regulation FD disclosure",
  "8.01": "Other events",
};

function describe(f: Filing) {
  const base = f.formType.replace(/\/A$/, "");
  const name = FORM_NAMES[base] ?? f.description ?? "Filing";
  const amended = f.formType.endsWith("/A") ? " (amended)" : "";
  // 9.01 (exhibits) accompanies almost every 8-K and says nothing on its own.
  const items = f.items
    .filter((i) => i !== "9.01")
    .map((i) => EIGHT_K_ITEMS[i] ?? `Item ${i}`);
  return { name: `${name}${amended}`, items };
}

const PAGE_SIZE = 25;

export default function DocumentsPanel({ symbol }: { symbol: string }) {
  const tab = useStockTab<DocumentsData>(symbol, "documents");
  return (
    <TabFrame {...tab} label="Documents">
      {(data) => <DocumentsView filings={data.filings} />}
    </TabFrame>
  );
}

function DocumentsView({ filings }: { filings: Filing[] }) {
  const [category, setCategory] = useState<Category>("key");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: filings.length, key: 0 };
    for (const f of filings) {
      const cat = categoryOf(f.formType);
      c[cat] = (c[cat] ?? 0) + 1;
      if (KEY_CATEGORIES.has(cat)) c.key += 1;
    }
    return c;
  }, [filings]);

  const filtered = filings.filter((f) => {
    if (category === "all") return true;
    const cat = categoryOf(f.formType);
    return category === "key" ? KEY_CATEGORIES.has(cat) : cat === category;
  });

  const latestAnnual = filings.find((f) => /^(10-K|20-F|40-F)$/.test(f.formType));
  const latestQuarterly = filings.find((f) => f.formType === "10-Q");

  return (
    <>
      {(latestAnnual || latestQuarterly) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {[latestAnnual, latestQuarterly].filter((f): f is Filing => Boolean(f)).map((f) => (
            <a
              key={f.accessionNumber}
              href={f.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-gray-800 border border-gray-600 rounded-xl p-5 flex items-start gap-4 hover:border-gray-500 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400"
            >
              <FileText className="size-5 text-teal-400 shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0">
                <p className="text-gray-100 font-medium">
                  Latest {describe(f).name.toLowerCase()}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {f.formType}
                  {f.reportDate ? `, period ending ${fmtDate(f.reportDate)}` : ""}. Filed {fmtDate(f.filingDate)}.
                </p>
              </div>
              <ExternalLink className="size-4 text-gray-600 group-hover:text-gray-400 ml-auto shrink-0" aria-hidden />
            </a>
          ))}
        </div>
      )}

      <Panel>
        <div role="radiogroup" aria-label="Filing type" className="flex flex-wrap gap-2 mb-5">
          {CATEGORY_LABELS.filter((c) => c.value === "all" || c.value === "key" || counts[c.value]).map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={category === c.value}
              onClick={() => {
                setCategory(c.value);
                setVisible(PAGE_SIZE);
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400 ${
                category === c.value
                  ? "border-teal-400/40 bg-teal-400/10 text-teal-400"
                  : "border-gray-700 text-gray-400 hover:text-gray-200"
              }`}
            >
              {c.label} <span className="text-gray-500 font-normal">{counts[c.value] ?? 0}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">No filings of this type in the recent record.</p>
        ) : (
          <ul className="divide-y divide-gray-700/60">
            {filtered.slice(0, visible).map((f) => {
              const { name, items } = describe(f);
              return (
                <li key={f.accessionNumber} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span className="shrink-0 w-20 text-xs font-mono font-semibold px-2 py-0.5 rounded bg-gray-700 text-blue-400 text-center truncate">
                    {f.formType}
                  </span>
                  <div className="min-w-0 flex-1">
                    <a
                      href={f.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-200 hover:text-teal-400 transition-colors"
                    >
                      {name}
                    </a>
                    {(items.length > 0 || f.reportDate) && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {items.length > 0 ? items.join(", ") : `Period ending ${fmtDate(f.reportDate)}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-xs">
                    <span className="font-mono text-gray-500">{fmtDate(f.filingDate)}</span>
                    <a
                      href={f.indexUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-300 inline-flex items-center gap-1"
                      aria-label={`All documents in ${f.formType} filed ${f.filingDate}`}
                    >
                      All files <ExternalLink className="size-3" aria-hidden />
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {filtered.length > visible && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="mt-4 w-full text-sm text-gray-400 hover:text-gray-200 py-2 rounded-lg border border-gray-700 hover:border-gray-600"
          >
            Show {Math.min(PAGE_SIZE, filtered.length - visible)} more
          </button>
        )}
      </Panel>
    </>
  );
}
