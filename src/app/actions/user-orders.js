"use server";

import { auth } from "@/auth";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { prisma as db } from "@/lib/prisma";
import { z } from "zod";

const trackSchema = z.object({
  orderNumber: z.string().min(3),
  phone: z.string().min(6),
});

export async function trackGuestOrderAction(input) {
  const ip = await getClientIP();
  const allowed = await checkRateLimit(`track-order:${ip}`, 10, 60 * 60 * 1000, { failClosed: true });
  if (!allowed) return { success: false, error: "Rate limited" };

  const parsed = trackSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message };
  const { orderNumber, phone } = parsed.data;

  const normalizedId = orderNumber.replace("#", "").trim().toLowerCase();
  const order = await db.order.findFirst({
    where: {
      guestPhone: { contains: phone.trim() },
      OR: [{ id: { contains: normalizedId } }],
    },
    select: { id: true, status: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (!order) return { success: false, error: "Order not found" };
  return { success: true, order };
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
