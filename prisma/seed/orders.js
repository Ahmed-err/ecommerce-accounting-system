const ORDERS = [
  { status: "DELIVERED", paymentMethod: "CASH_ON_DELIVERY", shipping: 2000, lines: [["LED-BLB-12W", 6], ["SW-1G-1W", 4]], daysAgo: 20 },
  { status: "SHIPPED", paymentMethod: "BANK_TRANSFER", shipping: 2000, lines: [["CB-MCB-32A", 8], ["DB-12W-SURF", 1]], daysAgo: 4, isVerified: true },
  { status: "PROCESSING", paymentMethod: "CASH_ON_DELIVERY", shipping: 2000, lines: [["CBL-CU-2.5-100", 2]], daysAgo: 2 },
  { status: "PENDING", paymentMethod: "CASH_ON_DELIVERY", shipping: 2000, lines: [["TL-MM-AUTO", 1], ["TL-VT-PEN", 2]], daysAgo: 0 },
  { status: "CANCELLED", paymentMethod: "CASH_ON_DELIVERY", shipping: 2000, lines: [["INV-PSW-3KW", 1]], daysAgo: 9 },
];

const daysAgo = (n) => new Date(Date.now() - n * 86400000);

export async function seedOrders(prisma, { customer, products }) {
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const build = (lines) => lines.map(([sku, quantity]) => ({ productId: bySku.get(sku).id, quantity, price: bySku.get(sku).sellingPrice }));
  const total = (items, shipping) => items.reduce((s, i) => s + Number(i.price) * i.quantity, 0) + shipping;

  for (const o of ORDERS) {
    const items = build(o.lines);
    await prisma.order.create({
      data: {
        userId: customer.id,
        status: o.status,
        paymentMethod: o.paymentMethod,
        isVerified: Boolean(o.isVerified),
        shippingCost: o.shipping,
        totalAmount: total(items, o.shipping),
        createdAt: daysAgo(o.daysAgo),
        items: { create: items },
      },
    });
  }

  const guestItems = build([["EXT-4W-3M", 2]]);
  await prisma.order.create({
    data: {
      guestName: "Hiba Osman",
      guestEmail: "hiba@example.com",
      guestPhone: "+249911111111",
      guestCity: "Omdurman - Center",
      guestAddress: "Al-Mulazmin, street 12",
      status: "PENDING",
      paymentMethod: "BANK_TRANSFER",
      shippingCost: 2000,
      totalAmount: total(guestItems, 2000),
      items: { create: guestItems },
    },
  });

  const reviews = [
    { sku: "LED-BLB-12W", rating: 5, title: "إضاءة ممتازة", body: "اللمبات قوية والإضاءة واضحة جداً، أنصح بها.", status: "APPROVED", userId: customer.id, verified: true },
    { sku: "SW-1G-1W", rating: 4, title: "Good quality switch", body: "Solid feel and easy to install. Would buy again.", status: "APPROVED", userId: customer.id, verified: true },
    { sku: "TL-VT-PEN", rating: 5, title: "مفيد جداً", body: "قلم الفحص سريع ودقيق ويغني عن أدوات كثيرة.", status: "APPROVED", guestName: "Yasir" },
    { sku: "CB-MCB-32A", rating: 3, title: "Okay", body: "Works fine, but the packaging was damaged on arrival.", status: "PENDING", guestName: "Tariq" },
  ];
  for (const { sku, ...r } of reviews) {
    await prisma.review.create({ data: { ...r, productId: bySku.get(sku).id } });
  }
  console.log(`   ✓ ${ORDERS.length + 1} orders (every status + guest), ${reviews.length} reviews`);
}
