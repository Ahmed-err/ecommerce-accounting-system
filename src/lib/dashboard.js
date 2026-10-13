import { Prisma } from "@prisma/client";
import { prisma as db } from "@/lib/prisma";
import { rangeBounds, pctChange, summarizeSales, buildChart } from "@/lib/dashboard-math";

// Sales figures come from orders (cancelled ones left out); money in/out comes from accounting
// transactions and only feeds the finance summary.
const POS = "POS Station";
const SOURCE = Prisma.sql`CASE WHEN o."guestCity" = ${POS} THEN 'POS' ELSE 'STORE' END`;

function num(v) {
  if (v == null) return 0;
  if (typeof v?.toNumber === "function") return v.toNumber();
  return Number(v) || 0;
}

// Runs query thunks a few at a time so one dashboard load can't drain the connection pool.
async function inBatches(thunks, size = 4) {
  const out = [];
  for (let i = 0; i < thunks.length; i += size) {
    out.push(...(await Promise.all(thunks.slice(i, i + size).map((f) => f()))));
  }
  return out;
}

const salesBySource = (start, end, endOp = "lte") =>
  db.$queryRaw`
    SELECT ${SOURCE} AS source, COALESCE(SUM(o."totalAmount"), 0)::float8 AS total, COUNT(*)::int AS count
    FROM "Order" o
    WHERE o.status <> 'CANCELLED' AND o."createdAt" >= ${start}
      AND ${endOp === "lt" ? Prisma.sql`o."createdAt" < ${end}` : Prisma.sql`o."createdAt" <= ${end}`}
    GROUP BY 1`;

