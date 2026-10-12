import { rangeBounds, pctChange, summarizeSales, buildChart } from "@/lib/dashboard-math";

const now = new Date(2026, 9, 12, 15, 30); // 12 Oct 2026, 15:30 local

describe("rangeBounds", () => {
  it("today starts at local midnight", () => {
    const { start, end } = rangeBounds("today", undefined, undefined, now);
    expect(start).toEqual(new Date(2026, 9, 12));
    expect(end).toEqual(now);
  });

  it("week covers the last 7 days including today", () => {
    expect(rangeBounds("week", undefined, undefined, now).start).toEqual(new Date(2026, 9, 6));
  });

  it("month starts on the 1st", () => {
    expect(rangeBounds("month", undefined, undefined, now).start).toEqual(new Date(2026, 9, 1));
  });

  it("custom range reads both dates as local days, end inclusive", () => {
    const { start, end } = rangeBounds("custom", "2026-09-01", "2026-09-30", now);
    expect(start).toEqual(new Date(2026, 8, 1));
    expect(end).toEqual(new Date(2026, 8, 30, 23, 59, 59, 999));
  });

  it("bad custom dates fall back to this month", () => {
    expect(rangeBounds("custom", "x", "", now).start).toEqual(new Date(2026, 9, 1));
  });

  it("previous period has the same length and ends where this one starts", () => {
    const b = rangeBounds("week", undefined, undefined, now);
    expect(b.prevEnd).toEqual(b.start);
    expect(b.start.getTime() - b.prevStart.getTime()).toBe(b.end.getTime() - b.start.getTime());
  });
});

describe("pctChange", () => {
  it("is null when there is nothing to compare with", () => {
    expect(pctChange(5, 0)).toBeNull();
    expect(pctChange(0, 0)).toBeNull();
  });
  it("rounds to one decimal", () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(1, 3)).toBe(-66.7);
  });
});

describe("summarizeSales", () => {
  it("adds store and POS rows and averages over all orders", () => {
    const s = summarizeSales([
      { source: "STORE", total: 300, count: 2 },
      { source: "POS", total: 100, count: 2 },
    ]);
    expect(s).toEqual({ revenue: 400, store: 300, pos: 100, orders: 4, average: 100 });
  });
  it("is all zeros with no rows", () => {
    expect(summarizeSales([])).toEqual({ revenue: 0, store: 0, pos: 0, orders: 0, average: 0 });
  });
});

describe("buildChart", () => {
  it("returns 12 months, oldest first, filling empty months with zero", () => {
    const chart = buildChart(
      [
        { bucket: new Date(2026, 9, 1), source: "STORE", total: 50 },
        { bucket: new Date(2026, 9, 1), source: "POS", total: 20 },
        { bucket: new Date(2026, 7, 1), source: "STORE", total: 10 },
      ],
      "monthly",
      now,
    );
    expect(chart).toHaveLength(12);
    expect(chart[0].start).toEqual(new Date(2025, 10, 1));
    expect(chart[11]).toMatchObject({ store: 50, pos: 20, total: 70 });
    expect(chart[9]).toMatchObject({ store: 10, pos: 0, total: 10 });
    expect(chart[10].total).toBe(0);
  });

  it("weekly buckets start on the given week starts", () => {
    const chart = buildChart([{ bucket: new Date(2026, 9, 12), source: "POS", total: 9 }], "weekly", now);
    expect(chart).toHaveLength(12);
    expect(chart[11].start).toEqual(new Date(2026, 9, 12));
    expect(chart[11].pos).toBe(9);
    expect(chart[10].start).toEqual(new Date(2026, 9, 5));
  });
});
