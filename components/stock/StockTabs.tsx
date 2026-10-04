"use client";

const TABS = [
  { id: "overview", label: "Overview", hasData: true },
  { id: "financials", label: "Financials", hasData: false },
  { id: "documents", label: "Documents", hasData: false },
  { id: "news", label: "News", hasData: true },
  { id: "sentiment", label: "Sentiment", hasData: true },
  { id: "community", label: "Community", hasData: false },
  { id: "technicals", label: "Technicals", hasData: false },
  { id: "forecasts", label: "Forecasts", hasData: false },
  { id: "seasonals", label: "Seasonals", hasData: false },
  { id: "options", label: "Options", hasData: false },
  { id: "etfs", label: "ETFs", hasData: false },
] as const;

export type StockTabId = (typeof TABS)[number]["id"];

export const STOCK_TAB_LABELS: Record<StockTabId, string> = Object.fromEntries(
  TABS.map((tab) => [tab.id, tab.label]),
) as Record<StockTabId, string>;

type StockTabsProps = {
  active: StockTabId;
  onChange: (tab: StockTabId) => void;
};

const StockTabs = ({ active, onChange }: StockTabsProps) => {
  return (
    <div className="flex items-center gap-1 border-b border-gray-700 overflow-x-auto">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
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
