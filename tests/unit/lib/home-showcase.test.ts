import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
import { buildShowcase } from "@/lib/store/homepage";

const cats = [
  { id: "fr", name: "Refrigerators & Freezers", parentId: null, _count: { products: 0 } },
  { id: "ref", name: "Refrigerators", parentId: "fr", _count: { products: 2 } },
  { id: "tv", name: "TV & Satellite", parentId: null, _count: { products: 0 } },
  { id: "tvs", name: "TVs", parentId: "tv", _count: { products: 1 } },
  { id: "empty", name: "Cookware", parentId: null, _count: { products: 0 } },
];
const products = [
  { id: "p1", name: "ثلاجة", nameAr: "ثلاجة", nameEn: "Fridge", brand: "LG", images: [], categoryId: "ref" },
  { id: "p2", name: "ثلاجة 2", nameAr: "ثلاجة 2", nameEn: "Fridge 2", brand: "LG", images: ["https://x/f.jpg"], categoryId: "ref" },
  { id: "p3", name: "شاشة", nameAr: "شاشة", nameEn: "TV", brand: "Samsung", images: ["https://x/t.jpg"], categoryId: "tvs" },
];

describe("buildShowcase", () => {
  const s = buildShowcase(cats, products);

  it("orders top categories by size and gives each a real product photo", () => {
    expect(s.categories.map((c) => c.id)).toEqual(["fr", "tv"]);
    expect(s.categories[0]).toMatchObject({ productCount: 2, cover: "https://x/f.jpg" });
  });

  it("counts real brands", () => {
    expect(s.brands).toEqual([{ name: "LG", count: 2 }, { name: "Samsung", count: 1 }]);
  });

  it("picks hero products with photos from different categories", () => {
    expect(s.heroProducts.map((p) => p.id)).toEqual(["p2", "p3"]);
    expect(s.productTotal).toBe(3);
  });
});
