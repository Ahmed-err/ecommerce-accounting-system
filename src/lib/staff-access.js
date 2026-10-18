// Who can open which staff page. The proxy, the admin pages and the sidebar all read this,
// and it matches the role checks in the server actions. Fixed in code (owner, 2026-10-12).

export const STAFF_ROLES = ["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT", "SUPPORT"];
// Roles that work orders: change status, open returns. The accountant only reads them.
export const ORDER_DESK_ROLES = ["ADMIN", "MANAGER", "CASHIER", "SUPPORT"];

const ALL = STAFF_ROLES;
const TILL = ["ADMIN", "MANAGER", "CASHIER"];
const ADMIN_MANAGER = ["ADMIN", "MANAGER"];
const FINANCE = ["ADMIN", "MANAGER", "ACCOUNTANT"];
const CUSTOMER_CARE = ["ADMIN", "MANAGER", "SUPPORT"];
const ADMIN = ["ADMIN"];

// Order is the sidebar order. `labelKey` is the translation key for the area's name.
export const STAFF_AREAS = [
  { key: "dashboard", path: "/admin", exact: true, roles: FINANCE, labelKey: "adminDashboard" },
  { key: "pos", path: "/pos", roles: TILL, labelKey: "adminPos" },
  { key: "orders", path: "/admin/orders", roles: ALL, labelKey: "adminOrders" },
  { key: "reviews", path: "/admin/reviews", roles: CUSTOMER_CARE, labelKey: "adminReviews" },
  { key: "inventory", path: "/admin/inventory", roles: ["ADMIN", "MANAGER", "CASHIER", "ACCOUNTANT"], labelKey: "adminInventory" },
  { key: "suppliers", path: "/admin/suppliers", roles: FINANCE, labelKey: "adminSuppliers" },
  { key: "contacts", path: "/admin/contacts", roles: CUSTOMER_CARE, labelKey: "adminContacts" },
  { key: "notifications", path: "/admin/notifications", roles: CUSTOMER_CARE, labelKey: "adminNotifications" },
  { key: "coupons", path: "/admin/coupons", roles: ADMIN, labelKey: "adminCoupons" },
  { key: "employees", path: "/admin/employees", roles: ADMIN, labelKey: "adminEmployees" },
  { key: "accounting", path: "/admin/accounting", roles: ["ADMIN", "ACCOUNTANT"], labelKey: "adminAccounting" },
  { key: "settings", path: "/admin/settings", roles: ADMIN, labelKey: "adminSettings" },
];

export function isStaff(role) {
  return STAFF_ROLES.includes(role);
}

export function areaFor(pathname) {
  const path = String(pathname || "").replace(/\/+$/, "") || "/";
  return STAFF_AREAS.find((a) => (a.exact ? path === a.path : path === a.path || path.startsWith(`${a.path}/`)));
}

export function canOpen(role, pathname) {
  if (!isStaff(role)) return false;
  const area = areaFor(pathname);
  // A staff page not listed here is admin-only until it is added.
  return area ? area.roles.includes(role) : role === "ADMIN";
}

export function canOpenArea(role, key) {
  return !!STAFF_AREAS.find((a) => a.key === key)?.roles.includes(role);
}

export function staffHome(role) {
  if (role === "ADMIN" || role === "MANAGER" || role === "ACCOUNTANT") return "/admin";
  if (role === "CASHIER" || role === "SUPPORT") return "/admin/orders";
  return "/";
}

// Rows for the read-only "who can do what" table in settings.
export function accessTable() {
  return STAFF_AREAS.map((a) => ({
    key: a.key,
    labelKey: a.labelKey,
    ...Object.fromEntries(STAFF_ROLES.map((r) => [r, a.roles.includes(r)])),
  }));
}
