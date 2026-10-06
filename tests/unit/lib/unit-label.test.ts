import { describe, expect, it } from "vitest";
import { unitLabel } from "@/lib/store/unit-label";
import ar from "@/lib/i18n/ar";

describe("unitLabel", () => {
  it("reads the default piece units as one Arabic word", () => {
    for (const u of [undefined, "", "pcs", "PCS", " piece "]) expect(unitLabel(u, ar)).toBe("القطعة");
  });
  it("keeps any other unit as entered", () => {
    expect(unitLabel("متر", ar)).toBe("متر");
  });
});
