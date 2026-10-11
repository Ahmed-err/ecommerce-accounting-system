"use server";

import { auth } from "@/auth";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { prisma as db } from "@/lib/prisma";
import { z } from "zod";
import { phoneVariants } from "@/lib/auth-identity";

const trackSchema = z.object({
  orderNumber: z.string().max(40),
  phone: z.string().max(30),
});

/**
 * Guest order lookup: the 8-character order ref (or full id) must match exactly, and the
 * phone must be the one on the order (any Sudan format). Returns only what the order page
 * of a signed-in customer would show at a glance.
 */
export async function trackGuestOrderAction(input) {
  const ip = await getClientIP();
  const allowed = await checkRateLimit(`track-order:${ip}`, 10, 60 * 60 * 1000, { failClosed: true });
  if (!allowed) return { success: false, error: "rate_limited" };

  const parsed = trackSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "invalid" };
  const ref = parsed.data.orderNumber.trim().replace(/^#/, "").toLowerCase();
  const phone = phoneVariants(parsed.data.phone);
  if (!/^[a-z0-9]{8}$|^[a-z0-9]{20,30}$/.test(ref) || !phone) return { success: false, error: "invalid" };

  // Phones are stored as typed at checkout, sometimes "phone / second phone", so compare
  // canonical forms here rather than in the query.
  const order = await db.order.findFirst({
    where: { id: ref.length === 8 ? { endsWith: ref } : ref },
    select: { id: true, status: true, createdAt: true, totalAmount: true, guestPhone: true, items: { select: { quantity: true } } },
    orderBy: { createdAt: "desc" },
  });
  const phoneMatches = String(order?.guestPhone || "")
    .split("/")
    .some((p) => phoneVariants(p)?.canonical === phone.canonical);
  if (!order || !phoneMatches) return { success: false, error: "not_found" };

  return {
    success: true,
    order: {
      ref: order.id.slice(-8).toUpperCase(),
      status: order.status,
      createdAt: order.createdAt,
      totalAmount: typeof order.totalAmount?.toNumber === "function" ? order.totalAmount.toNumber() : Number(order.totalAmount),
      itemCount: order.items.reduce((n, it) => n + it.quantity, 0),
    },
  };
}

export async function createReturnRequestAction({ orderId, reason, refundMethod }) {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };

  const order = await db.order.findFirst({
    where: { id: orderId, userId: session.user.id, status: "DELIVERED" },
    include: { items: true },
  });
  if (!order) return { success: false, error: "Order not found" };

  const deliveredAge = Date.now() - new Date(order.updatedAt).getTime();
  if (deliveredAge > 14 * 24 * 60 * 60 * 1000) return { success: false, error: "Return period ended" };

  const amount = order.items.reduce((sum, it) => sum + Number(it.price) * it.quantity, 0);
  await db.orderReturn.create({
    data: {
      returnNumber: `RET-${Date.now().toString(36).toUpperCase()}`,
      orderId,
      reason,
      refundMethod,
      refundAmount: amount,
      items: { create: order.items.map((it) => ({ productId: it.productId, quantity: it.quantity, price: it.price })) },
    },
  });

  return { success: true };
}
