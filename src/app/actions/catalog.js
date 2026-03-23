"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getCatalogProducts({
  search = "",
  category = "",
  sort = "newest",
  page = 1,
  limit = 12,
} = {}) {
  try {
    const where = {
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(category && category !== "all"
        ? { category: { name: { equals: category, mode: "insensitive" } } }
        : {}),
    };

    const orderBy = {
      newest: { createdAt: "desc" },
      price_asc: { sellingPrice: "asc" },
      price_desc: { sellingPrice: "desc" },
      name_asc: { name: "asc" },
    }[sort] || { createdAt: "desc" };

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { category: true },
      }),
      db.product.count({ where }),
    ]);

    return { products, total };
  } catch (error) {
    console.error("Failed to fetch catalog products:", error);
    return { products: [], total: 0 };
  }
}

export async function getProductById(id) {
  try {
    const product = await db.product.findUnique({
      where: { id },
      include: { category: true },
    });
    return product;
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return null;
  }
}

export async function getCatalogCategories() {
  try {
    const categories = await db.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { products: true } },
      },
    });
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      image: c.image,
      productCount: c._count.products,
    }));
  } catch (error) {
    console.error("Failed to fetch catalog categories:", error);
    return [];
  }
}

export async function getFeaturedProducts(limit = 8) {
  try {
    const products = await db.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { category: true },
    });
    return products;
  } catch (error) {
    console.error("Failed to fetch featured products:", error);
    return [];
  }
}

export async function placeOrder(userId, cartItems, guestInfo = null) {
  try {
    // Guest must provide email/name/address/city if no userId
    if (!userId && (!guestInfo?.email || !guestInfo?.name || !guestInfo?.address || !guestInfo?.city)) {
      return { success: false, error: "Missing required guest information (Email, Name, Address, or City)." };
    }
    
    if (!cartItems || cartItems.length === 0) return { success: false, error: "Cart is empty." };

    // Validate stock and calculate items total
    let totalItemsAmount = 0;
    const validatedItems = [];

    for (const item of cartItems) {
      const product = await db.product.findUnique({ where: { id: item.id } });
      if (!product) return { success: false, error: `Product "${item.name}" no longer exists.` };
      if (product.stock < item.quantity) {
        return { success: false, error: `Not enough stock for "${product.name}". Available: ${product.stock}` };
      }
      validatedItems.push({ product, quantity: item.quantity });
      totalItemsAmount += product.sellingPrice * item.quantity;
    }

    const shippingCharge = guestInfo?.shippingCost || 0;
    const finalTotal = totalItemsAmount + shippingCharge;

    // Create order + items + decrement stock in a transaction
    const order = await db.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: userId || null,
          totalAmount: finalTotal,
          status: "PENDING",
          guestEmail: guestInfo?.email || null,
          guestName: guestInfo?.name || null,
          guestPhone: guestInfo?.phone || null,
          guestAddress: guestInfo?.address || null,
          guestCity: guestInfo?.city || null,
          shippingCost: shippingCharge,
          paymentMethod: guestInfo?.paymentMethod || "CASH_ON_DELIVERY",
          isVerified: false, // Default to false for manual confirmation
          items: {
            create: validatedItems.map((vi) => ({
              productId: vi.product.id,
              quantity: vi.quantity,
              price: vi.product.sellingPrice,
            })),
          },
        },
      });

      // Decrement stock
      for (const vi of validatedItems) {
        await tx.product.update({
          where: { id: vi.product.id },
          data: { stock: { decrement: vi.quantity } },
        });
      }

      // Create INCOMING transaction
      await tx.transaction.create({
        data: {
          type: "INCOMING",
          amount: finalTotal,
          description: `Order #${newOrder.id.slice(-8).toUpperCase()} (Buyer: ${guestInfo?.name || userId}) - Via ${guestInfo?.paymentMethod || 'COD'}`,
          category: "Sales",
          reference: newOrder.id,
          date: new Date(),
        },
      });

      return newOrder;
    });

    revalidatePath("/admin");
    revalidatePath("/admin/accounting");
    revalidatePath("/products");

    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("Failed to place order:", error);
    return { success: false, error: error.message };
  }
}

export async function getUserOrders(userId) {
  try {
    if (!userId) return [];
    
    const orders = await db.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return orders;
  } catch (error) {
    console.error("Failed to fetch user orders:", error);
    return [];
  }
}

