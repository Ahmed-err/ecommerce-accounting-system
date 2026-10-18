import { beforeEach, describe, expect, it, vi } from "vitest";

// Supplier and salary payments write to the cash book.
const db: any = {
  purchase: { findUnique: vi.fn(), updateMany: vi.fn() },
  salaryRecord: { findUnique: vi.fn(), updateMany: vi.fn() },
  transaction: { create: vi.fn() },
};
db.$transaction = vi.fn(async (fn: any) => fn(db));

vi.mock("@/lib/prisma", () => ({ prisma: db, db }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1", role: "ADMIN" } })) }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("cash book for payments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("a supplier payment books cash out, tagged so it is not counted as an expense", async () => {
    db.purchase.findUnique.mockResolvedValue({
      id: "pu1",
      purchaseNumber: "PO-1",
      totalAmount: 1000,
      paidAmount: 200,
      paymentMethod: "CASH",
    });
    db.purchase.updateMany.mockResolvedValue({ count: 1 });
    const { recordPurchasePaymentAction } = await import("@/app/actions/suppliers");

    expect(await recordPurchasePaymentAction("pu1", { amount: 300 })).toEqual({ ok: true });
    expect(db.purchase.updateMany.mock.calls[0][0].data.paidAmount).toBe(500);
    expect(db.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "OUTGOING", amount: 300, source: "SUPPLIER", sourceId: "pu1" }),
    });
  });

  it("books nothing when another payment got there first", async () => {
    db.purchase.findUnique.mockResolvedValue({ id: "pu1", purchaseNumber: "PO-1", totalAmount: 1000, paidAmount: 200 });
    db.purchase.updateMany.mockResolvedValue({ count: 0 });
    const { recordPurchasePaymentAction } = await import("@/app/actions/suppliers");

    expect((await recordPurchasePaymentAction("pu1", { amount: 300 })).ok).toBe(false);
    expect(db.transaction.create).not.toHaveBeenCalled();
  });

  it("paying a salary books it once as Salaries", async () => {
    db.salaryRecord.findUnique
      .mockResolvedValueOnce({ status: "PENDING" })
      .mockResolvedValueOnce({ id: "s1", month: 10, year: 2026, netSalary: 90000, user: { name: "Omar" } });
    db.salaryRecord.updateMany.mockResolvedValue({ count: 1 });
    const { markSalaryPaid } = await import("@/app/actions/employees");

    expect((await markSalaryPaid("s1")).success).toBe(true);
    expect(db.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "OUTGOING", amount: 90000, category: "Salaries", source: "SALARY", sourceId: "s1" }),
    });
  });
});
