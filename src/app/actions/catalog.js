"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import QRCode from "qrcode";
import { PAYMENT_METHODS, SUDAN_CITIES } from "@/lib/constants";
import { translations } from "@/lib/translations";

async function ensureStaff() {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER", "CASHIER"].includes(session.user.role)) {
    throw new Error("Unauthorized: Only Staff can access administrative order data.");
  }
}

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
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return { success: false, error: "Cart is empty." };
    }

    const session = await auth();
    const role = session?.user?.role || "GUEST";
    const effectiveUserId = session?.user?.id ?? null;
    const isCustomerCheckout = role === "CUSTOMER" || role === "GUEST";

    const allowedPaymentMethodIds = new Set(PAYMENT_METHODS.map((m) => m.id));
    const normalizedPaymentMethod =
      typeof guestInfo?.paymentMethod === "string" &&
      allowedPaymentMethodIds.has(guestInfo.paymentMethod)
        ? guestInfo.paymentMethod
        : "CASH_ON_DELIVERY";

    const guest = guestInfo || {};

    // Normalize cart items and hard-validate quantity.
    const normalizedCart = new Map(); // productId -> quantity
    if (cartItems.length > 200) {
      return { success: false, error: "Cart is too large." };
    }

    for (const rawItem of cartItems) {
      const productId = typeof rawItem?.id === "string" ? rawItem.id : null;
      const name = typeof rawItem?.name === "string" ? rawItem.name : "Unknown";
      const qtyRaw =
        typeof rawItem?.quantity === "number" ? rawItem.quantity : Number(rawItem?.quantity);

      if (!productId || !productId.trim()) {
        return { success: false, error: "Invalid cart product." };
      }
      if (!Number.isInteger(qtyRaw) || qtyRaw <= 0) {
        return { success: false, error: `Invalid quantity for "${name}".` };
      }

      const prev = normalizedCart.get(productId) || 0;
      normalizedCart.set(productId, prev + qtyRaw);
    }

    if (normalizedCart.size === 0) {
      return { success: false, error: "Cart is empty." };
    }

    // Shipping policy:
    // - Customers/Guests: derive shipping from SUDAN_CITIES (never trust shippingCost from client).
    // - Staff/POS: shipping is 0 (POS UI currently treats it as local walk-in).
    const normalizedCity = typeof guest.city === "string" ? guest.city.trim() : "";
    const cityRate =
      SUDAN_CITIES.find(
        (c) => c.name === normalizedCity || c.arName === normalizedCity
      )?.rate ?? null;

    if (isCustomerCheckout) {
      // Store checkout rules
      const phoneNormalized = typeof guest.phone === "string" ? guest.phone.replace(/\s/g, "") : "";
      if (!guest.name || !guest.address || !normalizedCity || !guest.phone) {
        return { success: false, error: "Missing required guest information." };
      }
      if (!/^09\d{8}$/.test(phoneNormalized)) {
        return { success: false, error: "Invalid phone number format." };
      }
      if (typeof guest.address !== "string" || guest.address.trim().length < 10) {
        return { success: false, error: "Invalid delivery address." };
      }
      if (cityRate === null) {
        return { success: false, error: "Invalid city selected." };
      }
    }

    const shippingCharge = isCustomerCheckout ? cityRate : 0;

    // Invoice Data: number outside transaction (simple uniqueness).
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    // Create order + items + invoice + atomically decrement stock in a transaction
    const { order, invoice, totals } = await db.$transaction(
      async (tx) => {
        // Validate all products and stock atomically within the transaction
        let totalItemsAmount = 0;
        const validatedItems = [];

        for (const [productId, quantity] of normalizedCart.entries()) {
          const product = await tx.$queryRaw`
            SELECT id, name, stock, "sellingPrice" FROM "Product"
            WHERE id = ${productId} AND "isActive" = true
            FOR UPDATE
          `;

          if (!product || product.length === 0) {
            throw new Error(`Product no longer exists or is not available.`);
          }

          const prod = product[0];
          if (prod.stock < quantity) {
            throw new Error(
              `Not enough stock for "${prod.name}". Available: ${prod.stock}, Requested: ${quantity}`
            );
          }

          validatedItems.push({
            productId: prod.id,
            productName: prod.name,
            quantity,
            price: prod.sellingPrice,
          });

          totalItemsAmount += prod.sellingPrice * quantity;
        }

        const taxAmount = totalItemsAmount * 0.15;
        const grandTotal = totalItemsAmount + shippingCharge + taxAmount;

        const newOrder = await tx.order.create({
          data: {
            userId: effectiveUserId,
            totalAmount: grandTotal,
            status: "PENDING",
            guestEmail: guest.email || null,
            guestName: guest.name || null,
            guestPhone: guest?.phoneAlt
              ? `${guest.phone} / ${guest.phoneAlt}`
              : guest.phone || null,
            guestAddress: guest.address || null,
            guestCity: guest.city || null,
            shippingCost: shippingCharge,
            paymentMethod: normalizedPaymentMethod,
            isVerified: false,
            items: {
              create: validatedItems.map((vi) => ({
                productId: vi.productId,
                quantity: vi.quantity,
                price: vi.price,
              })),
            },
            invoice: {
              create: {
                invoiceNumber,
                totalAmount: grandTotal,
                taxAmount,
                qrCode: null,
              },
            },
          },
          include: {
            invoice: true,
          },
        });

        // Atomically decrement stock using raw SQL for guaranteed atomicity
        for (const vi of validatedItems) {
          const result = await tx.$executeRaw`
            UPDATE "Product"
            SET stock = stock - ${vi.quantity}
            WHERE id = ${vi.productId} AND stock >= ${vi.quantity}
          `;

          if (result === 0) {
            throw new Error(
              `Out of stock during checkout for ${vi.productName}. Please try again.`
            );
          }
        }

        // Create INCOMING transaction
        const proofText = guest?.transferScreenshotUrl
          ? ` | Proof: ${guest.transferScreenshotUrl}`
          : "";
        await tx.transaction.create({
          data: {
            type: "INCOMING",
            amount: grandTotal,
            description: `Order #${newOrder.id.slice(-8).toUpperCase()} (Buyer: ${
              guest?.name || effectiveUserId
            }) - Via ${normalizedPaymentMethod}${proofText}`,
            category: "Sales",
            reference: newOrder.id,
            date: new Date(),
          },
        });

        return {
          order: newOrder,
          invoice: newOrder.invoice,
          totals: { totalItemsAmount, shippingCharge, taxAmount, grandTotal },
        };
      },
      {
        // Transaction options: higher isolation level and longer timeout
        isolationLevel: "Serializable",
        maxWait: 10000,
        timeout: 20000,
      }
    );

    revalidatePath("/admin");
    revalidatePath("/admin/accounting");
    revalidatePath("/products");

    // Generate QR code after transaction succeeds (doesn't affect stock integrity).
    const { grandTotal, taxAmount } = totals;
    const sellerName = translations.en.brandName;
    const qrData = `Seller: ${sellerName}\nVAT: 310123456700003\nDate: ${new Date().toISOString()}\nTotal: ${grandTotal.toFixed(
      2
    )} SDG\nTax: ${taxAmount.toFixed(2)} SDG`;

    let qrCodeBase64 = null;
    try {
      qrCodeBase64 = await QRCode.toDataURL(qrData);
    } catch (err) {
      console.error("QR Code generation failed:", err);
    }

    if (qrCodeBase64 && invoice?.orderId) {
      // Invoice uses a unique orderId; update by orderId for simplicity.
      await db.invoice.update({
        where: { orderId: invoice.orderId },
        data: { qrCode: qrCodeBase64 },
      });
    }

    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("Failed to place order:", error);
    return { success: false, error: error.message };
  }
}

