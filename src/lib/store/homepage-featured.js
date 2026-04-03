import { prisma as db } from "@/lib/prisma";
import { serializeCatalogProduct } from "@/lib/catalog-serialize";
import { productPublicFields } from "@/lib/store/product-public-fields";

const DEFAULT_LIMIT = 6;

/** Count only lines that represent completed or in-transit fulfillment (not pending/cancelled). */
const FULFILLED_ORDER_STATUSES = ["DELIVERED", "SHIPPED"];

const NEW_ARRIVAL_DAYS = 120;
const MIN_REVIEWS_STRICT = 2;
const MIN_REVIEWS_RELAXED = 1;

const ACTIVE_SELECT = {
  ...productPublicFields,
  category: true,
};

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function fetchByIdsOrdered(ids) {
  if (!ids.length) return [];
  const rows = await db.product.findMany({
    where: { id: { in: ids }, isActive: true },
    select: ACTIVE_SELECT,
  });
  const map = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => map.get(id)).filter(Boolean).map(serializeCatalogProduct);
}

async function fetchActiveOrdered(orderBy, take, extraWhere = {}) {
  const rows = await db.product.findMany({
    where: { isActive: true, ...extraWhere },
    orderBy,
    take,
    select: ACTIVE_SELECT,
  });
  return rows.map(serializeCatalogProduct);
}

async function aggregateSalesSince(since) {
  return db.orderItem.groupBy({
    by: ["productId"],
    where: {
      product: { isActive: true },
      order: {
        status: { in: FULFILLED_ORDER_STATUSES },
        createdAt: { gte: since },
      },
    },
    _sum: { quantity: true },
  });
}

function sortSalesGroups(groups, limit) {
  return [...groups]
    .filter((g) => (g._sum.quantity ?? 0) > 0)
    .sort((a, b) => (b._sum.quantity ?? 0) - (a._sum.quantity ?? 0))
    .slice(0, limit);
}

async function resolveBestSellers(limit, catalogActiveCount) {
  const monthStart = startOfCurrentMonth();
  const d90 = daysAgo(90);

  let groups = sortSalesGroups(await aggregateSalesSince(monthStart), limit);
  let period = "month";

  if (groups.length === 0) {
    groups = sortSalesGroups(await aggregateSalesSince(d90), limit);
    period = "90d";
  }
  if (groups.length === 0) {
    groups = sortSalesGroups(
      await db.orderItem.groupBy({
        by: ["productId"],
        where: {
          product: { isActive: true },
          order: { status: { in: FULFILLED_ORDER_STATUSES } },
        },
        _sum: { quantity: true },
      }),
      limit
    );
    period = "all";
  }

  let products = await fetchByIdsOrdered(groups.map((g) => g.productId));

  if (products.length === 0 && catalogActiveCount > 0) {
    products = await fetchActiveOrdered([{ stock: "desc" }, { createdAt: "desc" }], limit);
    period = "fallback_stock";
  }

  return { products, period };
}