export async function getDashboardData({ range = "month", from, to, view = "monthly" } = {}) {
  const now = new Date();
  const { start, end, prevStart, prevEnd } = rangeBounds(range, from, to, now);
  const chartView = view === "weekly" ? "weekly" : "monthly";
  const unit = chartView === "weekly" ? "week" : "month";
  const chartFrom = buildChart([], chartView, now)[0].start;

  const [
    salesNow,
    salesPrev,
    customersNow,
    customersPrev,
    totalProducts,
    lowStockRows,
    recentOrders,
    topProductsRaw,
    salesByCategoryRaw,
    statusDistRaw,
    chartRaw,
    activities,
    txIn,
    txInPrev,
    txOut,
    txOutPrev,
  ] = await inBatches([
    () => salesBySource(start, end),
    () => salesBySource(prevStart, prevEnd, "lt"),
    () => db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: start, lte: end } } }),
    () => db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: prevStart, lt: prevEnd } } }),
    () => db.product.count({ where: { isActive: true } }),
    () => db.$queryRaw`SELECT COUNT(*)::int AS n FROM "Product" WHERE "isActive" AND stock <= "minStock"`,
    () =>
      db.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          guestName: true,
          guestCity: true,
          user: { select: { firstName: true, lastName: true } },
        },
      }),
    () => db.$queryRaw`
      SELECT p.id, p.name, p."nameAr", p.images[1] AS image,
             SUM(i.quantity)::int AS units, SUM(i.quantity * i.price)::float8 AS revenue
      FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" JOIN "Product" p ON p.id = i."productId"
      WHERE o.status <> 'CANCELLED' AND o."createdAt" >= ${start} AND o."createdAt" <= ${end}
      GROUP BY p.id ORDER BY units DESC, revenue DESC LIMIT 8`,
    () => db.$queryRaw`
      SELECT c.id, c.name, c."nameAr", SUM(i.quantity * i.price)::float8 AS revenue
      FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
        JOIN "Product" p ON p.id = i."productId" JOIN "Category" c ON c.id = p."categoryId"
      WHERE o.status <> 'CANCELLED' AND o."createdAt" >= ${start} AND o."createdAt" <= ${end}
      GROUP BY c.id ORDER BY revenue DESC`,
    () =>
      db.order.groupBy({
        by: ["status"],
        where: { createdAt: { gte: start, lte: end } },
        _count: { _all: true },
      }),
    () => db.$queryRaw`
      SELECT to_char(date_trunc(${unit}, o."createdAt"), 'YYYY-MM-DD') AS bucket, ${SOURCE} AS source,
             SUM(o."totalAmount")::float8 AS total
      FROM "Order" o
      WHERE o.status <> 'CANCELLED' AND o."createdAt" >= ${chartFrom}
      GROUP BY 1, 2`,
    () => db.auditLog.findMany({ take: 15, orderBy: { createdAt: "desc" } }),
    () => db.transaction.aggregate({ where: { type: "INCOMING", createdAt: { gte: start, lte: end } }, _sum: { amount: true } }),
    () => db.transaction.aggregate({ where: { type: "INCOMING", createdAt: { gte: prevStart, lt: prevEnd } }, _sum: { amount: true } }),
    () => db.transaction.aggregate({ where: { type: "OUTGOING", createdAt: { gte: start, lte: end } }, _sum: { amount: true } }),
    () => db.transaction.aggregate({ where: { type: "OUTGOING", createdAt: { gte: prevStart, lt: prevEnd } }, _sum: { amount: true } }),
  ]);

  const sales = summarizeSales(salesNow);
  const prev = summarizeSales(salesPrev);

  const chart = buildChart(
    chartRaw.map((r) => {
      const [y, m, d] = r.bucket.split("-").map(Number);
      return { bucket: new Date(y, m - 1, d), source: r.source, total: r.total };
    }),
    chartView,
    now,
  ).map((b) => ({ start: b.start.toISOString(), store: b.store, pos: b.pos, total: b.total }));

  const catTotal = salesByCategoryRaw.reduce((s, c) => s + c.revenue, 0) || 1;
  const moneyIn = num(txIn._sum.amount);
  const moneyInPrev = num(txInPrev._sum.amount);
  const expenses = num(txOut._sum.amount);
  const expensesPrev = num(txOutPrev._sum.amount);
  const lowStockCount = lowStockRows[0]?.n ?? 0;

  return {
    kpis: [
      { id: "totalRevenue", value: sales.revenue, change: pctChange(sales.revenue, prev.revenue), href: "/admin/orders" },
      { id: "storeRevenue", value: sales.store, change: pctChange(sales.store, prev.store), href: "/admin/orders?source=store" },
      { id: "posRevenue", value: sales.pos, change: pctChange(sales.pos, prev.pos), href: "/admin/orders?source=pos" },
      { id: "totalOrders", value: sales.orders, change: pctChange(sales.orders, prev.orders), href: "/admin/orders" },
      { id: "newCustomers", value: customersNow, change: pctChange(customersNow, customersPrev), href: "/admin/orders" },
      { id: "avgOrderValue", value: sales.average, change: pctChange(sales.average, prev.average), href: "/admin/orders" },
      { id: "totalProducts", value: totalProducts, change: null, href: "/admin/inventory" },
      { id: "lowStock", value: lowStockCount, change: null, href: "/admin/inventory?filter=low" },
    ],
    chart,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      source: o.guestCity === POS ? "POS" : "STORE",
      customer: o.user?.firstName ? `${o.user.firstName} ${o.user.lastName || ""}`.trim() : o.guestName || "",
      total: num(o.totalAmount),
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
    topProducts: topProductsRaw.map((r, i) => ({
      rank: i + 1,
      productId: r.id,
      name: r.name,
      nameAr: r.nameAr,
      image: r.image || null,
      unitsSold: r.units,
      revenue: r.revenue,
    })),
    salesByCategory: salesByCategoryRaw.map((c) => ({
      id: c.id,
      name: c.name,
      nameAr: c.nameAr,
      revenue: c.revenue,
      percent: Number(((c.revenue / catTotal) * 100).toFixed(1)),
    })),
    statusDistribution: statusDistRaw.map((s) => ({ status: s.status, count: s._count._all })),
    quick: { lowStockCount },
    activity: activities.map((a) => ({ id: a.id, action: a.action, details: a.details, createdAt: a.createdAt.toISOString() })),
    finance: {
      revenue: moneyIn,
      expenses,
      net: moneyIn - expenses,
      revenueChange: pctChange(moneyIn, moneyInPrev),
      expensesChange: pctChange(expenses, expensesPrev),
    },
  };
}
