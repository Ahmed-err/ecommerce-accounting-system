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
    db.product.update.mockResolvedValueOnce({ id: "p1", name: "P1", stock: 10, minStock: 2, purchasePrice: 10 });
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
    vi.clearAllMocks();
    db.product.update.mockRejectedValueOnce(Object.assign(new Error("nf"), { code: "P2025" }));
    const { updateStockQuantity } = await import("@/app/actions/inventory");
    const out = await updateStockQuantity("p1", -2);
    expect(out).toEqual({ success: false, error: "insufficient_stock" });
    expect(db.stockMovement.create).not.toHaveBeenCalled();
  });

  it("createProduct records the opening stock as a movement", async () => {
    vi.clearAllMocks();
    db.product.create.mockResolvedValue({ id: "p5" });
    db.product.update.mockResolvedValue({ id: "p5", name: "P", stock: 4, minStock: 1, purchasePrice: 3 });
    const { createProduct } = await import("@/app/actions/inventory");
    await createProduct({ name: "P", sku: "S5", purchasePrice: 3, sellingPrice: 5, stock: 4, minStock: 1, categoryId: "c1" });
    expect(db.product.create.mock.calls[0][0].data.stock).toBe(0);
    expect(db.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "IN", quantity: 4, productId: "p5", reason: "OPENING" }),
    });
  });

  it("updateProduct applies only the user's stock change, keeping sales made meanwhile", async () => {
    vi.clearAllMocks();
    // Form loaded 10, user typed 12; two were sold meanwhile so the DB has 8.
    db.product.findUnique.mockResolvedValue({ stock: 8 });
    db.product.update
      .mockResolvedValueOnce({ id: "p1" })
      .mockResolvedValueOnce({ id: "p1", name: "P", stock: 10, minStock: 1, purchasePrice: 3 });
    const { updateProduct } = await import("@/app/actions/inventory");
    const out = await updateProduct("p1", {
      name: "P", sku: "S1", purchasePrice: 3, sellingPrice: 5, stock: 12, stockLoaded: 10, minStock: 1, categoryId: "c1",
    });
    expect(out.success).toBe(true);
    expect(db.product.update.mock.calls[0][0].data).not.toHaveProperty("stock");
    expect(db.product.update.mock.calls[1][0].data).toEqual({ stock: { increment: 2 } });
    expect(db.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "IN", quantity: 2, reason: "ADJUST" }),
    });
  });

  it("cashiers can receive stock but not issue it", async () => {
    vi.clearAllMocks();
    const { auth } = await import("@/auth");
    (auth as any).mockResolvedValue({ user: { id: "c1", role: "CASHIER" } });
    db.product.update.mockResolvedValue({ id: "p1", name: "P", stock: 5, minStock: 1, purchasePrice: 3 });
    const { receiveStockAction, issueStockAction } = await import("@/app/actions/inventory");
    expect(await receiveStockAction({ productId: "p1", quantity: 2, unitCost: 999 })).toEqual({ success: true });
    // A cashier's typed cost is ignored; the product's cost is recorded.
    expect(db.stockMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ unitCost: 3 }) });
    const out = await issueStockAction({ productId: "p1", quantity: 1 });
    expect(out.success).toBe(false);
    expect(db.stockMovement.create).toHaveBeenCalledTimes(1);
    (auth as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
  });

  it("the accountant views stock but cannot change it", async () => {
    vi.clearAllMocks();
    const { auth } = await import("@/auth");
    (auth as any).mockResolvedValue({ user: { id: "a1", role: "ACCOUNTANT" } });
    const { receiveStockAction, issueStockAction } = await import("@/app/actions/inventory");
    expect((await receiveStockAction({ productId: "p1", quantity: 2 })).success).toBe(false);
    expect((await issueStockAction({ productId: "p1", quantity: 1 })).success).toBe(false);
    expect(db.stockMovement.create).not.toHaveBeenCalled();
    (auth as any).mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
  });

  it("setProductsActive hides products without deleting them", async () => {
    vi.clearAllMocks();
    db.product.updateMany.mockResolvedValue({ count: 2 });
    const { setProductsActive } = await import("@/app/actions/inventory");
    const out = await setProductsActive(["p1", "p2"], false);
    expect(out).toEqual({ success: true, count: 2 });
    expect(db.product.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["p1", "p2"] } }, data: { isActive: false } });
    expect(db.product.deleteMany).not.toHaveBeenCalled();
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

  it("saves the brand on create and leaves it alone when an update omits it", async () => {
    const { createProduct, updateProduct } = await import("@/app/actions/inventory");
    db.product.create.mockResolvedValue({ id: "p9" });
    await createProduct({ name: "Fridge", sku: "S9", purchasePrice: 1, sellingPrice: 2, stock: 1, minStock: 0, categoryId: "c1", brand: "LG" });
    expect(db.product.create.mock.calls.at(-1)[0].data.brand).toBe("LG");
    db.product.findUnique.mockResolvedValue({ id: "p9", stock: 1, sellingPrice: 2, purchasePrice: 1 });
    db.product.update.mockReset();
    db.product.update.mockResolvedValue({ id: "p9" });
    await updateProduct("p9", { name: "Fridge", sku: "S9", purchasePrice: 1, sellingPrice: 2, stock: 1, minStock: 0, categoryId: "c1" });
    expect(db.product.update.mock.calls[0][0].data).not.toHaveProperty("brand");
  });
});
