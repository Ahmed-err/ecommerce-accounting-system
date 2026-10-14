"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAction } from "@/lib/audit";
import { changeStock } from "@/lib/stock";
import { checkReturnLines, REFUND_METHODS } from "@/lib/order-workflow";
import { z } from "zod";

async function ensureStaff() {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER", "CASHIER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

async function ensureAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin only");
  }
  return session;
}

async function ensureAdminOrManager() {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

const returnItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  // Ignored: the price always comes from the order line.
  price: z.coerce.number().optional(),
});

const returnSchema = z.object({
  orderId: z.string().min(1, { message: "RETURN_ORDER_ID" }),
  reason: z.string().min(2, { message: "RETURN_REASON" }).max(2000),
  refundMethod: z.enum(REFUND_METHODS),
  notes: z.string().max(2000).optional().nullable(),
  items: z.array(returnItemSchema).min(1, { message: "RETURN_NO_ITEMS" }),
});

function returnValidationResult(zodError) {
  const iss = zodError?.issues?.[0];
  if (!iss) return { error: "Validation failed", errorCode: "VALIDATION" };
  const msg = typeof iss.message === "string" && iss.message.startsWith("RETURN_") ? iss.message : null;
  if (msg) return { error: iss.message, errorCode: msg };
  const path0 = iss.path[0];
  if (path0 === "items") {
    if (iss.code === "too_small") return { error: "RETURN_NO_ITEMS", errorCode: "RETURN_NO_ITEMS" };
    const idx = iss.path[1];
    if (typeof idx === "number") return { error: iss.message, errorCode: "RETURN_LINE_INVALID" };
  }
  if (path0 === "reason") return { error: iss.message, errorCode: "RETURN_REASON" };
  if (path0 === "orderId") return { error: iss.message, errorCode: "RETURN_ORDER_ID" };
  if (path0 === "refundMethod") return { error: iss.message, errorCode: "RETURN_REFUND_METHOD" };
  return { error: iss.message, errorCode: "VALIDATION" };
}

