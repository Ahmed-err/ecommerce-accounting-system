"use server";

import { auth } from "@/auth";
import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

function parseExpiresAt(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
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

    return { success: true, rows, total, page: currentPage, pages: Math.max(1, Math.ceil(total / take)) };
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
