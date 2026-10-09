import { beforeEach, vi } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ getClientIP: vi.fn(async () => "1.2.3.4"), checkRateLimit: vi.fn(async () => true) }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));
const prismaMock = { order: { findFirst: vi.fn() } };
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock, db: prismaMock }));

const ORDER = {
  id: "cmusgyrfx002hapcpeiz5hpd2",
  status: "SHIPPED",
  guestPhone: "0912 345 678 / 0999000111",
  createdAt: new Date("2026-10-03"),
  totalAmount: { toNumber: () => 24900 },
  items: [{ quantity: 2 }, { quantity: 1 }],
};

describe("trackGuestOrderAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.order.findFirst.mockResolvedValue(ORDER);
  });

  it("matches the 8-character order ref exactly and the phone in any Sudan format", async () => {
    const { trackGuestOrderAction } = await import("@/app/actions/user-orders");
    const res = await trackGuestOrderAction({ orderNumber: " #eiz5hpd2 ", phone: "+249 912 345 678" });
    const where = prismaMock.order.findFirst.mock.calls[0][0].where;
    expect(where).toEqual({ id: { endsWith: "eiz5hpd2" } });
    expect(res).toEqual({
      success: true,
      order: { ref: "EIZ5HPD2", status: "SHIPPED", createdAt: ORDER.createdAt, totalAmount: 24900, itemCount: 3 },
    });
  });

  it("refuses partial order numbers and non-phone input without querying", async () => {
    const { trackGuestOrderAction } = await import("@/app/actions/user-orders");
    expect(await trackGuestOrderAction({ orderNumber: "eiz5", phone: "0912345678" })).toEqual({ success: false, error: "invalid" });
    expect(await trackGuestOrderAction({ orderNumber: "EIZ5HPD2", phone: "1" })).toEqual({ success: false, error: "invalid" });
    expect(prismaMock.order.findFirst).not.toHaveBeenCalled();
  });

  it("matches the second phone saved on the order too", async () => {
    const { trackGuestOrderAction } = await import("@/app/actions/user-orders");
    expect(await trackGuestOrderAction({ orderNumber: "EIZ5HPD2", phone: "00249999000111" })).toMatchObject({ success: true });
  });

  it("does not show an order when the phone doesn't match", async () => {
    const { trackGuestOrderAction } = await import("@/app/actions/user-orders");
    expect(await trackGuestOrderAction({ orderNumber: "EIZ5HPD2", phone: "0911111111" })).toEqual({ success: false, error: "not_found" });
  });

  it("says not found without revealing which part was wrong", async () => {
    prismaMock.order.findFirst.mockResolvedValue(null);
    const { trackGuestOrderAction } = await import("@/app/actions/user-orders");
    expect(await trackGuestOrderAction({ orderNumber: "EIZ5HPD2", phone: "0912345678" })).toEqual({ success: false, error: "not_found" });
  });
});
