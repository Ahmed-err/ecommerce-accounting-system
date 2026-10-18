import { changeStock, StockError } from "@/lib/stock";
import { bookOrderCash, reverseOrderCash } from "@/lib/ledger";

// Stock and ledger effects of order status changes, shared by staff status changes, account
// closure and returns. Who may make a move: order-status-rules.js.

export { ORDER_FLOW, canMoveStatus, allowedStatusMoves } from "@/lib/order-status-rules";

export const RETURN_WINDOW_DAYS = 14;
export const REFUND_METHODS = ["CASH", "BANK_TRANSFER"];

const ref = (id) => `#${String(id).slice(-8).toUpperCase()}`;
const num = (v) => (typeof v?.toNumber === "function" ? v.toNumber() : Number(v || 0));

/** Quantities and money already given back through approved returns. */
export async function approvedReturns(tx, orderId) {
  const rows = await tx.orderReturn.findMany({
    where: { orderId, status: "APPROVED" },
    select: { refundAmount: true, items: { select: { productId: true, quantity: true } } },
  });
  const qty = new Map();
  let refunded = 0;
  for (const r of rows) {
    refunded += num(r.refundAmount);
    for (const it of r.items) qty.set(it.productId, (qty.get(it.productId) || 0) + it.quantity);
  }
  return { qty, refunded };
}

export class OrderStatusError extends Error {
  constructor(code) {
    super(code);
    this.name = "OrderStatusError";
    this.code = code;
  }
}

/**
 * Move an order to `to` inside a transaction. The status is updated only if it is still
 * `order.status`, so two clicks can't cancel (and restock) twice. Delivering books the money;
 * cancelling puts back the stock not already returned and reverses the money booked, less
 * refunds; reinstating takes the stock again. Returns the stock changes for low-stock alerts.
 */
export async function applyStatusChange(tx, { order, to, userId = null }) {
  const from = order.status;
  const moved = await tx.order.updateMany({
    where: { id: order.id, status: from },
    data: { status: to, ...(to === "DELIVERED" ? { deliveredAt: new Date() } : {}) },
  });
  if (moved.count === 0) throw new OrderStatusError("status_changed");

  // Money enters the cash book on delivery (owner, 2026-10-15).
  if (to === "DELIVERED") await bookOrderCash(tx, order);

  const stockChanges = [];
  const cancelling = to === "CANCELLED";
  const reinstating = from === "CANCELLED";
  if (!cancelling && !reinstating) return stockChanges;

  const { qty: returned, refunded } = await approvedReturns(tx, order.id);
  for (const item of order.items) {
    const open = item.quantity - (returned.get(item.productId) || 0);
    if (open <= 0) continue;
    try {
      stockChanges.push(
        await changeStock(tx, {
          productId: item.productId,
          delta: cancelling ? open : -open,
          reason: cancelling ? "CANCEL" : "SALE",
          userId,
          notes: ref(order.id),
        })
      );
    } catch (e) {
      if (e instanceof StockError) throw new OrderStatusError("insufficient_stock");
      throw e;
    }
  }

  // A reinstated order goes back to PENDING; its money is booked again when it is delivered.
  if (cancelling) await reverseOrderCash(tx, order, refunded);
  return stockChanges;
}

/** Start of the return window: delivery date, or last update for orders delivered before it was recorded. */
export function returnWindowOpen(order, now = Date.now()) {
  if (order.status !== "DELIVERED") return false;
  const since = new Date(order.deliveredAt || order.updatedAt).getTime();
  return now - since <= RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Share of the list price the customer actually paid for the items: a coupon or POS discount is
 * spread over every line, delivery is not refunded. 1 when the order has no total loaded.
 */
function paidShare(order) {
  if (order.totalAmount == null) return 1;
  const listed = order.items.reduce((s, it) => s + it.quantity * num(it.price), 0);
  if (listed <= 0) return 1;
  const paidForItems = num(order.totalAmount) - num(order.shippingCost);
  return Math.min(1, Math.max(0, paidForItems / listed));
}

/**
 * Check requested return lines against the order. Prices always come from the order line
 * (refund scaled by what was paid, see paidShare);
 * quantities are capped at ordered minus already returned (pending and approved returns).
 * `order.items` and `order.returns[].items` must be loaded.
 */
export function checkReturnLines(order, lines) {
  const taken = new Map();
  for (const r of order.returns || []) {
    if (!["PENDING", "APPROVED"].includes(r.status)) continue;
    for (const it of r.items || []) taken.set(it.productId, (taken.get(it.productId) || 0) + it.quantity);
  }
  const byProduct = new Map(order.items.map((it) => [it.productId, it]));
  const out = [];
  for (const req of lines) {
    const line = byProduct.get(req.productId);
    if (!line) return { ok: false, code: "RETURN_INVALID_PRODUCT" };
    const qty = Math.trunc(Number(req.quantity) || 0);
    if (qty <= 0) continue;
    if (qty > line.quantity - (taken.get(req.productId) || 0)) return { ok: false, code: "RETURN_QTY_EXCEEDS" };
    out.push({ productId: req.productId, quantity: qty, price: num(line.price) });
  }
  if (!out.length) return { ok: false, code: "RETURN_NO_ITEMS" };
  const listed = out.reduce((s, it) => s + it.quantity * it.price, 0);
  const refundAmount = Math.round(listed * paidShare(order) * 100) / 100;
  return { ok: true, lines: out, refundAmount };
}
