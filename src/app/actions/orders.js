"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAction } from "@/lib/audit";
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
  price: z.coerce.number().positive(),
});

const returnSchema = z.object({
  orderId: z.string().min(1, { message: "RETURN_ORDER_ID" }),
  reason: z.string().min(2, { message: "RETURN_REASON" }).max(2000),
  refundMethod: z.enum(["CASH", "BANK_TRANSFER", "STORE_CREDIT"]),
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
      include: { items: { include: { product: true } } },
    });
    if (!order) return { success: false, error: "Order not found" };

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
    await ensureAdminOrManager();

    const returnRecord = await db.orderReturn.findUnique({
      where: { id: returnId },
      include: { items: true },
    });
    if (!returnRecord) return { success: false, error: "Return not found" };
    if (returnRecord.status !== "PENDING") {
      return { success: false, error: "Return is not pending" };
    }

    await db.$transaction(async (tx) => {
      for (const item of returnRecord.items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
        if (result.count === 0) throw new Error(`Product ${item.productId} not found`);
      }

      await tx.orderReturn.update({
        where: { id: returnId },
        data: { status: "APPROVED", processedAt: new Date() },
      });
    });

    await logAction("APPROVE_RETURN", { returnId });
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (error) {
    console.error("approveOrderReturn:", error);
    return { success: false, error: error.message };
  }
}

export async function rejectOrderReturn(returnId, reason) {
  try {
    await ensureAdminOrManager();
    await db.orderReturn.update({
      where: { id: returnId },
      data: { status: "REJECTED", notes: reason || null, processedAt: new Date() },
    });
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
