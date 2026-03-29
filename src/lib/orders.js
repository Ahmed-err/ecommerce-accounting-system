import { prisma as db } from "@/lib/prisma";
import { CHECKOUT_TAX_RATE } from "@/lib/constants";

export function n(v) {
  if (v == null) return 0;
  if (typeof v?.toNumber === "function") return v.toNumber();
  return Number(v) || 0;
}

/** Plain JSON for RSC / server action → client (no Prisma Decimal / Date) */
export function serializeOrderForClient(order) {
  if (!order) return null;
  return {
    id: order.id,
    status: order.status,
    totalAmount: n(order.totalAmount),
    shippingCost: n(order.shippingCost),
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
    updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt,
    userId: order.userId,
    guestEmail: order.guestEmail,
    guestName: order.guestName,
    guestPhone: order.guestPhone,
    guestAddress: order.guestAddress,
    guestCity: order.guestCity,
    paymentMethod: order.paymentMethod,
    isVerified: order.isVerified,
    customerNotes: order.customerNotes,
    couponCode: order.couponCode,
    user: order.user
      ? {
          id: order.user.id,
          firstName: order.user.firstName,
          lastName: order.user.lastName,
          email: order.user.email,
        }
      : null,
    items: (order.items || []).map((it) => ({
      id: it.id,
      quantity: it.quantity,
      price: n(it.price),
      productId: it.productId,
      orderId: it.orderId,
      product: it.product
        ? {
            id: it.product.id,
            name: it.product.name,
            nameAr: it.product.nameAr,
            nameEn: it.product.nameEn,
            sku: it.product.sku,
            images: it.product.images,
          }
        : null,
    })),
  };
}

export function serializeReturnForClient(r) {
  if (!r) return null;
  return {
    id: r.id,
    returnNumber: r.returnNumber,
    orderId: r.orderId,
    reason: r.reason,
    refundAmount: n(r.refundAmount),
    refundMethod: r.refundMethod,
    status: r.status,
    processedAt: r.processedAt instanceof Date ? r.processedAt.toISOString() : r.processedAt,
    notes: r.notes,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    order: r.order,
    items: (r.items || []).map((it) => ({
      id: it.id,
      quantity: it.quantity,
      price: n(it.price),
      productId: it.productId,
      returnId: it.returnId,
      createdAt: it.createdAt instanceof Date ? it.createdAt.toISOString() : it.createdAt,
      product: it.product,
    })),
  };
}

export function serializeTopCustomerRow(row) {
  return {
    guestPhone: row.guestPhone,
    _count: { id: row._count?.id ?? 0 },
    _sum: { totalAmount: n(row._sum?.totalAmount) },
  };
}

const ORDER_INCLUDE = {
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, nameAr: true, nameEn: true, sku: true, images: true } },
    },
  },
};

export function isPosOrder(order) {
  return order.guestCity === "POS Station";
}

export async function listOrders({
  search = "",
  status = "all",
  source = "all",
  paymentMethod = "all",
  page = 1,
  limit = 20,
  dateFrom,
  dateTo,
} = {}) {
  const isPosFilter = source === "pos" ? true : source === "store" ? false : undefined;

  const where = {
    ...(status !== "all" ? { status } : {}),
    ...(search
      ? {
          OR: [
            { guestName: { contains: search, mode: "insensitive" } },
            { guestPhone: { contains: search, mode: "insensitive" } },
            { id: { contains: search, mode: "insensitive" } },
            { user: { email: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(isPosFilter === true ? { guestCity: "POS Station" } : {}),
    ...(isPosFilter === false ? { NOT: { guestCity: "POS Station" } } : {}),
    ...(paymentMethod !== "all" ? { paymentMethod } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
          },
        }
      : {}),
  };

  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, include: ORDER_INCLUDE, orderBy: { createdAt: "desc" }, skip, take: limit }),
    db.order.count({ where }),
  ]);

  return { orders, total };
}

export async function getOrderById(id) {
  return db.order.findUnique({
    where: { id },
    include: {
      ...ORDER_INCLUDE,
      invoice: true,
      returns: { include: { items: { include: { product: true } } } },
    },
  });
}

