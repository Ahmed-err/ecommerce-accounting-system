import { vi } from "vitest";
import {
  bookOrderCash,
  isEditableTransaction,
  isProfitExpense,
  orderCashBooked,
  reverseOrderCash,
} from "@/lib/ledger";

function fakeTx(rows: any[] = []) {
  return {
    transaction: {
      findMany: vi.fn(async ({ where }: any) => rows.filter((r) => r.reference === where.reference)),
      create: vi.fn(async ({ data }: any) => data),
    },
  };
}

describe("orderCashBooked", () => {
  it("nets sales against reversals for one order, ignoring refunds", async () => {
    const tx = fakeTx([
      { reference: "o1", type: "INCOMING", category: "Sales", amount: 1000 },
      { reference: "o1", type: "OUTGOING", category: "Sales Reversal", amount: 400 },
      { reference: "o1", type: "OUTGOING", category: "Refund", amount: 100 },
      { reference: "o2", type: "INCOMING", category: "Sales", amount: 999 },
    ]);
    expect(await orderCashBooked(tx, "o1")).toBe(600);
  });
});

describe("bookOrderCash", () => {
  it("books the unpaid part of the order when delivered", async () => {
    const tx = fakeTx();
    await bookOrderCash(tx, { id: "order0001", totalAmount: 2500 });
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "INCOMING",
        amount: 2500,
        category: "Sales",
        reference: "order0001",
        source: "ORDER",
        sourceId: "order0001",
      }),
    });
  });

  it("books nothing more for an older order already booked at checkout", async () => {
    const tx = fakeTx([{ reference: "o1", type: "INCOMING", category: "Sales", amount: 2500 }]);
    await bookOrderCash(tx, { id: "o1", totalAmount: 2500 });
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });
});

describe("reverseOrderCash", () => {
  it("reverses only what was booked", async () => {
    const tx = fakeTx([{ reference: "o1", type: "INCOMING", category: "Sales", amount: 2500 }]);
    await reverseOrderCash(tx, { id: "o1" });
    expect(tx.transaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "OUTGOING", amount: 2500, category: "Sales Reversal", source: "ORDER" }),
    });
  });

  it("writes nothing for an order whose money was never booked", async () => {
    const tx = fakeTx();
    await reverseOrderCash(tx, { id: "o1" });
    expect(tx.transaction.create).not.toHaveBeenCalled();
  });
});

describe("isEditableTransaction", () => {
  it("allows only rows entered by hand", () => {
    expect(isEditableTransaction({ source: null, description: "Rent October", category: "Rent" })).toBe(true);
    expect(isEditableTransaction({ source: "SALARY", description: "x", category: "Salaries" })).toBe(false);
    // Older rows written by the app before `source` existed.
    expect(isEditableTransaction({ source: null, description: "Order #AB12CD34 (Buyer: x)", category: "Sales" })).toBe(false);
    expect(isEditableTransaction({ source: null, description: "POS Sale - Order x", category: "Sales" })).toBe(false);
    expect(isEditableTransaction({ source: null, description: "Refund RET-1 - #X (CASH)", category: "Refund" })).toBe(false);
    expect(isEditableTransaction({ source: null, description: "Order Cancellation Reversal - #X", category: "Sales Reversal" })).toBe(false);
  });
});

describe("isProfitExpense", () => {
  it("counts running costs and salaries, not stock, refunds or reversals", () => {
    expect(isProfitExpense({ type: "OUTGOING", source: null, category: "Rent" })).toBe(true);
    expect(isProfitExpense({ type: "OUTGOING", source: "SALARY", category: "Salaries" })).toBe(true);
    expect(isProfitExpense({ type: "OUTGOING", source: "SUPPLIER", category: "Supplier payment" })).toBe(false);
    expect(isProfitExpense({ type: "OUTGOING", source: null, category: "Inventory" })).toBe(false);
    expect(isProfitExpense({ type: "OUTGOING", source: null, category: "Refund" })).toBe(false);
    expect(isProfitExpense({ type: "OUTGOING", source: "ORDER", category: "Sales Reversal" })).toBe(false);
    expect(isProfitExpense({ type: "INCOMING", source: null, category: "Rent" })).toBe(false);
  });
});
