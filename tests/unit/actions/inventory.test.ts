import { vi } from "vitest";

const db = {
  product: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  orderItem: { deleteMany: vi.fn() },
  purchaseItem: { deleteMany: vi.fn() },
  orderReturnItem: { deleteMany: vi.fn() },
  stockMovement: { create: vi.fn() },
  $transaction: vi.fn(async (fn: any) => fn(db)),
};

vi.mock("@/lib/prisma", () => ({ prisma: db, db }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1", role: "ADMIN" } })) }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn(async () => true) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ createAdminBroadcastNotification: vi.fn(async () => ({ count: 1 })) }));

describe("actions/inventory", () => {
  it("createProduct success", async () => {
    db.product.create.mockResolvedValue({ id: "p1" });
    const { createProduct } = await import("@/app/actions/inventory");
    const out = await createProduct({
      name: "P1",
      sku: "SKU1",
      purchasePrice: 10,
      sellingPrice: 20,
      stock: 10,
      minStock: 2,
      categoryId: "c1",
    });
    expect(out.success).toBe(true);
  });

  it("updateStock out prevents negative", async () => {
    db.product.findUnique.mockResolvedValue({ stock: 1 });
    const { updateStockQuantity } = await import("@/app/actions/inventory");
    const out = await updateStockQuantity("p1", -2);
    expect(out.success).toBe(false);
  });

  it("deleteProduct removes dependent rows then the product in one transaction", async () => {
    const { deleteProduct } = await import("@/app/actions/inventory");
    const out = await deleteProduct("p1");
    expect(out.success).toBe(true);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    const byProduct = { where: { productId: { in: ["p1"] } } };
    expect(db.orderItem.deleteMany).toHaveBeenCalledWith(byProduct);
    expect(db.purchaseItem.deleteMany).toHaveBeenCalledWith(byProduct);
    expect(db.orderReturnItem.deleteMany).toHaveBeenCalledWith(byProduct);
    expect(db.product.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["p1"] } } });
  });
});
