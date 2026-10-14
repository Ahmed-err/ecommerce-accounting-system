import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = {
  product: { findMany: vi.fn() },
  order: { create: vi.fn() },
  invoice: { create: vi.fn() },
  transaction: { create: vi.fn() },
  ledgerInvoice: { create: vi.fn() },
};
const db = { $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) };
const session = { user: { id: "u1", role: "CASHIER" } };

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => session) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn() }));
vi.mock("@/lib/monitoring", () => ({ emitAlert: vi.fn(async () => undefined) }));
vi.mock("@/lib/notifications", () => ({ createAdminBroadcastNotification: vi.fn() }));
vi.mock("@/lib/stock", () => ({
  changeStock: vi.fn(async () => ({})),
  notifyLowStock: vi.fn(),
  StockError: class extends Error {},
}));

const drill = { id: "p1", name: "Drill", nameAr: "شنيور", stock: 5, sellingPrice: 1000, sku: "D1" };

describe("createPOSOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.user.role = "CASHIER";
    tx.product.findMany.mockResolvedValue([drill]);
    tx.order.create.mockResolvedValue({ id: "order1234567", createdAt: new Date() });
    tx.invoice.create.mockResolvedValue({ invoiceNumber: "POS-1" });
  });

  it("saves the server's total with no tax, ignoring amounts sent by the browser", async () => {
    const { createPOSOrder } = await import("@/app/actions/pos");

    const out = await createPOSOrder([{ id: "p1", quantity: 2, price: 1 }], {
      paymentMethod: "CASH",
      discountType: "percent",
      discountValue: 10,
      discountAmount: 1999,
      taxAmount: 300,
    });

    expect(out.success).toBe(true);
    expect(tx.order.create.mock.calls[0][0].data.totalAmount).toBe(1800);
    expect(tx.invoice.create.mock.calls[0][0].data).toMatchObject({ totalAmount: 1800, taxAmount: 0, discountAmount: 200 });
    expect(tx.transaction.create.mock.calls[0][0].data.amount).toBe(1800);
  });

  it("refuses a cashier discount over 10%", async () => {
    const { createPOSOrder } = await import("@/app/actions/pos");

    const out = await createPOSOrder([{ id: "p1", quantity: 2 }], {
      paymentMethod: "CASH",
      discountType: "fixed",
      discountValue: 201,
    });

    expect(out).toMatchObject({ success: false, code: "DISCOUNT_LIMIT" });
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it("lets a manager give a larger discount", async () => {
    session.user.role = "MANAGER";
    const { createPOSOrder } = await import("@/app/actions/pos");

    const out = await createPOSOrder([{ id: "p1", quantity: 2 }], {
      paymentMethod: "BANK_TRANSFER",
      discountType: "percent",
      discountValue: 50,
    });

    expect(out.success).toBe(true);
    expect(tx.order.create.mock.calls[0][0].data).toMatchObject({ totalAmount: 1000, paymentMethod: "BANK_TRANSFER" });
  });

  it("refuses unknown payment methods", async () => {
    const { createPOSOrder } = await import("@/app/actions/pos");

    const out = await createPOSOrder([{ id: "p1", quantity: 1 }], { paymentMethod: "STORE_CREDIT" });

    expect(out).toMatchObject({ success: false, code: "BAD_PAYMENT" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("pay later needs a real customer name and phone", async () => {
    const { createPOSOrder } = await import("@/app/actions/pos");

    const out = await createPOSOrder([{ id: "p1", quantity: 1 }], {
      paymentMethod: "CREDIT",
      customerName: "عميل مباشر",
      customerPhone: "0912345678",
    });

    expect(out).toMatchObject({ success: false, code: "CREDIT_NEEDS_CUSTOMER" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("pay later records a receivable and no cash", async () => {
    const { createPOSOrder } = await import("@/app/actions/pos");

    const out = await createPOSOrder([{ id: "p1", quantity: 2 }], {
      paymentMethod: "CREDIT",
      customerName: "Ali Musa",
      customerPhone: "0912345678",
    });

    expect(out.success).toBe(true);
    expect(tx.transaction.create).not.toHaveBeenCalled();
    expect(tx.ledgerInvoice.create.mock.calls[0][0].data).toMatchObject({
      direction: "RECEIVABLE",
      partyName: "Ali Musa",
      partyPhone: "0912345678",
      orderId: "order1234567",
      amount: 2000,
      status: "PENDING",
    });
  });

  it("a paid sale books cash tagged as POS and saves item cost", async () => {
    tx.product.findMany.mockResolvedValue([{ ...drill, purchasePrice: 600 }]);
    const { createPOSOrder } = await import("@/app/actions/pos");

    await createPOSOrder([{ id: "p1", quantity: 1 }], { paymentMethod: "CARD" });

    expect(tx.order.create.mock.calls[0][0].data.items.create[0]).toMatchObject({ unitCost: 600 });
    expect(tx.transaction.create.mock.calls[0][0].data).toMatchObject({ source: "POS", paymentMethod: "CARD" });
  });

  it("refuses a product without a price", async () => {
    tx.product.findMany.mockResolvedValue([{ ...drill, sellingPrice: 0 }]);
    const { createPOSOrder } = await import("@/app/actions/pos");

    const out = await createPOSOrder([{ id: "p1", quantity: 1 }], { paymentMethod: "CASH" });

    expect(out).toMatchObject({ success: false, code: "ZERO_PRICE", detail: "شنيور" });
    expect(tx.order.create).not.toHaveBeenCalled();
  });
});
