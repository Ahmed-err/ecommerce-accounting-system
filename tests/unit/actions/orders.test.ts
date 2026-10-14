import { vi } from "vitest";

const db: any = {
  order: { findUnique: vi.fn(), update: vi.fn() },
  orderReturn: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(async () => ({ count: 1 })), create: vi.fn() },
  product: { updateMany: vi.fn(), update: vi.fn() },
  stockMovement: { create: vi.fn() },
  transaction: { create: vi.fn() },
};
db.$transaction = vi.fn(async (fn: any) => fn(db));

vi.mock("@/lib/prisma", () => ({ prisma: db, db }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1", role: "ADMIN" } })) }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn(async () => true) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const pendingReturn = (overrides: any = {}) => ({
  id: "r1",
  returnNumber: "RET-1",
  orderId: "order-0001",
  status: "PENDING",
  refundAmount: 200,
  refundMethod: "CASH",
  items: [{ productId: "p1", quantity: 2 }],
  order: {
    id: "order-0001",
    status: "DELIVERED",
    items: [{ productId: "p1", quantity: 2, price: 100 }],
    returns: [],
  },
  ...overrides,
});

describe("actions/orders returns", () => {
  beforeEach(() => vi.clearAllMocks());

  it("approving restocks and books the refund", async () => {
    db.orderReturn.findUnique.mockResolvedValue(pendingReturn());
    db.product.update.mockResolvedValue({ id: "p1", name: "P", stock: 5, minStock: 1, purchasePrice: 3 });
    const { approveOrderReturn } = await import("@/app/actions/orders");
    const out = await approveOrderReturn("r1");
    expect(out.success).toBe(true);
    expect(db.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "IN", quantity: 2, reason: "RETURN", productId: "p1" }),
    });
    expect(db.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "OUTGOING", amount: 200, category: "Refund", reference: "order-0001" }),
    });
  });

  it("refuses a return that would exceed what is left after earlier approved returns", async () => {
    const r = pendingReturn();
    r.order.returns = [{ status: "APPROVED", items: [{ productId: "p1", quantity: 1 }] }] as any;
    db.orderReturn.findUnique.mockResolvedValue(r);
    const { approveOrderReturn } = await import("@/app/actions/orders");
    const out = await approveOrderReturn("r1");
    expect(out).toMatchObject({ success: false, errorCode: "RETURN_QTY_EXCEEDS" });
    expect(db.product.update).not.toHaveBeenCalled();
    expect(db.transaction.create).not.toHaveBeenCalled();
  });

  it("approve fails for non-pending", async () => {
    db.orderReturn.findUnique.mockResolvedValue(pendingReturn({ status: "APPROVED" }));
    const { approveOrderReturn } = await import("@/app/actions/orders");
    const out = await approveOrderReturn("r1");
    expect(out.success).toBe(false);
  });

  it("staff returns take the price from the order, not the form", async () => {
    db.order.findUnique.mockResolvedValue({
      id: "order-0001",
      status: "DELIVERED",
      items: [{ productId: "p1", quantity: 2, price: 100 }],
      returns: [],
    });
    db.orderReturn.create.mockResolvedValue({ id: "r9" });
    const { createOrderReturn } = await import("@/app/actions/orders");
    const out = await createOrderReturn({
      orderId: "order-0001",
      reason: "broken",
      refundMethod: "CASH",
      items: [{ productId: "p1", quantity: 1, price: 99999 }],
    });
    expect(out.success).toBe(true);
    const data = db.orderReturn.create.mock.calls[0][0].data;
    expect(data.refundAmount).toBe(100);
    expect(data.items.create).toEqual([{ productId: "p1", quantity: 1, price: 100 }]);
  });

  it("staff can't open a return on an order that was not delivered", async () => {
    db.order.findUnique.mockResolvedValue({
      id: "order-0001",
      status: "PENDING",
      items: [{ productId: "p1", quantity: 2, price: 100 }],
      returns: [],
    });
    const { createOrderReturn } = await import("@/app/actions/orders");
    const out = await createOrderReturn({
      orderId: "order-0001",
      reason: "broken",
      refundMethod: "CASH",
      items: [{ productId: "p1", quantity: 1 }],
    });
    expect(out).toMatchObject({ success: false, errorCode: "RETURN_NOT_DELIVERED" });
    expect(db.orderReturn.create).not.toHaveBeenCalled();
  });

  it("approving books no more than the order now allows, even for an older pending return", async () => {
    const r = pendingReturn({ refundAmount: 200 });
    Object.assign(r.order, { totalAmount: 180, shippingCost: 0 });
    db.orderReturn.findUnique.mockResolvedValue(r);
    db.product.update.mockResolvedValue({ id: "p1", name: "P", stock: 5, minStock: 1, purchasePrice: 3 });
    const { approveOrderReturn } = await import("@/app/actions/orders");
    await approveOrderReturn("r1");
    expect(db.transaction.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: 180 }) });
  });

  it("only a pending return can be rejected", async () => {
    db.orderReturn.updateMany.mockResolvedValueOnce({ count: 0 });
    const { rejectOrderReturn } = await import("@/app/actions/orders");
    const out = await rejectOrderReturn("r1", "no");
    expect(out.success).toBe(false);
    expect(db.orderReturn.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "r1", status: "PENDING" } })
    );
    expect(db.orderReturn.update).not.toHaveBeenCalled();
  });

  it("store credit is no longer a refund method", async () => {
    const { createOrderReturn } = await import("@/app/actions/orders");
    const out = await createOrderReturn({
      orderId: "order-0001",
      reason: "broken",
      refundMethod: "STORE_CREDIT",
      items: [{ productId: "p1", quantity: 1 }],
    });
    expect(out.success).toBe(false);
  });
});
