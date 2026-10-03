import { describe, expect, it } from "vitest";
import { PARENT_CATEGORIES, SUB_CATEGORIES, PRODUCTS, SHIPPING_ZONES } from "../../../prisma/seed/catalog-data.js";
import { SUDAN_CITIES } from "@/lib/constants";

const ARABIC = /[؀-ۿ]/;

describe("seed catalog data", () => {
  it("has unique category names and every subcategory points at a real parent", () => {
    const names = [...PARENT_CATEGORIES, ...SUB_CATEGORIES].map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    const parents = new Set(PARENT_CATEGORIES.map((c) => c.name));
    for (const sub of SUB_CATEGORIES) expect(parents.has(sub.parent), sub.name).toBe(true);
  });

  it("puts every product in a subcategory and leaves no subcategory empty", () => {
    const subs = new Set(SUB_CATEGORIES.map((c) => c.name));
    for (const p of PRODUCTS) expect(subs.has(p.category), `${p.sku} -> ${p.category}`).toBe(true);
    const used = new Set(PRODUCTS.map((p) => p.category));
    for (const s of subs) expect(used.has(s), `empty subcategory ${s}`).toBe(true);
  });

  it("has unique SKUs and sane prices and stock", () => {
    const skus = PRODUCTS.map((p) => p.sku);
    expect(new Set(skus).size).toBe(skus.length);
    for (const p of PRODUCTS) {
      expect(p.sellingPrice, p.sku).toBeGreaterThan(p.purchasePrice);
      expect(p.purchasePrice, p.sku).toBeGreaterThan(0);
      expect(p.stock, p.sku).toBeGreaterThanOrEqual(p.minStock);
    }
  });

  it("has complete Arabic and English text", () => {
    for (const c of [...PARENT_CATEGORIES, ...SUB_CATEGORIES]) expect(c.nameAr, c.name).toMatch(ARABIC);
    for (const p of PRODUCTS) {
      expect(p.nameAr, p.sku).toMatch(ARABIC);
      expect(p.descriptionAr, p.sku).toMatch(ARABIC);
      expect(p.nameEn.length, p.sku).toBeGreaterThan(3);
      expect(p.descriptionEn.length, p.sku).toBeGreaterThan(20);
    }
  });

  it("only uses governorates that checkout knows about", () => {
    const known = new Set(SUDAN_CITIES.map((c) => c.name));
    for (const z of SHIPPING_ZONES) for (const g of z.governorates) expect(known.has(g), `${z.zoneName}: ${g}`).toBe(true);
  });
});
