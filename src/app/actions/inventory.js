"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { logAction } from "@/lib/audit";
import {
  getInventoryProducts,
  getInventorySummary,
  listSuppliers,
  listStockMovements,
  getProductIdsForBulk,
} from "@/lib/inventory";
import { INVENTORY_PAGE_SIZE } from "@/lib/constants";
import { parentError } from "@/lib/category-tree";
import {
  productMutationSchema,
  productOriginUpdateSchema,
  productOriginBulkSchema,
  receiveStockSchema,
  issueStockSchema,
  bulkIdsSchema,
  bulkActiveSchema,
  bulkCategorySchema,
  categoryMutationSchema,
  categoryDeleteSchema,
} from "@/lib/schemas/inventory";
import { changeStock, notifyLowStock, StockError } from "@/lib/stock";
import { formatServerActionError } from "@/lib/utils";

function toActionErrorString(error) {
  const fallback = "Something went wrong. Please try again.";
  let msg = formatServerActionError(error);
  if (!msg && error != null) {
    try {
      msg = String(error);
    } catch {
      msg = "";
    }
  }
  if (!msg.trim()) return fallback;
  const trimmed = msg.trim();
  if (trimmed.includes("does not exist") && /column/i.test(trimmed)) {
    console.error(
      "[inventory] Schema drift (missing column). Apply migrations against the same DATABASE_URL as production (Neon). Example: npx prisma migrate deploy",
      trimmed
    );
    return (
      "Your Neon database is missing schema updates for this app. " +
      "Run `npx prisma migrate deploy` with production `DATABASE_URL` (from Neon), or redeploy using a setup that runs migrations (this repo’s Dockerfile does that before start)."
    );
  }
  return trimmed;
}

async function sessionUser() {
  const session = await auth();
  return session?.user || null;
}

async function ensureStaff() {
  const u = await sessionUser();
  if (!u?.id || !["ADMIN", "MANAGER", "CASHIER"].includes(u.role)) {
    throw new Error("Unauthorized: Staff access required.");
  }
  return u;
}

async function ensureManager() {
  const u = await sessionUser();
  if (!u?.id || !["ADMIN", "MANAGER"].includes(u.role)) {
    throw new Error("Unauthorized: Only Admins or Managers can perform this action.");
  }
  return u;
}

function redactProductsIfCashier(role, products) {
  if (role === "CASHIER") {
    return products.map((p) => ({ ...p, purchasePrice: null, sellingPrice: null }));
  }
  return products;
}

// Order, purchase and return lines are financial history: a product that has any is
// hidden (isActive: false), never deleted. Their foreign keys have no cascade, so the
// database also refuses if one slips through.
async function productIdsWithHistory(tx, productIds) {
  const where = { productId: { in: productIds } };
  const select = { productId: true };
  const rows = await Promise.all([
    tx.orderItem.findMany({ where, select, distinct: ["productId"] }),
    tx.purchaseItem.findMany({ where, select, distinct: ["productId"] }),
    tx.orderReturnItem.findMany({ where, select, distinct: ["productId"] }),
  ]);
  return new Set(rows.flat().map((r) => r.productId));
}

async function deleteProductsWithoutHistoryInTx(tx, productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) return { deleted: [], skipped: [] };
  const withHistory = await productIdsWithHistory(tx, productIds);
  const deleted = productIds.filter((id) => !withHistory.has(id));
  const skipped = productIds.filter((id) => withHistory.has(id));
  if (deleted.length) await tx.product.deleteMany({ where: { id: { in: deleted } } });
  return { deleted, skipped };
}

export async function getCategories() {
  try {
    await ensureStaff();
    const rows = await db.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      nameAr: row.nameAr,
      description: row.description,
      image: row.image,
      parentId: row.parentId,
      productCount: row._count.products,
    }));
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return [];
  }
}

export async function getSuppliers() {
  try {
    await ensureStaff();
    return await listSuppliers();
  } catch (error) {
    console.error("Failed to fetch suppliers:", error);
    return [];
  }
}

