"use client";

const TABS = [
  { id: "overview", label: "Overview", equityOnly: false },
  { id: "financials", label: "Financials", equityOnly: true },
  { id: "documents", label: "Documents", equityOnly: true },
  { id: "news", label: "News", equityOnly: false },
  { id: "sentiment", label: "Sentiment", equityOnly: false },
  { id: "ownership", label: "Ownership", equityOnly: true },
  { id: "technicals", label: "Technicals", equityOnly: true },
  { id: "forecasts", label: "Forecasts", equityOnly: true },
  { id: "seasonals", label: "Seasonals", equityOnly: true },
  { id: "options", label: "Options", equityOnly: true },
  { id: "etfs", label: "ETFs", equityOnly: true },
] as const;

export type StockTabId = (typeof TABS)[number]["id"];

export const STOCK_TAB_LABELS: Record<StockTabId, string> = Object.fromEntries(
  TABS.map((tab) => [tab.id, tab.label]),
) as Record<StockTabId, string>;

type StockTabsProps = {
  active: StockTabId;
  onChange: (tab: StockTabId) => void;
  /** Crypto assets have no filings, holders, or listed options — hide those tabs. */
  isCrypto?: boolean;
};

export const tabPanelId = (tab: StockTabId) => `stock-tabpanel-${tab}`;
const tabId = (tab: StockTabId) => `stock-tab-${tab}`;

const StockTabs = ({ active, onChange, isCrypto = false }: StockTabsProps) => {
  const tabs = TABS.filter((t) => !isCrypto || !t.equityOnly);

  // WAI-ARIA tabs pattern: arrow keys move between tabs, Home/End jump.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((t) => t.id === active);
    const next =
      e.key === "ArrowRight" ? (index + 1) % tabs.length
      : e.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
      : e.key === "Home" ? 0
      : e.key === "End" ? tabs.length - 1
      : null;
    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].id);
    document.getElementById(tabId(tabs[next].id))?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Stock details"
      onKeyDown={onKeyDown}
      className="flex items-center gap-1 border-b border-gray-700 overflow-x-auto"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={tabId(tab.id)}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          aria-controls={tabPanelId(tab.id)}
          tabIndex={active === tab.id ? 0 : -1}
          onClick={() => onChange(tab.id)}
          className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-teal-400 ${
            active === tab.id
              ? "border-teal-400 text-teal-400"
              : "border-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default StockTabs;
