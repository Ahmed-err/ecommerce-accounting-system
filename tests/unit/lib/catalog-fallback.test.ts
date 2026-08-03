import { describe, expect, it } from "vitest";
import { getFallbackCatalogProducts, getFallbackCategories } from "@/lib/store/fallback-data";

describe("catalog fallback data", () => {
  it("returns category products for a matching fallback category id", () => {
    const categories = getFallbackCategories();
    const category = categories[0];

    const result = getFallbackCatalogProducts({ category: category.id, limit: 20 });

    expect(result.total).toBeGreaterThan(0);
    expect(result.products.length).toBeGreaterThan(0);
    expect(result.products.every((p) => p.categoryId === category.id)).toBe(true);
  });
});
