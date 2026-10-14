import { computeProfit } from "@/lib/profit";

const orders = [
  // Store order: 2 × 1000 at cost 600 (saved at sale) + 1500 delivery.
  { totalAmount: 3500, guestCity: "Khartoum", items: [{ quantity: 2, unitCost: 600, product: { purchasePrice: 999 } }] },
  // Older POS order without a saved cost: falls back to today's product cost.
  { totalAmount: 500, guestCity: "POS Station", items: [{ quantity: 1, unitCost: null, product: { purchasePrice: 300 } }] },
];

const returns = [
  // One of the store items came back; refund 1000; its cost goes back into stock.
  { refundAmount: 1000, items: [{ productId: "a", quantity: 1 }], order: { items: [{ productId: "a", unitCost: 600, product: { purchasePrice: 999 } }] } },
];

const expenses = [
  { type: "OUTGOING", source: null, category: "Rent", amount: 400 },
  { type: "OUTGOING", source: "SALARY", category: "Salaries", amount: 300 },
  { type: "OUTGOING", source: "SUPPLIER", category: "Supplier payment", amount: 5000 },
  { type: "OUTGOING", source: "REFUND", category: "Refund", amount: 1000 },
  { type: "OUTGOING", source: "ORDER", category: "Sales Reversal", amount: 700 },
];

describe("computeProfit", () => {
  it("works out profit from orders, refunds, item cost and running costs", () => {
    expect(computeProfit({ orders, returns, expenses })).toEqual({
      sales: 4000,
      storeSales: 3500,
      posSales: 500,
      refunds: 1000,
      grossRevenue: 3000,
      cogs: 1200 + 300 - 600,
      grossProfit: 3000 - 900,
      operatingExpenses: 700,
      netProfit: 2100 - 700,
      ordersCount: 2,
    });
  });

  it("is all zeros for an empty period", () => {
    expect(computeProfit({ orders: [], returns: [], expenses: [] })).toMatchObject({ sales: 0, cogs: 0, netProfit: 0 });
  });
});
