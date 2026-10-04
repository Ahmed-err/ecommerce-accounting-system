import { describe, expect, it } from "vitest";
import { serializeCatalogProduct } from "@/lib/catalog-serialize";
import { productPublicFields } from "@/lib/store/product-public-fields";

const base = { id: "p1", name: "Fan", sellingPrice: 100, purchasePrice: 80, stock: 3, minStock: 5, images: [], categoryId: "c1" };

describe("public catalog product", () => {
  it("never carries the cost price or supplier", () => {
    const p = serializeCatalogProduct(base);
    expect(p).not.toHaveProperty("purchasePrice");
    expect(productPublicFields).not.toHaveProperty("purchasePrice");
    expect(productPublicFields).not.toHaveProperty("supplierId");
  });

  it("shows a discount only from a real compare-at price", () => {
    expect(serializeCatalogProduct({ ...base, compareAtPrice: null }).hasDiscount).toBe(false);
    const p = serializeCatalogProduct({ ...base, compareAtPrice: 125 });
    expect(p.hasDiscount).toBe(true);
    expect(p.listPrice).toBe(125);
    expect(p.discountPct).toBe(20);
  });
});
