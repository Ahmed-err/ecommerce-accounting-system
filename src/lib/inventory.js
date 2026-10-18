import { prisma as db } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { INVENTORY_PAGE_SIZE } from "@/lib/constants";

export { INVENTORY_PAGE_SIZE };

function toNum(d) {
  if (d == null) return 0;
  return typeof d === "object" && typeof d.toNumber === "function" ? d.toNumber() : Number(d);
}

function mapRawProductRow(row) {
  if (!row) return null;
  return serializeProduct({
    id: row.id,
    name: row.name,
    nameEn: row.nameEn,
    nameAr: row.nameAr,
    brand: row.brand ?? null,
    description: row.description,
    descriptionEn: row.descriptionEn,
    descriptionAr: row.descriptionAr,
    sku: row.sku,
    barcode: row.barcode,
    unit: row.unit,
    purchasePrice: row.purchasePrice,
    sellingPrice: row.sellingPrice,
    origin: row.origin,
    localPrice: row.localPrice,
    importedPrice: row.importedPrice,
    countryOfOrigin: row.countryOfOrigin,
    importTaxRate: row.importTaxRate,
    stock: row.stock,
    minStock: row.minStock,
    images: row.images,
    isActive: row.isActive,
    categoryId: row.categoryId,
    supplierId: row.supplierId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    category: row.categoryName ? { id: row.categoryId, name: row.categoryName } : null,
    supplier:
      row.supplier_id != null
        ? { id: row.supplier_id, name: row.supplierName }
        : null,
  });
}

export function serializeProduct(p, { redactPricing = false } = {}) {
  if (!p) return null;
  const base = {
    id: p.id,
    name: p.name,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    brand: p.brand ?? null,
    description: p.description,
    descriptionEn: p.descriptionEn,
    descriptionAr: p.descriptionAr,
    sku: p.sku,
    barcode: p.barcode,
    unit: p.unit || "pcs",
    origin: p.origin || "LOCAL",
    localPrice: toNum(p.localPrice),
    importedPrice: toNum(p.importedPrice),
    countryOfOrigin: p.countryOfOrigin || null,
    importTaxRate: p.importTaxRate == null ? null : toNum(p.importTaxRate),
    stock: p.stock,
    minStock: p.minStock,
    images: p.images || [],
    isActive: p.isActive,
    categoryId: p.categoryId,
    supplierId: p.supplierId,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    category: p.category ? { id: p.category.id, name: p.category.name } : null,
    supplier: p.supplier ? { id: p.supplier.id, name: p.supplier.name } : null,
  };
  if (redactPricing) {
    return { ...base, purchasePrice: null, sellingPrice: null };
  }
  return {
    ...base,
    purchasePrice: toNum(p.purchasePrice),
    sellingPrice: toNum(p.sellingPrice),
  };
}

function sortClause(sort) {
  switch (sort) {
    case "price_asc":
      return Prisma.sql`ORDER BY p."sellingPrice" ASC`;
    case "price_desc":
      return Prisma.sql`ORDER BY p."sellingPrice" DESC`;
    case "cost_asc":
      return Prisma.sql`ORDER BY p."purchasePrice" ASC`;
    case "cost_desc":
      return Prisma.sql`ORDER BY p."purchasePrice" DESC`;
    case "stock_asc":
      return Prisma.sql`ORDER BY p."stock" ASC`;
    case "stock_desc":
      return Prisma.sql`ORDER BY p."stock" DESC`;
    case "minStock_asc":
      return Prisma.sql`ORDER BY p."minStock" ASC`;
    case "minStock_desc":
      return Prisma.sql`ORDER BY p."minStock" DESC`;
    case "name_asc":
      return Prisma.sql`ORDER BY p."name" ASC`;
    case "name_desc":
      return Prisma.sql`ORDER BY p."name" DESC`;
    case "sku_asc":
      return Prisma.sql`ORDER BY p."sku" ASC`;
    case "sku_desc":
      return Prisma.sql`ORDER BY p."sku" DESC`;
    case "newest":
    default:
      return Prisma.sql`ORDER BY p."createdAt" DESC`;
  }
}

