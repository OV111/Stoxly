"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { useStockTab } from "@/hooks/useStockTab";
import { METRICS, type MetricKey, type StatementKind, type FinancialPeriod } from "@/lib/analytics/engines/financials-engine";
import type { FinancialsData } from "@/types/stock-tabs";
import {
  TabFrame,
  Panel,
  Segmented,
  Footnote,
  CHART,
  axisProps,
  tooltipProps,
  fmtMoneyCompact,
  fmtMoney,
  fmtCompact,
  fmtRatio,
  toneClass,
} from "./shared";

type Period = "annual" | "quarterly";

const STATEMENTS: { value: StatementKind; label: string }[] = [
  { value: "income", label: "Income" },
  { value: "balance", label: "Balance sheet" },
  { value: "cashflow", label: "Cash flow" },
];

const DEFAULT_METRIC: Record<StatementKind, MetricKey> = {
  income: "revenue",
  balance: "totalAssets",
  cashflow: "freeCashFlow",
};

// Margin rows are computed here (not in the engine) because they're a view
// over two filed figures, not a filed figure themselves.
const MARGINS: { label: string; numerator: MetricKey }[] = [
  { label: "Gross margin", numerator: "grossProfit" },
  { label: "Operating margin", numerator: "operatingIncome" },
  { label: "Net margin", numerator: "netIncome" },
];

const metricDef = (key: MetricKey) => METRICS.find((m) => m.key === key)!;

function formatValue(key: MetricKey, value: number | null, currency: string) {
  const unit = metricDef(key).unit;
  if (unit === "perShare") return fmtMoney(value, currency);
  if (unit === "shares") return fmtCompact(value);
  return fmtMoneyCompact(value, currency);
}

const DAY_MS = 86_400_000;

/**
 * Growth vs the period ending ~one year earlier — the prior fiscal year for
 * annual, the same quarter last year for quarterly. Matched by date rather
 * than array offset so a missing quarter can't silently shift the comparison.
 */
function growth(periods: FinancialPeriod[], current: FinancialPeriod, key: MetricKey) {
  const target = Date.parse(current.end) - 365 * DAY_MS;
  const prior = periods.find((p) => Math.abs(Date.parse(p.end) - target) <= 20 * DAY_MS);
  const curr = current.values[key];
  const prev = prior?.values[key];
  if (curr == null || prev == null || prev === 0) return null;
  return (curr - prev) / Math.abs(prev);
}

export default function FinancialsPanel({ symbol }: { symbol: string }) {
  const tab = useStockTab<FinancialsData>(symbol, "financials");
  return (
    <TabFrame {...tab} label="Financials">
      {(data) => <FinancialsView data={data} />}
    </TabFrame>
  );
}

