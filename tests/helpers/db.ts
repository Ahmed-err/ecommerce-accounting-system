import { beforeAll, afterAll, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";
import bcrypt from "bcryptjs";

const testDbUrl = process.env.DATABASE_TEST_URL;
if (!testDbUrl) {
  throw new Error("DATABASE_TEST_URL is required for tests");
}

export const testPrisma = new PrismaClient({
  datasourceUrl: testDbUrl,
});

export async function cleanDatabase() {
  const tables = await testPrisma.$queryRawUnsafe<Array<{ tablename: string }>>(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`
  );
  if (!tables.length) return;
  const quoted = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
}

beforeAll(async () => {
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testDbUrl },
  });
});

afterEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});

export async function createTestUser(overrides: Record<string, any> = {}) {
  const password = overrides.password || "Password123";
  const hash = await bcrypt.hash(password, 10);
  return testPrisma.user.create({
    data: {
      name: "Test User",
      email: `user_${Date.now()}@test.local`,
      phone: `09${Math.floor(Math.random() * 100000000).toString().padStart(8, "0")}`,
      password: hash,
      role: "CUSTOMER",
      ...overrides,
      password: overrides.password ? await bcrypt.hash(overrides.password, 10) : hash,
    },
  });
}

export async function createTestCategory(overrides: Record<string, any> = {}) {
  return testPrisma.category.create({
    data: {
      name: `Category_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
      ...overrides,
    },
  });
}

export async function createTestProduct(overrides: Record<string, any> = {}) {
  const category =
    overrides.categoryId ? null : await createTestCategory();
  return testPrisma.product.create({
    data: {
      name: "Test Product",
      sku: `SKU-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      purchasePrice: 100,
      sellingPrice: 150,
      stock: 10,
      minStock: 3,
      images: [],
      categoryId: overrides.categoryId || category!.id,
      ...overrides,
    },
  });
}

export async function createTestOrder(overrides: Record<string, any> = {}) {
  const user = overrides.userId ? null : await createTestUser();
  const product = await createTestProduct();
  return testPrisma.order.create({
    data: {
      userId: overrides.userId || user!.id,
      guestName: "Guest",
      guestPhone: "0911111111",
      guestAddress: "Khartoum street 1",
      guestCity: "Khartoum - Center",
      totalAmount: 150,
      items: {
        create: [{ productId: product.id, quantity: 1, price: 150 }],
      },
      ...overrides,
    },
    include: { items: true },
  });
}
