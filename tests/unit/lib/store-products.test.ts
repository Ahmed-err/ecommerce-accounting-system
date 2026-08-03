import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: {
      findFirst: findFirstMock,
      findMany: vi.fn(),
    },
  },
}));

const { getStorefrontProductBySlug } = await import("@/lib/store/products");

describe("store product lookup", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("returns null when the product lookup fails instead of throwing", async () => {
    findFirstMock.mockRejectedValueOnce(new Error("db unavailable"));

    await expect(getStorefrontProductBySlug("missing-product")).resolves.toBeNull();
  });
});
