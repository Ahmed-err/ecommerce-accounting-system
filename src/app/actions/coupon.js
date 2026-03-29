"use server";

import { prisma as db } from "@/lib/prisma";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

/**
 * Validate coupon for checkout preview (client recalculates discount from percentOff).
 */
export async function previewCoupon(code) {
  try {
    const ip = await getClientIP();
    const allowed = await checkRateLimit(`coupon_preview_${ip}`, 10, 60 * 1000, {
      failClosed: false,
    });
    if (!allowed) {
      return { valid: false, error: "rate_limit" };
    }

    const normalized = typeof code === "string" ? code.trim().toUpperCase() : "";
    if (!normalized) {
      return { valid: false, error: "empty" };
    }

    const coupon = await db.coupon.findFirst({
      where: { code: normalized, isActive: true },
    });

    if (!coupon) {
      return { valid: false, error: "not_found" };
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { valid: false, error: "expired" };
    }
    const pct = coupon.percentOff;
    if (pct < 1 || pct > 100) {
      return { valid: false, error: "invalid" };
    }

    return {
      valid: true,
      code: normalized,
      percentOff: pct,
    };
  } catch (e) {
    console.error("previewCoupon:", e);
    return { valid: false, error: "server" };
  }
}
