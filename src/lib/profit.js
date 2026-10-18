import { isProfitExpense } from "@/lib/ledger";

// Profit for a period (owner 2026-10-15): sales are orders not cancelled, as on the
// dashboard; approved refunds reduce them; cost of goods is each line's cost when sold (older
// lines: today's product cost), less the cost of returned items; expenses are running costs and
// salaries. Stock purchases and supplier payments are cash only.

const num = (v) => (typeof v?.toNumber === "function" ? v.toNumber() : Number(v || 0));
const round2 = (n) => Math.round(n * 100) / 100;
const lineCost = (line) => (line?.unitCost != null ? num(line.unitCost) : num(line?.product?.purchasePrice));

/**
 * orders:   not cancelled, created in the period; { totalAmount, guestCity, items: [{ quantity, unitCost, product: { purchasePrice } }] }
 * returns:  approved in the period; { refundAmount, items: [{ productId, quantity }], order: { items: [{ productId, unitCost, product }] } }
 * expenses: cash-book rows dated in the period (filtered here with isProfitExpense)
 */
export function computeProfit({ orders = [], returns = [], expenses = [] }) {
  let storeSales = 0;
  let posSales = 0;
  let cogs = 0;
  for (const o of orders) {
    if (o.guestCity === "POS Station") posSales += num(o.totalAmount);
    else storeSales += num(o.totalAmount);
    for (const it of o.items || []) cogs += it.quantity * lineCost(it);
  }

  let refunds = 0;
  for (const r of returns) {
    refunds += num(r.refundAmount);
    const byProduct = new Map((r.order?.items || []).map((it) => [it.productId, it]));
    for (const it of r.items || []) cogs -= it.quantity * lineCost(byProduct.get(it.productId));
  }

  const operatingExpenses = expenses.filter(isProfitExpense).reduce((s, t) => s + num(t.amount), 0);
  const sales = storeSales + posSales;
  const grossRevenue = sales - refunds;
  const grossProfit = grossRevenue - cogs;
  return {
    sales: round2(sales),
    storeSales: round2(storeSales),
    posSales: round2(posSales),
    refunds: round2(refunds),
    grossRevenue: round2(grossRevenue),
    cogs: round2(cogs),
    grossProfit: round2(grossProfit),
    operatingExpenses: round2(operatingExpenses),
    netProfit: round2(grossProfit - operatingExpenses),
    ordersCount: orders.length,
  };
}

/** Load the period's rows and compute profit. `db` is the Prisma client. */
export async function loadProfit(db, { start, end }) {
  const [orders, returns, expenses] = await Promise.all([
    db.order.findMany({
      where: { status: { not: "CANCELLED" }, createdAt: { gte: start, lte: end } },
      select: {
        totalAmount: true,
        guestCity: true,
        items: { select: { quantity: true, unitCost: true, product: { select: { purchasePrice: true } } } },
      },
    }),
    db.orderReturn.findMany({
      where: { status: "APPROVED", processedAt: { gte: start, lte: end } },
      select: {
        refundAmount: true,
        items: { select: { productId: true, quantity: true } },
        order: {
          select: {
            items: { select: { productId: true, unitCost: true, product: { select: { purchasePrice: true } } } },
          },
        },
      },
    }),
    db.transaction.findMany({
      where: { type: "OUTGOING", date: { gte: start, lte: end } },
      select: { type: true, source: true, category: true, amount: true },
    }),
  ]);
  return computeProfit({ orders, returns, expenses });
}