export async function getProducts(params) {
  try {
    const u = await ensureStaff();
    const {
      search = "",
      categoryId = "",
      supplierId = "",
      status = "all",
      origin = "all",
      sort = "newest",
      page = 1,
      limit = INVENTORY_PAGE_SIZE,
    } = params || {};
    const { products, total } = await getInventoryProducts({
      search,
      categoryId,
      supplierId,
      status,
      origin,
      sort,
      page: Number(page) || 1,
      limit: Number(limit) || INVENTORY_PAGE_SIZE,
    });
    return { products: redactProductsIfCashier(u.role, products), total };
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return { products: [], total: 0 };
  }
}

export async function getInventorySummaryAction() {
  try {
    await ensureStaff();
    return await getInventorySummary();
  } catch (error) {
    console.error("Failed to fetch inventory summary:", error);
    return {
      totalProducts: 0,
      outOfStock: 0,
      lowStock: 0,
      totalInventoryCostValue: 0,
      receiptValueByMonth: [],
      topByQuantity: [],
      movementByMonth: [],
    };
  }
}

export async function getStockMovementsAction(params) {
  try {
    const u = await ensureStaff();
    const out = await listStockMovements(params || {});
    if (u.role !== "CASHIER") return out;
    return { ...out, movements: out.movements.map((m) => ({ ...m, unitCost: null })) };
  } catch (error) {
    console.error("Failed to fetch stock movements:", error);
    return { movements: [], total: 0 };
  }
}

