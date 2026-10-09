import { createHash } from "node:crypto";
import { beforeEach, vi } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  getClientIP: vi.fn(async () => "127.0.0.1"),
  checkRateLimit: vi.fn(async () => true),
}));

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  verificationToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn(async (ops: any) => (Array.isArray(ops) ? Promise.all(ops) : ops())),
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock, db: prismaMock }));
vi.mock("@/lib/notifications", () => ({ createAdminBroadcastNotification: vi.fn(async () => ({ count: 1 })) }));
vi.mock("@/lib/senders", () => ({ sendResetEmail: vi.fn(async () => true), sendResetSMS: vi.fn(async () => true) }));

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ firstName: "A", lastName: "B", email: "a@b.com", phone: "0912345678", password: "Password123", ...fields })) fd.set(k, v);
  return fd;
};

describe("actions/auth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registerUser stores a lower-case email and the +249 phone", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "u1", name: "A B", email: "a@b.com" });
    const { registerUser } = await import("@/app/actions/register");
    expect(await registerUser(form({ email: " A@B.com ", phone: "0912345678" }))).toEqual({ success: true });
    expect(prismaMock.user.create.mock.calls[0][0].data).toMatchObject({ email: "a@b.com", phone: "+249912345678" });
  });

  it("registerUser finds an existing account in any email case or phone format", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "x" });
    const { registerUser } = await import("@/app/actions/register");
    expect(await registerUser(form({ email: "A@b.com" }))).toEqual({ error: "account_exists" });
    const where = prismaMock.user.findFirst.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { email: { equals: "a@b.com", mode: "insensitive" } },
      { phone: { in: ["+249912345678", "+0912345678", "0912345678", "+912345678"] } },
    ]);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("registerUser success", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "u1", name: "A B", email: "a@b.com" });
    const { registerUser } = await import("@/app/actions/register");
    const fd = new FormData();
    fd.set("firstName", "A");
    fd.set("lastName", "B");
    fd.set("email", "a@b.com");
    fd.set("phone", "0912345678");
    fd.set("password", "Password123");
    const out = await registerUser(fd);
    expect(out.success).toBe(true);
  });

  it("registerUser weak password", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const { registerUser } = await import("@/app/actions/register");
    const fd = new FormData();
    fd.set("firstName", "A");
    fd.set("lastName", "B");
    fd.set("email", "a@b.com");
    fd.set("phone", "0912345678");
    fd.set("password", "weak");
    const out = await registerUser(fd);
    expect(out.error).toBe("password_weak");
  });

  it("forgotPassword returns success for unknown", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    const { requestPasswordReset } = await import("@/app/actions/reset-password");
    const out = await requestPasswordReset("unknown@test.local");
    expect(out.success).toBe(true);
  });

  it("resetPassword invalid token", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue(null);
    const { resetPassword } = await import("@/app/actions/reset-password");
    const out = await resetPassword("a@b.com", "bad", "Password123");
    expect(out).toEqual({ success: false, error: "token_invalid" });
  });

  it("forgotPassword stores only a hash of the token and finds phone accounts", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: "u1", email: "a@b.com", phone: "+0912345678" });
    const { requestPasswordReset } = await import("@/app/actions/reset-password");
    const senders = await import("@/lib/senders");
    expect(await requestPasswordReset("+249 912 345 678")).toEqual({ success: true });
    expect(prismaMock.user.findFirst.mock.calls[0][0].where).toEqual({
      phone: { in: ["+249912345678", "+0912345678", "0912345678", "+912345678"] },
    });
    const [phone, token, email] = (senders.sendResetSMS as any).mock.calls[0];
    expect([phone, email]).toEqual(["+0912345678", "a@b.com"]);
    const stored = prismaMock.verificationToken.create.mock.calls[0][0].data;
    expect(stored.token).toBe(createHash("sha256").update(token).digest("hex"));
    expect(stored.token).not.toBe(token);
  });

  it("resetPassword sets passwordChangedAt so older sessions end", async () => {
    prismaMock.verificationToken.findUnique.mockResolvedValue({ identifier: "a@b.com", token: "h", expires: new Date(Date.now() + 60000) });
    const { resetPassword } = await import("@/app/actions/reset-password");
    expect(await resetPassword("a@b.com", "tok", "Password123")).toEqual({ success: true });
    expect(prismaMock.user.update.mock.calls[0][0].data.passwordChangedAt).toBeInstanceOf(Date);
    expect(prismaMock.verificationToken.findUnique.mock.calls[0][0].where.identifier_token.token).toBe(
      createHash("sha256").update("tok").digest("hex")
    );
  });
});
