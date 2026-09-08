"use client";

import AddTransactionModal from "@/components/dashboard/AddTransactionModal";
import { useMarketStatus } from "@/hooks/useMarketStatus";

const DashboardHeader = () => {
  const { status, marketTime, isLoading } = useMarketStatus();

  const statusConfig = {
    open: { label: "OPEN", color: "bg-teal-400", pulse: true },
    "pre-market": { label: "PRE-MARKET", color: "bg-amber-400", pulse: true },
    "after-hours": { label: "AFTER HOURS", color: "bg-blue-400", pulse: true },
    closed: { label: "CLOSED", color: "bg-gray-400", pulse: false },
  };

  const config = statusConfig[status] || statusConfig.closed;

  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-blue-400 to-blue-600 bg-clip-text text-transparent">
          Market Overview
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Each panel streams independently. A failed slot never blocks the rest
          of the page.
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <AddTransactionModal />
        <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500 whitespace-nowrap pt-1">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${config.color} ${config.pulse ? "animate-pulse" : ""}`}
            />
            {isLoading ? "LOADING..." : config.label}
          </span>
          <span className="text-gray-700">·</span>
          <span>NYSE</span>
          <span className="text-gray-700">·</span>
          <span>{marketTime || "--:--:--"} ET</span>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
