// Cash-book rules (owner 2026-10-15). The cash book (Transaction) holds money actually
// received or paid: POS sales when made, store orders when delivered, refunds when approved,
// supplier and salary payments, and debts when marked paid. Profit is worked out from orders
// (see lib/accounting.js), so only running costs and salaries count as expenses there.

export const SALES = "Sales";
export const SALES_REVERSAL = "Sales Reversal";
export const REFUND = "Refund";

const num = (v) => (typeof v?.toNumber === "function" ? v.toNumber() : Number(v || 0));
const round2 = (n) => Math.round(n * 100) / 100;
const ref = (id) => `#${String(id).slice(-8).toUpperCase()}`;

// Rows the app wrote before `source` existed, recognised by their description.
const LEGACY_SYSTEM = [/^POS Sale\b/i, /^Order #/i, /^Order Cancellation/i, /^Order Reinstated/i, /^Refund RET-/i];

export function isSystemTransaction(tx) {
  if (tx?.source) return true;
  const d = String(tx?.description || "").trim();
  return LEGACY_SYSTEM.some((re) => re.test(d));
}

/** Only rows entered by hand can be edited or deleted. */
export function isEditableTransaction(tx) {
  return !!tx && !isSystemTransaction(tx);
}

const STOCK_CATEGORY = /inventory|purchase|stock|supplier/i;

/** Expenses that reduce profit: running costs and salaries. Stock is costed when it sells. */
export function isProfitExpense(tx) {
  if (tx?.type !== "OUTGOING") return false;
  if (tx.source === "SALARY") return true;
  if (tx.source) return false;
  const c = String(tx.category || "");
  if (c === SALES_REVERSAL || c === REFUND) return false;
  return !STOCK_CATEGORY.test(c);
}

/** Sales money held in the cash book for one order (sales minus reversals; refunds not included). */
export async function orderCashBooked(tx, orderId) {
  const rows = await tx.transaction.findMany({
    where: { reference: orderId, category: { in: [SALES, SALES_REVERSAL] } },
    select: { type: true, category: true, amount: true },
  });
  let net = 0;
  for (const r of rows) {
    if (r.category === SALES && r.type === "INCOMING") net += num(r.amount);
    if (r.category === SALES_REVERSAL && r.type === "OUTGOING") net -= num(r.amount);
  }
  return round2(net);
}

/** On delivery: book what the cash book doesn't hold yet (older orders were booked at checkout). */
export async function bookOrderCash(tx, order) {
  const due = round2(num(order.totalAmount) - (await orderCashBooked(tx, order.id)));
  if (due <= 0) return null;
  return tx.transaction.create({
    data: {
      type: "INCOMING",
      amount: due,
      description: `Order ${ref(order.id)} delivered - ${order.paymentMethod || "payment"}`,
      category: SALES,
      reference: order.id,
      source: "ORDER",
      sourceId: order.id,
      paymentMethod: order.paymentMethod || null,
      date: new Date(),
    },
  });
}

/** On cancel: give back the sales money booked for this order, less refunds already paid out. */
export async function reverseOrderCash(tx, order, refunded = 0) {
  const due = round2((await orderCashBooked(tx, order.id)) - num(refunded));
  if (due <= 0) return null;
  return tx.transaction.create({
    data: {
      type: "OUTGOING",
      amount: due,
      description: `Order Cancellation Reversal - ${ref(order.id)}`,
      category: SALES_REVERSAL,
      reference: order.id,
      source: "ORDER",
      sourceId: order.id,
      date: new Date(),
    },
  });
}

/** Money paid to a supplier (at purchase or later). Cash only: stock is costed when it sells. */
export function bookSupplierPayment(tx, { purchase, amount, method = null, by = null }) {
  if (!(num(amount) > 0)) return null;
  return tx.transaction.create({
    data: {
      type: "OUTGOING",
      amount: round2(num(amount)),
      // Managers can record these, so the row says who did.
      description: `Supplier payment - ${purchase.purchaseNumber}${by ? ` (by ${by})` : ""}`,
      category: "Supplier payment",
      reference: purchase.purchaseNumber,
      source: "SUPPLIER",
      sourceId: purchase.id,
      paymentMethod: method || purchase.paymentMethod || null,
      date: new Date(),
    },
  });
}

/** A salary paid out; counts as an expense in profit. */
export function bookSalaryPayment(tx, record) {
  if (!(num(record.netSalary) > 0)) return null;
  const period = `${record.year}-${String(record.month).padStart(2, "0")}`;
  return tx.transaction.create({
    data: {
      type: "OUTGOING",
      amount: round2(num(record.netSalary)),
      description: `Salary ${period}${record.user?.name ? ` - ${record.user.name}` : ""}`,
      category: "Salaries",
      reference: period,
      source: "SALARY",
      sourceId: record.id,
      date: new Date(),
    },
  });
}

/** A receivable collected or a payable paid (LedgerInvoice marked paid). */
export function bookDebtPayment(tx, invoice) {
  const incoming = invoice.direction === "RECEIVABLE";
  return tx.transaction.create({
    data: {
      type: incoming ? "INCOMING" : "OUTGOING",
      amount: round2(num(invoice.amount)),
      description: `${incoming ? "Debt collected" : "Bill paid"} - ${invoice.invoiceNumber} (${invoice.partyName})`,
      category: incoming ? "Debt collected" : "Bills",
      reference: invoice.orderId || invoice.invoiceNumber,
      source: "DEBT",
      sourceId: invoice.id,
      date: new Date(),
    },
  });
}
