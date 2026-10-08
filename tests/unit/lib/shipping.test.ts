import { describe, expect, it } from "vitest";
import { buildShippingOptions, getShippingRateForCity } from "@/lib/shipping";
import { SUDAN_CITIES } from "@/lib/constants";

const zones = [
  { zoneName: "Khartoum State", governorates: ["Khartoum - Center", " Bahri - East "], shippingCost: 2000 },
  { zoneName: "Other", governorates: ["Atbara", "khartoum - center"], shippingCost: 6000 },
];

describe("shipping", () => {
  it("lists admin zones (first zone wins a duplicate) instead of the built-in cities", () => {
    expect(buildShippingOptions(zones).map((o) => [o.name, o.rate])).toEqual([
      ["Khartoum - Center", 2000],
      ["Bahri - East", 2000],
      ["Atbara", 6000],
    ]);
  });

  it("falls back to the built-in cities when no zones are set", () => {
    expect(buildShippingOptions([])).toHaveLength(SUDAN_CITIES.length);
    expect(buildShippingOptions(null)[0]).toMatchObject({ name: SUDAN_CITIES[0].name, arName: SUDAN_CITIES[0].arName });
  });

  it("charges exactly the rate each listed option shows", () => {
    for (const z of [zones, []]) {
      for (const o of buildShippingOptions(z)) expect(getShippingRateForCity(o.name, z)).toBe(o.rate);
    }
  });

  it("rejects an unknown city", () => {
    expect(getShippingRateForCity("Cairo", zones)).toBeNull();
    expect(getShippingRateForCity("", zones)).toBeNull();
    // A built-in city the admin's zones don't list can't be ordered to.
    expect(getShippingRateForCity("Omdurman - Center", zones)).toBeNull();
  });
});
