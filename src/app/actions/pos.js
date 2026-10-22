"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { logAction } from "@/lib/audit";
import { createAdminBroadcastNotification } from "@/lib/notifications";
import { emitAlert } from "@/lib/monitoring";
import { changeStock, notifyLowStock, StockError } from "@/lib/stock";
import { isPosPaymentMethod, priceSale, PosPricingError } from "@/lib/pos-pricing";
import { cachedQuery } from "@/lib/cached-query";
import { CACHE_TTL, TAGS } from "@/lib/cache-tags";

async function ensureStaff() {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER", "CASHIER"].includes(session.user.role)) {
    throw new Error("Unauthorized: Only staff can use POS.");
  }
  return session.user;
}

// Stock list every POS tablet polls. Cached and cleared the moment any product row changes
// (a sale on another tablet, an online order, a stock receipt), so idle tablets polling it do
// not keep the database awake. A sale never trusts it: createPOSOrder re-reads stock and
// prices inside its transaction.
const loadProductStock = cachedQuery(
  async () => {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        stock: true,
        sellingPrice: true,
        isActive: true,
      },
    });
    return products.map((p) => ({
      id: p.id,
      stock: Number(p.stock ?? 0),
      sellingPrice: typeof p.sellingPrice?.toNumber === "function" ? p.sellingPrice.toNumber() : Number(p.sellingPrice),
      isActive: p.isActive,
    }));
  },
  ["pos-product-stock-v1"],
  { tags: [TAGS.stock], revalidate: CACHE_TTL.stock }
);

export async function getProductStock() {
  try {
    await ensureStaff();
    return await loadProductStock();
  } catch (error) {
    console.error("Failed to fetch product stock:", error);
    return [];
  }
}

// The screen fills the name box with "walk-in"; that isn't a debtor's name.
const WALK_IN_NAMES = ["Walk-in Customer", "عميل مباشر"];

// Error codes the screen translates (pos_error_<code>); anything else is shown as is.
class PosSaleError extends Error {
  constructor(code, detail) {
    super(code);
    this.code = code;
    this.detail = detail;
  }
}

/**
 * `cartItems`: [{ id, quantity }]. `paymentDetails`: { paymentMethod, discountType, discountValue,
 * customerName, customerPhone }. Prices, discount and total are worked out here from the DB.
 */
