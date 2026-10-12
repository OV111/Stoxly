"use client";

import { useState } from "react";
import {
  ComposedChart,
  LineChart,
  Line,
  Area,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { useStockTab } from "@/hooks/useStockTab";
import type { TechnicalsData } from "@/types/stock-tabs";
import {
  TabFrame,
  Panel,
  Stat,
  StatGrid,
  Segmented,
  LegendItem,
  Footnote,
  CHART,
  axisProps,
  tooltipProps,
  fmtMoney,
  fmtNumber,
  fmtRatio,
  fmtCompact,
  fmtDate,
  toneClass,
} from "./shared";

type Range = "3M" | "6M" | "1Y";
const RANGE_POINTS: Record<Range, number> = { "3M": 63, "6M": 126, "1Y": 252 };

const monthTick = (iso: string) => fmtDate(iso, { month: "short" });
const SYNC_ID = "stock-technicals";

export default function TechnicalsPanel({ symbol }: { symbol: string }) {
  const tab = useStockTab<TechnicalsData>(symbol, "technicals");
  return (
    <TabFrame {...tab} label="Technicals">
      {(data) => <TechnicalsView data={data} />}
    </TabFrame>
  );
}

/** Plain-language read of RSI against the conventional 30/70 bands — descriptive, not a signal. */
function rsiReading(rsi: number | null) {
  if (rsi === null) return "Not enough history";
  if (rsi >= 70) return "Above 70, the level conventionally read as overbought";
  if (rsi <= 30) return "Below 30, the level conventionally read as oversold";
  return "Between the conventional 30 and 70 bands";
}

function TechnicalsView({ data }: { data: TechnicalsData }) {
  const [range, setRange] = useState<Range>("6M");
  const chart = data.chart.slice(-RANGE_POINTS[range]);
  const { macd, bollinger, range52w, volume } = data;

  const prices = chart.flatMap((p) => [p.close, p.bbUpper, p.bbLower, p.sma50, p.sma200]).filter((v): v is number => v !== null);
  const pad = (Math.max(...prices) - Math.min(...prices)) * 0.05;
  const priceDomain: [number, number] = [Math.min(...prices) - pad, Math.max(...prices) + pad];
  const rangePosition = (data.price - range52w.low) / (range52w.high - range52w.low || 1);

  return (
    <>
      <Panel title="Performance">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {data.performance.map((p) => (
            <div key={p.key}>
              <p className="text-xs text-gray-500">{p.key}</p>
              <p className={`text-base font-semibold font-mono mt-0.5 ${toneClass(p.value)}`}>
                {fmtRatio(p.value, 1, true)}
              </p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex justify-end">
        <Segmented
          label="Chart range"
          options={(Object.keys(RANGE_POINTS) as Range[]).map((r) => ({ value: r, label: r }))}
          value={range}
          onChange={setRange}
        />
      </div>

      <Panel
        title="Price and moving averages"
        aside={
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <LegendItem color={CHART.price} label="Close" line />
            <LegendItem color={CHART.series1} label="50-day SMA" line />
            <LegendItem color={CHART.series2} label="200-day SMA" line />
            <LegendItem color="rgba(156,163,175,0.35)" label="Bollinger Bands (20, 2)" />
          </div>
        }
      >
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chart} syncId={SYNC_ID} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="date" {...axisProps} tickFormatter={monthTick} minTickGap={40} />
              <YAxis {...axisProps} width={64} domain={priceDomain} tickFormatter={(v: number) => fmtNumber(v, v >= 1000 ? 0 : 2)} />
              <Tooltip
                {...tooltipProps}
                labelFormatter={(l) => fmtDate(String(l))}
                formatter={(v, name) =>
                  Array.isArray(v)
                    ? [`${fmtNumber(Number(v[0]))} – ${fmtNumber(Number(v[1]))}`, name]
                    : [fmtNumber(Number(v)), name]
                }
              />
              <Area
                dataKey={(d: (typeof chart)[number]) => (d.bbLower !== null && d.bbUpper !== null ? [d.bbLower, d.bbUpper] : null)}
                name="Bollinger Bands"
                stroke="none"
                fill="#9ca3af"
                fillOpacity={0.12}
                isAnimationActive={false}
                activeDot={false}
              />
              <Line dataKey="sma200" name="200-day SMA" stroke={CHART.series2} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
              <Line dataKey="sma50" name="50-day SMA" stroke={CHART.series1} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
              <Line dataKey="close" name="Close" stroke={CHART.price} strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 4, stroke: CHART.surface, strokeWidth: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="RSI (14)" aside={<span className="text-sm font-mono text-gray-200">{fmtNumber(data.rsi14, 1)}</span>}>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} syncId={SYNC_ID} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="date" {...axisProps} tickFormatter={monthTick} minTickGap={40} />
                <YAxis {...axisProps} width={32} domain={[0, 100]} ticks={[0, 30, 70, 100]} />
                {/* Dashed on purpose: these are thresholds, not gridlines. */}
                <ReferenceLine y={70} stroke={CHART.axis} strokeDasharray="4 4" />
                <ReferenceLine y={30} stroke={CHART.axis} strokeDasharray="4 4" />
                <Tooltip {...tooltipProps} labelFormatter={(l) => fmtDate(String(l))} formatter={(v) => [fmtNumber(Number(v), 1), "RSI"]} />
                <Line dataKey="rsi" name="RSI" stroke={CHART.series1} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-3">{rsiReading(data.rsi14)}.</p>
        </Panel>

        <Panel
          title="MACD (12, 26, 9)"
          aside={
            <div className="flex gap-x-4">
              <LegendItem color={CHART.series1} label="MACD" line />
              <LegendItem color={CHART.series2} label="Signal" line />
            </div>
          }
        >
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart} syncId={SYNC_ID} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="date" {...axisProps} tickFormatter={monthTick} minTickGap={40} />
                <YAxis {...axisProps} width={40} tickFormatter={(v: number) => fmtNumber(v, 1)} />
                <ReferenceLine y={0} stroke={CHART.axis} />
                <Tooltip {...tooltipProps} labelFormatter={(l) => fmtDate(String(l))} formatter={(v, name) => [fmtNumber(Number(v)), name]} />
                <Bar dataKey="macdHistogram" name="Histogram" isAnimationActive={false}>
                  {chart.map((p) => (
                    <Cell key={p.date} fill={(p.macdHistogram ?? 0) >= 0 ? CHART.up : CHART.down} fillOpacity={0.55} />
                  ))}
                </Bar>
                <Line dataKey="macd" name="MACD" stroke={CHART.series1} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line dataKey="macdSignal" name="Signal" stroke={CHART.series2} strokeWidth={2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            {macd.line === null || macd.signal === null
              ? "Not enough history."
              : `MACD is ${macd.line >= macd.signal ? "above" : "below"} its signal line by ${fmtNumber(Math.abs(macd.line - macd.signal))}.`}
          </p>
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Moving averages">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500">
                <th scope="col" className="text-left font-medium py-2">Average</th>
                <th scope="col" className="text-right font-medium py-2">Value</th>
                <th scope="col" className="text-right font-medium py-2">Price vs. average</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60">
              {data.movingAverages.map((m) => (
                <tr key={`${m.type}${m.period}`}>
                  <th scope="row" className="text-left font-normal text-gray-300 py-2">
                    {m.period}-day {m.type}
                  </th>
                  <td className="text-right font-mono tabular-nums text-gray-200 py-2">{fmtNumber(m.value)}</td>
                  <td className={`text-right font-mono tabular-nums py-2 ${toneClass(m.pctFromPrice)}`}>
                    {m.pctFromPrice === null ? "—" : `${fmtRatio(m.pctFromPrice, 1, true)} ${m.pctFromPrice >= 0 ? "above" : "below"}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Range and volatility">
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span>52-week low {fmtMoney(range52w.low)}</span>
              <span>52-week high {fmtMoney(range52w.high)}</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-gray-700" role="img" aria-label={`Price is ${fmtRatio(Math.abs(range52w.pctFromHigh), 1)} below its 52-week high`}>
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3 rounded-full bg-gray-100 ring-2 ring-gray-800"
                style={{ left: `${Math.max(0, Math.min(1, rangePosition)) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {fmtRatio(Math.abs(range52w.pctFromHigh), 1)} below the high, {fmtRatio(range52w.pctFromLow, 1)} above the low.
            </p>
          </div>
          <StatGrid>
            <Stat label="ATR (14)" value={fmtMoney(data.atr14)} sub={`${fmtRatio(data.atrPct, 1)} of price per day`} />
            <Stat label="Bollinger %B" value={fmtNumber(bollinger.percentB)} sub="0 = lower band, 1 = upper" />
            <Stat
              label="Volume"
              value={fmtCompact(volume.latest)}
              sub={volume.ratio !== null ? `${fmtNumber(volume.ratio, 2)}× the 50-day average` : undefined}
            />
          </StatGrid>
        </Panel>
      </div>

      <Footnote>
        Indicators describe past price behavior using standard definitions. They aren&apos;t
        forecasts or trade signals. As of the {fmtDate(data.asOf)} close.
      </Footnote>
    </>
  );
}
