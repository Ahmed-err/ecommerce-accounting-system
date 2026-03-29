import { prisma as db } from "@/lib/prisma";
import { getOrCreateStoreSettings } from "@/lib/settings";

export async function getAboutPageData() {
  const [store, productCount, ordersDelivered, customersWithOrders, features, team] = await Promise.all([
    getOrCreateStoreSettings(),
    db.product.count({ where: { isActive: true } }),
    db.order.count({ where: { status: "DELIVERED" } }),
    db.order
      .groupBy({
        by: ["userId"],
        where: { userId: { not: null } },
      })
      .then((g) => g.length),
    db.aboutFeature.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }).catch(() => []),
    db.teamMember.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }).catch(() => []),
  ]);

  const yearsInBusiness = store.aboutFoundedYear
    ? Math.max(1, new Date().getFullYear() - store.aboutFoundedYear)
    : null;

  return {
    store,
    stats: {
      productCount,
      ordersDelivered,
      happyCustomers: customersWithOrders,
      yearsInBusiness,
    },
    features,
    team,
  };
}
