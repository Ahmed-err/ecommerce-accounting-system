// Customer-facing words for order codes, shared by the account pages and the bell.

export const ORDER_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

const STATUS_KEYS = {
  PENDING: "orderStatus_PENDING",
  PROCESSING: "orderStatus_PROCESSING",
  SHIPPED: "orderStatus_SHIPPED",
  DELIVERED: "orderStatus_DELIVERED",
  CANCELLED: "orderStatus_CANCELLED",
};

const PAYMENT_KEYS = {
  CASH_ON_DELIVERY: "paymentMethod_CASH_ON_DELIVERY",
  BANK_TRANSFER: "paymentMethod_BANK_TRANSFER",
  CASH: "paymentMethod_CASH",
  CARD: "paymentMethod_CARD",
};

const readable = (code) => String(code || "").replaceAll("_", " ");

export function orderStatusLabel(status, t) {
  return t[STATUS_KEYS[status]] || readable(status);
}

export function paymentMethodLabel(method, t) {
  return t[PAYMENT_KEYS[method]] || readable(method);
}

/** Short reference customers see, e.g. "EIZ5HPD2". Show it with a leading "#" in an LTR span. */
export function orderRef(id) {
  return String(id || "").slice(-8).toUpperCase();
}

export function orderStatusTone(status) {
  if (status === "DELIVERED") return "success";
  if (status === "CANCELLED") return "danger";
  if (status === "SHIPPED") return "info";
  if (status === "PENDING") return "warning";
  return "neutral";
}
