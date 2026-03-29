import { prisma as db } from "@/lib/prisma";

function n(d) {
  return d != null ? Number(d) : 0;
}

export function purchasePaymentMeta(p) {
  const total = n(p.totalAmount);
  const paid = n(p.paidAmount);
  const due = p.dueDate ? new Date(p.dueDate) : null;
  const now = new Date();
  if (total <= 0) return { key: "UNPAID", paid, total };
  if (paid >= total - 0.005) return { key: "PAID", paid, total };
  if (paid > 0) return { key: "PARTIAL", paid, total };
  if (due && due < now) return { key: "OVERDUE", paid, total };
  return { key: "UNPAID", paid, total };
}

function monthStart(d = new Date()) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function getSuppliersKpiOverview() {
  const now = new Date();
  const startMonth = monthStart(now);

  const [
    totalSuppliers,
    activeSuppliers,
    purchasesThisMonth,
    purchasesAgg,
    pendingDeliveries,
    allPurchasesForOverdue,
  ] = await Promise.all([
    db.supplier.count(),
    db.supplier.count({ where: { isActive: true } }),
    db.purchase.findMany({
      where: { createdAt: { gte: startMonth } },
      select: { id: true, totalAmount: true, paidAmount: true, dueDate: true },
    }),
    db.purchase.aggregate({
      where: { createdAt: { gte: startMonth } },
      _sum: { totalAmount: true },
    }),
    db.purchase.count({
      where: { deliveryStatus: { in: ["PENDING", "PARTIAL"] } },
    }),
    db.purchase.findMany({
      select: {
        totalAmount: true,
        paidAmount: true,
        dueDate: true,
      },
    }),
  ]);

  let overduePayments = 0;
  for (const p of allPurchasesForOverdue) {
    if (purchasePaymentMeta(p).key === "OVERDUE") overduePayments += 1;
  }

  const monthSpent = n(purchasesAgg._sum.totalAmount);

  return {
    totalSuppliers,
    activeSuppliers,
    purchasesThisMonthCount: purchasesThisMonth.length,
    purchasesThisMonthTotal: monthSpent,
    pendingDeliveries,
    overduePayments,
  };
}

export async function getTopSuppliersByVolume(limit = 5) {
  const rows = await db.purchase.groupBy({
    by: ["supplierId"],
    _sum: { totalAmount: true },
    _count: { id: true },
  });
  const sorted = rows.sort((a, b) => n(b._sum.totalAmount) - n(a._sum.totalAmount)).slice(0, limit);
  const ids = sorted.map((r) => r.supplierId);
  const suppliers = await db.supplier.findMany({ where: { id: { in: ids } } });
  const byId = Object.fromEntries(suppliers.map((s) => [s.id, s]));
  return sorted.map((r) => ({
    supplierId: r.supplierId,
    name: byId[r.supplierId]?.name || "—",
    total: n(r._sum.totalAmount),
    count: r._count.id,
  }));
}

export async function getRecentPurchases(limit = 8) {
  const rows = await db.purchase.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      supplier: { select: { id: true, name: true } },
      items: { select: { id: true } },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    purchaseNumber: p.purchaseNumber,
    createdAt: p.createdAt,
    totalAmount: n(p.totalAmount),
    paidAmount: n(p.paidAmount),
    deliveryStatus: p.deliveryStatus,
    supplierName: p.supplier?.name || "",
    itemCount: p.items.length,
    payment: purchasePaymentMeta(p),
  }));
}