async function resolveNewArrivals(limit) {
  const cutoff = daysAgo(NEW_ARRIVAL_DAYS);
  const recent = await db.product.findMany({
    where: { isActive: true, createdAt: { gte: cutoff } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: ACTIVE_SELECT,
  });

  if (recent.length >= limit) {
    return {
      products: recent.map(serializeCatalogProduct),
      windowDays: NEW_ARRIVAL_DAYS,
      filledOlder: false,
    };
  }

  const exclude = recent.map((r) => r.id);
  const older = await db.product.findMany({
    where: { isActive: true, ...(exclude.length ? { id: { notIn: exclude } } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit - recent.length,
    select: ACTIVE_SELECT,
  });

  return {
    products: [...recent, ...older].map(serializeCatalogProduct),
    windowDays: NEW_ARRIVAL_DAYS,
    filledOlder: older.length > 0,
  };
}

function sortReviewGroups(groups, minReviews) {
  return [...groups]
    .filter((g) => (g._count?._all ?? 0) >= minReviews)
    .sort((a, b) => {
      const ar = Number(a._avg?.rating ?? 0);
      const br = Number(b._avg?.rating ?? 0);
      if (br !== ar) return br - ar;
      return (b._count._all ?? 0) - (a._count._all ?? 0);
    });
}

async function resolveTopRated(limit, catalogActiveCount, wishGroups) {
  const reviewGroups = await db.review.groupBy({
    by: ["productId"],
    where: { status: "APPROVED", product: { isActive: true } },
    _avg: { rating: true },
    _count: { _all: true },
  });

  let minReviews = MIN_REVIEWS_STRICT;
  let ordered = sortReviewGroups(reviewGroups, minReviews);
  let relaxed = false;

  if (ordered.length < limit) {
    const strictIds = new Set(ordered.map((g) => g.productId));
    const extra = sortReviewGroups(reviewGroups, MIN_REVIEWS_RELAXED).filter((g) => !strictIds.has(g.productId));
    ordered = [...ordered, ...extra].slice(0, limit);
    relaxed = extra.length > 0;
    minReviews = MIN_REVIEWS_RELAXED;
  }

  let ids = ordered.slice(0, limit).map((g) => g.productId);
  let products = await fetchByIdsOrdered(ids);

  if (products.length === 0 && catalogActiveCount > 0) {
    const wishSorted = [...wishGroups]
      .sort((a, b) => (b._count._all ?? 0) - (a._count._all ?? 0))
      .slice(0, limit);
    products = await fetchByIdsOrdered(wishSorted.map((g) => g.productId));
    relaxed = true;
  }
  if (products.length === 0 && catalogActiveCount > 0) {
    products = await fetchActiveOrdered({ createdAt: "desc" }, limit);
    relaxed = true;
  }

  return { products, minReviewsUsed: minReviews, relaxed };
}

/**
 * Homepage showcase tabs — data rules:
 * - Best sellers: units sold on DELIVERED/SHIPPED orders this calendar month → then last 90 days → all-time → stock fallback.
 * - New arrivals: newest active products, preferring those added within the last {NEW_ARRIVAL_DAYS} days.
 * - Top rated: APPROVED reviews, avg rating (min 2 reviews; fills with 1-review products if needed) → wishlist → newest fallback.
 */
export async function getHomepageFeaturedSets(limit = DEFAULT_LIMIT) {
  const catalogActiveCount = await db.product.count({ where: { isActive: true } });

  const [bestSellerResult, newArrivalResult, wishGroups] = await Promise.all([
    resolveBestSellers(limit, catalogActiveCount),
    catalogActiveCount > 0
      ? resolveNewArrivals(limit)
      : Promise.resolve({ products: [], windowDays: NEW_ARRIVAL_DAYS, filledOlder: false }),
    db.wishlistItem.groupBy({
      by: ["productId"],
      where: { product: { isActive: true } },
      _count: { _all: true },
    }),
  ]);

  const topRatedResult = await resolveTopRated(limit, catalogActiveCount, wishGroups);

  return {
    bestSellers: bestSellerResult.products,
    newArrivals: newArrivalResult.products,
    topRated: topRatedResult.products,
    catalogActiveCount,
    featuredMeta: {
      bestSellersPeriod: bestSellerResult.period,
      newArrivalsWindowDays: newArrivalResult.windowDays,
      newArrivalsFilledOlder: newArrivalResult.filledOlder,
      topRatedMinReviews: topRatedResult.minReviewsUsed,
      topRatedRelaxed: topRatedResult.relaxed,
    },
  };
}

/**
 * Product IDs matching filters, ordered for "top rated" catalog sort (approved reviews).
 */
export async function getTopRatedProductIdsFiltered(whereBase, minReviews = MIN_REVIEWS_STRICT) {
  const matching = await db.product.findMany({
    where: { ...whereBase, isActive: true },
    select: { id: true },
  });
  const allowed = new Set(matching.map((p) => p.id));
  if (allowed.size === 0) return { ids: [], total: 0 };

  const reviewGroups = await db.review.groupBy({
    by: ["productId"],
    where: { status: "APPROVED", product: { isActive: true } },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const filtered = reviewGroups.filter((g) => allowed.has(g.productId));
  let ordered = sortReviewGroups(filtered, minReviews).map((g) => g.productId);

  if (ordered.length === 0 && minReviews > MIN_REVIEWS_RELAXED) {
    ordered = sortReviewGroups(filtered, MIN_REVIEWS_RELAXED).map((g) => g.productId);
  }

  return { ids: ordered, total: ordered.length };
}
