"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAdminReviewStats, getProductReviewSummary, listApprovedReviews, sanitizeText, hashIp } from "@/lib/reviews";
import { createAdminBroadcastNotification } from "@/lib/notifications";

const submitSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().min(2).max(100),
  body: z.string().min(20).max(1000),
  images: z.array(z.string().url()).max(3).optional().default([]),
  guestName: z.string().max(120).optional().nullable(),
  guestEmail: z.string().email().max(255).optional().nullable(),
});

export async function getProductReviewsAction(args) {
  const { productId, page, limit, sort, rating } = args || {};
  const [summary, list] = await Promise.all([
    getProductReviewSummary(productId),
    listApprovedReviews({ productId, page, limit, sort, rating }),
  ]);
  return { ok: true, summary, ...list };
}

export async function submitReviewAction(raw) {
  try {
    const parsed = submitSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const session = await auth();
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    const rateLimitKey = session?.user?.id ? `review:user:${session.user.id}` : `review:ip:${ip}`;
    const allowed = await checkRateLimit(rateLimitKey, 3, 60 * 60 * 1000);
    if (!allowed) return { success: false, error: "Too many reviews, try again later" };

    const p = parsed.data;
    const userId = session?.user?.id || null;

    if (!userId && (!p.guestName || !p.guestEmail)) {
      return { success: false, error: "Guest name and email are required" };
    }

    const existing = await db.review.findFirst({
      where: {
        productId: p.productId,
        ...(userId ? { userId } : { guestEmail: p.guestEmail || undefined }),
      },
    });
    if (existing) return { success: false, error: "You have already reviewed this product" };

    const verified = !!(userId && (await db.order.findFirst({
      where: {
        userId,
        status: "DELIVERED",
        items: { some: { productId: p.productId } },
      },
      select: { id: true },
    })));

    await db.review.create({
      data: {
        productId: p.productId,
        userId,
        guestName: userId ? null : sanitizeText(p.guestName || "", 120),
        guestEmail: userId ? null : sanitizeText(p.guestEmail || "", 255),
        rating: p.rating,
        title: sanitizeText(p.title, 100),
        body: sanitizeText(p.body, 1000),
        images: p.images || [],
        status: "PENDING",
        verified,
      },
    });
    await createAdminBroadcastNotification({
      type: "NEW_REVIEW",
      titleAr: "مراجعة جديدة",
      titleEn: "New review submitted",
      bodyAr: "تم إرسال مراجعة جديدة وتحتاج للمراجعة.",
      bodyEn: "A new review was submitted and needs moderation.",
      link: "/admin/reviews",
    });

    revalidatePath(`/products/${p.productId}`);
    revalidatePath("/admin/reviews");
    return { success: true };
  } catch (error) {
    console.error("submitReviewAction:", error);
    return { success: false, error: "Failed to submit review" };
  }
}

export async function toggleHelpfulAction(reviewId) {
  try {
    const session = await auth();
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    const ipHash = hashIp(ip);
    const userId = session?.user?.id || null;

    const exists = await db.reviewHelpfulVote.findFirst({
      where: {
        reviewId,
        OR: [{ ipHash }, ...(userId ? [{ userId }] : [])],
      },
    });
    if (exists) return { success: false, error: "Already voted" };

    await db.$transaction([
      db.reviewHelpfulVote.create({
        data: { reviewId, ipHash, userId },
      }),
      db.review.update({
        where: { id: reviewId },
        data: { helpfulCount: { increment: 1 } },
      }),
    ]);
    return { success: true };
  } catch (error) {
    console.error("toggleHelpfulAction:", error);
    return { success: false, error: "Failed to vote" };
  }
}

const REVIEWS_PAGE = 20;

async function isModerator() {
  const session = await auth();
  return ["ADMIN", "MANAGER"].includes(session?.user?.role);
}

/** Product pages (addressed by id) show approved reviews; refresh the ones these reviews belong to. */
async function refreshProductPages(ids) {
  const rows = await db.review.findMany({ where: { id: { in: ids } }, select: { productId: true } });
  for (const id of new Set(rows.map((r) => r.productId))) revalidatePath(`/products/${id}`);
  revalidatePath("/admin/reviews");
}

export async function getAdminReviewsAction(filters = {}) {
  if (!(await isModerator())) return { ok: false, rows: [], total: 0 };
  const { status = "all", rating = "all", search = "", page = 1 } = filters;
  const q = String(search || "").trim().slice(0, 100);
  const has = (field) => ({ [field]: { contains: q, mode: "insensitive" } });
  const where = {
    ...(["PENDING", "APPROVED", "REJECTED"].includes(status) ? { status } : {}),
    ...(rating !== "all" && Number(rating) >= 1 && Number(rating) <= 5 ? { rating: Number(rating) } : {}),
    ...(q
      ? {
          OR: [
            has("title"),
            has("body"),
            has("guestName"),
            { user: { OR: [has("name"), has("firstName"), has("lastName")] } },
            { product: { OR: [has("name"), has("nameAr")] } },
          ],
        }
      : {}),
  };
  const current = Math.max(1, Number(page) || 1);
  const [rows, total, stats] = await Promise.all([
    db.review.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, nameAr: true, images: true } },
        user: { select: { id: true, firstName: true, lastName: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * REVIEWS_PAGE,
      take: REVIEWS_PAGE,
    }),
    db.review.count({ where }),
    getAdminReviewStats(),
  ]);
  return { ok: true, rows, total, stats, page: current, pages: Math.max(1, Math.ceil(total / REVIEWS_PAGE)) };
}

export async function adminSetReviewStatusAction({ ids, status }) {
  if (!(await isModerator())) return { success: false, error: "unauthorized" };
  if (!Array.isArray(ids) || ids.length === 0) return { success: false, error: "No reviews selected" };
  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) return { success: false, error: "Bad status" };
  await db.review.updateMany({ where: { id: { in: ids } }, data: { status } });
  await refreshProductPages(ids);
  return { success: true };
}

export async function adminReplyReviewAction({ id, reply }) {
  if (!(await isModerator())) return { success: false, error: "unauthorized" };
  const content = sanitizeText(reply, 2000);
  if (!content) return { success: false, error: "Reply cannot be empty" };
  await db.review.update({ where: { id }, data: { adminReply: content } });
  await refreshProductPages([id]);
  return { success: true };
}

export async function adminDeleteReviewsAction(ids) {
  if (!(await isModerator())) return { success: false, error: "unauthorized" };
  if (!Array.isArray(ids) || ids.length === 0) return { success: false, error: "No reviews selected" };
  const rows = await db.review.findMany({ where: { id: { in: ids } }, select: { productId: true } });
  await db.review.deleteMany({ where: { id: { in: ids } } });
  for (const id of new Set(rows.map((r) => r.productId))) revalidatePath(`/products/${id}`);
  revalidatePath("/admin/reviews");
  return { success: true };
}