function FinancialsView({ data }: { data: FinancialsData }) {
  const [statement, setStatement] = useState<StatementKind>("income");
  const [period, setPeriod] = useState<Period>(data.annual.length ? "annual" : "quarterly");
  const [selected, setSelected] = useState<MetricKey>(DEFAULT_METRIC.income);

  const periods = period === "annual" ? data.annual : data.quarterly;
  const rows = useMemo(
    () =>
      METRICS.filter((m) => m.statement === statement).filter((m) =>
        // Hide metrics this company never reports (e.g. banks have no gross profit).
        periods.some((p) => p.values[m.key] !== null),
      ),
    [statement, periods],
  );

  const chartMetric = rows.some((r) => r.key === selected) ? selected : (rows[0]?.key ?? DEFAULT_METRIC[statement]);
  const chartData = periods.map((p) => ({ label: p.label, value: p.values[chartMetric] }));
  const newestFirst = [...periods].reverse();
  const { currency } = data;

  const changeStatement = (s: StatementKind) => {
    setStatement(s);
    setSelected(DEFAULT_METRIC[s]);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Statement" options={STATEMENTS} value={statement} onChange={changeStatement} />
        <Segmented
          label="Period"
          options={[
            { value: "annual", label: "Annual" },
            { value: "quarterly", label: "Quarterly" },
          ]}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {periods.length === 0 ? (
        <Panel>
          <p className="text-sm text-gray-500 text-center py-6">
            No {period} figures were filed in a format we can read.
          </p>
        </Panel>
      ) : (
        <>
          <Panel title={metricDef(chartMetric).label}>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="24%">
                  <CartesianGrid vertical={false} stroke={CHART.grid} />
                  <XAxis dataKey="label" {...axisProps} />
                  <YAxis
                    {...axisProps}
                    width={72}
                    tickFormatter={(v: number) => formatValue(chartMetric, v, currency)}
                  />
                  <ReferenceLine y={0} stroke={CHART.axis} />
                  <Tooltip
                    {...tooltipProps}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    formatter={(v) => [formatValue(chartMetric, Number(v), currency), metricDef(chartMetric).label]}
                  />
                  <Bar dataKey="value" fill={CHART.series1} radius={[4, 4, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  {STATEMENTS.find((s) => s.value === statement)!.label} statement, {period}, in {currency}
                </caption>
                <thead>
                  <tr className="text-xs text-gray-500">
                    <th scope="col" className="sticky left-0 bg-gray-800 text-left font-medium py-2 pr-6">
                      {currency}
                    </th>
                    {newestFirst.map((p) => (
                      <th key={p.end} scope="col" className="text-right font-medium py-2 px-3 whitespace-nowrap">
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/60">
                  {rows.map((m) => (
                    <tr key={m.key}>
                      <th scope="row" className="sticky left-0 bg-gray-800 text-left font-normal py-2 pr-6">
                        <button
                          type="button"
                          onClick={() => setSelected(m.key)}
                          aria-pressed={chartMetric === m.key}
                          className={`text-left whitespace-nowrap rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400 ${
                            chartMetric === m.key ? "text-teal-400" : "text-gray-300 hover:text-gray-100"
                          }`}
                        >
                          {m.label}
                        </button>
                      </th>
                      {newestFirst.map((p) => (
                        <td key={p.end} className="text-right py-2 px-3 font-mono tabular-nums text-gray-200 whitespace-nowrap">
                          {formatValue(m.key, p.values[m.key], currency)}
                        </td>
                      ))}
                    </tr>
                  ))}

                  {statement === "income" && (
                    <>
                      <tr>
                        <th scope="row" className="sticky left-0 bg-gray-800 text-left font-normal py-2 pr-6 text-gray-400 whitespace-nowrap">
                          Revenue growth {period === "annual" ? "YoY" : "vs. year-ago quarter"}
                        </th>
                        {newestFirst.map((p) => {
                          const g = growth(periods, p, "revenue");
                          return (
                            <td key={p.end} className={`text-right py-2 px-3 font-mono tabular-nums whitespace-nowrap ${toneClass(g)}`}>
                              {fmtRatio(g, 1, true)}
                            </td>
                          );
                        })}
                      </tr>
                      {MARGINS.filter((mg) => rows.some((r) => r.key === mg.numerator)).map((mg) => (
                        <tr key={mg.label}>
                          <th scope="row" className="sticky left-0 bg-gray-800 text-left font-normal py-2 pr-6 text-gray-400">
                            {mg.label}
                          </th>
                          {newestFirst.map((p) => {
                            const num = p.values[mg.numerator];
                            const rev = p.values.revenue;
                            return (
                              <td key={p.end} className="text-right py-2 px-3 font-mono tabular-nums text-gray-400 whitespace-nowrap">
                                {num !== null && rev ? fmtRatio(num / rev, 1) : "—"}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Footnote>
            Figures are as filed with the SEC, restated where a later filing revised them.
            {period === "quarterly" &&
              " Fourth-quarter and some cash-flow quarters are derived by subtracting year-to-date totals, because companies only file them annually."}{" "}
            Select a row to chart it.
          </Footnote>
        </>
      )}
    </>
  );
}
