"use server";

import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import { z } from "zod";

const returnItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  price: z.coerce.number().positive(),
});

const customerReturnSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(2).max(2000),
  refundMethod: z.enum(["CASH", "BANK_TRANSFER", "STORE_CREDIT"]),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(returnItemSchema).min(1),
});

function nextReturnNumber() {
  return `RET-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

const RETURN_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

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
      include: { items: true, returns: { where: { status: "PENDING" } } },
    });
    if (!order) {
      return { success: false, error: "Order not found", errorCode: "NOT_FOUND" };
    }
    if (order.status !== "DELIVERED") {
      return { success: false, error: "RETURN_NOT_DELIVERED", errorCode: "RETURN_NOT_DELIVERED" };
    }
    if (Date.now() - new Date(order.updatedAt).getTime() > RETURN_WINDOW_MS) {
      return { success: false, error: "RETURN_WINDOW_CLOSED", errorCode: "RETURN_WINDOW_CLOSED" };
    }
    if (order.returns?.length > 0) {
      return { success: false, error: "RETURN_PENDING_EXISTS", errorCode: "RETURN_PENDING_EXISTS" };
    }

    const lineByProduct = new Map(order.items.map((it) => [it.productId, it]));
    for (const req of p.items) {
      const line = lineByProduct.get(req.productId);
      if (!line) {
        return { success: false, error: "RETURN_INVALID_PRODUCT", errorCode: "RETURN_INVALID_PRODUCT" };
      }
      if (req.quantity > line.quantity) {
        return { success: false, error: "RETURN_QTY_EXCEEDS", errorCode: "RETURN_QTY_EXCEEDS" };
      }
      const linePrice = typeof line.price?.toNumber === "function" ? line.price.toNumber() : Number(line.price);
      if (Math.abs(req.price - linePrice) > 0.02) {
        return { success: false, error: "RETURN_PRICE_MISMATCH", errorCode: "RETURN_PRICE_MISMATCH" };
      }
    }

    const refundAmount = p.items.reduce((s, it) => s + it.quantity * it.price, 0);

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
            create: p.items.map((it) => ({
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
