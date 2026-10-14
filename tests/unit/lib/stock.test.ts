import { vi } from "vitest";

vi.mock("@/lib/notifications", () => ({ createAdminBroadcastNotification: vi.fn(async () => ({ count: 1 })) }));

import { changeStock, notifyLowStock, StockError } from "@/lib/stock";
import { createAdminBroadcastNotification } from "@/lib/notifications";

function makeTx(product: { stock: number; minStock: number; name?: string; purchasePrice?: number }) {
  const row = { id: "p1", name: "Cable", purchasePrice: 7, ...product };
  return {
    row,
    product: {
      update: vi.fn(async ({ where, data }: any) => {
        const need = where.stock?.gte ?? 0;
        if (row.stock < need) throw Object.assign(new Error("not found"), { code: "P2025" });
        if (data.stock.increment) row.stock += data.stock.increment;
        if (data.stock.decrement) row.stock -= data.stock.decrement;
        return { ...row };
      }),
    },
    stockMovement: { create: vi.fn(async () => ({})) },
  };
}

describe("changeStock", () => {
  it("adds stock and records an IN movement at the product cost", async () => {
    const tx = makeTx({ stock: 5, minStock: 2 });
    const out = await changeStock(tx, { productId: "p1", delta: 3, reason: "RETURN", userId: "u1" });
    expect(out).toMatchObject({ productId: "p1", stock: 8, crossedLow: false });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "IN", quantity: 3, productId: "p1", reason: "RETURN", userId: "u1", unitCost: 7 }),
    });
  });

  it("removes stock only when enough is left, and records an OUT movement", async () => {
    const tx = makeTx({ stock: 5, minStock: 2 });
    const out = await changeStock(tx, { productId: "p1", delta: -4, reason: "SALE" });
    expect(tx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "p1", stock: { gte: 4 } }, data: { stock: { decrement: 4 } } })
    );
    expect(out).toMatchObject({ stock: 1, crossedLow: true });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "OUT", quantity: 4, reason: "SALE" }),
    });
  });

  it("throws StockError with the product id when stock is short", async () => {
    const tx = makeTx({ stock: 1, minStock: 0 });
    await expect(changeStock(tx, { productId: "p1", delta: -2, reason: "SALE" })).rejects.toBeInstanceOf(StockError);
    expect(tx.stockMovement.create).not.toHaveBeenCalled();
  });

  it("does nothing for a zero change", async () => {
    const tx = makeTx({ stock: 1, minStock: 0 });
    expect(await changeStock(tx, { productId: "p1", delta: 0, reason: "ADJUST" })).toBeNull();
    expect(tx.product.update).not.toHaveBeenCalled();
  });

  it("flags low stock only when the change crosses the minimum", async () => {
    const tx = makeTx({ stock: 2, minStock: 3 });
    const out = await changeStock(tx, { productId: "p1", delta: -1, reason: "SALE" });
    expect(out.crossedLow).toBe(false);
  });

  it("keeps an explicit unit cost and the supplier on receipts", async () => {
    const tx = makeTx({ stock: 0, minStock: 0 });
    await changeStock(tx, { productId: "p1", delta: 2, reason: "RECEIVE", unitCost: 9, supplierId: "s1", notes: "n" });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ unitCost: 9, supplierId: "s1", notes: "n" }),
    });
  });
});

describe("notifyLowStock", () => {
  it("sends one alert per product that crossed the minimum", async () => {
    await notifyLowStock([
      { productId: "p1", name: "A", stock: 1, crossedLow: true },
      { productId: "p2", name: "B", stock: 9, crossedLow: false },
      null,
    ]);
    expect(createAdminBroadcastNotification).toHaveBeenCalledTimes(1);
    expect(createAdminBroadcastNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "LOW_STOCK" }));
  });
});
