import { vi } from "vitest";

const db = {
  product: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  orderItem: { findMany: vi.fn(async () => []), deleteMany: vi.fn() },
  purchaseItem: { findMany: vi.fn(async () => []), deleteMany: vi.fn() },
  orderReturnItem: { findMany: vi.fn(async () => []), deleteMany: vi.fn() },
  stockMovement: { create: vi.fn() },
  category: { findUnique: vi.fn(), delete: vi.fn(), findMany: vi.fn(async () => []), create: vi.fn(), update: vi.fn() },
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

  it("deleteProduct deletes a product that was never sold, bought or returned", async () => {
    const { deleteProduct } = await import("@/app/actions/inventory");
    const out = await deleteProduct("p1");
    expect(out.success).toBe(true);
    expect(db.product.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["p1"] } } });
  });

  it("deleteProduct refuses a product with order history and never touches order lines", async () => {
    vi.clearAllMocks();
    db.orderItem.findMany.mockResolvedValueOnce([{ productId: "p1" }]);
    const { deleteProduct } = await import("@/app/actions/inventory");

    const out = await deleteProduct("p1");

    expect(out).toEqual({ success: false, error: "product_has_history" });
    expect(db.product.deleteMany).not.toHaveBeenCalled();
    expect(db.orderItem.deleteMany).not.toHaveBeenCalled();
    expect(db.purchaseItem.deleteMany).not.toHaveBeenCalled();
    expect(db.orderReturnItem.deleteMany).not.toHaveBeenCalled();
  });

  it("bulkDeleteProducts deletes only products without history and reports the rest", async () => {
    vi.clearAllMocks();
    db.product.findMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }, { id: "p3" }]);
    db.purchaseItem.findMany.mockResolvedValueOnce([{ productId: "p2" }]);
    db.orderReturnItem.findMany.mockResolvedValueOnce([{ productId: "p3" }]);
    const { bulkDeleteProducts } = await import("@/app/actions/inventory");

    const out = await bulkDeleteProducts(["p1", "p2", "p3"]);

    expect(out).toEqual({ success: true, count: 1, skipped: 2 });
    expect(db.product.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ["p1"] } } });
    expect(db.orderItem.deleteMany).not.toHaveBeenCalled();
  });
  it("force-deleting a category is refused when any of its products has history", async () => {
    vi.clearAllMocks();
    db.category.findUnique.mockResolvedValue({ id: "c1", name: "Tools", _count: { products: 2 } });
    db.product.findMany.mockResolvedValue([{ id: "p1" }, { id: "p2" }]);
    db.orderItem.findMany.mockResolvedValueOnce([{ productId: "p2" }]);
    const { deleteCategory } = await import("@/app/actions/inventory");

    const out = await deleteCategory("c1", { force: true });

    expect(out).toEqual({ success: false, error: "products_have_history", count: 1 });
    expect(db.product.deleteMany).not.toHaveBeenCalled();
    expect(db.category.delete).not.toHaveBeenCalled();
  });

  describe("category parent", () => {
    const cats = [
      { id: "top", parentId: null },
      { id: "sub", parentId: "top" },
    ];

    it("creates a subcategory under a top category", async () => {
      db.category.findMany.mockResolvedValue(cats);
      db.category.create.mockResolvedValue({ id: "new", name: "Fans" });
      const { createCategory } = await import("@/app/actions/inventory");
      const out = await createCategory({ name: "Fans", parentId: "top" });
      expect(out.success).toBe(true);
      expect(db.category.create.mock.calls.at(-1)[0].data.parentId).toBe("top");
    });

    it("refuses a third level", async () => {
      db.category.findMany.mockResolvedValue(cats);
      db.category.create.mockClear();
      const { createCategory } = await import("@/app/actions/inventory");
      const out = await createCategory({ name: "Deep", parentId: "sub" });
      expect(out).toMatchObject({ success: false, error: "category_parent", reason: "depth" });
      expect(db.category.create).not.toHaveBeenCalled();
    });

    it("leaves the parent unchanged when an update omits it", async () => {
      db.category.update.mockResolvedValue({ id: "sub", name: "Sub" });
      const { updateCategory } = await import("@/app/actions/inventory");
      await updateCategory("sub", { name: "Sub" });
      expect(db.category.update.mock.calls.at(-1)[0].data).not.toHaveProperty("parentId");
    });
  });
});
