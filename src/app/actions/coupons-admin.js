"use server";

import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { shopClock } from "@/lib/shop-time";

async function ensureAdmin() {
  const session = await auth();
  const role = String(session?.user?.role || "").toUpperCase();
  if (!session?.user?.id || role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

/** The form's "YYYY-MM-DDTHH:MM" is the shop's clock (Khartoum), not the server's (UTC). */
function parseExpiresAt(value) {
  const raw = String(value || "").trim();
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/);
  return m ? shopClock(m[1], m[2] || "23:59") : null;
}

export async function listCouponsAdmin({ page = 1, limit = 20, search = "", status = "all" } = {}) {
  try {
    await ensureAdmin();
    const take = Math.max(1, Math.min(100, Number(limit) || 20));
    const currentPage = Math.max(1, Number(page) || 1);
    const skip = (currentPage - 1) * take;
    const normalizedSearch = String(search || "").trim();
    const now = new Date();

    const where = {
      ...(normalizedSearch
        ? {
            code: { contains: normalizedSearch, mode: "insensitive" },
          }
        : {}),
      ...(status === "active"
        ? { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] }
        : status === "inactive"
          ? { isActive: false }
          : status === "expired"
            ? { expiresAt: { lt: now } }
            : {}),
    };

    const [rows, total] = await Promise.all([
      db.coupon.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip,
        take,
      }),
      db.coupon.count({ where }),
    ]);

    // Times used: orders (not cancelled) that carry the code.
    const used = rows.length
      ? await db.order.groupBy({
          by: ["couponCode"],
          where: { couponCode: { in: rows.map((r) => r.code) }, status: { not: "CANCELLED" } },
          _count: { _all: true },
        })
      : [];
    const uses = new Map(used.map((u) => [u.couponCode, u._count._all]));

    return {
      success: true,
      rows: rows.map((r) => ({ ...r, uses: uses.get(r.code) || 0 })),
      total,
      page: currentPage,
      pages: Math.max(1, Math.ceil(total / take)),
    };
  } catch (error) {
    console.error("listCouponsAdmin:", error);
    return { success: false, error: "Failed to load coupons." };
  }
}

export async function createCouponAdmin(payload = {}) {
  try {
    await ensureAdmin();
    const code = normalizeCode(payload.code);
    const percentOff = Number(payload.percentOff);
    const expiresAt = parseExpiresAt(payload.expiresAt);
    const isActive = payload.isActive !== false;

    if (!code) return { success: false, error: "Coupon code is required." };
    if (!Number.isFinite(percentOff) || percentOff < 1 || percentOff > 100) {
      return { success: false, error: "Discount percent must be between 1 and 100." };
    }

    await db.coupon.create({
      data: {
        code,
        percentOff: Math.round(percentOff),
        isActive,
        expiresAt,
      },
    });

    revalidatePath("/admin/coupons");
    revalidatePath("/cart");
    return { success: true };
  } catch (error) {
    console.error("createCouponAdmin:", error);
    if (String(error?.message || "").toLowerCase().includes("unique")) {
      return { success: false, error: "Coupon code already exists." };
    }
    return { success: false, error: "Failed to create coupon." };
  }
}

export async function updateCouponAdmin(id, payload = {}) {
  try {
    await ensureAdmin();
    if (!id) return { success: false, error: "Coupon id is required." };

    const code = normalizeCode(payload.code);
    const percentOff = Number(payload.percentOff);
    const expiresAt = parseExpiresAt(payload.expiresAt);
    const isActive = payload.isActive !== false;

    if (!code) return { success: false, error: "Coupon code is required." };
    if (!Number.isFinite(percentOff) || percentOff < 1 || percentOff > 100) {
      return { success: false, error: "Discount percent must be between 1 and 100." };
    }

    const existing = await db.coupon.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return { success: false, error: "Coupon not found." };
    }

    await db.coupon.update({
      where: { id },
      data: {
        code,
        percentOff: Math.round(percentOff),
        isActive,
        expiresAt,
      },
    });

    revalidatePath("/admin/coupons");
    revalidatePath("/cart");
    return { success: true };
  } catch (error) {
    console.error("updateCouponAdmin:", error);
    if (String(error?.message || "").toLowerCase().includes("unique")) {
      return { success: false, error: "Coupon code already exists." };
    }
    return { success: false, error: error?.message || "Failed to update coupon." };
  }
}

export async function deleteCouponAdmin(id) {
  try {
    await ensureAdmin();
    if (!id) return { success: false, error: "Coupon id is required." };
    await db.coupon.delete({ where: { id } });
    revalidatePath("/admin/coupons");
    revalidatePath("/cart");
    return { success: true };
  } catch (error) {
    console.error("deleteCouponAdmin:", error);
    return { success: false, error: "Failed to delete coupon." };
  }
}
