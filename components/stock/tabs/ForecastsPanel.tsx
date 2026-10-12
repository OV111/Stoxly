"use client";

import { ComposedChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useStockTab } from "@/hooks/useStockTab";
import type { ForecastsData } from "@/types/stock-tabs";
import type { EstimatePeriod } from "@/lib/yahoo";
import {
  TabFrame,
  Panel,
  Stat,
  StatGrid,
  LegendItem,
  Footnote,
  CHART,
  axisProps,
  tooltipProps,
  fmtMoney,
  fmtMoneyCompact,
  fmtRatio,
  fmtDate,
  toneClass,
} from "./shared";

const PERIOD_LABEL: Record<EstimatePeriod["period"], string> = {
  "0q": "This quarter",
  "+1q": "Next quarter",
  "0y": "This fiscal year",
  "+1y": "Next fiscal year",
};

export default function ForecastsPanel({ symbol }: { symbol: string }) {
  const tab = useStockTab<ForecastsData>(symbol, "forecasts");
  return (
    <TabFrame {...tab} label="Forecasts">
      {(data) => <ForecastsView data={data} />}
    </TabFrame>
  );
}

function ForecastsView({ data }: { data: ForecastsData }) {
  const { currency, priceTarget: pt, nextEarnings, estimates, surprises } = data;

  return (
    <>
      {nextEarnings?.date && (
        <Panel title="Next earnings report">
          <StatGrid>
            <Stat label="Expected" value={fmtDate(nextEarnings.date)} />
            <Stat label="Consensus EPS" value={fmtMoney(nextEarnings.epsAverage, currency)} />
            <Stat label="Consensus revenue" value={fmtMoneyCompact(nextEarnings.revenueAverage, currency)} />
          </StatGrid>
        </Panel>
      )}

      {pt && <PriceTargetPanel pt={pt} currency={currency} />}

      {estimates.length > 0 && (
        <Panel title="Consensus estimates">
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500">
                  <th scope="col" className="text-left font-medium py-2 pr-4" />
                  {estimates.map((e) => (
                    <th key={e.period} scope="col" className="text-right font-medium py-2 px-3 whitespace-nowrap">
                      <span className="block text-gray-300">{PERIOD_LABEL[e.period]}</span>
                      <span className="block font-normal">ending {fmtDate(e.endDate, { month: "short", year: "numeric" })}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60">
                <EstimateRow label="EPS estimate" values={estimates.map((e) => fmtMoney(e.eps.avg, currency))} strong />
                <EstimateRow
                  label="EPS range"
                  values={estimates.map((e) => `${fmtMoney(e.eps.low, currency)} – ${fmtMoney(e.eps.high, currency)}`)}
                  muted
                />
                <EstimateRow label="Year-ago EPS" values={estimates.map((e) => fmtMoney(e.eps.yearAgo, currency))} muted />
                <EstimateRow
                  label="EPS growth"
                  values={estimates.map((e) => fmtRatio(e.eps.growth, 1, true))}
                  tones={estimates.map((e) => e.eps.growth)}
                />
                <EstimateRow label="Revenue estimate" values={estimates.map((e) => fmtMoneyCompact(e.revenue.avg, currency))} strong />
                <EstimateRow
                  label="Revenue range"
                  values={estimates.map((e) => `${fmtMoneyCompact(e.revenue.low, currency)} – ${fmtMoneyCompact(e.revenue.high, currency)}`)}
                  muted
                />
                <EstimateRow
                  label="Revenue growth"
                  values={estimates.map((e) => fmtRatio(e.revenue.growth, 1, true))}
                  tones={estimates.map((e) => e.revenue.growth)}
                />
                <EstimateRow label="Analysts" values={estimates.map((e) => e.eps.analysts?.toString() ?? "—")} muted />
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {estimates.some((e) => e.epsTrend.current !== null && e.epsTrend.d90 !== null) && (
        <Panel title="How EPS estimates have moved">
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500">
                  <th scope="col" className="text-left font-medium py-2 pr-4">Period</th>
                  <th scope="col" className="text-right font-medium py-2 px-3">90 days ago</th>
                  <th scope="col" className="text-right font-medium py-2 px-3">30 days ago</th>
                  <th scope="col" className="text-right font-medium py-2 px-3">Today</th>
                  <th scope="col" className="text-right font-medium py-2 px-3">Change</th>
                  <th scope="col" className="text-right font-medium py-2 pl-3 whitespace-nowrap">Revisions, 30 days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60">
                {estimates.map((e) => {
                  const change =
                    e.epsTrend.current !== null && e.epsTrend.d90 ? e.epsTrend.current / e.epsTrend.d90 - 1 : null;
                  return (
                    <tr key={e.period}>
                      <th scope="row" className="text-left font-normal text-gray-300 py-2 pr-4 whitespace-nowrap">{PERIOD_LABEL[e.period]}</th>
                      <td className="text-right font-mono tabular-nums text-gray-400 py-2 px-3">{fmtMoney(e.epsTrend.d90, currency)}</td>
                      <td className="text-right font-mono tabular-nums text-gray-400 py-2 px-3">{fmtMoney(e.epsTrend.d30, currency)}</td>
                      <td className="text-right font-mono tabular-nums text-gray-200 py-2 px-3">{fmtMoney(e.epsTrend.current, currency)}</td>
                      <td className={`text-right font-mono tabular-nums py-2 px-3 ${toneClass(change)}`}>{fmtRatio(change, 1, true)}</td>
                      <td className="text-right py-2 pl-3 whitespace-nowrap text-gray-400">
                        {e.revisions.up30 ?? 0} up, {e.revisions.down30 ?? 0} down
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {surprises.length > 0 && <SurprisePanel surprises={surprises} currency={currency} />}

      <Footnote>
        Estimates and price targets are published by third-party Wall Street analysts and collected by
        Yahoo Finance. Stoxly reports them as-is and doesn&apos;t make recommendations.
      </Footnote>
    </>
  );
}

function EstimateRow({
  label,
  values,
  tones,
  strong = false,
  muted = false,
}: {
  label: string;
  values: string[];
  tones?: (number | null)[];
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <tr>
      <th scope="row" className={`text-left font-normal py-2 pr-4 whitespace-nowrap ${muted ? "text-gray-500" : "text-gray-300"}`}>
        {label}
      </th>
      {values.map((v, i) => (
        <td
          key={i}
          className={`text-right font-mono tabular-nums py-2 px-3 whitespace-nowrap ${
            tones ? toneClass(tones[i]) : muted ? "text-gray-500" : strong ? "text-gray-100 font-semibold" : "text-gray-200"
          }`}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}

function PriceTargetPanel({ pt, currency }: { pt: NonNullable<ForecastsData["priceTarget"]>; currency: string }) {
  const { low, high, mean, median, current, analysts } = pt;
  const points = [low, high, current].filter((v): v is number => v !== null);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const pos = (v: number | null) => (v === null ? null : ((v - min) / (max - min || 1)) * 100);
  const vsCurrent = mean !== null && current ? mean / current - 1 : null;

  return (
    <Panel title="Analyst price targets">
      <p className="text-sm text-gray-400 mb-6">
        The average 12-month target is{" "}
        <span className="text-gray-100 font-semibold">{fmtMoney(mean, currency)}</span>
        {vsCurrent !== null && (
          <>
            , <span className={toneClass(vsCurrent)}>{fmtRatio(Math.abs(vsCurrent), 1)} {vsCurrent >= 0 ? "above" : "below"}</span> the current price
          </>
        )}
        {analysts ? `, across ${analysts} analysts` : ""}.
      </p>

      {/* Range strip: low → high, mean/median ticks, today's price as a dot.
          Marks are told apart by shape (legend below), not by labels on the
          strip, which would collide when mean and median sit close together. */}
      <div
        className="relative h-6 mx-2"
        role="img"
        aria-label={`Targets range from ${fmtMoney(low, currency)} to ${fmtMoney(high, currency)}; current price ${fmtMoney(current, currency)}`}
      >
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full"
          style={{ left: `${pos(low)}%`, width: `${(pos(high) ?? 0) - (pos(low) ?? 0)}%`, backgroundColor: CHART.series1, opacity: 0.45 }}
        />
        {mean !== null && (
          <span
            title={`Mean ${fmtMoney(mean, currency)}`}
            className="absolute top-0 -translate-x-1/2 w-1 h-6 rounded-full"
            style={{ left: `${pos(mean)}%`, backgroundColor: CHART.series1 }}
          />
        )}
        {median !== null && (
          <span
            title={`Median ${fmtMoney(median, currency)}`}
            className="absolute top-0.5 -translate-x-1/2 w-1.5 h-5 rounded-full border-2 bg-gray-800"
            style={{ left: `${pos(median)}%`, borderColor: CHART.series1 }}
          />
        )}
        {current !== null && (
          <span
            title={`Current ${fmtMoney(current, currency)}`}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3.5 rounded-full bg-gray-100 ring-2 ring-gray-800"
            style={{ left: `${pos(current)}%` }}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1 h-3 rounded-full" style={{ backgroundColor: CHART.series1 }} /> Mean
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-3 rounded-full border-2" style={{ borderColor: CHART.series1 }} /> Median
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-gray-100" /> Current price
        </span>
      </div>

      <div className="mt-6">
        <StatGrid>
          <Stat label="Low" value={fmtMoney(low, currency)} />
          <Stat label="Median" value={fmtMoney(median, currency)} />
          <Stat label="Mean" value={fmtMoney(mean, currency)} />
          <Stat label="High" value={fmtMoney(high, currency)} />
        </StatGrid>
      </div>
    </Panel>
  );
}

function SurprisePanel({ surprises, currency }: { surprises: ForecastsData["surprises"]; currency: string }) {
  const rows = surprises.map((s) => ({
    ...s,
    label: s.quarter ? fmtDate(s.quarter, { month: "short", year: "numeric" }) : "—",
  }));

  return (
    <Panel
      title="Reported vs. expected EPS"
      aside={
        <div className="flex gap-x-4">
          <LegendItem color={CHART.series1} label="Expected" />
          <LegendItem color={CHART.series2} label="Reported" />
        </div>
      }
    >
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART.grid} />
            <XAxis dataKey="label" {...axisProps} padding={{ left: 24, right: 24 }} />
            <YAxis {...axisProps} width={56} tickFormatter={(v: number) => fmtMoney(v, currency)} domain={["auto", "auto"]} />
            <Tooltip {...tooltipProps} cursor={false} formatter={(v, name) => [fmtMoney(Number(v), currency), name]} />
            {/* Hollow = expected, filled = reported: identity holds without color. */}
            <Scatter dataKey="epsEstimate" name="Expected" fill={CHART.surface} stroke={CHART.series1} strokeWidth={2} isAnimationActive={false} />
            <Scatter dataKey="epsActual" name="Reported" fill={CHART.series2} stroke={CHART.surface} strokeWidth={2} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
        {rows.map((r) => (
          <div key={r.label} className="text-center">
            <p className={`text-sm font-mono font-semibold ${toneClass(r.surprisePercent)}`}>{fmtRatio(r.surprisePercent, 1, true)}</p>
            <p className="text-xs text-gray-500">
              {r.surprisePercent === null ? "" : r.surprisePercent >= 0 ? "above estimate" : "below estimate"}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
