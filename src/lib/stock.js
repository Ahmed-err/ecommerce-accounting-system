import { createAdminBroadcastNotification } from "@/lib/notifications";

// Every stock change goes through changeStock so the movement log explains the current
// stock (A-28). Reasons: SALE, POS, CANCEL, RETURN, REFUND, RECEIVE, ISSUE, ADJUST,
// OPENING, PURCHASE.

export class StockError extends Error {
  constructor(productId) {
    super("insufficient_stock");
    this.name = "StockError";
    this.productId = productId;
  }
}

/**
 * Change one product's stock inside a transaction and record the movement.
 * A decrease only happens when enough stock is left; otherwise StockError is thrown.
 * Returns null for a zero change.
 */
export async function changeStock(
  tx,
  { productId, delta, reason, userId = null, supplierId = null, purchaseId = null, unitCost, notes = null }
) {
  const qty = Math.abs(Math.trunc(Number(delta) || 0));
  if (qty === 0) return null;
  const isIn = delta > 0;

  let product;
  try {
    product = await tx.product.update({
      where: isIn ? { id: productId } : { id: productId, stock: { gte: qty } },
      data: { stock: isIn ? { increment: qty } : { decrement: qty } },
      select: { id: true, name: true, stock: true, minStock: true, purchasePrice: true },
    });
  } catch (error) {
    if (!isIn && error?.code === "P2025") throw new StockError(productId);
    throw error;
  }

  await tx.stockMovement.create({
    data: {
      type: isIn ? "IN" : "OUT",
      quantity: qty,
      productId,
      userId,
      supplierId,
      purchaseId,
      unitCost: isIn ? (unitCost ?? product.purchasePrice ?? null) : null,
      reason,
      notes,
    },
  });

  const before = product.stock - (isIn ? qty : -qty);
  return {
    productId,
    name: product.name,
    stock: product.stock,
    crossedLow: before > product.minStock && product.stock <= product.minStock,
  };
}

/** Send a low-stock alert for each change that crossed the minimum. Call after the transaction. */
export async function notifyLowStock(results) {
  for (const r of results || []) {
    if (!r?.crossedLow) continue;
    await createAdminBroadcastNotification({
      type: "LOW_STOCK",
      titleAr: "تنبيه مخزون منخفض",
      titleEn: "Low stock alert",
      bodyAr: `المنتج ${r.name} وصل إلى مخزون منخفض (${r.stock}).`,
      bodyEn: `Product ${r.name} reached low stock (${r.stock}).`,
      link: "/admin/inventory?status=low",
    }).catch(() => null);
  }
}
