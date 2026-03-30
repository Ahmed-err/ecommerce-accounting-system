import { serializeProduct } from "@/lib/inventory";

const calculateStockStatus = (stock: number, minStock: number) => {
  if (stock <= 0) return "Out of Stock";
  if (stock <= minStock) return "Low Stock";
  return "In Stock";
};
const formatCurrency = (v: number) => new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP" }).format(v);
const calculateDiscount = (price: number, discount: number, type: "percent" | "fixed") =>
  type === "percent" ? price - price * (discount / 100) : Math.max(0, price - discount);
const isLowStock = (stock: number, threshold: number) => stock <= threshold;

describe("inventory helpers", () => {
  it("calculates stock status", () => {
    expect(calculateStockStatus(10, 3)).toBe("In Stock");
    expect(calculateStockStatus(3, 3)).toBe("Low Stock");
    expect(calculateStockStatus(0, 3)).toBe("Out of Stock");
  });

  it("formats EGP currency", () => {
    expect(formatCurrency(1234)).toContain("EGP");
  });

  it("calculates discounts", () => {
    expect(calculateDiscount(100, 10, "percent")).toBe(90);
    expect(calculateDiscount(100, 30, "fixed")).toBe(70);
  });

  it("checks low stock boolean", () => {
    expect(isLowStock(2, 3)).toBe(true);
    expect(isLowStock(5, 3)).toBe(false);
  });

  it("serializes inventory product numbers", () => {
    const out = serializeProduct({
      id: "p1",
      name: "P",
      sku: "S",
      stock: 3,
      minStock: 1,
      images: [],
      isActive: true,
      categoryId: "c1",
      supplierId: null,
      purchasePrice: 10,
      sellingPrice: 20,
    } as any);
    expect(out.purchasePrice).toBe(10);
    expect(out.sellingPrice).toBe(20);
  });
});
