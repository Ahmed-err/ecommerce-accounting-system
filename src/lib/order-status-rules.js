// Who may move an order between statuses. No database access, so the orders screen can
// import it in the browser; the effects of a move live in order-workflow.js.
// Owner rules (2026-10-14): cashiers cancel only pending orders; admins and managers cancel
// anything not yet delivered and may reinstate a cancelled order. A delivered order changes
// only through a return.

export const ORDER_FLOW = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"];
const MANAGERS = ["ADMIN", "MANAGER"];

export function canMoveStatus(role, from, to) {
  if (!["ADMIN", "MANAGER", "CASHIER", "SUPPORT"].includes(role) || from === to) return false;
  const isManager = MANAGERS.includes(role);
  if (from === "DELIVERED") return false;
  if (from === "CANCELLED") return isManager && to === "PENDING";
  if (to === "CANCELLED") return from === "PENDING" || isManager;
  const a = ORDER_FLOW.indexOf(from);
  const b = ORDER_FLOW.indexOf(to);
  if (a < 0 || b < 0) return false;
  // Forward for everyone; managers may also step back to fix a mistake.
  return b > a || isManager;
}

export function allowedStatusMoves(role, from) {
  return [...ORDER_FLOW, "CANCELLED"].filter((to) => canMoveStatus(role, from, to));
}
