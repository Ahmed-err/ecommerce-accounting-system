/**
 * Human-readable labels for dashboard / audit log entries (client-safe).
 */

export function parseAuditDetails(details) {
  if (details == null || details === "") return {};
  if (typeof details === "object" && details !== null && !Array.isArray(details)) return details;
  const s = String(details).trim();
  try {
    const j = JSON.parse(s);
    return typeof j === "object" && j !== null && !Array.isArray(j) ? j : {};
  } catch {
    return { _raw: s };
  }
}

function orderRef(id) {
  if (!id || typeof id !== "string") return "";
  return `#${id.slice(-8).toUpperCase()}`;
}

function numish(v) {
  if (v == null) return null;
  if (typeof v === "object" && v !== null && typeof v.toNumber === "function") return v.toNumber();
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function joinFields(parts, isAr) {
  const sep = isAr ? " · " : " · ";
  return parts.filter(Boolean).join(sep);
}

function formatGeneric(o, isAr) {
  if (o._raw) return o._raw;
  const skip = new Set(["s", "e", "d"]);
  const parts = [];
  for (const [key, val] of Object.entries(o)) {
    if (val == null || val === "" || skip.has(key)) continue;
    if (Array.isArray(val)) {
      parts.push(`${key}: ${val.join(", ")}`);
      continue;
    }
    if (typeof val === "object") {
      parts.push(`${key}: ${JSON.stringify(val)}`);
      continue;
    }
    let display = val;
    if (typeof val === "string" && val.length >= 20 && /^c[a-z0-9]{20,}$/i.test(val)) {
      display = orderRef(val).replace(/^#/, "…");
    }
    parts.push(`${display}`);
  }
  if (!parts.length) return "";
  return parts.join(isAr ? "، " : ", ");
}

const TITLES = {
  en: {
    POS_SALE: "POS sale completed",
    CREATE_PRODUCT: "Product created",
    UPDATE_PRODUCT: "Product updated",
    BULK_DELETE_PRODUCTS: "Products deleted (bulk)",
    BULK_CATEGORY_PRODUCTS: "Products recategorized (bulk)",
    STOCK_RECEIVE: "Stock received",
    STOCK_ISSUE: "Stock issued",
    UPDATE_PRODUCT_ORIGIN: "Product origin updated",
    BULK_CLASSIFY_PRODUCT_ORIGIN: "Product origins updated (bulk)",
    CREATE_RETURN: "Return request created",
    APPROVE_RETURN: "Return approved",
    REJECT_RETURN: "Return rejected",
    UPDATE_ORDER: "Order updated",
    PROCESS_REFUND: "Refund processed",
    CREATE_TRANSACTION: "Accounting transaction added",
    UPDATE_TRANSACTION: "Accounting transaction updated",
    DELETE_TRANSACTION: "Accounting transaction deleted",
    BULK_DELETE_TRANSACTIONS: "Accounting transactions deleted (bulk)",
    CREATE_LEDGER_INVOICE: "Ledger invoice created",
    MARK_LEDGER_PAID: "Ledger invoice marked paid",
    CREATE_EMPLOYEE: "Employee created",
    UPDATE_EMPLOYEE: "Employee updated",
    DELETE_EMPLOYEE: "Employee deactivated",
    CREATE_ATTENDANCE: "Attendance recorded",
    UPDATE_ATTENDANCE: "Attendance updated",
    CREATE_SALARY: "Salary record saved",
    MARK_SALARY_PAID: "Salary marked paid",
    CREATE_LEAVE: "Leave request created",
    APPROVE_LEAVE: "Leave approved",
    REJECT_LEAVE: "Leave rejected",
  },
  ar: {
    POS_SALE: "بيع نقطة بيع",
    CREATE_PRODUCT: "إضافة منتج",
    UPDATE_PRODUCT: "تحديث منتج",
    BULK_DELETE_PRODUCTS: "حذف منتجات (جماعي)",
    BULK_CATEGORY_PRODUCTS: "تغيير تصنيف منتجات (جماعي)",
    STOCK_RECEIVE: "استلام مخزون",
    STOCK_ISSUE: "صرف مخزون",
    UPDATE_PRODUCT_ORIGIN: "تحديث منشأ المنتج",
    BULK_CLASSIFY_PRODUCT_ORIGIN: "تصنيف منشأ المنتجات (جماعي)",
    CREATE_RETURN: "طلب إرجاع جديد",
    APPROVE_RETURN: "قبول الإرجاع",
    REJECT_RETURN: "رفض الإرجاع",
    UPDATE_ORDER: "تحديث طلب",
    PROCESS_REFUND: "معالجة استرداد",
    CREATE_TRANSACTION: "إضافة حركة محاسبية",
    UPDATE_TRANSACTION: "تحديث حركة محاسبية",
    DELETE_TRANSACTION: "حذف حركة محاسبية",
    BULK_DELETE_TRANSACTIONS: "حذف حركات محاسبية (جماعي)",
    CREATE_LEDGER_INVOICE: "إنشاء فاتورة دفتر",
    MARK_LEDGER_PAID: "تسجيل فاتورة كمدفوعة",
    CREATE_EMPLOYEE: "إضافة موظف",
    UPDATE_EMPLOYEE: "تحديث بيانات موظف",
    DELETE_EMPLOYEE: "تعطيل موظف",
    CREATE_ATTENDANCE: "تسجيل حضور",
    UPDATE_ATTENDANCE: "تحديث حضور",
    CREATE_SALARY: "تسجيل راتب",
    MARK_SALARY_PAID: "تسجيل راتب كمدفوع",
    CREATE_LEAVE: "طلب إجازة",
    APPROVE_LEAVE: "قبول إجازة",
    REJECT_LEAVE: "رفض إجازة",
  },
};

function buildSubtitle(action, o, isAr) {
  switch (action) {
    case "POS_SALE":
      return isAr
        ? `طلب ${orderRef(o.orderId)}${o.staffId ? ` · موظف ${orderRef(o.staffId)}` : ""}`
        : `Order ${orderRef(o.orderId)}${o.staffId ? ` · Staff ${orderRef(o.staffId)}` : ""}`;
    case "CREATE_PRODUCT":
    case "UPDATE_PRODUCT":
      return o.name ? String(o.name) : o.productId ? orderRef(o.productId) : "";
    case "BULK_DELETE_PRODUCTS":
    case "BULK_CLASSIFY_PRODUCT_ORIGIN":
    case "BULK_DELETE_TRANSACTIONS":
      return o.count != null ? (isAr ? `${o.count} عنصر` : `${o.count} items`) : "";
    case "BULK_CATEGORY_PRODUCTS":
      return joinFields(
        [
          o.count != null ? (isAr ? `${o.count} منتج` : `${o.count} products`) : "",
          o.categoryId ? (isAr ? `تصنيف ${orderRef(o.categoryId)}` : `Category ${orderRef(o.categoryId)}`) : "",
        ],
        isAr
      );
    case "STOCK_RECEIVE":
    case "STOCK_ISSUE": {
      const q = o.quantity != null ? `±${o.quantity}` : "";
      return joinFields([q, o.productId ? orderRef(o.productId) : ""], isAr);
    }
    case "UPDATE_PRODUCT_ORIGIN":
      return o.origin ? String(o.origin) : "";
    case "CREATE_RETURN":
      return joinFields([orderRef(o.orderId), o.returnId ? orderRef(o.returnId) : ""], isAr);
    case "APPROVE_RETURN":
    case "REJECT_RETURN":
      return o.returnId ? orderRef(o.returnId) : "";
    case "UPDATE_ORDER":
      return joinFields(
        [o.orderId ? orderRef(o.orderId) : "", Array.isArray(o.updatedFields) ? o.updatedFields.join(", ") : ""],
        isAr
      );
    case "PROCESS_REFUND":
      return joinFields(
        [
          o.orderId ? orderRef(o.orderId) : "",
          o.amount != null ? String(o.amount) : "",
          o.reason ? String(o.reason) : "",
        ],
        isAr
      );
    case "CREATE_TRANSACTION": {
      const amt = numish(o.amount);
      const type = o.type ? String(o.type) : "";
      return joinFields([type, amt != null ? amt.toLocaleString(isAr ? "ar-SD" : "en-US") : "", o.transactionId ? orderRef(o.transactionId) : ""], isAr);
    }
    case "UPDATE_TRANSACTION": {
      const amt = numish(o.amount);
      return joinFields([amt != null ? amt.toLocaleString(isAr ? "ar-SD" : "en-US") : "", o.transactionId ? orderRef(o.transactionId) : ""], isAr);
    }
    case "DELETE_TRANSACTION":
      return o.transactionId ? orderRef(o.transactionId) : "";
    case "CREATE_LEDGER_INVOICE":
    case "MARK_LEDGER_PAID":
      return o.id ? orderRef(o.id) : "";
    case "CREATE_EMPLOYEE":
      return joinFields([o.name ? String(o.name) : "", o.role ? String(o.role) : ""], isAr);
    case "UPDATE_EMPLOYEE":
      return joinFields(
        [o.employeeId ? orderRef(o.employeeId) : "", Array.isArray(o.updatedFields) ? o.updatedFields.join(", ") : ""],
        isAr
      );
    case "DELETE_EMPLOYEE":
      return o.employeeId ? orderRef(o.employeeId) : "";
    case "CREATE_ATTENDANCE":
    case "UPDATE_ATTENDANCE":
      return joinFields([o.userId ? orderRef(o.userId) : "", o.attendanceId ? orderRef(o.attendanceId) : ""], isAr);
    case "CREATE_SALARY":
    case "MARK_SALARY_PAID":
      return joinFields([o.userId ? orderRef(o.userId) : "", o.salaryId ? orderRef(o.salaryId) : ""], isAr);
    case "CREATE_LEAVE":
    case "APPROVE_LEAVE":
    case "REJECT_LEAVE":
      return joinFields([o.userId ? orderRef(o.userId) : "", o.leaveId ? orderRef(o.leaveId) : ""], isAr);
    default:
      return formatGeneric(o, isAr);
  }
}

function activityHref(action, o) {
  if (action === "POS_SALE" && o.orderId) return `/admin/orders/${o.orderId}`;
  if (action === "UPDATE_ORDER" && o.orderId) return `/admin/orders/${o.orderId}`;
  if (action === "PROCESS_REFUND" && o.orderId) return `/admin/orders/${o.orderId}`;
  if ((action === "CREATE_RETURN" || action === "APPROVE_RETURN" || action === "REJECT_RETURN") && o.orderId) {
    return `/admin/orders/${o.orderId}`;
  }
  if (
    (action === "CREATE_PRODUCT" || action === "UPDATE_PRODUCT" || action === "STOCK_RECEIVE" || action === "STOCK_ISSUE") &&
    o.productId
  ) {
    return "/admin/inventory";
  }
  if (action === "CREATE_TRANSACTION" && o.transactionId) return `/admin/accounting`;
  return null;
}

/**
 * @param {string} action
 * @param {string | object | null} details
 * @param {string} lang "ar" | "en"
 */
export function formatAuditActivityForDashboard(action, details, lang) {
  const isAr = lang === "ar";
  const bucket = isAr ? TITLES.ar : TITLES.en;
  const o = parseAuditDetails(details);
  const title = bucket[action] || String(action || "Activity").replace(/_/g, " ");
  const subtitle = buildSubtitle(action, o, isAr);
  const href = activityHref(action, o);
  return { title, subtitle: subtitle || null, href };
}
