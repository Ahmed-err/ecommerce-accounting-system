import { prisma as db } from "@/lib/prisma";

export function n(v) {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v?.toNumber === "function") return v.toNumber();
  return Number(v) || 0;
}

export function isPosSaleDescription(description) {
  const d = (description || "").trim();
  return d.startsWith("POS Sale");
}

export function revenueSourceFromTransaction(tx) {
  if (tx.type !== "INCOMING") return "other";
  if (isPosSaleDescription(tx.description)) return "pos";
  if ((tx.category || "").toLowerCase() === "sales") return "store";
  return "other";
}

const SALES_REVERSAL = "Sales Reversal";

export function isOperatingOutgoing(tx) {
  if (tx.type !== "OUTGOING") return false;
  const c = (tx.category || "").trim();
  return c !== SALES_REVERSAL;
}

export function isPurchaseOutgoing(tx) {
  if (tx.type !== "OUTGOING") return false;
  const c = (tx.category || "").toLowerCase();
  return /inventory|purchase|supplier|stock|supplies/.test(c);
}

export function isSystemGeneratedTransaction(tx) {
  const d = (tx.description || "").trim();
  if (/^POS Sale\b/i.test(d)) return true;
  if (/^Order #/i.test(d)) return true;
  if (/^Order Cancellation/i.test(d)) return true;
  if (/^Order Reinstated/i.test(d)) return true;
  return false;
}

export function resolveRange(preset, customFrom, customTo) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  let start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (preset === "custom" && customFrom && customTo) {
    const a = new Date(customFrom);
    const b = new Date(customTo);
    b.setHours(23, 59, 59, 999);
    a.setHours(0, 0, 0, 0);
    return { start: a, end: b };
  }

  if (preset === "today") {
    return { start, end };
  }
  if (preset === "week") {
    const day = start.getDay();
    const diff = (day + 6) % 7;
    start.setDate(start.getDate() - diff);
    return { start, end };
  }
  if (preset === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end };
  }
  start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start, end };
}

function prevPeriodSameLength(start, end) {
  const ms = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  prevEnd.setHours(23, 59, 59, 999);
  const prevStart = new Date(prevEnd.getTime() - ms);
  prevStart.setHours(0, 0, 0, 0);
  return { start: prevStart, end: prevEnd };
}

