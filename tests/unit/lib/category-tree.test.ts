import { describe, expect, it } from "vitest";
import { buildCategoryTree, categoryWithChildren, parentError, sortForSelect } from "@/lib/category-tree";

const flat = [
  { id: "fr", name: "Refrigerators & Freezers", parentId: null, productCount: 0 },
  { id: "ref", name: "Refrigerators", parentId: "fr", productCount: 25 },
  { id: "frz", name: "Freezers", parentId: "fr", productCount: 15 },
  { id: "pw", name: "Power & Electrical", parentId: null, productCount: 0 },
  { id: "sw", name: "Switches & sockets", parentId: "pw", productCount: 0 },
  { id: "old", name: "Home Appliances", parentId: null, productCount: 2 },
];

describe("buildCategoryTree", () => {
  it("nests children, totals counts and hides empty categories", () => {
    const tree = buildCategoryTree(flat);
    expect(tree.map((c) => c.id)).toEqual(["old", "fr"]);
    expect(tree[1].productCount).toBe(40);
    expect(tree[1].children.map((c) => c.id)).toEqual(["frz", "ref"]);
  });

  it("can keep empty categories for admin", () => {
    const tree = buildCategoryTree(flat, { hideEmpty: false });
    expect(tree.find((c) => c.id === "pw")?.children.map((c) => c.id)).toEqual(["sw"]);
  });
});

describe("categoryWithChildren", () => {
  it("expands a top category to its subcategories", () => {
    expect(categoryWithChildren("fr", flat).sort()).toEqual(["fr", "frz", "ref"]);
    expect(categoryWithChildren("ref", flat)).toEqual(["ref"]);
  });
});

describe("parentError", () => {
  it("allows only two levels and no self-parent", () => {
    expect(parentError({ id: "new", parentId: "fr" }, flat)).toBeNull();
    expect(parentError({ id: "new", parentId: null }, flat)).toBeNull();
    expect(parentError({ id: "fr", parentId: "fr" }, flat)).toBe("self");
    expect(parentError({ id: "new", parentId: "ref" }, flat)).toBe("depth");
    expect(parentError({ id: "fr", parentId: "pw" }, flat)).toBe("hasChildren");
    expect(parentError({ id: "new", parentId: "missing" }, flat)).toBe("notFound");
  });
});

describe("sortForSelect", () => {
  it("lists each top category followed by its subcategories", () => {
    expect(sortForSelect(flat).map((c) => `${c.depth}:${c.id}`)).toEqual([
      "0:old", "0:pw", "1:sw", "0:fr", "1:frz", "1:ref",
    ]);
  });
});
