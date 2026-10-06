import { describe, expect, it } from "vitest";
import { heroSubtitle } from "@/components/home/HomeHero";
import ar from "@/lib/i18n/ar";

describe("heroSubtitle", () => {
  it("separates Latin brand names with the Arabic comma, never a joined و", () => {
    const s = heroSubtitle(ar, 136, [{ name: "LG" }, { name: "Unionaire" }, { name: "BestCool" }]);
    expect(s).toContain("LG، Unionaire، BestCool");
  });
});