export async function getOrderStatusKpis() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, pending, processing, delivered, cancelled, todayCount, todayRev, monthRev] =
    await Promise.all([
      db.order.count(),
      db.order.count({ where: { status: "PENDING" } }),
      db.order.count({ where: { status: "PROCESSING" } }),
      db.order.count({ where: { status: "DELIVERED" } }),
      db.order.count({ where: { status: "CANCELLED" } }),
      db.order.count({ where: { createdAt: { gte: todayStart } } }),
      db.order.aggregate({
        where: { createdAt: { gte: todayStart }, status: "DELIVERED" },
        _sum: { totalAmount: true },
      }),
      db.order.aggregate({
        where: { createdAt: { gte: monthStart }, status: "DELIVERED" },
        _sum: { totalAmount: true },
      }),
    ]);

  return {
    total,
    pending,
    processing,
    delivered,
    cancelled,
    todayCount,
    todayRevenue: n(todayRev._sum.totalAmount),
    monthRevenue: n(monthRev._sum.totalAmount),
  };
}

export async function getPosDailySummary(date) {
  const d = date ? new Date(date) : new Date();
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);

  const orders = await db.order.findMany({
    where: { guestCity: "POS Station", createdAt: { gte: start, lte: end } },
    select: { id: true, totalAmount: true, paymentMethod: true, status: true },
  });

  const summary = { total: orders.length, revenue: 0, byMethod: {} };
  for (const o of orders) {
    const amt = n(o.totalAmount);
    summary.revenue += amt;
    summary.byMethod[o.paymentMethod] = (summary.byMethod[o.paymentMethod] || 0) + amt;
  }

  return summary;
}

export async function listReturns({ status = "all", source, dateFrom, dateTo } = {}) {
  const where = {
    ...(status !== "all" ? { status } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
          },
        }
      : {}),
  };

  return db.orderReturn.findMany({
    where,
    include: {
      order: {
        select: { id: true, guestName: true, guestCity: true, guestPhone: true },
      },
      items: { include: { product: { select: { name: true, sku: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrderReports({ dateFrom, dateTo } = {}) {
  const now = new Date();
  const start = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = dateTo ? new Date(dateTo + "T23:59:59.999Z") : now;

  const [statusBreakdown, revBySource, topCustomers, returnsCount] = await Promise.all([
    db.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: start, lte: end } },
      _count: { id: true },
    }),
    db.order.groupBy({
      by: ["guestCity"],
      where: { status: "DELIVERED", createdAt: { gte: start, lte: end } },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    db.order.groupBy({
      by: ["guestPhone"],
      where: { status: { not: "CANCELLED" }, createdAt: { gte: start, lte: end } },
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    }),
    db.orderReturn.count({ where: { createdAt: { gte: start, lte: end } } }),
  ]);

  const storeRev = revBySource
    .filter((r) => r.guestCity !== "POS Station")
    .reduce((s, r) => s + n(r._sum.totalAmount), 0);
  const posRev = revBySource
    .filter((r) => r.guestCity === "POS Station")
    .reduce((s, r) => s + n(r._sum.totalAmount), 0);

  const statusPie = statusBreakdown.map((r) => ({ name: r.status, value: r._count.id }));

  return {
    statusPie,
    storeRev,
    posRev,
    topCustomers,
    returnsCount,
    range: { start: start.toISOString(), end: end.toISOString() },
  };
}

/**
 * Creates a missing Order → Invoice row (legacy orders, failed partial writes, etc.).
 * Tax vs discount is inferred: store checkout adds VAT on top when net exceeds line subtotal; POS-style totals use tax 0 and discount = subtotal minus net.
 */
export async function ensureOrderInvoice(order) {
  if (order.invoice) return order.invoice;

  const shipping = n(order.shippingCost);
  const grandTotal = n(order.totalAmount);
  const itemsSubtotal = (order.items || []).reduce((s, it) => s + n(it.price) * it.quantity, 0);
  const net = Math.round((grandTotal - shipping) * 100) / 100;

  let taxAmount;
  let discountAmount;

  if (net > itemsSubtotal + 0.05) {
    const afterDiscount = Math.round((net / (1 + CHECKOUT_TAX_RATE)) * 100) / 100;
    taxAmount = Math.round((net - afterDiscount) * 100) / 100;
    discountAmount = Math.max(0, Math.round((itemsSubtotal - afterDiscount) * 100) / 100);
  } else {
    taxAmount = 0;
    discountAmount = Math.max(0, Math.round((itemsSubtotal - net) * 100) / 100);
  }

  const invoiceNumber = `BACKFILL-${order.id}`;

  try {
    return await db.invoice.create({
      data: {
        orderId: order.id,
        invoiceNumber,
        totalAmount: grandTotal,
        taxAmount,
        discountAmount,
        qrCode: null,
      },
    });
  } catch (e) {
    if (e?.code === "P2002") {
      const existing = await db.invoice.findUnique({ where: { orderId: order.id } });
      if (existing) return existing;
    }
    throw e;
  }
}
