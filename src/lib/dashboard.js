import { prisma as db } from "@/lib/prisma";

function num(v) {
  if (v == null) return 0;
  if (typeof v?.toNumber === "function") return v.toNumber();
  return Number(v) || 0;
}

function pct(current, prev) {
  if (!prev) return current > 0 ? 100 : 0;
  return Number((((current - prev) / prev) * 100).toFixed(1));
}

function bounds(range, from, to) {
  const now = new Date();
  if (range === "today") {
    const s = new Date(now); s.setHours(0, 0, 0, 0);
    return { start: s, end: now };
  }
  if (range === "week") {
    const s = new Date(now); s.setDate(now.getDate() - 6); s.setHours(0, 0, 0, 0);
    return { start: s, end: now };
  }
  if (range === "custom" && from && to) {
    return { start: new Date(from), end: new Date(`${to}T23:59:59.999Z`) };
  }
  const s = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start: s, end: now };
}

export async function getDashboardData({ range = "month", from, to, view = "monthly" } = {}) {
  const { start, end } = bounds(range, from, to);
  const prevStart = new Date(start);
  const span = end.getTime() - start.getTime();
  prevStart.setTime(start.getTime() - span);
  const prevEnd = new Date(start);

  const [
    txNow,
    txPrev,
    ordersNow,
    ordersPrev,
    customersNow,
    customersPrev,
    totalProducts,
    lowStockRows,
    recentOrders,
    topProductsRaw,
    salesByCategoryRaw,
    statusDistRaw,
    activities,
    expensesNow,
    expensesPrev,
    totalReviews,
    pendingReviews,
    employeesAdded,
  ] = await Promise.all([
    db.transaction.aggregate({ where: { type: "INCOMING", createdAt: { gte: start, lte: end } }, _sum: { amount: true } }),
    db.transaction.aggregate({ where: { type: "INCOMING", createdAt: { gte: prevStart, lt: prevEnd } }, _sum: { amount: true } }),
    db.order.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { id: true, totalAmount: true, createdAt: true, status: true, guestName: true, user: { select: { firstName: true, lastName: true } }, guestCity: true },
    }),
    db.order.aggregate({ where: { createdAt: { gte: prevStart, lt: prevEnd } }, _count: { _all: true }, _sum: { totalAmount: true } }),
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: start, lte: end } } }),
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: prevStart, lt: prevEnd } } }),
    db.product.count({ where: { isActive: true } }),
    db.product.findMany({ where: { isActive: true }, select: { stock: true, minStock: true } }),
    db.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
    db.orderItem.groupBy({
      by: ["productId"],
      where: { order: { createdAt: { gte: start, lte: end } } },
      _sum: { quantity: true, price: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 8,
    }),
    db.orderItem.groupBy({
      by: ["productId"],
      where: { order: { createdAt: { gte: start, lte: end } } },
      _sum: { price: true, quantity: true },
    }),
    db.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: start, lte: end } },
      _count: { _all: true },
    }),
    db.auditLog.findMany({ take: 15, orderBy: { createdAt: "desc" } }),
    db.transaction.aggregate({ where: { type: "OUTGOING", createdAt: { gte: start, lte: end } }, _sum: { amount: true } }),
    db.transaction.aggregate({ where: { type: "OUTGOING", createdAt: { gte: prevStart, lt: prevEnd } }, _sum: { amount: true } }),
    db.review?.count?.().catch(() => 0),
    db.review?.count?.({ where: { status: "PENDING" } }).catch(() => 0),
    db.user.count({ where: { role: { in: ["ADMIN", "MANAGER", "CASHIER"] }, createdAt: { gte: start, lte: end } } }),
  ]);

  const topProductIds = topProductsRaw.map((x) => x.productId);
  const products = await db.product.findMany({
    where: { id: { in: topProductIds } },
    select: { id: true, name: true, images: true, category: { select: { id: true, name: true } } },
  });
  const pMap = Object.fromEntries(products.map((p) => [p.id, p]));
  const topProducts = topProductsRaw.map((r, i) => ({
    rank: i + 1,
    productId: r.productId,
    name: pMap[r.productId]?.name || "Unknown",
    image: pMap[r.productId]?.images?.[0] || null,
    unitsSold: Number(r._sum.quantity || 0),
    revenue: num(r._sum.price) * Number(r._sum.quantity || 0),
  }));

  const categoryMap = {};
  for (const row of salesByCategoryRaw) {
    const prod = pMap[row.productId];
    const key = prod?.category?.id || "uncategorized";
    categoryMap[key] = categoryMap[key] || { id: key, name: prod?.category?.name || "Other", revenue: 0 };
    categoryMap[key].revenue += num(row._sum.price) * Number(row._sum.quantity || 0);
  }
  const salesByCategory = Object.values(categoryMap);
  const totalCat = salesByCategory.reduce((s, c) => s + c.revenue, 0) || 1;
  for (const c of salesByCategory) c.percent = Number(((c.revenue / totalCat) * 100).toFixed(1));

  const now = new Date();
  const chart = [];
  if (view === "weekly") {
    for (let i = 11; i >= 0; i--) {
      const ws = new Date(now);
      ws.setDate(now.getDate() - i * 7);
      ws.setHours(0, 0, 0, 0);
      const we = new Date(ws); we.setDate(ws.getDate() + 6); we.setHours(23, 59, 59, 999);
      const ord = await db.order.aggregate({ where: { createdAt: { gte: ws, lte: we } }, _sum: { totalAmount: true } });
      chart.push({
        label: `${ws.getMonth() + 1}/${ws.getDate()}`,
        store: recentOrders.filter((o) => o.createdAt >= ws && o.createdAt <= we && o.guestCity !== "POS Station").reduce((s, o) => s + num(o.totalAmount), 0),
        pos: recentOrders.filter((o) => o.createdAt >= ws && o.createdAt <= we && o.guestCity === "POS Station").reduce((s, o) => s + num(o.totalAmount), 0),
        total: num(ord._sum.totalAmount),
      });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const ms = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const me = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthOrders = await db.order.findMany({ where: { createdAt: { gte: ms, lte: me } }, select: { totalAmount: true, guestCity: true } });
      const store = monthOrders.filter((o) => o.guestCity !== "POS Station").reduce((s, o) => s + num(o.totalAmount), 0);
      const pos = monthOrders.filter((o) => o.guestCity === "POS Station").reduce((s, o) => s + num(o.totalAmount), 0);
      chart.push({ label: ms.toLocaleString("en", { month: "short" }), store, pos, total: store + pos });
    }
  }

  const totalRevenue = num(txNow._sum.amount);
  const prevRevenue = num(txPrev._sum.amount);
  const totalOrders = ordersNow.length;
  const prevOrdersCount = Number(ordersPrev._count._all || 0);
  const avgOrder = totalOrders ? totalRevenue / totalOrders : 0;
  const prevAvg = prevOrdersCount ? num(ordersPrev._sum.totalAmount) / prevOrdersCount : 0;
  const expenses = num(expensesNow._sum.amount);
  const prevExpensesNum = num(expensesPrev._sum.amount);
  const lowStockCount = lowStockRows.filter((p) => p.stock <= p.minStock).length;

  return {
    kpis: [
      { id: "totalRevenue", value: totalRevenue, change: pct(totalRevenue, prevRevenue), href: "/admin/accounting" },
      { id: "storeRevenue", value: ordersNow.filter((o) => o.guestCity !== "POS Station").reduce((s, o) => s + num(o.totalAmount), 0), change: 0, href: "/admin/orders?source=store" },
      { id: "posRevenue", value: ordersNow.filter((o) => o.guestCity === "POS Station").reduce((s, o) => s + num(o.totalAmount), 0), change: 0, href: "/admin/orders?source=pos" },
      { id: "totalOrders", value: totalOrders, change: pct(totalOrders, prevOrdersCount), href: "/admin/orders" },
      { id: "newCustomers", value: customersNow, change: pct(customersNow, customersPrev), href: "/admin/orders" },
      { id: "avgOrderValue", value: avgOrder, change: pct(avgOrder, prevAvg), href: "/admin/orders" },
      { id: "totalProducts", value: totalProducts, change: 0, href: "/admin/inventory" },
      { id: "lowStock", value: lowStockCount, change: 0, href: "/admin/inventory?filter=low" },
    ],
    chart,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      source: o.guestCity === "POS Station" ? "POS" : "STORE",
      customer: o.user?.firstName ? `${o.user.firstName} ${o.user.lastName || ""}`.trim() : o.guestName || "Guest",
      total: num(o.totalAmount),
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
    topProducts,
    salesByCategory,
    statusDistribution: statusDistRaw.map((s) => ({ status: s.status, count: s._count._all })),
    quick: { lowStockCount },
    activity: activities.map((a) => ({ id: a.id, action: a.action, details: a.details, createdAt: a.createdAt.toISOString() })),
    finance: {
      revenue: totalRevenue,
      expenses,
      net: totalRevenue - expenses,
      revenueChange: pct(totalRevenue, prevRevenue),
      expensesChange: pct(expenses, prevExpensesNum),
    },
    extras: {
      reviews: { total: totalReviews, pending: pendingReviews },
      employeesAdded,
    },
  };
}
