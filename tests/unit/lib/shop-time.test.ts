import { describe, expect, it } from "vitest";
import { shopDayBounds, shopClock, shopClockOf, shopToday, shopMonthBounds, shopDayKey, shopDaysBetween } from "@/lib/shop-time";

describe("shop time (Khartoum, UTC+2)", () => {
  it("a calendar day starts at 22:00 UTC the day before", () => {
    const { start, end } = shopDayBounds("2026-10-15");
    expect(start.toISOString()).toBe("2026-10-14T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-15T21:59:59.999Z");
  });

  it("08:00 typed for a day is 06:00 UTC and reads back as 08:00", () => {
    const at = shopClock("2026-10-15", "08:00");
    expect(at?.toISOString()).toBe("2026-10-15T06:00:00.000Z");
    expect(shopClockOf(at)).toBe("08:00");
  });

  it("rejects bad times and dates", () => {
    expect(shopClock("2026-10-15", "25:00")).toBeNull();
    expect(shopClock("2026-02-30", "08:00")).toBeNull();
    expect(shopDayBounds("nope")).toBeNull();
  });

  it("today follows the shop clock, not UTC", () => {
    expect(shopToday(new Date("2026-10-14T23:30:00Z"))).toBe("2026-10-15");
    expect(shopDayKey(new Date("2026-10-15T21:59:00Z"))).toBe("2026-10-15");
  });

  it("a month spans its shop days", () => {
    const { start, end } = shopMonthBounds(2026, 2);
    expect(start.toISOString()).toBe("2026-01-31T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-02-28T21:59:59.999Z");
  });

  it("counts leave days inclusively", () => {
    expect(shopDaysBetween("2026-10-15", "2026-10-15")).toBe(1);
    expect(shopDaysBetween("2026-10-30", "2026-11-02")).toBe(4);
    expect(shopDaysBetween("2026-10-16", "2026-10-15")).toBe(0);
  });
});
