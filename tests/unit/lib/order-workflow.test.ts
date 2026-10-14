import { vi } from "vitest";
import {
  allowedStatusMoves,
  applyStatusChange,
  canMoveStatus,
  checkReturnLines,
  OrderStatusError,
  returnWindowOpen,
} from "@/lib/order-workflow";

describe("canMoveStatus", () => {
  it("lets every staff role move an order forward", () => {
    expect(canMoveStatus("CASHIER", "PENDING", "PROCESSING")).toBe(true);
    expect(canMoveStatus("CASHIER", "SHIPPED", "DELIVERED")).toBe(true);
  });

  it("cashiers cancel only pending orders and never step back", () => {
    expect(canMoveStatus("CASHIER", "PENDING", "CANCELLED")).toBe(true);
    expect(canMoveStatus("CASHIER", "PROCESSING", "CANCELLED")).toBe(false);
    expect(canMoveStatus("CASHIER", "SHIPPED", "PENDING")).toBe(false);
  });

  it("managers cancel anything not delivered and may reinstate", () => {
    expect(canMoveStatus("MANAGER", "SHIPPED", "CANCELLED")).toBe(true);
    expect(canMoveStatus("ADMIN", "CANCELLED", "PENDING")).toBe(true);
    expect(canMoveStatus("CASHIER", "CANCELLED", "PENDING")).toBe(false);
    expect(canMoveStatus("ADMIN", "CANCELLED", "DELIVERED")).toBe(false);
  });

  it("a delivered order changes only through a return", () => {
    for (const to of ["PENDING", "PROCESSING", "SHIPPED", "CANCELLED"]) {
      expect(canMoveStatus("ADMIN", "DELIVERED", to)).toBe(false);
    }
  });

  it("lists the allowed moves", () => {
    expect(allowedStatusMoves("CASHIER", "PENDING")).toEqual(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]);
    expect(allowedStatusMoves("CUSTOMER", "PENDING")).toEqual([]);
  });
});

function makeTx({ count = 1, returns = [] as any[], booked = [] as any[] } = {}) {
  return {
    order: { updateMany: vi.fn(async () => ({ count })) },
    orderReturn: { findMany: vi.fn(async () => returns) },
    product: {
      update: vi.fn(async ({ data }: any) => ({ id: "p", name: "P", stock: 10, minStock: 0, purchasePrice: 1, ...data })),
    },
    stockMovement: { create: vi.fn() },
    transaction: { create: vi.fn(), findMany: vi.fn(async () => booked) },
  };
}

const order = {
  id: "order-00000001",
  status: "PENDING",
  totalAmount: 300,
  items: [
    { productId: "a", quantity: 2, price: 100 },
    { productId: "b", quantity: 1, price: 100 },
  ],
};

describe("applyStatusChange", () => {
  it("refuses when the status changed meanwhile", async () => {
    const tx = makeTx({ count: 0 });
    await expect(applyStatusChange(tx, { order, to: "CANCELLED" })).rejects.toBeInstanceOf(OrderStatusError);
    expect(tx.product.update).not.toHaveBeenCalled();
  });

  it("cancelling puts back only stock not already returned and reverses the money booked minus refunds", async () => {
    const tx = makeTx({
      returns: [{ refundAmount: 100, items: [{ productId: "a", quantity: 1 }] }],
      booked: [{ type: "INCOMING", category: "Sales", amount: 300 }],
    });
    await applyStatusChange(tx, { order: { ...order, status: "PROCESSING" }, to: "CANCELLED", userId: "u1" });
    expect(tx.product.update).toHaveBeenCalledTimes(2);
    expect(tx.product.update.mock.calls[0][0].data).toEqual({ stock: { increment: 1 } });
    expect(tx.product.update.mock.calls[1][0].data).toEqual({ stock: { increment: 1 } });
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "OUTGOING", amount: 200, category: "Sales Reversal" }),
    });
  });

  it("cancelling an order whose money was never booked writes nothing to the cash book", async () => {
    const tx = makeTx();
    await applyStatusChange(tx, { order, to: "CANCELLED" });
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });

  it("delivering stamps the date and books the money", async () => {
    const tx = makeTx();
    await applyStatusChange(tx, { order: { ...order, status: "SHIPPED" }, to: "DELIVERED" });
    expect(tx.order.updateMany.mock.calls[0][0].data).toEqual({ status: "DELIVERED", deliveredAt: expect.any(Date) });
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "INCOMING", amount: 300, source: "ORDER", reference: order.id }),
    });
  });

  it("reinstating takes the stock again; money waits for delivery", async () => {
    const tx = makeTx();
    await applyStatusChange(tx, { order: { ...order, status: "CANCELLED" }, to: "PENDING" });
    expect(tx.product.update.mock.calls[0][0].data).toEqual({ stock: { decrement: 2 } });
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });
});

describe("returns", () => {
  it("opens the window from the delivery date", () => {
    const day = 24 * 60 * 60 * 1000;
    const now = Date.UTC(2026, 9, 20);
    expect(returnWindowOpen({ status: "DELIVERED", deliveredAt: new Date(now - 10 * day), updatedAt: new Date(now) }, now)).toBe(true);
    expect(returnWindowOpen({ status: "DELIVERED", deliveredAt: new Date(now - 15 * day), updatedAt: new Date(now) }, now)).toBe(false);
    expect(returnWindowOpen({ status: "DELIVERED", deliveredAt: null, updatedAt: new Date(now - 3 * day) }, now)).toBe(true);
    expect(returnWindowOpen({ status: "SHIPPED", deliveredAt: null, updatedAt: new Date(now) }, now)).toBe(false);
  });

  it("takes the price from the order and caps quantity by earlier returns", () => {
    const o = {
      ...order,
      returns: [
        { status: "APPROVED", items: [{ productId: "a", quantity: 1 }] },
        { status: "REJECTED", items: [{ productId: "a", quantity: 2 }] },
      ],
    };
    expect(checkReturnLines(o, [{ productId: "a", quantity: 1, price: 1 }])).toEqual({
      ok: true,
      lines: [{ productId: "a", quantity: 1, price: 100 }],
      refundAmount: 100,
    });
    expect(checkReturnLines(o, [{ productId: "a", quantity: 2 }])).toEqual({ ok: false, code: "RETURN_QTY_EXCEEDS" });
    expect(checkReturnLines(o, [{ productId: "zzz", quantity: 1 }])).toEqual({ ok: false, code: "RETURN_INVALID_PRODUCT" });
    expect(checkReturnLines(o, [{ productId: "b", quantity: 0 }])).toEqual({ ok: false, code: "RETURN_NO_ITEMS" });
  });

  it("refunds what was paid for the items: discount shared out, delivery kept", () => {
    // 2 × 1000 listed, 10% discount, 1500 delivery → paid 1800 for the items.
    const o = { totalAmount: 3300, shippingCost: 1500, items: [{ productId: "a", quantity: 2, price: 1000 }], returns: [] };
    expect(checkReturnLines(o, [{ productId: "a", quantity: 1 }])).toMatchObject({ ok: true, refundAmount: 900 });
    expect(checkReturnLines(o, [{ productId: "a", quantity: 2 }])).toMatchObject({ ok: true, refundAmount: 1800 });
  });

  it("never refunds more than the list price when nothing was discounted", () => {
    const o = { totalAmount: 2000, shippingCost: 0, items: [{ productId: "a", quantity: 2, price: 1000 }], returns: [] };
    expect(checkReturnLines(o, [{ productId: "a", quantity: 1 }])).toMatchObject({ refundAmount: 1000 });
  });
});