function pctChange(cur, prev) {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

export async function aggregateIncomingOutgoing({ start, end }) {
  const [incoming, outgoing] = await Promise.all([
    db.transaction.aggregate({
      where: {
        type: "INCOMING",
        date: { gte: start, lte: end },
      },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: {
        type: "OUTGOING",
        date: { gte: start, lte: end },
        NOT: { category: SALES_REVERSAL },
      },
      _sum: { amount: true },
    }),
  ]);
  return {
    revenue: n(incoming._sum.amount),
    expenses: n(outgoing._sum.amount),
  };
}

export async function getOpeningNetBalance(beforeDate) {
  const [incoming, outgoing] = await Promise.all([
    db.transaction.aggregate({
      where: { type: "INCOMING", date: { lt: beforeDate } },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: {
        type: "OUTGOING",
        date: { lt: beforeDate },
        NOT: { category: SALES_REVERSAL },
      },
      _sum: { amount: true },
    }),
  ]);
  return n(incoming._sum.amount) - n(outgoing._sum.amount);
}

/** Cumulative cash before date: all incoming minus all outgoing (incl. reversals). */
export async function getOpeningCashBalance(beforeDate) {
  const [incoming, outgoing] = await Promise.all([
    db.transaction.aggregate({
      where: { type: "INCOMING", date: { lt: beforeDate } },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { type: "OUTGOING", date: { lt: beforeDate } },
      _sum: { amount: true },
    }),
  ]);
  return n(incoming._sum.amount) - n(outgoing._sum.amount);
}

export async function getDashboardKpis({ start, end }) {
  const prev = prevPeriodSameLength(start, end);
  const [cur, prevAgg, openingCash, prevCashOpen] = await Promise.all([
    aggregateIncomingOutgoing({ start, end }),
    aggregateIncomingOutgoing(prev),
    getOpeningCashBalance(start),
    getOpeningCashBalance(prev.start),
  ]);
  const net = cur.revenue - cur.expenses;
  const prevNet = prevAgg.revenue - prevAgg.expenses;

  const [periodCashIn, periodCashOut, prevPeriodIn, prevPeriodOut] = await Promise.all([
    db.transaction.aggregate({
      where: { type: "INCOMING", date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { type: "OUTGOING", date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { type: "INCOMING", date: { gte: prev.start, lte: prev.end } },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: { type: "OUTGOING", date: { gte: prev.start, lte: prev.end } },
      _sum: { amount: true },
    }),
  ]);

  const cashIn = n(periodCashIn._sum.amount);
  const cashOut = n(periodCashOut._sum.amount);
  const closingCash = openingCash + cashIn - cashOut;

  const pIn = n(prevPeriodIn._sum.amount);
  const pOut = n(prevPeriodOut._sum.amount);
  const prevClosingCash = prevCashOpen + pIn - pOut;

  return {
    totalRevenue: cur.revenue,
    totalExpenses: cur.expenses,
    netProfit: net,
    cashBalance: closingCash,
    openingBalance: openingCash,
    closingBalance: closingCash,
    prev: {
      totalRevenue: prevAgg.revenue,
      totalExpenses: prevAgg.expenses,
      netProfit: prevNet,
      cashBalance: prevClosingCash,
    },
    delta: {
      revenuePct: pctChange(cur.revenue, prevAgg.revenue),
      expensesPct: pctChange(cur.expenses, prevAgg.expenses),
      netPct: pctChange(net, prevNet),
      cashPct: pctChange(closingCash, prevClosingCash),
    },
  };
}

export async function getRevenueStoreVsPosMonthly({ start, end }) {
  const rows = await db.transaction.findMany({
    where: {
      type: "INCOMING",
      date: { gte: start, lte: end },
    },
    select: { description: true, amount: true, date: true, category: true },
  });

  const buckets = new Map();
  for (const r of rows) {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!buckets.has(key)) buckets.set(key, { month: key, store: 0, pos: 0, other: 0 });
    const b = buckets.get(key);
    const src = revenueSourceFromTransaction(r);
    const amt = n(r.amount);
    if (src === "pos") b.pos += amt;
    else if (src === "store") b.store += amt;
    else b.other += amt;
  }

  return Array.from(buckets.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export async function getExpenseCategoryBreakdown({ start, end }) {
  const rows = await db.transaction.groupBy({
    by: ["category"],
    where: {
      type: "OUTGOING",
      date: { gte: start, lte: end },
      NOT: { category: SALES_REVERSAL },
    },
    _sum: { amount: true },
  });
  return rows
    .map((r) => ({ name: r.category || "Other", value: n(r._sum.amount) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
}

export async function getRecentUnifiedTransactions(limit = 10, { start, end } = {}) {
  const dateFilter =
    start && end
      ? {
          date: { gte: start, lte: end },
        }
      : {};

  const ledgerWhere =
    start && end ? { createdAt: { gte: start, lte: end } } : {};

  const [txs, ledger] = await Promise.all([
    db.transaction.findMany({
      where: dateFilter,
      orderBy: { date: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        category: true,
        reference: true,
        date: true,
        paymentMethod: true,
      },
    }),
    db.ledgerInvoice.findMany({
      where: ledgerWhere,
      orderBy: { createdAt: "desc" },
      take: Math.min(5, limit),
      select: {
        id: true,
        invoiceNumber: true,
        partyName: true,
        amount: true,
        direction: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const merged = [
    ...txs.map((t) => ({
      kind: "transaction",
      id: t.id,
      date: t.date,
      label: t.description,
      sub: t.category,
      amount: t.type === "INCOMING" ? n(t.amount) : -n(t.amount),
      meta: t.paymentMethod || "",
    })),
    ...ledger.map((inv) => ({
      kind: "ledger",
      id: inv.id,
      date: inv.createdAt,
      label: `${inv.direction} #${inv.invoiceNumber}`,
      sub: inv.partyName,
      amount: inv.direction === "RECEIVABLE" ? n(inv.amount) : -n(inv.amount),
      meta: inv.status,
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);

  return merged;
}

/** Fix ledger rows: mark OVERDUE when due in past and still pending */
export function withLedgerComputedStatus(inv) {
  const now = Date.now();
  const due = inv.dueDate ? new Date(inv.dueDate).getTime() : null;
  let status = inv.status;
  if (status === "PENDING" && due != null && due < now) status = "OVERDUE";
  return { ...inv, displayStatus: status };
}

export async function countOverdueLedgerInvoices() {
  const now = new Date();
  const pending = await db.ledgerInvoice.findMany({
    where: {
      status: "PENDING",
      dueDate: { lt: now },
    },
    select: { id: true },
  });
  return pending.length;
}

export async function listLedgerInvoices({ status, direction, start, end }) {
  const now = new Date();
  const where = {
    ...(direction && direction !== "all" ? { direction } : {}),
    ...(start && end
      ? {
          createdAt: { gte: start, lte: end },
        }
      : {}),
  };

  if (status === "OVERDUE") {
    where.status = "PENDING";
    where.dueDate = { lt: now };
  } else if (status && status !== "all") {
    where.status = status;
  }

  const rows = await db.ledgerInvoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return rows.map((r) => ({
    ...r,
    amount: n(r.amount),
    displayStatus:
      r.status === "PENDING" && r.dueDate && new Date(r.dueDate) < new Date()
        ? "OVERDUE"
        : r.status,
  }));
}

export async function listSalesInvoices({ start, end, statusFilter }) {
  const rows = await db.invoice.findMany({
    where:
      start && end
        ? {
            issuedAt: { gte: start, lte: end },
          }
        : {},
    include: {
      order: {
        select: {
          id: true,
          status: true,
          guestName: true,
          guestCity: true,
          totalAmount: true,
          paymentMethod: true,
        },
      },
    },
    orderBy: { issuedAt: "desc" },
  });

  const mapped = rows.map((inv) => {
    const st = inv.order.status;
    let displayStatus = "PENDING";
    if (st === "DELIVERED") displayStatus = "PAID";
    else if (st === "CANCELLED") displayStatus = "CANCELLED";

    const party =
      inv.order.guestCity === "POS Station"
        ? `${inv.order.guestName || "POS"} (POS)`
        : inv.order.guestName || inv.order.guestCity || "Customer";

    return {
      id: `sales-${inv.id}`,
      source: "SALES",
      invoiceNumber: inv.invoiceNumber,
      issuedAt: inv.issuedAt,
      partyName: party,
      amount: n(inv.totalAmount),
      displayStatus,
      direction: "RECEIVABLE",
      orderId: inv.orderId,
      paymentMethod: inv.order.paymentMethod,
    };
  });

  if (statusFilter && statusFilter !== "all") {
    return mapped.filter((m) => {
      if (statusFilter === "OVERDUE") return m.displayStatus === "PENDING";
      return m.displayStatus === statusFilter;
    });
  }
  return mapped;
}

export async function getRevenueRows({ start, end, source, paymentMethod }) {
  const rows = await db.transaction.findMany({
    where: {
      type: "INCOMING",
      date: { gte: start, lte: end },
    },
    orderBy: { date: "desc" },
    take: 500,
  });

  let filtered = rows.map((r) => {
    const src = revenueSourceFromTransaction(r);
    const status = "posted";
    return {
      id: r.id,
      date: r.date,
      source: src,
      amount: n(r.amount),
      status,
      description: r.description,
      reference: r.reference,
      paymentMethod: r.paymentMethod || inferPaymentFromDescription(r.description),
    };
  });

  if (source && source !== "all") {
    filtered = filtered.filter((x) => x.source === source);
  }
  if (paymentMethod && paymentMethod !== "all") {
    filtered = filtered.filter(
      (x) => (x.paymentMethod || "").toLowerCase() === paymentMethod.toLowerCase()
    );
  }

  const total = filtered.reduce((s, x) => s + x.amount, 0);
  return { rows: filtered, total };
}

function inferPaymentFromDescription(desc) {
  const d = (desc || "").toLowerCase();
  if (d.includes("cash")) return "CASH";
  if (d.includes("bank") || d.includes("transfer")) return "BANK_TRANSFER";
  return "";
}

export async function getExpenseRows({ start, end, category, paymentMethod }) {
  const rows = await db.transaction.findMany({
    where: {
      type: "OUTGOING",
      date: { gte: start, lte: end },
      NOT: { category: SALES_REVERSAL },
    },
    orderBy: { date: "desc" },
    take: 500,
  });

  let filtered = rows.map((r) => ({
    id: r.id,
    date: r.date,
    category: r.category,
    description: r.description,
    amount: n(r.amount),
    paidBy: r.paymentMethod || "—",
    reference: r.reference,
    receiptUrl: r.receiptUrl,
    editable: !isSystemGeneratedTransaction(r),
  }));

  if (category && category !== "all") {
    filtered = filtered.filter((x) => x.category.toLowerCase() === category.toLowerCase());
  }
  if (paymentMethod && paymentMethod !== "all") {
    filtered = filtered.filter(
      (x) => (x.paidBy || "").toLowerCase() === paymentMethod.toLowerCase()
    );
  }

  const total = filtered.reduce((s, x) => s + x.amount, 0);
  return { rows: filtered, total };
}

export async function getCogsForOrdersInRange({ start, end }) {
  const orders = await db.order.findMany({
    where: {
      status: "DELIVERED",
      createdAt: { gte: start, lte: end },
    },
    select: {
      id: true,
      status: true,
      items: {
        select: {
          quantity: true,
          product: { select: { purchasePrice: true } },
        },
      },
    },
  });

  let cogs = 0;
  for (const o of orders) {
    const line = o.items.reduce((s, it) => s + it.quantity * n(it.product.purchasePrice), 0);
    cogs += line;
  }

  const salesIncoming = await db.transaction.aggregate({
    where: {
      type: "INCOMING",
      date: { gte: start, lte: end },
      OR: [{ category: { equals: "Sales", mode: "insensitive" } }, { description: { startsWith: "POS Sale" } }],
    },
    _sum: { amount: true },
  });

  const grossRevenue = n(salesIncoming._sum.amount);

  const operatingOutgoing = await db.transaction.aggregate({
    where: {
      type: "OUTGOING",
      date: { gte: start, lte: end },
      NOT: { category: SALES_REVERSAL },
    },
    _sum: { amount: true },
  });

  const operatingExpenses = n(operatingOutgoing._sum.amount);
  const grossProfit = grossRevenue - cogs;
  const netProfit = grossProfit - operatingExpenses;

  return {
    grossRevenue,
    cogs,
    grossProfit,
    operatingExpenses,
    netProfit,
    ordersCount: orders.length,
  };
}

export async function getPlTrend({ start, end, granularity }) {
  const points = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  if (granularity === "monthly") {
    cursor.setDate(1);
  } else if (granularity === "quarterly") {
    cursor.setDate(1);
    cursor.setMonth(Math.floor(cursor.getMonth() / 3) * 3);
  } else {
    cursor.setMonth(0);
    cursor.setDate(1);
  }

  let guard = 0;
  while (cursor <= end && guard++ < 64) {
    let segEnd;
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    if (granularity === "yearly") {
      segEnd = new Date(y, 11, 31, 23, 59, 59, 999);
    } else if (granularity === "quarterly") {
      segEnd = new Date(y, m + 3, 0, 23, 59, 59, 999);
    } else {
      segEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);
    }
    if (segEnd > end) segEnd = new Date(end);

    const rangeStart = cursor < start ? new Date(start) : new Date(cursor);
    const pl = await getCogsForOrdersInRange({ start: rangeStart, end: segEnd });
    const label =
      granularity === "yearly"
        ? String(y)
        : granularity === "quarterly"
          ? `${y}-Q${Math.floor(m / 3) + 1}`
          : `${y}-${String(m + 1).padStart(2, "0")}`;

    points.push({
      label,
      netProfit: pl.netProfit,
      grossRevenue: pl.grossRevenue,
    });

    if (granularity === "yearly") cursor.setFullYear(cursor.getFullYear() + 1);
    else if (granularity === "quarterly") cursor.setMonth(cursor.getMonth() + 3);
    else cursor.setMonth(cursor.getMonth() + 1);
  }
  return points;
}

export async function getCashFlowSeries({ start, end }) {
  const txs = await db.transaction.findMany({
    where: {
      date: { gte: start, lte: end },
    },
    select: { type: true, amount: true, date: true, category: true, description: true },
    orderBy: { date: "asc" },
  });

  const opening = await getOpeningCashBalance(start);
  const rows = [];
  let running = opening;
  for (const t of txs) {
    const amt = n(t.amount);
    const inAmt = t.type === "INCOMING" ? amt : 0;
    const outAmt = t.type === "OUTGOING" ? amt : 0;
    running += inAmt - outAmt;
    rows.push({
      id: t.date.toISOString() + t.type + rows.length,
      date: t.date,
      in: inAmt,
      out: outAmt,
      balance: running,
      note: t.description,
    });
  }

  const monthlyMap = new Map();
  for (const t of txs) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap.has(key)) monthlyMap.set(key, { month: key, in: 0, out: 0 });
    const b = monthlyMap.get(key);
    const amt = n(t.amount);
    if (t.type === "INCOMING") b.in += amt;
    else b.out += amt;
  }

  return {
    openingBalance: opening,
    closingBalance: running,
    rows,
    monthly: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
  };
}

export async function getTopProductsByRevenue({ start, end, limit = 10 }) {
  const items = await db.orderItem.findMany({
    where: {
      order: {
        status: { not: "CANCELLED" },
        createdAt: { gte: start, lte: end },
      },
    },
    select: {
      quantity: true,
      price: true,
      product: { select: { id: true, name: true, nameEn: true, nameAr: true } },
    },
  });

  const map = new Map();
  for (const it of items) {
    const pid = it.product.id;
    const rev = it.quantity * n(it.price);
    if (!map.has(pid)) {
      map.set(pid, {
        productId: pid,
        name: it.product.name,
        nameEn: it.product.nameEn,
        nameAr: it.product.nameAr,
        revenue: 0,
        qty: 0,
      });
    }
    const e = map.get(pid);
    e.revenue += rev;
    e.qty += it.quantity;
  }

  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getReportMonthlySummary({ start, end }) {
  const pl = await getCogsForOrdersInRange({ start, end });
  const cats = await getExpenseCategoryBreakdown({ start, end });
  const revSplit = await getRevenueStoreVsPosMonthly({ start, end });
  const top = await getTopProductsByRevenue({ start, end, limit: 15 });
  return { pl, cats, revSplit, top };
}
