"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAdminReviewStats, getProductReviewSummary, listApprovedReviews, sanitizeText, hashIp } from "@/lib/reviews";

const submitSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().min(2).max(100),
  body: z.string().min(20).max(1000),
  images: z.array(z.string().url()).max(3).optional().default([]),
  guestName: z.string().max(120).optional().nullable(),
  guestEmail: z.string().email().max(255).optional().nullable(),
});

async function ensureAdmin() {
  const session = await auth();
  if (!session || !["ADMIN", "MANAGER"].includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

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
    const allowed = await checkRateLimit(`review:${ip}`, 3, 60 * 60 * 1000);
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

export async function getAdminReviewsAction(filters = {}) {
  await ensureAdmin();
  const {
    status = "all",
    rating = "all",
    search = "",
    page = 1,
  } = filters;
  const where = {
    ...(status !== "all" ? { status } : {}),
    ...(rating !== "all" ? { rating: Number(rating) } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { guestName: { contains: search, mode: "insensitive" } },
            { product: { name: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const take = 20;
  const skip = (Math.max(1, Number(page)) - 1) * take;
  const [rows, total, stats] = await Promise.all([
    db.review.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, images: true } },
        user: { select: { id: true, firstName: true, lastName: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    db.review.count({ where }),
    getAdminReviewStats(),
  ]);
  return { ok: true, rows, total, stats };
}

export async function adminSetReviewStatusAction({ ids, status }) {
  await ensureAdmin();
  if (!Array.isArray(ids) || ids.length === 0) return { success: false, error: "No reviews selected" };
  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) return { success: false, error: "Bad status" };
  await db.review.updateMany({
    where: { id: { in: ids } },
    data: { status },
  });
  revalidatePath("/admin/reviews");
  return { success: true };
}

export async function adminReplyReviewAction({ id, reply }) {
  await ensureAdmin();
  const content = sanitizeText(reply, 2000);
  if (!content) return { success: false, error: "Reply cannot be empty" };
  await db.review.update({ where: { id }, data: { adminReply: content } });
  revalidatePath("/admin/reviews");
  return { success: true };
}

export async function adminDeleteReviewsAction(ids) {
  await ensureAdmin();
  if (!Array.isArray(ids) || ids.length === 0) return { success: false, error: "No reviews selected" };
  await db.review.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/admin/reviews");
  return { success: true };
}
