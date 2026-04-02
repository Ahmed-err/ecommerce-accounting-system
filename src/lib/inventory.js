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
    isActive: true,
    ...(status === "out" ? { stock: 0 } : {}),
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

export async function getInventorySummary() {
  const [
    totalProducts,
    outRow,
    lowRow,
    productsForValue,
    receiptMonths,
    topQty,
    movementMonths,
    localProducts,
    importedProducts,
    originCategoryMargins,
    originRevenueRows,
  ] = await Promise.all([
    db.product.count({ where: { isActive: true } }),
    db.$queryRaw`SELECT COUNT(*)::int as c FROM "Product" WHERE "isActive" = true AND "stock" = 0`,
    db.$queryRaw`SELECT COUNT(*)::int as c FROM "Product" WHERE "isActive" = true AND "stock" > 0 AND "stock" <= "minStock"`,
    db.product.findMany({
      where: { isActive: true },
      select: { stock: true, purchasePrice: true },
    }),
    db.$queryRaw`
      SELECT date_trunc('month', sm."createdAt") as m,
        COALESCE(SUM(sm."quantity" * COALESCE(sm."unitCost", 0)), 0)::float as v
      FROM "StockMovement" sm
      WHERE sm."type" = 'IN'
      GROUP BY 1
      ORDER BY 1 ASC
      LIMIT 18
    `,
    db.product.findMany({
      where: { isActive: true },
      orderBy: { stock: "desc" },
      take: 10,
      select: { id: true, name: true, sku: true, stock: true },
    }),
    db.$queryRaw`
      SELECT date_trunc('month', sm."createdAt") as m,
        SUM(CASE WHEN sm."type" = 'IN' THEN sm."quantity" ELSE 0 END)::int as ins,
        SUM(CASE WHEN sm."type" = 'OUT' THEN sm."quantity" ELSE 0 END)::int as outs
      FROM "StockMovement" sm
      GROUP BY 1
      ORDER BY 1 ASC
      LIMIT 18
    `,
    db.product.findMany({
      where: { isActive: true, origin: "LOCAL" },
      select: {
        id: true,
        name: true,
        stock: true,
        purchasePrice: true,
        sellingPrice: true,
        localPrice: true,
        countryOfOrigin: true,
        category: { select: { name: true } },
      },
    }),
    db.product.findMany({
      where: { isActive: true, origin: "IMPORTED" },
      select: {
        id: true,
        name: true,
        stock: true,
        sellingPrice: true,
        importedPrice: true,
        importTaxRate: true,
        countryOfOrigin: true,
        category: { select: { name: true } },
      },
    }),
    db.product.findMany({
      where: { isActive: true },
      select: {
        origin: true,
        purchasePrice: true,
        sellingPrice: true,
        category: { select: { name: true } },
      },
    }),
    db.$queryRaw`
      SELECT p."origin" as origin, COALESCE(SUM(oi.quantity * oi.price), 0)::float as revenue
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      JOIN "Product" p ON p.id = oi."productId"
      WHERE o."createdAt" >= NOW() - INTERVAL '365 days'
      GROUP BY p."origin"
    `,
  ]);

  const totalInventoryCostValue = productsForValue.reduce(
    (acc, p) => acc + p.stock * toNum(p.purchasePrice),
    0
  );

  const localStockValue = localProducts.reduce(
    (acc, p) => acc + Number(p.stock || 0) * (toNum(p.localPrice) || toNum(p.purchasePrice)),
    0
  );
  const importedStockValue = importedProducts.reduce(
    (acc, p) => acc + Number(p.stock || 0) * toNum(p.importedPrice),
    0
  );
  const importedTaxPaid = importedProducts.reduce((acc, p) => {
    const base = toNum(p.importedPrice);
    const taxRate = toNum(p.importTaxRate);
    return acc + Number(p.stock || 0) * base * (taxRate / 100);
  }, 0);
  const marginByCategory = {};
  for (const row of originCategoryMargins) {
    const sale = toNum(row.sellingPrice);
    const cost = toNum(row.purchasePrice);
    const margin = sale > 0 ? ((sale - cost) / sale) * 100 : 0;
    const category = row.category?.name || "Other";
    if (!marginByCategory[category]) {
      marginByCategory[category] = { category, LOCAL: [], IMPORTED: [] };
    }
    marginByCategory[category][row.origin || "LOCAL"].push(margin);
  }
  const marginChart = Object.values(marginByCategory).map((item) => ({
    category: item.category,
    local: item.LOCAL.length ? item.LOCAL.reduce((a, b) => a + b, 0) / item.LOCAL.length : 0,
    imported: item.IMPORTED.length ? item.IMPORTED.reduce((a, b) => a + b, 0) / item.IMPORTED.length : 0,
  }));
  const revenueByOrigin = { LOCAL: 0, IMPORTED: 0 };
  for (const row of originRevenueRows || []) {
    revenueByOrigin[row.origin] = Number(row.revenue || 0);
  }
  const unclassifiedCount = await db.product.count({
    where: { isActive: true, countryOfOrigin: null },
  });

  return {
    totalProducts,
    outOfStock: Number(outRow[0]?.c || 0),
    lowStock: Number(lowRow[0]?.c || 0),
    totalInventoryCostValue,
    receiptValueByMonth: (receiptMonths || []).map((r) => ({
      month: r.m,
      value: Number(r.v || 0),
    })),
    topByQuantity: topQty,
    movementByMonth: (movementMonths || []).map((r) => ({
      month: r.m,
      in: Number(r.ins || 0),
      out: Number(r.outs || 0),
    })),
    localProductsCount: localProducts.length,
    importedProductsCount: importedProducts.length,
    unclassifiedCount,
    originAnalysis: {
      local: localProducts.map((p) => ({
        ...p,
        purchasePrice: toNum(p.purchasePrice),
        sellingPrice: toNum(p.sellingPrice),
        localPrice: toNum(p.localPrice),
      })),
      imported: importedProducts.map((p) => ({
        ...p,
        sellingPrice: toNum(p.sellingPrice),
        importedPrice: toNum(p.importedPrice),
        importTaxRate: toNum(p.importTaxRate),
      })),
      localStockValue,
      importedStockValue,
      importedTaxPaid,
      marginChart,
      distribution: {
        byCount: [
          { name: "LOCAL", value: localProducts.length },
          { name: "IMPORTED", value: importedProducts.length },
        ],
        byValue: [
          { name: "LOCAL", value: localStockValue },
          { name: "IMPORTED", value: importedStockValue },
        ],
        byRevenue: [
          { name: "LOCAL", value: revenueByOrigin.LOCAL },
          { name: "IMPORTED", value: revenueByOrigin.IMPORTED },
        ],
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
        product: { select: { id: true, name: true, sku: true } },
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
    where: { id: { in: ids }, isActive: true },
    select: { id: true },
  });
}
