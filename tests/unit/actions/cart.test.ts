import { vi } from "vitest";

const prismaMock = {
  product: { findUnique: vi.fn() },
  coupon: { findFirst: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock, db: prismaMock }));
vi.mock("@/lib/rate-limit", () => ({
  getClientIP: vi.fn(async () => "127.0.0.1"),
  checkRateLimit: vi.fn(async () => true),
}));

describe("actions/cart", () => {
  it("addToCartAction stock validation success", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "p1", name: "P1", stock: 10, isActive: true });
    const { validateCartStock } = await import("@/app/actions/cart");
    const out = await validateCartStock([{ id: "p1", name: "P1", quantity: 2 }]);
    expect(out.valid).toBe(true);
  });

  it("addToCartAction out of stock", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "p1", name: "P1", stock: 1, isActive: true });
    const { validateCartStock } = await import("@/app/actions/cart");
    const out = await validateCartStock([{ id: "p1", name: "P1", quantity: 2 }]);
    expect(out.valid).toBe(false);
    expect(out.issues[0].type).toBe("insufficient_stock");
  });

  it("validateCartStock trims product id for database lookup", async () => {
    prismaMock.product.findUnique.mockResolvedValue({ id: "p1", name: "P1", stock: 10, isActive: true });
    const { validateCartStock } = await import("@/app/actions/cart");
    const out = await validateCartStock([{ id: "  p1 ", name: "P1", quantity: 1 }]);
    expect(out.valid).toBe(true);
    expect(prismaMock.product.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "p1" } })
    );
  });

  it("validateCouponAction valid/invalid/expired", async () => {
    const { previewCoupon } = await import("@/app/actions/coupon");
    prismaMock.coupon.findFirst.mockResolvedValue({ code: "SAVE10", isActive: true, percentOff: 10, expiresAt: null });
    expect((await previewCoupon("save10")).valid).toBe(true);
    prismaMock.coupon.findFirst.mockResolvedValue(null);
    expect((await previewCoupon("nope")).valid).toBe(false);
    prismaMock.coupon.findFirst.mockResolvedValue({ code: "OLD", isActive: true, percentOff: 10, expiresAt: new Date(0) });
    expect((await previewCoupon("old")).error).toBe("expired");
  });
});