function nextReturnNumber() {
  return `RET-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export async function getOrdersTabData(tab, query = {}) {
  try {
    await ensureStaff();

    const {
      listOrders,
      getOrderStatusKpis,
      getPosDailySummary,
      listReturns,
      getOrderReports,
      serializeOrderForClient,
      serializeReturnForClient,
      serializeTopCustomerRow,
    } = await import("@/lib/orders");

    switch (tab) {
      case "all": {
        const { orders, total } = await listOrders({
          search: query.search,
          status: query.status,
          source: query.source || "all",
          paymentMethod: query.paymentMethod || "all",
          page: query.page ? parseInt(query.page) : 1,
          limit: 20,
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
        });
        const kpis = await getOrderStatusKpis();
        return {
          ok: true,
          tab,
          orders: orders.map(serializeOrderForClient),
          total,
          kpis,
        };
      }
      case "store": {
        const { orders, total } = await listOrders({
          search: query.search,
          status: query.status,
          source: "store",
          paymentMethod: query.paymentMethod || "all",
          page: query.page ? parseInt(query.page) : 1,
          limit: 20,
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
        });
        return { ok: true, tab, orders: orders.map(serializeOrderForClient), total };
      }
      case "pos": {
        const [{ orders, total }, summary] = await Promise.all([
          listOrders({
            search: query.search,
            status: query.status,
            source: "pos",
            paymentMethod: query.paymentMethod || "all",
            page: query.page ? parseInt(query.page) : 1,
            limit: 20,
            dateFrom: query.dateFrom,
            dateTo: query.dateTo,
          }),
          getPosDailySummary(query.dateFrom),
        ]);
        return {
          ok: true,
          tab,
          orders: orders.map(serializeOrderForClient),
          total,
          summary,
        };
      }
      case "returns": {
        const returns = await listReturns({
          status: query.status || "all",
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
        });
        return { ok: true, tab, returns: returns.map(serializeReturnForClient) };
      }
      case "reports": {
        const reports = await getOrderReports({
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
        });
        return {
          ok: true,
          tab,
          statusPie: reports.statusPie,
          storeRev: reports.storeRev,
          posRev: reports.posRev,
          topCustomers: reports.topCustomers.map(serializeTopCustomerRow),
          returnsCount: reports.returnsCount,
          range: reports.range,
        };
      }
      default:
        return { ok: false, error: "unknown_tab" };
    }
  } catch (error) {
    console.error("getOrdersTabData:", error);
    return { ok: false, error: error.message };
  }
}

export async function createOrderReturn(raw) {
  try {
    await ensureStaff();
    const parsed = returnSchema.safeParse(raw);
    if (!parsed.success) {
      const { error, errorCode } = returnValidationResult(parsed.error);
      return { success: false, error, errorCode };
    }
    const p = parsed.data;

    const order = await db.order.findUnique({
      where: { id: p.orderId },
      include: { items: true, returns: { include: { items: true } } },
    });
    if (!order) return { success: false, error: "Order not found" };
    if (order.status === "CANCELLED") {
      return { success: false, error: "RETURN_ORDER_CANCELLED", errorCode: "RETURN_ORDER_CANCELLED" };
    }
    // Only delivered goods come back; an undelivered order is cancelled instead.
    if (order.status !== "DELIVERED") {
      return { success: false, error: "RETURN_NOT_DELIVERED", errorCode: "RETURN_NOT_DELIVERED" };
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

    await logAction("CREATE_RETURN", { returnId: returnRecord.id, orderId: p.orderId });
    revalidatePath("/admin/orders");
    return { success: true, return: returnRecord };
  } catch (error) {
    console.error("createOrderReturn:", error);
    return { success: false, error: error.message };
  }
}

export async function approveOrderReturn(returnId) {
  try {
    const session = await ensureAdminOrManager();

    const returnRecord = await db.orderReturn.findUnique({
      where: { id: returnId },
      include: { items: true, order: { include: { items: true, returns: { include: { items: true } } } } },
    });
    if (!returnRecord) return { success: false, error: "Return not found" };
    if (returnRecord.status !== "PENDING") {
      return { success: false, error: "Return is not pending" };
    }
    const order = returnRecord.order;
    if (order.status === "CANCELLED") {
      return { success: false, error: "RETURN_ORDER_CANCELLED", errorCode: "RETURN_ORDER_CANCELLED" };
    }
    // Only returns already approved count against this one (A-25).
    const checked = checkReturnLines(
      { ...order, returns: order.returns.filter((r) => r.status === "APPROVED") },
      returnRecord.items
    );
    if (!checked.ok) return { success: false, error: checked.code, errorCode: checked.code };

    const orderRef = `#${order.id.slice(-8).toUpperCase()}`;
    await db.$transaction(async (tx) => {
      const claimed = await tx.orderReturn.updateMany({
        where: { id: returnId, status: "PENDING" },
        data: { status: "APPROVED", processedAt: new Date() },
      });
      if (claimed.count === 0) throw new Error("Return is not pending");

      for (const item of returnRecord.items) {
        await changeStock(tx, {
          productId: item.productId,
          delta: item.quantity,
          reason: "RETURN",
          userId: session.user.id,
          notes: orderRef,
        });
      }

      // The refund is booked when the return is approved (owner, 2026-10-14).
      // Returns opened before refunds followed the amount paid may hold a higher figure.
      const amount = Math.min(Number(returnRecord.refundAmount), checked.refundAmount);
      if (amount > 0) {
        await tx.transaction.create({
          data: {
            type: "OUTGOING",
            amount,
            description: `Refund ${returnRecord.returnNumber} - ${orderRef} (${returnRecord.refundMethod})`,
            category: "Refund",
            reference: order.id,
            date: new Date(),
          },
        });
      }
    });

    await logAction("APPROVE_RETURN", { returnId });
    revalidatePath("/admin/orders");
    revalidatePath("/admin/accounting");
    revalidatePath("/admin/inventory");
    return { success: true };
  } catch (error) {
    console.error("approveOrderReturn:", error);
    return { success: false, error: error.message };
  }
}

export async function rejectOrderReturn(returnId, reason) {
  try {
    await ensureAdminOrManager();
    // An approved return already moved stock and money; it can't be rejected afterwards.
    const res = await db.orderReturn.updateMany({
      where: { id: returnId, status: "PENDING" },
      data: { status: "REJECTED", notes: reason || null, processedAt: new Date() },
    });
    if (res.count === 0) return { success: false, error: "Return is not pending" };
    await logAction("REJECT_RETURN", { returnId });
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateOrderStatusAction(orderId, status) {
  try {
    await ensureStaff();
    const { updateOrderStatus } = await import("@/app/actions/catalog");
    const res = await updateOrderStatus(orderId, status);
    revalidatePath("/admin/orders");
    return res;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getOrderItems(orderId) {
  try {
    await ensureStaff();
    const { n: toNum } = await import("@/lib/orders");
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, sellingPrice: true, images: true } },
          },
        },
      },
    });
    const items = order?.items || [];
    return items.map((it) => ({
      id: it.id,
      quantity: it.quantity,
      price: toNum(it.price),
      productId: it.productId,
      orderId: it.orderId,
      product: it.product
        ? {
            id: it.product.id,
            name: it.product.name,
            sku: it.product.sku,
            images: it.product.images,
            sellingPrice: toNum(it.product.sellingPrice),
          }
        : null,
    }));
  } catch (error) {
    return [];
  }
}
