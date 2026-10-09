import { beforeEach, vi } from "vitest";

vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(async () => true) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => ({ set: vi.fn(), get: vi.fn() })) }));
vi.mock("@/lib/senders", () => ({ sendEmailVerification: vi.fn(), sendAccountDeletionEmail: vi.fn() }));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "u1" } })) }));

const prismaMock = {
  user: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock, db: prismaMock }));

const profile = (phone: string) => ({ firstName: "A", lastName: "B", phone, gender: "", dateOfBirth: "" });

describe("actions/user updateAccountProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1" });
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.update.mockResolvedValue({});
  });

  it("saves the phone in the canonical +249 form", async () => {
    const { updateAccountProfile } = await import("@/app/actions/user");
    expect(await updateAccountProfile(profile("0912 345 678"))).toEqual({ success: true });
    expect(prismaMock.user.update.mock.calls[0][0].data.phone).toBe("+249912345678");
  });

  it("refuses a number another account has in any saved form", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "other" });
    const { updateAccountProfile } = await import("@/app/actions/user");
    expect(await updateAccountProfile(profile("+249912345678"))).toMatchObject({ success: false, error: "phone_in_use" });
    const where = prismaMock.user.findFirst.mock.calls[0][0].where;
    expect(where.phone.in).toEqual(expect.arrayContaining(["+249912345678", "+0912345678", "0912345678"]));
    expect(where.id).toEqual({ not: "u1" });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("refuses something that is not a Sudan phone number", async () => {
    const { updateAccountProfile } = await import("@/app/actions/user");
    expect(await updateAccountProfile(profile("12ab"))).toMatchObject({ success: false, error: "phone_invalid" });
  });

  it("clears the phone when left empty", async () => {
    const { updateAccountProfile } = await import("@/app/actions/user");
    await updateAccountProfile(profile(""));
    expect(prismaMock.user.update.mock.calls[0][0].data.phone).toBeNull();
  });
});
