import { beforeEach, describe, expect, it, vi } from "vitest";

const db: any = {
  store: { update: vi.fn() },
  user: { update: vi.fn() },
  shippingZone: { deleteMany: vi.fn(), createMany: vi.fn() },
};
db.$transaction = vi.fn(async (fn: any) => fn(db));
const session = { user: { id: "a1", role: "ADMIN" } };

vi.mock("@/lib/prisma", () => ({ prisma: db, db }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => session) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/settings", () => ({ getOrCreateStoreSettings: vi.fn(async () => ({ id: "st1", notificationConfig: null })) }));

const S = () => import("@/app/actions/settings");

beforeEach(() => {
  vi.clearAllMocks();
  session.user.role = "ADMIN";
});

describe("settings", () => {
  it("has no way to wipe the shop's data", async () => {
    const mod: any = await S();
    expect(mod.clearTestDataAction).toBeUndefined();
  });

  it("roles aren't changed here (the Employees screen guards that)", async () => {
    const { updateSettings } = await S();
    const res = await updateSettings({ tab: "users", payload: { updateUser: { id: "a1", role: "CUSTOMER" } } });
    expect(res.success).toBe(false);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it("store details no longer set currency or maintenance mode", async () => {
    const { updateSettings } = await S();
    await updateSettings({ tab: "store", payload: { nameAr: "همّت", nameEn: "Himmat", currency: "USD", maintenanceMode: true } });
    const { data } = db.store.update.mock.calls[0][0];
    expect(data).not.toHaveProperty("currency");
    expect(data).not.toHaveProperty("maintenanceMode");
  });

  it("payment settings no longer turn on VAT", async () => {
    const { updateSettings } = await S();
    await updateSettings({ tab: "payment", payload: { vatEnabled: true, vatPercentage: 15 } });
    const { data } = db.store.update.mock.calls[0][0];
    expect(data).not.toHaveProperty("vatEnabled");
    expect(data).not.toHaveProperty("vatPercentage");
  });

  it("shipping zones are validated and replaced in one transaction", async () => {
    const { updateSettings } = await S();
    const bad = await updateSettings({ tab: "shipping", payload: { zones: [{ zoneName: "Khartoum", governorates: ["Bahri"], shippingCost: -5 }] } });
    expect(bad.success).toBe(false);
    expect(db.shippingZone.deleteMany).not.toHaveBeenCalled();

    const ok = await updateSettings({ tab: "shipping", payload: { zones: [{ zoneName: " Khartoum ", governorates: ["Bahri", " "], shippingCost: "1500" }] } });
    expect(ok.success).toBe(true);
    expect(db.$transaction).toHaveBeenCalled();
    expect(db.shippingZone.createMany.mock.calls[0][0].data).toEqual([
      expect.objectContaining({ zoneName: "Khartoum", governorates: ["Bahri"], shippingCost: 1500 }),
    ]);
  });

  it("only admins change settings", async () => {
    session.user.role = "MANAGER";
    const { updateSettings } = await S();
    expect((await updateSettings({ tab: "store", payload: { nameAr: "a", nameEn: "b" } })).success).toBe(false);
    expect(db.store.update).not.toHaveBeenCalled();
  });
});