export async function getUserOrders(userId) {
  try {
    if (!userId) return [];
    
    // Security check: Only match current user
    const session = await auth();
    if (!session || (session.user.id !== userId && session.user.role !== 'ADMIN')) {
       throw new Error("Unauthorized: Access denied.");
    }

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

export async function getAllOrders({ search = "", status = "all", page = 1, limit = 20 } = {}) {
  try {
    await ensureStaff();
    const where = {
      ...(status !== "all" ? { status } : {}),
      ...(search ? {
        OR: [
          { guestName: { contains: search, mode: "insensitive" } },
          { guestPhone: { contains: search, mode: "insensitive" } },
          { id: { contains: search, mode: "insensitive" } },
        ]
      } : {}),
    };
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      db.order.findMany({
        where,
        include: {
          user: true,
          items: { include: { product: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.order.count({ where }),
    ]);
    return { orders, total };
  } catch (error) {
    console.error("Failed to fetch all orders:", error);
    return { orders: [], total: 0 };
  }
}

export async function updateOrderStatus(orderId, newStatus) {
  try {
    await ensureStaff();
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return { success: false, error: "Order not found" };
    const oldStatus = order.status;

    // No actual change
    if (oldStatus === newStatus) return { success: true };

    await db.$transaction(async (tx) => {
      // 1. Update order status
      await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      });

      // 2. Handle CANCELLATION (Coming FROM any status TO CANCELLED)
      if (newStatus === "CANCELLED" && oldStatus !== "CANCELLED") {
        // Increment stock back
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }

        // Create reversing OUTGOING transaction
        await tx.transaction.create({
          data: {
            type: "OUTGOING",
            amount: order.totalAmount,
            description: `Order Cancellation Reversal - #${order.id.slice(-8).toUpperCase()}`,
            category: "Sales Reversal",
            reference: order.id,
            date: new Date(),
          },
        });
      }

      // 3. Handle REINSTATED (Moving AWAY from CANCELLED to anything else)
      if (oldStatus === "CANCELLED" && newStatus !== "CANCELLED") {
        // Atomically check and decrement stock for each item
        for (const item of order.items) {
          // Lock product row and check stock
          const productRows = await tx.$queryRaw`
            SELECT id, name, stock FROM "Product" 
            WHERE id = ${item.productId} 
            FOR UPDATE
          `;
          
          if (!productRows || productRows.length === 0) {
            throw new Error(`Product not found for order item.`);
          }
          
          const product = productRows[0];
          if (product.stock < item.quantity) {
             throw new Error(`Insufficient stock to reinstate order for "${product.name}". Available: ${product.stock}, Required: ${item.quantity}`);
          }
          
          // Atomic decrement
          const result = await tx.$executeRaw`
            UPDATE "Product" 
            SET stock = stock - ${item.quantity} 
            WHERE id = ${item.productId} AND stock >= ${item.quantity}
          `;
          
          if (result === 0) {
            throw new Error(`Stock changed during reinstatement. Please refresh and try again.`);
          }
        }

        // Re-create INCOMING transaction
        await tx.transaction.create({
          data: {
            type: "INCOMING",
            amount: order.totalAmount,
            description: `Order Reinstated - #${order.id.slice(-8).toUpperCase()}`,
            category: "Sales",
            reference: order.id,
            date: new Date(),
          },
        });
      }
    }, {
      // Transaction isolation level to prevent race conditions
      isolationLevel: 'Serializable'
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin/accounting");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Failed to update order workflow:", error);
    return { success: false, error: error.message };
  }
}

