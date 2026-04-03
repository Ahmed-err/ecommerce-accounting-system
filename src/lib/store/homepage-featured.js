import { prisma as db } from "@/lib/prisma";
import { serializeCatalogProduct } from "@/lib/catalog-serialize";
import { productPublicFields } from "@/lib/store/product-public-fields";

const DEFAULT_LIMIT = 6;

const ACTIVE_SELECT = {
  ...productPublicFields,
  category: true,
};

async function fetchByIdsOrdered(ids) {
  if (!ids.length) return [];
  const rows = await db.product.findMany({
    where: { id: { in: ids }, isActive: true },
    select: ACTIVE_SELECT,
  });
  const map = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => map.get(id)).filter(Boolean).map(serializeCatalogProduct);
}

async function fetchActiveOrdered(orderBy, take) {
  const rows = await db.product.findMany({
    where: { isActive: true },
    orderBy,
    take,
    select: ACTIVE_SELECT,
  });
  return rows.map(serializeCatalogProduct);
}

/**
 * Homepage showcase tabs backed by real data:
 * - Best sellers: units sold on non-cancelled orders (fallback: highest in-stock first).
 * - New arrivals: newest active products by createdAt.
 * - Top rated: approved reviews by average rating, then review count (fallback: most wishlisted, then newest).
 */
export async function getHomepageFeaturedSets(limit = DEFAULT_LIMIT) {
  const [soldGroups, reviewGroups, catalogActiveCount, wishGroups] = await Promise.all([
    db.orderItem.groupBy({
      by: ["productId"],
      where: {
        order: { status: { not: "CANCELLED" } },
        product: { isActive: true },
      },
      _sum: { quantity: true },
    }),
    db.review.groupBy({
      by: ["productId"],
      where: { status: "APPROVED", product: { isActive: true } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    db.product.count({ where: { isActive: true } }),
    db.wishlistItem.groupBy({
      by: ["productId"],
      where: { product: { isActive: true } },
      _count: { _all: true },
    }),
  ]);

  const soldSorted = [...soldGroups]
    .filter((g) => (g._sum.quantity ?? 0) > 0)
    .sort((a, b) => (b._sum.quantity ?? 0) - (a._sum.quantity ?? 0))
    .slice(0, limit);
  let bestSellers = await fetchByIdsOrdered(soldSorted.map((g) => g.productId));
  if (bestSellers.length === 0 && catalogActiveCount > 0) {
    bestSellers = await fetchActiveOrdered([{ stock: "desc" }, { createdAt: "desc" }], limit);
  }

  const newArrivals =
    catalogActiveCount > 0
      ? await fetchActiveOrdered({ createdAt: "desc" }, limit)
      : [];

  const reviewSorted = [...reviewGroups]
    .filter((g) => (g._count?._all ?? 0) >= 1)
    .sort((a, b) => {
      const ar = Number(a._avg?.rating ?? 0);
      const br = Number(b._avg?.rating ?? 0);
      if (br !== ar) return br - ar;
      return (b._count._all ?? 0) - (a._count._all ?? 0);
    })
    .slice(0, limit);
  let topRated = await fetchByIdsOrdered(reviewSorted.map((g) => g.productId));
  if (topRated.length === 0 && catalogActiveCount > 0) {
    const wishSorted = [...wishGroups]
      .sort((a, b) => (b._count._all ?? 0) - (a._count._all ?? 0))
      .slice(0, limit);
    topRated = await fetchByIdsOrdered(wishSorted.map((g) => g.productId));
  }
  if (topRated.length === 0 && catalogActiveCount > 0) {
    topRated = await fetchActiveOrdered({ createdAt: "desc" }, limit);
  }

  return {
    bestSellers,
    newArrivals,
    topRated,
    catalogActiveCount,
  };
}
