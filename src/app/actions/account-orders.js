"use server";

import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import { z } from "zod";
import { checkReturnLines, REFUND_METHODS, returnWindowOpen } from "@/lib/order-workflow";

const returnItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  // Ignored: the price always comes from the order line.
  price: z.coerce.number().optional(),
});

const customerReturnSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(2).max(2000),
  refundMethod: z.enum(REFUND_METHODS),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(returnItemSchema).min(1),
});

function nextReturnNumber() {
  return `RET-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export async function getReorderPayloadForOrder(orderId) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }
    const order = await db.order.findFirst({
      where: { id: orderId, userId: session.user.id },
      include: {
        items: { include: { product: { include: { category: true } } } },
      },
    });
    if (!order) {
      return { success: false, error: "Order not found" };
    }
    const lines = [];
    for (const it of order.items) {
      const p = it.product;
      if (!p || p.isActive === false) continue;
      const sp = p.sellingPrice;
      const sellingPrice =
        typeof sp?.toNumber === "function" ? sp.toNumber() : Number(sp) || 0;
      lines.push({
        quantity: it.quantity,
        product: {
          id: p.id,
          name: p.name,
          sellingPrice,
          images: Array.isArray(p.images) ? p.images : [],
          stock: Number(p.stock ?? 0),
          category: p.category ? { id: p.category.id, name: p.category.name } : undefined,
        },
      });
    }
    return { success: true, lines };
  } catch (e) {
    console.error("getReorderPayloadForOrder:", e);
    return { success: false, error: e.message || "Failed" };
  }
}

export async function submitCustomerOrderReturn(raw) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized", errorCode: "UNAUTHORIZED" };
    }

    const parsed = customerReturnSchema.safeParse(raw);
    if (!parsed.success) {
      const iss = parsed.error?.issues?.[0];
      return {
        success: false,
        error: iss?.message || "Validation failed",
        errorCode: "VALIDATION",
      };
    }
    const p = parsed.data;

    const order = await db.order.findFirst({
      where: { id: p.orderId, userId: session.user.id },
      include: { items: true, returns: { include: { items: true } } },
    });
    if (!order) {
      return { success: false, error: "Order not found", errorCode: "NOT_FOUND" };
    }
    if (order.status !== "DELIVERED") {
      return { success: false, error: "RETURN_NOT_DELIVERED", errorCode: "RETURN_NOT_DELIVERED" };
    }
    if (!returnWindowOpen(order)) {
      return { success: false, error: "RETURN_WINDOW_CLOSED", errorCode: "RETURN_WINDOW_CLOSED" };
    }
    if (order.returns.some((r) => r.status === "PENDING")) {
      return { success: false, error: "RETURN_PENDING_EXISTS", errorCode: "RETURN_PENDING_EXISTS" };
    }

    const checked = checkReturnLines(order, p.items);
    if (!checked.ok) return { success: false, error: checked.code, errorCode: checked.code };
    const { lines, refundAmount } = checked;

    const returnRecord = await db.$transaction(async (tx) => {
      const ret = await tx.orderReturn.create({
        data: {
          returnNumber: nextReturnNumber(),
          orderId: p.orderId,
          reason: p.reason,
          refundAmount,
          refundMethod: p.refundMethod,
          notes: p.notes || null,
          status: "PENDING",
          items: {
            create: lines.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              price: it.price,
            })),
          },
        },
      });
      return ret;
    });

    await logAction("CREATE_RETURN", {
      returnId: returnRecord.id,
      orderId: p.orderId,
      source: "customer",
    });
    revalidatePath("/admin/orders");
    revalidatePath("/account/orders");
    revalidatePath(`/account/orders/${p.orderId}`);
    return { success: true, returnId: returnRecord.id };
  } catch (e) {
    console.error("submitCustomerOrderReturn:", e);
    return { success: false, error: e.message || "Failed", errorCode: "SERVER" };
  }
}
