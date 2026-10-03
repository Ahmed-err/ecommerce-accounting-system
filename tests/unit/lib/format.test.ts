import { describe, expect, it } from "vitest";
import { discountPercent, formatAmount } from "@/lib/format";

describe("formatAmount", () => {
  it("groups thousands with Western digits", () => {
    expect(formatAmount(1250)).toBe("1,250");
    expect(formatAmount(1250000)).toBe("1,250,000");
  });
  it("shows two decimals only when there are cents", () => {
    expect(formatAmount(1250.5)).toBe("1,250.50");
    expect(formatAmount("980.25")).toBe("980.25");
  });
  it("never prints NaN", () => {
    expect(formatAmount("abc")).toBe("0");
    expect(formatAmount(undefined)).toBe("0");
    expect(formatAmount(null)).toBe("0");
  });
  it("keeps the sign of negative amounts (refunds)", () => {
    expect(formatAmount(-300)).toBe("-300");
  });
});

describe("discountPercent", () => {
  it("rounds the saving", () => expect(discountPercent(1250, 1400)).toBe(11));
  it("is null when there is no real discount", () => {
    expect(discountPercent(1400, 1400)).toBeNull();
    expect(discountPercent(1500, 1400)).toBeNull();
    expect(discountPercent(1250, 0)).toBeNull();
    expect(discountPercent(1250, undefined)).toBeNull();
  });
});
