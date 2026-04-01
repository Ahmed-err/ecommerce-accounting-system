// =============================================
// PRISMA CLIENT HELPER — Database Connection
// =============================================
//
// WHY THIS FILE EXISTS:
// In development, Next.js restarts your server frequently (hot-reloading).
// Each restart would create a NEW database connection, which wastes resources.
// This file ensures we REUSE the same connection across restarts.
//
// HOW TO USE IT:
// import { prisma } from "@/lib/prisma";
// const products = await prisma.product.findMany();

import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

function normalizeConnectionString(rawUrl) {
  if (!rawUrl) return rawUrl;

  try {
    const url = new URL(rawUrl);
    const sslmode = url.searchParams.get("sslmode");

    // Avoid pg warning and preserve current secure behavior.
    if (sslmode === "require") {
      url.searchParams.set("sslmode", "verify-full");
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

function resolveConnectionString() {
  const primary = process.env.DATABASE_URL;
  const direct = process.env.DIRECT_URL;
  return normalizeConnectionString(primary || direct);
}

const connectionString = resolveConnectionString();
const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 15000),
});
const adapter = new PrismaPg(pool);

// In production: always create a new PrismaClient
// In development: store the client on `globalThis` so it survives hot-reloads
const globalForPrisma = globalThis;

// Bump key when schema changes so dev HMR does not keep a stale client (missing new models).
export const prisma =
    globalForPrisma.prismaV3 ??
    new PrismaClient({
      adapter,
      ...(process.env.PRISMA_LOG_QUERIES === "true"
        ? { log: [{ level: "query", emit: "event" }, "error", "warn"] }
        : { log: ["error", "warn"] }),
    });

if (process.env.PRISMA_LOG_QUERIES === "true") {
    const slowMs = Number(process.env.DB_SLOW_QUERY_MS || 250);
    prisma.$on("query", (e) => {
      if (e.duration >= slowMs) {
        console.warn("[DB_SLOW_QUERY]", {
          durationMs: e.duration,
          target: e.target,
          query: e.query?.slice(0, 240),
        });
      }
    });
}

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaV3 = prisma;
}
