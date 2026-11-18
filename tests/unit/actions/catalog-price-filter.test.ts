import { beforeEach, describe, expect, it, vi } from "vitest";

const db = {
  product: { findMany: vi.fn(async () => []), count: vi.fn(async () => 0) },
  category: { findMany: vi.fn(async () => []) },
};

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (fn: unknown) => fn }));

describe("catalog price filter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adds no price condition when no price range is chosen (all products page)", async () => {
    const { getCatalogProducts } = await import("@/app/actions/catalog");
    await getCatalogProducts({});
    expect(db.product.findMany.mock.calls[0][0].where).not.toHaveProperty("sellingPrice");
  });

  it("treats null bounds as not set", async () => {
    const { getCatalogProducts } = await import("@/app/actions/catalog");
    await getCatalogProducts({ minPrice: null, maxPrice: null });
    expect(db.product.findMany.mock.calls[0][0].where).not.toHaveProperty("sellingPrice");
  });

  it("filters by the bounds that are set", async () => {
    const { getCatalogProducts } = await import("@/app/actions/catalog");
    await getCatalogProducts({ minPrice: "100000", maxPrice: "" });
    expect(db.product.findMany.mock.calls[0][0].where.sellingPrice).toEqual({ gte: 100000 });
  });
});
