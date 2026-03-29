import crypto from "crypto";
import { prisma as db } from "@/lib/prisma";

export function sanitizeText(input, max = 1000) {
  return String(input || "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);
}

export function hashIp(ip) {
  return crypto.createHash("sha256").update(String(ip || "unknown")).digest("hex");
}

export async function getProductReviewSummary(productId) {
  const [rows, total] = await Promise.all([
    db.review.groupBy({
      by: ["rating"],
      where: { productId, status: "APPROVED" },
      _count: { _all: true },
    }),
    db.review.count({ where: { productId, status: "APPROVED" } }),
  ]);

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let weighted = 0;
  for (const r of rows) {
    breakdown[r.rating] = r._count._all;
    weighted += r.rating * r._count._all;
  }
  const average = total ? weighted / total : 0;
  return { total, average, breakdown };
}

export async function listApprovedReviews({
  productId,
  page = 1,
  limit = 5,
  sort = "recent",
  rating = "all",
} = {}) {
  const where = {
    productId,
    status: "APPROVED",
    ...(rating !== "all" ? { rating: Number(rating) } : {}),
  };

  const orderBy =
    sort === "helpful"
      ? [{ helpfulCount: "desc" }, { createdAt: "desc" }]
      : sort === "highest"
        ? [{ rating: "desc" }, { createdAt: "desc" }]
        : sort === "lowest"
          ? [{ rating: "asc" }, { createdAt: "desc" }]
          : [{ createdAt: "desc" }];

  const skip = (Math.max(1, Number(page)) - 1) * limit;
  const [rows, total] = await Promise.all([
    db.review.findMany({
      where,
      include: { user: { select: { id: true, firstName: true, lastName: true, name: true } } },
      orderBy,
      skip,
      take: limit,
    }),
    db.review.count({ where }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      images: r.images || [],
      helpfulCount: r.helpfulCount,
      adminReply: r.adminReply,
      verified: r.verified,
      createdAt: r.createdAt.toISOString(),
      reviewerName:
        r.user?.firstName || r.user?.lastName
          ? `${r.user?.firstName || ""} ${r.user?.lastName || ""}`.trim()
          : r.user?.name || r.guestName || "Guest",
    })),
    total,
  };
}

export async function getAdminReviewStats() {
  const [total, pending, avg, topRated, mostReviewed] = await Promise.all([
    db.review.count(),
    db.review.count({ where: { status: "PENDING" } }),
    db.review.aggregate({ where: { status: "APPROVED" }, _avg: { rating: true } }),
    db.review.groupBy({
      by: ["productId"],
      where: { status: "APPROVED" },
      _avg: { rating: true },
      _count: { _all: true },
      orderBy: { _avg: { rating: "desc" } },
      take: 5,
    }),
    db.review.groupBy({
      by: ["productId"],
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  const ids = [...new Set([...topRated.map((x) => x.productId), ...mostReviewed.map((x) => x.productId)])];
  const products = await db.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, images: true },
  });
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  return {
    total,
    pending,
    averageRating: Number(avg._avg.rating || 0),
    topRated: topRated.map((r) => ({ ...r, product: byId[r.productId] || null })),
    mostReviewed: mostReviewed.map((r) => ({ ...r, product: byId[r.productId] || null })),
  };
}
