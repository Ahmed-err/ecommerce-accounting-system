import { SUDAN_CITIES } from "@/lib/constants";

/**
 * Delivery options shown at checkout: the admin's shipping zones, or the built-in
 * Sudan cities when none are set. The server charges from the same list, so the
 * customer always pays the rate they were shown.
 */
export function buildShippingOptions(shippingZones) {
  const zones = Array.isArray(shippingZones) ? shippingZones : [];
  const seen = new Set();
  const options = [];
  for (const zone of zones) {
    for (const raw of Array.isArray(zone?.governorates) ? zone.governorates : []) {
      const name = String(raw || "").trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      options.push({
        name,
        rate: Number(zone.shippingCost ?? 0),
        zoneName: String(zone.zoneName || "").trim(),
        deliveryDaysEstimate: String(zone.deliveryDaysEstimate || "").trim(),
      });
    }
  }
  if (options.length > 0) return options;
  return SUDAN_CITIES.map((c) => ({
    name: c.name,
    arName: c.arName,
    rate: Number(c.rate ?? 0),
    zoneName: "",
    deliveryDaysEstimate: "",
  }));
}

/** Rate for a city from {@link buildShippingOptions}, or null when the city isn't offered. */
export function getShippingRateForCity(cityName, shippingZones) {
  const key = String(cityName || "").trim().toLowerCase();
  if (!key) return null;
  const option = buildShippingOptions(shippingZones).find((o) => o.name.toLowerCase() === key);
  return option ? option.rate : null;
}