export async function getMonthlySpendingTrend(months = 6) {
  const start = monthStart(new Date());
  start.setMonth(start.getMonth() - (months - 1));
  const rows = await db.$queryRaw`
    SELECT date_trunc('month', "createdAt") AS m,
           SUM("totalAmount")::float AS total
    FROM "Purchase"
    WHERE "createdAt" >= ${start}
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  return (rows || []).map((r) => ({
    month: r.m,
    total: Number(r.total) || 0,
  }));
}

export async function getSupplierPurchaseStats(supplierId) {
  const agg = await db.purchase.aggregate({
    where: { supplierId },
    _sum: { totalAmount: true, paidAmount: true },
    _count: { id: true },
  });
  return {
    purchaseCount: agg._count.id,
    totalPurchases: n(agg._sum.totalAmount),
    totalPaid: n(agg._sum.paidAmount),
    outstanding: Math.max(0, n(agg._sum.totalAmount) - n(agg._sum.paidAmount)),
  };
}

export async function listSuppliersAdmin({ search = "", status = "all", category = "", skip = 0, take = 50 }) {
  const where = {
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "inactive" ? { isActive: false } : {}),
    ...(category ? { category: { contains: category, mode: "insensitive" } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { companyName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.supplier.findMany({
      where,
      orderBy: { name: "asc" },
      skip,
      take,
      include: {
        purchases: { select: { totalAmount: true, paidAmount: true } },
      },
    }),
    db.supplier.count({ where }),
  ]);

  return {
    rows: rows.map((s) => {
      let totalPurch = 0;
      let totalPaid = 0;
      for (const p of s.purchases) {
        totalPurch += n(p.totalAmount);
        totalPaid += n(p.paidAmount);
      }
      return {
        id: s.id,
        name: s.name,
        companyName: s.companyName,
        phone: s.phone,
        email: s.email,
        category: s.category,
        isActive: s.isActive,
        paymentTerms: s.paymentTerms,
        address: s.address,
        taxId: s.taxId,
        notes: s.notes,
        totalPurchases: totalPurch,
        outstanding: Math.max(0, totalPurch - totalPaid),
        purchaseCount: s.purchases.length,
      };
    }),
    total,
  };
}

export async function getSupplierDetailAdmin(id) {
  const s = await db.supplier.findUnique({
    where: { id },
    include: {
      purchases: {
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          items: {
            include: {
              product: { select: { name: true, sku: true } },
            },
          },
        },
      },
    },
  });
  if (!s) return null;
  const stats = await getSupplierPurchaseStats(id);
  return { supplier: s, stats };
}

export async function supplierHasPurchases(id) {
  const c = await db.purchase.count({ where: { supplierId: id } });
  return c > 0;
}

export async function listPurchasesAdmin({
  search = "",
  supplierId = "",
  payment = "all",
  delivery = "all",
  from = "",
  to = "",
  skip = 0,
  take = 50,
}) {
  const where = {
    ...(supplierId ? { supplierId } : {}),
    ...(delivery !== "all" ? { deliveryStatus: delivery } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { purchaseNumber: { contains: search, mode: "insensitive" } },
            { invoiceRef: { contains: search, mode: "insensitive" } },
            { supplier: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const raw = await db.purchase.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 800,
    include: {
      supplier: { select: { id: true, name: true } },
      items: { select: { id: true } },
    },
  });

  let mapped = raw.map((p) => ({
    id: p.id,
    purchaseNumber: p.purchaseNumber,
    createdAt: p.createdAt,
    dueDate: p.dueDate,
    totalAmount: n(p.totalAmount),
    paidAmount: n(p.paidAmount),
    paymentMethod: p.paymentMethod,
    invoiceRef: p.invoiceRef,
    deliveryStatus: p.deliveryStatus,
    supplierId: p.supplierId,
    supplierName: p.supplier?.name || "",
    itemCount: p.items.length,
    payment: purchasePaymentMeta(p),
  }));

  if (payment !== "all") {
    mapped = mapped.filter((r) => r.payment.key === payment);
  }

  const total = mapped.length;
  const rows = mapped.slice(skip, skip + take);
  return { rows, total };
}

export async function getPurchaseDetailAdmin(id) {
  return db.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: { include: { product: { select: { id: true, name: true, sku: true, stock: true } } } },
    },
  });
}

export async function reportMonthlyPurchasesSummary(from, to) {
  const rows = await db.$queryRaw`
    SELECT date_trunc('month', "createdAt") AS m,
           SUM("totalAmount")::float AS total,
           COUNT(*)::int AS cnt
    FROM "Purchase"
    WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}
    GROUP BY 1
    ORDER BY 1 ASC
  `;
  return (rows || []).map((r) => ({
    month: r.m,
    total: Number(r.total) || 0,
    count: Number(r.cnt) || 0,
  }));
}

export async function reportSpendingBySupplier(from, to) {
  const rows = await db.purchase.groupBy({
    by: ["supplierId"],
    where: { createdAt: { gte: from, lte: to } },
    _sum: { totalAmount: true },
  });
  const ids = rows.map((r) => r.supplierId);
  const suppliers = await db.supplier.findMany({ where: { id: { in: ids } } });
  const byId = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));
  return rows
    .map((r) => ({
      name: byId[r.supplierId] || r.supplierId,
      value: n(r._sum.totalAmount),
    }))
    .sort((a, b) => b.value - a.value);
}

export async function reportSpendingByCategory(from, to) {
  const rows = await db.$queryRaw`
    SELECT c.name AS name, SUM(pi."lineTotal")::float AS total
    FROM "PurchaseItem" pi
    JOIN "Purchase" p ON p.id = pi."purchaseId"
    JOIN "Product" pr ON pr.id = pi."productId"
    JOIN "Category" c ON c.id = pr."categoryId"
    WHERE p."createdAt" >= ${from} AND p."createdAt" <= ${to}
    GROUP BY c.name
    ORDER BY total DESC
  `;
  return (rows || []).map((r) => ({ name: r.name, value: Number(r.total) || 0 }));
}

export async function reportOutstandingPayments() {
  const rows = await db.purchase.findMany({
    where: {},
    orderBy: { dueDate: "asc" },
    include: { supplier: { select: { name: true } } },
  });
  const out = [];
  for (const p of rows) {
    const meta = purchasePaymentMeta(p);
    if (meta.key === "PAID") continue;
    const outstanding = n(p.totalAmount) - n(p.paidAmount);
    if (outstanding <= 0.005) continue;
    out.push({
      id: p.id,
      purchaseNumber: p.purchaseNumber,
      supplierName: p.supplier?.name,
      dueDate: p.dueDate,
      totalAmount: n(p.totalAmount),
      paidAmount: n(p.paidAmount),
      outstanding,
      overdue: meta.key === "OVERDUE",
      paymentKey: meta.key,
    });
  }
  return out.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0);
  });
}

export async function listProductsForPurchaseSelect() {
  return db.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, sku: true, stock: true, purchasePrice: true },
    orderBy: { name: "asc" },
    take: 500,
  });
}

export async function listSuppliersForPurchaseSelect() {
  return db.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      companyName: true,
      paymentTerms: true,
    },
  });
}
