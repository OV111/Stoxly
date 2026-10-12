"use client";

import { Fragment, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { useStockTab } from "@/hooks/useStockTab";
import type { OptionsData } from "@/types/stock-tabs";
import type { OptionContract } from "@/lib/analytics/engines/options-engine";
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
  fmtNumber,
  fmtRatio,
  fmtCompact,
  fmtDate,
} from "./shared";

const COLUMNS = ["Last", "Bid", "Ask", "Volume", "OI", "IV"] as const;
const STRIKE_WINDOW = 10; // strikes shown each side of the money by default
const CHART_WINDOW = 15;

const DAY_MS = 86_400_000;
const daysUntil = (iso: string) => Math.max(0, Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.now()) / DAY_MS));

export default function OptionsPanel({ symbol }: { symbol: string }) {
  const [expiration, setExpiration] = useState<string | undefined>(undefined);
  const tab = useStockTab<OptionsData>(symbol, "options", { expiration });
  return (
    <TabFrame {...tab} label="Options">
      {(data) => <OptionsView data={data} onExpirationChange={setExpiration} />}
    </TabFrame>
  );
}

type Row = { strike: number; call?: OptionContract; put?: OptionContract };

function OptionsView({ data, onExpirationChange }: { data: OptionsData; onExpirationChange: (e: string) => void }) {
  const [showAll, setShowAll] = useState(false);
  const { chain, summary } = data;
  const { underlying, currency } = chain;

  const byStrike = new Map<number, Row>();
  for (const c of chain.calls) byStrike.set(c.strike, { ...byStrike.get(c.strike), strike: c.strike, call: c });
  for (const p of chain.puts) byStrike.set(p.strike, { ...byStrike.get(p.strike), strike: p.strike, put: p });
  const rows = [...byStrike.values()].sort((a, b) => a.strike - b.strike);

  // Index of the first strike at or above spot — where the price marker goes.
  const spotIndex = underlying === null ? -1 : rows.findIndex((r) => r.strike >= underlying);
  const center = spotIndex === -1 ? Math.floor(rows.length / 2) : spotIndex;
  const around = (n: number) => rows.slice(Math.max(0, center - n), center + n);
  const visible = showAll ? rows : around(STRIKE_WINDOW);
  const chartRows = around(CHART_WINDOW).map((r) => ({
    strike: r.strike,
    calls: r.call?.openInterest ?? 0,
    puts: r.put?.openInterest ?? 0,
  }));
  const nearestChartStrike =
    underlying === null
      ? null
      : chartRows.reduce<number | null>(
          (best, r) => (best === null || Math.abs(r.strike - underlying) < Math.abs(best - underlying) ? r.strike : best),
          null,
        );

  const days = daysUntil(chain.expiration);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="options-expiration" className="text-sm text-gray-400">
          Expiration
        </label>
        <select
          id="options-expiration"
          value={chain.expiration}
          onChange={(e) => onExpirationChange(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400"
        >
          {chain.expirations.map((e) => (
            <option key={e} value={e}>
              {fmtDate(e)} ({daysUntil(e)}d)
            </option>
          ))}
        </select>
        {underlying !== null && (
          <span className="text-sm text-gray-500">
            Underlying {fmtMoney(underlying, currency)}
          </span>
        )}
      </div>

      <Panel title={`Expiring ${fmtDate(chain.expiration)}, ${days} day${days === 1 ? "" : "s"} out`}>
        <StatGrid>
          <Stat
            label="Implied move"
            value={summary.impliedMoveDollars !== null ? `±${fmtMoney(summary.impliedMoveDollars, currency)}` : "—"}
            sub={summary.impliedMove !== null ? `±${fmtRatio(summary.impliedMove, 1)} by expiration` : undefined}
          />
          <Stat
            label="At-the-money IV"
            value={fmtRatio(summary.atmImpliedVolatility, 1)}
            sub={summary.atmStrike !== null ? `${fmtMoney(summary.atmStrike, currency)} strike, annualized` : undefined}
          />
          <Stat label="Max pain" value={fmtMoney(summary.maxPain, currency)} sub="where most open interest expires worthless" />
          <Stat
            label="Put/call, volume"
            value={fmtNumber(summary.putCallVolumeRatio)}
            sub={`${fmtCompact(summary.putVolume)} puts, ${fmtCompact(summary.callVolume)} calls`}
          />
          <Stat
            label="Put/call, open interest"
            value={fmtNumber(summary.putCallOpenInterestRatio)}
            sub={`${fmtCompact(summary.putOpenInterest)} puts, ${fmtCompact(summary.callOpenInterest)} calls`}
          />
        </StatGrid>
      </Panel>

      {chartRows.some((r) => r.calls + r.puts > 0) && (
        <Panel
          title="Open interest by strike"
          aside={
            <div className="flex gap-x-4">
              <LegendItem color={CHART.series1} label="Calls" />
              <LegendItem color={CHART.series2} label="Puts" />
            </div>
          }
        >
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} margin={{ top: 16, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="18%">
                <CartesianGrid vertical={false} stroke={CHART.grid} />
                <XAxis dataKey="strike" {...axisProps} minTickGap={16} tickFormatter={(v: number) => fmtNumber(v, v % 1 ? 1 : 0)} />
                <YAxis {...axisProps} width={48} tickFormatter={(v: number) => fmtCompact(v)} />
                {nearestChartStrike !== null && (
                  <ReferenceLine
                    x={nearestChartStrike}
                    stroke={CHART.price}
                    label={{ value: "Price", position: "top", fill: "#9ca3af", fontSize: 11 }}
                  />
                )}
                <Tooltip
                  {...tooltipProps}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  labelFormatter={(l) => `${fmtMoney(Number(l), currency)} strike`}
                  formatter={(v, name) => [fmtCompact(Number(v)), name === "calls" ? "Call OI" : "Put OI"]}
                />
                <Bar dataKey="calls" fill={CHART.series1} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="puts" fill={CHART.series2} radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      <Panel
        title="Chain"
        aside={
          rows.length > STRIKE_WINDOW * 2 && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="text-xs text-gray-400 hover:text-gray-200"
            >
              {showAll ? "Show strikes near the money" : `Show all ${rows.length} strikes`}
            </button>
          )
        }
      >
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-xs font-mono tabular-nums">
            <caption className="sr-only">Options chain expiring {chain.expiration}. Shaded cells are in the money.</caption>
            <thead className="font-sans">
              <tr className="text-gray-400">
                <th colSpan={6} scope="colgroup" className="text-center font-medium pb-1">Calls</th>
                <th className="pb-1" />
                <th colSpan={6} scope="colgroup" className="text-center font-medium pb-1">Puts</th>
              </tr>
              <tr className="text-gray-500 border-b border-gray-700">
                {COLUMNS.map((h) => (
                  <th key={`c-${h}`} scope="col" className="text-right font-medium py-2 px-2">{h}</th>
                ))}
                <th scope="col" className="text-center font-medium py-2 px-3 text-gray-300">Strike</th>
                {COLUMNS.map((h) => (
                  <th key={`p-${h}`} scope="col" className="text-right font-medium py-2 px-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <Fragment key={r.strike}>
                  {underlying !== null && rows[spotIndex] === r && (
                    <tr>
                      <td colSpan={COLUMNS.length * 2 + 1} className="py-1">
                        <div className="flex items-center gap-2 font-sans text-[11px] text-gray-300">
                          <span className="h-px flex-1 bg-gray-500" />
                          Price {fmtMoney(underlying, currency)}
                          <span className="h-px flex-1 bg-gray-500" />
                        </div>
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-gray-700/40">
                    <ContractCells c={r.call} />
                    <th scope="row" className="text-center font-semibold text-gray-100 py-1.5 px-3 bg-gray-900/50">
                      {fmtNumber(r.strike, r.strike % 1 ? 2 : 0)}
                    </th>
                    <ContractCells c={r.put} />
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3">Shaded cells are in the money. IV is annualized implied volatility.</p>
      </Panel>

      <Footnote>
        Quotes are delayed at least 15 minutes. The implied move is the at-the-money straddle price: the
        size of move, either direction, that option prices currently imply by expiration. It isn&apos;t a prediction.
      </Footnote>
    </>
  );
}

function ContractCells({ c }: { c: OptionContract | undefined }) {
  const shade = c?.inTheMoney ? "bg-gray-700/50" : "";
  if (!c) {
    return (
      <>
        {COLUMNS.map((_, i) => (
          <td key={i} className="text-right py-1.5 px-2 text-gray-700">—</td>
        ))}
      </>
    );
  }
  return (
    <>
      <td className={`text-right py-1.5 px-2 text-gray-200 ${shade}`}>{fmtNumber(c.lastPrice)}</td>
      <td className={`text-right py-1.5 px-2 text-gray-400 ${shade}`}>{fmtNumber(c.bid)}</td>
      <td className={`text-right py-1.5 px-2 text-gray-400 ${shade}`}>{fmtNumber(c.ask)}</td>
      <td className={`text-right py-1.5 px-2 text-gray-300 ${shade}`}>{fmtCompact(c.volume)}</td>
      <td className={`text-right py-1.5 px-2 text-gray-300 ${shade}`}>{fmtCompact(c.openInterest)}</td>
      <td className={`text-right py-1.5 px-2 text-gray-400 ${shade}`}>{fmtRatio(c.impliedVolatility, 0)}</td>
    </>
  );
}
