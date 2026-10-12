"use client";
// TEMPORARY visual-verification route — delete before commit.
import { use, useState } from "react";
import StockTabs, { StockTabId } from "@/components/stock/StockTabs";
import FinancialsPanel from "@/components/stock/tabs/FinancialsPanel";
import DocumentsPanel from "@/components/stock/tabs/DocumentsPanel";
import OwnershipPanel from "@/components/stock/tabs/OwnershipPanel";
import TechnicalsPanel from "@/components/stock/tabs/TechnicalsPanel";
import ForecastsPanel from "@/components/stock/tabs/ForecastsPanel";
import SeasonalsPanel from "@/components/stock/tabs/SeasonalsPanel";
import OptionsPanel from "@/components/stock/tabs/OptionsPanel";
import EtfsPanel from "@/components/stock/tabs/EtfsPanel";

export default function Preview({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const s = symbol.toUpperCase();
  const [tab, setTab] = useState<StockTabId>(
    (typeof window !== "undefined" && (new URLSearchParams(window.location.search).get("tab") as StockTabId)) || "financials",
  );
  return (
    <div className="min-h-screen home-wrapper px-4 py-8 md:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <StockTabs active={tab} onChange={setTab} />
        {tab === "financials" && <FinancialsPanel symbol={s} />}
        {tab === "documents" && <DocumentsPanel symbol={s} />}
        {tab === "ownership" && <OwnershipPanel symbol={s} />}
        {tab === "technicals" && <TechnicalsPanel symbol={s} />}
        {tab === "forecasts" && <ForecastsPanel symbol={s} />}
        {tab === "seasonals" && <SeasonalsPanel symbol={s} />}
        {tab === "options" && <OptionsPanel symbol={s} />}
        {tab === "etfs" && <EtfsPanel symbol={s} />}
      </div>
    </div>
  );
}
