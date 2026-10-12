/**
 * Calendar-month seasonality from a long daily series.
 *
 * Pure. Uses dividend- and split-adjusted closes so a month's return is the
 * total return an owner actually got, not a price artifact of an ex-dividend
 * date or a split.
 *
 * This is a historical description — "March was positive in 7 of 10 years" —
 * not a forecast. Ten observations per month is a tiny sample, which the UI
 * states next to the numbers.
 */

export type AdjustedClose = { date: string; adjClose: number };

export type MonthCell = {
  year: number;
  month: number; // 0–11
  return: number;
  /** The current, not-yet-finished month — shown, but excluded from stats. */
  partial: boolean;
};

export type MonthStats = {
  month: number;
  average: number | null;
  median: number | null;
  positiveRate: number | null;
  count: number;
  best: number | null;
  worst: number | null;
};

export type Seasonality = {
  years: number[];
  cells: MonthCell[];
  byMonth: MonthStats[];
  yearly: { year: number; return: number; partial: boolean }[];
};

const median = (xs: number[]) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/**
 * @param asOf Treat the month containing this date as in-progress. Injected
 *             (rather than read from the clock) so the function stays pure.
 */
export function computeSeasonality(series: AdjustedClose[], asOf: Date): Seasonality | null {
  if (series.length < 2) return null;

  // Last close of each calendar month, in order.
  const monthEnds: { year: number; month: number; close: number }[] = [];
  for (const point of [...series].sort((a, b) => a.date.localeCompare(b.date))) {
    const year = Number(point.date.slice(0, 4));
    const month = Number(point.date.slice(5, 7)) - 1;
    const tail = monthEnds[monthEnds.length - 1];
    if (tail && tail.year === year && tail.month === month) tail.close = point.adjClose;
    else monthEnds.push({ year, month, close: point.adjClose });
  }
  if (monthEnds.length < 2) return null;

  const currentYear = asOf.getUTCFullYear();
  const currentMonth = asOf.getUTCMonth();
  const isPartial = (year: number, month: number) => year === currentYear && month === currentMonth;

  // The first month has no prior month-end to measure from, so it's skipped.
  const cells: MonthCell[] = [];
  for (let i = 1; i < monthEnds.length; i++) {
    const { year, month, close } = monthEnds[i];
    const prev = monthEnds[i - 1];
    // A gap (delisting, missing data) would make this a multi-month return.
    const contiguous = (year * 12 + month) - (prev.year * 12 + prev.month) === 1;
    if (!contiguous || prev.close <= 0) continue;
    cells.push({ year, month, return: close / prev.close - 1, partial: isPartial(year, month) });
  }

  const byMonth: MonthStats[] = Array.from({ length: 12 }, (_, month) => {
    const rets = cells.filter((c) => c.month === month && !c.partial).map((c) => c.return);
    return {
      month,
      average: rets.length ? rets.reduce((a, b) => a + b, 0) / rets.length : null,
      median: median(rets),
      positiveRate: rets.length ? rets.filter((r) => r > 0).length / rets.length : null,
      count: rets.length,
      best: rets.length ? Math.max(...rets) : null,
      worst: rets.length ? Math.min(...rets) : null,
    };
  });

  // Calendar-year return compounds that year's months. A year missing its
  // January (series started mid-year) isn't a full year, so it's flagged.
  const years = [...new Set(cells.map((c) => c.year))].sort((a, b) => a - b);
  const yearly = years.map((year) => {
    const months = cells.filter((c) => c.year === year);
    const compounded = months.reduce((acc, c) => acc * (1 + c.return), 1) - 1;
    const complete = months.length === 12 && !months.some((c) => c.partial);
    return { year, return: compounded, partial: !complete };
  });

  return { years, cells, byMonth, yearly };
}
