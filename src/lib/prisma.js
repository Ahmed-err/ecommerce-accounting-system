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

import { PrismaClient } from "@/generated/prisma";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// In production: always create a new PrismaClient
// In development: store the client on `globalThis` so it survives hot-reloads
const globalForPrisma = globalThis;

export const prisma =
    globalForPrisma.prisma ??  // If a client already exists, reuse it
    new PrismaClient({ adapter });        // Otherwise, create a new one

// In development, save the client to globalThis so it persists
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
