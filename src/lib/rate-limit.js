import { prisma as db } from "./prisma";
import { headers } from "next/headers";

/**
 * Get real client IP - uses last IP in x-forwarded-for chain (most reliable in trusted proxy setups)
 * or falls back to direct connection info.
 */
export async function getClientIP() {
  const headersList = await headers();
  // In production with trusted reverse proxy, use the last IP in x-forwarded-for
  // In development, this may return null - rate limiting will use a placeholder
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) {
    // Get the last IP (closest to server) in the chain
    const ips = forwarded.split(",").map(ip => ip.trim());
    return ips[ips.length - 1] || "unknown";
  }
  return headersList.get("x-real-ip") || "unknown";
}

/**
 * Database-backed rate limiter for server actions.
 * Uses Prisma to store rate limit data, works across all server instances.
 * 
 * @param {string} identifier - Unique key (IP address, email, phone)
 * @param {number} maxRequests - Max requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Promise<boolean>} - Returns true if request is allowed, false if blocked
 */
export async function checkRateLimit(identifier, maxRequests = 5, windowMs = 15 * 60 * 1000, { failClosed = false } = {}) {
  if (!identifier || typeof identifier !== "string") {
    console.error("[SECURITY] Rate limiter called with invalid identifier:", identifier);
    return !failClosed;
  }

  const rateKey = identifier.toLowerCase().trim();
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  try {
    await db.rateLimit.deleteMany({
      where: {
        identifier: rateKey,
        createdAt: { lt: windowStart }
      }
    });

    const count = await db.rateLimit.count({
      where: {
        identifier: rateKey,
        createdAt: { gte: windowStart }
      }
    });

    if (count >= maxRequests) {
      console.warn(`[SECURITY] Rate Limit triggered for: ${rateKey}`);
      return false;
    }

    await db.rateLimit.create({
      data: {
        identifier: rateKey,
        createdAt: now
      }
    });

    return true;
  } catch (error) {
    console.error("[SECURITY] Rate limiter error:", error);
    return !failClosed;
  }
}
