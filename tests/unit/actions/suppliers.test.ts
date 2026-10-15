import { beforeEach, describe, expect, it, vi } from "vitest";

const db: any = {
  supplier: { findFirst: vi.fn(), delete: vi.fn() },
  purchase: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn(), count: vi.fn() },
  product: { update: vi.fn() },
  stockMovement: { create: vi.fn(), count: vi.fn(), findMany: vi.fn() },
  transaction: { create: vi.fn() },
};
db.$transaction = vi.fn(async (fn: any) => fn(db));
const session = { user: { id: "u1", role: "ADMIN", name: "Admin" } };

vi.mock("@/lib/prisma", () => ({ prisma: db, db }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => session) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ createAdminBroadcastNotification: vi.fn(async () => null) }));
vi.mock("@/lib/suppliers", async (orig) => ({
  ...(await orig<any>()),
  supplierHasPurchases: vi.fn(async () => true),
}));

const pending = {
  id: "pu1",
  purchaseNumber: "PO-1",
  supplierId: "s1",
  deliveryStatus: "PENDING",
  totalAmount: 1000,
  paidAmount: 0,
  items: [{ productId: "p1", quantity: 4, unitCost: 250 }],
};

describe("purchases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.user.role = "ADMIN";
    db.product.update.mockImplementation(async ({ data }: any) => ({ id: "p1", name: "P", stock: 10, minStock: 0, purchasePrice: 250, ...data }));
    db.purchase.updateMany.mockResolvedValue({ count: 1 });
  });

  it("receiving adds stock through the stock log and sets the product cost to the purchase price", async () => {
    db.purchase.findUnique.mockResolvedValue(pending);
    db.stockMovement.count.mockResolvedValue(0);
    const { markPurchaseReceivedAction } = await import("@/app/actions/suppliers");

    expect(await markPurchaseReceivedAction("pu1")).toEqual({ ok: true });
    expect(db.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "p1" }, data: { stock: { increment: 4 } } })
    );
    expect(db.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "IN", quantity: 4, reason: "PURCHASE", purchaseId: "pu1", unitCost: 250 }),
    });
    expect(db.product.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { purchasePrice: 250 } });
  });

  it("a received or paid purchase can't be deleted, only cancelled", async () => {
    db.purchase.findUnique.mockResolvedValue({ ...pending, deliveryStatus: "RECEIVED" });
    const { deletePurchaseAction } = await import("@/app/actions/suppliers");

    expect(await deletePurchaseAction("pu1", { force: true })).toEqual({ ok: false, error: "use_cancel" });
    expect(db.purchase.delete).not.toHaveBeenCalled();
  });

  it("cancelling takes the stock back with history and refunds what was paid", async () => {
    db.purchase.findUnique.mockResolvedValue({ ...pending, deliveryStatus: "RECEIVED", paidAmount: 300 });
    db.stockMovement.count.mockResolvedValue(1);
    const { cancelPurchaseAction } = await import("@/app/actions/suppliers");

    expect(await cancelPurchaseAction("pu1")).toEqual({ ok: true });
    expect(db.purchase.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { deliveryStatus: "CANCELLED" } })
    );
    expect(db.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "OUT", quantity: 4, reason: "PURCHASE_CANCEL" }),
    });
    expect(db.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "INCOMING", amount: 300, source: "SUPPLIER", sourceId: "pu1" }),
    });
  });

  it("only an admin can cancel", async () => {
    session.user.role = "MANAGER";
    const { cancelPurchaseAction } = await import("@/app/actions/suppliers");
    expect((await cancelPurchaseAction("pu1")).ok).toBe(false);
    expect(db.purchase.updateMany).not.toHaveBeenCalled();
  });
});

describe("suppliers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("a supplier with purchases can't be deleted, even with force", async () => {
    const { deleteSupplierAction } = await import("@/app/actions/suppliers");
    expect(await deleteSupplierAction("s1", { force: true })).toEqual({ ok: false, error: "has_purchases" });
    expect(db.supplier.delete).not.toHaveBeenCalled();
  });
});

describe("purchasePaymentMeta", () => {
  it("a part-paid purchase past its due date is overdue", async () => {
    const { purchasePaymentMeta } = await import("@/lib/suppliers");
    const past = new Date(Date.now() - 86400000);
    expect(purchasePaymentMeta({ totalAmount: 1000, paidAmount: 400, dueDate: past }).key).toBe("OVERDUE");
    expect(purchasePaymentMeta({ totalAmount: 1000, paidAmount: 1000, dueDate: past }).key).toBe("PAID");
  });
});
