import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = {
  product: { findFirst: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  order: { create: vi.fn() },
  transaction: { create: vi.fn() },
};
const db = {
  user: { findUnique: vi.fn() },
  coupon: { findFirst: vi.fn() },
  invoice: { update: vi.fn() },
  $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
};

vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(async () => true), getClientIP: vi.fn(async () => "1.2.3.4") }));
vi.mock("@/lib/monitoring", () => ({ emitAlert: vi.fn(async () => undefined) }));
vi.mock("@/lib/notifications", () => ({ createAdminBroadcastNotification: vi.fn(), createNotification: vi.fn() }));
vi.mock("@/lib/settings", () => ({ getOrCreateStoreSettings: vi.fn(async () => ({ shippingZones: [] })) }));

const guest = {
  name: "Guest Buyer",
  phone: "0912345678",
  address: "Street 1, Block 2, House 3",
  city: "Khartoum - Center",
  paymentMethod: "CASH_ON_DELIVERY",
};

describe("placeOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the stock error to the customer instead of throwing", async () => {
    tx.product.findFirst.mockResolvedValue({ id: "p1", name: "Drill", stock: 1, sellingPrice: 100 });
    const { placeOrder } = await import("@/app/actions/catalog");

    const out = await placeOrder(null, [{ id: "p1", name: "Drill", quantity: 5 }], guest);

    expect(out).toEqual({ success: false, error: 'Not enough stock for "Drill". Available: 1, Requested: 5' });
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it("charges items plus delivery with no tax", async () => {
    tx.product.findFirst.mockResolvedValue({ id: "p1", name: "Drill", stock: 5, sellingPrice: 100 });
    tx.order.create.mockRejectedValue(new Error("stop after create"));
    const { placeOrder } = await import("@/app/actions/catalog");

    await placeOrder(null, [{ id: "p1", name: "Drill", quantity: 2 }], guest);

    expect(tx.order.create.mock.calls[0][0].data.totalAmount).toBe(200 + 1500);
  });
});
