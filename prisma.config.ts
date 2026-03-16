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
    url: process.env["DATABASE_URL"],
    // ☝️ Reads the connection string from our .env file
  },
});
