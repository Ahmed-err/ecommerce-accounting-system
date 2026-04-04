export const PERMISSION_MODULES = [
  "inventory",
  "cashier",
  "store",
  "accounting",
  "employees",
  "orders",
  "reports",
  "settings",
];

const TUPLE_ADMIN = [1, 1, 1, 1];

const ROLE_MATRIX = {
  ADMIN: {
    inventory: TUPLE_ADMIN,
    cashier: TUPLE_ADMIN,
    store: TUPLE_ADMIN,
    accounting: TUPLE_ADMIN,
    employees: TUPLE_ADMIN,
    orders: TUPLE_ADMIN,
    reports: TUPLE_ADMIN,
    settings: TUPLE_ADMIN,
  },
  MANAGER: {
    inventory: [1, 1, 1, 0],
    cashier: [1, 1, 1, 0],
    store: [1, 1, 1, 0],
    accounting: [1, 1, 1, 0],
    employees: [0, 0, 0, 0],
    orders: [1, 1, 1, 0],
    reports: [1, 0, 0, 0],
    settings: [1, 0, 0, 0],
  },
  CASHIER: {
    inventory: [1, 0, 0, 0],
    cashier: [1, 1, 1, 0],
    store: [1, 0, 0, 0],
    accounting: [0, 0, 0, 0],
    employees: [0, 0, 0, 0],
    orders: [1, 1, 0, 0],
    reports: [1, 0, 0, 0],
    settings: [0, 0, 0, 0],
  },
};

export function tupleToFlags(tuple) {
  const t = tuple || [0, 0, 0, 0];
  return {
    canView: !!t[0],
    canCreate: !!t[1],
    canEdit: !!t[2],
    canDelete: !!t[3],
  };
}

export function getDefaultPermissionFlags(role, moduleKey) {
  const r = String(role || "").toUpperCase();
  const mod = String(moduleKey || "").toLowerCase();
  if (r === "ADMIN") {
    return tupleToFlags(ROLE_MATRIX.ADMIN[mod] || TUPLE_ADMIN);
  }
  if (r === "MANAGER") {
    return tupleToFlags(ROLE_MATRIX.MANAGER[mod] || [0, 0, 0, 0]);
  }
  if (r === "CASHIER") {
    return tupleToFlags(ROLE_MATRIX.CASHIER[mod] || [0, 0, 0, 0]);
  }
  return { canView: false, canCreate: false, canEdit: false, canDelete: false };
}

export const PERM_LABELS_EN = {
  inventory: "Inventory",
  cashier: "Cashier/POS",
  store: "Store / dashboard",
  accounting: "Accounting",
  employees: "Employees",
  orders: "Orders",
  reports: "Reports",
  settings: "Settings",
};

export const PERM_LABELS_AR = {
  inventory: "المخزون",
  cashier: "نقطة البيع",
  store: "المتجر / لوحة التحكم",
  accounting: "المحاسبة",
  employees: "الموظفون",
  orders: "الطلبات",
  reports: "التقارير",
  settings: "الإعدادات",
};
