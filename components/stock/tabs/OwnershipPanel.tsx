"use client";

import { useState } from "react";
import { useStockTab } from "@/hooks/useStockTab";
import type { OwnershipData } from "@/types/stock-tabs";
import type { Holder, InsiderTransaction } from "@/lib/yahoo";
import {
  TabFrame,
  Panel,
  Stat,
  StatGrid,
  Segmented,
  LegendItem,
  Footnote,
  CHART,
  fmtRatio,
  fmtCompact,
  fmtMoneyCompact,
  fmtDate,
  toneClass,
} from "./shared";

export default function OwnershipPanel({ symbol }: { symbol: string }) {
  const tab = useStockTab<OwnershipData>(symbol, "ownership");
  return (
    <TabFrame {...tab} label="Ownership">
      {(data) => <OwnershipView data={data} symbol={symbol} />}
    </TabFrame>
  );
}

function OwnershipView({ data, symbol }: { data: OwnershipData; symbol: string }) {
  const [holderType, setHolderType] = useState<"institutions" | "funds">(
    data.institutions.length ? "institutions" : "funds",
  );
  const b = data.breakdown;
  const holders = holderType === "institutions" ? data.institutions : data.funds;

  return (
    <>
      {b && (
        <Panel title="Who owns it">
          <StatGrid>
            <Stat label="Institutions" value={fmtRatio(b.institutionsPct, 1)} sub="of shares outstanding" />
            <Stat label="Institutions, of float" value={fmtRatio(b.institutionsFloatPct, 1)} sub="of freely traded shares" />
            <Stat label="Institutional holders" value={b.institutionCount?.toLocaleString("en-US") ?? "—"} />
            <Stat label="Insiders" value={fmtRatio(b.insidersPct, 2)} sub="officers, directors, 10% owners" />
          </StatGrid>
          <OwnershipBar insiders={b.insidersPct} institutions={b.institutionsPct} />
        </Panel>
      )}

      {(data.institutions.length > 0 || data.funds.length > 0) && (
        <Panel
          title="Largest holders"
          aside={
            data.institutions.length > 0 &&
            data.funds.length > 0 && (
              <Segmented
                label="Holder type"
                options={[
                  { value: "institutions", label: "Institutions" },
                  { value: "funds", label: "Funds" },
                ]}
                value={holderType}
                onChange={setHolderType}
              />
            )
          }
        >
          <HolderTable holders={holders} symbol={symbol} />
        </Panel>
      )}

      {data.insiderTransactions.length > 0 && (
        <Panel title="Recent insider transactions">
          <InsiderTable rows={data.insiderTransactions} />
        </Panel>
      )}

      {data.insiders.length > 0 && (
        <Panel title="Insiders on record">
          <ul className="grid sm:grid-cols-2 gap-x-8 divide-y divide-gray-700/60 sm:divide-y-0">
            {data.insiders.map((h) => (
              <li key={h.name} className="py-2.5 flex items-baseline justify-between gap-4 sm:border-b sm:border-gray-700/60">
                <div className="min-w-0">
                  <p className="text-sm text-gray-200 truncate">{h.name}</p>
                  <p className="text-xs text-gray-500 truncate">{h.relation ?? "Insider"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-mono tabular-nums text-gray-300">{fmtCompact(h.sharesDirect)}</p>
                  <p className="text-xs text-gray-500">shares held directly</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Footnote>
        Institutional and fund positions come from quarterly 13F and N-PORT filings, so they can lag
        by up to 45 days after quarter end. Insider trades come from Form 4 filings.
      </Footnote>
    </>
  );
}

/** Part-to-whole: insiders / institutions / everyone else, with 2px surface gaps between segments. */
function OwnershipBar({ insiders, institutions }: { insiders: number | null; institutions: number | null }) {
  const ins = Math.max(0, Math.min(1, insiders ?? 0));
  const inst = Math.max(0, Math.min(1 - ins, institutions ?? 0));
  const rest = Math.max(0, 1 - ins - inst);
  const segments = [
    { label: "Institutions", value: inst, color: CHART.series1 },
    { label: "Insiders", value: ins, color: CHART.series2 },
    { label: "Everyone else", value: rest, color: CHART.neutral },
  ];

  return (
    <div className="mt-6">
      <div
        className="flex h-3 w-full gap-[2px] rounded-full overflow-hidden"
        role="img"
        aria-label={segments.map((s) => `${s.label} ${fmtRatio(s.value, 1)}`).join(", ")}
      >
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div
              key={s.label}
              title={`${s.label}: ${fmtRatio(s.value, 1)}`}
              style={{ width: `${s.value * 100}%`, backgroundColor: s.color, minWidth: 3 }}
            />
          ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
        {segments.map((s) => (
          <LegendItem key={s.label} color={s.color} label={`${s.label} ${fmtRatio(s.value, 1)}`} />
        ))}
      </div>
    </div>
  );
}

function HolderTable({ holders, symbol }: { holders: Holder[]; symbol: string }) {
  const maxPct = Math.max(...holders.map((h) => h.pctHeld ?? 0), 0.0001);
  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full text-sm">
        <caption className="sr-only">Largest holders of {symbol}</caption>
        <thead>
          <tr className="text-xs text-gray-500">
            <th scope="col" className="text-left font-medium py-2 pr-4">Holder</th>
            <th scope="col" className="text-left font-medium py-2 px-3 w-40">Stake</th>
            <th scope="col" className="text-right font-medium py-2 px-3">Shares</th>
            <th scope="col" className="text-right font-medium py-2 px-3">Value</th>
            <th scope="col" className="text-right font-medium py-2 pl-3 whitespace-nowrap">Change in position</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/60">
          {holders.map((h) => (
            <tr key={h.name}>
              <td className="py-2.5 pr-4">
                <p className="text-gray-200">{h.name}</p>
                <p className="text-xs text-gray-500">As of {fmtDate(h.reportDate)}</p>
              </td>
              <td className="py-2.5 px-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-gray-700 overflow-hidden" aria-hidden>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${((h.pctHeld ?? 0) / maxPct) * 100}%`, backgroundColor: CHART.series1 }}
                    />
                  </div>
                  <span className="font-mono tabular-nums text-gray-200 text-xs w-12 text-right">
                    {fmtRatio(h.pctHeld, 2)}
                  </span>
                </div>
              </td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-gray-300">{fmtCompact(h.shares)}</td>
              <td className="py-2.5 px-3 text-right font-mono tabular-nums text-gray-300">{fmtMoneyCompact(h.value)}</td>
              <td className={`py-2.5 pl-3 text-right font-mono tabular-nums ${toneClass(h.pctChange)}`}>
                {fmtRatio(h.pctChange, 1, true)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function tradeKind(description: string): { label: string; className: string } {
  if (/^sale/i.test(description)) return { label: "Sale", className: "bg-red-500/10 text-red-400" };
  if (/^purchase|^buy/i.test(description)) return { label: "Purchase", className: "bg-teal-400/10 text-teal-400" };
  if (/option|exercise|conversion/i.test(description)) return { label: "Exercise", className: "bg-gray-700 text-gray-300" };
  if (/gift/i.test(description)) return { label: "Gift", className: "bg-gray-700 text-gray-300" };
  return { label: "Other", className: "bg-gray-700 text-gray-300" };
}

function InsiderTable({ rows }: { rows: InsiderTransaction[] }) {
  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500">
            <th scope="col" className="text-left font-medium py-2 pr-4">Date</th>
            <th scope="col" className="text-left font-medium py-2 px-3">Insider</th>
            <th scope="col" className="text-left font-medium py-2 px-3">Transaction</th>
            <th scope="col" className="text-right font-medium py-2 px-3">Shares</th>
            <th scope="col" className="text-right font-medium py-2 pl-3">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/60">
          {rows.map((t, i) => {
            const kind = tradeKind(t.description);
            return (
              <tr key={`${t.name}-${t.date}-${i}`}>
                <td className="py-2.5 pr-4 font-mono text-xs text-gray-500 whitespace-nowrap">{fmtDate(t.date)}</td>
                <td className="py-2.5 px-3">
                  <p className="text-gray-200 whitespace-nowrap">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.relation}</p>
                </td>
                <td className="py-2.5 px-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${kind.className}`}>{kind.label}</span>
                  <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                </td>
                <td className="py-2.5 px-3 text-right font-mono tabular-nums text-gray-300">{fmtCompact(t.shares)}</td>
                <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-gray-300">
                  {t.value ? fmtMoneyCompact(t.value) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
