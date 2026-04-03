"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
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
import {
  productMutationSchema,
  productOriginUpdateSchema,
  productOriginBulkSchema,
  receiveStockSchema,
  issueStockSchema,
  bulkIdsSchema,
  bulkCategorySchema,
} from "@/lib/schemas/inventory";
import { createAdminBroadcastNotification } from "@/lib/notifications";
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

export async function getCategories() {
  try {
    await ensureStaff();
    return await db.category.findMany({
      orderBy: { name: "asc" },
    });
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
    await ensureStaff();
    return await listStockMovements(params || {});
  } catch (error) {
    console.error("Failed to fetch stock movements:", error);
    return { movements: [], total: 0 };
  }
}

export async function createProduct(data) {
  try {
    await ensureManager();
    const parsed = productMutationSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().fieldErrors };
    }
    const d = parsed.data;
    const barcode =
      d.barcode && String(d.barcode).trim() ? String(d.barcode).trim() : null;
    const product = await db.product.create({
      data: {
        name: d.name,
        nameEn: d.nameEn || null,
        nameAr: d.nameAr || null,
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
        stock: d.stock,
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
    await logAction("CREATE_PRODUCT", { productId: product.id, name: d.name });
    revalidatePath("/admin/inventory");
    return { success: true, product };
  } catch (error) {
    console.error("Failed to create product:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

export async function updateProduct(id, data) {
  try {
    await ensureManager();
    const parsed = productMutationSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.flatten().fieldErrors };
    }
    const d = parsed.data;
    const barcode =
      d.barcode && String(d.barcode).trim() ? String(d.barcode).trim() : null;
    const product = await db.product.update({
      where: { id },
      data: {
        name: d.name,
        nameEn: d.nameEn || null,
        nameAr: d.nameAr || null,
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
        stock: d.stock,
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
    await logAction("UPDATE_PRODUCT", { productId: id, name: d.name });
    revalidatePath("/admin/inventory");
    return { success: true, product };
  } catch (error) {
    console.error("Failed to update product:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

export async function deleteProduct(id) {
  try {
    await ensureManager();
    await db.product.delete({ where: { id } });
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (error) {
    console.error("Physical delete failed, attempting soft delete", error);
    try {
      await db.product.update({
        where: { id },
        data: { isActive: false },
      });
      revalidatePath("/admin/inventory");
      return { success: true, softDeleted: true };
    } catch (softError) {
      return { success: false, error: toActionErrorString(softError) };
    }
  }
}

export async function bulkDeleteProducts(ids) {
  try {
    await ensureManager();
    const parsed = bulkIdsSchema.safeParse({ ids });
    if (!parsed.success) return { success: false, error: "invalid_ids" };
    const valid = await getProductIdsForBulk(parsed.data.ids);
    const idList = valid.map((x) => x.id);
    for (const id of idList) {
      try {
        await db.product.delete({ where: { id } });
      } catch {
        await db.product.update({ where: { id }, data: { isActive: false } });
      }
    }
    await logAction("BULK_DELETE_PRODUCTS", { count: idList.length });
    revalidatePath("/admin/inventory");
    return { success: true, count: idList.length };
  } catch (error) {
    console.error("bulkDeleteProducts:", error);
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
    await ensureManager();
    const current = await db.product.findUnique({ where: { id }, select: { stock: true } });
    if (!current) return { success: false, error: "Product not found" };
    if (current.stock + change < 0) {
      return { success: false, error: "Stock cannot go below zero" };
    }
    const product = await db.product.update({
      where: { id },
      data: { stock: { increment: change } },
    });
    if (product.stock <= product.minStock) {
      await createAdminBroadcastNotification({
        type: "LOW_STOCK",
        titleAr: "تنبيه مخزون منخفض",
        titleEn: "Low stock alert",
        bodyAr: `المنتج ${product.name} وصل إلى مخزون منخفض (${product.stock}).`,
        bodyEn: `Product ${product.name} reached low stock (${product.stock}).`,
        link: "/admin/inventory",
      });
    }
    revalidatePath("/admin/inventory");
    return { success: true, stock: product.stock };
  } catch (error) {
    console.error("Failed to update stock:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

export async function receiveStockAction(raw) {
  try {
    await ensureStaff();
    const u = await sessionUser();
    if (!["ADMIN", "MANAGER", "CASHIER"].includes(u.role)) {
      return { success: false, error: "unauthorized" };
    }
    const parsed = receiveStockSchema.safeParse(raw);
    if (!parsed.success) {
      const f = parsed.error.flatten();
      const fromFields = formatServerActionError(f.fieldErrors);
      const fromForm = Array.isArray(f.formErrors)
        ? f.formErrors.filter(Boolean).join(" · ")
        : "";
      return {
        success: false,
        error: fromFields || fromForm || "Invalid input",
      };
    }
    const { productId, quantity, supplierId, unitCost, notes } = parsed.data;
    await db.$transaction(async (tx) => {
      const p = await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: quantity } },
      });
      await tx.stockMovement.create({
        data: {
          type: "IN",
          quantity,
          productId,
          userId: u.id,
          supplierId: supplierId || null,
          unitCost: unitCost != null ? unitCost : p.purchasePrice,
          notes: notes || null,
        },
      });
    });
    await logAction("STOCK_RECEIVE", { productId, quantity });
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (error) {
    console.error("receiveStockAction:", error);
    return { success: false, error: toActionErrorString(error) };
  }
}

export async function issueStockAction(raw) {
  try {
    await ensureStaff();
    const u = await sessionUser();
    if (!["ADMIN", "MANAGER", "CASHIER"].includes(u.role)) {
      return { success: false, error: "unauthorized" };
    }
    const parsed = issueStockSchema.safeParse(raw);
    if (!parsed.success) {
      const f = parsed.error.flatten();
      const fromFields = formatServerActionError(f.fieldErrors);
      const fromForm = Array.isArray(f.formErrors)
        ? f.formErrors.filter(Boolean).join(" · ")
        : "";
      return {
        success: false,
        error: fromFields || fromForm || "Invalid input",
      };
    }
    const { productId, quantity, reason, notes } = parsed.data;
    let newStock = null;
    let productName = "";
    let minStock = 0;
    await db.$transaction(async (tx) => {
      const cur = await tx.product.findUnique({
        where: { id: productId },
        select: { stock: true, name: true, minStock: true },
      });
      if (!cur) throw new Error("Product not found");
      if (cur.stock < quantity) throw new Error("Insufficient stock");
      const updated = await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });
      newStock = updated.stock;
      productName = cur.name;
      minStock = cur.minStock;
      await tx.stockMovement.create({
        data: {
          type: "OUT",
          quantity,
          productId,
          userId: u.id,
          reason: reason || null,
          notes: notes || null,
        },
      });
    });
    await logAction("STOCK_ISSUE", { productId, quantity });
    if (newStock !== null && newStock <= minStock) {
      await createAdminBroadcastNotification({
        type: "LOW_STOCK",
        titleAr: "تنبيه مخزون منخفض",
        titleEn: "Low stock alert",
        bodyAr: `المنتج ${productName} وصل إلى مخزون منخفض (${newStock}).`,
        bodyEn: `Product ${productName} reached low stock (${newStock}).`,
        link: "/admin/inventory",
      });
    }
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (error) {
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
              { sku: { contains: q, mode: "insensitive" } },
              { barcode: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    return await db.product.findMany({
      where,
      select: { id: true, name: true, sku: true, stock: true },
      orderBy: { name: "asc" },
      take: Math.min(Number(limit) || 80, 150),
    });
  } catch (error) {
    console.error("searchProductsForStock:", error);
    return [];
  }
}
