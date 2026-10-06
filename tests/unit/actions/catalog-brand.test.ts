import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  product: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0), groupBy: vi.fn() },
  category: { findMany: vi.fn(async () => []) },
};

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));

describe("catalog brand filter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filters active products by exact brand, ignoring case and spaces", async () => {
    const { getCatalogProducts } = await import("@/app/actions/catalog");
    await getCatalogProducts({ brand: " lg " });
    const where = db.product.findMany.mock.calls[0][0].where;
    expect(where.brand).toEqual({ equals: "lg", mode: "insensitive" });
    expect(where.isActive).toBe(true);
  });

  it("adds no brand condition when none is chosen", async () => {
    const { getCatalogProducts } = await import("@/app/actions/catalog");
    await getCatalogProducts({});
    expect(db.product.findMany.mock.calls[0][0].where).not.toHaveProperty("brand");
  });

  it("lists brands with counts, most products first, skipping blanks", async () => {
    db.product.groupBy.mockResolvedValue([
      { brand: "Unionaire", _count: { _all: 3 } },
      { brand: " ", _count: { _all: 9 } },
      { brand: "LG", _count: { _all: 12 } },
    ]);
    const { getCatalogBrands } = await import("@/app/actions/catalog");
    expect(await getCatalogBrands()).toEqual([
      { name: "LG", count: 12 },
      { name: "Unionaire", count: 3 },
    ]);
  });
});