function searchSql(search) {
  if (!search?.trim()) return Prisma.empty;
  const q = `%${search.trim()}%`;
  return Prisma.sql`AND (
    p."name" ILIKE ${q}
    OR COALESCE(p."nameEn",'') ILIKE ${q}
    OR COALESCE(p."nameAr",'') ILIKE ${q}
    OR p."sku" ILIKE ${q}
    OR COALESCE(p."barcode",'') ILIKE ${q}
  )`;
}

function categorySupplierSql(categoryId, supplierId, origin) {
  const originSql = origin && origin !== "all" ? Prisma.sql`AND p."origin" = ${origin}` : Prisma.empty;
  if (categoryId && supplierId) {
    return Prisma.sql`AND p."categoryId" = ${categoryId} AND p."supplierId" = ${supplierId} ${originSql}`;
  }
  if (categoryId) return Prisma.sql`AND p."categoryId" = ${categoryId} ${originSql}`;
  if (supplierId) return Prisma.sql`AND p."supplierId" = ${supplierId} ${originSql}`;
  return originSql;
}

export async function getInventoryProducts({
  search = "",
  categoryId = "",
  supplierId = "",
  status = "all",
  origin = "all",
  sort = "newest",
  page = 1,
  limit = INVENTORY_PAGE_SIZE,
}) {
  const skip = (page - 1) * limit;
  const orderSql = sortClause(sort);
  const catSup = categorySupplierSql(categoryId || null, supplierId || null, origin);
  const sSql = searchSql(search);

  if (status === "low") {
    const totalRow = await db.$queryRaw`
      SELECT COUNT(*)::int as count FROM "Product" p
      WHERE p."isActive" = true AND p."stock" > 0 AND p."stock" <= p."minStock"
      ${catSup}
      ${sSql}
    `;
    const total = Number(totalRow[0]?.count || 0);
    const rows = await db.$queryRaw`
      SELECT p.*, c.name as "categoryName",
        s.id as "supplier_id", s.name as "supplierName"
      FROM "Product" p
      LEFT JOIN "Category" c ON p."categoryId" = c.id
      LEFT JOIN "Supplier" s ON p."supplierId" = s.id
      WHERE p."isActive" = true AND p."stock" > 0 AND p."stock" <= p."minStock"
      ${catSup}
      ${sSql}
      ${orderSql}
      LIMIT ${limit} OFFSET ${skip}
    `;
    return { products: rows.map(mapRawProductRow), total };
  }

  if (status === "in") {
    const totalRow = await db.$queryRaw`
      SELECT COUNT(*)::int as count FROM "Product" p
      WHERE p."isActive" = true AND p."stock" > p."minStock"
      ${catSup}
      ${sSql}
    `;
    const total = Number(totalRow[0]?.count || 0);
    const rows = await db.$queryRaw`
      SELECT p.*, c.name as "categoryName",
        s.id as "supplier_id", s.name as "supplierName"
      FROM "Product" p
      LEFT JOIN "Category" c ON p."categoryId" = c.id
      LEFT JOIN "Supplier" s ON p."supplierId" = s.id
      WHERE p."isActive" = true AND p."stock" > p."minStock"
      ${catSup}
      ${sSql}
      ${orderSql}
      LIMIT ${limit} OFFSET ${skip}
    `;
    return { products: rows.map(mapRawProductRow), total };
  }

  const where = {
    ...(status === "out" ? { stock: 0, isActive: true } : {}),
    ...(status === "hidden" ? { isActive: false } : {}),
    ...(origin !== "all" ? { origin } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(supplierId ? { supplierId } : {}),
  };

  const searchOr = search?.trim()
    ? {
        OR: [
          { name: { contains: search.trim(), mode: "insensitive" } },
          { nameEn: { contains: search.trim(), mode: "insensitive" } },
          { nameAr: { contains: search.trim(), mode: "insensitive" } },
          { sku: { contains: search.trim(), mode: "insensitive" } },
          { barcode: { contains: search.trim(), mode: "insensitive" } },
        ],
      }
    : null;

  const finalWhere = searchOr ? { AND: [where, searchOr] } : where;

  const orderBy =
    sort === "price_asc"
      ? { sellingPrice: "asc" }
      : sort === "price_desc"
        ? { sellingPrice: "desc" }
        : sort === "cost_asc"
          ? { purchasePrice: "asc" }
          : sort === "cost_desc"
            ? { purchasePrice: "desc" }
            : sort === "stock_asc"
              ? { stock: "asc" }
              : sort === "stock_desc"
                ? { stock: "desc" }
                : sort === "minStock_asc"
                  ? { minStock: "asc" }
                  : sort === "minStock_desc"
                    ? { minStock: "desc" }
                    : sort === "name_asc"
                      ? { name: "asc" }
                      : sort === "name_desc"
                        ? { name: "desc" }
                        : sort === "sku_asc"
                          ? { sku: "asc" }
                          : sort === "sku_desc"
                            ? { sku: "desc" }
                            : { createdAt: "desc" };

  const [products, total] = await Promise.all([
    db.product.findMany({
      where: finalWhere,
      include: { category: true, supplier: true },
      orderBy,
      skip,
      take: limit,
    }),
    db.product.count({ where: finalWhere }),
  ]);

  return {
    products: products.map((p) => serializeProduct(p)),
    total,
  };
}

const ORIGINS = ["LOCAL", "IMPORTED"];

// Latest `n` months, oldest first, for the charts.
function latestMonths(rows, n = 18) {
  return [...(rows || [])].slice(0, n).reverse();
}

// Totals are summed in the database; only the chart rows and the imported list come back
// as rows. Two small batches keep well under the connection pool.
export async function getInventorySummary() {
  const [totalsRows, receiptMonths, movementMonths, topQty] = await Promise.all([
    db.$queryRaw`
      SELECT
        COUNT(*)::int AS "totalProducts",
        COUNT(*) FILTER (WHERE "stock" = 0)::int AS "outOfStock",
        COUNT(*) FILTER (WHERE "stock" > 0 AND "stock" <= "minStock")::int AS "lowStock",
        COALESCE(SUM("stock" * "purchasePrice"), 0)::float AS "costValue",
        COUNT(*) FILTER (WHERE "origin" = 'LOCAL')::int AS "localCount",
        COUNT(*) FILTER (WHERE "origin" = 'IMPORTED')::int AS "importedCount",
        COUNT(*) FILTER (WHERE "countryOfOrigin" IS NULL)::int AS "unclassified",
        COALESCE(SUM("stock" * COALESCE(NULLIF("localPrice", 0), "purchasePrice")) FILTER (WHERE "origin" = 'LOCAL'), 0)::float AS "localValue",
        COALESCE(SUM("stock" * COALESCE("importedPrice", 0)) FILTER (WHERE "origin" = 'IMPORTED'), 0)::float AS "importedValue",
        COALESCE(SUM("stock" * COALESCE("importedPrice", 0) * COALESCE("importTaxRate", 0) / 100) FILTER (WHERE "origin" = 'IMPORTED'), 0)::float AS "importedTax"
      FROM "Product"
      WHERE "isActive" = true
    `,
    db.$queryRaw`
      SELECT date_trunc('month', "createdAt") AS m,
        COALESCE(SUM("quantity" * COALESCE("unitCost", 0)), 0)::float AS v
      FROM "StockMovement"
      WHERE "type" = 'IN'
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 18
    `,
    db.$queryRaw`
      SELECT date_trunc('month', "createdAt") AS m,
        SUM(CASE WHEN "type" = 'IN' THEN "quantity" ELSE 0 END)::int AS ins,
        SUM(CASE WHEN "type" = 'OUT' THEN "quantity" ELSE 0 END)::int AS outs
      FROM "StockMovement"
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 18
    `,
    db.product.findMany({
      where: { isActive: true },
      orderBy: { stock: "desc" },
      take: 10,
      select: { id: true, name: true, nameAr: true, sku: true, stock: true },
    }),
  ]);

  const [marginRows, revenueRows, importedProducts] = await Promise.all([
    // Products without a price yet are left out of the margin average.
    db.$queryRaw`
      SELECT COALESCE(c."nameAr", c."name", '') AS category, p."origin" AS origin,
        AVG(("sellingPrice" - "purchasePrice") / "sellingPrice" * 100)::float AS margin
      FROM "Product" p
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      WHERE p."isActive" = true AND p."sellingPrice" > 0
      GROUP BY 1, 2
      ORDER BY 1
    `,
    db.$queryRaw`
      SELECT p."origin" AS origin, COALESCE(SUM(oi.quantity * oi.price), 0)::float AS revenue
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      JOIN "Product" p ON p.id = oi."productId"
      WHERE o."createdAt" >= NOW() - INTERVAL '365 days' AND o."status" <> 'CANCELLED'
      GROUP BY p."origin"
    `,
    db.product.findMany({
      where: { isActive: true, origin: "IMPORTED" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        nameAr: true,
        stock: true,
        importedPrice: true,
        importTaxRate: true,
        countryOfOrigin: true,
      },
    }),
  ]);

  const totals = totalsRows[0] || {};
  const marginByCategory = new Map();
  for (const row of marginRows || []) {
    const item = marginByCategory.get(row.category) || { category: row.category, local: 0, imported: 0 };
    item[row.origin === "IMPORTED" ? "imported" : "local"] = Math.round(Number(row.margin || 0) * 10) / 10;
    marginByCategory.set(row.category, item);
  }
  const revenueByOrigin = Object.fromEntries(ORIGINS.map((o) => [o, 0]));
  for (const row of revenueRows || []) revenueByOrigin[row.origin] = Number(row.revenue || 0);
  const localValue = Number(totals.localValue || 0);
  const importedValue = Number(totals.importedValue || 0);

  return {
    totalProducts: Number(totals.totalProducts || 0),
    outOfStock: Number(totals.outOfStock || 0),
    lowStock: Number(totals.lowStock || 0),
    totalInventoryCostValue: Number(totals.costValue || 0),
    receiptValueByMonth: latestMonths(receiptMonths).map((r) => ({ month: r.m, value: Number(r.v || 0) })),
    topByQuantity: topQty.map((p) => ({ ...p, name: p.nameAr || p.name })),
    movementByMonth: latestMonths(movementMonths).map((r) => ({
      month: r.m,
      in: Number(r.ins || 0),
      out: Number(r.outs || 0),
    })),
    localProductsCount: Number(totals.localCount || 0),
    importedProductsCount: Number(totals.importedCount || 0),
    unclassifiedCount: Number(totals.unclassified || 0),
    originAnalysis: {
      imported: importedProducts.map((p) => ({
        ...p,
        importedPrice: toNum(p.importedPrice),
        importTaxRate: toNum(p.importTaxRate),
      })),
      localStockValue: localValue,
      importedStockValue: importedValue,
      importedTaxPaid: Number(totals.importedTax || 0),
      marginChart: [...marginByCategory.values()],
      distribution: {
        byCount: [
          { name: "LOCAL", value: Number(totals.localCount || 0) },
          { name: "IMPORTED", value: Number(totals.importedCount || 0) },
        ],
        byValue: [
          { name: "LOCAL", value: localValue },
          { name: "IMPORTED", value: importedValue },
        ],
        byRevenue: ORIGINS.map((o) => ({ name: o, value: revenueByOrigin[o] })),
      },
    },
  };
}

export async function listSuppliers() {
  return db.supplier.findMany({ orderBy: { name: "asc" } });
}

export async function listStockMovements({
  page = 1,
  limit = 15,
  type = "",
  productId = "",
}) {
  const skip = (page - 1) * limit;
  const where = {
    ...(type === "IN" || type === "OUT" ? { type } : {}),
    ...(productId ? { productId } : {}),
  };
  const [rows, total] = await Promise.all([
    db.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, nameAr: true, sku: true } },
        user: { select: { id: true, name: true, email: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.stockMovement.count({ where }),
  ]);
  return {
    movements: rows.map((m) => ({
      id: m.id,
      type: m.type,
      quantity: m.quantity,
      unitCost: m.unitCost != null ? toNum(m.unitCost) : null,
      reason: m.reason,
      notes: m.notes,
      createdAt: m.createdAt,
      product: m.product,
      user: m.user,
      supplier: m.supplier,
    })),
    total,
  };
}

export async function getProductIdsForBulk(ids) {
  if (!ids?.length) return [];
  return db.product.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
}
