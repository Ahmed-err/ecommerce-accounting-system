"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import QRCode from "qrcode";
import { PAYMENT_METHODS, SUDAN_CITIES, CHECKOUT_TAX_RATE } from "@/lib/constants";
import { translations } from "@/lib/translations";
import { serializeCatalogProduct } from "@/lib/catalog-serialize";
import { createAdminBroadcastNotification, createNotification } from "@/lib/notifications";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { emitAlert } from "@/lib/monitoring";

async function ensureStaff() {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER", "CASHIER"].includes(session.user.role)) {
    throw new Error("Unauthorized: Only Staff can access administrative order data.");
  }
}

export async function getCatalogPriceBounds() {
  try {
    const agg = await db.product.aggregate({
      where: { isActive: true },
      _min: { sellingPrice: true },
      _max: { sellingPrice: true },
    });
    return {
      min: Number(agg._min.sellingPrice ?? 0),
      max: Number(agg._max.sellingPrice ?? 0),
    };
  } catch {
    return { min: 0, max: 0 };
  }
}

export async function getCatalogProductsByIds(ids) {
  try {
    const clean = Array.isArray(ids) ? ids.filter(Boolean).slice(0, 12) : [];
    if (clean.length === 0) return [];
    const products = await db.product.findMany({
      where: { id: { in: clean }, isActive: true },
      include: { category: true },
    });
    const order = new Map(clean.map((id, i) => [id, i]));
    return products
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      .map(serializeCatalogProduct);
  } catch (e) {
    console.error("getCatalogProductsByIds:", e);
    return [];
  }
}

