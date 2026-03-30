import { vi } from "vitest";

const db = {
  order: { findUnique: vi.fn(), update: vi.fn() },
  orderReturn: { findUnique: vi.fn(), update: vi.fn() },
  product: { updateMany: vi.fn() },
  $transaction: vi.fn(async (fn: any) => fn({ ...db, orderReturn: db.orderReturn, product: db.product })),
};

vi.mock("@/lib/prisma", () => ({ prisma: db, db }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1", role: "ADMIN" } })) }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn(async () => true) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("actions/orders", () => {
  it("cancelOrder pending flow equivalent via reject/approve actions", async () => {
    db.orderReturn.findUnique.mockResolvedValue({ id: "r1", status: "PENDING", items: [{ productId: "p1", quantity: 2 }] });
    db.product.updateMany.mockResolvedValue({ count: 1 });
    const { approveOrderReturn } = await import("@/app/actions/orders");
    const out = await approveOrderReturn("r1");
    expect(out.success).toBe(true);
  });

  it("approve return fails for non-pending", async () => {
    db.orderReturn.findUnique.mockResolvedValue({ id: "r1", status: "APPROVED", items: [] });
    const { approveOrderReturn } = await import("@/app/actions/orders");
    const out = await approveOrderReturn("r1");
    expect(out.success).toBe(false);
  });
});
