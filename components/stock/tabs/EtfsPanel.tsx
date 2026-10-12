"use client";

import Link from "next/link";
import { useStockTab } from "@/hooks/useStockTab";
import type { EtfsData } from "@/types/stock-tabs";
import type { FundProfile, EtfExposure } from "@/lib/yahoo";
import {
  TabFrame,
  Panel,
  Stat,
  StatGrid,
  LegendItem,
  Footnote,
  CHART,
  fmtRatio,
  fmtMoneyCompact,
} from "./shared";

export default function EtfsPanel({ symbol }: { symbol: string }) {
  const tab = useStockTab<EtfsData>(symbol, "etfs");
  return (
    <TabFrame {...tab} label="ETF data">
      {(data) =>
        data.mode === "fund" ? (
          <FundView profile={data.profile} />
        ) : (
          <ExposureView symbol={symbol} scanned={data.scanned} exposures={data.exposures} />
        )
      }
    </TabFrame>
  );
}

/** Thin horizontal weight bar; one series, so one color. */
function WeightBar({ weight, max }: { weight: number; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-gray-700 overflow-hidden" aria-hidden>
        <div className="h-full rounded-full" style={{ width: `${(weight / (max || 1)) * 100}%`, backgroundColor: CHART.series1 }} />
      </div>
      <span className="font-mono tabular-nums text-gray-200 text-xs w-14 text-right">{fmtRatio(weight, 2)}</span>
    </div>
  );
}

function FundView({ profile }: { profile: FundProfile }) {
  const maxHolding = Math.max(...profile.holdings.map((h) => h.weight), 0);
  const maxSector = Math.max(...profile.sectors.map((s) => s.weight), 0);
  const topTen = profile.holdings.reduce((sum, h) => sum + h.weight, 0);
  const allocation = [
    { label: "Stocks", value: profile.allocation.stock ?? 0, color: CHART.series1 },
    { label: "Bonds", value: profile.allocation.bond ?? 0, color: CHART.series2 },
    { label: "Cash", value: profile.allocation.cash ?? 0, color: CHART.series3 },
    { label: "Other", value: profile.allocation.other ?? 0, color: CHART.neutral },
  ].filter((a) => a.value > 0.0005);

  return (
    <>
      <Panel title="Fund profile">
        <StatGrid>
          <Stat label="Expense ratio" value={fmtRatio(profile.expenseRatio, 2)} sub="per year" />
          <Stat label="Assets" value={fmtMoneyCompact(profile.totalAssets)} />
          <Stat label="Yield" value={fmtRatio(profile.yield, 2)} sub="trailing 12 months" />
          <Stat label="Category" value={profile.category ?? "—"} sub={profile.family ?? undefined} />
        </StatGrid>

        {allocation.length > 1 && (
          <div className="mt-6">
            <div
              className="flex h-3 w-full gap-[2px] rounded-full overflow-hidden"
              role="img"
              aria-label={allocation.map((a) => `${a.label} ${fmtRatio(a.value, 1)}`).join(", ")}
            >
              {allocation.map((a) => (
                <div key={a.label} style={{ width: `${a.value * 100}%`, backgroundColor: a.color, minWidth: 3 }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3">
              {allocation.map((a) => (
                <LegendItem key={a.label} color={a.color} label={`${a.label} ${fmtRatio(a.value, 1)}`} />
              ))}
            </div>
          </div>
        )}
      </Panel>

      <div className="grid lg:grid-cols-2 gap-6">
        {profile.holdings.length > 0 && (
          <Panel title="Top holdings">
            <p className="text-sm text-gray-400 mb-4">
              The largest {profile.holdings.length} positions make up{" "}
              <span className="text-gray-100 font-semibold">{fmtRatio(topTen, 1)}</span> of the fund.
            </p>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-700/60">
                {profile.holdings.map((h) => (
                  <tr key={h.symbol ?? h.name}>
                    <th scope="row" className="text-left font-normal py-2 pr-3">
                      {h.symbol ? (
                        <Link href={`/stock/${encodeURIComponent(h.symbol)}`} className="font-mono font-semibold text-gray-100 hover:text-teal-400">
                          {h.symbol}
                        </Link>
                      ) : null}
                      <span className="block text-xs text-gray-500 truncate max-w-[14rem]">{h.name}</span>
                    </th>
                    <td className="py-2 w-1/2">
                      <WeightBar weight={h.weight} max={maxHolding} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}

        {profile.sectors.length > 0 && (
          <Panel title="Sector weights">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-700/60">
                {profile.sectors.map((s) => (
                  <tr key={s.sector}>
                    <th scope="row" className="text-left font-normal text-gray-300 py-2 pr-3 whitespace-nowrap">{s.sector}</th>
                    <td className="py-2 w-1/2">
                      <WeightBar weight={s.weight} max={maxSector} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
      </div>
    </>
  );
}

function ExposureView({ symbol, scanned, exposures }: { symbol: string; scanned: number; exposures: EtfExposure[] }) {
  const max = Math.max(...exposures.map((e) => e.weight), 0);

  if (exposures.length === 0) {
    return (
      <>
        <Panel>
          <div className="py-6 text-center">
            <p className="text-gray-300 font-medium">{symbol} isn&apos;t a top-10 holding in any of the {scanned} major ETFs we track</p>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              It may still be held further down in broad index funds. Those positions just aren&apos;t
              large enough to appear in a fund&apos;s published top holdings.
            </p>
          </div>
        </Panel>
        <EtfFootnote scanned={scanned} />
      </>
    );
  }

  return (
    <>
      <Panel title="ETFs holding it as a top position">
        <p className="text-sm text-gray-400 mb-4">
          {symbol} is a top-10 holding in{" "}
          <span className="text-gray-100 font-semibold">
            {exposures.length} of {scanned}
          </span>{" "}
          major ETFs.
        </p>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-sm">
            <caption className="sr-only">ETFs with {symbol} among their top ten holdings</caption>
            <thead>
              <tr className="text-xs text-gray-500">
                <th scope="col" className="text-left font-medium py-2 pr-4">ETF</th>
                <th scope="col" className="text-left font-medium py-2 px-3 w-48">Weight in fund</th>
                <th scope="col" className="text-right font-medium py-2 px-3">Rank</th>
                <th scope="col" className="text-right font-medium py-2 pl-3 whitespace-nowrap">Expense ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/60">
              {exposures.map((e) => (
                <tr key={e.etf}>
                  <th scope="row" className="text-left font-normal py-2.5 pr-4">
                    <Link href={`/stock/${encodeURIComponent(e.etf)}`} className="font-mono font-semibold text-gray-100 hover:text-teal-400">
                      {e.etf}
                    </Link>
                    <span className="block text-xs text-gray-500">{e.name}{e.category ? `, ${e.category}` : ""}</span>
                  </th>
                  <td className="py-2.5 px-3">
                    <WeightBar weight={e.weight} max={max} />
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-300 whitespace-nowrap">#{e.rank}</td>
                  <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-gray-400">{fmtRatio(e.expenseRatio, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <EtfFootnote scanned={scanned} />
    </>
  );
}

function EtfFootnote({ scanned }: { scanned: number }) {
  return (
    <Footnote>
      Checked against the published top-10 holdings of {scanned} large broad-market, sector, and
      thematic ETFs. Funds that hold it in a smaller position aren&apos;t listed.
    </Footnote>
  );
}