export async function getCatalogProducts({
  search = "",
  category = "",
  sort = "newest",
  page = 1,
  limit = 12,
  minPrice,
  maxPrice,
  inStockOnly,
} = {}) {
  try {
    const minP =
      minPrice !== undefined && minPrice !== "" && !Number.isNaN(Number(minPrice))
        ? Number(minPrice)
        : null;
    const maxP =
      maxPrice !== undefined && maxPrice !== "" && !Number.isNaN(Number(maxPrice))
        ? Number(maxPrice)
        : null;

    const priceFilter =
      minP !== null || maxP !== null
        ? {
            sellingPrice: {
              ...(minP !== null ? { gte: minP } : {}),
              ...(maxP !== null ? { lte: maxP } : {}),
            },
          }
        : {};

    const where = {
      isActive: true,
      ...priceFilter,
      ...(inStockOnly === true || inStockOnly === "true" || inStockOnly === "1"
        ? { stock: { gt: 0 } }
        : {}),
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

    let orderBy = { createdAt: "desc" };
    if (sort === "newest") orderBy = { createdAt: "desc" };
    else if (sort === "price_asc") orderBy = { sellingPrice: "asc" };
    else if (sort === "price_desc") orderBy = { sellingPrice: "desc" };
    else if (sort === "name_asc") orderBy = { name: "asc" };
    else if (sort === "stock_desc") orderBy = { stock: "desc" };
    else if (sort === "best_selling") {
      orderBy = { orderItems: { _count: "desc" } };
    } else if (sort === "top_rated") {
      orderBy = { stock: "desc" };
    }

    const skip = (page - 1) * limit;

    const runQuery = (ob) =>
      Promise.all([
        db.product.findMany({
          where,
          orderBy: ob,
          skip,
          take: limit,
          include: { category: true },
        }),
        db.product.count({ where }),
      ]);

    let products;
    let total;
    try {
      [products, total] = await runQuery(orderBy);
    } catch (e) {
      if (sort === "best_selling") {
        [products, total] = await runQuery({ stock: "desc" });
      } else {
        throw e;
      }
    }

    return {
      products: products.map(serializeCatalogProduct),
      total,
    };
  } catch (error) {
    console.error("Failed to fetch catalog products:", error);
    return { products: [], total: 0 };
  }
}

export async function getProductById(id) {
  try {
    const product = await db.product.findFirst({
      where: { id, isActive: true },
      include: { category: true },
    });
    return product ? serializeCatalogProduct(product) : null;
  } catch (error) {
    console.error("Failed to fetch product:", error);
    return null;
  }
}

export async function getMyOrderConfirmation(orderId) {
  try {
    const session = await auth();
    if (!session?.user?.id || !orderId) return null;
    const order = await db.order.findFirst({
      where: { id: orderId, userId: session.user.id },
      include: {
        items: { include: { product: true } },
      },
    });
    if (!order) return null;
    return {
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        price: Number(i.price),
        productName: i.product?.name || "",
      })),
    };
  } catch (e) {
    console.error("getMyOrderConfirmation:", e);
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
    const clientIp = await getClientIP();
    const rateAllowed = await checkRateLimit(`checkout:${clientIp}`, 8, 15 * 60 * 1000, { failClosed: false });
    if (!rateAllowed) {
      return { success: false, error: "Too many checkout attempts. Please try again later." };
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return { success: false, error: "Cart is empty." };
    }

    const session = await auth();
    const role = session?.user?.role || "GUEST";
    let effectiveUserId =
      typeof session?.user?.id === "string" && session.user.id.trim() ? session.user.id.trim() : null;

    if (effectiveUserId) {
      const dbUser = await db.user.findUnique({
        where: { id: effectiveUserId },
        select: { id: true },
      });
      if (!dbUser) {
        if (role === "CUSTOMER") {
          return {
            success: false,
            error:
              "Your session is out of date. Please sign out and sign in again, then retry checkout.",
          };
        }
        effectiveUserId = null;
      }
    }

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

    const rawCoupon =
      typeof guest.couponCode === "string" ? guest.couponCode.trim().toUpperCase() : "";
    let couponRecord = null;
    if (rawCoupon) {
      couponRecord = await db.coupon.findFirst({
        where: { code: rawCoupon, isActive: true },
      });
      if (!couponRecord || (couponRecord.expiresAt && couponRecord.expiresAt < new Date())) {
        return { success: false, error: "Invalid or expired coupon code." };
      }
      if (couponRecord.percentOff < 1 || couponRecord.percentOff > 100) {
        return { success: false, error: "Invalid coupon configuration." };
      }
    }

    const notesSanitized =
      typeof guest.orderNotes === "string"
        ? guest.orderNotes.trim().slice(0, 2000)
        : "";

    // Invoice Data: number outside transaction (simple uniqueness).
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    // Create order + items + invoice + atomically decrement stock in a transaction
    const { order, invoice, totals } = await db.$transaction(
      async (tx) => {
        // Validate all products and stock atomically within the transaction
        let totalItemsAmount = 0;
        const validatedItems = [];

        for (const [productId, quantity] of normalizedCart.entries()) {
          const rows = await tx.$queryRaw`
            SELECT id, name, stock, "sellingPrice" FROM "Product"
            WHERE id = ${productId} AND "isActive" = true
            FOR UPDATE
          `;

          if (!rows || rows.length === 0) {
            throw new Error(`Product no longer exists or is not available.`);
          }

          const prod = rows[0];
          const stock = Number(prod.stock);
          if (!Number.isFinite(stock) || stock < quantity) {
            throw new Error(
              `Not enough stock for "${prod.name}". Available: ${Number.isFinite(stock) ? stock : 0}, Requested: ${quantity}`
            );
          }

          const unitPrice = Number(prod.sellingPrice);
          if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new Error(`Invalid price for "${prod.name}".`);
          }
          validatedItems.push({
            productId: prod.id,
            productName: prod.name,
            quantity,
            price: prod.sellingPrice,
          });

          totalItemsAmount += unitPrice * quantity;
        }

        totalItemsAmount = Math.round(totalItemsAmount * 100) / 100;

        let discountAmount = 0;
        if (couponRecord) {
          discountAmount = Math.min(
            totalItemsAmount,
            Math.round(totalItemsAmount * (couponRecord.percentOff / 100) * 100) / 100
          );
        }

        const afterDiscount = Math.round((totalItemsAmount - discountAmount) * 100) / 100;
        const taxAmount = Math.round(afterDiscount * CHECKOUT_TAX_RATE * 100) / 100;
        const grandTotal =
          Math.round((afterDiscount + Number(shippingCharge) + taxAmount) * 100) / 100;

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
            customerNotes: notesSanitized || null,
            couponCode: couponRecord ? rawCoupon : null,
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
                discountAmount,
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

          if (Number(result) === 0) {
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
          totals: {
            totalItemsAmount,
            discountAmount,
            shippingCharge,
            taxAmount,
            grandTotal,
          },
        };
      },
      {
        // RepeatableRead + row locks reduces serialization failures vs Serializable (Neon / concurrent traffic).
        isolationLevel: "RepeatableRead",
        maxWait: 10000,
        timeout: 20000,
      }
    );

    try {
      revalidatePath("/admin");
      revalidatePath("/admin/accounting");
      revalidatePath("/products");
    } catch (e) {
      console.error("revalidatePath after checkout:", e);
    }

    try {
      await createAdminBroadcastNotification({
        type: "NEW_ORDER",
        titleAr: "طلب جديد من المتجر",
        titleEn: "New store order",
        bodyAr: `تم استلام طلب جديد برقم ${order.id.slice(-8).toUpperCase()}.`,
        bodyEn: `New order received: ${order.id.slice(-8).toUpperCase()}.`,
        link: `/admin/orders`,
      });
    } catch (e) {
      console.error("createAdminBroadcastNotification after checkout:", e);
    }

    try {
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
        await db.invoice.update({
          where: { orderId: invoice.orderId },
          data: { qrCode: qrCodeBase64 },
        });
      }
    } catch (e) {
      console.error("Invoice QR update after checkout:", e);
    }

    emitAlert("checkout_success", {
      orderId: order.id,
      paymentMethod: normalizedPaymentMethod,
      userId: effectiveUserId,
      city: guest?.city || null,
    }).catch(() => {});
    return { success: true, orderId: order.id };
  } catch (error) {
    console.error("Failed to place order:", error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Checkout failed. Please try again.";
    emitAlert("checkout_failure", {
      error: message || "unknown_checkout_error",
      userId,
    }).catch(() => {});
    return { success: false, error: message || "Checkout failed. Please try again." };
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
    if (order.userId) {
      await createNotification({
        userId: order.userId,
        type: "ORDER_STATUS",
        titleAr: "تحديث حالة الطلب",
        titleEn: "Order status updated",
        bodyAr: `تم تحديث حالة طلبك ${order.id.slice(-8).toUpperCase()} إلى ${newStatus}.`,
        bodyEn: `Your order ${order.id.slice(-8).toUpperCase()} status is now ${newStatus}.`,
        link: `/account/orders/${order.id}`,
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to update order workflow:", error);
    return { success: false, error: error.message };
  }
}

