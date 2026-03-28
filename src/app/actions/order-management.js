"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAction } from "@/lib/audit";

async function ensureStaff() {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER", "CASHIER"].includes(session.user.role)) {
    throw new Error("Unauthorized: Only Staff can modify orders.");
  }
  return session.user;
}

/**
 * Update order details (shipping info)
 * Does not modify items or financial totals
 */
export async function updateOrderDetails(orderId, data) {
  try {
    await ensureStaff();
    
    const order = await db.order.findUnique({
      where: { id: orderId },
    });
    
    if (!order) {
      return { success: false, error: "Order not found" };
    }
    
    // Prevent editing delivered or cancelled orders
    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      return { success: false, error: "Cannot edit delivered or cancelled orders" };
    }

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        guestAddress: data.guestAddress,
        guestCity: data.guestCity,
        shippingCost: data.shippingCost ? parseFloat(data.shippingCost) : order.shippingCost,
      },
    });

    await logAction("UPDATE_ORDER", { orderId, updatedFields: Object.keys(data) });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    
    return { success: true, order: updatedOrder };
  } catch (error) {
    console.error("Failed to update order:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Process a partial or full refund for an order
 * Creates a refund transaction and optionally returns stock
 */
export async function processRefund(orderId, refundData) {
  try {
    const staff = await ensureStaff();
    
    const { amount, reason, returnStock = false, items = [] } = refundData;
    
    if (!amount || amount <= 0) {
      return { success: false, error: "Refund amount must be greater than 0" };
    }

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (parseFloat(amount) > order.totalAmount) {
      return { success: false, error: "Refund amount cannot exceed order total" };
    }

    // Process refund in transaction
    await db.$transaction(async (tx) => {
      // 1. Create OUTGOING transaction for the refund
      await tx.transaction.create({
        data: {
          type: "OUTGOING",
          amount: parseFloat(amount),
          description: `Refund for Order #${order.id.slice(-8).toUpperCase()} - ${reason || "No reason provided"} (processed by ${staff.name})`,
          category: "Refund",
          reference: order.id,
          date: new Date(),
        },
      });

      // 2. Return stock if requested
      if (returnStock && items.length > 0) {
        for (const item of items) {
          if (item.quantity > 0) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }

      // 3. No Order.notes in schema; represent refunds via ledger OUTGOING transaction.
    });

    await logAction("PROCESS_REFUND", { orderId, amount, reason, returnStock });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/accounting");
    revalidatePath(`/admin/orders/${orderId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to process refund:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get single order with full details for editing
 */
export async function getOrderForEdit(orderId) {
  try {
    await ensureStaff();
    
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        user: true,
        invoice: true,
      },
    });

    if (!order) return null;
    
    return order;
  } catch (error) {
    console.error("Failed to fetch order for edit:", error);
    return null;
  }
}