export async function createProduct(data) {
  try {
    const u = await ensureManager();
    const parsed = productMutationSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().fieldErrors };
    }
    const d = parsed.data;
    const barcode =
      d.barcode && String(d.barcode).trim() ? String(d.barcode).trim() : null;
    const product = await db.$transaction(async (tx) => {
      const created = await tx.product.create({
      data: {
        name: d.name,
        nameEn: d.nameEn || null,
        nameAr: d.nameAr || null,
        brand: d.brand || null,
        description: d.description || null,
        descriptionEn: d.descriptionEn || null,
        descriptionAr: d.descriptionAr || null,
        sku: d.sku,
        barcode,
        unit: d.unit || "pcs",
        purchasePrice: d.purchasePrice,
        sellingPrice: d.sellingPrice,
        origin: d.origin,
        localPrice: d.localPrice ?? null,
        importedPrice: d.importedPrice ?? null,
        countryOfOrigin: d.countryOfOrigin || null,
        importTaxRate: d.importTaxRate ?? null,
        stock: 0,
        minStock: d.minStock,
        categoryId: d.categoryId,
        supplierId: d.supplierId || null,
        images: d.images || [],
        isActive: d.isActive !== undefined ? d.isActive : true,
        compareAtPrice: d.compareAtPrice ?? null,
        specs: d.specs ?? undefined,
        highlights: d.highlights ?? undefined,
      },
      });
      await changeStock(tx, { productId: created.id, delta: d.stock, reason: "OPENING", userId: u.id });
      return created;
    });
    await logAction("CREATE_PRODUCT", { productId: product.id, name: d.name });
    revalidatePath("/admin/inventory");
    revalidateTag("homepage");
    return { success: true, product };
  } catch (error) {
    console.error("Failed to create product:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

export async function updateProduct(id, data) {
  try {
    const u = await ensureManager();
    const parsed = productMutationSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().fieldErrors };
    }
    const d = parsed.data;
    const barcode =
      d.barcode && String(d.barcode).trim() ? String(d.barcode).trim() : null;
    let stockChange = null;
    const product = await db.$transaction(async (tx) => {
      const current = await tx.product.findUnique({ where: { id }, select: { stock: true } });
      if (!current) throw new Error("Product not found");
      const updated = await tx.product.update({
      where: { id },
      data: {
        name: d.name,
        nameEn: d.nameEn || null,
        nameAr: d.nameAr || null,
        ...(d.brand !== undefined && { brand: d.brand || null }),
        description: d.description || null,
        descriptionEn: d.descriptionEn || null,
        descriptionAr: d.descriptionAr || null,
        sku: d.sku,
        barcode,
        unit: d.unit || "pcs",
        purchasePrice: d.purchasePrice,
        sellingPrice: d.sellingPrice,
        origin: d.origin,
        localPrice: d.localPrice ?? null,
        importedPrice: d.importedPrice ?? null,
        countryOfOrigin: d.countryOfOrigin || null,
        importTaxRate: d.importTaxRate ?? null,
        minStock: d.minStock,
        categoryId: d.categoryId,
        supplierId: d.supplierId || null,
        images: d.images || [],
        isActive: d.isActive !== undefined ? d.isActive : true,
        compareAtPrice: d.compareAtPrice ?? null,
        specs: d.specs ?? undefined,
        highlights: d.highlights ?? undefined,
      },
      });
      // A sale while the form was open must not be undone: apply only what the user changed.
      const delta = d.stock - (d.stockLoaded ?? current.stock);
      stockChange = await changeStock(tx, { productId: id, delta, reason: "ADJUST", userId: u.id });
      return stockChange ? { ...updated, stock: stockChange.stock } : updated;
    });
    await notifyLowStock([stockChange]);
    await logAction("UPDATE_PRODUCT", { productId: id, name: d.name });
    revalidatePath("/admin/inventory");
    revalidateTag("homepage");
    return { success: true, product };
  } catch (error) {
    if (error instanceof StockError) return { success: false, error: "insufficient_stock" };
    console.error("Failed to update product:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

export async function deleteProduct(id) {
  try {
    await ensureManager();
    const { skipped } = await db.$transaction((tx) => deleteProductsWithoutHistoryInTx(tx, [id]));
    if (skipped.length) return { success: false, error: "product_has_history" };
    await logAction("DELETE_PRODUCT", { productId: id });
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete product:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

export async function bulkDeleteProducts(ids) {
  try {
    await ensureManager();
    const parsed = bulkIdsSchema.safeParse({ ids });
    if (!parsed.success) return { success: false, error: "invalid_ids" };
    const valid = await getProductIdsForBulk(parsed.data.ids);
    const idList = valid.map((x) => x.id);
    const { deleted, skipped } = await db.$transaction((tx) => deleteProductsWithoutHistoryInTx(tx, idList));
    await logAction("BULK_DELETE_PRODUCTS", { count: deleted.length, skipped: skipped.length });
    revalidatePath("/admin/inventory");
    return { success: true, count: deleted.length, skipped: skipped.length };
  } catch (error) {
    console.error("bulkDeleteProducts:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

// Hide or show products in the store. Products with sales history are hidden, never deleted (A-20).
export async function setProductsActive(ids, isActive) {
  try {
    await ensureManager();
    const parsed = bulkActiveSchema.safeParse({ ids, isActive });
    if (!parsed.success) return { success: false, error: "invalid_input" };
    const result = await db.product.updateMany({
      where: { id: { in: parsed.data.ids } },
      data: { isActive: parsed.data.isActive },
    });
    await logAction(parsed.data.isActive ? "SHOW_PRODUCTS" : "HIDE_PRODUCTS", { count: result.count });
    revalidateStock();
    return { success: true, count: result.count };
  } catch (error) {
    console.error("setProductsActive:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

// Two levels only: a parent must be a top category, and a category with subcategories stays on top.
async function checkParent(id, parentId) {
  if (!parentId) return null;
  const all = await db.category.findMany({ select: { id: true, parentId: true } });
  return parentError({ id, parentId }, all);
}

export async function createCategory(data) {
  try {
    await ensureManager();
    const parsed = categoryMutationSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().fieldErrors };
    }
    const d = parsed.data;
    const reason = await checkParent(null, d.parentId);
    if (reason) return { success: false, error: "category_parent", reason };
    const category = await db.category.create({
      data: {
        name: d.name,
        nameAr: d.nameAr || null,
        description: d.description || null,
        image: d.image || null,
        parentId: d.parentId ?? null,
      },
    });
    await logAction("CREATE_CATEGORY", { categoryId: category.id, name: category.name });
    revalidatePath("/admin/inventory");
    revalidatePath("/products");
    revalidateTag("homepage");
    return { success: true, category };
  } catch (error) {
    console.error("createCategory:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

export async function updateCategory(id, data) {
  try {
    await ensureManager();
    const parsed = categoryMutationSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().fieldErrors };
    }
    const d = parsed.data;
    const reason = await checkParent(id, d.parentId);
    if (reason) return { success: false, error: "category_parent", reason };
    const category = await db.category.update({
      where: { id },
      data: {
        name: d.name,
        nameAr: d.nameAr || null,
        description: d.description || null,
        image: d.image || null,
        ...(d.parentId !== undefined && { parentId: d.parentId }),
      },
    });
    await logAction("UPDATE_CATEGORY", { categoryId: id, name: category.name });
    revalidatePath("/admin/inventory");
    revalidatePath("/products");
    revalidateTag("homepage");
    return { success: true, category };
  } catch (error) {
    console.error("updateCategory:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

export async function deleteCategory(id, input = {}) {
  try {
    await ensureManager();
    const parsed = categoryDeleteSchema.safeParse(input || {});
    if (!parsed.success) return { success: false, error: "invalid_input" };
    const force = !!parsed.data.force;
    const category = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) return { success: false, error: "not_found" };
    if (category._count.products > 0 && !force) {
      return { success: false, error: "has_products", count: category._count.products };
    }

    const blocked = await db.$transaction(async (tx) => {
      if (force) {
        const products = await tx.product.findMany({
          where: { categoryId: id },
          select: { id: true },
        });
        const productIds = products.map((p) => p.id);
        const withHistory = await productIdsWithHistory(tx, productIds);
        if (withHistory.size) return withHistory.size;
        if (productIds.length) await tx.product.deleteMany({ where: { id: { in: productIds } } });
      }
      await tx.category.delete({ where: { id } });
      return 0;
    });
    if (blocked) return { success: false, error: "products_have_history", count: blocked };
    await logAction("DELETE_CATEGORY", {
      categoryId: id,
      name: category.name,
      force,
      productCount: category._count.products,
    });
    revalidatePath("/admin/inventory");
    revalidatePath("/products");
    revalidateTag("homepage");
    return { success: true };
  } catch (error) {
    console.error("deleteCategory:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

export async function bulkSetCategory(ids, categoryId) {
  try {
    await ensureManager();
    const parsed = bulkCategorySchema.safeParse({ ids, categoryId });
    if (!parsed.success) return { success: false, error: "invalid_input" };
    const valid = await getProductIdsForBulk(parsed.data.ids);
    const idList = valid.map((x) => x.id);
    await db.product.updateMany({
      where: { id: { in: idList } },
      data: { categoryId: parsed.data.categoryId },
    });
    await logAction("BULK_CATEGORY_PRODUCTS", { count: idList.length, categoryId });
    revalidatePath("/admin/inventory");
    return { success: true, count: idList.length };
  } catch (error) {
    console.error("bulkSetCategory:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

export async function updateStockQuantity(id, change) {
  try {
    const u = await ensureManager();
    const result = await db.$transaction((tx) =>
      changeStock(tx, { productId: id, delta: Number(change), reason: "ADJUST", userId: u.id })
    );
    await notifyLowStock([result]);
    revalidateStock();
    return { success: true, stock: result?.stock };
  } catch (error) {
    if (error instanceof StockError) return { success: false, error: "insufficient_stock" };
    console.error("Failed to update stock:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

function schemaError(parsed) {
  const f = parsed.error.flatten();
  const fromFields = formatServerActionError(f.fieldErrors);
  const fromForm = Array.isArray(f.formErrors) ? f.formErrors.filter(Boolean).join(" · ") : "";
  return fromFields || fromForm || "Invalid input";
}

// Stock shows on the store's product pages and home sections.
function revalidateStock() {
  revalidatePath("/admin/inventory");
  revalidatePath("/products", "layout");
  revalidateTag("homepage");
}

// Cashiers may receive deliveries; taking stock out is for admins and managers (owner, 2026-10-14).
export async function receiveStockAction(raw) {
  try {
    const u = await ensureStaff();
    const parsed = receiveStockSchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: schemaError(parsed) };
    const { productId, quantity, supplierId, unitCost, notes } = parsed.data;
    await db.$transaction((tx) =>
      changeStock(tx, {
        productId,
        delta: quantity,
        reason: "RECEIVE",
        userId: u.id,
        supplierId: supplierId || null,
        // Cashiers don't see costs, so they don't set them either; the product's cost is used.
        unitCost: u.role === "CASHIER" ? undefined : (unitCost ?? undefined),
        notes: notes || null,
      })
    );
    await logAction("STOCK_RECEIVE", { productId, quantity });
    revalidateStock();
    return { success: true };
  } catch (error) {
    console.error("receiveStockAction:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

export async function issueStockAction(raw) {
  try {
    const u = await ensureManager();
    const parsed = issueStockSchema.safeParse(raw);
    if (!parsed.success) return { success: false, error: schemaError(parsed) };
    const { productId, quantity, reason, notes } = parsed.data;
    const result = await db.$transaction((tx) =>
      changeStock(tx, {
        productId,
        delta: -quantity,
        reason: "ISSUE",
        userId: u.id,
        notes: [reason, notes].filter(Boolean).join(" · ") || null,
      })
    );
    await notifyLowStock([result]);
    await logAction("STOCK_ISSUE", { productId, quantity });
    revalidateStock();
    return { success: true };
  } catch (error) {
    if (error instanceof StockError) return { success: false, error: "insufficient_stock" };
    console.error("issueStockAction:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

export async function generateSkuSuggestion() {
  try {
    await ensureManager();
    const n = Date.now().toString(36).toUpperCase();
    return { success: true, sku: `SKU-${n}` };
  } catch (e) {
    return { success: false, error: toActionErrorString(e) };
  }
}

export async function updateProductOriginAction(raw) {
  try {
    await ensureManager();
    const parsed = productOriginUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error:
          formatServerActionError(parsed.error.flatten().fieldErrors) || "Invalid input",
      };
    }
    const d = parsed.data;
    if (d.origin === "IMPORTED" && !d.countryOfOrigin) {
      return { success: false, error: "Country of origin is recommended for imported products." };
    }
    const product = await db.product.update({
      where: { id: d.productId },
      data: {
        origin: d.origin,
        countryOfOrigin: d.countryOfOrigin || null,
        localPrice: d.localPrice ?? null,
        importedPrice: d.importedPrice ?? null,
        importTaxRate: d.importTaxRate ?? null,
      },
    });
    await logAction("UPDATE_PRODUCT_ORIGIN", { productId: d.productId, origin: d.origin });
    revalidatePath("/admin/inventory");
    return { success: true, product };
  } catch (error) {
    console.error("updateProductOriginAction:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

export async function bulkClassifyProductOriginAction(raw) {
  try {
    await ensureManager();
    const parsed = productOriginBulkSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error:
          formatServerActionError(parsed.error.flatten().fieldErrors) || "Invalid input",
      };
    }
    const { ids, origin } = parsed.data;
    const valid = await getProductIdsForBulk(ids);
    const idList = valid.map((x) => x.id);
    const result = await db.product.updateMany({
      where: { id: { in: idList } },
      data: { origin },
    });
    await logAction("BULK_CLASSIFY_PRODUCT_ORIGIN", { count: result.count, origin });
    revalidatePath("/admin/inventory");
    return { success: true, count: result.count };
  } catch (error) {
    console.error("bulkClassifyProductOriginAction:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

export async function searchProductsForStock({ search = "", limit = 80 }) {
  try {
    await ensureStaff();
    const q = search.trim();
    const where = {
      isActive: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { nameAr: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
              { barcode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    return await db.product.findMany({
      where,
      select: { id: true, name: true, nameAr: true, sku: true, stock: true },
      orderBy: { name: "asc" },
      take: Math.min(Number(limit) || 80, 150),
    });
  } catch (error) {
    console.error("searchProductsForStock:", error);
    return [];
  }
}
