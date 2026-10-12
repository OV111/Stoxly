"use client";

import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { useStockTab } from "@/hooks/useStockTab";
import type { SeasonalsData } from "@/types/stock-tabs";
import type { MonthCell, MonthStats } from "@/lib/analytics/engines/seasonals-engine";
import { TabFrame, Panel, Footnote, CHART, axisProps, tooltipProps, fmtRatio, toneClass } from "./shared";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Diverging scale for the heatmap: teal (gain) ↔ red (loss), neutral gray at
 * zero. Stepped rather than continuous so adjacent classes stay tellable
 * apart; five steps per arm keeps it under the ~7-class legibility limit.
 */
const STEPS = [0.01, 0.03, 0.06, 0.1];
const OPACITY = [0, 0.18, 0.32, 0.5, 0.7];

function cellColor(r: number) {
  const step = STEPS.filter((s) => Math.abs(r) >= s).length;
  if (step === 0) return "rgba(75,85,99,0.35)"; // within ±1%: reads as "flat"
  const rgb = r > 0 ? "45,212,191" : "239,68,68";
  return `rgba(${rgb},${OPACITY[step]})`;
}

export default function SeasonalsPanel({ symbol }: { symbol: string }) {
  const tab = useStockTab<SeasonalsData>(symbol, "seasonals");
  return (
    <TabFrame {...tab} label="Seasonals">
      {(data) => <SeasonalsView data={data} symbol={symbol} />}
    </TabFrame>
  );
}

function SeasonalsView({ data, symbol }: { data: SeasonalsData; symbol: string }) {
  const fullYears = data.yearly.filter((y) => !y.partial).length;
  const sample = Math.max(...data.byMonth.map((m) => m.count));
  const chartData = data.byMonth.map((m) => ({ ...m, label: MONTHS[m.month] }));
  const cellAt = new Map(data.cells.map((c) => [`${c.year}-${c.month}`, c]));
  const yearlyAt = new Map(data.yearly.map((y) => [y.year, y]));
  const yearsDesc = [...data.years].reverse();

  return (
    <>
      <Panel title="Average return by month">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} width={48} tickFormatter={(v: number) => fmtRatio(v, 0)} />
              <ReferenceLine y={0} stroke={CHART.axis} />
              <Tooltip {...tooltipProps} cursor={{ fill: "rgba(255,255,255,0.04)" }} content={<MonthTooltip />} />
              <Bar dataKey="average" radius={[4, 4, 4, 4]} maxBarSize={40} isAnimationActive={false}>
                {chartData.map((m) => (
                  <Cell key={m.month} fill={(m.average ?? 0) >= 0 ? CHART.up : CHART.down} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto -mx-6 px-6 mt-4">
          <table className="w-full text-xs">
            <caption className="sr-only">Monthly return statistics for {symbol}</caption>
            <thead>
              <tr className="text-gray-500">
                <th scope="col" className="text-left font-medium py-1.5 pr-3">Month</th>
                {MONTHS.map((m) => (
                  <th key={m} scope="col" className="text-right font-medium py-1.5 px-1.5">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              <tr>
                <th scope="row" className="text-left font-sans font-normal text-gray-400 py-1.5 pr-3 whitespace-nowrap">Median</th>
                {data.byMonth.map((m) => (
                  <td key={m.month} className={`text-right py-1.5 px-1.5 ${toneClass(m.median)}`}>{fmtRatio(m.median, 1)}</td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="text-left font-sans font-normal text-gray-400 py-1.5 pr-3 whitespace-nowrap">Years up</th>
                {data.byMonth.map((m) => (
                  <td key={m.month} className="text-right py-1.5 px-1.5 text-gray-300">
                    {m.count ? `${Math.round((m.positiveRate ?? 0) * m.count)}/${m.count}` : "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Monthly returns"
        aside={
          <div className="flex items-center gap-2 text-xs text-gray-500" aria-hidden>
            <span>−10%</span>
            <div className="flex gap-[2px]">
              {[-0.12, -0.07, -0.04, -0.02, 0, 0.02, 0.04, 0.07, 0.12].map((r) => (
                <span key={r} className="w-4 h-3 rounded-sm" style={{ backgroundColor: cellColor(r) }} />
              ))}
            </div>
            <span>+10%</span>
          </div>
        }
      >
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-xs border-separate" style={{ borderSpacing: 2 }}>
            <caption className="sr-only">Month-by-month total returns for {symbol}, by year</caption>
            <thead>
              <tr className="text-gray-500">
                <th scope="col" className="text-left font-medium pr-2 pb-1">Year</th>
                {MONTHS.map((m) => (
                  <th key={m} scope="col" className="font-medium pb-1 min-w-11">{m}</th>
                ))}
                <th scope="col" className="font-medium pb-1 pl-2 min-w-14">Year</th>
              </tr>
            </thead>
            <tbody>
              {yearsDesc.map((year) => {
                const y = yearlyAt.get(year);
                return (
                  <tr key={year}>
                    <th scope="row" className="text-left font-mono font-normal text-gray-400 pr-2">{year}</th>
                    {MONTHS.map((label, month) => (
                      <HeatCell key={month} cell={cellAt.get(`${year}-${month}`)} label={`${label} ${year}`} />
                    ))}
                    <td
                      className={`text-right font-mono tabular-nums pl-2 ${y && !y.partial ? toneClass(y.return) : "text-gray-500"}`}
                      title={y?.partial ? "Partial year" : undefined}
                    >
                      {y ? `${fmtRatio(y.return, 1, true)}${y.partial ? "*" : ""}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3">* Partial period: the month or year is still in progress, or the record starts mid-year.</p>
      </Panel>

      <Footnote>
        Total returns including dividends, across {fullYears} complete calendar year{fullYears === 1 ? "" : "s"}.
        With at most {sample} observations per month, these patterns describe the past and can easily be noise.
        They aren&apos;t a forecast.
      </Footnote>
    </>
  );
}

function HeatCell({ cell, label }: { cell: MonthCell | undefined; label: string }) {
  if (!cell) return <td className="rounded bg-gray-900/40" aria-label={`${label}: no data`} />;
  const text = `${fmtRatio(cell.return, 1, true)}${cell.partial ? "*" : ""}`;
  return (
    <td
      className={`rounded text-center font-mono tabular-nums py-1.5 px-1 text-gray-100 ${cell.partial ? "outline outline-1 outline-dashed outline-gray-500" : ""}`}
      style={{ backgroundColor: cellColor(cell.return) }}
      title={`${label}: ${text}${cell.partial ? " (month in progress)" : ""}`}
    >
      {text}
    </td>
  );
}

type TooltipPayload = { payload?: { payload: MonthStats & { label: string } }[]; active?: boolean };

function MonthTooltip({ active, payload }: TooltipPayload) {
  const m = active ? payload?.[0]?.payload : undefined;
  if (!m) return null;
  return (
    <div style={tooltipProps.contentStyle} className="space-y-0.5">
      <p className="text-gray-400 text-[11px] mb-1">{m.label}, {m.count} years</p>
      <p className="text-gray-200">Average {fmtRatio(m.average, 2, true)}</p>
      <p className="text-gray-200">Median {fmtRatio(m.median, 2, true)}</p>
      <p className="text-gray-200">Up in {Math.round((m.positiveRate ?? 0) * m.count)} of {m.count}</p>
      <p className="text-gray-400">Best {fmtRatio(m.best, 1, true)}, worst {fmtRatio(m.worst, 1, true)}</p>
    </div>
  );
}
