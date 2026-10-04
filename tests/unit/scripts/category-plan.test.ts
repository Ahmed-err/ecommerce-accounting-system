import { describe, expect, it } from "vitest";
import { emptyOldCategories, planCategoryChanges } from "../../../scripts/apply/category-plan.mjs";

const tree = [{ name: "Cooling", nameAr: "تبريد", children: [{ name: "Fans", nameAr: "المراوح" }, { name: "ACs", nameAr: "مكيفات" }] }];
const categories = [
  { id: "c-fans", name: "Fans", nameAr: "مراوح", parentId: null },
  { id: "c-old", name: "Home Appliances", nameAr: null, parentId: null },
];
const products = [
  { id: "p1", sku: "A", categoryId: "c-old" },
  { id: "p2", sku: "B", categoryId: "c-fans" },
];

describe("planCategoryChanges", () => {
  it("creates missing categories, reuses existing ones and moves only what changes", () => {
    const ops = planCategoryChanges({
      tree,
      categories,
      products,
      moves: [
        { sku: "A", to_subcategory: "ACs" },
        { sku: "B", to_subcategory: "Fans" },
      ],
    });
    expect(ops.createCategories.map((c) => c.name)).toEqual(["Cooling", "ACs"]);
    expect(ops.updateCategories).toEqual([
      expect.objectContaining({ id: "c-fans", nameAr: "المراوح", parentName: "Cooling" }),
    ]);
    expect(ops.moveProducts).toEqual([{ id: "p1", sku: "A", to: "ACs", fromCategoryId: "c-old" }]);
    expect(ops.errors).toEqual([]);
  });

  it("reports unknown SKUs and subcategories instead of guessing", () => {
    const ops = planCategoryChanges({ tree, categories, products, moves: [{ sku: "Z", to_subcategory: "Fans" }, { sku: "A", to_subcategory: "Cooling" }] });
    expect(ops.errors).toHaveLength(2);
  });

  it("is a no-op once applied", () => {
    const applied = [
      { id: "t", name: "Cooling", nameAr: "تبريد", parentId: null },
      { id: "c-fans", name: "Fans", nameAr: "المراوح", parentId: "t" },
      { id: "a", name: "ACs", nameAr: "مكيفات", parentId: "t" },
    ];
    const ops = planCategoryChanges({ tree, categories: applied, products: [{ id: "p1", sku: "A", categoryId: "a" }], moves: [{ sku: "A", to_subcategory: "ACs" }] });
    expect([ops.createCategories, ops.updateCategories, ops.moveProducts].every((l) => l.length === 0)).toBe(true);
  });
});

describe("emptyOldCategories", () => {
  it("lists only old categories with no products", () => {
    const counts = new Map([["c-old", 0]]);
    expect(emptyOldCategories({ tree, categories, productCounts: counts }).map((c) => c.id)).toEqual(["c-old"]);
    expect(emptyOldCategories({ tree, categories, productCounts: new Map([["c-old", 1]]) })).toEqual([]);
  });
});
