import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

const mockGetHomepageFeaturedSets = vi.fn();

const bannerFindMany = vi.fn();
const categoryFindMany = vi.fn();
const offerFindMany = vi.fn();
const productCount = vi.fn();
const productFindMany = vi.fn();
const orderItemGroupBy = vi.fn();
const reviewGroupBy = vi.fn();
const wishlistGroupBy = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    banner: { findMany: bannerFindMany },
    category: { findMany: categoryFindMany },
    offer: { findMany: offerFindMany },
    product: { count: productCount, findMany: productFindMany },
    orderItem: { groupBy: orderItemGroupBy },
    review: { groupBy: reviewGroupBy },
    wishlistItem: { groupBy: wishlistGroupBy },
  },
}));

vi.mock("@/lib/store/homepage-featured", () => ({
  getHomepageFeaturedSets: mockGetHomepageFeaturedSets,
}));

const { getHomepageData } = await import("@/lib/store/homepage");

describe("homepage fallback data", () => {
  beforeEach(() => {
    bannerFindMany.mockReset();
    categoryFindMany.mockReset();
    offerFindMany.mockReset();
    productCount.mockReset();
    productFindMany.mockReset();
    orderItemGroupBy.mockReset();
    reviewGroupBy.mockReset();
    wishlistGroupBy.mockReset();
    mockGetHomepageFeaturedSets.mockReset();
    mockGetHomepageFeaturedSets.mockRejectedValue(new Error("db unavailable"));
  });

  it("returns fallback categories and featured placeholders when homepage queries fail", async () => {
    bannerFindMany.mockRejectedValue(new Error("db unavailable"));
    categoryFindMany.mockRejectedValue(new Error("db unavailable"));
    offerFindMany.mockRejectedValue(new Error("db unavailable"));

    const result = await getHomepageData();

    expect(result.categories).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "cat-lighting" })])
    );
    expect(result.featured).toEqual(
      expect.objectContaining({
        bestSellers: [],
        newArrivals: [],
        topRated: [],
      })
    );
  });
});
