import { describe, it, expect } from "vitest";
import { computeSeasonality, type AdjustedClose } from "./seasonals-engine";

/** One close on the 10th and one on the 25th of each month, so month-end = the 25th. */
function series(monthEndCloses: { ym: string; close: number }[]): AdjustedClose[] {
  return monthEndCloses.flatMap(({ ym, close }) => [
    { date: `${ym}-10`, adjClose: close * 0.5 }, // mid-month noise, must be ignored
    { date: `${ym}-25`, adjClose: close },
  ]);
}

const AS_OF = new Date(Date.UTC(2030, 0, 1)); // far from the fixture — nothing partial

describe("computeSeasonality", () => {
  it("returns null without at least two month-ends", () => {
    expect(computeSeasonality(series([{ ym: "2024-01", close: 100 }]), AS_OF)).toBeNull();
  });

  it("measures each month from the prior month-end and skips the first month", () => {
    const result = computeSeasonality(
      series([
        { ym: "2024-01", close: 100 },
        { ym: "2024-02", close: 110 },
        { ym: "2024-03", close: 99 },
      ]),
      AS_OF,
    )!;
    expect(result.cells.map((c) => [c.month, c.return])).toEqual([
      [1, expect.closeTo(0.1)],
      [2, expect.closeTo(-0.1)],
    ]);
  });

  it("aggregates the same month across years", () => {
    const result = computeSeasonality(
      series([
        { ym: "2022-12", close: 100 },
        { ym: "2023-01", close: 110 }, // +10%
        { ym: "2023-12", close: 100 },
        { ym: "2024-01", close: 95 }, // −5%
        { ym: "2024-12", close: 100 },
        { ym: "2025-01", close: 120 }, // +20%
      ]),
      AS_OF,
    )!;
    const jan = result.byMonth[0];
    expect(jan.count).toBe(3);
    expect(jan.average).toBeCloseTo((0.1 - 0.05 + 0.2) / 3);
    expect(jan.median).toBeCloseTo(0.1);
    expect(jan.positiveRate).toBeCloseTo(2 / 3);
    expect(jan.best).toBeCloseTo(0.2);
    expect(jan.worst).toBeCloseTo(-0.05);
  });

  it("skips a month that follows a data gap instead of reporting a multi-month return", () => {
    const result = computeSeasonality(
      series([
        { ym: "2024-01", close: 100 },
        { ym: "2024-04", close: 150 },
      ]),
      AS_OF,
    );
    expect(result!.cells).toHaveLength(0);
  });

  it("shows the in-progress month but excludes it from statistics", () => {
    const result = computeSeasonality(
      series([
        { ym: "2025-12", close: 100 },
        { ym: "2026-01", close: 130 },
      ]),
      new Date(Date.UTC(2026, 0, 28)),
    )!;
    expect(result.cells).toEqual([{ year: 2026, month: 0, return: expect.closeTo(0.3), partial: true }]);
    expect(result.byMonth[0].count).toBe(0);
    expect(result.byMonth[0].average).toBeNull();
  });

  it("compounds months into calendar-year returns and flags incomplete years", () => {
    const months = Array.from({ length: 13 }, (_, i) => {
      const year = i === 0 ? 2023 : 2024;
      const month = i === 0 ? 12 : i;
      return { ym: `${year}-${String(month).padStart(2, "0")}`, close: 100 * 1.01 ** i };
    });
    const result = computeSeasonality(series(months), AS_OF)!;
    expect(result.yearly).toEqual([{ year: 2024, return: expect.closeTo(1.01 ** 12 - 1), partial: false }]);
  });
});
