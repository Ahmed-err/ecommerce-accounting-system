// Seeds a LOCAL database with realistic development data.
// Run: npx prisma db seed  (or npm run setup:local)
// Refuses to run against anything but a local database — it wipes every table.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { assertSafeSeedTarget } from "./seed/guard.js";
import { truncateAll } from "./seed/reset.js";
import { seedUsers } from "./seed/users.js";
import { seedStore } from "./seed/store.js";
import { seedCatalog } from "./seed/catalog.js";
import { seedOrders } from "./seed/orders.js";
import { seedContent } from "./seed/content.js";

const target = assertSafeSeedTarget({ databaseUrl: process.env.DATABASE_URL, env: process.env });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log(`🌱 Seeding ${target.database} on ${target.host}...`);
  await truncateAll(prisma);
  console.log("   ✓ Cleared all tables");
  const { customer } = await seedUsers(prisma);
  await seedStore(prisma);
  const products = await seedCatalog(prisma);
  await seedOrders(prisma, { customer, products });
  await seedContent(prisma);
  console.log("\n✅ Seeded. Logins:");
  console.log("   admin@powerstore.com / admin123   (ADMIN)");
  console.log("   manager@powerstore.com / manager123   (MANAGER)");
  console.log("   cashier@powerstore.com / cashier123   (CASHIER)");
  console.log("   customer@example.com / customer123   (CUSTOMER)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
