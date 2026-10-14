import { beforeEach, describe, expect, it, vi } from "vitest";

const db: any = {
  transaction: { findUnique: vi.fn(), findMany: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
  ledgerInvoice: { updateMany: vi.fn(), findUnique: vi.fn() },
};
db.$transaction = vi.fn(async (fn: any) => fn(db));
const session = { user: { id: "u1", role: "ADMIN" } };

vi.mock("@/lib/prisma", () => ({ prisma: db, db }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => session) }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("actions/accounting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.user.role = "ADMIN";
  });

  it("is admin-only, like the page", async () => {
    session.user.role = "MANAGER";
    const { createTransaction, getTransactions } = await import("@/app/actions/accounting");
    const out = await createTransaction({ type: "OUTGOING", amount: 10, description: "x", category: "Rent" });
    expect(out.success).toBe(false);
    expect(await getTransactions()).toEqual({ transactions: [], total: 0 });
    expect(db.transaction.findMany).not.toHaveBeenCalled();
  });

  it("refuses to delete a row written by the app, including refunds", async () => {
    db.transaction.findUnique.mockResolvedValue({ id: "t1", source: "REFUND", description: "Refund RET-1", category: "Refund" });
    const { deleteTransaction } = await import("@/app/actions/accounting");
    expect(await deleteTransaction("t1")).toEqual({ success: false, error: "locked_system_transaction" });
    expect(db.transaction.delete).not.toHaveBeenCalled();
  });

  it("deletes a row entered by hand", async () => {
    db.transaction.findUnique.mockResolvedValue({ id: "t2", source: null, description: "Rent", category: "Rent" });
    const { deleteTransaction } = await import("@/app/actions/accounting");
    expect(await deleteTransaction("t2")).toEqual({ success: true });
  });

  it("marking a receivable paid books the money once", async () => {
    db.ledgerInvoice.updateMany.mockResolvedValueOnce({ count: 1 });
    db.ledgerInvoice.findUnique.mockResolvedValue({
      id: "l1",
      invoiceNumber: "DEBT-1",
      direction: "RECEIVABLE",
      partyName: "Ali",
      amount: 2000,
      orderId: "o1",
    });
    const { markLedgerInvoicePaid } = await import("@/app/actions/accounting");
    expect((await markLedgerInvoicePaid({ id: "l1" })).success).toBe(true);
    expect(db.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "INCOMING", amount: 2000, source: "DEBT", sourceId: "l1", reference: "o1" }),
    });

    db.ledgerInvoice.updateMany.mockResolvedValueOnce({ count: 0 });
    expect((await markLedgerInvoicePaid({ id: "l1" })).success).toBe(false);
    expect(db.transaction.create).toHaveBeenCalledTimes(1);
  });
});
