"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAction } from "@/lib/audit";
import { createAdminBroadcastNotification } from "@/lib/notifications";

async function ensureStaff() {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER", "CASHIER"].includes(session.user.role)) {
    throw new Error("Unauthorized: Only staff can use POS.");
  }
  return session.user;
}

export async function getProductStock() {
  try {
    await ensureStaff();
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        stock: true,
        sellingPrice: true,
        isActive: true,
      },
    });
    
    return products.map(p => ({
      id: p.id,
      stock: Number(p.stock ?? 0),
      sellingPrice: typeof p.sellingPrice?.toNumber === "function" 
        ? p.sellingPrice.toNumber() 
        : Number(p.sellingPrice),
      isActive: p.isActive,
    }));
  } catch (error) {
    console.error("Failed to fetch product stock:", error);
    return [];
  }
}

export async function createPOSOrder(cartItems, paymentDetails) {
  try {
    const staff = await ensureStaff();

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return { success: false, error: "Cart is empty." };
    }

    const order = await prisma.$transaction(async (tx) => {
      const productIds = cartItems.map(item => item.id);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: { id: true, stock: true, sellingPrice: true, name: true },
      });

      const productMap = new Map(dbProducts.map(p => [p.id, p]));

      let totalAmount = 0;
      const validatedItems = [];

      for (const item of cartItems) {
        const product = productMap.get(item.id);
        if (!product) {
          throw new Error(`Product ${item.id} not found or inactive.`);
        }
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`);
        }
        const price = typeof product.sellingPrice?.toNumber === "function"
          ? product.sellingPrice.toNumber()
          : Number(product.sellingPrice);
        totalAmount += price * item.quantity;
        validatedItems.push({ id: item.id, quantity: item.quantity, price });
      }

      const finalTotalAmount = totalAmount - (paymentDetails.discountAmount || 0);

      const newOrder = await tx.order.create({
        data: {
          status: "DELIVERED",
          totalAmount: finalTotalAmount,
          paymentMethod: paymentDetails.paymentMethod,
          guestName: paymentDetails.customerName || "Walk-in Customer",
          guestPhone: paymentDetails.customerPhone || "-",
          guestCity: "POS Station",
          guestAddress: "Local Store",
          items: {
            create: validatedItems.map(item => ({
              productId: item.id,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
      });

      for (const item of validatedItems) {
        await tx.product.update({
          where: { id: item.id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.invoice.create({
        data: {
          invoiceNumber: `POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          orderId: newOrder.id,
          totalAmount: finalTotalAmount,
          taxAmount: paymentDetails.taxAmount || 0,
          discountAmount: paymentDetails.discountAmount || 0,
        }
      });

      await tx.transaction.create({
        data: {
          type: "INCOMING",
          amount: finalTotalAmount,
          description: `POS Sale - Order ${newOrder.id}`,
          category: "Sales",
          reference: newOrder.id,
        }
      });

      return newOrder;
    });

    await logAction("POS_SALE", { orderId: order.id, staffId: staff.id });
    await createAdminBroadcastNotification({
      type: "NEW_ORDER",
      titleAr: "طلب جديد من نقطة البيع",
      titleEn: "New POS order",
      bodyAr: `تم إنشاء طلب جديد برقم ${order.id.slice(-8).toUpperCase()}.`,
      bodyEn: `A new POS order was created: ${order.id.slice(-8).toUpperCase()}.`,
      link: `/admin/orders`,
    });

    revalidatePath("/pos");
    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("POS Order Error:", error);
    return { success: false, error: error.message };
  }
}