export async function createPOSOrder(cartItems, paymentDetails = {}) {
  try {
    const staff = await ensureStaff();
    const stockChanges = [];

    if (!Array.isArray(cartItems) || cartItems.length === 0) throw new PosSaleError("EMPTY");
    const { paymentMethod, discountType = "fixed", discountValue = 0 } = paymentDetails;
    if (!isPosPaymentMethod(paymentMethod)) throw new PosSaleError("BAD_PAYMENT");
    // Pay later: we must know who owes the money (owner, 2026-10-15).
    const payLater = paymentMethod === "CREDIT";
    const customerName = String(paymentDetails.customerName || "").trim();
    const customerPhone = String(paymentDetails.customerPhone || "").trim();
    const namedCustomer = customerName.length >= 2 && !WALK_IN_NAMES.includes(customerName);
    if (payLater && (!namedCustomer || customerPhone.replace(/\D/g, "").length < 7)) {
      throw new PosSaleError("CREDIT_NEEDS_CUSTOMER");
    }

    const order = await prisma.$transaction(async (tx) => {
      const productIds = cartItems.map(item => item.id);
      const dbProducts = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        select: {
          id: true, stock: true, sellingPrice: true, purchasePrice: true, name: true, nameAr: true, nameEn: true, sku: true,
        },
      });

      const productMap = new Map(dbProducts.map(p => [p.id, p]));
      const validatedItems = [];

      for (const item of cartItems) {
        const product = productMap.get(item.id);
        if (!product) throw new PosSaleError("UNAVAILABLE", item.id);
        if (Number.isInteger(item.quantity) && product.stock < item.quantity) {
          throw new PosSaleError("NO_STOCK", product.nameAr || product.name);
        }
        const price = typeof product.sellingPrice?.toNumber === "function"
          ? product.sellingPrice.toNumber()
          : Number(product.sellingPrice);
        if (!(price > 0)) throw new PosSaleError("ZERO_PRICE", product.nameAr || product.name);
        validatedItems.push({ id: item.id, quantity: item.quantity, price, unitCost: product.purchasePrice ?? null });
      }

      const { discount: discountAmount, total: finalTotalAmount } = priceSale({
        lines: validatedItems,
        role: staff.role,
        discountType,
        discountValue,
      });

      const newOrder = await tx.order.create({
        data: {
          status: "DELIVERED",
          deliveredAt: new Date(),
          totalAmount: finalTotalAmount,
          paymentMethod,
          guestName: paymentDetails.customerName || "Walk-in Customer",
          guestPhone: paymentDetails.customerPhone || "-",
          guestCity: "POS Station",
          guestAddress: "Local Store",
          items: {
            create: validatedItems.map(item => ({
              productId: item.id,
              quantity: item.quantity,
              price: item.price,
              unitCost: item.unitCost,
            })),
          },
        },
      });

      for (const item of validatedItems) {
        try {
          stockChanges.push(
            await changeStock(tx, {
              productId: item.id,
              delta: -item.quantity,
              reason: "POS",
              userId: staff.id,
              notes: `#${newOrder.id.slice(-8).toUpperCase()}`,
            })
          );
        } catch (e) {
          if (!(e instanceof StockError)) throw e;
          const p = productMap.get(item.id);
          throw new PosSaleError("NO_STOCK", p?.nameAr || p?.name || item.id);
        }
      }

      const inv = await tx.invoice.create({
        data: {
          invoiceNumber: `POS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          orderId: newOrder.id,
          totalAmount: finalTotalAmount,
          taxAmount: 0,
          discountAmount,
        }
      });

      if (payLater) {
        // No cash yet: the sale becomes a receivable, booked as cash when marked paid.
        await tx.ledgerInvoice.create({
          data: {
            invoiceNumber: `DEBT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
            direction: "RECEIVABLE",
            partyName: customerName,
            partyPhone: customerPhone,
            orderId: newOrder.id,
            amount: finalTotalAmount,
            notes: `POS #${newOrder.id.slice(-8).toUpperCase()}`,
            status: "PENDING",
          },
        });
      } else {
        await tx.transaction.create({
          data: {
            type: "INCOMING",
            amount: finalTotalAmount,
            description: `POS Sale - Order ${newOrder.id}`,
            category: "Sales",
            reference: newOrder.id,
            source: "POS",
            sourceId: newOrder.id,
            paymentMethod,
          }
        });
      }

      const itemsForReceipt = validatedItems.map((item) => {
        const p = productMap.get(item.id);
        const fallback = p?.name || "Item";
        return {
          name: fallback,
          nameAr: p?.nameAr || fallback,
          nameEn: p?.nameEn || fallback,
          sku: p?.sku || "",
          qty: item.quantity,
          unitPrice: item.price,
          subtotal: item.price * item.quantity,
        };
      });

      return {
        newOrder,
        receipt: {
          orderId: newOrder.id,
          createdAt: newOrder.createdAt.toISOString(),
          invoiceNumber: inv.invoiceNumber,
          paymentMethod,
          guestName: paymentDetails.customerName || "",
          guestPhone: paymentDetails.customerPhone || "",
          totalAmount: finalTotalAmount,
          taxAmount: 0,
          discountAmount,
          items: itemsForReceipt,
        },
      };
    });

    await logAction("POS_SALE", { orderId: order.newOrder.id, staffId: staff.id });
    await createAdminBroadcastNotification({
      type: "NEW_ORDER",
      titleAr: "طلب جديد من نقطة البيع",
      titleEn: "New POS order",
      bodyAr: `تم إنشاء طلب جديد برقم ${order.newOrder.id.slice(-8).toUpperCase()}.`,
      bodyEn: `A new POS order was created: ${order.newOrder.id.slice(-8).toUpperCase()}.`,
      link: `/admin/orders`,
    });

    await notifyLowStock(stockChanges);
    revalidatePath("/pos");
    revalidatePath("/admin/inventory");
    emitAlert("pos_checkout_success", { orderId: order.newOrder.id, staffId: staff.id }).catch(() => {});
    return { success: true, orderId: order.newOrder.id, receipt: order.receipt };
  } catch (error) {
    const known = error instanceof PosSaleError || error instanceof PosPricingError;
    if (!known) console.error("POS Order Error:", error);
    const message = error instanceof Error ? error.message : "POS order failed.";
    emitAlert("pos_checkout_failure", { error: message || "pos_order_error" }).catch(() => {});
    return known
      ? { success: false, code: error.code, detail: error.detail ?? null, error: message }
      : { success: false, error: message || "POS order failed." };
  }
}
