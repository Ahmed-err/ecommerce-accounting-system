import { prisma as db } from "@/lib/prisma";

function toNum(v) {
  if (v == null) return 0;
  if (typeof v?.toNumber === "function") return v.toNumber();
  return Number(v) || 0;
}

export async function listUserOrders(userId, { status = "all", search = "", dateFrom, dateTo, page = 1, limit = 10 } = {}) {
  const where = {
    userId,
    ...(status !== "all" ? { status } : {}),
    ...(search ? { id: { contains: search, mode: "insensitive" } } : {}),
    ...(dateFrom || dateTo
      ? { createdAt: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}) } }
      : {}),
  };

  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.order.count({ where }),
  ]);

  return {
    orders: orders.map((o) => ({
      ...o,
      totalAmount: toNum(o.totalAmount),
      shippingCost: toNum(o.shippingCost),
    })),
    total,
  };
}

export async function getUserOrderById(userId, orderId) {
  const order = await db.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: { include: { product: true } },
      invoice: true,
      returns: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) return null;

  return {
    ...order,
    totalAmount: toNum(order.totalAmount),
    shippingCost: toNum(order.shippingCost),
    items: order.items.map((item) => ({ ...item, price: toNum(item.price) })),
    invoice: order.invoice
      ? {
          ...order.invoice,
          totalAmount: toNum(order.invoice.totalAmount),
          taxAmount: toNum(order.invoice.taxAmount),
          discountAmount: toNum(order.invoice.discountAmount),
        }
      : null,
    returns: order.returns.map((r) => ({ ...r, refundAmount: toNum(r.refundAmount) })),
  };
}
