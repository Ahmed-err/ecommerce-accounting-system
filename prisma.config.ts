// =============================================
// PRISMA CONFIG — Connects Prisma to Our Database
// =============================================
// This file tells Prisma:
// 1. Where to find the schema file
// 2. Where to store migration files
// 3. How to connect to the database
// 4. How to run the seed script

import "dotenv/config";
// ☝️ Loads .env file so process.env.DATABASE_URL works

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.js",
    // ☝️ This tells `npx prisma db seed` which script to run
  },
  datasource: {
    // Only the Prisma CLI (migrate, db seed) uses this URL; the app connects through
    // src/lib/prisma.js. Migrations hold a Postgres advisory lock, which is unreliable
    // through Neon's pooler (PgBouncer), so prefer the direct, unpooled DIRECT_URL.
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
