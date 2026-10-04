import { describe, expect, it } from "vitest";
import ar from "@/lib/i18n/ar";
import en from "@/lib/i18n/en";
import { translations, translateCategory } from "@/lib/translations";
import { translateCategory as tc } from "@/lib/i18n/translate-category";

describe("dictionary split", () => {
  it("keeps the same keys in both languages", () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
    expect(Object.keys(ar).length).toBeGreaterThan(1200);
  });
  it("server code still sees both languages", () => {
    expect(translations.ar).toBe(ar);
    expect(translations.en).toBe(en);
  });
  it("translateCategory lives outside the dictionary module", () => {
    expect(tc).toBe(translateCategory);
    expect(tc("Lighting", ar, "الإضاءة")).toBe("الإضاءة");
  });
});
